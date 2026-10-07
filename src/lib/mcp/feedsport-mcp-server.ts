import { McpServer, type CallToolResult } from "@modelcontextprotocol/server";
// The MCP SDK needs Zod 4 (Standard Schema with JSON Schema); the app is on Zod 3.
import { z } from "zod-v4";

import {
  FORMULATION_OBJECTIVES,
  INGREDIENT_CATEGORIES,
  FeedSportInputError,
  analyseFormulation,
  formulate,
  getIngredient,
  getProgramme,
  getProgrammes,
  searchIngredients,
  type FeedSportServiceContext,
} from "./feedsport-service";
import {
  compareFormulationStrategiesTool,
  diagnoseInfeasibilityTool,
  explainFormulationTool,
  findIngredientOpportunitiesTool,
  runSensitivityAnalysisTool,
} from "./feedsport-diagnostics";

export const FEEDSPORT_MCP_VERSION = "0.3.0";

const INSTRUCTIONS = `FeedSport formulates and analyses livestock (swine) feeds with its own nutrient database, programme requirements and GLPK least-cost optimizer.

Typical workflow: get_programmes → get_programme → formulate. For a generic formulation request, omit ingredients (or set ingredient_mode="automatic") and FeedSport will build the complete priced candidate pool itself. Use ingredient_mode="selected" only when the user explicitly specifies which ingredients are available. Use analyse_formulation for an existing recipe.

To answer "why" and "what if" questions, use the diagnostics tools instead of reasoning about the numbers yourself: explain_formulation (limiting nutrients, why an ingredient is or isn't used), diagnose_infeasibility (why no ration exists and what fixes it), run_sensitivity_analysis (price or limit changes), find_ingredient_opportunities (which ingredient would make it cheaper) and compare_formulation_strategies. Their "findings" are plain-language statements derived from the solver; quote them rather than paraphrasing numbers.

Rules:
- Never calculate, adjust or invent rations, nutrient values or requirements yourself. Use FeedSport results as returned.
- FeedSport requirements and ingredient inclusion limits cannot be relaxed; request constraints can only tighten them.
- A result with status "infeasible", "missing_data", "error" or "fail" is not a valid ration. Explain the issues instead of presenting a recipe.
- Automatic ingredient mode includes the FeedSport premix (public-premix-salt-additives) and only offers priced ingredients with complete data for the selected programme phase.
- In selected ingredient mode, include the FeedSport premix (public-premix-salt-additives) to cover vitamin and trace-mineral supplementation.
- Do not choose a smaller ingredient basket on the user's behalf for a generic request; use automatic mode so FeedSport, not the AI client, determines the candidate pool.
- Prices are FeedSport planning prices in USD per tonne unless the caller supplied its own.`;

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

const energySystem = z
  .enum(["ME", "NE"])
  .default("ME")
  .describe("Energy system for the energy requirement: metabolizable (ME, default) or net (NE) energy.");

const programmeId = z
  .string()
  .min(1)
  .describe('Programme phase id from get_programmes, e.g. "grow-finish-pig:<phase-id>".');

const ingredientConstraints = z
  .record(
    z.string(),
    z.object({
      min_percent: z.number().min(0).max(100).optional(),
      max_percent: z.number().min(0).max(100).optional(),
      price_per_tonne: z
        .number()
        .nonnegative()
        .optional()
        .describe("Override the FeedSport planning price (USD per tonne)."),
    }),
  )
  .optional()
  .describe("Per-ingredient limits keyed by ingredient id. Limits can only tighten FeedSport defaults.");

/** Inputs shared by diagnostics tools, which analyse a specific offered pool. */
const formulationShape = {
  programme_id: programmeId,
  energy_system: energySystem,
  ingredients: z
    .array(z.string().min(1))
    .min(1)
    .max(60)
    .describe("Ingredient ids (exact names or aliases are accepted when unambiguous)."),
  constraints: ingredientConstraints,
};

function json(value: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
    structuredContent: value as Record<string, unknown>,
  };
}

function failure(message: string): CallToolResult {
  return { ...json({ status: "error", message }), isError: true };
}

async function run(action: () => unknown | Promise<unknown>): Promise<CallToolResult> {
  try {
    const result = await action();
    const status = (result as { status?: string } | null)?.status;
    return { ...json(result), ...(status === "error" ? { isError: true } : {}) };
  } catch (error) {
    if (error instanceof FeedSportInputError) return failure(error.message);
    console.error("FeedSport MCP tool failed:", error);
    return failure("FeedSport could not complete this request.");
  }
}

/**
 * Builds a read-only FeedSport MCP server. Prices are loaded lazily so tools
 * that do not need them avoid the database round trip.
 */
export function createFeedSportMcpServer(
  loadPrices: () => Promise<FeedSportServiceContext["prices"]>,
): McpServer {
  const server = new McpServer(
    { name: "feedsport", title: "FeedSport", version: FEEDSPORT_MCP_VERSION },
    { instructions: INSTRUCTIONS },
  );
  const context = async (): Promise<FeedSportServiceContext> => ({ prices: await loadPrices() });

  server.registerTool(
    "get_programmes",
    {
      title: "List feeding programmes",
      description:
        "List FeedSport feeding programmes and their phases. Each phase id (programme:phase) is what get_programme, formulate and analyse_formulation take.",
      inputSchema: z.object({
        query: z.string().optional().describe('Free-text filter, e.g. "grower", "gilt", "lactation".'),
        body_weight_kg: z
          .number()
          .positive()
          .optional()
          .describe("Only return phases whose body-weight range contains this weight."),
      }),
      annotations: READ_ONLY,
    },
    async (args) => run(() => ({ programmes: getProgrammes(args) })),
  );

  server.registerTool(
    "get_programme",
    {
      title: "Get programme requirements",
      description:
        "Nutritional requirements and source metadata for one programme phase — exactly the constraints FeedSport enforces when formulating.",
      inputSchema: z.object({ programme_id: programmeId, energy_system: energySystem }),
      annotations: READ_ONLY,
    },
    async ({ programme_id, energy_system }) => run(() => getProgramme(programme_id, energy_system)),
  );

  server.registerTool(
    "search_ingredients",
    {
      title: "Search ingredients",
      description:
        "Find FeedSport ingredients by name, category, nutrient, price market, supplier or availability. Returns ids, planning prices and default inclusion limits.",
      inputSchema: z.object({
        query: z.string().optional().describe('Name, alias or id, e.g. "wheat bran", "maize", "soybean meal".'),
        category: z.enum(INGREDIENT_CATEGORIES).optional(),
        nutrient: z
          .string()
          .optional()
          .describe('Only ingredients with a published non-zero value for this nutrient, e.g. "sid_lysine", "calcium".'),
        market: z.string().optional().describe('Price market filter, e.g. "Harare".'),
        supplier: z.string().optional().describe('Price source / supplier filter, e.g. "FeedSport".'),
        available_only: z
          .boolean()
          .default(false)
          .describe("Only ingredients FeedSport has a planning price for."),
        limit: z.number().int().min(1).max(100).default(25),
      }),
      annotations: READ_ONLY,
    },
    async (args) => run(async () => searchIngredients(args, await context())),
  );

  server.registerTool(
    "get_ingredient",
    {
      title: "Get ingredient",
      description:
        "Full FeedSport nutrient profile, planning price, default inclusion limits and data source for one ingredient.",
      inputSchema: z.object({
        id: z.string().min(1).describe("Ingredient id from search_ingredients."),
        programme_id: programmeId
          .optional()
          .describe("Only for the FeedSport premix, whose profile depends on the programme phase."),
      }),
      annotations: READ_ONLY,
    },
    async ({ id, programme_id }) => run(async () => getIngredient(id, await context(), programme_id)),
  );

  server.registerTool(
    "formulate",
    {
      title: "Formulate a feed",
      description:
        "Formulate a ration with FeedSport's GLPK optimizer against a programme phase. By default FeedSport automatically offers every priced ingredient with complete data for the phase, including its fixed premix. Set ingredient_mode='selected' and pass ingredients only when the user has specified the available basket. Returns the recipe, cost, candidate-pool basis, nutrient profile and requirement comparison, or an infeasible response.",
      inputSchema: z.object({
        programme_id: programmeId,
        energy_system: energySystem,
        ingredient_mode: z
          .enum(["automatic", "selected"])
          .optional()
          .describe(
            "Omit for automatic mode unless ingredients are supplied (legacy calls with ingredients are treated as selected). automatic = FeedSport builds the complete priced candidate pool; selected = only the supplied ingredients are offered.",
          ),
        ingredients: z
          .array(z.string().min(1))
          .min(1)
          .max(60)
          .optional()
          .describe(
            "Only for selected mode: ingredient ids the user can access. Omit for a generic formulation so FeedSport can build the candidate pool itself.",
          ),
        constraints: ingredientConstraints,
        objective: z
          .enum(FORMULATION_OBJECTIVES)
          .default("least_cost")
          .describe(
            "least_cost, or an alternative within 3% of least cost: simple (fewer ingredients), low_soy, low_import.",
          ),
      }),
      annotations: READ_ONLY,
    },
    async (args) => run(async () => formulate(args, await context())),
  );

  server.registerTool(
    "explain_formulation",
    {
      title: "Explain a formulation",
      description:
        "Explain the least-cost solution from the solver's own output: which nutrients are limiting and what they cost, why each ingredient is selected, held at a limit or left out, and the price at which an excluded ingredient would enter. Answers questions like \"why isn't wheat bran selected?\".",
      inputSchema: z.object({
        ...formulationShape,
        ingredients_to_explain: z
          .array(z.string().min(1))
          .max(20)
          .optional()
          .describe(
            "Ingredients to focus the findings on. Ones not in the ingredient list are priced against the solution without being added.",
          ),
      }),
      annotations: READ_ONLY,
    },
    async (args) => run(async () => explainFormulationTool(args, await context())),
  );

  server.registerTool(
    "diagnose_infeasibility",
    {
      title: "Diagnose an infeasible formulation",
      description:
        "Determine why no valid formulation exists: inclusion-limit conflicts, requirements no blend of the ingredients can reach, a minimal set of requirements that conflict, and confirmed fixes (ingredients to add, or request limits to remove). Never relaxes FeedSport requirements.",
      inputSchema: z.object({
        ...formulationShape,
        candidate_ingredients: z
          .array(z.string().min(1))
          .max(60)
          .optional()
          .describe("Ingredients to try adding as fixes. Defaults to every priced FeedSport ingredient."),
      }),
      annotations: READ_ONLY,
    },
    async (args) => run(async () => diagnoseInfeasibilityTool(args, await context())),
  );

  server.registerTool(
    "run_sensitivity_analysis",
    {
      title: "Run sensitivity analysis",
      description:
        "Re-solve the formulation under price or inclusion-limit changes and report cost and recipe shifts. With no scenarios, varies each ingredient's price by price_steps_percent (default ±10%).",
      inputSchema: z.object({
        ...formulationShape,
        scenarios: z
          .array(
            z.object({
              name: z.string().optional(),
              changes: z
                .array(
                  z.object({
                    ingredient: z.string().min(1),
                    price_per_tonne: z.number().nonnegative().optional(),
                    price_change_percent: z.number().min(-100).max(1000).optional(),
                    min_percent: z.number().min(0).max(100).optional(),
                    max_percent: z.number().min(0).max(100).optional(),
                  }),
                )
                .min(1)
                .max(20),
            }),
          )
          .min(1)
          .max(20)
          .optional(),
        price_steps_percent: z
          .array(z.number().min(-100).max(1000))
          .min(1)
          .max(6)
          .optional()
          .describe("Automatic mode only: price changes to apply to each ingredient in turn."),
      }),
      annotations: READ_ONLY,
    },
    async (args) => run(async () => runSensitivityAnalysisTool(args, await context())),
  );

  server.registerTool(
    "find_ingredient_opportunities",
    {
      title: "Find ingredient opportunities",
      description:
        "Identify the limiting nutrients and which additional FeedSport ingredients would lower the cost of this formulation at current prices, with confirmed savings, what they displace, and the price at which near-miss ingredients would become worthwhile.",
      inputSchema: z.object({
        ...formulationShape,
        candidate_ingredients: z
          .array(z.string().min(1))
          .max(60)
          .optional()
          .describe("Ingredients to consider adding. Defaults to every priced FeedSport ingredient not already listed."),
        limit: z.number().int().min(1).max(20).default(5),
      }),
      annotations: READ_ONLY,
    },
    async (args) => run(async () => findIngredientOpportunitiesTool(args, await context())),
  );

  server.registerTool(
    "compare_formulation_strategies",
    {
      title: "Compare formulation strategies",
      description:
        "Compare least cost with the simple, low-soy and low-import alternatives, the formulation without the request's own limits, forced-ingredient variants and other programmes (e.g. a high-performance phase) — cost, ingredient count, soybean meal and binding requirements side by side.",
      inputSchema: z.object({
        ...formulationShape,
        force_ingredients: z
          .array(z.object({ ingredient: z.string().min(1), min_percent: z.number().min(0).max(100) }))
          .max(10)
          .optional()
          .describe("Each entry adds a strategy that forces at least min_percent of the ingredient."),
        compare_programme_ids: z
          .array(z.string().min(1))
          .max(5)
          .optional()
          .describe("Other programme phase ids to formulate with the same ingredients, e.g. a high-performance phase."),
      }),
      annotations: READ_ONLY,
    },
    async (args) => run(async () => compareFormulationStrategiesTool(args, await context())),
  );

  server.registerTool(
    "analyse_formulation",
    {
      title: "Analyse a formulation",
      description:
        "Check an existing recipe (percentages totalling 100) against a programme phase: nutrient profile, deficiencies, excesses, inclusion-limit violations, cost and pass/fail.",
      inputSchema: z.object({
        programme_id: programmeId,
        energy_system: energySystem,
        recipe: z
          .array(
            z.object({
              ingredient: z.string().min(1),
              percentage: z.number().min(0).max(100),
            }),
          )
          .min(1)
          .max(60),
        prices: z
          .record(z.string(), z.number().nonnegative())
          .optional()
          .describe("Optional USD-per-tonne price overrides keyed by ingredient id."),
      }),
      annotations: READ_ONLY,
    },
    async (args) => run(async () => analyseFormulation(args, await context())),
  );

  return server;
}

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
import {
  addFormulationAdviceTool,
  getSavedFormulationTool,
  listSavedFormulationsTool,
  listUsersTool,
  type FormulationStore,
} from "./feedsport-formulations";
import {
  listFeaturedTool,
  saveFeaturedTool,
  setFeaturedPublishedTool,
  type FeaturedStore,
} from "./feedsport-featured";

export const FEEDSPORT_MCP_VERSION = "0.6.0";

const INSTRUCTIONS = `FeedSport formulates and analyses pig and poultry feeds with its ingredient database, loaded programme phases and GLPK least-cost optimizer. Only formulate programmes listed by get_programmes; do not assume a layer programme exists.

Workflow: get_programmes → get_programme → search_ingredients → formulate. Generic requests should omit ingredients (ingredient_mode="automatic") so FeedSport chooses its priced BASAL ingredient pool. Automatic mode does not include any premix. Use ingredient_mode="selected" when users provide their ingredient basket or want to include a named, real commercial premix. Use analyse_formulation for existing recipes.

For explanations, use explain_formulation, diagnose_infeasibility, run_sensitivity_analysis, find_ingredient_opportunities and compare_formulation_strategies. CJ S174 is manufacturer-recipe-only: diagnose_infeasibility provides read-only nutrient/data-gap findings, while ingredient substitution and alternative-ratio tools must not change its recipe. Quote the tool findings instead of inventing values.

Premix workflow: search_ingredients with category="vitamin_mineral_premix" and available_only=false, then get_ingredient for the exact manufacturer SKU, stage, published fixed dose, source link and verification status. Available products include Sustar X911 (piglets), X912 (grower/finisher), X913 (sows), X812 (broilers), X811 (layers) and CJ Feed S174 (4% breeding-boar premix); selected-mode requests must lock each basal ingredient to CJ's published percentages using equal min_percent and max_percent constraints, and include S174 at 4%. A SKU can only be used for a compatible programme phase. Include exactly one compatible SKU in selected mode. The catalogue provides an Alibaba-derived planning default (listing-range midpoint multiplied by 2); a real supplier quote in constraints.<sku_id>.price_per_tonne overrides it.

Rules:
- Never invent or adjust feed recipes, nutrient values, supplier prices or requirement figures; report FeedSport tool results as returned.
- The theoretical premix public-premix-salt-additives and generic aliases such as "premix" are RETIRED. They will be rejected; do not send them.
- Mature boars may use CJ Feed S174 (4% fixed inclusion), but ONLY with CJ's published ingredient ratios: maize 64.3%, wheat bran 12%, soybean meal 15.7%, fish meal 4%, S174 4%. Do not assign sow-only X913 or permit arbitrary changes to the supplier ratios. Growing entire/immunocastrated males use the grower/finisher premix GlyPro X912.
- Commercial premix dosage is fixed at the manufacturer's published inclusion for the SKU. Never alter that dose or substitute a premix across species.
- Supplier label minima are credited conservatively at the SKU's fixed dose, with their provenance, and count towards vitamin and trace-mineral targets. A nutrient the label does not declare counts as not supplied.
- Automatic mode selects priced basal ingredients only. Its optimal recipes do NOT include a premix and are NOT complete feeds.
- In selected mode, use a real SKU and a supplier price if available. status="optimal" reports solver feasibility and analysis status="pass" reports the checked formulation constraints; neither is a nutritional-completeness claim. Always read nutritional_validation: verified supports the modeled complete-feed claim, targets_not_met identifies a shortfall (including nutrients no ingredient declares, listed in missing_data_nutrients), and not_assessed means no targets are loaded for the stage. Never claim manufacturer approval or feeding safety.
- FeedSport programme requirements and ingredient inclusion ceilings cannot be relaxed; caller constraints can only tighten them.
- Status "manufacturer_recipe" is a reproducible manufacturer-provided mixing recipe for costing/review, NOT a least-cost formulation. Read premix_analysis, incomplete_requirements, checked_shortfalls and unsupported_requirements. diagnose_infeasibility returns status "manufacturer_recipe" with data gaps/shortfalls for CJ S174 and no substitution fixes. Status "infeasible", "missing_data", "error" or "fail" is not a valid nutrition pass.
- For a generic request, let automatic mode choose basal ingredients; do not arbitrarily shrink the ingredient pool. Clearly distinguish Alibaba-derived planning defaults from product-backed supplier quotations.
- Prices are FeedSport planning prices (USD/t) for priced ingredients, or the caller's explicitly supplied prices.`;

const ADVISOR_INSTRUCTIONS = `

Advisor access: you are connected as FeedSport's advising nutritionist and can read every user's saved Studio formulations.

Advisor workflow: list_users or list_saved_formulations → get_saved_formulation → pass its tool_inputs to formulate or any diagnostics tool (or its analyse_formulation_input to analyse_formulation) to review it → add_formulation_advice. Saved results are what the user saw when they saved. Legacy snapshots with the retired theoretical premix cannot be replayed as valid new formulations; select a compatible real SKU and prefer a current supplier quote over its Alibaba-derived planning default. Re-run tools when pricing or assumptions may have changed.

Advice rules:
- add_formulation_advice is the tool for writing nutritionist advice notes (featured-card save/publish tools separately modify public cards). The user reads the advice in FeedSport Studio. Write it to the farmer, in plain language, and only after the nutritionist has agreed its content.
- Propose ration changes through suggestion (ingredient roles, prices, limits, programme or goal), never as a recipe you calculated. FeedSport formulates the suggestion and returns suggestion_check; check it with preview_formulation_advice first and do not save a suggestion that is not optimal.
- Treat user data as confidential: share it only with the nutritionist.

Featured formulations (the starting points on FeedSport Studio's Home screen): list_featured_formulations → preview_featured_formulation (read-only) → save_featured_formulation → set_featured_formulation_published. These are public, with recipes formulated at planning prices. Commercial premix prices are Alibaba-derived planning defaults unless a supplier quote overrides them. Revalidate or unpublish old cards referencing the retired premix. A solver-valid basal formulation cannot be described as micronutrient-complete.`;

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
        .describe("Optional USD/t override. Commercial premixes otherwise use their Alibaba-derived planning default; prefer a real supplier quote when available."),
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
    .describe("Ingredient ids or unambiguous aliases. A commercial premix requires a specific manufacturer SKU; the retired generic premix is rejected."),
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

export type AdvisorOptions = {
  /** Every user's saved formulations; null when the secret key is not configured. */
  formulations: FormulationStore | null;
  /** Featured formulations on Studio Home; null when the secret key is not configured. */
  featured: FeaturedStore | null;
};

/**
 * Builds a FeedSport MCP server. Prices are loaded lazily so tools that do not
 * need them avoid the database round trip. Without advisor options the server
 * is read-only; with them it adds the saved-formulation and advice tools.
 */
export function createFeedSportMcpServer(
  loadPrices: () => Promise<FeedSportServiceContext["prices"]>,
  advisor?: AdvisorOptions,
): McpServer {
  const server = new McpServer(
    { name: "feedsport", title: "FeedSport", version: FEEDSPORT_MCP_VERSION },
    { instructions: advisor ? INSTRUCTIONS + ADVISOR_INSTRUCTIONS : INSTRUCTIONS },
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
        "Programme phase nutrient targets and source metadata. Supplemental vitamin and trace-mineral targets are evaluated separately from basal solver feasibility; read nutritional_validation in formulation and analysis results.",
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
        "Find ingredients and real commercial premix SKUs by name, category, nutrient, price market, supplier or availability. Commercial SKUs include published fixed doses and Alibaba-derived planning prices where available.",
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
        "Get nutrient and price information where available. For commercial premixes, returns manufacturer specification metadata, fixed dosage and an Alibaba-derived planning price that a supplier quote may override.",
      inputSchema: z.object({
        id: z.string().min(1).describe("Ingredient id from search_ingredients."),
        programme_id: programmeId
          .optional()
          .describe("Optional phase context. Real commercial premix profiles do not change their composition to satisfy programme requirements."),
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
        "Formulate with GLPK for unrestricted programmes, or reproduce CJ S174 fixed boar recipe without optimisation. Automatic mode selects priced BASAL ingredients only. nutritional_validation separately reports verified, targets_not_met or not_assessed; status=optimal only means the formulation solve is feasible. In selected mode, choose a real manufacturer SKU; its Alibaba-derived planning price is used unless a supplier quote overrides it. All commercial premixes have a fixed manufacturer inclusion dose; do not change it. CJ S174 requires every ingredient at the manufacturer ratio and returns status=manufacturer_recipe, NOT a least-cost result.",
      inputSchema: z.object({
        programme_id: programmeId,
        energy_system: energySystem,
        ingredient_mode: z
          .enum(["automatic", "selected"])
          .optional()
          .describe(
            "Omit for automatic mode unless ingredients are supplied (legacy calls with ingredients are treated as selected). automatic = priced basal pool, NO premix; selected = supplied basket, including one real compatible SKU if requested.",
          ),
        ingredients: z
          .array(z.string().min(1))
          .min(1)
          .max(60)
          .optional()
          .describe(
            "Only for selected mode: user-accessible ingredient ids, optionally including one stage-compatible commercial premix SKU. A genuine supplier-price override is preferred; generic/theoretical premix ids are rejected.",
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
        "Analyse a 100% recipe against supported constraints, prices and inclusion limits.",
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

  if (advisor) registerAdvisorTools(server, advisor, context);

  return server;
}

const suggestionShape = z
  .object({
    programme_id: programmeId.optional().describe("Move the formulation to another programme phase."),
    objective: z.enum(FORMULATION_OBJECTIVES).optional().describe("Change the studio goal."),
    batch_kg: z.number().positive().max(1_000_000).optional(),
    changes: z
      .array(
        z.object({
          ingredient: z.string().min(1).describe("Ingredient id; a new one is added to the pool."),
          remove: z.boolean().optional().describe("Take the ingredient out of the pool entirely."),
          role: z
            .enum(["available", "required", "fixed", "excluded"])
            .optional()
            .describe("available = the optimizer may use it; required = at least min_percent; fixed = exactly fixed_percent; excluded = kept in the list but not offered."),
          price_per_tonne: z.number().nonnegative().nullable().optional().describe("USD per tonne; null reverts to the FeedSport planning price."),
          min_percent: z.number().min(0).max(100).nullable().optional(),
          max_percent: z.number().min(0).max(100).nullable().optional(),
          fixed_percent: z.number().min(0).max(100).nullable().optional(),
        }),
      )
      .max(60)
      .optional(),
  })
  .describe("A suggested revision, applied to the advised version. The user can open it in the Studio and save it as a new version.");

const NOT_CONFIGURED = "Advisor access is not configured on this server: set SUPABASE_SECRET_KEY.";

// Write tools take strict input, so a misspelt or unknown field is an error
// rather than silently dropped, and they honour dry_run: a client working from
// an older tool list must never save when it asked only to check.
const dryRun = z.boolean().default(false).describe("true previews without saving anything, like the matching preview tool.");

function registerAdvisorTools(
  server: McpServer,
  { formulations: store, featured }: AdvisorOptions,
  context: () => Promise<FeedSportServiceContext>,
) {
  const withStore = (action: (store: FormulationStore) => unknown | Promise<unknown>) =>
    store ? run(() => action(store)) : Promise.resolve(failure(NOT_CONFIGURED));
  const withFeatured = (action: (store: FeaturedStore) => unknown | Promise<unknown>) =>
    featured ? run(() => action(featured)) : Promise.resolve(failure(NOT_CONFIGURED));

  const slug = z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .max(80)
    .describe('Stable lowercase slug, e.g. "pig-grower-maize-soya-lysine". Saving an existing id replaces it.');

  server.registerTool(
    "list_featured_formulations",
    {
      title: "List featured formulations",
      description:
        "Every featured formulation on FeedSport Studio's Home screen, published or not, in display order, with its programme, ingredient pool and tool_inputs for formulate.",
      inputSchema: z.object({}),
      annotations: READ_ONLY,
    },
    async () => withFeatured((s) => listFeaturedTool(s)),
  );

  const featuredShape = {
    id: slug,
    name: z.string().trim().min(1).max(120).describe("Card title, e.g. \"Sorghum finisher for maize-short seasons\"."),
    description: z.string().trim().min(1).max(500).describe("One or two sentences for farmers: who it is for and why."),
    programme_id: programmeId,
    objective: z.enum(FORMULATION_OBJECTIVES).default("least_cost").describe("The Studio goal the card opens with."),
    batch_kg: z.number().positive().max(100_000).default(1000).describe("Batch size the copy opens with."),
    ingredients: z
      .array(
        z.object({
          ingredient: z.string().min(1).describe("Ingredient id from search_ingredients."),
          role: z
            .enum(["available", "required", "fixed"])
            .optional()
            .describe("available (default) = optimizer may use it; required = at least min_percent; fixed = exactly fixed_percent."),
          min_percent: z.number().min(0).max(100).optional(),
          max_percent: z.number().min(0).max(100).optional(),
          fixed_percent: z.number().min(0).max(100).optional(),
        }),
      )
      .min(2)
      .max(40)
      .describe("The ingredient pool. Planning prices apply; every ingredient needs one."),
    author: z.string().trim().min(1).max(120).optional().describe('Defaults to "FeedSport Nutrition Team".'),
    author_role: z.string().trim().min(1).max(120).optional().describe('Defaults to "FeedSport nutritionist".'),
    place: z.string().trim().min(1).max(120).optional().describe('Defaults to "Harare".'),
    published: z.boolean().optional().describe("Defaults to true for a new one; keeps the current value when replacing."),
    sort_order: z.number().int().min(0).max(10_000).optional().describe("Lower shows first. Defaults to 100 for a new one."),
  };

  server.registerTool(
    "preview_featured_formulation",
    {
      title: "Preview a featured formulation",
      description:
        "Check a featured formulation without saving anything: FeedSport formulates it at planning prices exactly as Studio Home will, and returns whether it would be accepted and what its card will show (cost per tonne, requirements met, practical-inclusion advisories, recipe). Takes the same input as save_featured_formulation.",
      inputSchema: z.object(featuredShape),
      annotations: READ_ONLY,
    },
    async (args) => withFeatured((s) => saveFeaturedTool({ ...args, dry_run: true }, s, context)),
  );

  server.registerTool(
    "save_featured_formulation",
    {
      title: "Save a featured formulation",
      description:
        "Create or replace a featured formulation on Studio Home. FeedSport formulates it at planning prices first and refuses to save it unless the recipe is valid; the response shows what its Home card will display. Check it with preview_featured_formulation first; dry_run: true also previews without saving.",
      inputSchema: z.strictObject({ ...featuredShape, dry_run: dryRun }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async (args) => withFeatured((s) => saveFeaturedTool(args, s, context)),
  );

  server.registerTool(
    "set_featured_formulation_published",
    {
      title: "Publish or unpublish a featured formulation",
      description: "Show or hide a featured formulation on Studio Home without deleting it.",
      inputSchema: z.strictObject({ id: slug, published: z.boolean() }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (args) => withFeatured((s) => setFeaturedPublishedTool(args, s)),
  );

  server.registerTool(
    "list_users",
    {
      title: "List users",
      description: "List FeedSport Studio users with their email, name, organisation, sign-up date and number of saved formulations.",
      inputSchema: z.object({
        query: z.string().optional().describe("Filter by email, name, organisation or exact user id."),
      }),
      annotations: READ_ONLY,
    },
    async (args) => withStore((s) => listUsersTool(args, s)),
  );

  server.registerTool(
    "list_saved_formulations",
    {
      title: "List saved formulations",
      description:
        "List saved Studio formulations across all users, newest first, with owner, programme, latest version, saved status and cost, and how much advice each has.",
      inputSchema: z.object({
        user: z.string().optional().describe("Only this user's formulations: email, name, organisation or user id."),
        query: z.string().optional().describe("Filter by formulation name."),
        programme_id: z.string().optional().describe('Programme ("grow-finish-pig") or phase id ("programme:phase").'),
        limit: z.number().int().min(1).max(200).default(50),
      }),
      annotations: READ_ONLY,
    },
    async (args) => withStore((s) => listSavedFormulationsTool(args, s)),
  );

  server.registerTool(
    "get_saved_formulation",
    {
      title: "Get a saved formulation",
      description:
        "One saved formulation: owner, version history, the chosen version's programme, goal, ingredient pool (roles, prices, limits) and saved result, previous advice, and tool_inputs that reproduce it with formulate and the diagnostics tools.",
      inputSchema: z.object({
        formulation_id: z.string().min(1).describe("Formulation id from list_saved_formulations."),
        version: z.number().int().positive().optional().describe("Defaults to the latest version."),
      }),
      annotations: READ_ONLY,
    },
    async (args) => withStore((s) => getSavedFormulationTool(args, s)),
  );

  const adviceShape = {
    formulation_id: z.string().min(1),
    version: z.number().int().positive().optional().describe("The version the advice is about; defaults to the latest."),
    author: z.string().trim().min(1).max(120).describe("Name the user sees, e.g. the nutritionist's name."),
    advice: z.string().trim().min(1).max(10_000).describe("The note to the user, in plain language."),
    suggestion: suggestionShape.optional(),
  };

  server.registerTool(
    "preview_formulation_advice",
    {
      title: "Preview advice on a formulation",
      description:
        "Check advice before leaving it, without saving anything: applies the suggested revision to the saved version and formulates it with FeedSport, returning suggestion_check. Takes the same input as add_formulation_advice.",
      inputSchema: z.object(adviceShape),
      annotations: READ_ONLY,
    },
    async (args) => withStore((s) => addFormulationAdviceTool({ ...args, dry_run: true }, s, context)),
  );

  server.registerTool(
    "add_formulation_advice",
    {
      title: "Leave advice on a formulation",
      description:
        "Attach the nutritionist's advice to a user's saved formulation, optionally with a suggested revision that FeedSport formulates and checks first. The user sees it in FeedSport Studio. Check it with preview_formulation_advice first; dry_run: true also previews without saving.",
      inputSchema: z.strictObject({ ...adviceShape, dry_run: dryRun }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async (args) => withStore((s) => addFormulationAdviceTool(args, s, context)),
  );
}

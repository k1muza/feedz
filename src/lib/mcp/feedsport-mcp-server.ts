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
  getIngredientFamilies,
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
import {
  INVOICE_TYPES,
  convertProformaTool,
  createInvoiceTool,
  generateInvoicePdfTool,
  getInvoiceTool,
  listCustomersTool,
  listInvoicesTool,
  updateInvoiceTool,
  type InvoiceAccess,
} from "./feedsport-invoices";
import {
  addSupplierContactTool,
  addSupplierNoteTool,
  compareSupplierPricesTool,
  createSupplierTool,
  getSupplierTool,
  listSuppliersTool,
  recordSupplierPriceTool,
  removeSupplierContactTool,
  setSupplierProductTool,
  updateSupplierContactTool,
  updateSupplierTool,
  type SupplierAccess,
} from "./feedsport-suppliers";
import { INVOICE_CURRENCIES } from "@/lib/invoices";
import { SUPPLIER_PRICE_BASES, SUPPLIER_PRICE_UNITS, SUPPLIER_VERIFICATIONS } from "@/types";

export const FEEDSPORT_MCP_VERSION = "0.7.0";

const INSTRUCTIONS = `FeedSport formulates and analyses pig and poultry feeds with its ingredient database, loaded programme phases and GLPK least-cost optimizer. Only formulate programmes listed by get_programmes; do not assume a layer programme exists.

Workflow: get_programmes → get_programme → search_ingredients → formulate. Generic requests should omit ingredients (ingredient_mode="automatic") so FeedSport chooses its priced basal ingredient pool plus exactly one stage-compatible commercial premix at its fixed manufacturer dose (the programme default, e.g. Caremix PigWeaner, Pig Grower or Pig Finisher). To use a different eligible premix in automatic mode, name its SKU in constraints (optionally with price_per_tonne); it is never silently replaced. Use ingredient_mode="selected" when users provide their ingredient basket. Use analyse_formulation for existing recipes.

For explanations, use explain_formulation, diagnose_infeasibility, run_sensitivity_analysis, find_ingredient_opportunities and compare_formulation_strategies. CJ S174 is manufacturer-recipe-only: diagnose_infeasibility provides read-only nutrient/data-gap findings, while ingredient substitution and alternative-ratio tools must not change its recipe. Quote the tool findings instead of inventing values.

Premix workflow: search_ingredients with category="vitamin_mineral_premix" and available_only=false, then get_ingredient for the exact manufacturer SKU, stage, published fixed dose, source link and verification status. Available products include Caremix PigWeaner (2.8%, nursery), Pig Grower (3.2%, grower phases) and Pig Finisher (2.6%, finisher phases), Sustar X911 (piglets), X912 (grower/finisher), X913 (sows), X812 (broilers), X811 (layers) and CJ Feed S174 (4% breeding-boar premix); selected-mode requests must lock each basal ingredient to CJ's published percentages using equal min_percent and max_percent constraints, and include S174 at 4%. A SKU can only be used for a compatible programme phase. Include exactly one compatible SKU in selected mode. The catalogue provides an Alibaba-derived planning default (listing-range midpoint multiplied by 2); a real supplier quote in constraints.<sku_id>.price_per_tonne overrides it.

Rules:
- Never invent or adjust feed recipes, nutrient values, supplier prices or requirement figures; report FeedSport tool results as returned.
- Generic premix aliases such as "premix" are rejected; always name a manufacturer SKU.
- Mature boars may use CJ Feed S174 (4% fixed inclusion), but ONLY with CJ's published ingredient ratios: maize 64.3%, wheat bran 12%, soybean meal 15.7%, fish meal 4%, S174 4%. Do not assign sow-only X913 or permit arbitrary changes to the supplier ratios. Growing entire/immunocastrated males use the grower/finisher premix GlyPro X912.
- Commercial premix dosage is fixed at the manufacturer's published inclusion for the SKU. Never alter that dose or substitute a premix across species.
- Supplier label minima are credited conservatively at the SKU's fixed dose, with their provenance, and count towards vitamin and trace-mineral targets. A nutrient the label does not declare remains unknown; it is never treated as zero or as a pass.
- Automatic mode includes one priced, stage-compatible commercial premix (premix_selection reports which and why) and optimises the basal ingredients around it; other eligible premixes are re-run under premix_advisory with identical basal ingredients and prices. Read premix_included and feed_completeness on every result: "incomplete" means a basal ration with NO vitamin-mineral supplementation, never a complete feed, even when every hard requirement is met. When automatic mode cannot include any premix it returns status "basal_only" (optimizer_status "optimal"): say a complete feed could not be established.
- In selected mode, use a real SKU and a supplier price if available. A commercial premix is a full ingredient: every nutrient it documents (amino acids, minerals, vitamins, protein, energy) counts once toward the formulation, so it can reduce crystalline amino acids. Total amino acids are never counted as SID. Values a premix does not document count as 0 and are labelled data_status="assumed_zero". Always read nutritional_validation: overall_status meets_requirements / fails_requirements / infeasible covers HARD requirements only (energy, protein, SID amino acids, minerals, ingredient limits, combined ingredient-family and constraint-group limits, premix dose). Chapter 7 vitamin and trace-mineral comparisons and premix documentation gaps are under nutritional_validation.advisories: recommendations, never deficiencies. premix_advisory lists re-run alternatives; replacing means removing the current SKU, never adding a second one. nutritional_validation.advisories.upper_limits compares total-diet vitamins and minerals with CFIA maximum nutrient values for the phase's mapped CFIA class: advisory references, never constraints, never part of overall_status. Report an "exceeds" check plainly (calculated value against the reference maximum), never as "toxic", "dangerous" or "unsafe"; "not_documented" is unknown, not within. premix_advisory.vitamin_upper_limit_advice gives the validated replacement for a vitamin A, D or E exceedance (or says to verify the premix with its manufacturer); present it as a suggestion the farmer may apply, and say whether the exceedance is resolved. Never claim a feed is ready to manufacture, manufacturer approval or feeding safety.
- FeedSport programme requirements and ingredient inclusion ceilings cannot be relaxed; caller constraints can only tighten them.
- Several grades of one feedstuff (e.g. soybean meal 44.5–48% CP) form an ingredient family; where a family or constraint group (e.g. total added fat) has a combined maximum, the SUM of its members is capped in addition to each ingredient's own maximum. get_ingredient_families lists them with their provenance; most are FeedSport policies derived from Brazilian Tables 2024 Table 1.01, not published family maxima.
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

Featured formulations (the starting points on FeedSport Studio's Home screen): list_featured_formulations → preview_featured_formulation (read-only) → save_featured_formulation → set_featured_formulation_published. These are public, with recipes formulated at planning prices. Commercial premix prices are Alibaba-derived planning defaults unless a supplier quote overrides them. Revalidate or unpublish old cards referencing the retired premix. A recipe that meets its hard requirements is not described as micronutrient-complete; Chapter 7 supplementation is an advisory.`;

const INVOICE_INSTRUCTIONS = `

Invoices (FeedSport admin accounts only): you can create proforma invoices and invoices, edit proformas, turn a proforma into an invoice and fetch the PDF the FeedSport web app produces. Invoice data is commercially confidential: share it only with the signed-in admin.

Invoice workflow: list_customers → create_invoice (dry_run: true to show the user first) → create_invoice → generate_invoice_pdf. A proforma (status "draft") stays editable with update_invoice until convert_proforma_to_invoice issues it as an invoice awaiting payment; issued, paid and void invoices cannot be changed here.

Invoice rules:
- Bill existing customers by customer_id from list_customers. create_invoice refuses new customer details that match an existing customer, so never work around that by altering the name.
- Give quantities, units and unit prices exactly as the user stated them; FeedSport calculates every line amount, subtotal, tax and total. Never state a total FeedSport did not return.
- Never add tax or VAT unless the user explicitly asks for it and gives the rate; FeedSport does not assume VAT registration.
- Invoices are in USD. There is no discount field: if the user agrees a discount, ask them for the discounted unit price.
- Send one idempotency_key per new invoice (e.g. a fresh UUID) and reuse it only to retry the same request.
- You cannot send invoices, record payments, void or delete invoices; the admin does that in FeedSport admin.`;

const SUPPLIER_INSTRUCTIONS = `

Suppliers (FeedSport admin accounts only): FeedSport's raw-material supplier directory. Each supplier has company phone lines and email, named contacts (people), timestamped notes, the catalogue products it offers and dated price quotes for each product. Supplier data is commercially confidential: share it only with the signed-in admin.

Supplier workflow: list_suppliers (filter by product, location or verification) → get_supplier → record_supplier_price / add_supplier_note / add_supplier_contact after a call. compare_supplier_prices ranks current quotes for one product by price per tonne against FeedSport's selling price.

Supplier rules:
- Record prices exactly as the supplier quoted them: the price, its unit (tonne, kg or a bag of bag_size_kg), currency, the smallest order it applies to (min_quantity_tonnes), ex_works or delivered (with delivery_location) and the date it was quoted. FeedSport converts to price per tonne; never convert or round a quote yourself.
- Quotes are history: record a new quote rather than editing an old one.
- Contacts are named people. Never invent a name; a company switchboard number belongs in update_supplier's phone fields.
- verification is the admin's judgement of how well the supplier is established (verified, corroborated, unverified). Change it only when the admin says so. Unverified suppliers need a quotation, physical address, company and bank identity, stock evidence and ideally an inspection before any payment.
- Write notes as the admin dictates them; each note is timestamped and attributed to the signed-in admin.
- You cannot delete suppliers; set active: false with update_supplier, or the admin deletes them in FeedSport admin.`;

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
  /** Invoice tools, only for a signed-in FeedSport admin; omitted for advisors and the static token. */
  invoices?: InvoiceAccess | null;
  /** Supplier directory tools, only for a signed-in FeedSport admin; omitted for advisors and the static token. */
  suppliers?: SupplierAccess | null;
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
    {
      instructions: advisor
        ? INSTRUCTIONS + ADVISOR_INSTRUCTIONS + (advisor.invoices ? INVOICE_INSTRUCTIONS : "") + (advisor.suppliers ? SUPPLIER_INSTRUCTIONS : "")
        : INSTRUCTIONS,
    },
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
    "get_ingredient_families",
    {
      title: "Get ingredient families",
      description:
        "Ingredient families (substantially equivalent grades or processing variants, e.g. the four soybean-meal grades) and cross-family constraint groups (e.g. total added fat), with members and any combined maximum inclusion and its provenance. A combined maximum caps the SUM of members and is enforced in formulate and checked in analyse_formulation, alongside each ingredient's own maximum.",
      inputSchema: z.object({
        programme_id: programmeId.optional().describe("Optional phase; also returns the combined limits that apply to it."),
        multi_member_only: z.boolean().default(false).describe("Omit single-ingredient families."),
      }),
      annotations: READ_ONLY,
    },
    async (args) => run(() => getIngredientFamilies(args)),
  );

  server.registerTool(
    "formulate",
    {
      title: "Formulate a feed",
      description:
        "Formulate with GLPK for unrestricted programmes, or reproduce CJ S174 fixed boar recipe without optimisation. Automatic mode selects priced basal ingredients plus ONE stage-compatible commercial premix at its fixed dose (premix_selection), or returns status=basal_only with feed_completeness=incomplete when none can be included. nutritional_validation reports hard requirements (meets_requirements, fails_requirements or infeasible) with a data_status on every value; Chapter 7 supplementation and premix documentation are advisories, and premix_advisory compares re-run premix alternatives. In selected mode, choose a real manufacturer SKU; its Alibaba-derived planning price is used unless a supplier quote overrides it. All commercial premixes have a fixed manufacturer inclusion dose; do not change it. CJ S174 requires every ingredient at the manufacturer ratio and returns status=manufacturer_recipe, NOT a least-cost result.",
      inputSchema: z.object({
        programme_id: programmeId,
        energy_system: energySystem,
        ingredient_mode: z
          .enum(["automatic", "selected"])
          .optional()
          .describe(
            "Omit for automatic mode unless ingredients are supplied (legacy calls with ingredients are treated as selected). automatic = priced basal pool plus the programme's default priced premix (or the one premix SKU named in constraints); selected = supplied basket, including one real compatible SKU if requested.",
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
  if (advisor?.invoices) registerInvoiceTools(server, advisor.invoices);
  if (advisor?.suppliers) registerSupplierTools(server, advisor.suppliers);

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

function registerInvoiceTools(server: McpServer, access: InvoiceAccess) {
  const invoiceRef = z
    .string()
    .trim()
    .min(1)
    .max(100)
    .describe('Invoice id (UUID) or invoice number, e.g. "INV-20261016-01".');
  const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
  const money = (what: string) => z.number().nonnegative().max(100_000_000).describe(`${what}, in the invoice currency, with at most 2 decimal places.`);

  const customerDetails = z
    .strictObject({
      name: z.string().trim().min(1).max(160),
      email: z.string().trim().max(254).optional(),
      address: z.string().trim().max(300).optional(),
      city: z.string().trim().max(120).optional(),
      phone: z.string().trim().max(60).optional(),
    })
    .partial()
    .describe("A new customer's details (name, email, address, city and phone are all required), or, with customer_id, corrections to the existing customer's details.");

  const lineItem = z.strictObject({
    description: z
      .string()
      .trim()
      .min(1)
      .max(250)
      .optional()
      .describe("What is sold, e.g. \"Wheat bran\". Optional when product is given. The unit is appended for display, e.g. \"Wheat bran (1 tonne)\"."),
    product: z
      .string()
      .trim()
      .min(1)
      .max(160)
      .optional()
      .describe('Optional FeedSport catalogue product id or exact name, e.g. "wheat-bran". Links the line to the product and, without unit or unit_price, uses its pack size and catalogue price.'),
    quantity: z.number().positive().max(10_000_000).describe("Number of units, with at most 3 decimal places, e.g. 5 for 5 tonnes."),
    unit: z
      .enum(["tonne", "kg", "bag", "each"])
      .optional()
      .describe('What one unit of quantity is. "bag" needs bag_size_kg unless the catalogue product is sold in bags.'),
    bag_size_kg: z.number().positive().max(5000).optional().describe('Bag size for unit "bag", e.g. 50.'),
    unit_price: money("Price per unit").optional().describe("Price per unit as the user stated it, e.g. 250 for $250 per tonne. Required unless a catalogue product's own pack price applies."),
  });

  const invoiceFields = {
    customer_id: z.string().trim().min(1).max(200).optional().describe("Existing customer from list_customers."),
    customer: customerDetails.optional(),
    transport: money("Delivery or transport charge for the whole invoice").optional(),
    tax_rate_percent: z
      .number()
      .min(0)
      .max(100)
      .optional()
      .describe("Tax rate in percent. Defaults to 0 (no tax). Only set it when the user explicitly asks for tax and gives the rate."),
    currency: z.enum(INVOICE_CURRENCIES).optional().describe("Invoice currency. FeedSport issues invoices in USD only."),
    issue_date: isoDate.optional().describe("Issue date, YYYY-MM-DD. Defaults to today (Harare). The invoice number is derived from it."),
    due_date: isoDate.optional().describe("Payment due date, YYYY-MM-DD. Give this or payment_due_days."),
    payment_due_days: z.number().int().min(0).max(365).optional().describe("Days after the issue date that payment is due. Defaults to 30."),
    payment_terms: z.string().trim().max(2000).optional().describe('Printed payment terms. Defaults to "Payment due within N days.".'),
    notes: z.string().trim().max(5000).optional().describe('Printed notes. Defaults to "Thank you for your business!".'),
  };

  const write = (idempotent: boolean, destructive = false) =>
    ({ readOnlyHint: false, destructiveHint: destructive, idempotentHint: idempotent, openWorldHint: false }) as const;

  server.registerTool(
    "list_customers",
    {
      title: "List invoice customers",
      description:
        "Customers FeedSport has invoiced, with their customer_id, contact details from their latest invoice and invoice count. Look a customer up here before create_invoice and bill them by customer_id.",
      inputSchema: z.object({
        query: z.string().trim().max(160).optional().describe("Filter by name, email or city."),
        limit: z.number().int().min(1).max(200).default(50),
      }),
      annotations: READ_ONLY,
    },
    async (args) => run(() => listCustomersTool(args, access)),
  );

  server.registerTool(
    "list_invoices",
    {
      title: "List invoices",
      description:
        "List FeedSport invoices and proforma invoices, newest first, with number, type, status, customer, dates and total. Filter by customer, status, type or issue-date range.",
      inputSchema: z.object({
        customer: z.string().trim().max(160).optional().describe("Customer id from list_customers, or part of the customer's name."),
        status: z.enum(["draft", "sent", "paid", "void"]).optional().describe("draft = proforma, sent = awaiting payment, paid, void."),
        type: z.enum(INVOICE_TYPES).optional().describe("proforma (draft) or standard (sent, paid or void)."),
        date_from: isoDate.optional().describe("Earliest issue date, YYYY-MM-DD."),
        date_to: isoDate.optional().describe("Latest issue date, YYYY-MM-DD."),
        limit: z.number().int().min(1).max(200).default(50),
      }),
      annotations: READ_ONLY,
    },
    async (args) => run(() => listInvoicesTool(args, access)),
  );

  server.registerTool(
    "get_invoice",
    {
      title: "Get an invoice",
      description:
        "One invoice or proforma invoice: customer, line items, totals (subtotal, transport, tax, total), dates, terms, status, whether it can still be edited, and a short-lived PDF download link.",
      inputSchema: z.object({ invoice: invoiceRef }),
      annotations: READ_ONLY,
    },
    async (args) => run(() => getInvoiceTool(args, access)),
  );

  server.registerTool(
    "create_invoice",
    {
      title: "Create an invoice",
      description:
        "Create a proforma invoice (default) or a standard invoice for an existing customer (customer_id) or a new one (customer). FeedSport assigns the invoice number and calculates every amount from the line items, transport and tax rate. Retrying with the same idempotency_key returns the invoice already created instead of a duplicate. dry_run: true previews the invoice and totals without saving. Returns the invoice with its totals and a PDF link.",
      inputSchema: z.strictObject({
        type: z.enum(INVOICE_TYPES).default("proforma").describe("proforma (a quotation that stays editable) or standard (issued, awaiting payment)."),
        ...invoiceFields,
        line_items: z.array(lineItem).min(1).max(100),
        idempotency_key: z
          .string()
          .regex(/^[A-Za-z0-9._:-]{8,100}$/, "Use 8-100 letters, digits, dots, colons, underscores or hyphens.")
          .describe("A unique key for this invoice, e.g. a fresh UUID. Reuse it only to retry the same request."),
        dry_run: dryRun,
      }),
      annotations: write(true),
    },
    async (args) => run(() => createInvoiceTool(args, access)),
  );

  server.registerTool(
    "update_invoice",
    {
      title: "Update a proforma invoice",
      description:
        "Change a proforma invoice (status draft). Only the fields given change; line_items replaces every line. Issued, paid and void invoices are refused. Moving the issue date renumbers the invoice for the new date. dry_run: true previews without saving.",
      inputSchema: z.strictObject({
        invoice: invoiceRef,
        ...invoiceFields,
        line_items: z.array(lineItem).min(1).max(100).optional().describe("The complete new list of line items."),
        dry_run: dryRun,
      }),
      annotations: write(true, true),
    },
    async (args) => run(() => updateInvoiceTool(args, access)),
  );

  server.registerTool(
    "convert_proforma_to_invoice",
    {
      title: "Convert a proforma to an invoice",
      description:
        "Issue a proforma invoice as an invoice awaiting payment, keeping its number, dates and amounts, as FeedSport admin does when a proforma's status is changed to sent. It can no longer be edited here afterwards. Confirm with the user first; dry_run: true previews.",
      inputSchema: z.strictObject({ invoice: invoiceRef, dry_run: dryRun }),
      annotations: write(true),
    },
    async (args) => run(() => convertProformaTool(args, access)),
  );

  server.registerTool(
    "generate_invoice_pdf",
    {
      title: "Get an invoice PDF",
      description:
        "Render the invoice's PDF with FeedSport's invoice template, identical to the PDF downloaded from the FeedSport web app, and return a download link valid for 15 minutes. embed_pdf: true also attaches the PDF itself.",
      inputSchema: z.object({
        invoice: invoiceRef,
        embed_pdf: z.boolean().default(false).describe("Also attach the PDF file to the result."),
      }),
      annotations: READ_ONLY,
    },
    async ({ invoice, embed_pdf }) => {
      try {
        const { bytes, result } = await generateInvoicePdfTool({ invoice }, access);
        const content: CallToolResult["content"] = [{ type: "text", text: JSON.stringify(result, null, 2) }];
        if (result.pdf.url) {
          content.push({ type: "resource_link", uri: result.pdf.url, name: result.pdf.filename, mimeType: "application/pdf", title: `${result.document_title} ${result.invoice_number}` });
        }
        if (embed_pdf || !result.pdf.url) {
          content.push({
            type: "resource",
            resource: { uri: result.pdf.url ?? `feedsport://invoices/${result.invoice_id}/pdf`, mimeType: "application/pdf", blob: Buffer.from(bytes).toString("base64") },
          });
        }
        return { content, structuredContent: result as unknown as Record<string, unknown> };
      } catch (error) {
        return run(() => {
          throw error;
        });
      }
    },
  );
}

function registerSupplierTools(server: McpServer, access: SupplierAccess) {
  const supplierRef = z.string().trim().min(1).max(160).describe("Supplier id from list_suppliers, or the company name.");
  const productRef = z.string().trim().min(1).max(160).describe('Catalogue product id or name, e.g. "soybean-meal" or "Wheat bran".');
  const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
  const email = z.string().trim().max(254).email().or(z.literal(""));
  const phone = z.string().trim().max(60);
  const write = (idempotent: boolean, destructive = false) =>
    ({ readOnlyHint: false, destructiveHint: destructive, idempotentHint: idempotent, openWorldHint: false }) as const;

  const supplierFields = {
    phone: phone.optional().describe("Main company phone line."),
    phone_2: phone.optional().describe("Second company line."),
    phone_3: phone.optional().describe("Third company line."),
    email: email.optional().describe("General company email."),
    location: z.string().trim().max(160).optional().describe('City or area, e.g. "Harare" or "Chegutu / Harare".'),
    verification: z.enum(SUPPLIER_VERIFICATIONS).nullable().optional().describe("How well the supplier is established; null = not assessed."),
    source: z.string().trim().max(200).optional().describe("Where this supplier came from, e.g. a referral or directory."),
  };
  const contactFields = {
    name: z.string().trim().min(1).max(120).describe("The person's name."),
    role: z.string().trim().max(120).optional().describe('e.g. "Sales manager".'),
    phone: phone.optional(),
    email: email.optional(),
    is_primary: z.boolean().optional().describe("Make this the supplier's main contact (replaces any other primary contact)."),
  };

  server.registerTool(
    "list_suppliers",
    {
      title: "List suppliers",
      description:
        "FeedSport's raw-material suppliers with company lines, primary contact, verification and the products they offer with each product's latest quote. Filter by product, location, verification or free text (company, contact, phone, email).",
      inputSchema: z.object({
        query: z.string().trim().max(160).optional(),
        product: productRef.optional().describe("Only suppliers offering this catalogue product."),
        location: z.string().trim().max(160).optional(),
        verification: z.enum(SUPPLIER_VERIFICATIONS).optional(),
        include_inactive: z.boolean().default(false),
        limit: z.number().int().min(1).max(200).default(50),
      }),
      annotations: READ_ONLY,
    },
    async (args) => run(() => listSuppliersTool(args, access)),
  );

  server.registerTool(
    "get_supplier",
    {
      title: "Get a supplier",
      description: "One supplier in full: company lines, every contact, every product with its full price history (newest first), and all notes (newest first).",
      inputSchema: z.object({ supplier: supplierRef }),
      annotations: READ_ONLY,
    },
    async (args) => run(() => getSupplierTool(args, access)),
  );

  server.registerTool(
    "create_supplier",
    {
      title: "Add a supplier",
      description: "Add a supplier, optionally with its contacts, the catalogue products it offers and a first note. Company names are unique; an existing supplier is refused.",
      inputSchema: z.strictObject({
        company: z.string().trim().min(1).max(160),
        ...supplierFields,
        products: z.array(productRef).max(50).optional(),
        contacts: z.array(z.strictObject(contactFields)).max(20).optional(),
        note: z.string().trim().min(1).max(5000).optional(),
      }),
      annotations: write(false),
    },
    async (args) => run(() => createSupplierTool(args, access)),
  );

  server.registerTool(
    "update_supplier",
    {
      title: "Update a supplier",
      description: "Change a supplier's company details, verification or active flag. Only the fields given change. Set active: false to retire a supplier.",
      inputSchema: z.strictObject({
        supplier: supplierRef,
        company: z.string().trim().min(1).max(160).optional(),
        ...supplierFields,
        active: z.boolean().optional(),
      }),
      annotations: write(true),
    },
    async (args) => run(() => updateSupplierTool(args, access)),
  );

  server.registerTool(
    "add_supplier_contact",
    {
      title: "Add a supplier contact",
      description: "Add a named person at a supplier, with their role, phone and email.",
      inputSchema: z.strictObject({ supplier: supplierRef, ...contactFields }),
      annotations: write(false),
    },
    async (args) => run(() => addSupplierContactTool(args, access)),
  );

  server.registerTool(
    "update_supplier_contact",
    {
      title: "Update a supplier contact",
      description: "Change a contact's name, role, phone, email or primary flag. Only the fields given change. contact_id comes from get_supplier.",
      inputSchema: z.strictObject({
        supplier: supplierRef,
        contact_id: z.string().uuid(),
        ...contactFields,
        name: contactFields.name.optional(),
      }),
      annotations: write(true),
    },
    async (args) => run(() => updateSupplierContactTool(args, access)),
  );

  server.registerTool(
    "remove_supplier_contact",
    {
      title: "Remove a supplier contact",
      description: "Remove a person who no longer works with the supplier. Confirm with the user first.",
      inputSchema: z.strictObject({ supplier: supplierRef, contact_id: z.string().uuid() }),
      annotations: write(true, true),
    },
    async (args) => run(() => removeSupplierContactTool(args, access)),
  );

  server.registerTool(
    "add_supplier_note",
    {
      title: "Add a supplier note",
      description: "Add a timestamped note to a supplier, e.g. the outcome of a call or visit. Notes are attributed to the signed-in admin and cannot be edited here.",
      inputSchema: z.strictObject({ supplier: supplierRef, note: z.string().trim().min(1).max(5000) }),
      annotations: write(false),
    },
    async (args) => run(() => addSupplierNoteTool(args, access)),
  );

  server.registerTool(
    "set_supplier_product",
    {
      title: "Set a supplier product",
      description:
        "Record that a supplier offers a catalogue product, or update that link: available: false when they currently cannot supply it, plus notes such as grade or packaging. Price history is kept.",
      inputSchema: z.strictObject({
        supplier: supplierRef,
        product: productRef,
        available: z.boolean().optional(),
        notes: z.string().trim().max(2000).optional(),
      }),
      annotations: write(true),
    },
    async (args) => run(() => setSupplierProductTool(args, access)),
  );

  server.registerTool(
    "record_supplier_price",
    {
      title: "Record a supplier price",
      description:
        "Record a price a supplier quoted for a catalogue product, exactly as quoted. FeedSport computes the price per tonne and adds the product to the supplier if needed. Returns the change from their previous quote on the same basis.",
      inputSchema: z.strictObject({
        supplier: supplierRef,
        product: productRef,
        price: z.number().positive().max(100_000_000).describe("The quoted price, at most 2 decimal places."),
        currency: z.string().regex(/^[A-Za-z]{3}$/).default("USD"),
        unit: z.enum(SUPPLIER_PRICE_UNITS).describe("What the price is per: tonne, kg, or bag (give bag_size_kg)."),
        bag_size_kg: z.number().positive().max(1000).optional(),
        min_quantity_tonnes: z.number().min(0).max(100_000).default(0).describe("Smallest order, in tonnes, this price applies to (price tier)."),
        basis: z.enum(SUPPLIER_PRICE_BASES).default("ex_works").describe("ex_works (collect from the supplier) or delivered."),
        delivery_location: z.string().trim().max(160).optional().describe("Where a delivered price delivers to."),
        quoted_on: isoDate.optional().describe("Date the supplier gave the price; defaults to today."),
        valid_until: isoDate.optional(),
        source: z.string().trim().max(200).optional().describe('How it was quoted, e.g. "phone call", "WhatsApp", "written quotation".'),
        notes: z.string().trim().max(2000).optional(),
      }),
      annotations: write(false),
    },
    async (args) => run(() => recordSupplierPriceTool(args, access)),
  );

  server.registerTool(
    "compare_supplier_prices",
    {
      title: "Compare supplier prices",
      description:
        "Rank suppliers of one catalogue product by their best current quote per tonne (newest quote per price tier and basis), with FeedSport's selling price per tonne and margin. Suppliers with no matching quote are listed with their phone lines so they can be called.",
      inputSchema: z.object({
        product: productRef,
        basis: z.enum(SUPPLIER_PRICE_BASES).optional(),
        quantity_tonnes: z.number().positive().max(100_000).optional().describe("Order size; only quotes whose tier applies to it are used."),
        currency: z.string().regex(/^[A-Za-z]{3}$/).default("USD"),
        include_expired: z.boolean().default(false),
        include_inactive: z.boolean().default(false),
      }),
      annotations: READ_ONLY,
    },
    async (args) => run(() => compareSupplierPricesTool(args, access)),
  );
}

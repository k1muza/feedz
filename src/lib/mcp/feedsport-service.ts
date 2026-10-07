/**
 * Agent-facing adapter over FeedSport's formulation services.
 *
 * Everything nutritional — requirements, ingredient composition, inclusion
 * limits, optimization, feasibility and evaluation — is delegated to the same
 * modules the web app uses. This file only resolves identifiers, enforces that
 * agent input can tighten (never relax) FeedSport rules, and shapes results.
 */
import type { DietAnalysis, AnalyzedNutrient, DietFormula } from "@/lib/diet-formula";
import {
  ingredientDefaultPlanningPricePerTonne,
  ingredientDefaultPrice,
  ingredientImportPriceMultiplier,
  type IngredientDefaultPrice,
} from "@/lib/feed-ingredient-prices";
import {
  evaluateFormulation,
  formulateLeastCostDiet,
  formulationRequirements,
  type FormulationIngredientOption,
  type FormulationNutrientComparison,
  type FormulationSettings,
  type FormulationSolution,
} from "@/lib/feed-optimizer";
import { FEED_PROGRAMMES, feedProgrammeById, type FeedProgrammeDefinition } from "@/lib/feed-programmes";
import {
  INGREDIENT_LIBRARY,
  ingredientLibraryWithCustomPremixes,
  sidAminoAcidPct,
  sttdPhosphorusPctOf,
  type IngredientLibrary,
  type IngredientNutrientRecord,
} from "@/lib/ingredient-nutrients";
import type { FormulationScenario } from "@/lib/feed-formulation-diagnostics";
import type { EnergySystem } from "@/lib/nutrition-targets";
import type { NutritionPhase } from "@/lib/nutrition";
import {
  PUBLIC_PREMIX_ID,
  PUBLIC_PREMIX_INCLUSION_PCT,
  PUBLIC_PREMIX_NAME,
  publicPremixProfileForPhase,
} from "@/lib/public-feed-premix";

export const SOLVER = "GLPK (glpk.js)";
export const CURRENCY = "USD";

/** Raised for caller mistakes; surfaced to the agent as a tool error. */
export class FeedSportInputError extends Error {}

export type FeedSportServiceContext = {
  /** FeedSport planning prices (database prices merged over defaults). */
  prices: readonly IngredientDefaultPrice[];
};

// ---------------------------------------------------------------------------
// Shared helpers

export function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function snake(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/-/g, "_")
    .toLowerCase();
}

const UNIT_SUFFIXES: ReadonlyArray<[string, string]> = [
  ["KcalKg", "kcal/kg"],
  ["IuKg", "IU/kg"],
  ["McgKg", "mcg/kg"],
  ["MgKg", "mg/kg"],
  ["Ppm", "ppm"],
  ["Pct", "%"],
];

/** "crudeProteinPct" → { key: "crude_protein", unit: "%" } */
function nutrientKey(field: string, fallbackUnit = "%"): { key: string; unit: string } {
  for (const [suffix, unit] of UNIT_SUFFIXES) {
    if (field.endsWith(suffix)) {
      return { key: snake(field.slice(0, -suffix.length)), unit };
    }
  }
  return { key: snake(field), unit: fallbackUnit };
}

const ENERGY_KEYS: Record<string, string> = {
  digestibleKcalKg: "digestible_energy",
  metabolizableKcalKg: "metabolizable_energy",
  standardizedMetabolizableKcalKg: "standardized_metabolizable_energy",
  netKcalKg: "net_energy",
};

type NutrientValue = { value: number; unit: string };

function addNutrients(
  target: Record<string, NutrientValue>,
  values: Record<string, number | undefined>,
  { prefix = "", unit }: { prefix?: string; unit?: string } = {},
) {
  for (const [field, value] of Object.entries(values)) {
    if (value === undefined) continue;
    const parsed = nutrientKey(field);
    target[`${prefix}${parsed.key}`] = { value: round(value), unit: unit ?? parsed.unit };
  }
}

/** Published nutrient values only; values absent from the source stay absent. */
export function ingredientNutrients(
  ingredient: IngredientNutrientRecord,
): Record<string, NutrientValue> {
  const nutrients: Record<string, NutrientValue> = {};
  addNutrients(nutrients, ingredient.composition);
  for (const [field, value] of Object.entries(ingredient.energy)) {
    if (value !== undefined) {
      nutrients[ENERGY_KEYS[field] ?? snake(field)] = { value: round(value), unit: "kcal/kg" };
    }
  }

  addNutrients(nutrients, ingredient.aminoAcids.totalPct, { prefix: "total_", unit: "%" });
  const aminoAcids = new Set([
    ...Object.keys(ingredient.aminoAcids.totalPct),
    ...Object.keys(ingredient.aminoAcids.sidPct),
  ]);
  for (const aminoAcid of aminoAcids) {
    const value = sidAminoAcidPct(ingredient, aminoAcid);
    if (value !== undefined) {
      nutrients[`sid_${snake(aminoAcid)}`] = { value: round(value), unit: "%" };
    }
  }

  const { sttdPhosphorusPct: _explicit, sttdPhosphorusDigestibilityPct: _coefficient, ...minerals } =
    ingredient.macroMinerals;
  addNutrients(nutrients, minerals);
  const sttd = sttdPhosphorusPctOf(ingredient);
  if (sttd !== undefined) nutrients.sttd_phosphorus = { value: round(sttd), unit: "%" };

  addNutrients(nutrients, ingredient.traceMineralsPpm, { unit: "ppm" });
  addNutrients(nutrients, ingredient.vitamins);
  return nutrients;
}

// ---------------------------------------------------------------------------
// Programmes

type ResolvedPhase = {
  programme: FeedProgrammeDefinition;
  phase: NutritionPhase;
  id: string;
};

function phaseId(programme: FeedProgrammeDefinition, phase: NutritionPhase): string {
  return `${programme.id}:${phase.id}`;
}

function loadedProgrammes(): FeedProgrammeDefinition[] {
  return FEED_PROGRAMMES.filter(
    (programme) => programme.status === "loaded" && programme.phases.length > 0,
  );
}

export function resolvePhase(id: string): ResolvedPhase {
  const [programmeId, requestedPhaseId] = id.split(":", 2);
  const programme = feedProgrammeById(programmeId);
  if (!programme || programme.status !== "loaded") {
    throw new FeedSportInputError(
      `Unknown programme "${programmeId}". Call get_programmes to list valid programme ids.`,
    );
  }
  const phase = requestedPhaseId
    ? programme.phases.find((candidate) => candidate.id === requestedPhaseId)
    : programme.phases.length === 1
      ? programme.phases[0]
      : undefined;
  if (!phase) {
    throw new FeedSportInputError(
      `${requestedPhaseId ? `Unknown phase "${requestedPhaseId}"` : `Programme "${programmeId}" has several phases`}. Use one of: ${programme.phases
        .map((candidate) => phaseId(programme, candidate))
        .join(", ")}.`,
    );
  }
  return { programme, phase, id: phaseId(programme, phase) };
}

function phaseSummary(programme: FeedProgrammeDefinition, phase: NutritionPhase) {
  return {
    id: phaseId(programme, phase),
    name: phase.label,
    phase_class: phase.phaseClass,
    body_weight_kg: { min: phase.lookupMinWeightKg, max: phase.lookupMaxWeightKg },
    source_weight_range: phase.sourceWeightRange,
    ...(phase.ageMinDays !== undefined || phase.ageMaxDays !== undefined
      ? { age_days: { min: phase.ageMinDays, max: phase.ageMaxDays } }
      : {}),
    ...(phase.parity ? { parity: phase.parity } : {}),
    ...(phase.periodLabel ? { period: phase.periodLabel } : {}),
  };
}

function programmeHeader(resolved: ResolvedPhase) {
  const { programme, phase } = resolved;
  return {
    id: resolved.id,
    name: `${programme.name} — ${phase.label}`,
    species: "pig",
    source: programme.sourceProgramme?.source,
  };
}

export function getProgrammes(filters: { query?: string; body_weight_kg?: number } = {}) {
  const query = filters.query?.trim().toLowerCase();
  const weight = filters.body_weight_kg;

  return loadedProgrammes().flatMap((programme) => {
    const phases = programme.phases.filter((phase) => {
      if (weight !== undefined) {
        if (weight < phase.lookupMinWeightKg || weight > phase.lookupMaxWeightKg) return false;
      }
      if (query) {
        const haystack = `${programme.id} ${programme.name} ${programme.description} ${phase.id} ${phase.label} ${phase.phaseClass}`.toLowerCase();
        if (!query.split(/\s+/).every((token) => haystack.includes(token))) return false;
      }
      return true;
    });
    if (phases.length === 0) return [];

    return [
      {
        id: programme.id,
        name: programme.name,
        description: programme.description,
        // Every loaded FeedSport programme is a swine programme.
        species: "pig",
        source: programme.sourceProgramme?.source,
        source_version: programme.sourceProgramme?.sourceVersion,
        phases: phases.map((phase) => phaseSummary(programme, phase)),
      },
    ];
  });
}

function requirementMap(
  requirements: ReturnType<typeof formulationRequirements>,
) {
  return Object.fromEntries(
    requirements.map((requirement) => [
      snake(requirement.id),
      {
        label: requirement.label,
        [requirement.relation]: round(requirement.bound),
        unit: requirement.unit,
      },
    ]),
  );
}

/** Practical guidance the source publishes but the solver does not model. */
const ENFORCED_PRACTICAL_KEYS = new Set(["lLysineHclMaxPct", "neutralDetergentFibreMinPct"]);

export function getProgramme(id: string, energySystem: EnergySystem = "ME") {
  const resolved = resolvePhase(id);
  const { programme, phase } = resolved;
  const base = formulationRequirements(phase, energySystem);
  const premix = phase.supplementation
    ? formulationRequirements(phase, energySystem, {
        includeSupplementationTargets: true,
        traceMineralBasis: "inorganic",
      }).filter((requirement) => requirement.id.startsWith("supplement-"))
    : [];
  const advisory = Object.fromEntries(
    Object.entries(phase.requirements.practical).filter(
      ([key, value]) => value !== undefined && !ENFORCED_PRACTICAL_KEYS.has(key),
    ),
  );

  return {
    ...programmeHeader(resolved),
    description: programme.description,
    phase: phaseSummary(programme, phase),
    energy_system: energySystem,
    ...(phase.dailyFeedIntakeKg !== undefined ? { daily_feed_intake_kg: phase.dailyFeedIntakeKg } : {}),
    requirements: requirementMap(base),
    ...(premix.length > 0
      ? {
          supplementation_requirements: {
            applies_when: `Enforced only when the FeedSport premix (${PUBLIC_PREMIX_ID}) is included in a formulation.`,
            source_tables: phase.supplementation?.sourceTables,
            requirements: requirementMap(premix),
          },
        }
      : {}),
    ...(Object.keys(advisory).length > 0
      ? {
          advisory_guidelines: {
            note: "Published practical guidance that the FeedSport solver does not enforce.",
            values: advisory,
          },
        }
      : {}),
    source: programme.sourceProgramme?.source,
    source_version: programme.sourceProgramme?.sourceVersion,
    source_table: phase.sourceTable,
    source_page: phase.sourcePage,
  };
}

// ---------------------------------------------------------------------------
// Ingredients

const PREMIX_ALIASES = ["premix", "vitamin mineral premix", "vitamin-mineral premix", "grower premix", "finisher premix"];

function priceSummary(ingredientId: string, context: FeedSportServiceContext) {
  const price = ingredientDefaultPrice(ingredientId, context.prices);
  if (!price) return { price_per_tonne: null };
  return {
    price_per_tonne: round(ingredientDefaultPlanningPricePerTonne(ingredientId, context.prices)!, 2),
    currency: CURRENCY,
    price_market: price.market,
    price_as_of: price.asOf,
    price_source: price.sourceLabel,
    ...(ingredientImportPriceMultiplier(price.sourceScope) !== 1
      ? { import_cost_multiplier: ingredientImportPriceMultiplier(price.sourceScope) }
      : {}),
  };
}

function premixSummary(context: FeedSportServiceContext) {
  return {
    id: PUBLIC_PREMIX_ID,
    name: PUBLIC_PREMIX_NAME,
    category: "vitamin_mineral_premix",
    aliases: PREMIX_ALIASES,
    ...priceSummary(PUBLIC_PREMIX_ID, context),
    default_constraints: {
      min_inclusion_percent: PUBLIC_PREMIX_INCLUSION_PCT,
      max_inclusion_percent: PUBLIC_PREMIX_INCLUSION_PCT,
    },
  };
}

function ingredientSummary(ingredient: IngredientNutrientRecord, context: FeedSportServiceContext) {
  return {
    id: ingredient.id,
    name: ingredient.name,
    category: ingredient.category,
    aliases: ingredient.aliases,
    ...priceSummary(ingredient.id, context),
    default_constraints: {
      min_inclusion_percent: ingredient.constraints.minInclusionPct ?? 0,
      max_inclusion_percent: ingredient.constraints.maxInclusionPct ?? 100,
    },
  };
}

export const INGREDIENT_CATEGORIES = [
  "cereal",
  "protein_meal",
  "byproduct",
  "oil_fat",
  "mineral",
  "amino_acid",
  "vitamin_mineral_premix",
  "other",
] as const;

export type IngredientSearchFilters = {
  query?: string;
  category?: (typeof INGREDIENT_CATEGORIES)[number];
  nutrient?: string;
  market?: string;
  supplier?: string;
  available_only?: boolean;
  limit?: number;
};

export function searchIngredients(
  filters: IngredientSearchFilters,
  context: FeedSportServiceContext,
  library: IngredientLibrary = INGREDIENT_LIBRARY,
) {
  const tokens = filters.query?.trim().toLowerCase().split(/\s+/).filter(Boolean) ?? [];
  const nutrient = filters.nutrient ? snake(filters.nutrient.trim().replace(/\s+/g, "_")) : undefined;
  const market = filters.market?.trim().toLowerCase();
  const supplier = filters.supplier?.trim().toLowerCase();

  type Candidate = {
    summary: ReturnType<typeof ingredientSummary> | ReturnType<typeof premixSummary>;
    text: string;
    exact: boolean;
    nutrientValues?: Record<string, NutrientValue>;
  };
  const candidates: Candidate[] = [
    ...library.ingredients.map((ingredient) => ({
      summary: ingredientSummary(ingredient, context),
      text: `${ingredient.id} ${ingredient.name} ${ingredient.aliases.join(" ")} ${ingredient.category}`,
      exact: [ingredient.id, ingredient.name, ...ingredient.aliases].some(
        (label) => label.toLowerCase() === filters.query?.trim().toLowerCase(),
      ),
      nutrientValues: nutrient
        ? Object.fromEntries(
            Object.entries(ingredientNutrients(ingredient)).filter(
              ([key, value]) => key.includes(nutrient) && value.value > 0,
            ),
          )
        : undefined,
    })),
    {
      summary: premixSummary(context),
      text: `${PUBLIC_PREMIX_ID} ${PUBLIC_PREMIX_NAME} ${PREMIX_ALIASES.join(" ")} vitamin_mineral_premix`,
      exact: PREMIX_ALIASES.includes(filters.query?.trim().toLowerCase() ?? ""),
      nutrientValues: nutrient ? {} : undefined,
    },
  ];

  const matches = candidates.filter((candidate) => {
    const { summary } = candidate;
    const text = candidate.text.toLowerCase();
    if (!tokens.every((token) => text.includes(token))) return false;
    if (filters.category && summary.category !== filters.category) return false;
    if (filters.available_only && summary.price_per_tonne === null) return false;
    if (market && !("price_market" in summary && summary.price_market?.toLowerCase().includes(market))) return false;
    if (supplier && !("price_source" in summary && summary.price_source?.toLowerCase().includes(supplier))) return false;
    if (nutrient && Object.keys(candidate.nutrientValues ?? {}).length === 0) return false;
    return true;
  });

  matches.sort(
    (a, b) =>
      Number(b.exact) - Number(a.exact) ||
      Number(b.summary.price_per_tonne !== null) - Number(a.summary.price_per_tonne !== null) ||
      a.summary.name.localeCompare(b.summary.name),
  );

  const limit = filters.limit ?? 25;
  return {
    total_matches: matches.length,
    ingredients: matches.slice(0, limit).map((candidate) => ({
      ...candidate.summary,
      ...(candidate.nutrientValues ? { matching_nutrients: candidate.nutrientValues } : {}),
    })),
  };
}

export function getIngredient(
  id: string,
  context: FeedSportServiceContext,
  programmeId?: string,
  library: IngredientLibrary = INGREDIENT_LIBRARY,
) {
  if (id === PUBLIC_PREMIX_ID) {
    if (!programmeId) {
      return {
        ...premixSummary(context),
        nutrients: null,
        note: "The FeedSport premix profile is phase-specific: it is built to meet the phase's Brazilian Tables Chapter 7 vitamin and trace-mineral supplementation targets at a fixed 1% inclusion. Pass programme_id to see the profile for a phase.",
        source: "FeedSport premix specification derived from Brazilian Tables 2024 Chapter 7",
      };
    }
    const { phase } = resolvePhase(programmeId);
    const premixLibrary = ingredientLibraryWithCustomPremixes([publicPremixProfileForPhase(phase)], library);
    const record = premixLibrary.ingredients.find((ingredient) => ingredient.id === PUBLIC_PREMIX_ID)!;
    return {
      ...premixSummary(context),
      programme_id: resolvePhase(programmeId).id,
      nutrients: ingredientNutrients(record),
      source: "FeedSport premix specification derived from Brazilian Tables 2024 Chapter 7",
    };
  }

  const ingredient = resolveIngredient(id, library).record;
  const provenance = ingredient.provenance;
  return {
    ...ingredientSummary(ingredient, context),
    nutrients: ingredientNutrients(ingredient),
    nutrient_basis: library.basis.nutrientComposition,
    missing_values_note:
      "Only published values are listed. Missing values are never assumed; FeedSport treats them as unknown.",
    ...(ingredient.constraints.notes.length > 0 ? { constraint_notes: ingredient.constraints.notes } : {}),
    source: provenance.source?.title ?? library.source.title,
    source_table: provenance.sourceTable,
    source_page: provenance.sourcePage,
    ...(Object.keys(provenance.nutrientSources).length > 0
      ? {
          supplementary_sources: Object.fromEntries(
            Object.entries(provenance.nutrientSources).map(([path, source]) => [
              path,
              `${source.publisher}, ${source.title}${source.year ? ` (${source.year})` : ""}`,
            ]),
          ),
        }
      : {}),
    ...(provenance.notes.length > 0 ? { notes: provenance.notes } : {}),
  };
}

type ResolvedIngredient = {
  id: string;
  requested: string;
  record: IngredientNutrientRecord;
};

/**
 * Exact id first, then an unambiguous exact name/alias match. Partial matches
 * are never guessed — the agent gets candidates and must choose.
 */
function resolveIngredient(requested: string, library: IngredientLibrary): ResolvedIngredient {
  const normalized = requested.trim().toLowerCase();
  const byId = library.ingredients.find((ingredient) => ingredient.id === requested.trim());
  if (byId) return { id: byId.id, requested, record: byId };

  const byLabel = library.ingredients.filter((ingredient) =>
    [ingredient.name, ...ingredient.aliases].some((label) => label.toLowerCase() === normalized),
  );
  if (byLabel.length === 1) return { id: byLabel[0].id, requested, record: byLabel[0] };

  const candidates = (byLabel.length > 1
    ? byLabel
    : library.ingredients.filter((ingredient) =>
        `${ingredient.id} ${ingredient.name} ${ingredient.aliases.join(" ")}`
          .toLowerCase()
          .includes(normalized),
      )
  ).map((ingredient) => `${ingredient.id} (${ingredient.name})`);

  throw new FeedSportInputError(
    candidates.length > 0
      ? `Ingredient "${requested}" is ambiguous or not an exact id. Candidates: ${candidates.slice(0, 10).join("; ")}.`
      : `Unknown ingredient "${requested}". Use search_ingredients to find FeedSport ingredient ids.`,
  );
}

export function resolveRequestedIngredient(requested: string, library: IngredientLibrary): string {
  const normalized = requested.trim().toLowerCase();
  if (normalized === PUBLIC_PREMIX_ID || PREMIX_ALIASES.includes(normalized)) return PUBLIC_PREMIX_ID;
  return resolveIngredient(requested, library).id;
}

// ---------------------------------------------------------------------------
// Formulation output shaping

function nutrientEntry(measure: AnalyzedNutrient, unit: string) {
  return measure.complete
    ? { value: round(measure.value), unit }
    : { value: null, unit, missing_data_for: measure.missingIngredientIds };
}

function dietProfile(analysis: DietAnalysis, includeSupplementation: boolean) {
  const profile: Record<string, { value: number | null; unit: string; missing_data_for?: string[] }> = {};
  for (const [field, measure] of Object.entries(analysis.energy)) {
    profile[ENERGY_KEYS[field] ?? snake(field)] = nutrientEntry(measure, "kcal/kg");
  }
  profile.crude_protein = nutrientEntry(analysis.crudeProteinPct, "%");
  profile.digestible_protein = nutrientEntry(analysis.digestibleProteinPct, "%");
  profile.neutral_detergent_fibre = nutrientEntry(analysis.neutralDetergentFibrePct, "%");
  profile.linoleic_acid = nutrientEntry(analysis.fattyAcids.linoleicAcidPct, "%");
  for (const [aminoAcid, measure] of Object.entries(analysis.sidAminoAcidsPct)) {
    profile[`sid_${snake(aminoAcid)}`] = nutrientEntry(measure, "%");
  }
  for (const [field, measure] of Object.entries(analysis.minerals)) {
    const { key, unit } = nutrientKey(field);
    profile[key] = nutrientEntry(measure, unit);
  }
  if (includeSupplementation) {
    for (const [mineral, measure] of Object.entries(analysis.supplementation.traceMineralsPpm)) {
      profile[`supplemented_${mineral}`] = nutrientEntry(measure, "ppm");
    }
    for (const [field, measure] of Object.entries(analysis.supplementation.vitamins)) {
      const { key, unit } = nutrientKey(field);
      profile[`supplemented_${key}`] = nutrientEntry(measure, unit);
    }
  }
  profile.soybean_meal_inclusion = { value: round(analysis.soybeanMealPct), unit: "%" };
  profile.l_lysine_hcl_inclusion = { value: round(analysis.lLysineHclPct), unit: "%" };
  return profile;
}

export function comparisonRows(profile: readonly FormulationNutrientComparison[]) {
  return profile.map((row) => {
    const tolerance = Math.max(Math.abs(row.requirement) * 1e-4, 1e-6);
    return {
      nutrient: snake(row.id),
      label: row.label,
      unit: row.unit,
      relation: row.relation,
      requirement: round(row.requirement),
      actual: round(row.actual),
      margin: round(row.margin),
      binding: row.binding,
      passes: row.margin >= -tolerance,
    };
  });
}

export type PriceRecord = {
  ingredient: string;
  price_per_tonne: number;
  source: "request" | "feedsport_planning_price";
  market?: string;
  as_of?: string;
  source_label?: string;
  import_cost_multiplier?: number;
};

export function libraryName(id: string, library: IngredientLibrary): string {
  return library.ingredients.find((ingredient) => ingredient.id === id)?.name ?? id;
}

export function recipeRows(
  formula: DietFormula,
  pricesPerTonne: ReadonlyMap<string, number>,
  library: IngredientLibrary,
) {
  return [...formula.ingredients]
    .sort((a, b) => b.inclusionPct - a.inclusionPct)
    .map((row) => {
      const price = pricesPerTonne.get(row.ingredientId);
      return {
        ingredient: row.ingredientId,
        name: libraryName(row.ingredientId, library),
        // Enough precision that re-analysing a returned recipe still passes.
        percentage: round(row.inclusionPct, 5),
        kg_per_tonne: round(row.inclusionPct * 10, 4),
        price_per_tonne: price === undefined ? null : round(price, 2),
        cost_contribution_per_tonne: price === undefined ? null : round((row.inclusionPct / 100) * price, 2),
      };
    });
}

function dataSources(
  resolved: ResolvedPhase,
  library: IngredientLibrary,
  ingredientIds: readonly string[],
  prices: readonly PriceRecord[],
  energySystem: EnergySystem,
  includesPremix: boolean,
) {
  const source = resolved.programme.sourceProgramme;
  const supplementaryNutrientSources = ingredientIds.flatMap((id) => {
    const record = library.ingredients.find((ingredient) => ingredient.id === id);
    const paths = Object.keys(record?.provenance.nutrientSources ?? {});
    return paths.length > 0 ? [{ ingredient: id, nutrients: paths }] : [];
  });

  return {
    programme_source: source?.source,
    programme_version: source?.sourceVersion,
    programme_table: resolved.phase.sourceTable,
    programme_page: resolved.phase.sourcePage,
    ...(includesPremix && resolved.phase.supplementation
      ? { supplementation_source_tables: resolved.phase.supplementation.sourceTables }
      : {}),
    ingredient_source: library.source.title,
    ingredient_source_publisher: library.source.publisher,
    ingredient_database: library.id,
    ingredient_database_version: `${library.source.edition} (${library.source.year})`,
    ...(supplementaryNutrientSources.length > 0
      ? { supplementary_nutrient_sources: supplementaryNutrientSources }
      : {}),
    prices,
    currency: CURRENCY,
    energy_system: energySystem,
    solver: SOLVER,
  };
}

export function priceRecord(
  ingredientId: string,
  override: number | undefined,
  context: FeedSportServiceContext,
): PriceRecord | undefined {
  if (override !== undefined) {
    return { ingredient: ingredientId, price_per_tonne: override, source: "request" };
  }
  const price = ingredientDefaultPrice(ingredientId, context.prices);
  const planning = ingredientDefaultPlanningPricePerTonne(ingredientId, context.prices);
  if (!price || planning === undefined) return undefined;
  const multiplier = ingredientImportPriceMultiplier(price.sourceScope);
  return {
    ingredient: ingredientId,
    price_per_tonne: round(planning, 2),
    source: "feedsport_planning_price",
    market: price.market,
    as_of: price.asOf,
    source_label: price.sourceLabel,
    ...(multiplier !== 1 ? { import_cost_multiplier: multiplier } : {}),
  };
}

/** Diagnostic hints only: which kinds of ingredient typically supply a nutrient. */
const SUPPLYING_INGREDIENTS: Array<{ match: (id: string) => boolean; category: string; examples: string[] }> = [
  { match: (id) => id.startsWith("energy-"), category: "oil_fat", examples: ["soybean-degummed-oil", "corn-oil"] },
  { match: (id) => id === "sid-lysine", category: "amino_acid", examples: ["l-lysine-hcl"] },
  { match: (id) => id === "sid-met-cys", category: "amino_acid", examples: ["dl-methionine"] },
  { match: (id) => id === "sid-threonine", category: "amino_acid", examples: ["l-threonine"] },
  { match: (id) => id === "sid-tryptophan", category: "amino_acid", examples: ["l-tryptophan"] },
  { match: (id) => id === "sid-valine", category: "amino_acid", examples: ["l-valine"] },
  { match: (id) => id === "sid-isoleucine", category: "amino_acid", examples: ["l-isoleucine"] },
  {
    match: (id) => id.startsWith("sid-") || id === "crude-protein" || id === "digestible-protein" || id === "potassium",
    category: "protein_meal",
    examples: ["soybean-meal-solvent-extracted", "soybean-meal-dehulled-solvent-extracted", "fish-meal-54"],
  },
  { match: (id) => id === "calcium", category: "mineral", examples: ["limestone-ground", "dicalcium-phosphate"] },
  {
    match: (id) => id === "sttd-phosphorus" || id === "available-phosphorus",
    category: "mineral",
    examples: ["dicalcium-phosphate", "monocalcium-phosphate"],
  },
  { match: (id) => id === "sodium" || id === "chloride", category: "mineral", examples: ["sodium-chloride"] },
  { match: (id) => id === "linoleic-acid", category: "oil_fat", examples: ["soybean-degummed-oil", "corn-oil"] },
  { match: (id) => id === "neutral-detergent-fibre", category: "byproduct", examples: ["wheat-bran", "soybean-hulls"] },
  { match: (id) => id.startsWith("supplement-"), category: "vitamin_mineral_premix", examples: [PUBLIC_PREMIX_ID] },
];

function missingIngredientHints(constraintIds: readonly string[], selected: ReadonlySet<string>) {
  return constraintIds.flatMap((constraintId) => {
    const hint = SUPPLYING_INGREDIENTS.find((candidate) => candidate.match(constraintId));
    if (!hint) return [];
    const examples = hint.examples.filter((id) => !selected.has(id));
    if (examples.length === 0) return [];
    return [{ nutrient: snake(constraintId), category: hint.category, candidate_ingredients: examples }];
  });
}

// ---------------------------------------------------------------------------
// formulate

export const FORMULATION_OBJECTIVES = ["least_cost", "simple", "low_soy", "low_import"] as const;
export type FormulationObjective = (typeof FORMULATION_OBJECTIVES)[number];

export type IngredientConstraintInput = {
  min_percent?: number;
  max_percent?: number;
  price_per_tonne?: number;
};

export type FormulateInput = {
  programme_id: string;
  objective?: FormulationObjective;
  energy_system?: EnergySystem;
  ingredients: readonly string[];
  constraints?: Record<string, IngredientConstraintInput>;
};

type PreparedRequest = {
  resolved: ResolvedPhase;
  energySystem: EnergySystem;
  library: IngredientLibrary;
  settings: FormulationSettings;
  includesPremix: boolean;
  ingredientIds: string[];
  resolvedNames: Array<{ requested: string; ingredient: string }>;
};

function prepareRequest(
  programmeId: string,
  energySystem: EnergySystem,
  requestedIngredients: readonly string[],
): PreparedRequest {
  const resolved = resolvePhase(programmeId);
  const ingredientIds: string[] = [];
  const resolvedNames: PreparedRequest["resolvedNames"] = [];
  for (const requested of requestedIngredients) {
    const id = resolveRequestedIngredient(requested, INGREDIENT_LIBRARY);
    if (ingredientIds.includes(id)) {
      throw new FeedSportInputError(`Ingredient ${id} was listed more than once.`);
    }
    ingredientIds.push(id);
    if (id !== requested) resolvedNames.push({ requested, ingredient: id });
  }

  const includesPremix = ingredientIds.includes(PUBLIC_PREMIX_ID);
  return {
    resolved,
    energySystem,
    library: includesPremix
      ? ingredientLibraryWithCustomPremixes([publicPremixProfileForPhase(resolved.phase)], INGREDIENT_LIBRARY)
      : INGREDIENT_LIBRARY,
    settings: {
      includeSupplementationTargets: includesPremix,
      traceMineralBasis: "inorganic",
    },
    includesPremix,
    ingredientIds,
    resolvedNames,
  };
}

function formulationNotes(request: PreparedRequest): string[] {
  const notes: string[] = [];
  if (request.includesPremix) {
    notes.push(
      `The FeedSport premix is fixed at ${PUBLIC_PREMIX_INCLUSION_PCT}% and its vitamin and trace-mineral supplementation targets are enforced.`,
    );
  } else {
    notes.push(
      `No FeedSport premix was included, so vitamin and trace-mineral supplementation is not formulated or checked. Add ${PUBLIC_PREMIX_ID} to cover it.`,
    );
  }
  return notes;
}

export type FormulationBaseInput = Omit<FormulateInput, "objective">;

/**
 * Resolve an agent request into the engine's scenario: ingredient ids,
 * request limits (which can only tighten FeedSport defaults) and prices.
 */
export function buildScenario(input: FormulationBaseInput, context: FeedSportServiceContext) {
  const request = prepareRequest(input.programme_id, input.energy_system ?? "ME", input.ingredients);
  const { resolved, library, ingredientIds } = request;

  // Map constraint keys (ids or names as the agent wrote them) onto resolved ids.
  const constraints = new Map<string, IngredientConstraintInput>();
  for (const [key, value] of Object.entries(input.constraints ?? {})) {
    const id = resolveRequestedIngredient(key, INGREDIENT_LIBRARY);
    if (!ingredientIds.includes(id)) {
      throw new FeedSportInputError(
        `Constraint given for ${id}, which is not in the ingredient list. Add it to ingredients or remove the constraint.`,
      );
    }
    if (value.min_percent !== undefined && value.max_percent !== undefined && value.min_percent > value.max_percent) {
      throw new FeedSportInputError(`Constraint for ${id} has min_percent greater than max_percent.`);
    }
    if (id === PUBLIC_PREMIX_ID && (value.min_percent !== undefined || value.max_percent !== undefined)) {
      throw new FeedSportInputError(
        `The FeedSport premix inclusion is fixed at ${PUBLIC_PREMIX_INCLUSION_PCT}%; it cannot be constrained.`,
      );
    }
    constraints.set(id, value);
  }

  const prices: PriceRecord[] = [];
  const unpriced: string[] = [];
  for (const id of ingredientIds) {
    const record = priceRecord(id, constraints.get(id)?.price_per_tonne, context);
    if (record) prices.push(record);
    else unpriced.push(id);
  }
  if (unpriced.length > 0) {
    throw new FeedSportInputError(
      `FeedSport has no planning price for: ${unpriced.join(", ")}. Supply constraints.<ingredient>.price_per_tonne or remove the ingredient.`,
    );
  }
  const pricesPerTonne = new Map(prices.map((price) => [price.ingredient, price.price_per_tonne]));

  const options: FormulationIngredientOption[] = ingredientIds.map((id) => {
    const constraint = constraints.get(id);
    return {
      ingredientId: id,
      pricePerKg: pricesPerTonne.get(id)! / 1000,
      ...(id === PUBLIC_PREMIX_ID
        ? { minInclusionPct: PUBLIC_PREMIX_INCLUSION_PCT, maxInclusionPct: PUBLIC_PREMIX_INCLUSION_PCT }
        : { minInclusionPct: constraint?.min_percent, maxInclusionPct: constraint?.max_percent }),
    };
  });

  // Requests may only tighten FeedSport's own inclusion limits. The optimizer
  // applies max(min) / min(max) itself; this reports the limits it will use.
  const inclusionLimits = options.map((option) => {
    const record = library.ingredients.find((ingredient) => ingredient.id === option.ingredientId)!;
    const defaultMin = record.constraints.minInclusionPct ?? 0;
    const defaultMax = record.constraints.maxInclusionPct ?? 100;
    return {
      ingredient: option.ingredientId,
      min_percent: Math.max(defaultMin, option.minInclusionPct ?? 0),
      max_percent: Math.min(defaultMax, option.maxInclusionPct ?? 100),
      feedsport_default: { min_percent: defaultMin, max_percent: defaultMax },
    };
  });
  const relaxedRequests = inclusionLimits.flatMap((limit) => {
    const requested = constraints.get(limit.ingredient);
    const messages: string[] = [];
    if (requested?.max_percent !== undefined && requested.max_percent > limit.feedsport_default.max_percent) {
      messages.push(
        `Requested max ${requested.max_percent}% for ${limit.ingredient} exceeds the FeedSport limit; ${limit.feedsport_default.max_percent}% applies.`,
      );
    }
    if (requested?.min_percent !== undefined && requested.min_percent < limit.feedsport_default.min_percent) {
      messages.push(
        `Requested min ${requested.min_percent}% for ${limit.ingredient} is below the FeedSport minimum; ${limit.feedsport_default.min_percent}% applies.`,
      );
    }
    return messages;
  });

  const scenario: FormulationScenario = {
    phase: resolved.phase,
    energySystem: request.energySystem,
    options,
    library,
    settings: request.settings,
  };

  return {
    request,
    scenario,
    options,
    constraints,
    prices,
    pricesPerTonne,
    inclusionLimits,
    common: {
      programme: programmeHeader(resolved),
      ...(request.resolvedNames.length > 0 ? { resolved_ingredient_names: request.resolvedNames } : {}),
      data_sources: dataSources(resolved, library, ingredientIds, prices, request.energySystem, request.includesPremix),
    },
    notes: [...formulationNotes(request), ...relaxedRequests],
  };
}

export async function formulate(input: FormulateInput, context: FeedSportServiceContext) {
  const objective = input.objective ?? "least_cost";
  const { request, options, pricesPerTonne, inclusionLimits, common, notes } = buildScenario(input, context);
  const { resolved, library, ingredientIds } = request;

  const result = await formulateLeastCostDiet(
    resolved.phase,
    request.energySystem,
    options,
    library,
    request.settings,
  );

  if (result.status === "error") {
    return { status: "error" as const, message: result.message, ...common };
  }

  if (result.status === "missing-data") {
    return {
      status: "missing_data" as const,
      message: result.message,
      missing_data: result.missingData.map((row) => ({
        ingredient: row.ingredientId,
        nutrients: row.nutrientIds.map(snake),
      })),
      ...common,
    };
  }

  if (result.status === "infeasible") {
    const minSum = inclusionLimits.reduce((sum, limit) => sum + limit.min_percent, 0);
    const maxSum = inclusionLimits.reduce((sum, limit) => sum + limit.max_percent, 0);
    const boundIssues = [
      ...(minSum > 100 ? [`Minimum inclusions sum to ${round(minSum, 2)}%, above 100%.`] : []),
      ...(maxSum < 100 ? [`Maximum inclusions sum to ${round(maxSum, 2)}%, below 100%.`] : []),
    ];
    return {
      status: "infeasible" as const,
      message:
        "No formulation satisfies every FeedSport requirement with these ingredients and limits. Do not present any recipe as a valid ration.",
      issues: result.diagnostics.map((diagnostic) => ({
        nutrient: snake(diagnostic.constraintId),
        label: diagnostic.label,
        unit: diagnostic.unit,
        relation: diagnostic.relation,
        requirement: round(diagnostic.bound),
        best_achievable: round(diagnostic.actual),
        ...(diagnostic.relation === "min"
          ? { shortfall: round(diagnostic.shortfall) }
          : { excess: round(diagnostic.excess) }),
      })),
      ...(boundIssues.length > 0 ? { inclusion_limit_issues: boundIssues } : {}),
      possible_missing_ingredients: missingIngredientHints(
        result.diagnostics.map((diagnostic) => diagnostic.constraintId),
        new Set(ingredientIds),
      ),
      inclusion_limits: inclusionLimits,
      unsupported_requirements: result.unsupportedRequirements,
      notes,
      ...common,
    };
  }

  // Non-least-cost objectives are the engine's alternatives, which stay within
  // a fixed cost tolerance of the least-cost optimum.
  const alternative =
    objective === "least_cost"
      ? undefined
      : result.alternatives.find((candidate) => candidate.id === objective.replace("_", "-"));
  if (objective !== "least_cost" && !alternative) {
    notes.push(
      `No distinct "${objective}" formulation exists within ${result.alternativeCostTolerancePct}% of least cost, so the least-cost formulation is returned.`,
    );
  }
  const chosen: { solution: FormulationSolution; profile: FormulationNutrientComparison[] } = alternative
    ? { solution: alternative.solution, profile: alternative.nutrientProfile }
    : { solution: result.solution, profile: result.nutrientProfile };

  const used = new Set(chosen.solution.formula.ingredients.map((row) => row.ingredientId));
  return {
    status: "optimal" as const,
    objective,
    objective_applied: alternative ? objective : "least_cost",
    ...(alternative
      ? {
          least_cost_per_tonne: round(result.solution.costPerKg * 1000, 2),
          cost_increase_percent: round(alternative.costIncreasePct, 2),
        }
      : {}),
    cost_per_tonne: round(chosen.solution.costPerKg * 1000, 2),
    currency: CURRENCY,
    ingredients: recipeRows(chosen.solution.formula, pricesPerTonne, library),
    unused_ingredients: ingredientIds.filter((id) => !used.has(id)),
    nutritional_profile: dietProfile(chosen.solution.analysis, request.includesPremix),
    requirement_comparison: comparisonRows(chosen.profile),
    inclusion_limits: inclusionLimits,
    unsupported_requirements: result.unsupportedRequirements,
    notes,
    ...common,
  };
}

// ---------------------------------------------------------------------------
// analyse_formulation

export type AnalyseInput = {
  programme_id: string;
  energy_system?: EnergySystem;
  recipe: ReadonlyArray<{ ingredient: string; percentage: number }>;
  prices?: Record<string, number>;
};

export const RECIPE_TOTAL_TOLERANCE_PCT = 0.1;

export function analyseFormulation(input: AnalyseInput, context: FeedSportServiceContext) {
  const request = prepareRequest(
    input.programme_id,
    input.energy_system ?? "ME",
    input.recipe.map((row) => row.ingredient),
  );
  const { resolved, library, ingredientIds } = request;

  const total = input.recipe.reduce((sum, row) => sum + row.percentage, 0);
  if (Math.abs(total - 100) > RECIPE_TOTAL_TOLERANCE_PCT) {
    throw new FeedSportInputError(
      `Recipe percentages total ${round(total, 3)}%; they must total 100% (±${RECIPE_TOTAL_TOLERANCE_PCT}).`,
    );
  }

  // Within the rounding tolerance, treat percentages as parts of the mix: the
  // nutrient concentration of that mix is exactly the normalized recipe.
  const formula: DietFormula = {
    ingredients: ingredientIds.map((ingredientId, index) => ({
      ingredientId,
      inclusionPct: (input.recipe[index].percentage / total) * 100,
    })),
  };

  const priceOverrides = new Map<string, number>();
  for (const [key, value] of Object.entries(input.prices ?? {})) {
    const id = resolveRequestedIngredient(key, INGREDIENT_LIBRARY);
    if (!ingredientIds.includes(id)) {
      throw new FeedSportInputError(`A price was given for ${id}, which is not in the recipe.`);
    }
    priceOverrides.set(id, value);
  }
  const prices = ingredientIds.flatMap((id) => {
    const record = priceRecord(id, priceOverrides.get(id), context);
    return record ? [record] : [];
  });
  const pricesPerTonne = new Map(prices.map((price) => [price.ingredient, price.price_per_tonne]));
  const unpriced = ingredientIds.filter((id) => !pricesPerTonne.has(id));

  const evaluation = evaluateFormulation(resolved.phase, request.energySystem, formula, library, request.settings);
  const comparison = comparisonRows(evaluation.nutrientProfile);
  const deficiencies = comparison.filter((row) => row.relation === "min" && !row.passes);
  const excesses = comparison.filter((row) => row.relation === "max" && !row.passes);

  type InclusionLimitViolation = {
    ingredient: string;
    percentage: number;
    min_percent?: number;
    max_percent?: number;
  };
  const inclusionLimitViolations = formula.ingredients.flatMap((row): InclusionLimitViolation[] => {
    if (row.ingredientId === PUBLIC_PREMIX_ID) return [];
    const record = library.ingredients.find((ingredient) => ingredient.id === row.ingredientId)!;
    const min = record.constraints.minInclusionPct;
    const max = record.constraints.maxInclusionPct;
    if (max !== undefined && row.inclusionPct > max + 1e-6) {
      return [{ ingredient: row.ingredientId, percentage: row.inclusionPct, max_percent: max }];
    }
    if (min !== undefined && row.inclusionPct < min - 1e-6) {
      return [{ ingredient: row.ingredientId, percentage: row.inclusionPct, min_percent: min }];
    }
    return [];
  });

  const unverifiable = evaluation.incompleteRequirements.map((requirement) => ({
    nutrient: snake(requirement.id),
    label: requirement.label,
    unit: requirement.unit,
    relation: requirement.relation,
    requirement: round(requirement.requirement),
    missing_data_for: requirement.missingIngredientIds,
  }));

  const passes =
    deficiencies.length === 0 &&
    excesses.length === 0 &&
    unverifiable.length === 0 &&
    inclusionLimitViolations.length === 0;

  const notes = formulationNotes(request);
  if (request.includesPremix) {
    notes[0] = "The FeedSport premix profile for this phase is assumed; its vitamin and trace-mineral supplementation targets are checked.";
  }
  if (unverifiable.length > 0) {
    notes.push("Some requirements cannot be verified because ingredient nutrient data is missing; the formulation cannot pass until they can.");
  }
  if (Math.abs(total - 100) > 1e-9) {
    notes.push(`Recipe totalled ${round(total, 5)}%; it was analysed as proportions of that total.`);
  }

  return {
    status: passes ? ("pass" as const) : ("fail" as const),
    passes,
    cost_per_tonne:
      unpriced.length === 0
        ? round(
            formula.ingredients.reduce(
              (sum, row) => sum + (row.inclusionPct / 100) * pricesPerTonne.get(row.ingredientId)!,
              0,
            ),
            2,
          )
        : null,
    currency: CURRENCY,
    ...(unpriced.length > 0 ? { unpriced_ingredients: unpriced } : {}),
    ingredients: recipeRows(formula, pricesPerTonne, library),
    nutritional_profile: dietProfile(evaluation.analysis, request.includesPremix),
    requirement_comparison: comparison,
    deficiencies,
    excesses,
    unverifiable_requirements: unverifiable,
    inclusion_limit_violations: inclusionLimitViolations,
    unsupported_requirements: evaluation.unsupportedRequirements,
    notes,
    programme: programmeHeader(resolved),
    ...(request.resolvedNames.length > 0 ? { resolved_ingredient_names: request.resolvedNames } : {}),
    data_sources: dataSources(resolved, library, ingredientIds, prices, request.energySystem, request.includesPremix),
  };
}

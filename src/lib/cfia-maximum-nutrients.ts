import tablesJson from "@/data/nutrition/sources/cfia-maximum-nutrient-values-2024/tables.json";
import mappingJson from "@/data/nutrition/sources/cfia-maximum-nutrient-values-2024/phase-mapping.json";

import type { AnalyzedNutrient, DietAnalysis } from "./diet-formula";
import type {
  RequirementContribution,
  UpperLimitAssessment,
  UpperLimitCheck,
  UpperLimitGroup,
} from "./formulation-assessment-model";
import { nutrientFeasibilityTolerance, withinBound } from "./numerical-tolerance";
import type { NutritionPhase } from "./nutrition";

/**
 * CFIA "Tables of Maximum Nutrient Values for Feeds" (Feeds Regulations,
 * 2024), Table 1 (Swine) and Table 2 (Chickens) only.
 *
 * Every value is an advisory upper-limit reference. None is ever an optimiser
 * constraint, and none decides whether a recipe meets its hard requirements:
 * the Brazilian Tables minimums, ingredient limits and premix doses do that.
 * Values are compared with the recipe's total-diet concentration (every
 * ingredient, not only the premix).
 */

export type CfiaTableId = "swine" | "chickens";

export type CfiaCategory = {
  id: string;
  label: string;
  publishedHeader: string;
};

export type CfiaNutrientLimit = {
  id: string;
  label: string;
  unit: string;
  max: number;
};

export type CfiaPhaseMapping = {
  phaseId: string;
  programmeIds: string[];
  phaseLabel: string;
  basis: string;
  cfiaTable: CfiaTableId;
  cfiaCategoryId: string;
  crossesBoundary: boolean;
  extendsBeyondPublishedClasses?: boolean;
  explanation: string;
};

export type CfiaPhaseReference =
  | {
      status: "mapped";
      table: CfiaTableId;
      tableLabel: string;
      category: CfiaCategory;
      mapping: CfiaPhaseMapping;
      limits: CfiaNutrientLimit[];
    }
  | { status: "unsupported"; reason: string };

type TableJson = (typeof tablesJson)["tables"][number];

export const CFIA_SOURCE = {
  id: tablesJson.id,
  title: tablesJson.title,
  publisher: tablesJson.publisher,
  url: tablesJson.url,
  dateModified: tablesJson.dateModified,
  basis: tablesJson.basis,
} as const;

/** The CFIA tables FeedSport imports. Pigs and chickens only, by design. */
export const CFIA_TABLES: readonly TableJson[] = tablesJson.tables;

export const CFIA_PHASE_MAPPINGS: readonly CfiaPhaseMapping[] = mappingJson.mappings as CfiaPhaseMapping[];

const MAPPING_BY_PHASE = new Map(CFIA_PHASE_MAPPINGS.map((mapping) => [mapping.phaseId, mapping]));

/** The vitamins whose exceedance triggers a premix comparison. */
export const CFIA_VITAMIN_IDS = ["vitamin-a", "vitamin-d", "vitamin-e"] as const;

type Measure = (analysis: DietAnalysis) => AnalyzedNutrient;

/**
 * How FeedSport measures each CFIA nutrient on the total diet. Magnesium,
 * sulfur and cobalt are published by CFIA but not modelled by FeedSport's
 * ingredient data, so they are listed as not assessed rather than guessed.
 */
const MEASURES: Record<string, { group: UpperLimitGroup; measure: Measure } | null> = {
  calcium: { group: "macro_mineral", measure: (a) => a.minerals.calciumPct },
  phosphorus: { group: "macro_mineral", measure: (a) => a.minerals.totalPhosphorusPct },
  sodium: { group: "macro_mineral", measure: (a) => a.minerals.sodiumPct },
  potassium: { group: "macro_mineral", measure: (a) => a.minerals.potassiumPct },
  magnesium: null,
  sulfur: null,
  cobalt: null,
  copper: { group: "trace_mineral", measure: (a) => a.traceMineralsPpm.copper },
  iodine: { group: "trace_mineral", measure: (a) => a.traceMineralsPpm.iodine },
  iron: { group: "trace_mineral", measure: (a) => a.traceMineralsPpm.iron },
  manganese: { group: "trace_mineral", measure: (a) => a.traceMineralsPpm.manganese },
  selenium: { group: "trace_mineral", measure: (a) => a.traceMineralsPpm.selenium },
  zinc: { group: "trace_mineral", measure: (a) => a.traceMineralsPpm.zinc },
  "vitamin-a": { group: "vitamin", measure: (a) => a.vitamins.vitaminAIuKg },
  "vitamin-d": { group: "vitamin", measure: (a) => a.vitamins.vitaminDIuKg },
  "vitamin-e": { group: "vitamin", measure: (a) => a.vitamins.vitaminEIuKg },
};

/**
 * The CFIA column for a programme phase, from the explicit mapping only.
 * Nothing is inferred at run time: a phase without a mapping is unsupported.
 */
export function cfiaReferenceForPhase(phase: Pick<NutritionPhase, "id">): CfiaPhaseReference {
  const mapping = MAPPING_BY_PHASE.get(phase.id);
  if (!mapping) {
    return { status: "unsupported", reason: "This phase has no CFIA maximum-nutrient column. FeedSport maps only pig and broiler phases explicitly and does not infer one." };
  }
  const table = CFIA_TABLES.find((candidate) => candidate.id === mapping.cfiaTable);
  const index = table?.categories.findIndex((category) => category.id === mapping.cfiaCategoryId) ?? -1;
  if (!table || index < 0) {
    return { status: "unsupported", reason: `The mapped CFIA column ${mapping.cfiaCategoryId} is not in the imported tables.` };
  }
  const { id, label, publishedHeader } = table.categories[index];
  return {
    status: "mapped",
    table: table.id as CfiaTableId,
    tableLabel: table.table,
    category: { id, label, publishedHeader },
    mapping,
    limits: table.nutrients.map((nutrient) => ({ id: nutrient.id, label: nutrient.label, unit: nutrient.unit, max: nutrient.values[index] })),
  };
}

/**
 * Compare a recipe's total-diet concentrations with the CFIA maxima for its
 * phase. `contributionsOf` gives each ingredient's share of a measure.
 *
 * Missing values can only add to a total, so a documented subtotal above the
 * maximum is an established exceedance. Below it, a premix that does not
 * document the nutrient leaves the result unknown (`not_documented`); it is
 * never read as within the limit because the gap was counted as 0. The one
 * exception is a nutrient expressed in %: an ingredient at 0.2% of the feed
 * can add at most 0.2 percentage points, so when even that worst case is
 * within the maximum, the recipe demonstrably is too.
 */
export function assessUpperLimits(
  phase: Pick<NutritionPhase, "id">,
  analysis: DietAnalysis,
  contributionsOf: (measure: Measure) => RequirementContribution[],
  inclusionPctOf: (ingredientId: string) => number,
): UpperLimitAssessment {
  const reference = cfiaReferenceForPhase(phase);
  if (reference.status === "unsupported") return { status: "unsupported", reason: reference.reason };

  const rows: UpperLimitCheck[] = [];
  const notAssessed: string[] = [];
  for (const limit of reference.limits) {
    const spec = MEASURES[limit.id];
    if (!spec) {
      notAssessed.push(limit.label);
      continue;
    }
    const measure = spec.measure(analysis);
    const tolerance = nutrientFeasibilityTolerance(limit.max);
    const exceeds = !withinBound("max", measure.value, limit.max, tolerance);
    const undocumented = measure.assumedZeroIngredientIds;
    const worstCase = limit.unit === "%"
      ? measure.value + [...undocumented, ...measure.missingIngredientIds].reduce((sum, id) => sum + inclusionPctOf(id), 0)
      : Infinity;
    const bounded = withinBound("max", worstCase, limit.max, tolerance);
    rows.push({
      id: limit.id,
      label: limit.label,
      unit: limit.unit,
      group: spec.group,
      max: limit.max,
      actual: measure.value,
      status: exceeds ? "exceeds" : undocumented.length && !bounded ? "not_documented" : "within",
      data: measure.missingIngredientIds.length ? "missing" : undocumented.length ? "assumed_zero" : "published",
      undocumentedPremixIds: [...undocumented],
      missingIngredientIds: [...measure.missingIngredientIds],
      contributions: contributionsOf(spec.measure).sort((a, b) => b.value - a.value),
    });
  }

  const { mapping, category } = reference;
  return {
    status: "assessed",
    enforcement: "advisory",
    source: `${CFIA_SOURCE.publisher}, ${CFIA_SOURCE.title} (modified ${CFIA_SOURCE.dateModified}), ${reference.tableLabel}`,
    sourceUrl: CFIA_SOURCE.url,
    category: { id: category.id, label: category.label },
    mapping: { basis: mapping.basis, explanation: mapping.explanation, crossesBoundary: mapping.crossesBoundary },
    basis: "CFIA values are for the total diet at 88% dry matter (as fed). FeedSport compares them with the as-fed recipe.",
    rows,
    notAssessed,
  };
}

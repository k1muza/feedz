import type { DietFormula } from "./diet-formula";
import {
  evaluateFormulation,
  formulationRequirements,
  type FormulationEvaluation,
  type FormulationIncompleteRequirement,
  type FormulationNutrientComparison,
} from "./feed-optimizer";
import type { IngredientLibrary } from "./ingredient-nutrients";
import type { NutritionPhase } from "./nutrition";
import type { EnergySystem } from "./nutrition-targets";

export type NutritionalValidationCategoryId =
  | "energy-protein-amino-acids"
  | "major-minerals"
  | "vitamins"
  | "trace-minerals";

export type NutritionalValidationStatus = "met" | "not_met";

export type NutritionalValidationCategory = {
  id: NutritionalValidationCategoryId;
  label: string;
  status: NutritionalValidationStatus;
  checked: number;
  required: number;
  failedNutrientIds: string[];
  /** Requirements no ingredient supplies data for; they count as not met. */
  missingDataNutrientIds: string[];
  note: string;
};

export type CompleteFeedValidation = {
  /** LP feasibility is deliberately not a synonym for nutritional completeness. */
  formulationFeasibility: "feasible" | "not_assessed";
  categories: NutritionalValidationCategory[];
  completeFeed: "complete" | "incomplete";
  note: string;
};

const CATEGORY_LABELS: Record<NutritionalValidationCategoryId, string> = {
  "energy-protein-amino-acids": "Energy, protein and amino acids",
  "major-minerals": "Major minerals",
  vitamins: "Vitamins",
  "trace-minerals": "Trace minerals",
};

export function validationCategoryForConstraint(id: string): NutritionalValidationCategoryId | null {
  if (id.startsWith("supplement-vitamin-") || [
    "supplement-pantothenic-acid",
    "supplement-niacin",
    "supplement-folic-acid",
    "supplement-biotin",
    "supplement-choline",
  ].includes(id)) return "vitamins";
  if (id.startsWith("supplement-")) return "trace-minerals";
  if (["calcium", "sttd-phosphorus", "available-phosphorus", "sodium", "potassium", "chloride"].includes(id)) {
    return "major-minerals";
  }
  if (id.startsWith("energy-") || id === "crude-protein" || id === "digestible-protein" || id.startsWith("sid-") || id === "linoleic-acid") {
    return "energy-protein-amino-acids";
  }
  // Practical ingredient and fibre constraints affect feasibility, but are not
  // one of the four nutritional-completeness categories shown to the user.
  return null;
}

function failed(row: FormulationNutrientComparison): boolean {
  return row.relation === "min"
    ? row.actual + 1e-7 < row.requirement
    : row.actual - 1e-7 > row.requirement;
}

function category(
  id: NutritionalValidationCategoryId,
  requiredIds: readonly string[],
  comparisons: ReadonlyMap<string, FormulationNutrientComparison>,
  incomplete: ReadonlyMap<string, FormulationIncompleteRequirement>,
): NutritionalValidationCategory {
  const rows = requiredIds.flatMap((nutrientId) => {
    const row = comparisons.get(nutrientId);
    return row ? [row] : [];
  });
  const failedNutrientIds = rows.filter(failed).map((row) => row.id);
  // A nutrient no ingredient (including the premix label) declares is not
  // supplied by the formula, so it cannot count towards a met target.
  const missingDataNutrientIds = requiredIds.filter(
    (nutrientId) => incomplete.has(nutrientId) || !comparisons.has(nutrientId),
  );
  const shortfalls = failedNutrientIds.length + missingDataNutrientIds.length;
  const status: NutritionalValidationStatus = shortfalls ? "not_met" : "met";
  const missingLabels = missingDataNutrientIds
    .map((nutrientId) => incomplete.get(nutrientId)?.label ?? nutrientId.replace(/^supplement-/, "").replace(/-/g, " "));
  const notes = [
    failedNutrientIds.length
      ? `${failedNutrientIds.length} requirement${failedNutrientIds.length === 1 ? " is" : "s are"} not met.`
      : "",
    missingLabels.length
      ? `No ingredient declares ${missingLabels.join(", ")}.`
      : "",
  ].filter(Boolean);
  return {
    id,
    label: CATEGORY_LABELS[id],
    status,
    checked: rows.length,
    required: requiredIds.length,
    failedNutrientIds,
    missingDataNutrientIds,
    note: status === "met" ? `All ${requiredIds.length} requirements are met.` : notes.join(" "),
  };
}

export function buildCompleteFeedValidation(
  phase: NutritionPhase,
  energySystem: EnergySystem,
  formula: DietFormula,
  library: IngredientLibrary,
  evaluation?: FormulationEvaluation,
): CompleteFeedValidation {
  const fullEvaluation = evaluation ?? evaluateFormulation(
    phase,
    energySystem,
    formula,
    library,
    { includeSupplementationTargets: true, traceMineralBasis: "inorganic" },
  );
  const required = formulationRequirements(
    phase,
    energySystem,
    { includeSupplementationTargets: true, traceMineralBasis: "inorganic" },
  );
  const requiredByCategory = new Map<NutritionalValidationCategoryId, string[]>();
  for (const spec of required) {
    const categoryId = validationCategoryForConstraint(spec.id);
    if (!categoryId) continue;
    const ids = requiredByCategory.get(categoryId) ?? [];
    ids.push(spec.id);
    requiredByCategory.set(categoryId, ids);
  }
  const comparisons = new Map(fullEvaluation.nutrientProfile.map((row) => [row.id, row]));
  const incomplete = new Map(fullEvaluation.incompleteRequirements.map((row) => [row.id, row]));
  const categoryIds: NutritionalValidationCategoryId[] = [
    "energy-protein-amino-acids",
    "major-minerals",
    "vitamins",
    "trace-minerals",
  ];
  // Categories without loaded targets for this stage are not assessed, so they
  // are omitted; they still prevent a complete-feed claim.
  const unassessed = categoryIds.filter((id) => (requiredByCategory.get(id) ?? []).length === 0);
  const categories = categoryIds
    .filter((id) => !unassessed.includes(id))
    .map((id) => category(id, requiredByCategory.get(id) ?? [], comparisons, incomplete));
  const allMet = categories.every((item) => item.status === "met");
  const completeFeed = allMet && unassessed.length === 0 ? "complete" as const : "incomplete" as const;
  const unassessedLabels = unassessed.map((id) => CATEGORY_LABELS[id].toLowerCase()).join(" and ");
  return {
    formulationFeasibility: "feasible",
    categories,
    completeFeed,
    note: completeFeed === "complete"
      ? "All modeled nutritional categories meet their targets."
      : !allMet
        ? "One or more nutrient targets are not met. Adjust the formulation before making a complete-feed claim."
        : `All loaded targets are met. No ${unassessedLabels} targets are loaded for this stage, so no complete-feed claim is made.`,
  };
}

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

export type NutritionalValidationStatus = "met" | "not_met" | "not_verified";

export type NutritionalValidationCategory = {
  id: NutritionalValidationCategoryId;
  label: string;
  status: NutritionalValidationStatus;
  checked: number;
  required: number;
  failedNutrientIds: string[];
  unverifiedNutrientIds: string[];
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
  micronutrientProfileUnverified: boolean,
): NutritionalValidationCategory {
  const rows = requiredIds.flatMap((nutrientId) => {
    const row = comparisons.get(nutrientId);
    return row ? [row] : [];
  });
  const failedNutrientIds = rows.filter(failed).map((row) => row.id);
  const unverifiedNutrientIds = requiredIds.filter(
    (nutrientId) => incomplete.has(nutrientId) || !comparisons.has(nutrientId),
  );
  const isMicro = id === "vitamins" || id === "trace-minerals";
  const status: NutritionalValidationStatus =
    requiredIds.length === 0 || unverifiedNutrientIds.length || (isMicro && micronutrientProfileUnverified)
      ? "not_verified"
      : failedNutrientIds.length
        ? "not_met"
        : "met";
  const note = requiredIds.length === 0
    ? "No verified target set is loaded for this stage."
    : status === "not_met"
      ? `${failedNutrientIds.length} verified requirement${failedNutrientIds.length === 1 ? " is" : "s are"} not met.`
      : status === "not_verified"
        ? micronutrientProfileUnverified && isMicro
          ? "The premix contribution is supplier-published but not independently verified; no complete-feed pass is claimed."
          : `${unverifiedNutrientIds.length} requirement${unverifiedNutrientIds.length === 1 ? " cannot" : "s cannot"} be checked from the loaded ingredient profiles.`
        : `All ${requiredIds.length} loaded requirements are met.`;
  return {
    id,
    label: CATEGORY_LABELS[id],
    status,
    checked: rows.length,
    required: requiredIds.length,
    failedNutrientIds,
    unverifiedNutrientIds,
    note,
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
  const premixRecords = formula.ingredients.flatMap((row) => {
    if (row.inclusionPct <= 0) return [];
    const ingredient = library.ingredients.find((candidate) => candidate.id === row.ingredientId);
    return ingredient?.category === "vitamin_mineral_premix" ? [ingredient] : [];
  });
  const micronutrientProfileUnverified =
    premixRecords.length === 0 ||
    premixRecords.some((ingredient) => ![
      "manufacturer_verified",
      "published_reference",
    ].includes(ingredient.provenance.verificationStatus ?? ""));

  const categoryIds: NutritionalValidationCategoryId[] = [
    "energy-protein-amino-acids",
    "major-minerals",
    "vitamins",
    "trace-minerals",
  ];
  const categories = categoryIds.map((id) => category(
    id,
    requiredByCategory.get(id) ?? [],
    comparisons,
    incomplete,
    micronutrientProfileUnverified,
  ));
  const completeFeed = categories.every((item) => item.status === "met")
    ? "complete" as const
    : "incomplete" as const;
  const hasNotMet = categories.some((item) => item.status === "not_met");
  const hasNotVerified = categories.some((item) => item.status === "not_verified");
  return {
    formulationFeasibility: "feasible",
    categories,
    completeFeed,
    note: completeFeed === "complete"
      ? "All modeled nutritional categories meet their targets using verified nutrient data."
      : hasNotMet && hasNotVerified
        ? "Some nutrient targets are not met, while other categories still need verified data. Correct the shortfalls and verify the missing data before making a complete-feed claim."
        : hasNotMet
          ? "One or more nutrient targets are not met. Adjust the formulation before making a complete-feed claim."
          : "Some categories still need verified nutrient data. “Not verified” does not mean the nutrients are absent; it means the available data cannot confirm that their targets are met.",
  };
}

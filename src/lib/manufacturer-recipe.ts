/**
 * A manufacturer-prescribed mixing recipe is not a least-cost formulation.
 * Keep the recipe available for costing/review even if its third-party premix
 * matrix or basal ingredients lack analytical values required by the solver.
 *
 * Crucially: never turn missing nutrient values into zero, never relax the
 * programme's constraints, and never report an unverified recipe as "optimal".
 */
import type { DietFormula } from "./diet-formula";
import { evaluateFormulation, type FormulationIncompleteRequirement } from "./feed-optimizer";
import type { IngredientLibrary } from "./ingredient-nutrients";
import type { EnergySystem } from "./nutrition-targets";
import type { NutritionPhase } from "./nutrition";
import { assertManufacturerRecipe, type CommercialPremix } from "./commercial-premixes";

export type ManufacturerRecipeShortfall = {
  id: string;
  label: string;
  unit: string;
  relation: "min" | "max";
  requirement: number;
  actual: number;
};

export type ManufacturerRecipeAssessment = {
  status: "manufacturer_recipe";
  verification: "unverified";
  recipe: DietFormula;
  incompleteRequirements: FormulationIncompleteRequirement[];
  checkedShortfalls: ManufacturerRecipeShortfall[];
  unsupportedRequirements: string[];
  warning: string;
};

export function assessManufacturerRecipe(
  premix: CommercialPremix,
  formula: DietFormula,
  phase: NutritionPhase,
  energySystem: EnergySystem,
  library: IngredientLibrary,
): ManufacturerRecipeAssessment {
  if (!premix.manufacturerRecipe) throw new Error("No manufacturer recipe is published for this premix.");
  assertManufacturerRecipe(
    premix,
    formula.ingredients.map((row) => ({
      ingredientId: row.ingredientId,
      minInclusionPct: row.inclusionPct,
      maxInclusionPct: row.inclusionPct,
    })),
  );
  const evaluation = evaluateFormulation(
    phase, energySystem, formula, library,
    { includeSupplementationTargets: false, traceMineralBasis: "inorganic" },
  );
  const incomplete = new Set(evaluation.incompleteRequirements.map((row) => row.id));
  const checkedShortfalls = evaluation.nutrientProfile
    .filter((row) => !incomplete.has(row.id))
    .filter((row) => row.relation === "min"
      ? row.actual + 1e-7 < row.requirement
      : row.actual - 1e-7 > row.requirement)
    .map((row) => ({
      id: row.id,
      label: row.label,
      unit: row.unit,
      relation: row.relation,
      requirement: row.requirement,
      actual: row.actual,
    }));
  return {
    status: "manufacturer_recipe",
    verification: "unverified",
    recipe: formula,
    incompleteRequirements: evaluation.incompleteRequirements,
    checkedShortfalls,
    unsupportedRequirements: [
      ...new Set([...evaluation.unsupportedRequirements, "vitamin-trace-mineral-supplementation"]),
    ],
    warning: `${premix.sku} is a manufacturer-prescribed recipe, NOT an optimized or nutritionally verified feed. Missing fish-meal/compound-premix analytical values prevent complete nutrient checking. Known nutrient shortfalls, if any, are listed; missing values are NOT treated as zero. Confirm the exact product, technical data sheet and recipe suitability with the manufacturer before feeding.`,
  };
}

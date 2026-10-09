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
import { round, snake } from "./feed-number-format";

/** Client supplied ingredients or ratios that conflict with a fixed manufacturer's recipe. */
export class ManufacturerRecipeValidationError extends Error {
  name = "ManufacturerRecipeValidationError";
}

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
  try {
    assertManufacturerRecipe(
      premix,
      formula.ingredients.map((row) => ({
        ingredientId: row.ingredientId,
        minInclusionPct: row.inclusionPct,
        maxInclusionPct: row.inclusionPct,
      })),
    );
  } catch (error) {
    throw new ManufacturerRecipeValidationError(error instanceof Error ? error.message : String(error));
  }
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
    // This contains actual programme-model limitations. Missing CJ
    // micronutrient analysis is a separate supplier verification gap, NOT
    // "Brazilian Tables lack phase-specific supplementation guidance".
    unsupportedRequirements: evaluation.unsupportedRequirements,
    warning: `${premix.sku} is a manufacturer-prescribed recipe, NOT an optimized or nutritionally verified feed. Missing fish-meal/compound-premix analytical values prevent complete nutrient checking. Known nutrient shortfalls, if any, are listed; missing values are NOT treated as zero. Confirm the exact product, technical data sheet and recipe suitability with the manufacturer before feeding.`,
  };
}

/** Externally visible contract — each nutrient list appears exactly once. */
export type ManufacturerRecipeReport = {
  status: "manufacturer_recipe";
  verification: "unverified";
  recipe: DietFormula;
  costPerKg: number | null;
  costPerTonne: number | null;
  unpricedIngredients: string[];
  incomplete_requirements: Array<{
    nutrient: string;
    label: string;
    unit: string;
    requirement: number;
    missing_data_for: string[];
  }>;
  checked_shortfalls: Array<{
    nutrient: string;
    label: string;
    unit: string;
    relation: "min" | "max";
    actual: number;
    requirement: number;
  }>;
  unsupported_requirements: string[];
  premix_analysis: {
    status: "unverified";
    reason: "manufacturer_nutrient_analysis_incomplete";
    product_id: string;
    message: string;
  };
  warning: string;
};

/**
 * Single canonical manufacturer recipe, costing and normalized assessment.
 * Does not silently replace unknown supplier concentrations with zero,
 * relax ingredient restrictions, or invent unquoted product prices.
 */
export function buildManufacturerRecipeReport(
  premix: CommercialPremix,
  phase: NutritionPhase,
  energySystem: EnergySystem,
  library: IngredientLibrary,
  pricesPerKg: ReadonlyMap<string, number> = new Map(),
  suppliedFormula?: DietFormula,
): ManufacturerRecipeReport {
  if (!premix.manufacturerRecipe) throw new Error(`No manufacturer recipe for ${premix.sku}`);
  const recipe: DietFormula = suppliedFormula ?? {
    ingredients: premix.manufacturerRecipe.map(({ ingredientId, percent }) => ({
      ingredientId, inclusionPct: percent,
    })),
  };
  const assessment = assessManufacturerRecipe(premix, recipe, phase, energySystem, library);
  const unpricedIngredients = recipe.ingredients
    .filter((row) => !pricesPerKg.has(row.ingredientId))
    .map((row) => row.ingredientId);
  const costPerKg = unpricedIngredients.length
    ? null
    : recipe.ingredients.reduce((sum, row) =>
      sum + row.inclusionPct / 100 * pricesPerKg.get(row.ingredientId)!, 0);
  return {
    status: "manufacturer_recipe",
    verification: "unverified",
    recipe,
    costPerKg,
    costPerTonne: costPerKg === null ? null : round(costPerKg * 1000, 2),
    unpricedIngredients,
    incomplete_requirements: assessment.incompleteRequirements.map((row) => ({
      nutrient: snake(row.id),
      label: row.label,
      unit: row.unit,
      requirement: round(row.requirement),
      missing_data_for: row.missingIngredientIds,
    })),
    checked_shortfalls: assessment.checkedShortfalls.map((row) => ({
      nutrient: snake(row.id),
      label: row.label,
      unit: row.unit,
      relation: row.relation,
      requirement: round(row.requirement),
      actual: round(row.actual),
    })),
    unsupported_requirements: assessment.unsupportedRequirements,
    premix_analysis: {
      status: "unverified",
      reason: "manufacturer_nutrient_analysis_incomplete",
      product_id: premix.id,
      message: `${premix.name}: manufacturer nutrient analysis is incomplete/unverified; vitamin and trace-mineral adequacy cannot be assessed. This is a supplier specification gap, not missing programme guidance.`,
    },
    warning: assessment.warning,
  };
}

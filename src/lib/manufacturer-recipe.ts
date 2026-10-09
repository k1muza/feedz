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

/**
 * Single canonical CJ manufacturer recipe/cost/validation result used by
 * Studio, optimize API, MCP formulate, analyse and diagnostics.
 * Pricing is optional for analysis; missing prices never silently become $0.
 */
export function buildManufacturerRecipeReport(
  premix: CommercialPremix,
  phase: NutritionPhase,
  energySystem: EnergySystem,
  library: IngredientLibrary,
  pricesPerKg: ReadonlyMap<string, number> = new Map(),
  suppliedFormula?: DietFormula,
) {
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
  const snake = (value: string) => value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/-/g, "_")
    .toLowerCase();
  const round = (value: number, digits = 4) =>
    Math.round(value * 10 ** digits) / 10 ** digits;
  return {
    ...assessment,
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
  };
}

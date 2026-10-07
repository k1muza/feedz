import type { DietAnalysis, DietFormula } from "./diet-formula";
import type {
  FormulationNutrientComparison,
  LeastCostFormulationResult,
} from "./feed-optimizer";

export const SAVED_FEED_FORMULATIONS_COLLECTION = "feedFormulations";

const LOCAL_STORAGE_KEY = "feedsport-saved-feed-formulations-v1";

export type SavedFeedFormulaRecipe = {
  id: string;
  label: string;
  description: string;
  formula: DietFormula;
  analysis?: DietAnalysis;
  nutrientProfile: readonly FormulationNutrientComparison[];
  costPerKg: number;
  costIncreasePct: number;
};

export type SavedFeedFormulaSet = {
  id: string;
  name: string;
  savedAt: string;
  programmeId: string;
  programmeName: string;
  phaseId: string;
  phaseLabel: string;
  sourceTable?: string;
  energySystem: "ME" | "NE";
  targetBatchKg: number;
  ingredients: readonly {
    ingredientId: string;
    name: string;
    pricePerKg: number;
  }[];
  recipes: readonly SavedFeedFormulaRecipe[];
  setup?: {
    rows: readonly {
      ingredientId: string;
      price: string;
      min: string;
      max: string;
      lockedPct?: string;
    }[];
    ingredientPoolMode?: "automatic" | "selected";
    useFixedPremix: boolean;
    fixedPremixName: string;
    fixedPremixKgPerTonne: string;
    fixedPremixPricePerKg: string;
    selectedRecipeId: string;
  };
  result?: Extract<LeastCostFormulationResult, { status: "optimal" }>;
};

export type NewSavedFeedFormulaSet = Omit<SavedFeedFormulaSet, "id" | "savedAt">;

export type SavedFeedFormulaLocation = "shared" | "device";

export async function saveFeedFormulaSet(
  input: NewSavedFeedFormulaSet,
  existingId?: string,
): Promise<{ formulaSet: SavedFeedFormulaSet; location: SavedFeedFormulaLocation }> {
  const formulaSet: SavedFeedFormulaSet = {
    ...input,
    id: existingId ?? crypto.randomUUID(),
    savedAt: new Date().toISOString(),
  };

  saveLocalCopy(formulaSet);
  return { formulaSet, location: "device" };
}

export async function listSavedFeedFormulaSets(): Promise<SavedFeedFormulaSet[]> {
  return readLocalCopies().sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function getSavedFeedFormulaSet(
  id: string,
): Promise<SavedFeedFormulaSet | null> {
  return readLocalCopies().find((item) => item.id === id) ?? null;
}

export function savedFeedFormulaResult(
  formulaSet: SavedFeedFormulaSet,
): Extract<LeastCostFormulationResult, { status: "optimal" }> | null {
  if (formulaSet.result) return formulaSet.result;

  const leastCost =
    formulaSet.recipes.find((recipe) => recipe.id === "least-cost") ?? formulaSet.recipes[0];
  if (!leastCost) return null;

  const restored = {
    status: "optimal",
    solution: savedRecipeSolution(leastCost),
    nutrientProfile: [...leastCost.nutrientProfile],
    alternatives: formulaSet.recipes
      .filter((recipe) => recipe !== leastCost)
      .map((recipe) => ({
        id: recipe.id,
        label: recipe.label,
        description: recipe.description,
        solution: savedRecipeSolution(recipe),
        nutrientProfile: [...recipe.nutrientProfile],
        costIncreasePct: recipe.costIncreasePct,
      })),
    ingredientOpportunities: [],
    alternativeCostTolerancePct: Math.max(
      3,
      ...formulaSet.recipes.map((recipe) => recipe.costIncreasePct),
    ),
    ingredientOpportunityCostTolerancesPct: [],
    unsupportedRequirements: [],
  };

  return restored as Extract<LeastCostFormulationResult, { status: "optimal" }>;
}

function savedRecipeSolution(recipe: SavedFeedFormulaRecipe) {
  return {
    formula: recipe.formula,
    costPerKg: recipe.costPerKg,
    // Older saved records predate the full optimizer snapshot. The workbench
    // renders their stored formula and nutrient profile directly, so analysis
    // is intentionally absent until the user regenerates the formulation.
    analysis: recipe.analysis as DietAnalysis,
  };
}

function saveLocalCopy(formulaSet: SavedFeedFormulaSet): void {
  const existing = readLocalCopies().filter((item) => item.id !== formulaSet.id);
  window.localStorage.setItem(
    LOCAL_STORAGE_KEY,
    JSON.stringify([formulaSet, ...existing]),
  );
}

function readLocalCopies(): SavedFeedFormulaSet[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedFeedFormulaSet);
  } catch {
    return [];
  }
}

function isSavedFeedFormulaSet(value: unknown): value is SavedFeedFormulaSet {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SavedFeedFormulaSet>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.savedAt === "string" &&
    typeof candidate.programmeId === "string" &&
    typeof candidate.phaseId === "string" &&
    Array.isArray(candidate.ingredients) &&
    Array.isArray(candidate.recipes)
  );
}

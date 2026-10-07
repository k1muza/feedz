import type { FormulationIngredientOption } from "./feed-optimizer";

export type FeedFormulationBasisIngredient = {
  ingredientId: string;
  name: string;
  category?: string;
  pricePerKg: number;
  requestMinInclusionPct?: number;
  requestMaxInclusionPct?: number;
  lockedPct?: number;
  defaultMinInclusionPct?: number;
  defaultMaxInclusionPct?: number;
  phaseMaxInclusionPct?: number;
};

export type FeedFormulationBasisSnapshot = {
  version: 1;
  fingerprint: string;
  generatedAt: string;
  programmeId: string;
  programmeName: string;
  phaseId: string;
  phaseLabel: string;
  sourceTable?: string;
  energySystem: "ME" | "NE";
  targetBatchKg: number;
  ingredientPoolMode: "automatic" | "selected";
  solverObjective: "least-cost-with-alternatives";
  settings: {
    includeSupplementationTargets: boolean;
    traceMineralBasis: "inorganic" | "organic";
  };
  ingredients: readonly FeedFormulationBasisIngredient[];
  fixedPremix?: {
    id: string;
    name: string;
    inclusionKgPerTonne: number;
    pricePerKg: number;
  };
};

export type FeedFormulationBasisInput = Omit<
  FeedFormulationBasisSnapshot,
  "fingerprint" | "generatedAt" | "version"
>;

function stableNumber(value: number | undefined): number | null {
  return value === undefined ? null : Number(value.toFixed(8));
}

function fingerprintPayload(input: FeedFormulationBasisInput): string {
  return JSON.stringify({
    programmeId: input.programmeId,
    phaseId: input.phaseId,
    energySystem: input.energySystem,
    targetBatchKg: stableNumber(input.targetBatchKg),
    ingredientPoolMode: input.ingredientPoolMode,
    solverObjective: input.solverObjective,
    settings: {
      includeSupplementationTargets: input.settings.includeSupplementationTargets,
      traceMineralBasis: input.settings.traceMineralBasis,
    },
    fixedPremix: input.fixedPremix
      ? {
          id: input.fixedPremix.id,
          name: input.fixedPremix.name,
          inclusionKgPerTonne: stableNumber(input.fixedPremix.inclusionKgPerTonne),
          pricePerKg: stableNumber(input.fixedPremix.pricePerKg),
        }
      : null,
    ingredients: [...input.ingredients]
      .sort((a, b) => a.ingredientId.localeCompare(b.ingredientId))
      .map((ingredient) => ({
        ingredientId: ingredient.ingredientId,
        pricePerKg: stableNumber(ingredient.pricePerKg),
        requestMinInclusionPct: stableNumber(ingredient.requestMinInclusionPct),
        requestMaxInclusionPct: stableNumber(ingredient.requestMaxInclusionPct),
        lockedPct: stableNumber(ingredient.lockedPct),
        defaultMinInclusionPct: stableNumber(ingredient.defaultMinInclusionPct),
        defaultMaxInclusionPct: stableNumber(ingredient.defaultMaxInclusionPct),
        phaseMaxInclusionPct: stableNumber(ingredient.phaseMaxInclusionPct),
      })),
  });
}

function compactHash(value: string): string {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
  }
  return (
    (first >>> 0).toString(16).padStart(8, "0") +
    (second >>> 0).toString(16).padStart(8, "0")
  );
}

export function buildFeedFormulationBasis(
  input: FeedFormulationBasisInput,
): FeedFormulationBasisSnapshot {
  return {
    version: 1,
    ...input,
    fingerprint: `FS-${compactHash(fingerprintPayload(input))}`,
    generatedAt: new Date().toISOString(),
  };
}

export function formulationBasisRequestIngredients(
  basis: FeedFormulationBasisSnapshot,
): FormulationIngredientOption[] {
  return basis.ingredients.map((ingredient) => ({
    ingredientId: ingredient.ingredientId,
    pricePerKg: ingredient.pricePerKg,
    minInclusionPct: ingredient.requestMinInclusionPct,
    maxInclusionPct: ingredient.requestMaxInclusionPct,
  }));
}

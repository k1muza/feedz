/**
 * FeedSport ingredient inclusion limits, resolved for a nutrition phase.
 *
 * Hard limits combine the ingredient's static constraints with the Brazilian
 * Tables 2024 Table 1.01 maximum for the phase. Request limits may tighten
 * these, never relax them. Table 1.01's `practical` level is advisory only.
 *
 * Every formulation path (optimizer, candidate selection, diagnostics, MCP and
 * recipe analysis) resolves limits through this module.
 */
import { INGREDIENT_LIBRARY } from "./ingredient-nutrients";
import type { NutritionPhaseClass } from "./nutrition";

export type BrazilianInclusionColumn = "starter" | "grower" | "finisher" | "gestation" | "lactation";

/**
 * Table 1.01 publishes no pre-starter column, so pre-starter phases use the
 * starter column. Boars have no published column and keep static limits.
 */
const PHASE_COLUMNS: Record<NutritionPhaseClass, BrazilianInclusionColumn | undefined> = {
  "pre-starter": "starter",
  starter: "starter",
  grower: "grower",
  finisher: "finisher",
  gestation: "gestation",
  lactation: "lactation",
  boar: undefined,
};

export const BRAZILIAN_INCLUSION_SOURCE = "Brazilian Tables 2024, Table 1.01";

export type PhaseInclusionRecommendation = {
  column: BrazilianInclusionColumn;
  /** Usual inclusion level. Advisory only; never a solver constraint. */
  practicalPct: number;
  /** Published ceiling; enforced as a hard limit. */
  maxPct: number;
  source: typeof BRAZILIAN_INCLUSION_SOURCE;
};

type ColumnRecommendations = Partial<Record<BrazilianInclusionColumn, { practical: number; max: number }>>;

const RECOMMENDATIONS_BY_INGREDIENT = (() => {
  const map = new Map<string, ColumnRecommendations>();
  for (const ingredient of INGREDIENT_LIBRARY.ingredients) {
    const recommended = ingredient.nutrition.swine?.recommendedInclusionPct;
    if (!recommended) continue;
    map.set(ingredient.id, {
      ...recommended.growingPigs,
      ...recommended.sows,
    });
  }
  return map;
})();

export function brazilianInclusionColumn(
  phaseClass: NutritionPhaseClass | undefined,
): BrazilianInclusionColumn | undefined {
  return phaseClass ? PHASE_COLUMNS[phaseClass] : undefined;
}

export function phaseInclusionRecommendation(
  ingredientId: string,
  phaseClass: NutritionPhaseClass | undefined,
): PhaseInclusionRecommendation | undefined {
  const column = brazilianInclusionColumn(phaseClass);
  const recommendation = column ? RECOMMENDATIONS_BY_INGREDIENT.get(ingredientId)?.[column] : undefined;
  if (!column || !recommendation) return undefined;
  return {
    column,
    practicalPct: recommendation.practical,
    maxPct: recommendation.max,
    source: BRAZILIAN_INCLUSION_SOURCE,
  };
}

/** Every published column for an ingredient, e.g. for ingredient detail views. */
export function brazilianInclusionRecommendations(
  ingredientId: string,
): Partial<Record<BrazilianInclusionColumn, { practicalPct: number; maxPct: number }>> | undefined {
  const recommendations = RECOMMENDATIONS_BY_INGREDIENT.get(ingredientId);
  if (!recommendations) return undefined;
  return Object.fromEntries(
    Object.entries(recommendations).map(([column, value]) => [
      column,
      { practicalPct: value.practical, maxPct: value.max },
    ]),
  );
}

export type StaticInclusionLimits = {
  minInclusionPct?: number;
  maxInclusionPct?: number;
};

export type FeedSportInclusionLimits = {
  /** Hard minimum FeedSport enforces for this phase. */
  minPct: number;
  /** Hard maximum FeedSport enforces for this phase. */
  maxPct: number;
  /** Which rule sets the maximum. */
  maxSource: "ingredient" | "brazilian-phase" | "none";
  staticMinPct: number;
  staticMaxPct: number;
  phase?: PhaseInclusionRecommendation;
};

export function feedsportInclusionLimits(
  ingredientId: string,
  staticLimits: StaticInclusionLimits,
  phaseClass: NutritionPhaseClass | undefined,
): FeedSportInclusionLimits {
  const staticMinPct = staticLimits.minInclusionPct ?? 0;
  const staticMaxPct = staticLimits.maxInclusionPct ?? 100;
  const phase = phaseInclusionRecommendation(ingredientId, phaseClass);
  const maxPct = Math.min(staticMaxPct, phase?.maxPct ?? 100);

  return {
    minPct: staticMinPct,
    maxPct,
    maxSource:
      phase && phase.maxPct <= staticMaxPct
        ? "brazilian-phase"
        : staticLimits.maxInclusionPct !== undefined
          ? "ingredient"
          : "none",
    staticMinPct,
    staticMaxPct,
    ...(phase ? { phase } : {}),
  };
}

export type IgnoredInclusionRequest = {
  bound: "min" | "max";
  requestedPct: number;
  appliedPct: number;
};

export type EffectiveInclusionLimits = {
  minPct: number;
  maxPct: number;
  feedsport: FeedSportInclusionLimits;
  /** Request bounds that would have relaxed a FeedSport limit and were not applied. */
  ignoredRequests: IgnoredInclusionRequest[];
};

/** min = max(FeedSport min, requested min); max = min(FeedSport max, requested max). */
export function effectiveInclusionLimits(
  ingredientId: string,
  staticLimits: StaticInclusionLimits,
  phaseClass: NutritionPhaseClass | undefined,
  requested: StaticInclusionLimits = {},
): EffectiveInclusionLimits {
  const feedsport = feedsportInclusionLimits(ingredientId, staticLimits, phaseClass);
  const ignoredRequests: IgnoredInclusionRequest[] = [];
  if (requested.maxInclusionPct !== undefined && requested.maxInclusionPct > feedsport.maxPct) {
    ignoredRequests.push({ bound: "max", requestedPct: requested.maxInclusionPct, appliedPct: feedsport.maxPct });
  }
  if (requested.minInclusionPct !== undefined && requested.minInclusionPct < feedsport.minPct) {
    ignoredRequests.push({ bound: "min", requestedPct: requested.minInclusionPct, appliedPct: feedsport.minPct });
  }

  return {
    minPct: Math.max(feedsport.minPct, requested.minInclusionPct ?? 0),
    maxPct: Math.min(feedsport.maxPct, requested.maxInclusionPct ?? 100),
    feedsport,
    ignoredRequests,
  };
}

/** Human-readable origin of a FeedSport maximum, for messages and reports. */
export function describeMaxSource(limits: FeedSportInclusionLimits): string {
  if (limits.maxSource === "brazilian-phase" && limits.phase) {
    return `${limits.phase.source} ${limits.phase.column} maximum`;
  }
  return limits.maxSource === "ingredient" ? "FeedSport ingredient limit" : "no limit";
}

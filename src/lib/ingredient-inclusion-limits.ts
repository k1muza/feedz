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
import { broilerInclusionLimitClassForPhase } from "./brazilian-poultry";
import {
  INGREDIENT_LIBRARY,
  INGREDIENT_LIBRARY_SOURCE,
  POULTRY_INGREDIENT_LIBRARY,
  type AggregateLimit,
  type AggregateLimitSource,
  type IngredientLibrarySource,
} from "./ingredient-nutrients";
import type { NutritionPhase, NutritionPhaseClass, NutritionSpecies } from "./nutrition";

export type BrazilianInclusionColumn = "starter" | "grower" | "finisher" | "gestation" | "lactation";

/**
 * A phase class alone means a swine phase; pass the phase itself (or its
 * species and class) to resolve limits for other species.
 */
export type InclusionPhaseRef =
  | NutritionPhaseClass
  | Pick<NutritionPhase, "species" | "phaseClass">;

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
  species: NutritionSpecies;
  column: BrazilianInclusionColumn;
  /** Usual inclusion level when published. Advisory only; never a solver constraint. */
  practicalPct?: number;
  /** Published ceiling; enforced as a hard limit. */
  maxPct: number;
  source: typeof BRAZILIAN_INCLUSION_SOURCE;
};

type ColumnRecommendations = Partial<Record<BrazilianInclusionColumn, { practical?: number; max: number }>>;

function recommendationMap(
  entries: Iterable<[string, ColumnRecommendations | undefined]>,
  label: string,
): Map<string, ColumnRecommendations> {
  const map = new Map<string, ColumnRecommendations>();
  for (const [id, recommendations] of entries) {
    if (!recommendations) continue;
    if (map.has(id)) {
      throw new Error(`${label} inclusion limits contain duplicate ingredient ID "${id}".`);
    }
    map.set(id, recommendations);
  }
  return map;
}

const RECOMMENDATIONS_BY_SPECIES: Record<NutritionSpecies, Map<string, ColumnRecommendations>> = {
  swine: recommendationMap(
    INGREDIENT_LIBRARY.ingredients.map((ingredient) => {
      const recommended = ingredient.nutrition.swine?.recommendedInclusionPct;
      return [
        ingredient.id,
        recommended && { ...recommended.growingPigs, ...recommended.sows },
      ];
    }),
    "Brazilian swine",
  ),
  broiler: recommendationMap(
    POULTRY_INGREDIENT_LIBRARY.ingredients.map((ingredient) => [
      ingredient.id,
      ingredient.nutrition.poultry?.recommendedInclusionPct?.broilers,
    ]),
    "Brazilian broiler",
  ),
};

function resolvePhaseRef(
  ref: InclusionPhaseRef | undefined,
): { species: NutritionSpecies; phaseClass: NutritionPhaseClass } | undefined {
  if (ref === undefined) return undefined;
  return typeof ref === "string" ? { species: "swine", phaseClass: ref } : ref;
}

export function brazilianInclusionColumn(
  ref: InclusionPhaseRef | undefined,
): BrazilianInclusionColumn | undefined {
  const resolved = resolvePhaseRef(ref);
  if (!resolved) return undefined;
  if (resolved.species === "broiler") {
    const { phaseClass } = resolved;
    return phaseClass === "pre-starter" ||
      phaseClass === "starter" ||
      phaseClass === "grower" ||
      phaseClass === "finisher"
      ? broilerInclusionLimitClassForPhase(phaseClass)
      : undefined;
  }
  return PHASE_COLUMNS[resolved.phaseClass];
}

/** Column name as printed in messages, e.g. "starter" or "broiler starter". */
export function inclusionColumnLabel(
  recommendation: Pick<PhaseInclusionRecommendation, "species" | "column">,
): string {
  return recommendation.species === "broiler"
    ? `broiler ${recommendation.column}`
    : recommendation.column;
}

export function phaseInclusionRecommendation(
  ingredientId: string,
  ref: InclusionPhaseRef | undefined,
): PhaseInclusionRecommendation | undefined {
  const resolved = resolvePhaseRef(ref);
  const column = brazilianInclusionColumn(ref);
  if (!resolved || !column) return undefined;
  const recommendation = RECOMMENDATIONS_BY_SPECIES[resolved.species].get(ingredientId)?.[column];
  if (!recommendation) return undefined;
  return {
    species: resolved.species,
    column,
    practicalPct: recommendation.practical,
    maxPct: recommendation.max,
    source: BRAZILIAN_INCLUSION_SOURCE,
  };
}

/** Every published column for an ingredient, e.g. for ingredient detail views. */
export function brazilianInclusionRecommendations(
  ingredientId: string,
  species: NutritionSpecies = "swine",
): Partial<Record<BrazilianInclusionColumn, { practicalPct?: number; maxPct: number }>> | undefined {
  const recommendations = RECOMMENDATIONS_BY_SPECIES[species].get(ingredientId);
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
  phaseRef: InclusionPhaseRef | undefined,
): FeedSportInclusionLimits {
  const staticMinPct = staticLimits.minInclusionPct ?? 0;
  const staticMaxPct = staticLimits.maxInclusionPct ?? 100;
  const phase = phaseInclusionRecommendation(ingredientId, phaseRef);
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
  phaseRef: InclusionPhaseRef | undefined,
  requested: StaticInclusionLimits = {},
): EffectiveInclusionLimits {
  const feedsport = feedsportInclusionLimits(ingredientId, staticLimits, phaseRef);
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
    return `${limits.phase.source} ${inclusionColumnLabel(limits.phase)} maximum`;
  }
  return limits.maxSource === "ingredient" ? "FeedSport ingredient limit" : "no limit";
}

// ---------------------------------------------------------------------------
// Aggregate (family and constraint-group) limits
//
// A family's or constraint group's ceiling caps the SUM of its members'
// inclusions. Definitions and values live in the canonical ingredient library;
// this is the only place they are resolved for a phase, so the optimizer,
// assessments, MCP and Studio apply identical rules.

export type AggregateInclusionKind = "family" | "group";

/** The parts of a library that define aggregate rules. */
export type AggregateRuleLibrary = Pick<IngredientLibrarySource, "families" | "constraintGroups"> & {
  ingredients: readonly { id: string; familyId: string }[];
};

export type AggregateInclusionRule = {
  /** Unique across kinds, e.g. "family:soybean-meal" or "group:total-added-fat". */
  key: string;
  kind: AggregateInclusionKind;
  id: string;
  name: string;
  species: NutritionSpecies;
  column: BrazilianInclusionColumn;
  maxPct: number;
  source: AggregateLimitSource;
  /** Every library ingredient counted toward the ceiling, each once. */
  memberIngredientIds: readonly string[];
};

export function aggregateRuleKey(kind: AggregateInclusionKind, id: string): string {
  return `${kind}:${id}`;
}

/** Members of every family and constraint group, from explicit family IDs only. */
export function aggregateMembership(library: AggregateRuleLibrary = INGREDIENT_LIBRARY_SOURCE) {
  const families = new Map<string, string[]>();
  for (const ingredient of library.ingredients) {
    families.set(ingredient.familyId, [...(families.get(ingredient.familyId) ?? []), ingredient.id]);
  }
  const groups = new Map(library.constraintGroups.map((group) => [
    group.id,
    [...new Set([
      ...group.members.familyIds.flatMap((familyId) => families.get(familyId) ?? []),
      ...group.members.ingredientIds,
    ])],
  ]));
  return { families, groups };
}

function columnMax(limit: AggregateLimit | undefined, species: NutritionSpecies, column: BrazilianInclusionColumn): number | undefined {
  const bySpecies = limit?.maxInclusionPct[species] as Partial<Record<BrazilianInclusionColumn, number>> | undefined;
  return bySpecies?.[column];
}

/**
 * The family and group ceilings that apply to a phase. A family or group
 * without a value for the phase's column adds no restriction (never zero).
 * Phases without a Table 1.01 column (boars) have no aggregate ceilings.
 */
export function aggregateInclusionRules(
  ref: InclusionPhaseRef | undefined,
  library: AggregateRuleLibrary = INGREDIENT_LIBRARY_SOURCE,
): AggregateInclusionRule[] {
  const resolved = resolvePhaseRef(ref);
  const column = brazilianInclusionColumn(ref);
  if (!resolved || !column) return [];
  const membership = aggregateMembership(library);
  const rules: AggregateInclusionRule[] = [];
  const add = (kind: AggregateInclusionKind, id: string, name: string, limit: AggregateLimit | undefined, members: readonly string[]) => {
    const maxPct = columnMax(limit, resolved.species, column);
    if (maxPct === undefined || !limit || members.length === 0) return;
    rules.push({ key: aggregateRuleKey(kind, id), kind, id, name, species: resolved.species, column, maxPct, source: limit.source, memberIngredientIds: members });
  };
  for (const family of library.families) add("family", family.id, family.name, family.aggregateLimit, membership.families.get(family.id) ?? []);
  for (const group of library.constraintGroups) add("group", group.id, group.name, group.aggregateLimit, membership.groups.get(group.id) ?? []);
  return rules;
}

/** "FeedSport policy (Brazilian Tables 2024, Table 1.01), grower column". */
export function describeAggregateSource(rule: Pick<AggregateInclusionRule, "source" | "species" | "column">): string {
  const type = rule.source.type === "published" ? "Published limit" : "FeedSport policy";
  return `${type} (${rule.source.reference}), ${inclusionColumnLabel(rule)} column`;
}

/** "Soybean meal family" / "Total added fats and oils". */
export function aggregateLabel(rule: Pick<AggregateInclusionRule, "kind" | "name">): string {
  return rule.kind === "family" ? `${rule.name} family` : rule.name;
}

/** Feasibility tolerance for a combined-inclusion ceiling, in percentage points. */
export function aggregateTolerancePct(maxPct: number): number {
  return Math.max(Math.abs(maxPct) * 1e-5, 1e-6);
}

export type AggregateInclusionCheck = {
  rule: AggregateInclusionRule;
  /** Combined inclusion of the members present, in %. */
  actualPct: number;
  contributions: { ingredientId: string; inclusionPct: number }[];
  exceeds: boolean;
};

/**
 * Combined inclusions of every applicable family and group with at least one
 * member in the recipe. Used for manual recipes, saved versions, MCP analysis
 * and to re-verify optimizer output.
 */
export function checkAggregateInclusion(
  rows: readonly { ingredientId: string; inclusionPct: number }[],
  ref: InclusionPhaseRef | undefined,
  library: AggregateRuleLibrary = INGREDIENT_LIBRARY_SOURCE,
): AggregateInclusionCheck[] {
  const inclusion = new Map<string, number>();
  for (const row of rows) {
    if (row.inclusionPct > 0) inclusion.set(row.ingredientId, (inclusion.get(row.ingredientId) ?? 0) + row.inclusionPct);
  }
  return aggregateInclusionRules(ref, library).flatMap((rule) => {
    const contributions = rule.memberIngredientIds.flatMap((ingredientId) => {
      const inclusionPct = inclusion.get(ingredientId);
      return inclusionPct === undefined ? [] : [{ ingredientId, inclusionPct }];
    });
    if (contributions.length === 0) return [];
    const actualPct = contributions.reduce((sum, row) => sum + row.inclusionPct, 0);
    return [{ rule, actualPct, contributions, exceeds: actualPct > rule.maxPct + aggregateTolerancePct(rule.maxPct) }];
  });
}

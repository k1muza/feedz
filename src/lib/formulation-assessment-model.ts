/**
 * Browser-safe schema shared by APIs, Studio, the public formulator, MCP,
 * saved versions and PDF reports.
 *
 * Three vocabularies that never mix:
 * - Hard requirement status (decides feasibility): met / not_met.
 * - Data status (on every value): published / assumed_zero / missing.
 * - Advisories (optional, never block): Chapter 7 supplementation
 *   comparisons, CFIA maximum-nutrient references, premix documentation
 *   gaps, premix alternatives and practical inclusion guidelines.
 */

import { boundViolation, gapDp, requirementDisplayDp } from "./numerical-tolerance";

export type DataStatus = "published" | "assumed_zero" | "missing";
export type RequirementStatus = "met" | "not_met";

export type FormulationVerdict =
  /** The recipe meets every hard requirement. Not a "ready to manufacture" claim. */
  | "meets_requirements"
  /** A recipe exists but at least one hard requirement is not met. */
  | "fails_requirements"
  /** The optimizer could not satisfy the constraints; the closest recipe is assessed. */
  | "infeasible";

export interface RequirementContribution {
  ingredientId: string;
  /** Contribution to the finished feed, in the requirement's unit. */
  value: number;
}

/**
 * A family or constraint-group ceiling: the combined inclusion of its members.
 * Distinct from an ingredient's own maximum and from advisory practical levels.
 */
export interface AggregateRequirementDetail {
  kind: "family" | "group";
  id: string;
  name: string;
  /** Every catalogue ingredient counted toward the ceiling. */
  memberIngredientIds: string[];
  source: {
    /** `published` limit, or a `feedsport_policy` derived from a reference. */
    type: "published" | "feedsport_policy";
    reference: string;
    url?: string;
    derivation: string;
    justification: string;
    /** "Brazilian Tables 2024, Table 1.01, grower column" style label. */
    description: string;
  };
}

/** One hard requirement: energy, protein, SID amino acids, minerals, practical limits, family and group inclusion ceilings and the premix dose. */
export interface RequirementCheck {
  id: string;
  label: string;
  unit: string;
  relation: "min" | "max" | "equal";
  bound: number;
  /** Sum of every known contribution. With missing data this is a lower bound. */
  actual: number;
  status: RequirementStatus;
  /** Exactly at its bound, so it drives the cost. */
  limiting: boolean;
  data: DataStatus;
  missingIngredientIds: string[];
  assumedZeroIngredientIds: string[];
  totalOnlyIngredientIds: string[];
  contributions: RequirementContribution[];
  /** True when the optimizer enforced this bound for the recipe. */
  enforcedByOptimizer: boolean;
  /** Present on family and constraint-group ceilings; contributions are then inclusion %. */
  aggregate?: AggregateRequirementDetail;
}

export type SupplementationStatus = "at_recommendation" | "below_recommendation" | "no_data";

/** Brazilian Tables Chapter 7 comparison. A recommendation, never a requirement. */
export interface SupplementationComparison {
  id: string;
  label: string;
  unit: string;
  group: "vitamin" | "trace_mineral";
  recommended: number;
  /** Supplemented amount from premixes and mineral sources. */
  actual: number;
  pctOfRecommendation: number | null;
  status: SupplementationStatus;
  data: DataStatus;
  /** Premixes in the recipe that do not document this nutrient. */
  undocumentedIngredientIds: string[];
}

/**
 * A CFIA maximum compared with the recipe's total-diet concentration.
 * - exceeds: the documented contributions alone are above the maximum.
 *   Missing values can only add, so the exceedance is established.
 * - within: at or below the maximum, and every premix in the recipe
 *   documents the nutrient. Ordinary feedstuffs without a published value
 *   are listed in `missingIngredientIds`.
 * - not_documented: at or below the maximum only because a premix that does
 *   not document the nutrient was counted as 0. Unknown, never "within".
 */
export type UpperLimitStatus = "exceeds" | "within" | "not_documented";
export type UpperLimitGroup = "vitamin" | "trace_mineral" | "macro_mineral";

export interface UpperLimitCheck {
  id: string;
  label: string;
  unit: string;
  group: UpperLimitGroup;
  max: number;
  /** Sum of every documented contribution; a lower bound when data is missing. */
  actual: number;
  status: UpperLimitStatus;
  data: DataStatus;
  undocumentedPremixIds: string[];
  missingIngredientIds: string[];
  /** Each ingredient's contribution to the finished feed, largest first. */
  contributions: RequirementContribution[];
}

/**
 * CFIA maximum nutrient values for the phase's mapped CFIA column. Advisory
 * only: never an optimiser constraint, never part of the verdict.
 */
export type UpperLimitAssessment =
  | {
      status: "assessed";
      enforcement: "advisory";
      source: string;
      sourceUrl: string;
      category: { id: string; label: string };
      mapping: { basis: string; explanation: string; crossesBoundary: boolean };
      basis: string;
      rows: UpperLimitCheck[];
      /** CFIA nutrients FeedSport does not model (magnesium, sulfur, cobalt). */
      notAssessed: string[];
    }
  | { status: "unsupported"; reason: string };

export interface DocumentationGap {
  ingredientId: string;
  nutrientId: string;
  label: string;
  /** total_only: a TOTAL value is published but no SID/digestible value. */
  reason: "total_only" | "not_documented";
}

/**
 * Version of the inclusion rules an assessment applied. Saved assessments
 * without it were made before family and constraint-group ceilings existed;
 * they are shown as saved, never silently re-scored.
 */
export const INCLUSION_POLICY_VERSION = "aggregate-limits-1";

export interface FormulationAssessment {
  schemaVersion: 2;
  /** Absent on assessments saved before aggregate inclusion ceilings. */
  inclusionPolicy?: typeof INCLUSION_POLICY_VERSION;
  optimizerFeasible: boolean;
  /**
   * The entered amounts' total, present only when it is not 100% to
   * floating-point precision: a rounding residual within
   * INCLUSION_TOTAL_TOLERANCE_PCT. Nutrients were then measured on the mix
   * the amounts make; the premix dose and family ceilings on the amounts as entered.
   */
  inclusionTotalPct?: number;
  verdict: FormulationVerdict;
  requirements: RequirementCheck[];
  supplementation: {
    source: string;
    traceMineralBasis: "inorganic";
    rows: SupplementationComparison[];
  } | null;
  /**
   * CFIA maximum-nutrient references. Absent on assessments saved before
   * they existed; those are shown as saved, never silently re-scored.
   */
  upperLimits?: UpperLimitAssessment;
  /** Unresolved manufacturer documentation, shown as one concise line. */
  documentationGaps: DocumentationGap[];
  /** A post-solve failure of a constraint that the optimizer claimed to satisfy. */
  consistencyErrors: string[];
  headline: string;
  summary: string;
  scope: string;
}

export const DATA_STATUS_LABELS: Record<DataStatus, string> = {
  published: "Published",
  assumed_zero: "Assumed 0",
  missing: "Missing",
};

export function requirementCounts(assessment: Pick<FormulationAssessment, "requirements">) {
  const failed = assessment.requirements.filter((check) => check.status === "not_met");
  return { total: assessment.requirements.length, met: assessment.requirements.length - failed.length, failed };
}

export function supplementationCounts(assessment: Pick<FormulationAssessment, "supplementation">) {
  const rows = assessment.supplementation?.rows ?? [];
  return {
    total: rows.length,
    at: rows.filter((row) => row.status === "at_recommendation").length,
    below: rows.filter((row) => row.status === "below_recommendation").length,
    noData: rows.filter((row) => row.status === "no_data").length,
  };
}

/** The CFIA vitamins whose exceedance triggers a premix comparison. */
export const UPPER_LIMIT_VITAMIN_IDS: readonly string[] = ["vitamin-a", "vitamin-d", "vitamin-e"];

export function upperLimitRows(assessment: Pick<FormulationAssessment, "upperLimits">): UpperLimitCheck[] {
  return assessment.upperLimits?.status === "assessed" ? assessment.upperLimits.rows : [];
}

export function upperLimitCounts(assessment: Pick<FormulationAssessment, "upperLimits">) {
  const rows = upperLimitRows(assessment);
  return {
    total: rows.length,
    exceeds: rows.filter((row) => row.status === "exceeds"),
    notDocumented: rows.filter((row) => row.status === "not_documented"),
    within: rows.filter((row) => row.status === "within").length,
    vitaminExceedances: rows.filter((row) => row.status === "exceeds" && UPPER_LIMIT_VITAMIN_IDS.includes(row.id)),
  };
}

/** "Vitamin A exceeds the reference maximum" — the same words in Studio, PDFs and MCP. */
export function upperLimitTitle(row: Pick<UpperLimitCheck, "label">): string {
  return `${row.label} exceeds the reference maximum`;
}

/** Concentrations written the same way everywhere: 56,000 IU/kg, 0.81%, 4.5 mg/kg. */
export function formatUpperLimitValue(value: number, unit: string): string {
  const dp = unit === "%" ? 2 : Math.abs(value) >= 100 ? 0 : Math.abs(value) >= 10 ? 1 : 2;
  const text = value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: dp });
  return unit === "%" ? `${text}%` : `${text} ${unit}`;
}

/** "The current formulation provides 56,000 IU/kg against the CFIA reference maximum of 20,000 IU/kg." */
export function upperLimitSentence(row: Pick<UpperLimitCheck, "actual" | "max" | "unit">): string {
  return `The current formulation provides ${formatUpperLimitValue(row.actual, row.unit)} against the CFIA reference maximum of ${formatUpperLimitValue(row.max, row.unit)}.`;
}

/** "Meets all 20 hard requirements" / "Doesn't meet 1 hard requirement". Never "ready to manufacture". */
export function assessmentHeadline(assessment: Pick<FormulationAssessment, "requirements" | "verdict" | "consistencyErrors">): string {
  const { total, failed } = requirementCounts(assessment);
  if (assessment.consistencyErrors.length) return "Engine consistency error";
  if (!failed.length && assessment.verdict === "infeasible") return "No recipe meets every hard requirement";
  if (!failed.length) return `Meets all ${total} hard requirement${total === 1 ? "" : "s"}`;
  return `Doesn't meet ${failed.length} hard requirement${failed.length === 1 ? "" : "s"}`;
}

export function isFormulationAssessment(value: unknown): value is FormulationAssessment {
  if (!value || typeof value !== "object") return false;
  const assessment = value as Partial<FormulationAssessment>;
  return assessment.schemaVersion === 2 &&
    (assessment.verdict === "meets_requirements" || assessment.verdict === "fails_requirements" || assessment.verdict === "infeasible") &&
    Array.isArray(assessment.requirements);
}

/**
 * Saved versions created before premixes were full ingredients carry a
 * schema-1 assessment. They are never silently re-scored: callers show a
 * "Premix data updated" note and the user re-runs the formulation.
 */
export function isLegacyAssessment(value: unknown): boolean {
  return !!value && typeof value === "object" && (value as { schemaVersion?: unknown }).schemaVersion === 1;
}

/** A schema-2 assessment made before family and constraint-group ceilings. */
export function predatesAggregateLimits(value: unknown): boolean {
  return isFormulationAssessment(value) && value.inclusionPolicy !== INCLUSION_POLICY_VERSION;
}

/**
 * A broiler assessment made before the poultry digestible-phosphorus minimum
 * was enforced: it checked available phosphorus only. Every current programme
 * phase publishes both, so an available-P check without a digestible-P check
 * identifies it. It is shown as saved, never silently re-scored or trusted.
 */
export function predatesPoultryDigestiblePhosphorus(value: unknown): boolean {
  return isFormulationAssessment(value) &&
    value.requirements.some((check) => check.id === "available-phosphorus") &&
    !value.requirements.some((check) => check.id === "sttd-phosphorus");
}

export const PRE_POULTRY_DIGESTIBLE_PHOSPHORUS_NOTE =
  "Assessed before poultry digestible phosphorus was enforced. This saved result is shown as it was assessed then; only available phosphorus was checked. Re-formulate or re-check to apply the Brazilian Tables digestible-phosphorus minimum.";

export const PRE_AGGREGATE_LIMITS_NOTE =
  "Assessed before ingredient-family limits. This saved result is shown as it was assessed then; combined family and added-fat ceilings were not checked. Re-formulate or re-check to apply them.";

export const LEGACY_PREMIX_NOTE =
  "Premix data updated. This version was assessed before commercial premixes counted as full ingredients. Its saved result is shown as it was; re-formulate to assess it with the current premix data.";

/** One premix in a comparison: the whole diet re-optimised around it. */
export interface PremixOption {
  premixId: string;
  name: string;
  inclusionPct: number;
  inclusionKgPerTonne: number;
  current: boolean;
  status: "optimal" | "infeasible" | "missing-data" | "error";
  message?: string;
  /** Null when no recipe was produced. */
  costPerTonne: number | null;
  /** The premix has no price, so the cost excludes it (a partial cost). */
  costExcludesPremix: boolean;
  requirementsMet: number;
  requirementsTotal: number;
  recipe: { ingredientId: string; inclusionPct: number }[];
  documentationGapLabels: string[];
  supplementationAt: number;
  supplementationTotal: number;
  /**
   * CFIA vitamin A, D and E checks of this option's recipe. Absent on
   * comparisons saved before CFIA references, or when the phase has none.
   */
  vitaminLimits?: PremixVitaminLimit[];
  /** Every CFIA nutrient (vitamin or mineral) this option's recipe exceeds. */
  upperLimitExceedanceLabels?: string[];
  /**
   * Where the premix's vitamin values come from. FeedSport never treats a
   * value it does not have as evidence of a lower concentration.
   */
  vitaminSource?: { verificationStatus: string; basis: string };
  /** False for an off-label, simulation-only product: never recommended. */
  compatibleOnLabel?: boolean;
  /** The comparison asked for a goal recipe but this option has none within 3%; its least-cost recipe is shown. */
  goalUnavailable?: boolean;
}

export interface PremixVitaminLimit {
  id: string;
  label: string;
  unit: string;
  max: number;
  actual: number;
  status: UpperLimitStatus;
}

/**
 * The response to a CFIA vitamin exceedance: what contributes, whether the
 * selected premix is responsible, and the validated alternative, if any.
 * It never replaces the premix itself; the farmer applies it deliberately.
 */
export interface VitaminLimitAdvice {
  exceedances: {
    id: string;
    label: string;
    unit: string;
    max: number;
    actual: number;
    contributions: RequirementContribution[];
    /** The selected premix's share of the total. */
    premixContribution: number;
    /** Without the premix's contribution the recipe would be within the maximum. */
    premixResponsible: boolean;
  }[];
  currentPremixId: string | null;
  recommendation: {
    premixId: string;
    name: string;
    /** Every exceeded vitamin is documented by the alternative and within its maximum. */
    resolved: boolean;
    changes: { id: string; label: string; unit: string; max: number; before: number; beforeStatus: UpperLimitStatus; after: number; afterStatus: UpperLimitStatus }[];
    costPerTonne: number | null;
    costDeltaPerTonne: number | null;
    costExcludesPremix: boolean;
    requirementsMet: number;
    requirementsTotal: number;
    /** CFIA minerals the alternative's recipe exceeds, disclosed alongside. */
    otherExceedanceLabels: string[];
  } | null;
  /** Each eligible alternative that was not recommended, and why. */
  notRecommended: { premixId: string; name: string; reason: string }[];
  message: string;
}

/**
 * Premix advisory. Each alternative is a real re-run with the same
 * ingredients, limits and prices: the selected premix is removed, the
 * alternative inserted at its manufacturer dose, and everything else
 * re-optimised. Two premixes are never kept together.
 */
export interface PremixComparison {
  currentPremixId: string | null;
  options: PremixOption[];
  suggestedPremixId: string | null;
  /** Why the suggestion is made, each backed by the re-run. */
  reasons: string[];
  /**
   * The formulation goal every option was re-run with. Absent or null: least
   * cost. Saved comparisons predating goal-aware re-runs omit it.
   */
  goal?: PremixComparisonGoal | null;
  /** Present when the current recipe exceeds a CFIA vitamin maximum. */
  vitaminAdvice?: VitaminLimitAdvice | null;
}

/** The optimizer's 3%-cost alternatives, by id. */
export type PremixComparisonGoal = "low-soy" | "low-import" | "simple";

/**
 * How the selected premix's documented nutrients changed the recipe: the
 * same formulation re-run with the premix's macro-nutrient contributions
 * set to zero. Positive differences are crystalline amino acids or minerals
 * the premix made unnecessary.
 */
export interface PremixRecipeEffect {
  premixId: string;
  /** Hard requirements the premix contributes to. */
  requirementIds: string[];
  changes: { ingredientId: string; withPremixPct: number; withoutContributionPct: number }[];
  costPerTonneWithoutContribution: number | null;
}

/**
 * The one-line advisory for unresolved premix documentation, identical in
 * Studio, the public formulator, PDFs and MCP. Null when there is no gap.
 */
export function documentationGapLine(assessment: Pick<FormulationAssessment, "documentationGaps">): string | null {
  const labels = [...new Set(assessment.documentationGaps.map((gap) => gap.label))];
  if (!labels.length) return null;
  const listed = labels.length > 6 ? `${labels.slice(0, 6).join(", ")} and ${labels.length - 6} more` : labels.join(", ");
  return `Premix documentation is incomplete for ${labels.length} value${labels.length === 1 ? "" : "s"} (${listed}).`;
}

/**
 * How a requirement and its recipe value are written together, in every
 * view (Studio banner, nutrient analysis, PDFs). The bound keeps its
 * published decimals (0.891, never 0.89). A requirement that is not met
 * never reads as equal to its bound: the recipe value gets the decimals that
 * show the difference, and `gap` states the shortfall or excess.
 */
export function requirementDisplay(
  check: Pick<RequirementCheck, "relation" | "bound" | "actual" | "status" | "unit">,
  baseDp: number,
): { dp: number; gap: { amount: number; dp: number; text: string; short: string } | null } {
  const met = check.status === "met";
  const dp = requirementDisplayDp(check.actual, check.bound, baseDp, met);
  if (met) return { dp, gap: null };
  const amount = boundViolation(check.relation, check.actual, check.bound);
  const below = check.actual < check.bound;
  const unit = check.unit === "%" ? " percentage points" : check.unit ? ` ${check.unit}` : "";
  const target = check.relation === "min" ? "minimum" : check.relation === "max" ? "maximum" : "required value";
  const gapDecimals = gapDp(amount);
  const written = amount.toLocaleString("en-US", { minimumFractionDigits: gapDecimals, maximumFractionDigits: gapDecimals });
  const short = `${written}${check.unit === "%" ? "" : unit} ${check.relation === "equal" ? (below ? "below" : "above") : below ? "short" : "over"}`;
  return { dp, gap: { amount, dp: gapDecimals, text: `${written}${unit} ${below ? "below" : "above"} the ${target}`, short } };
}

/**
 * Browser-safe schema shared by APIs, Studio, the public formulator, MCP,
 * saved versions and PDF reports.
 *
 * Three vocabularies that never mix:
 * - Hard requirement status (decides feasibility): met / not_met.
 * - Data status (on every value): published / assumed_zero / missing.
 * - Advisories (optional, never block): Chapter 7 supplementation
 *   comparisons, premix documentation gaps, premix alternatives and
 *   practical inclusion guidelines.
 */

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
  verdict: FormulationVerdict;
  requirements: RequirementCheck[];
  supplementation: {
    source: string;
    traceMineralBasis: "inorganic";
    rows: SupplementationComparison[];
  } | null;
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
}

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
  return `Premix documentation is incomplete for ${labels.length} value${labels.length === 1 ? "" : "s"} (${listed}). Check with the manufacturer before manufacturing.`;
}

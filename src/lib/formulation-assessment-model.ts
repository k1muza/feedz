/** Browser-safe schema shared by APIs, Studio, saved versions and reports. */
export type NutritionalCategoryId =
  | "energy-protein-amino-acids"
  | "major-minerals"
  | "vitamins"
  | "trace-minerals";

export type NutrientAssessmentStatus =
  | "met"
  | "below_target"
  | "above_limit"
  | "unknown";

export type FormulationVerdict =
  | "verified"
  | "needs_verification"
  | "infeasible";

export type NutritionalCategoryStatus =
  | "met"
  | "unmet"
  | "unknown"
  | "not_assessed";

export interface NutrientAssessment {
  nutrientId: string;
  label: string;
  categoryId: NutritionalCategoryId;
  status: NutrientAssessmentStatus;
  actual?: number;
  requiredMin?: number;
  allowedMax?: number;
  unit: string;
  reason: string;
  missingIngredientIds: string[];
  /** True when this check was part of the LP that produced the recipe. */
  enforcedByOptimizer: boolean;
  /** Published source of the target, not evidence for an unknown actual value. */
  targetSource: string;
}

export interface NutritionalCategoryAssessment {
  id: NutritionalCategoryId;
  label: string;
  status: NutritionalCategoryStatus;
  checked: number;
  required: number;
  unmetNutrientIds: string[];
  unknownNutrientIds: string[];
  note: string;
}

/** Optimizer feasibility is deliberately not a nutritional verdict. */
export interface FormulationAssessment {
  schemaVersion: 1;
  optimizerFeasible: boolean;
  verdict: FormulationVerdict;
  nutrientChecks: NutrientAssessment[];
  categories: NutritionalCategoryAssessment[];
  /** A post-solve failure of a constraint that the optimizer claimed to satisfy. */
  consistencyErrors: string[];
  summary: string;
  guidance: string;
  validationScope: string;
}

export const FORMULATION_VERDICT_LABELS: Record<FormulationVerdict, string> = {
  verified: "Nutritional requirements verified",
  needs_verification: "Nutritional verification required",
  infeasible: "Reformulation required",
};

export const MICRONUTRIENT_CATEGORY_IDS = ["vitamins", "trace-minerals"] as const;

/** The complete vitamin and trace-mineral lists used by every detailed output. */
export function micronutrientAssessmentGroups(assessment: FormulationAssessment) {
  return MICRONUTRIENT_CATEGORY_IDS.map((id) => ({
    id,
    category: assessment.categories.find((category) => category.id === id),
    checks: assessment.nutrientChecks.filter((check) => check.categoryId === id),
  }));
}

export function nutrientAssessmentStatusLabel(status: NutrientAssessmentStatus) {
  return status === "met"
    ? "Meets target"
    : status === "below_target"
      ? "Below target"
      : status === "above_limit"
        ? "Above limit"
        : "Cannot verify";
}

export function isFormulationAssessment(value: unknown): value is FormulationAssessment {
  if (!value || typeof value !== "object") return false;
  const assessment = value as Partial<FormulationAssessment>;
  return assessment.schemaVersion === 1 &&
    (assessment.verdict === "verified" || assessment.verdict === "needs_verification" || assessment.verdict === "infeasible") &&
    Array.isArray(assessment.nutrientChecks) &&
    Array.isArray(assessment.categories);
}

import type { DietFormula } from "./diet-formula";
import {
  evaluateFormulation,
  formulationRequirements,
  type FormulationDiagnostic,
  type FormulationEvaluation,
  type FormulationSettings,
} from "./feed-optimizer";
import type { IngredientLibrary } from "./ingredient-nutrients";
import type { NutritionPhase } from "./nutrition";
import type { EnergySystem } from "./nutrition-targets";
import type {
  FormulationAssessment,
  FormulationVerdict,
  NutrientAssessment,
  NutrientAssessmentStatus,
  NutritionalCategoryAssessment,
  NutritionalCategoryId,
  NutritionalCategoryStatus,
} from "./formulation-assessment-model";

export {
  FORMULATION_VERDICT_LABELS,
  MICRONUTRIENT_CATEGORY_IDS,
  isFormulationAssessment,
  micronutrientAssessmentGroups,
  nutrientAssessmentStatusLabel,
  type FormulationAssessment,
  type FormulationVerdict,
  type NutrientAssessment,
  type NutrientAssessmentStatus,
  type NutritionalCategoryAssessment,
  type NutritionalCategoryId,
  type NutritionalCategoryStatus,
} from "./formulation-assessment-model";

const CATEGORY_LABELS: Record<NutritionalCategoryId, string> = {
  "energy-protein-amino-acids": "Energy, protein and amino acids",
  "major-minerals": "Major minerals",
  vitamins: "Vitamins",
  "trace-minerals": "Trace minerals",
};

export function assessmentCategoryForConstraint(id: string): NutritionalCategoryId | null {
  if (id.startsWith("supplement-vitamin-") || [
    "supplement-pantothenic-acid",
    "supplement-niacin",
    "supplement-folic-acid",
    "supplement-biotin",
    "supplement-choline",
  ].includes(id)) return "vitamins";
  if (id.startsWith("supplement-")) return "trace-minerals";
  if (["calcium", "sttd-phosphorus", "available-phosphorus", "sodium", "potassium", "chloride"].includes(id)) {
    return "major-minerals";
  }
  if (id.startsWith("energy-") || id === "crude-protein" || id === "digestible-protein" || id.startsWith("sid-") || id === "linoleic-acid") {
    return "energy-protein-amino-acids";
  }
  // Practical ingredient and fibre constraints affect feasibility, but are not
  // part of the declared nutritional-verification categories.
  return null;
}

export function nutrientAssessmentStatus(
  relation: "min" | "max",
  actual: number,
  bound: number,
): NutrientAssessmentStatus {
  const failed = relation === "min"
    ? actual + 1e-7 < bound
    : actual - 1e-7 > bound;
  return !failed ? "met" : relation === "min" ? "below_target" : "above_limit";
}

const joinLabels = (labels: string[]) =>
  labels.length < 2
    ? labels[0] ?? ""
    : labels.length === 2
      ? `${labels[0]} and ${labels[1]}`
      : `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;

function targetSource(phase: NutritionPhase, categoryId: NutritionalCategoryId): string {
  if ((categoryId === "vitamins" || categoryId === "trace-minerals") && phase.supplementation) {
    const tables = phase.supplementation.sourceTables.join(", ");
    const pages = phase.supplementation.sourcePages.join(", ");
    return `Brazilian Tables supplementation guidance, table${phase.supplementation.sourceTables.length === 1 ? "" : "s"} ${tables}, printed page${phase.supplementation.sourcePages.length === 1 ? "" : "s"} ${pages}`;
  }
  return `Programme table ${phase.sourceTable}, printed page ${phase.sourcePage}`;
}

function buildCheck(
  requirement: ReturnType<typeof formulationRequirements>[number],
  categoryId: NutritionalCategoryId,
  evaluation: FormulationEvaluation,
  library: IngredientLibrary,
  enforcedIds: ReadonlySet<string>,
  phase: NutritionPhase,
): NutrientAssessment {
  const comparison = evaluation.nutrientProfile.find((row) => row.id === requirement.id);
  const incomplete = evaluation.incompleteRequirements.find((row) => row.id === requirement.id);
  const missingIngredientIds = incomplete?.missingIngredientIds ?? [];
  const missingNames = missingIngredientIds.map((id) => library.ingredients.find((ingredient) => ingredient.id === id)?.name ?? id);
  const common = {
    nutrientId: requirement.id,
    label: requirement.label,
    categoryId,
    unit: requirement.unit,
    missingIngredientIds,
    enforcedByOptimizer: enforcedIds.has(requirement.id),
    targetSource: targetSource(phase, categoryId),
    ...(requirement.relation === "min" ? { requiredMin: requirement.bound } : { allowedMax: requirement.bound }),
  };

  if (!comparison || incomplete) {
    return {
      ...common,
      status: "unknown",
      reason: missingNames.length
        ? `No published ${requirement.label.toLowerCase()} value is available for ${joinLabels(missingNames)}. The unknown value was not treated as zero.`
        : `The recipe does not contain enough published data to verify ${requirement.label.toLowerCase()}.`,
    };
  }

  const status = nutrientAssessmentStatus(requirement.relation, comparison.actual, requirement.bound);
  return {
    ...common,
    status,
    actual: comparison.actual,
    reason: status === "met"
      ? `${requirement.label} meets the ${requirement.relation === "min" ? "minimum target" : "maximum limit"}.`
      : status === "below_target"
        ? `${requirement.label} is below the programme minimum.`
        : `${requirement.label} is above the programme maximum.`,
  };
}

function buildCategory(
  id: NutritionalCategoryId,
  checks: NutrientAssessment[],
): NutritionalCategoryAssessment {
  const unmet = checks.filter((check) => check.status === "below_target" || check.status === "above_limit");
  const unknown = checks.filter((check) => check.status === "unknown");
  const status: NutritionalCategoryStatus = checks.length === 0
    ? "not_assessed"
    : unmet.length
      ? "unmet"
      : unknown.length
        ? "unknown"
        : "met";
  const notes = [
    unmet.length ? `${unmet.length} checked requirement${unmet.length === 1 ? " is" : "s are"} outside its target.` : "",
    unknown.length ? `${unknown.length} requirement${unknown.length === 1 ? " cannot" : "s cannot"} be verified from the published ingredient data.` : "",
  ].filter(Boolean);
  return {
    id,
    label: CATEGORY_LABELS[id],
    status,
    checked: checks.filter((check) => check.status !== "unknown").length,
    required: checks.length,
    unmetNutrientIds: unmet.map((check) => check.nutrientId),
    unknownNutrientIds: unknown.map((check) => check.nutrientId),
    note: status === "not_assessed"
      ? `No ${id === "vitamins" ? "vitamin" : id === "trace-minerals" ? "trace-mineral" : CATEGORY_LABELS[id].toLowerCase()} targets are loaded for this stage.`
      : status === "met"
        ? `All ${checks.length} applicable requirements are verified.`
        : notes.join(" "),
  };
}

export function buildFormulationAssessment(
  phase: NutritionPhase,
  energySystem: EnergySystem,
  formula: DietFormula,
  library: IngredientLibrary,
  evaluation?: FormulationEvaluation,
  options: {
    optimizerFeasible?: boolean;
    enforcedSettings?: FormulationSettings;
    checkOptimizerConsistency?: boolean;
  } = {},
): FormulationAssessment {
  const optimizerFeasible = options.optimizerFeasible ?? true;
  const fullEvaluation = evaluation ?? evaluateFormulation(
    phase,
    energySystem,
    formula,
    library,
    { includeSupplementationTargets: true, traceMineralBasis: "inorganic" },
  );
  const applicableRequirements = formulationRequirements(
    phase,
    energySystem,
    { includeSupplementationTargets: true, traceMineralBasis: "inorganic" },
  );
  const enforcedIds = new Set(
    formulationRequirements(phase, energySystem, options.enforcedSettings).map((requirement) => requirement.id),
  );
  const nutrientChecks = applicableRequirements.flatMap((requirement) => {
    const categoryId = assessmentCategoryForConstraint(requirement.id);
    return categoryId
      ? [buildCheck(requirement, categoryId, fullEvaluation, library, enforcedIds, phase)]
      : [];
  });
  const categoryIds: NutritionalCategoryId[] = [
    "energy-protein-amino-acids",
    "major-minerals",
    "vitamins",
    "trace-minerals",
  ];
  const categories = categoryIds.map((id) => buildCategory(
    id,
    nutrientChecks.filter((check) => check.categoryId === id),
  ));
  const consistencyErrors = options.checkOptimizerConsistency
    ? nutrientChecks
        .filter((check) => check.enforcedByOptimizer && (check.status === "below_target" || check.status === "above_limit"))
        .map((check) => `${check.label} failed post-solve validation even though it was enforced by the optimizer.`)
    : [];
  const unmet = nutrientChecks.filter((check) => check.status === "below_target" || check.status === "above_limit");
  const unknown = nutrientChecks.filter((check) => check.status === "unknown");
  const notAssessed = categories.filter((category) => category.status === "not_assessed");
  const verdict: FormulationVerdict = !optimizerFeasible
    ? "infeasible"
    : unmet.length || unknown.length || notAssessed.length || consistencyErrors.length
      ? "needs_verification"
      : "verified";

  const metCategories = categories.filter((category) => category.status === "met").map((category) => category.label.toLowerCase());
  const unknownLabels = unknown.map((check) => check.label);
  const unmetLabels = unmet.map((check) => check.label);
  const unassessedLabels = notAssessed.map((category) => category.label.toLowerCase());
  const summary = verdict === "verified"
    ? "The recipe satisfies every applicable requirement within FeedSport's declared nutritional-validation scope."
    : verdict === "infeasible"
      ? "The selected ingredients and limits cannot produce a recipe that satisfies the optimizer's enforced constraints."
      : [
          `The optimizer found a recipe${metCategories.length ? ` that verifies ${joinLabels(metCategories)}` : ""}.`,
          unmetLabels.length ? `${joinLabels(unmetLabels)} ${unmetLabels.length === 1 ? "is" : "are"} outside the selected programme target.` : "",
          unknownLabels.length ? `${joinLabels(unknownLabels)} cannot be verified because published ingredient data are missing.` : "",
          unassessedLabels.length ? `No targets are loaded for ${joinLabels(unassessedLabels)}.` : "",
        ].filter(Boolean).join(" ");
  const guidance = verdict === "verified"
    ? "Use the exact ingredients and amounts shown. Ingredient quality, weighing, mixing, storage and animal-specific health needs are outside this calculation."
    : verdict === "infeasible"
      ? "Review ingredient availability, inclusion limits and nutrient requirements, then reformulate."
      : unknown.length
        ? "Obtain the manufacturer's nutrient specification or select ingredients or a premix with a documented profile, then reformulate. Confirm any unresolved result with a qualified livestock nutritionist before manufacture or feeding."
        : "Review the affected ingredient or premix selection and reformulate. Confirm the result with a qualified livestock nutritionist before manufacture or feeding.";

  return {
    schemaVersion: 1,
    optimizerFeasible,
    verdict,
    nutrientChecks,
    categories,
    consistencyErrors,
    summary,
    guidance,
    validationScope: "FeedSport checks the selected programme's modeled energy, protein, amino-acid and major-mineral requirements plus loaded vitamin and trace-mineral supplementation targets. It does not verify ingredient quality, manufacturing accuracy, storage or animal health.",
  };
}

export function buildInfeasibleFormulationAssessment(
  message: string,
  diagnostics: readonly FormulationDiagnostic[] = [],
): FormulationAssessment {
  return {
    schemaVersion: 1,
    optimizerFeasible: false,
    verdict: "infeasible",
    nutrientChecks: [],
    categories: [],
    consistencyErrors: [],
    summary: message || "The selected ingredients and limits cannot produce a recipe that satisfies the optimizer's enforced constraints.",
    guidance: diagnostics.length
      ? `Review the reported ${diagnostics.length === 1 ? "constraint" : "constraints"}, ingredient availability and inclusion limits, then reformulate.`
      : "Review ingredient availability, inclusion limits and nutrient requirements, then reformulate.",
    validationScope: "No nutritional-verification claim is made because the optimizer did not produce a feasible recipe.",
  };
}


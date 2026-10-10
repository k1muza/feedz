/**
 * Backward-compatible import surface. New code should import the canonical
 * formulation assessment directly from ./formulation-assessment.
 */
export {
  assessmentCategoryForConstraint as validationCategoryForConstraint,
  buildFormulationAssessment as buildCompleteFeedValidation,
} from "./formulation-assessment";
export type {
  FormulationAssessment as CompleteFeedValidation,
  NutritionalCategoryAssessment as NutritionalValidationCategory,
  NutritionalCategoryId as NutritionalValidationCategoryId,
  NutritionalCategoryStatus as NutritionalValidationStatus,
} from "./formulation-assessment";

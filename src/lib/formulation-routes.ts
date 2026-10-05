export type FeedFormulationSection =
  | "programmes"
  | "formulations"
  | "ingredients"
  | "nutrients";

const SECTION_PATHS: Record<FeedFormulationSection, string> = {
  programmes: "programmes",
  formulations: "formulations",
  ingredients: "ingredients",
  nutrients: "nutrients",
};

export function feedFormulationHref(section?: FeedFormulationSection): string {
  return section ? `/dashboard/${SECTION_PATHS[section]}` : "/dashboard";
}

export function feedIngredientHref(ingredientId: string): string {
  return feedFormulationHref("ingredients") + "/" + encodeURIComponent(ingredientId);
}

export function feedProgrammeHref(programmeId: string): string {
  return feedFormulationHref("programmes") + "/" + encodeURIComponent(programmeId);
}

export function feedProgrammePhaseHref(programmeId: string, phaseId: string): string {
  return feedProgrammeHref(programmeId) + "/phases/" + encodeURIComponent(phaseId);
}

export function feedFormulationStrategyHref(formulationId: string): string {
  return feedFormulationHref("formulations") + "/" + encodeURIComponent(formulationId);
}

export function newFeedFormulationHref(): string {
  return feedFormulationHref("formulations") + "/new";
}

export function editFeedFormulationHref(formulationId: string): string {
  return feedFormulationStrategyHref(formulationId) + "/edit";
}

export function feedNutrientHref(nutrientId: string): string {
  return feedFormulationHref("nutrients") + "/" + encodeURIComponent(nutrientId);
}

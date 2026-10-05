import { FEED_PROGRAMMES } from "./feed-programmes";
import { INGREDIENT_LIBRARY } from "./ingredient-nutrients";

export function feedFormulationEditorOptions() {
  return {
    programmes: FEED_PROGRAMMES.filter(
      (programme) => programme.status === "loaded" && programme.phases.length > 0,
    ).map((programme) => ({
      id: programme.id,
      name: programme.name,
      phases: programme.phases.map((phase) => ({
        id: phase.id,
        label: phase.label,
        sourceTable: phase.sourceTable,
        supplementationSourceTables: phase.supplementation?.sourceTables,
      })),
    })),
    ingredients: INGREDIENT_LIBRARY.ingredients.map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name,
      category: ingredient.category,
      minInclusionPct: ingredient.constraints.minInclusionPct,
      maxInclusionPct: ingredient.constraints.maxInclusionPct,
    })),
  };
}

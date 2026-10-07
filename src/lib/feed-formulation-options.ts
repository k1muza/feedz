import { FEED_PROGRAMMES } from "./feed-programmes";
import { feedsportInclusionLimits } from "./ingredient-inclusion-limits";
import { INGREDIENT_LIBRARY } from "./ingredient-nutrients";
import type { NutritionPhase } from "./nutrition";

/** Phase-specific maxima that differ from each ingredient's static limit. */
function phaseMaxInclusionPct(phase: NutritionPhase): Record<string, number> {
  return Object.fromEntries(
    INGREDIENT_LIBRARY.ingredients.flatMap((ingredient) => {
      const limits = feedsportInclusionLimits(ingredient.id, ingredient.constraints, phase.phaseClass);
      return limits.maxPct < limits.staticMaxPct ? [[ingredient.id, limits.maxPct]] : [];
    }),
  );
}

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
        maxInclusionPct: phaseMaxInclusionPct(phase),
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

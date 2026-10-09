import { FEED_PROGRAMMES } from "./feed-programmes";
import {
  ingredientDefaultPlanningPricePerTonne,
  ingredientDefaultPrice,
  ingredientImportPriceMultiplier,
} from "./feed-ingredient-prices";
import {
  feedsportInclusionLimits,
  phaseInclusionRecommendation,
} from "./ingredient-inclusion-limits";
import { INGREDIENT_LIBRARY, ingredientLibraryForPhase } from "./ingredient-nutrients";
import { getIngredientPrices } from "./ingredient-prices";
import type { NutritionPhase } from "./nutrition";
import { COMMERCIAL_PREMIXES } from "./commercial-premixes";

/** Phase-specific maxima that differ from each ingredient's static limit. */
function phaseMaxInclusionPct(phase: NutritionPhase): Record<string, number> {
  return Object.fromEntries(
    ingredientLibraryForPhase(phase).ingredients.flatMap((ingredient) => {
      const limits = feedsportInclusionLimits(ingredient.id, ingredient.constraints, phase);
      return limits.maxPct < limits.staticMaxPct ? [[ingredient.id, limits.maxPct]] : [];
    }),
  );
}

function phasePracticalInclusionPct(phase: NutritionPhase): Record<string, number> {
  return Object.fromEntries(
    ingredientLibraryForPhase(phase).ingredients.flatMap((ingredient) => {
      const recommendation = phaseInclusionRecommendation(ingredient.id, phase);
      return recommendation?.practicalPct === undefined
        ? []
        : [[ingredient.id, recommendation.practicalPct]];
    }),
  );
}

export async function feedFormulationEditorOptions() {
  const prices = await getIngredientPrices();
  const ingredientOption = (
    ingredient: {
      id: string;
      name: string;
      category: string;
      constraints: { minInclusionPct?: number; maxInclusionPct?: number };
    },
  ) => {
    const price = ingredientDefaultPrice(ingredient.id, prices);
    const planningPricePerTonne = ingredientDefaultPlanningPricePerTonne(
      ingredient.id,
      prices,
    );
    return {
      id: ingredient.id,
      name: ingredient.name,
      category: ingredient.category,
      minInclusionPct: ingredient.constraints.minInclusionPct,
      maxInclusionPct: ingredient.constraints.maxInclusionPct,
      defaultPricePerKg:
        planningPricePerTonne === undefined ? undefined : planningPricePerTonne / 1000,
      priceMarket: price?.market,
      priceAsOf: price?.asOf,
      priceSource: price?.sourceLabel,
      importMultiplier: price
        ? price.planningMultiplier ?? ingredientImportPriceMultiplier(price.sourceScope)
        : 1,
      availabilityMultiplier: price?.planningMultiplier
        ? 1
        : price?.availabilityMultiplier ?? 1,
    };
  };

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
        practicalInclusionPct: phasePracticalInclusionPct(phase),
        sourceTable: phase.sourceTable,
        supplementationSourceTables: phase.supplementation?.sourceTables,
      })),
    })),
    ingredients: [
      ...INGREDIENT_LIBRARY.ingredients.map(ingredientOption),
      ...COMMERCIAL_PREMIXES.map((premix) => {
        const price = ingredientDefaultPrice(premix.id, prices);
        const planningPricePerTonne = ingredientDefaultPlanningPricePerTonne(
          premix.id,
          prices,
        );
        return {
          id: premix.id,
          name: premix.name,
          category: "vitamin_mineral_premix",
          minInclusionPct: premix.inclusionPct,
          maxInclusionPct: premix.inclusionPct,
          defaultPricePerKg:
            planningPricePerTonne === undefined ? undefined : planningPricePerTonne / 1000,
          priceMarket: price?.market,
          priceAsOf: price?.asOf,
          priceSource: price?.sourceLabel,
          importMultiplier: price
            ? price.planningMultiplier ?? ingredientImportPriceMultiplier(price.sourceScope)
            : 1,
          availabilityMultiplier: price?.planningMultiplier
            ? 1
            : price?.availabilityMultiplier ?? 1,
          verificationStatus: premix.verificationStatus,
          specificationUrl: premix.specificationUrl,
        };
      }),

    ],
  };
}

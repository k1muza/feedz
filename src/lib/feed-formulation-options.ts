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
import {
  PUBLIC_PREMIX_ID,
  PUBLIC_PREMIX_INCLUSION_PCT,
  PUBLIC_PREMIX_NAME,
} from "./public-feed-premix";

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
      importMultiplier: price ? ingredientImportPriceMultiplier(price.sourceScope) : 1,
      availabilityMultiplier: price?.availabilityMultiplier ?? 1,
    };
  };

  const premixPrice = ingredientDefaultPrice(PUBLIC_PREMIX_ID, prices);
  const premixPlanningPricePerTonne = ingredientDefaultPlanningPricePerTonne(
    PUBLIC_PREMIX_ID,
    prices,
  );

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
      {
        id: PUBLIC_PREMIX_ID,
        name: PUBLIC_PREMIX_NAME,
        category: "vitamin_mineral_premix",
        minInclusionPct: PUBLIC_PREMIX_INCLUSION_PCT,
        maxInclusionPct: PUBLIC_PREMIX_INCLUSION_PCT,
        defaultPricePerKg:
          premixPlanningPricePerTonne === undefined
            ? undefined
            : premixPlanningPricePerTonne / 1000,
        priceMarket: premixPrice?.market,
        priceAsOf: premixPrice?.asOf,
        priceSource: premixPrice?.sourceLabel,
        importMultiplier: premixPrice
          ? ingredientImportPriceMultiplier(premixPrice.sourceScope)
          : 1,
        availabilityMultiplier: premixPrice?.availabilityMultiplier ?? 1,
      },
    ],
  };
}

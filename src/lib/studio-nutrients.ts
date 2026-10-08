import "server-only";

import { FEED_NUTRIENTS, ingredientValueForNutrient, nutrientRequirementValue } from "@/lib/feed-nutrients";
import { FEED_PROGRAMMES } from "@/lib/feed-programmes";
import { INGREDIENT_LIBRARY } from "@/lib/ingredient-nutrients";

// Nutrient reference data for the formulation studio (/studio/nutrients): the
// nutrients FeedSport tracks, how many loaded programmes set a requirement for
// each, and how many library ingredients carry a value.

export interface StudioNutrient {
  id: string;
  name: string;
  shortName: string;
  group: string;
  units: string[];
  description: string;
  formulationRole: string;
  programmesRequiring: number;
  ingredientsWithValue: number;
}

export interface StudioNutrientData {
  nutrients: StudioNutrient[];
  programmeCount: number;
  ingredientCount: number;
}

export function getStudioNutrients(): StudioNutrientData {
  const programmes = FEED_PROGRAMMES.filter((programme) => programme.status === "loaded");
  const ingredients = INGREDIENT_LIBRARY.ingredients;
  return {
    programmeCount: programmes.length,
    ingredientCount: ingredients.length,
    nutrients: FEED_NUTRIENTS.map((nutrient) => ({
      id: nutrient.id,
      name: nutrient.name,
      shortName: nutrient.shortName,
      group: nutrient.group,
      units: [...nutrient.units],
      description: nutrient.description,
      formulationRole: nutrient.formulationRole,
      programmesRequiring: programmes.filter((programme) =>
        programme.phases.some((phase) => {
          // Some requirements are built from optional phase values, so check the
          // rendered value rather than trusting that an object came back.
          const requirement = nutrientRequirementValue(nutrient.id, phase);
          return requirement !== undefined && !/undefined|NaN/.test(requirement.value);
        }),
      ).length,
      ingredientsWithValue: ingredients.filter((ingredient) => ingredientValueForNutrient(nutrient.id, ingredient)).length,
    })),
  };
}

import "server-only";

import type { NutritionPhase } from "./nutrition";
import {
  INGREDIENT_LIBRARY,
  sidAminoAcidPct,
  sttdPhosphorusPctOf,
  type IngredientNutrientRecord,
} from "./ingredient-nutrients";

// Values for the nutrients in feed-nutrients.ts: a phase's published
// requirement and an ingredient's library value. Kept apart from the nutrient
// list because they read the ingredient library, which stays on the server.

export type NutrientRequirementConstraint = {
  value: string;
  basis: string;
  minimum?: string;
  target?: string;
  maximum?: string;
};

export type NutrientIngredientAbundance = {
  ingredientId: string;
  ingredientName: string;
  category: IngredientNutrientRecord["category"];
  value: number;
  unit: string;
};

function minimum(value: string, basis: string): NutrientRequirementConstraint {
  return { value, basis, minimum: value };
}

function target(value: string, basis: string): NutrientRequirementConstraint {
  return { value, basis, target: value };
}

export function nutrientRequirementValue(
  nutrientId: string,
  phase: NutritionPhase,
): NutrientRequirementConstraint | undefined {
  const r = phase.requirements;
  const sid = r.sidAminoAcidsPct;
  const ratios = r.aminoAcids;
  const directAa = (value: number, ratio: number) =>
    minimum(`${value}%`, `diet · ${ratio}% of SID Lys`);

  switch (nutrientId) {
    case "metabolizable-energy":
      return target(`${r.metabolizableEnergyKcalKg} kcal/kg`, "published diet energy");
    case "net-energy":
      return target(`${r.netEnergyKcalKg} kcal/kg`, "published diet energy");
    case "crude-protein":
      return minimum(`${r.crudeProteinPct}%`, "diet");
    case "digestible-protein":
      return minimum(`${r.digestibleProteinPct}%`, "diet");
    case "sid-lysine":
      return minimum(`${sid.lysine}%`, "diet · reference SID amino acid");
    case "sid-methionine-cysteine":
      return directAa(sid.methionineCysteine, ratios.methionineCysteineToLysPct);
    case "sid-threonine":
      return directAa(sid.threonine, ratios.threonineToLysPct);
    case "sid-tryptophan":
      return directAa(sid.tryptophan, ratios.tryptophanToLysPct);
    case "sid-valine":
      return directAa(sid.valine, ratios.valineToLysPct);
    case "sid-isoleucine":
      return directAa(sid.isoleucine, ratios.isoleucineToLysPct);
    case "sid-leucine":
      return directAa(sid.leucine, ratios.leucineToLysPct);
    case "sid-histidine":
      return directAa(sid.histidine, ratios.histidineToLysPct);
    case "sid-phenylalanine-tyrosine":
      return directAa(sid.phenylalanineTyrosine, ratios.phenylalanineTyrosineToLysPct);
    case "calcium":
      return r.minerals.calciumPct === undefined
        ? undefined
        : minimum(`${r.minerals.calciumPct}%`, "diet");
    case "sttd-phosphorus":
      return r.minerals.sttdPhosphorusPct === undefined
        ? undefined
        : minimum(`${r.minerals.sttdPhosphorusPct}%`, "diet");
    case "available-phosphorus":
      return r.minerals.availablePhosphorusPct === undefined
        ? undefined
        : minimum(`${r.minerals.availablePhosphorusPct}%`, "diet");
    case "potassium":
      return minimum(`${r.potassiumPct}%`, "diet");
    case "sodium":
      return minimum(`${r.minerals.sodiumPct}%`, "diet");
    case "chloride":
      return r.minerals.chloridePct === undefined
        ? undefined
        : minimum(`${r.minerals.chloridePct}%`, "diet");
    case "linoleic-acid":
      return r.linoleicAcidPct === undefined
        ? undefined
        : minimum(`${r.linoleicAcidPct}%`, "diet");
    default:
      return undefined;
  }
}

export function ingredientValueForNutrient(
  nutrientId: string,
  ingredient: IngredientNutrientRecord,
): { value: number; unit: string } | undefined {
  const sid = (aminoAcid: string) => sidAminoAcidPct(ingredient, aminoAcid);
  const combinedSid = (combinedKey: string, ...aminoAcids: string[]) => {
    const explicit = ingredient.aminoAcids.sidPct[combinedKey];
    if (explicit !== undefined) return explicit;

    const values = aminoAcids.map(sid);
    return values.every((value) => value !== undefined)
      ? values.reduce((sum, value) => sum + (value ?? 0), 0)
      : undefined;
  };

  let value: number | undefined;
  let unit = "%";

  switch (nutrientId) {
    case "metabolizable-energy":
      value = ingredient.energy.metabolizableKcalKg;
      unit = "kcal/kg";
      break;
    case "net-energy":
      value = ingredient.energy.netKcalKg;
      unit = "kcal/kg";
      break;
    case "crude-protein":
      value = ingredient.composition.crudeProteinPct;
      break;
    case "digestible-protein":
      value = ingredient.composition.digestibleProteinPct;
      break;
    case "sid-lysine":
      value = sid("lysine");
      break;
    case "sid-methionine-cysteine":
      value = combinedSid("methionineCysteine", "methionine", "cysteine");
      break;
    case "sid-threonine":
      value = sid("threonine");
      break;
    case "sid-tryptophan":
      value = sid("tryptophan");
      break;
    case "sid-valine":
      value = sid("valine");
      break;
    case "sid-isoleucine":
      value = sid("isoleucine");
      break;
    case "sid-leucine":
      value = sid("leucine");
      break;
    case "sid-histidine":
      value = sid("histidine");
      break;
    case "sid-phenylalanine-tyrosine":
      value = combinedSid(
        "phenylalanineTyrosine",
        "phenylalanine",
        "tyrosine",
      );
      break;
    case "calcium":
      value = ingredient.macroMinerals.calciumPct;
      break;
    case "total-phosphorus":
      value = ingredient.macroMinerals.totalPhosphorusPct;
      break;
    case "sttd-phosphorus":
      value = sttdPhosphorusPctOf(ingredient);
      break;
    case "available-phosphorus":
      value = ingredient.macroMinerals.availablePhosphorusPct;
      break;
    case "potassium":
      value = ingredient.macroMinerals.potassiumPct;
      break;
    case "sodium":
      value = ingredient.macroMinerals.sodiumPct;
      break;
    case "chloride":
      value = ingredient.macroMinerals.chloridePct;
      break;
    case "crude-fibre":
      value = ingredient.composition.crudeFibrePct;
      break;
    case "linoleic-acid":
      value = ingredient.composition.linoleicAcidPct;
      break;
    case "zinc":
    case "iron":
    case "manganese":
    case "copper":
    case "iodine":
    case "selenium":
      value = ingredient.traceMineralsPpm[nutrientId];
      unit = "ppm";
      break;
    case "vitamin-a":
      value = ingredient.vitamins.vitaminAIuKg;
      unit = "IU/kg";
      break;
    case "vitamin-d":
      value = ingredient.vitamins.vitaminDIuKg;
      unit = "IU/kg";
      break;
    case "vitamin-e":
      value = ingredient.vitamins.vitaminEIuKg;
      unit = "IU/kg";
      break;
    case "vitamin-k":
      value = ingredient.vitamins.vitaminKMgKg;
      unit = "mg/kg";
      break;
    case "vitamin-b1":
      value = ingredient.vitamins.vitaminB1MgKg;
      unit = "mg/kg";
      break;
    case "vitamin-b6":
      value = ingredient.vitamins.vitaminB6MgKg;
      unit = "mg/kg";
      break;
    case "folic-acid":
      value = ingredient.vitamins.folicAcidMgKg;
      unit = "mg/kg";
      break;
    case "biotin":
      value = ingredient.vitamins.biotinMgKg;
      unit = "mg/kg";
      break;
    case "niacin":
      value = ingredient.vitamins.niacinMgKg;
      unit = "mg/kg";
      break;
    case "riboflavin":
      value = ingredient.vitamins.riboflavinMgKg;
      unit = "mg/kg";
      break;
    case "pantothenic-acid":
      value = ingredient.vitamins.pantothenicAcidMgKg;
      unit = "mg/kg";
      break;
    case "vitamin-b12":
      value = ingredient.vitamins.vitaminB12McgKg;
      unit = "mcg/kg";
      break;
    case "choline":
      value = ingredient.vitamins.totalCholineMgKg;
      unit = "mg/kg";
      break;
    default:
      return undefined;
  }

  return value === undefined || value <= 0 ? undefined : { value, unit };
}

export function abundantIngredientsForNutrient(
  nutrientId: string,
  limit = 6,
): readonly NutrientIngredientAbundance[] {
  return INGREDIENT_LIBRARY.ingredients
    .flatMap((ingredient) => {
      const nutrient = ingredientValueForNutrient(nutrientId, ingredient);
      return nutrient
        ? [{
            ingredientId: ingredient.id,
            ingredientName: ingredient.name,
            category: ingredient.category,
            value: nutrient.value,
            unit: nutrient.unit,
          }]
        : [];
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, Math.max(0, limit));
}

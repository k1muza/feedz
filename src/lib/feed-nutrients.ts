import type { NutritionPhase } from "./nutrition";
import {
  INGREDIENT_LIBRARY,
  sidAminoAcidPct,
  sttdPhosphorusPctOf,
  type IngredientNutrientRecord,
} from "./ingredient-nutrients";

export type NutrientGroup =
  | "Energy & protein"
  | "Amino acids"
  | "Macro minerals"
  | "Fatty acids"
  | "Trace minerals"
  | "Vitamins";

export type FeedNutrient = {
  id: string;
  name: string;
  shortName: string;
  group: NutrientGroup;
  units: readonly string[];
  description: string;
  formulationRole: string;
};

export const FEED_NUTRIENTS: readonly FeedNutrient[] = [
  {
    id: "metabolizable-energy",
    name: "Metabolizable Energy",
    shortName: "ME",
    group: "Energy & protein",
    units: ["kcal/kg"],
    description: "Digestible energy less urinary and gaseous energy losses.",
    formulationRole: "Dietary energy concentration published for each Brazilian Tables phase.",
  },
  {
    id: "net-energy",
    name: "Net Energy",
    shortName: "NE",
    group: "Energy & protein",
    units: ["kcal/kg"],
    description: "Metabolizable energy less the heat increment of feeding.",
    formulationRole: "Alternative energy expression published alongside metabolizable energy.",
  },
  {
    id: "crude-protein",
    name: "Crude Protein",
    shortName: "CP",
    group: "Energy & protein",
    units: ["%"],
    description: "Conventional estimate of total dietary protein from nitrogen content.",
    formulationRole: "Published dietary concentration used with the amino-acid requirements.",
  },
  {
    id: "digestible-protein",
    name: "Digestible Protein",
    shortName: "Dig. protein",
    group: "Energy & protein",
    units: ["%"],
    description: "Dietary crude protein expressed on the Brazilian Tables swine standardized ileal digestible basis.",
    formulationRole: "Published digestible-protein requirement constrained against swine SID crude-protein values from the ingredient tables.",
  },
  {
    id: "sid-lysine",
    name: "SID Lysine",
    shortName: "SID Lys",
    group: "Amino acids",
    units: ["%", "% of SID Lys"],
    description: "Standardized ileal digestible lysine.",
    formulationRole: "Reference amino acid for the Brazilian Tables ideal-protein ratios.",
  },
  ...[
    ["sid-methionine-cysteine", "SID Methionine + Cysteine", "SID Met+Cys"],
    ["sid-threonine", "SID Threonine", "SID Thr"],
    ["sid-tryptophan", "SID Tryptophan", "SID Trp"],
    ["sid-valine", "SID Valine", "SID Val"],
    ["sid-isoleucine", "SID Isoleucine", "SID Ile"],
    ["sid-leucine", "SID Leucine", "SID Leu"],
    ["sid-histidine", "SID Histidine", "SID His"],
    ["sid-phenylalanine-tyrosine", "SID Phenylalanine + Tyrosine", "SID Phe+Tyr"],
  ].map(([id, name, shortName]) => ({
    id,
    name,
    shortName,
    group: "Amino acids" as const,
    units: ["%", "% of SID Lys"],
    description: `${name} concentration on a standardized ileal digestible basis.`,
    formulationRole: "Direct dietary concentration with an ideal-protein ratio to SID lysine.",
  })),
  {
    id: "calcium",
    name: "Calcium",
    shortName: "Ca",
    group: "Macro minerals",
    units: ["%"],
    description: "Dietary calcium concentration.",
    formulationRole: "Published phase requirement for bone mineralization and performance.",
  },
  {
    id: "total-phosphorus",
    name: "Total Phosphorus",
    shortName: "P",
    group: "Macro minerals",
    units: ["%"],
    description: "Total phosphorus present in an ingredient or diet before digestibility adjustment.",
    formulationRole: "Ingredient-analysis value; Chapter 5 requirements use digestible and available phosphorus.",
  },
  {
    id: "sttd-phosphorus",
    name: "Standardized Digestible Phosphorus",
    shortName: "Dig. P",
    group: "Macro minerals",
    units: ["%"],
    description: "Standardized digestible phosphorus concentration.",
    formulationRole: "Primary digestible-phosphorus requirement published in the Brazilian Tables.",
  },
  {
    id: "available-phosphorus",
    name: "Available Phosphorus",
    shortName: "Avail. P",
    group: "Macro minerals",
    units: ["%"],
    description: "Estimate of phosphorus biologically available to the pig.",
    formulationRole: "Published alongside standardized digestible phosphorus.",
  },
  {
    id: "potassium",
    name: "Potassium",
    shortName: "K",
    group: "Macro minerals",
    units: ["%"],
    description: "Dietary potassium concentration.",
    formulationRole: "Published electrolyte requirement for each growing-pig phase.",
  },
  {
    id: "sodium",
    name: "Sodium",
    shortName: "Na",
    group: "Macro minerals",
    units: ["%"],
    description: "Dietary sodium concentration.",
    formulationRole: "Published electrolyte requirement commonly supplied with salt and ingredient sodium.",
  },
  {
    id: "chloride",
    name: "Chlorine",
    shortName: "Cl",
    group: "Macro minerals",
    units: ["%"],
    description: "Dietary chlorine concentration.",
    formulationRole: "Published electrolyte requirement in the Brazilian Tables.",
  },
  {
    id: "linoleic-acid",
    name: "Linoleic Acid",
    shortName: "C18:2",
    group: "Fatty acids",
    units: ["%"],
    description: "Dietary linoleic-acid concentration.",
    formulationRole: "Published phase requirement in the Brazilian growing-swine tables.",
  },
  ...[
    ["zinc", "Zinc", "Zn"],
    ["iron", "Iron", "Fe"],
    ["manganese", "Manganese", "Mn"],
    ["copper", "Copper", "Cu"],
    ["iodine", "Iodine", "I"],
    ["selenium", "Selenium", "Se"],
  ].map(([id, name, shortName]) => ({
    id,
    name,
    shortName,
    group: "Trace minerals" as const,
    units: ["ppm"],
    description: `${name} trace-mineral concentration.`,
    formulationRole:
      "Ingredient composition can be tracked here; Chapter 7 supplementation guidance is kept separate from Chapter 5 animal requirements.",
  })),
  ...[
    ["vitamin-a", "Vitamin A", "Vit A", "IU/kg"],
    ["vitamin-d", "Vitamin D", "Vit D", "IU/kg"],
    ["vitamin-e", "Vitamin E", "Vit E", "IU/kg"],
    ["vitamin-k", "Vitamin K", "Vit K", "mg/kg"],
    ["vitamin-b1", "Vitamin B1", "B1", "mg/kg"],
    ["riboflavin", "Riboflavin", "B2", "mg/kg"],
    ["vitamin-b6", "Vitamin B6", "B6", "mg/kg"],
    ["vitamin-b12", "Vitamin B12", "B12", "mcg/kg"],
    ["pantothenic-acid", "Pantothenic Acid", "B5", "mg/kg"],
    ["niacin", "Niacin", "Niacin", "mg/kg"],
    ["folic-acid", "Folic Acid", "B9", "mg/kg"],
    ["biotin", "Biotin", "Biotin", "mg/kg"],
    ["choline", "Total Choline", "Choline", "mg/kg"],
  ].map(([id, name, shortName, unit]) => ({
    id,
    name,
    shortName,
    group: "Vitamins" as const,
    units: [unit],
    description: `${name} dietary concentration.`,
    formulationRole:
      "Ingredient composition can be tracked here; supplementation guidance is not treated as a Chapter 5 animal requirement.",
  })),
];

export function feedNutrientById(id: string): FeedNutrient | undefined {
  return FEED_NUTRIENTS.find((nutrient) => nutrient.id === id);
}

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

function ingredientValueForNutrient(
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

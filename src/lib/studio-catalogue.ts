import "server-only";

import {
  INGREDIENT_LIBRARY,
  POULTRY_INGREDIENT_LIBRARY,
  sidAminoAcidPct,
  type IngredientNutrientRecord,
  type IngredientSourceRecord,
} from "@/lib/ingredient-nutrients";
import { getIngredientPrices } from "@/lib/ingredient-prices";
import { COMMERCIAL_PREMIXES } from "@/lib/commercial-premixes";

// The ingredient catalogue shown in the formulation studio (/studio/catalogue):
// Brazilian Tables 2024 composition from the checked-in library, priced with
// the same planning prices the formulator uses. Kept small and serializable so
// the server can hand it to the client studio.

export type CatalogueNutrientId = "mePig" | "mePoultry" | "cp" | "lys" | "mc" | "thr" | "ca" | "ap" | "na" | "cf";

export interface CatalogueIngredient {
  id: string;
  name: string;
  aliases: string[];
  category: string;
  price: { usdPerTonne: number; market: string; asOf: string; sourceLabel: string } | null;
  /** As-fed values; null where the library publishes none. */
  nutrients: Record<CatalogueNutrientId, number | null>;
  /** Nutrients this kind of ingredient should have; a gap here is real missing data. */
  expected: CatalogueNutrientId[];
  limits: { stage: string; maxPct: number; practicalPct?: number }[];
  manufacturerSpecificationUrl?: string;
  verificationStatus?: "unverified";
}

const CATEGORY_LABELS: Record<IngredientSourceRecord["category"], string> = {
  cereal: "Cereal",
  protein_meal: "Protein meal",
  byproduct: "By-product",
  oil_fat: "Oil and fat",
  mineral: "Mineral",
  amino_acid: "Amino acid",
  vitamin_mineral_premix: "Premix",
  other: "Other",
};

const FEEDSTUFF: CatalogueNutrientId[] = ["mePig", "cp", "lys", "mc", "thr", "ca", "ap", "na"];

// Minerals, synthetic amino acids and premixes carry only the nutrients they
// supply, so an absent value means "none", not a gap in the data.
const EXPECTED: Record<IngredientSourceRecord["category"], CatalogueNutrientId[]> = {
  cereal: FEEDSTUFF,
  protein_meal: FEEDSTUFF,
  byproduct: FEEDSTUFF,
  other: FEEDSTUFF,
  oil_fat: ["mePig"],
  mineral: [],
  amino_acid: [],
  vitamin_mineral_premix: [],
};

const STAGES: [string, (r: IngredientNutrientRecord["recommendedInclusionPct"]) => { practical?: number; max: number } | undefined][] = [
  ["Pig starter", (r) => r?.growingPigs?.starter],
  ["Pig grower", (r) => r?.growingPigs?.grower],
  ["Pig finisher", (r) => r?.growingPigs?.finisher],
  ["Gestating sow", (r) => r?.sows?.gestation],
  ["Lactating sow", (r) => r?.sows?.lactation],
  ["Broiler starter", (r) => r?.broilers?.starter],
  ["Broiler grower", (r) => r?.broilers?.grower],
];

export async function getStudioCatalogue(): Promise<CatalogueIngredient[]> {
  const prices = new Map((await getIngredientPrices()).map((price) => [price.ingredientId, price]));
  const poultry = new Map(POULTRY_INGREDIENT_LIBRARY.ingredients.map((record) => [record.id, record]));

  return [
    ...INGREDIENT_LIBRARY.ingredients.map((pig) => {
    const bird = poultry.get(pig.id);
    const price = prices.get(pig.id);
    const limits = STAGES.flatMap(([stage, pick]) => {
      const rec = pick(stage.startsWith("Broiler") ? bird?.recommendedInclusionPct : pig.recommendedInclusionPct);
      return rec ? [{ stage, maxPct: rec.max, ...(rec.practical !== undefined ? { practicalPct: rec.practical } : {}) }] : [];
    });
    return {
      id: pig.id,
      name: pig.name,
      aliases: pig.aliases,
      category: CATEGORY_LABELS[pig.category],
      price: price ? { usdPerTonne: price.usdPerTonne, market: price.market, asOf: price.asOf, sourceLabel: price.sourceLabel } : null,
      nutrients: {
        mePig: pig.energy.metabolizableKcalKg ?? null,
        mePoultry: bird?.energy.metabolizableKcalKg ?? null,
        cp: pig.composition.crudeProteinPct ?? null,
        lys: sidAminoAcidPct(pig, "lysine") ?? null,
        mc: sidAminoAcidPct(pig, "methionineCysteine") ?? null,
        thr: sidAminoAcidPct(pig, "threonine") ?? null,
        ca: pig.macroMinerals.calciumPct ?? null,
        ap: pig.macroMinerals.availablePhosphorusPct ?? null,
        na: pig.macroMinerals.sodiumPct ?? null,
        cf: pig.composition.crudeFibrePct ?? null,
      },
      expected: EXPECTED[pig.category],
      limits,
    };
  }),
    ...COMMERCIAL_PREMIXES.map((premix): CatalogueIngredient => ({
      id: premix.id,
      name: `${premix.name} (UNVERIFIED)`,
      aliases: [premix.sku, premix.manufacturer],
      category: "Premix",
      price: null, // supplier quotation required; never invent a USD price
      nutrients: {
        mePig: null, mePoultry: null, cp: null, lys: null, mc: null,
        thr: null, ca: null, ap: null, na: null, cf: null,
      },
      expected: [], // no verified analytical matrix
      limits: [{ stage: premix.application, maxPct: premix.inclusionPct }],
      manufacturerSpecificationUrl: premix.specificationUrl,
      verificationStatus: "unverified",
    })),
  ];
}

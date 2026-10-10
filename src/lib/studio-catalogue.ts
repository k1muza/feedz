import "server-only";

import {
  INGREDIENT_LIBRARY,
  POULTRY_INGREDIENT_LIBRARY,
  ingredientLibraryWithCommercialPremixes,
  ingredientProfileAttribution,
  nutrientValueSource,
  sidAminoAcidPct,
  type IngredientNutrientRecord,
  type IngredientSourceRecord,
} from "@/lib/ingredient-nutrients";
import { getIngredientPrices } from "@/lib/ingredient-prices";
import { ingredientDefaultPlanningPricePerTonne } from "@/lib/feed-ingredient-prices";
import { COMMERCIAL_PREMIXES, premixFinishedFeedContributions } from "@/lib/commercial-premixes";
import { analyzeDiet } from "@/lib/diet-formula";
import { FEED_PROGRAMMES } from "@/lib/feed-programmes";
import type { IngredientLibrary } from "@/lib/ingredient-nutrients";
import { studioNutrientConstraints } from "@/lib/studio-programmes";

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
  verificationStatus?: "unverified" | "verified";
  premix?: {
    manufacturer: string;
    sku: string;
    application: string;
    permittedSpecies: string;
    permittedProgrammePrefixes: readonly string[];
    inclusionPct: number;
    inclusionKgPerTonne: number;
    inclusionInstructions: string;
    contributions: ReturnType<typeof premixFinishedFeedContributions>;
  };
  /** Provenance belongs to the ingredient's actual nutrition profile, not price. */
  nutritionSource: {
    publisher: string;
    title: string;
    year: number | null;
    url: string | null;
    basis: string;
    sourceTable: string | null;
    sourcePage: number | null;
    verificationStatus: "published_reference" | "manufacturer_unverified" | "manufacturer_verified" | "user_supplied_unverified";
    notes: string[];
  };
  /**
   * The ingredient's value for each nutrient requirement the optimiser
   * enforces, per species, computed exactly as the optimiser does (the
   * ingredient analysed as a 100% diet). Zeros are omitted.
   */
  requirementValues: Partial<Record<"swine" | "broiler", Record<string, number>>>;
  /** Requirements the optimiser can't evaluate for this ingredient: missing data. */
  requirementMissing: Partial<Record<"swine" | "broiler", string[]>>;
  /** Specific references override profile-level source for individual values. */
  nutrientSources: Partial<Record<CatalogueNutrientId, {publisher: string; title: string; url: string}>>;
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

/** Every nutrient constraint any loaded phase of the species enforces, once each. */
function speciesConstraints(species: "swine" | "broiler") {
  const specs = new Map<string, ReturnType<typeof studioNutrientConstraints>[number]>();
  for (const programme of FEED_PROGRAMMES.filter((item) => item.status === "loaded")) {
    for (const phase of programme.phases) {
      if ((phase.species === "broiler") !== (species === "broiler")) continue;
      for (const spec of studioNutrientConstraints(phase)) if (!specs.has(spec.id)) specs.set(spec.id, spec);
    }
  }
  return [...specs.values()];
}

/** Same coefficients as the optimiser's prepareIngredients. */
function requirementProfile(id: string, library: IngredientLibrary, specs: ReturnType<typeof speciesConstraints>) {
  if (!library.ingredients.some((ingredient) => ingredient.id === id)) return null;
  let single: ReturnType<typeof analyzeDiet>;
  try {
    single = analyzeDiet({ ingredients: [{ ingredientId: id, inclusionPct: 100 }] }, [], library);
  } catch {
    return null;
  }
  const values: Record<string, number> = {};
  const missing: string[] = [];
  for (const spec of specs) {
    const measure = spec.measure(single);
    if (!measure.complete) missing.push(spec.id);
    else if (Math.abs(measure.value) > 1e-9) values[spec.id] = +measure.value.toPrecision(6);
  }
  return { values, missing };
}

export async function getStudioCatalogue(): Promise<CatalogueIngredient[]> {
  const priceList = await getIngredientPrices();
  const prices = new Map(priceList.map((price) => [price.ingredientId, price]));
  const pigProducts = COMMERCIAL_PREMIXES.filter((product) => product.species === "pig");
  const birdProducts = COMMERCIAL_PREMIXES.filter((product) => product.species !== "pig");
  const swine = ingredientLibraryWithCommercialPremixes(pigProducts, INGREDIENT_LIBRARY);
  const poultryRecords = ingredientLibraryWithCommercialPremixes(birdProducts, POULTRY_INGREDIENT_LIBRARY);
  const poultry = new Map(poultryRecords.ingredients.map((record) => [record.id, record]));
  const swineIds = new Set(swine.ingredients.map((item) => item.id));
  const allRecords = [
    ...swine.ingredients,
    ...poultryRecords.ingredients.filter((record) => !swineIds.has(record.id)),
  ];

  const PATHS: Record<CatalogueNutrientId, string> = {
    mePig: "energy.metabolizableKcalKg",
    mePoultry: "energy.metabolizableKcalKg",
    cp: "composition.crudeProteinPct",
    lys: "aminoAcids.sidPct.lysine",
    mc: "aminoAcids.sidPct.methionineCysteine",
    thr: "aminoAcids.sidPct.threonine",
    ca: "macroMinerals.calciumPct",
    ap: "macroMinerals.availablePhosphorusPct",
    na: "macroMinerals.sodiumPct",
    cf: "composition.crudeFibrePct",
  };
  const swineSpecs = speciesConstraints("swine");
  const broilerSpecs = speciesConstraints("broiler");
  return allRecords.map((ingredient): CatalogueIngredient => {
    const swineProfile = requirementProfile(ingredient.id, swine, swineSpecs);
    const broilerProfile = requirementProfile(ingredient.id, poultryRecords, broilerSpecs);
    const bird = poultry.get(ingredient.id);
    const pig = swine.ingredients.find((record) => record.id === ingredient.id);
    const profile = pig ?? bird ?? ingredient;
    const attribution = ingredientProfileAttribution(profile);
    const product = COMMERCIAL_PREMIXES.find((item) => item.id === ingredient.id);
    const price = prices.get(ingredient.id);
    const planningPricePerTonne = price
      ? ingredientDefaultPlanningPricePerTonne(ingredient.id, priceList)
      : undefined;
    const limits = product
      ? [{ stage: product.application, maxPct: product.inclusionPct }]
      : STAGES.flatMap(([stage, pick]) => {
        const rec = pick(stage.startsWith("Broiler") ? bird?.recommendedInclusionPct : pig?.recommendedInclusionPct);
        return rec ? [{ stage, maxPct: rec.max, ...(rec.practical !== undefined ? { practicalPct: rec.practical } : {}) }] : [];
      });
    const nutrients: Record<CatalogueNutrientId, number | null> = {
      mePig: pig?.energy.metabolizableKcalKg ?? null,
      mePoultry: bird?.energy.metabolizableKcalKg ?? null,
      cp: profile.composition.crudeProteinPct ?? null,
      lys: sidAminoAcidPct(profile, "lysine") ?? null,
      mc: sidAminoAcidPct(profile, "methionineCysteine") ?? null,
      thr: sidAminoAcidPct(profile, "threonine") ?? null,
      ca: profile.macroMinerals.calciumPct ?? null,
      ap: profile.macroMinerals.availablePhosphorusPct ?? null,
      na: profile.macroMinerals.sodiumPct ?? null,
      cf: profile.composition.crudeFibrePct ?? null,
    };
    const nutrientSources: CatalogueIngredient["nutrientSources"] = {};
    for (const [id, path] of Object.entries(PATHS) as [CatalogueNutrientId, string][]) {
      if (nutrients[id] === null) continue;
      const record = id === "mePoultry" ? bird : id === "mePig" ? pig : profile;
      if (!record) continue;
      const source = nutrientValueSource(record, path);
      if (source) nutrientSources[id] = {
        publisher: source.publisher,
        title: source.title,
        url: source.url,
      };
    }
    return {
      id: ingredient.id,
      name: product?.name ?? ingredient.name,
      aliases: product ? [product.sku, product.manufacturer] : ingredient.aliases,
      category: product ? "Premix" : CATEGORY_LABELS[ingredient.category],
      price: price && planningPricePerTonne !== undefined ? {
        usdPerTonne: planningPricePerTonne, market: price.market,
        asOf: price.asOf, sourceLabel: price.sourceLabel,
      } : null,
      nutrients,
      expected: product ? [] : EXPECTED[ingredient.category],
      limits,
      ...(product ? { manufacturerSpecificationUrl: product.specificationUrl,
        verificationStatus: product.verificationStatus,
        premix: {
          manufacturer: product.manufacturer,
          sku: product.sku,
          application: product.application,
          permittedSpecies: product.species,
          permittedProgrammePrefixes: product.eligibleProgrammePrefixes,
          inclusionPct: product.inclusionPct,
          inclusionKgPerTonne: product.inclusionKgPerTonne,
          inclusionInstructions: product.inclusionInstructions,
          contributions: premixFinishedFeedContributions(product),
        } } : {}),
      nutritionSource: {
        publisher: attribution.source?.publisher ?? "User",
        title: attribution.source?.title ?? "User-provided; no published reference supplied",
        year: attribution.source?.year ?? null,
        url: attribution.source?.url ?? null,
        basis: attribution.source?.basis ?? "as-fed",
        sourceTable: attribution.sourceTable,
        sourcePage: attribution.sourcePage,
        verificationStatus: attribution.verificationStatus,
        notes: attribution.notes,
      },
      nutrientSources,
      requirementValues: {
        ...(swineProfile ? { swine: swineProfile.values } : {}),
        ...(broilerProfile ? { broiler: broilerProfile.values } : {}),
      },
      requirementMissing: {
        ...(swineProfile?.missing.length ? { swine: swineProfile.missing } : {}),
        ...(broilerProfile?.missing.length ? { broiler: broilerProfile.missing } : {}),
      },
    };
  });

}

/**
 * Supplier-published products, not FeedSport-designed "ideal" premixes.
 * An online product page is NOT a batch COA, price quotation, or confirmation
 * that its manufacturer's recommended basal ration may be reformulated.
 *
 * These entries are intentionally UNVERIFIED and are not nutrient matrices.
 * In particular, never fabricate concentrations from programme requirements.
 */
export type CommercialPremix = {
  id: string;
  manufacturer: "Chengdu Sustar Feed";
  sku: string;
  name: string;
  species: "pig" | "broiler" | "layer";
  application: string;
  inclusionPct: number;
  inclusionKgPerTonne: number;
  verificationStatus: "unverified";
  formulationCompatibility: "unconfirmed";
  pricePerTonne: null;
  specificationUrl: string;
  publishedAnalysis: {
    zincMgKg: { min: number; max: number };
    copperMgKg: { min: number; max: number };
    vitaminAIuKg: { min: number; max: number };
  };
  note?: string;
};

export const COMMERCIAL_PREMIXES: readonly CommercialPremix[] = [
  {
    id: "sustar-glypro-x911",
    manufacturer: "Chengdu Sustar Feed", sku: "GlyPro X911",
    name: "Sustar GlyPro X911 — Piglet vitamin-mineral premix",
    species: "pig", application: "Piglets, approximately 5–25 kg",
    inclusionPct: 0.2, inclusionKgPerTonne: 2,
    verificationStatus: "unverified", formulationCompatibility: "unconfirmed",
    pricePerTonne: null,
    specificationUrl: "https://www.sustarfeed.com/glypro-x911-0-2-vitamin%EF%BC%86mineral-premix-for-piglets-oemodm-custom-pig-premix-manufacturer-direct-supply-premix-for-piglets-promoting-growth-of-pig-prestarter-animal-feed-additives-product/",
    publishedAnalysis: {
      zincMgKg: { min: 30000, max: 50000 },
      copperMgKg: { min: 40000, max: 70000 },
      vitaminAIuKg: { min: 28000000, max: 34000000 },
    },
  },
  {
    id: "sustar-glypro-x912",
    manufacturer: "Chengdu Sustar Feed", sku: "GlyPro X912",
    name: "Sustar GlyPro X912 — Grower-finisher pig premix",
    species: "pig", application: "Growing and finishing pigs over 25 kg",
    inclusionPct: 0.2, inclusionKgPerTonne: 2,
    verificationStatus: "unverified", formulationCompatibility: "unconfirmed",
    pricePerTonne: null,
    specificationUrl: "https://www.sustarfeed.com/vitamin-mineral-premix-for-finishing-pig-sustar-glypro-x912-0-2-product/",
    publishedAnalysis: {
      zincMgKg: { min: 40000, max: 70000 },
      copperMgKg: { min: 13000, max: 17000 },
      vitaminAIuKg: { min: 28000000, max: 34000000 },
    },
    note: "Product page identifies X912 but the nutrient table heading says X911; supplier confirmation required.",
  },
  {
    id: "sustar-glypro-x913",
    manufacturer: "Chengdu Sustar Feed", sku: "GlyPro X913",
    name: "Sustar GlyPro X913 — Sow vitamin-mineral premix",
    species: "pig", application: "Breeding, gestating and lactating sows",
    inclusionPct: 0.2, inclusionKgPerTonne: 2,
    verificationStatus: "unverified", formulationCompatibility: "unconfirmed",
    pricePerTonne: null,
    specificationUrl: "https://www.sustarfeed.com/vitamin-mineral-premix-for-sows-sustar-glypro-x913-0-2-product/",
    publishedAnalysis: {
      zincMgKg: { min: 60000, max: 100000 },
      copperMgKg: { min: 7000, max: 8000 },
      vitaminAIuKg: { min: 33000000, max: 36000000 },
    },
  },
  {
    id: "sustar-glypro-x812",
    manufacturer: "Chengdu Sustar Feed", sku: "GlyPro X812",
    name: "Sustar GlyPro X812 — Broiler vitamin-mineral premix",
    species: "broiler", application: "Broiler chickens",
    inclusionPct: 0.1, inclusionKgPerTonne: 1,
    verificationStatus: "unverified", formulationCompatibility: "unconfirmed",
    pricePerTonne: null,
    specificationUrl: "https://www.sustarfeed.com/vitamin-mineral-premix-for-broiler-sustar-glypro-0-1-product/",
    publishedAnalysis: {
      zincMgKg: { min: 75000, max: 100000 },
      copperMgKg: { min: 8000, max: 11000 },
      vitaminAIuKg: { min: 30000000, max: 35000000 },
    },
  },
  {
    id: "sustar-glypro-x811",
    manufacturer: "Chengdu Sustar Feed", sku: "GlyPro X811",
    name: "Sustar GlyPro X811 — Layer vitamin-mineral premix",
    species: "layer", application: "Laying hens",
    inclusionPct: 0.1, inclusionKgPerTonne: 1,
    verificationStatus: "unverified", formulationCompatibility: "unconfirmed",
    pricePerTonne: null,
    specificationUrl: "https://www.sustarfeed.com/glypro-x811-0-1-vitamin%EF%BC%86mineral-premix-for-layer-premix-for-layer-animal-feed-additives-poultry-feed-additives-premix-for-laying-hens-vitamin-mineral-premix-feed-additives-product/",
    publishedAnalysis: {
      zincMgKg: { min: 60000, max: 85000 },
      copperMgKg: { min: 6800, max: 8000 },
      vitaminAIuKg: { min: 39000000, max: 42000000 },
    },
  },
];

export function commercialPremixById(id: string): CommercialPremix | undefined {
  return COMMERCIAL_PREMIXES.find((premix) => premix.id === id);
}

/**
 * Map only recognized programme families. Never infer premix compatibility from
 * incidental substrings (especially "boar" versus sow/breeding products).
 * These mappings remain UNVERIFIED manufacturer compatibility assumptions.
 */
export function commercialPremixForProgramme(programmeId: string): CommercialPremix | undefined {
  const programme = programmeId.split(":")[0].toLowerCase();
  const sku =
    programme.startsWith("nursery-pig") ? "X911" :
    programme.startsWith("grow-finish-pig") ||
    programme.startsWith("growing-barrows") ||
    programme.startsWith("growing-entire-immunocastrated-males") ||
    programme.startsWith("developing-gilt") ? "X912" :
    programme.startsWith("gestating-gilt-sow") ||
    programme.startsWith("lactating-gilt-sow") ? "X913" :
    programme.startsWith("broiler-") ? "X812" :
    programme.startsWith("layer-") ? "X811" :
    undefined;

  // No confirmed combined vitamin-mineral product in this catalogue for mature
  // boars. X913 is sow-only; X303 is a vitamin-only breeding-pig product.
  if (!sku) return undefined;
  return COMMERCIAL_PREMIXES.find((p) => p.sku === `GlyPro ${sku}`);
}

export function commercialPremixCompatibleWithProgramme(premix: CommercialPremix, programmeId: string): boolean {
  return commercialPremixForProgramme(programmeId)?.id === premix.id;
}

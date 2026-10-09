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
  manufacturer: "Chengdu Sustar Feed" | "CJ (Tianjin) Feed";
  sku: string;
  name: string;
  species: "pig" | "broiler" | "layer";
  application: string;
  /** Prefixes for which the supplier/product policy permits this product. */
  eligibleProgrammePrefixes: readonly string[];
  /** One default supplier product per animal family; users may replace it. */
  defaultForEligibleProgrammes?: boolean;
  inclusionPct: number;
  inclusionKgPerTonne: number;
  verificationStatus: "unverified";
  formulationCompatibility: "unconfirmed" | "manufacturer_recipe_only";
  /** Source-provided percentages. Never derive a commercial formula in the app. */
  manufacturerRecipe?: readonly { ingredientId: string; percent: number }[];
  /** Manufacturer-listed per-kg-of-premix ranges/minima, not verified nutrient matrix entries. */
  publishedGuarantees?: readonly { nutrient: string; unit: "IU/kg" | "mg/kg" | "%"; min?: number; max?: number }[];
  /**
   * Exact source-verified as-fed concentrations, NOT minimum guarantees.
   * Populate SID only when the manufacturer supplies a digestible value or
   * source-validated digestibility. Never derive SID from total lysine minima.
   */
  verifiedAsFedAminoAcids?: {
    reference: string;
    /** Required citation for every asserted exact nutrient concentration. */
    sourceUrl: string;
    totalPct?: Record<string, number>;
    sidPct?: Record<string, number>;
  };
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
    id: "cj-s174-boar-premix",
    manufacturer: "CJ (Tianjin) Feed", sku: "S174",
    name: "CJ Feed S174 — Breeding boar premix",
    species: "pig", application: "Mature breeding boars",
    defaultForEligibleProgrammes: true,
    eligibleProgrammePrefixes: ["mature-boar"],
    inclusionPct: 4, inclusionKgPerTonne: 40,
    verificationStatus: "unverified", formulationCompatibility: "manufacturer_recipe_only",
    pricePerTonne: null,
    specificationUrl: "https://www.cjfeedcn.com/swine-feed/boar-premix-feed.html",
    // These are the manufacturer's published ranges, NOT verified input
    // concentrations and are never used as a manufactured nutrient matrix.
    publishedAnalysis: {
      zincMgKg: { min: 350, max: 1800 },
      copperMgKg: { min: 50, max: 625 },
      vitaminAIuKg: { min: 32500, max: 300000 },
    },
    publishedGuarantees: [
      { nutrient: "Vitamin A", unit: "IU/kg", min: 32500, max: 300000 },
      { nutrient: "Vitamin D3", unit: "IU/kg", min: 3750, max: 125000 },
      { nutrient: "Vitamin E", unit: "IU/kg", min: 800 },
      { nutrient: "Vitamin B2", unit: "mg/kg", min: 85 },
      { nutrient: "Copper", unit: "mg/kg", min: 50, max: 625 },
      { nutrient: "Iron", unit: "mg/kg", min: 100, max: 5000 },
      { nutrient: "Zinc", unit: "mg/kg", min: 350, max: 1800 },
      { nutrient: "Manganese", unit: "mg/kg", min: 50, max: 3750 },
      { nutrient: "Selenium", unit: "mg/kg", min: 5, max: 12 },
      { nutrient: "Iodine", unit: "mg/kg", min: 3, max: 250 },
      { nutrient: "Phosphorus", unit: "%", min: 2 },
      { nutrient: "Lysine", unit: "%", min: 4 },
      { nutrient: "Sodium chloride", unit: "%", min: 5, max: 15 },
      { nutrient: "Moisture", unit: "%", max: 10 },
    ],
    manufacturerRecipe: [
      { ingredientId: "corn-yellow-dent", percent: 64.3 },
      { ingredientId: "wheat-bran", percent: 12 },
      { ingredientId: "soybean-meal-solvent-extracted", percent: 15.7 },
      { ingredientId: "fish-meal-54", percent: 4 },
      { ingredientId: "cj-s174-boar-premix", percent: 4 },
    ],
    note: "Manufacturer lists premix model S174 but calls the 4% component ST174A in its recommended ration. Confirm the labels, exact nutrient guarantees and prices with CJ. Supplier directs users to its fixed formula or technical department for customised ratios.",
  },
  {
    id: "sustar-glypro-x911",
    manufacturer: "Chengdu Sustar Feed", sku: "GlyPro X911",
    name: "Sustar GlyPro X911 — Piglet vitamin-mineral premix",
    species: "pig", application: "Piglets, approximately 5–25 kg",
    defaultForEligibleProgrammes: true,
    eligibleProgrammePrefixes: ["nursery-pig"],
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
    defaultForEligibleProgrammes: true,
    eligibleProgrammePrefixes: ["grow-finish-pig", "growing-barrows", "growing-entire-immunocastrated-males", "developing-gilt"],
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
    defaultForEligibleProgrammes: true,
    eligibleProgrammePrefixes: ["gestating-gilt-sow", "lactating-gilt-sow"],
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
    defaultForEligibleProgrammes: true,
    eligibleProgrammePrefixes: ["broiler-"],
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
    defaultForEligibleProgrammes: true,
    eligibleProgrammePrefixes: ["layer-"],
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
  const eligible = eligibleCommercialPremixes(programmeId);
  return eligible.find((product) => product.defaultForEligibleProgrammes) ?? eligible[0];
}

export function commercialPremixCompatibleWithProgramme(premix: CommercialPremix, programmeId: string): boolean {
  const family = programmeId.split(":")[0].toLowerCase();
  return premix.eligibleProgrammePrefixes.some((prefix) => family.startsWith(prefix));
}

export function eligibleCommercialPremixes(programmeId: string): CommercialPremix[] {
  return COMMERCIAL_PREMIXES.filter((product) => commercialPremixCompatibleWithProgramme(product, programmeId));
}

/**
 * Check a source-restricted manufacturer's fixed mixing recipe, without
 * computing nutrition or changing any manufacturer-provided proportion.
 * Throw if the request introduces ingredients or allows different ratios.
 */
export function assertManufacturerRecipe(
  premix: CommercialPremix,
  ingredients: readonly { ingredientId: string; minInclusionPct?: number; maxInclusionPct?: number }[],
): void {
  if (premix.formulationCompatibility !== "manufacturer_recipe_only") return;
  const recommended = premix.manufacturerRecipe;
  if (!recommended) throw new Error(`Missing manufacturer recipe for ${premix.sku}.`);
  const actual = new Map(ingredients.map((row) => [row.ingredientId, row]));
  const matches =
    actual.size === recommended.length &&
    ingredients.length === recommended.length &&
    recommended.every(({ ingredientId, percent }) => {
      const row = actual.get(ingredientId);
      return row !== undefined &&
        row.minInclusionPct !== undefined &&
        row.maxInclusionPct !== undefined &&
        Math.abs(row.minInclusionPct - percent) < 0.000001 &&
        Math.abs(row.maxInclusionPct - percent) < 0.000001;
    });
  if (!matches) {
    throw new Error(`${premix.name} is restricted to CJ's published recipe. Lock every ingredient to the manufacturer percentages (including the 4% premix), or obtain a customised formula from CJ before changing ingredient ratios. See ${premix.specificationUrl}`);
  }
}

/** Present on all formulation responses, even when no commercial premix is used. */
export type CommercialPremixAnalysis =
  | {
      status: "unverified";
      reason: "manufacturer_nutrient_analysis_incomplete";
      product_id: string;
      message: string;
    }
  | {
      status: "not_included";
      reason: "no_commercial_premix";
      product_id: null;
      message: string;
    };

export function premixAnalysisForIds(ids: readonly string[]): CommercialPremixAnalysis {
  const selected = ids.map(commercialPremixById).find((item) => item !== undefined);
  if (!selected) return {
    status: "not_included",
    reason: "no_commercial_premix",
    product_id: null,
    message: "No commercial premix was included; complete-feed micronutrient coverage is not verified.",
  };
  return {
    status: "unverified",
    reason: "manufacturer_nutrient_analysis_incomplete",
    product_id: selected.id,
    message: `${selected.name}: manufacturer micronutrient analysis and feed compatibility remain unverified. This is a supplier specification gap, not missing programme guidance.`,
  };
}

/**
 * Supplier label guarantees are NOT interchangeable with SID formulation
 * concentrations. Example: CJ S174 publishes lysine >= 4% on the premix
 * label, but no ileal digestibility; counting it as 4% SID lysine would
 * overstate the guaranteed digestible contribution.
 */
export function publishedPremixAminoAcids(premix: CommercialPremix): Array<{
  name: string;
  basis: "total";
  unit: "%";
  minimumPct: number | null;
  maximumPct: number | null;
  usableAsSid: false;
}> {
  const aminoPattern = /\b(lysine|methionine|threonine|tryptophan|valine|isoleucine|leucine|arginine)\b/i;
  return (premix.publishedGuarantees ?? [])
    .filter((claim) => claim.unit === "%" && aminoPattern.test(claim.nutrient))
    .map((claim) => ({
      name: claim.nutrient,
      basis: "total" as const,
      unit: "%" as const,
      minimumPct: claim.min ?? null,
      maximumPct: claim.max ?? null,
      usableAsSid: false as const,
    }));
}

/** Conditional, supplier-label MINIMUM contribution to total (never SID) AA.
 * Assumes the labelled SKU matches the product actually supplied, an
 * outstanding verification issue for CJ S174 versus ST174A.
 */
export function publishedMinimumTotalAminoAcidsInFeed(premix: CommercialPremix): Array<{
  name: string;
  minTotalFeedPct: number;
  usableAsSid: false;
}> {
  return publishedPremixAminoAcids(premix)
    .filter((claim) => claim.minimumPct !== null)
    .map((claim) => ({
      name: claim.name,
      minTotalFeedPct: Math.round((claim.minimumPct! * premix.inclusionPct / 100) * 10000) / 10000,
      usableAsSid: false as const,
    }));
}

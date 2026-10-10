import { PREMIX_RECORDS } from "./ingredient-nutrients";
import type { Vitamins } from "./nutrition";

/**
 * Supplier-published products, not FeedSport-designed "ideal" premixes.
 * An online product page is NOT a batch COA, price quotation, or confirmation
 * that its manufacturer's recommended basal ration may be reformulated.
 *
 * Label minima are credited as conservative nutrient contributions; they are
 * not exact analytical matrices or batch COAs.
 * Never fabricate concentrations from programme requirements.
 */
export type PremixMicronutrientProfile = {
  sourceUrl: string;
  vitamins: Partial<Vitamins>;
  traceMineralsPpm: Partial<Record<"zinc" | "iron" | "manganese" | "copper" | "iodine" | "selenium", number>>;
};

export type CommercialPremix = {
  id: string;
  manufacturer: "AECI Animal Health" | "Chengdu Sustar Feed" | "CJ (Tianjin) Feed";
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
  /** The label instruction is part of the ingredient definition, not a UI default. */
  inclusionInstructions: string;
  verificationStatus: "unverified" | "verified";
  formulationCompatibility: "unconfirmed" | "manufacturer_recipe_only";
  /** Source-provided percentages. Never derive a commercial formula in the app. */
  manufacturerRecipe?: readonly { ingredientId: string; percent: number }[];
  /** Manufacturer-listed per-kg-of-premix ranges/minima, not batch-verified nutrient matrix entries. */
  publishedGuarantees?: readonly { nutrient: string; unit: "IU/kg" | "mg/kg" | "g/kg" | "%"; min?: number; max?: number }[];
  /**
   * Conservative, as-fed label minima in the engine's canonical units. These
   * values let FeedSport calculate the premix's contribution to the finished
   * ration and count towards vitamin and trace-mineral targets.
   */
  guaranteedMinimumAsFed?: PremixMicronutrientProfile;
  /** Approved exact analysis/COA values; preferred over label minima when present. */
  verifiedAsFedMicronutrients?: PremixMicronutrientProfile & { reference: string };
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
  /** Confirmed supplier quotation. Alibaba-derived planning defaults live in feed-ingredient-prices. */
  pricePerTonne: null;
  specificationUrl: string;
  publishedAnalysis?: {
    zincMgKg: { min: number; max?: number };
    copperMgKg: { min: number; max?: number };
    vitaminAIuKg: { min: number; max?: number };
  };
  note?: string;
  /** Uninterpreted, unheaded label columns. Never used as formulation nutrients. */
  labelTranscription?: {
    source: string;
    batch: string;
    inclusionPrinted: string;
    firstColumnHeading: string;
    secondColumnHeading: string;
    basis: string;
    rows: readonly {
      category: "vitamins" | "minerals" | "additives";
      label: string;
      column1Raw: string | null;
      column2Raw: string | null;
      uncertain?: boolean;
    }[];
    cautions: readonly string[];
  };
  /** Data caveats recorded with the values, e.g. why a published figure isn't credited. */
  notes?: readonly string[];
};

/**
 * Supplier products live in the ingredient library JSON as premix
 * ingredients; this is the typed view of them, in file order.
 */
export const COMMERCIAL_PREMIXES: readonly CommercialPremix[] = PREMIX_RECORDS.map(({ id, name, premix }) => ({ id, name, ...premix }));

export function commercialPremixById(id: string): CommercialPremix | undefined {
  return COMMERCIAL_PREMIXES.find((premix) => premix.id === id);
}

/**
 * Map only recognized programme families. Never infer premix compatibility from
 * incidental substrings (especially "boar" versus sow/breeding products).
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
      status: "included";
      reason: "commercial_premix_selected";
      product_id: string;
      message: string;
      manufacturer: string;
      sku: string;
      permitted_species: CommercialPremix["species"];
      permitted_programme_prefixes: readonly string[];
      application: string;
      inclusion_pct: number;
      inclusion_kg_per_tonne: number;
      inclusion_instructions: string;
      nutrient_profile: {
        status: "manufacturer_unverified" | "manufacturer_verified";
        basis: "as-fed";
        source_url: string;
        contributions: PremixFinishedFeedContribution[];
      } | null;
    }
  | {
      status: "not_included";
      reason: "no_commercial_premix";
      product_id: null;
      message: string;
    };

export type PremixFinishedFeedContribution = {
  nutrient: string;
  group: "vitamin" | "trace_mineral";
  unit: "IU/kg" | "mg/kg" | "mcg/kg" | "ppm";
  premixConcentration: number;
  finishedFeedContribution: number;
  basis: "minimum_guarantee" | "verified_analysis";
};

const VITAMIN_META: Partial<Record<keyof Vitamins, { label: string; unit: PremixFinishedFeedContribution["unit"] }>> = {
  vitaminAIuKg: { label: "Vitamin A", unit: "IU/kg" },
  vitaminDIuKg: { label: "Vitamin D3", unit: "IU/kg" },
  vitaminEIuKg: { label: "Vitamin E", unit: "IU/kg" },
  vitaminKMgKg: { label: "Vitamin K3", unit: "mg/kg" },
  vitaminB1MgKg: { label: "Vitamin B1", unit: "mg/kg" },
  riboflavinMgKg: { label: "Vitamin B2 (riboflavin)", unit: "mg/kg" },
  vitaminB6MgKg: { label: "Vitamin B6", unit: "mg/kg" },
  vitaminB12McgKg: { label: "Vitamin B12", unit: "mcg/kg" },
  pantothenicAcidMgKg: { label: "Pantothenic acid", unit: "mg/kg" },
  niacinMgKg: { label: "Niacin", unit: "mg/kg" },
  folicAcidMgKg: { label: "Folic acid", unit: "mg/kg" },
  biotinMgKg: { label: "Biotin", unit: "mg/kg" },
  totalCholineMgKg: { label: "Total choline", unit: "mg/kg" },
};

export function premixFinishedFeedContributions(
  premix: CommercialPremix,
  inclusionPct = premix.inclusionPct,
): PremixFinishedFeedContribution[] {
  const profile = premix.verifiedAsFedMicronutrients ?? premix.guaranteedMinimumAsFed;
  if (!profile) return [];
  const basis = premix.verifiedAsFedMicronutrients ? "verified_analysis" as const : "minimum_guarantee" as const;
  const share = inclusionPct / 100;
  const vitamins = Object.entries(profile.vitamins).flatMap(([key, concentration]) => {
    const meta = VITAMIN_META[key as keyof Vitamins];
    if (!meta || concentration === undefined) return [];
    return [{
      nutrient: meta.label,
      group: "vitamin" as const,
      unit: meta.unit,
      premixConcentration: concentration,
      finishedFeedContribution: concentration * share,
      basis,
    }];
  });
  const trace = Object.entries(profile.traceMineralsPpm).flatMap(([key, concentration]) => {
    if (concentration === undefined) return [];
    return [{
      nutrient: key.charAt(0).toUpperCase() + key.slice(1),
      group: "trace_mineral" as const,
      unit: "ppm" as const,
      premixConcentration: concentration,
      finishedFeedContribution: concentration * share,
      basis,
    }];
  });
  return [...vitamins, ...trace];
}

export function premixAnalysisForIds(ids: readonly string[]): CommercialPremixAnalysis {
  const selected = ids.map(commercialPremixById).find((item) => item !== undefined);
  if (!selected) return {
    status: "not_included",
    reason: "no_commercial_premix",
    product_id: null,
    message: "No commercial premix was included.",
  };
  return {
    status: "included",
    reason: "commercial_premix_selected",
    product_id: selected.id,
    message: `${selected.name} is included at its supplier dose of ${selected.inclusionKgPerTonne} kg/t. Its label-minimum contribution is credited towards vitamin and trace-mineral targets.`,
    manufacturer: selected.manufacturer,
    sku: selected.sku,
    permitted_species: selected.species,
    permitted_programme_prefixes: selected.eligibleProgrammePrefixes,
    application: selected.application,
    inclusion_pct: selected.inclusionPct,
    inclusion_kg_per_tonne: selected.inclusionKgPerTonne,
    inclusion_instructions: selected.inclusionInstructions,
    nutrient_profile: selected.verifiedAsFedMicronutrients || selected.guaranteedMinimumAsFed ? {
      status: selected.verifiedAsFedMicronutrients && selected.verificationStatus === "verified"
        ? "manufacturer_verified"
        : "manufacturer_unverified",
      basis: "as-fed",
      source_url: (selected.verifiedAsFedMicronutrients ?? selected.guaranteedMinimumAsFed)!.sourceUrl,
      contributions: premixFinishedFeedContributions(selected),
    } : null,
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

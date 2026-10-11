import {
  PREMIX_RECORDS,
  type CommercialPremixRecord,
  type IngredientNutritionProfile,
  type IngredientSpecies,
  type NutrientValueSource,
} from "./ingredient-nutrients";
import { feedProgrammePhaseById } from "./feed-programmes";

/**
 * A supplier-published product. Its nutrient composition is an ordinary
 * ingredient nutrition profile (per kg of premix, as fed) in the canonical
 * ingredient library, so the formulation engine credits it exactly like
 * maize or soybean meal. This type adds what makes it a commercial product:
 * manufacturer, SKU, species, stage eligibility and the fixed dose.
 *
 * An online product page is NOT a batch COA, price quotation, or confirmation
 * that its manufacturer's recommended basal ration may be reformulated.
 * Never fabricate concentrations from programme requirements.
 */
export type CommercialPremix = CommercialPremixRecord & {
  id: string;
  name: string;
  /** The species whose nutrition profile carries this premix's composition. */
  nutritionSpecies: IngredientSpecies;
  composition: IngredientNutritionProfile;
  /** Product-level citation; nutrients may override it in `nutrientSources`. */
  source: NutrientValueSource | undefined;
  nutrientSources: Record<string, NutrientValueSource>;
};

/** Supplier products from the ingredient library JSON, in file order. */
export const COMMERCIAL_PREMIXES: readonly CommercialPremix[] = PREMIX_RECORDS.map(({ id, name, premix, nutrition, provenance }) => {
  const nutritionSpecies: IngredientSpecies = premix.species === "pig" ? "swine" : "poultry";
  const composition = nutrition[nutritionSpecies];
  if (!composition) throw new Error(`Premix ${id} has no ${nutritionSpecies} nutrition profile.`);
  return { id, name, ...premix, nutritionSpecies, composition, source: provenance.source, nutrientSources: provenance.nutrientSources };
});

export function commercialPremixById(id: string): CommercialPremix | undefined {
  return COMMERCIAL_PREMIXES.find((premix) => premix.id === id);
}

/**
 * Map only recognized programme families. Never infer premix compatibility from
 * incidental substrings (especially "boar" versus sow/breeding products).
 */
export function commercialPremixForProgramme(programmeId: string, phaseId?: string): CommercialPremix | undefined {
  const eligible = eligibleCommercialPremixes(programmeId, phaseId);
  return eligible.find((product) => product.defaultForEligibleProgrammes) ?? eligible[0];
}

/** Permits exploring an off-label scenario without claiming supplier approval. */
export function commercialPremixSimulationOnlyForPhase(
  premix: CommercialPremix,
  programmeId: string,
  phaseId?: string,
): boolean {
  if (!phaseId) return false;
  const phase = feedProgrammePhaseById(programmeId, phaseId);
  return !!phase && (premix.simulationOnlyPhases ?? []).some(
    (rule) => rule.programmeId === programmeId && rule.phaseClass === phase.phaseClass,
  );
}

export function commercialPremixCompatibleWithProgramme(
  premix: CommercialPremix,
  programmeId: string,
  phaseId?: string,
): boolean {
  const family = programmeId.split(":")[0].toLowerCase();
  const matchesFamily = premix.eligibleProgrammePrefixes.some((prefix) => family.startsWith(prefix));
  const matchesPhase = !premix.eligiblePhaseClasses?.length || !phaseId ||
    (() => {
      const phase = feedProgrammePhaseById(programmeId, phaseId);
      return !!phase && premix.eligiblePhaseClasses!.some((allowed) => allowed === phase.phaseClass);
    })();
  return (matchesFamily && matchesPhase) || commercialPremixSimulationOnlyForPhase(premix, programmeId, phaseId);
}

export function eligibleCommercialPremixes(programmeId: string, phaseId?: string): CommercialPremix[] {
  return COMMERCIAL_PREMIXES.filter((product) => commercialPremixCompatibleWithProgramme(product, programmeId, phaseId));
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

export type PremixNutrientGroup = "energy" | "protein" | "amino_acid" | "macro_mineral" | "trace_mineral" | "vitamin";

/** One documented premix nutrient and what it adds to a tonne of finished feed. */
export type PremixNutrientContribution = {
  /** Path in the ingredient nutrition profile, e.g. `aminoAcids.sidPct.lysine`. */
  path: string;
  nutrient: string;
  group: PremixNutrientGroup;
  unit: string;
  premixConcentration: number;
  finishedFeedContribution: number;
  /**
   * False for a TOTAL amino acid or phosphorus value with no published SID or
   * digestibility: it counts toward the total, never toward SID/digestible.
   */
  countsTowardDigestible: boolean;
  /** The cited basis, e.g. "as-fed label minimum per kg premix". */
  basis: string;
};

const AMINO_ACID_LABELS: Record<string, string> = {
  lysine: "lysine",
  methionine: "methionine",
  cysteine: "cysteine",
  methionineCysteine: "methionine + cysteine",
  threonine: "threonine",
  tryptophan: "tryptophan",
  valine: "valine",
  isoleucine: "isoleucine",
  leucine: "leucine",
  histidine: "histidine",
  arginine: "arginine",
};

const MACRO_MINERALS: Record<string, string> = {
  calciumPct: "Calcium",
  totalPhosphorusPct: "Total phosphorus",
  availablePhosphorusPct: "Available phosphorus",
  sttdPhosphorusPct: "STTD phosphorus",
  digestiblePhosphorusPct: "Digestible phosphorus",
  sodiumPct: "Sodium",
  chloridePct: "Chloride",
  potassiumPct: "Potassium",
  magnesiumPct: "Magnesium",
};

export const VITAMIN_FIELDS: Record<string, { label: string; unit: string }> = {
  vitaminAIuKg: { label: "Vitamin A", unit: "IU/kg" },
  vitaminDIuKg: { label: "Vitamin D3", unit: "IU/kg" },
  vitaminEIuKg: { label: "Vitamin E", unit: "IU/kg" },
  vitaminKMgKg: { label: "Vitamin K3", unit: "mg/kg" },
  vitaminB1MgKg: { label: "Vitamin B1", unit: "mg/kg" },
  riboflavinMgKg: { label: "Vitamin B2", unit: "mg/kg" },
  vitaminB6MgKg: { label: "Vitamin B6", unit: "mg/kg" },
  vitaminB12McgKg: { label: "Vitamin B12", unit: "mcg/kg" },
  pantothenicAcidMgKg: { label: "Pantothenic acid", unit: "mg/kg" },
  niacinMgKg: { label: "Niacin", unit: "mg/kg" },
  folicAcidMgKg: { label: "Folic acid", unit: "mg/kg" },
  biotinMgKg: { label: "Biotin", unit: "mg/kg" },
  totalCholineMgKg: { label: "Choline", unit: "mg/kg" },
};

export const TRACE_MINERAL_FIELDS: Record<string, string> = {
  zinc: "Zinc",
  iron: "Iron",
  manganese: "Manganese",
  copper: "Copper",
  iodine: "Iodine",
  selenium: "Selenium",
};

/**
 * Every documented nutrient in a premix's composition and its contribution to
 * the finished feed at the given inclusion. Reporting only: the formulation
 * engine reads the same profile through its single nutrient pipeline.
 */
export function premixNutrientContributions(
  premix: CommercialPremix,
  inclusionPct = premix.inclusionPct,
): PremixNutrientContribution[] {
  const share = inclusionPct / 100;
  const profile = premix.composition;
  const basisOf = (path: string) => premix.nutrientSources[path]?.basis ?? premix.source?.basis ?? "as-fed";
  const rows: PremixNutrientContribution[] = [];
  const push = (path: string, nutrient: string, group: PremixNutrientGroup, unit: string, value: number | undefined, countsTowardDigestible = true) => {
    if (value === undefined) return;
    rows.push({ path, nutrient, group, unit, premixConcentration: value, finishedFeedContribution: value * share, countsTowardDigestible, basis: basisOf(path) });
  };
  push("energy.metabolizableKcalKg", "Metabolizable energy", "energy", "kcal/kg", profile.energy.metabolizableKcalKg);
  push("energy.netKcalKg", "Net energy", "energy", "kcal/kg", profile.energy.netKcalKg);
  push("composition.crudeProteinPct", "Crude protein", "protein", "%", profile.composition.crudeProteinPct);
  for (const [key, label] of Object.entries(AMINO_ACID_LABELS)) {
    const sid = profile.aminoAcids.sidPct[key];
    const total = profile.aminoAcids.totalPct[key];
    const digestibility = profile.aminoAcids.sidDigestibilityPct[key];
    if (sid !== undefined) push(`aminoAcids.sidPct.${key}`, "SID " + label, "amino_acid", "%", sid);
    else if (total !== undefined && digestibility !== undefined) push(`aminoAcids.sidPct.${key}`, "SID " + label, "amino_acid", "%", total * digestibility / 100);
    if (total !== undefined) push(`aminoAcids.totalPct.${key}`, "Total " + label, "amino_acid", "%", total, sid !== undefined || digestibility !== undefined);
  }
  const minerals = profile.macroMinerals as Record<string, number | undefined>;
  const digestibleP = minerals.sttdPhosphorusPct ?? minerals.digestiblePhosphorusPct ?? minerals.availablePhosphorusPct;
  for (const [key, label] of Object.entries(MACRO_MINERALS)) {
    push(`macroMinerals.${key}`, label, "macro_mineral", "%", minerals[key], key !== "totalPhosphorusPct" || digestibleP !== undefined);
  }
  for (const [key, label] of Object.entries(TRACE_MINERAL_FIELDS)) {
    push(`traceMineralsPpm.${key}`, label, "trace_mineral", "ppm", profile.traceMineralsPpm[key]);
  }
  for (const [key, meta] of Object.entries(VITAMIN_FIELDS)) {
    push(`vitamins.${key}`, meta.label, "vitamin", meta.unit, (profile.vitamins as Record<string, number | undefined>)[key]);
  }
  return rows;
}

/** Present on all formulation responses, even when no commercial premix is used. */
export type CommercialPremixAnalysis =
  | {
      status: "included";
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
      verification_status: CommercialPremix["verificationStatus"];
      source_url: string;
      /** Every documented nutrient, credited through the same pipeline as other ingredients. */
      contributions: PremixNutrientContribution[];
      /** Reference only, e.g. finished-feed specifications; never credited as composition. */
      reference_notes: string[];
    }
  | {
      status: "not_included";
      product_id: null;
      message: string;
    };

export function premixAnalysisForIds(ids: readonly string[]): CommercialPremixAnalysis {
  const selected = ids.map(commercialPremixById).find((item) => item !== undefined);
  if (!selected) return {
    status: "not_included",
    product_id: null,
    message: "No commercial premix was included.",
  };
  const contributions = premixNutrientContributions(selected);
  return {
    status: "included",
    product_id: selected.id,
    message: contributions.length
      ? `${selected.name} is included at its manufacturer dose of ${selected.inclusionKgPerTonne} kg/t. Each of its ${contributions.length} documented nutrients is counted once, alongside every other ingredient. Nutrients it does not document are counted as 0 and labelled as an assumption.`
      : `${selected.name} is included at its manufacturer dose of ${selected.inclusionKgPerTonne} kg/t. No premix composition is published, so none of its nutrients is credited; each is labelled as undocumented.`,
    manufacturer: selected.manufacturer,
    sku: selected.sku,
    permitted_species: selected.species,
    permitted_programme_prefixes: selected.eligibleProgrammePrefixes,
    application: selected.application,
    inclusion_pct: selected.inclusionPct,
    inclusion_kg_per_tonne: selected.inclusionKgPerTonne,
    inclusion_instructions: selected.inclusionInstructions,
    verification_status: selected.verificationStatus,
    source_url: selected.specificationUrl,
    contributions,
    reference_notes: [
      ...(selected.finishedFeedSpecification ? [selected.finishedFeedSpecification.concentrationBasis] : []),
      ...(selected.note ? [selected.note] : []),
      ...(selected.notes ?? []),
    ],
  };
}

import {
  INGREDIENT_LIBRARY,
  SOYBEAN_MEAL_FAMILY_ID,
  sidAminoAcidPct,
  sttdPhosphorusPctOf,
  type IngredientLibrary,
  type IngredientNutrientRecord,
} from "./ingredient-nutrients";

export type DietIngredient = {
  ingredientId: string;
  inclusionPct: number;
};

export type IngredientPrice = {
  ingredientId: string;
  pricePerKg: number;
};

export type DietFormula = {
  ingredients: readonly DietIngredient[];
};

/**
 * One nutrient of a diet, summed over every ingredient through the same
 * pipeline. A commercial premix is an ingredient like any other: each value
 * it documents is added once, at its inclusion.
 *
 * Three data states are kept apart:
 * - a published value (including a published or structural zero);
 * - `assumedZeroIngredientIds`: a premix that does not document the nutrient.
 *   It is counted as 0, which is conservative for a minimum requirement, and
 *   the assumption is reported. It is never presented as a verified value.
 * - `missingIngredientIds`: an ordinary ingredient with no value. The total is
 *   then incomplete and the optimizer will not use the ingredient.
 */
export type AnalyzedNutrient = {
  /**
   * Sum of contributions we can calculate. Do not interpret this as the diet's
   * final value unless complete is true.
   */
  value: number;
  complete: boolean;
  missingIngredientIds: string[];
  assumedZeroIngredientIds: string[];
  /**
   * Premixes that publish only a TOTAL value (e.g. total lysine or total
   * phosphorus) for a digestible measure. They are also in
   * `assumedZeroIngredientIds`: total is never equated with SID.
   */
  totalOnlyIngredientIds: string[];
};

export type DietAnalysis = {
  inclusionPct: number;
  energy: {
    digestibleKcalKg: AnalyzedNutrient;
    metabolizableKcalKg: AnalyzedNutrient;
    netKcalKg: AnalyzedNutrient;
  };
  crudeProteinPct: AnalyzedNutrient;
  digestibleProteinPct: AnalyzedNutrient;
  neutralDetergentFibrePct: AnalyzedNutrient;
  fattyAcids: {
    linoleicAcidPct: AnalyzedNutrient;
  };
  sidAminoAcidsPct: {
    lysine: AnalyzedNutrient;
    methionineCysteine: AnalyzedNutrient;
    threonine: AnalyzedNutrient;
    tryptophan: AnalyzedNutrient;
    valine: AnalyzedNutrient;
    isoleucine: AnalyzedNutrient;
    leucine: AnalyzedNutrient;
    histidine: AnalyzedNutrient;
    phenylalanineTyrosine: AnalyzedNutrient;
  };
  /** Reporting only; requirements are expressed as SID. */
  totalAminoAcidsPct: {
    lysine: AnalyzedNutrient;
    methionineCysteine: AnalyzedNutrient;
    threonine: AnalyzedNutrient;
    tryptophan: AnalyzedNutrient;
  };
  minerals: {
    calciumPct: AnalyzedNutrient;
    totalPhosphorusPct: AnalyzedNutrient;
    availablePhosphorusPct: AnalyzedNutrient;
    sttdPhosphorusPct: AnalyzedNutrient;
    sodiumPct: AnalyzedNutrient;
    chloridePct: AnalyzedNutrient;
    potassiumPct: AnalyzedNutrient;
  };
  traceMineralsPpm: Record<TraceMineral, AnalyzedNutrient>;
  vitamins: Record<VitaminKey, AnalyzedNutrient>;
  /**
   * Deliberately supplemented micronutrients only (premixes and mineral
   * sources). Brazilian Tables Chapter 7 publishes supplementation guidance
   * rather than total-diet requirements, so natural ingredient concentrations
   * are excluded here; they remain in the total-diet values above.
   */
  supplementation: {
    traceMineralsPpm: Record<TraceMineral, AnalyzedNutrient>;
    vitamins: Record<VitaminKey, AnalyzedNutrient>;
  };
  /** Combined inclusion of the canonical soybean-meal family (every grade). */
  soybeanMealPct: number;
  lLysineHclPct: number;
  costPerKg?: number;
  missingPriceIngredientIds: string[];
};

const TRACE_MINERALS = ["zinc", "iron", "manganese", "copper", "iodine", "selenium"] as const;
type TraceMineral = (typeof TRACE_MINERALS)[number];

const VITAMIN_KEYS = [
  "vitaminAIuKg",
  "vitaminDIuKg",
  "vitaminEIuKg",
  "vitaminKMgKg",
  "vitaminB1MgKg",
  "riboflavinMgKg",
  "vitaminB6MgKg",
  "vitaminB12McgKg",
  "pantothenicAcidMgKg",
  "niacinMgKg",
  "folicAcidMgKg",
  "biotinMgKg",
  "totalCholineMgKg",
] as const;
type VitaminKey = (typeof VITAMIN_KEYS)[number];

function measure(): AnalyzedNutrient {
  return { value: 0, complete: true, missingIngredientIds: [], assumedZeroIngredientIds: [], totalOnlyIngredientIds: [] };
}

const measures = <K extends string>(keys: readonly K[]) =>
  Object.fromEntries(keys.map((key) => [key, measure()])) as Record<K, AnalyzedNutrient>;

export function analyzeDiet(
  formula: DietFormula,
  prices: readonly IngredientPrice[] = [],
  library: IngredientLibrary = INGREDIENT_LIBRARY,
): DietAnalysis {
  const total = formula.ingredients.reduce((sum, row) => sum + row.inclusionPct, 0);
  if (!Number.isFinite(total) || Math.abs(total - 100) > 1e-6) {
    throw new Error(`Diet inclusions must sum to 100%; received ${total}.`);
  }

  const priceById = new Map(prices.map((price) => [price.ingredientId, price.pricePerKg]));
  const missingPriceIngredientIds: string[] = [];
  let costPerKg = 0;

  const result: DietAnalysis = {
    inclusionPct: total,
    energy: { digestibleKcalKg: measure(), metabolizableKcalKg: measure(), netKcalKg: measure() },
    crudeProteinPct: measure(),
    digestibleProteinPct: measure(),
    neutralDetergentFibrePct: measure(),
    fattyAcids: { linoleicAcidPct: measure() },
    sidAminoAcidsPct: measures(["lysine", "methionineCysteine", "threonine", "tryptophan", "valine", "isoleucine", "leucine", "histidine", "phenylalanineTyrosine"]),
    totalAminoAcidsPct: measures(["lysine", "methionineCysteine", "threonine", "tryptophan"]),
    minerals: measures(["calciumPct", "totalPhosphorusPct", "availablePhosphorusPct", "sttdPhosphorusPct", "sodiumPct", "chloridePct", "potassiumPct"]),
    traceMineralsPpm: measures(TRACE_MINERALS),
    vitamins: measures(VITAMIN_KEYS),
    supplementation: { traceMineralsPpm: measures(TRACE_MINERALS), vitamins: measures(VITAMIN_KEYS) },
    soybeanMealPct: 0,
    lLysineHclPct: 0,
    missingPriceIngredientIds,
  };

  for (const row of formula.ingredients) {
    if (!Number.isFinite(row.inclusionPct) || row.inclusionPct < 0 || row.inclusionPct > 100) {
      throw new Error(`Invalid inclusion for ${row.ingredientId}: ${row.inclusionPct}%.`);
    }
    if (row.inclusionPct === 0) continue;

    const ingredient = library.ingredients.find((candidate) => candidate.id === row.ingredientId);
    if (!ingredient) throw new Error(`Unknown ingredient: ${row.ingredientId}.`);

    const share = row.inclusionPct / 100;
    const add = (target: AnalyzedNutrient, value: number | undefined, family: NutrientFamily) =>
      addValue(target, ingredient, share, value, family);

    add(result.energy.digestibleKcalKg, ingredient.energy.digestibleKcalKg, "energy");
    add(result.energy.metabolizableKcalKg, ingredient.energy.metabolizableKcalKg, "energy");
    add(result.energy.netKcalKg, ingredient.energy.netKcalKg, "energy");
    add(result.crudeProteinPct, ingredient.composition.crudeProteinPct, "protein");
    add(result.digestibleProteinPct, ingredient.composition.digestibleProteinPct, "protein");
    add(result.neutralDetergentFibrePct, ingredient.composition.neutralDetergentFibrePct, "fibre");
    add(result.fattyAcids.linoleicAcidPct, ingredient.composition.linoleicAcidPct, "fattyAcid");

    const sid = result.sidAminoAcidsPct;
    addSid(sid.lysine, ingredient, share, ["lysine"]);
    addSid(sid.methionineCysteine, ingredient, share, ["methionine", "cysteine"], "methionineCysteine");
    addSid(sid.threonine, ingredient, share, ["threonine"]);
    addSid(sid.tryptophan, ingredient, share, ["tryptophan"]);
    addSid(sid.valine, ingredient, share, ["valine"]);
    addSid(sid.isoleucine, ingredient, share, ["isoleucine"]);
    addSid(sid.leucine, ingredient, share, ["leucine"]);
    addSid(sid.histidine, ingredient, share, ["histidine"]);
    addSid(sid.phenylalanineTyrosine, ingredient, share, ["phenylalanine", "tyrosine"], "phenylalanineTyrosine");

    const totalAa = result.totalAminoAcidsPct;
    addTotalAminoAcid(totalAa.lysine, ingredient, share, ["lysine"]);
    addTotalAminoAcid(totalAa.methionineCysteine, ingredient, share, ["methionine", "cysteine"], "methionineCysteine");
    addTotalAminoAcid(totalAa.threonine, ingredient, share, ["threonine"]);
    addTotalAminoAcid(totalAa.tryptophan, ingredient, share, ["tryptophan"]);

    const minerals = ingredient.macroMinerals;
    add(result.minerals.calciumPct, minerals.calciumPct, "macroMineral");
    add(result.minerals.totalPhosphorusPct, minerals.totalPhosphorusPct, "macroMineral");
    addDigestible(result.minerals.availablePhosphorusPct, ingredient, share, minerals.availablePhosphorusPct, minerals.totalPhosphorusPct);
    addDigestible(result.minerals.sttdPhosphorusPct, ingredient, share, sttdPhosphorusPctOf(ingredient), minerals.totalPhosphorusPct);
    add(result.minerals.sodiumPct, minerals.sodiumPct, "macroMineral");
    add(result.minerals.chloridePct, minerals.chloridePct, "macroMineral");
    add(result.minerals.potassiumPct, minerals.potassiumPct, "macroMineral");

    for (const nutrient of TRACE_MINERALS) {
      const value = ingredient.traceMineralsPpm[nutrient];
      add(result.traceMineralsPpm[nutrient], value, "traceMineral");
      addSupplemented(result.supplementation.traceMineralsPpm[nutrient], ingredient, share, value);
    }
    for (const key of VITAMIN_KEYS) {
      add(result.vitamins[key], ingredient.vitamins[key], "vitamin");
      addSupplemented(result.supplementation.vitamins[key], ingredient, share, ingredient.vitamins[key]);
    }

    if (ingredient.familyId === SOYBEAN_MEAL_FAMILY_ID) result.soybeanMealPct += row.inclusionPct;
    if (ingredient.id === "l-lysine-hcl") result.lLysineHclPct += row.inclusionPct;

    const price = priceById.get(row.ingredientId);
    if (price === undefined) {
      missingPriceIngredientIds.push(row.ingredientId);
    } else {
      if (!Number.isFinite(price) || price < 0) {
        throw new Error(`Invalid price for ${row.ingredientId}: ${price}.`);
      }
      costPerKg += share * price;
    }
  }

  if (missingPriceIngredientIds.length === 0) result.costPerKg = costPerKg;
  return result;
}

type NutrientFamily =
  | "energy"
  | "protein"
  | "fibre"
  | "fattyAcid"
  | "aminoAcid"
  | "macroMineral"
  | "traceMineral"
  | "vitamin";

/**
 * Some ingredient classes cannot materially contribute certain nutrient
 * families (limestone has no energy; oil has no amino acids). A missing field
 * in those cases is a true zero, not unknown. Premixes are deliberately NOT
 * covered: what they contain is whatever their manufacturer documents.
 */
const STRUCTURAL_ZERO: Record<NutrientFamily, readonly IngredientNutrientRecord["category"][]> = {
  energy: ["mineral", "amino_acid"],
  protein: ["mineral", "oil_fat"],
  fibre: ["mineral", "oil_fat", "amino_acid"],
  fattyAcid: ["mineral", "amino_acid"],
  aminoAcid: ["mineral", "oil_fat", "amino_acid"],
  macroMineral: ["oil_fat", "amino_acid", "mineral"],
  traceMineral: ["oil_fat", "amino_acid", "mineral"],
  vitamin: ["mineral", "amino_acid"],
};

const isPremix = (ingredient: IngredientNutrientRecord) => ingredient.category === "vitamin_mineral_premix";

function addValue(
  target: AnalyzedNutrient,
  ingredient: IngredientNutrientRecord,
  share: number,
  value: number | undefined,
  family: NutrientFamily,
): void {
  if (value !== undefined) target.value += share * value;
  else if (STRUCTURAL_ZERO[family].includes(ingredient.category)) return;
  else if (isPremix(ingredient)) markAssumedZero(target, ingredient.id);
  else markMissing(target, ingredient.id);
}

/**
 * A digestible measure (SID amino acid, STTD/available phosphorus). A premix
 * that publishes only the TOTAL is credited 0 here and flagged total-only.
 */
function addDigestible(
  target: AnalyzedNutrient,
  ingredient: IngredientNutrientRecord,
  share: number,
  digestible: number | undefined,
  total: number | undefined,
): void {
  if (digestible === undefined && total !== undefined && isPremix(ingredient)) {
    markAssumedZero(target, ingredient.id);
    if (!target.totalOnlyIngredientIds.includes(ingredient.id)) target.totalOnlyIngredientIds.push(ingredient.id);
    return;
  }
  addValue(target, ingredient, share, digestible, "macroMineral");
}

function addSupplemented(
  target: AnalyzedNutrient,
  ingredient: IngredientNutrientRecord,
  share: number,
  value: number | undefined,
): void {
  // Brazilian Tables supplementation guidance concerns nutrients intentionally
  // added through premixes/mineral supplements, not those naturally present in
  // maize, soybean meal or other basal feedstuffs.
  if (!isPremix(ingredient) && ingredient.category !== "mineral") return;
  // A mineral source with no listed micronutrient does not contain it.
  if (value === undefined && ingredient.category === "mineral") return;
  addValue(target, ingredient, share, value, "vitamin");
}

function addSid(
  target: AnalyzedNutrient,
  ingredient: IngredientNutrientRecord,
  share: number,
  aminoAcids: readonly string[],
  combinedKey?: string,
): void {
  if (combinedKey) {
    const explicitCombined = ingredient.aminoAcids.sidPct[combinedKey];
    if (explicitCombined !== undefined) {
      target.value += share * explicitCombined;
      return;
    }
  }

  let subtotal = 0;
  for (const aminoAcid of aminoAcids) {
    const value = sidAminoAcidPct(ingredient, aminoAcid);
    if (value !== undefined) {
      subtotal += value;
      continue;
    }
    if (STRUCTURAL_ZERO.aminoAcid.includes(ingredient.category)) continue;
    if (!isPremix(ingredient)) {
      markMissing(target, ingredient.id);
      return;
    }
    // Total is not SID: a published total without SID or a source-backed
    // digestibility coefficient is counted as 0 toward SID, and flagged.
    const hasTotal = ingredient.aminoAcids.totalPct[aminoAcid] !== undefined ||
      (combinedKey !== undefined && ingredient.aminoAcids.totalPct[combinedKey] !== undefined);
    markAssumedZero(target, ingredient.id);
    if (hasTotal && !target.totalOnlyIngredientIds.includes(ingredient.id)) target.totalOnlyIngredientIds.push(ingredient.id);
  }
  target.value += share * subtotal;
}

/**
 * Total amino acid. Crystalline amino acids are listed in the Brazilian Tables
 * by their SID content; total is at least that, so SID is used as the
 * (conservative) total when no total is published for a free amino acid.
 */
function addTotalAminoAcid(
  target: AnalyzedNutrient,
  ingredient: IngredientNutrientRecord,
  share: number,
  aminoAcids: readonly string[],
  combinedKey?: string,
): void {
  const totalOf = (key: string) => ingredient.aminoAcids.totalPct[key] ??
    (ingredient.category === "amino_acid" ? ingredient.aminoAcids.sidPct[key] ?? 0 : undefined);
  const combined = combinedKey ? totalOf(combinedKey) : undefined;
  if (combined !== undefined && combined !== 0) {
    target.value += share * combined;
    return;
  }
  let subtotal = 0;
  for (const aminoAcid of aminoAcids) {
    const value = totalOf(aminoAcid);
    if (value === undefined) {
      addValue(target, ingredient, share, undefined, "aminoAcid");
      if (!target.complete && target.missingIngredientIds.includes(ingredient.id)) return;
      continue;
    }
    subtotal += value;
  }
  target.value += share * subtotal;
}

function markMissing(target: AnalyzedNutrient, ingredientId: string): void {
  target.complete = false;
  if (!target.missingIngredientIds.includes(ingredientId)) {
    target.missingIngredientIds.push(ingredientId);
  }
}

function markAssumedZero(target: AnalyzedNutrient, ingredientId: string): void {
  if (!target.assumedZeroIngredientIds.includes(ingredientId)) {
    target.assumedZeroIngredientIds.push(ingredientId);
  }
}

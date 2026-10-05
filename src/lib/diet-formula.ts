import {
  INGREDIENT_LIBRARY,
  sidAminoAcidPct,
  sttdPhosphorusPctOf,
  type IngredientLibrary,
  type IngredientNutrientRecord,
} from "./ingredient-nutrients";
import { resolveNutritionTargets, type EnergySystem } from "./nutrition-targets";
import type { NutritionPhase } from "./nutrition";

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

export type AnalyzedNutrient = {
  /**
   * Sum of contributions we can calculate. Do not interpret this as the diet's
   * final value unless complete is true.
   */
  value: number;
  complete: boolean;
  missingIngredientIds: string[];
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
  minerals: {
    calciumPct: AnalyzedNutrient;
    totalPhosphorusPct: AnalyzedNutrient;
    availablePhosphorusPct: AnalyzedNutrient;
    sttdPhosphorusPct: AnalyzedNutrient;
    sodiumPct: AnalyzedNutrient;
    chloridePct: AnalyzedNutrient;
    potassiumPct: AnalyzedNutrient;
  };
  traceMineralsPpm: {
    zinc: AnalyzedNutrient;
    iron: AnalyzedNutrient;
    manganese: AnalyzedNutrient;
    copper: AnalyzedNutrient;
    iodine: AnalyzedNutrient;
    selenium: AnalyzedNutrient;
  };
  vitamins: {
    vitaminAIuKg: AnalyzedNutrient;
    vitaminDIuKg: AnalyzedNutrient;
    vitaminEIuKg: AnalyzedNutrient;
    vitaminKMgKg: AnalyzedNutrient;
    vitaminB1MgKg: AnalyzedNutrient;
    riboflavinMgKg: AnalyzedNutrient;
    vitaminB6MgKg: AnalyzedNutrient;
    vitaminB12McgKg: AnalyzedNutrient;
    pantothenicAcidMgKg: AnalyzedNutrient;
    niacinMgKg: AnalyzedNutrient;
    folicAcidMgKg: AnalyzedNutrient;
    biotinMgKg: AnalyzedNutrient;
    totalCholineMgKg: AnalyzedNutrient;
  };
  /**
   * Deliberately supplemented micronutrients only. Natural ingredient
   * concentrations are excluded because Brazilian Tables Chapter 7 publishes
   * supplementation guidance rather than total-diet requirements.
   */
  supplementation: {
    traceMineralsPpm: {
      zinc: AnalyzedNutrient;
      iron: AnalyzedNutrient;
      manganese: AnalyzedNutrient;
      copper: AnalyzedNutrient;
      iodine: AnalyzedNutrient;
      selenium: AnalyzedNutrient;
    };
    vitamins: {
      vitaminAIuKg: AnalyzedNutrient;
      vitaminDIuKg: AnalyzedNutrient;
      vitaminEIuKg: AnalyzedNutrient;
      vitaminKMgKg: AnalyzedNutrient;
      vitaminB1MgKg: AnalyzedNutrient;
      riboflavinMgKg: AnalyzedNutrient;
      vitaminB6MgKg: AnalyzedNutrient;
      vitaminB12McgKg: AnalyzedNutrient;
      pantothenicAcidMgKg: AnalyzedNutrient;
      niacinMgKg: AnalyzedNutrient;
      folicAcidMgKg: AnalyzedNutrient;
      biotinMgKg: AnalyzedNutrient;
      totalCholineMgKg: AnalyzedNutrient;
    };
  };
  soybeanMealPct: number;
  lLysineHclPct: number;
  costPerKg?: number;
  missingPriceIngredientIds: string[];
};

export type DietConstraintStatus = "pass" | "fail" | "incomplete";

export type DietConstraintCheck = {
  id: string;
  label: string;
  actual: number | null;
  knownSubtotal?: number;
  bound: number | { min: number; max: number };
  relation: "min" | "max" | "range";
  status: DietConstraintStatus;
  passes: boolean | null;
  unit: string;
  missingIngredientIds: string[];
};

export type DietEvaluationStatus = "valid" | "invalid" | "incomplete";

export type DietPhaseEvaluation = {
  phaseId: string;
  energySystem: EnergySystem;
  energyKcalKg: number | null;
  analysis: DietAnalysis;
  checks: DietConstraintCheck[];
  status: DietEvaluationStatus;
  /** Backward-compatible convenience: true only when every required check is known and passes. */
  passes: boolean;
  unsupportedConstraints: string[];
};

function measure(): AnalyzedNutrient {
  return { value: 0, complete: true, missingIngredientIds: [] };
}

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
    energy: {
      digestibleKcalKg: measure(),
      metabolizableKcalKg: measure(),
      netKcalKg: measure(),
    },
    crudeProteinPct: measure(),
    digestibleProteinPct: measure(),
    neutralDetergentFibrePct: measure(),
    fattyAcids: {
      linoleicAcidPct: measure(),
    },
    sidAminoAcidsPct: {
      lysine: measure(),
      methionineCysteine: measure(),
      threonine: measure(),
      tryptophan: measure(),
      valine: measure(),
      isoleucine: measure(),
      leucine: measure(),
      histidine: measure(),
      phenylalanineTyrosine: measure(),
    },
    minerals: {
      calciumPct: measure(),
      totalPhosphorusPct: measure(),
      availablePhosphorusPct: measure(),
      sttdPhosphorusPct: measure(),
      sodiumPct: measure(),
      chloridePct: measure(),
      potassiumPct: measure(),
    },
    traceMineralsPpm: {
      zinc: measure(),
      iron: measure(),
      manganese: measure(),
      copper: measure(),
      iodine: measure(),
      selenium: measure(),
    },
    vitamins: {
      vitaminAIuKg: measure(),
      vitaminDIuKg: measure(),
      vitaminEIuKg: measure(),
      vitaminKMgKg: measure(),
      vitaminB1MgKg: measure(),
      riboflavinMgKg: measure(),
      vitaminB6MgKg: measure(),
      vitaminB12McgKg: measure(),
      pantothenicAcidMgKg: measure(),
      niacinMgKg: measure(),
      folicAcidMgKg: measure(),
      biotinMgKg: measure(),
      totalCholineMgKg: measure(),
    },
    supplementation: {
      traceMineralsPpm: {
        zinc: measure(),
        iron: measure(),
        manganese: measure(),
        copper: measure(),
        iodine: measure(),
        selenium: measure(),
      },
      vitamins: {
        vitaminAIuKg: measure(),
        vitaminDIuKg: measure(),
        vitaminEIuKg: measure(),
        vitaminKMgKg: measure(),
        vitaminB1MgKg: measure(),
        riboflavinMgKg: measure(),
        vitaminB6MgKg: measure(),
        vitaminB12McgKg: measure(),
        pantothenicAcidMgKg: measure(),
        niacinMgKg: measure(),
        folicAcidMgKg: measure(),
        biotinMgKg: measure(),
        totalCholineMgKg: measure(),
      },
    },
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

    add(
      result.energy.digestibleKcalKg,
      ingredient,
      share,
      ingredient.energy.digestibleKcalKg,
      structuralZero(ingredient, "energy"),
    );
    add(
      result.energy.metabolizableKcalKg,
      ingredient,
      share,
      ingredient.energy.metabolizableKcalKg,
      structuralZero(ingredient, "energy"),
    );
    add(
      result.energy.netKcalKg,
      ingredient,
      share,
      ingredient.energy.netKcalKg,
      structuralZero(ingredient, "energy"),
    );
    add(
      result.crudeProteinPct,
      ingredient,
      share,
      ingredient.composition.crudeProteinPct,
      structuralZero(ingredient, "crudeProtein"),
    );
    add(
      result.digestibleProteinPct,
      ingredient,
      share,
      ingredient.composition.digestibleProteinPct,
      structuralZero(ingredient, "digestibleProtein"),
    );
    add(
      result.neutralDetergentFibrePct,
      ingredient,
      share,
      ingredient.composition.neutralDetergentFibrePct,
      structuralZero(ingredient, "fibre"),
    );
    add(
      result.fattyAcids.linoleicAcidPct,
      ingredient,
      share,
      ingredient.composition.linoleicAcidPct,
      structuralZero(ingredient, "fattyAcid"),
    );

    addSid(result.sidAminoAcidsPct.lysine, ingredient, share, ["lysine"]);
    addSid(
      result.sidAminoAcidsPct.methionineCysteine,
      ingredient,
      share,
      ["methionine", "cysteine"],
      "methionineCysteine",
    );
    addSid(result.sidAminoAcidsPct.threonine, ingredient, share, ["threonine"]);
    addSid(result.sidAminoAcidsPct.tryptophan, ingredient, share, ["tryptophan"]);
    addSid(result.sidAminoAcidsPct.valine, ingredient, share, ["valine"]);
    addSid(result.sidAminoAcidsPct.isoleucine, ingredient, share, ["isoleucine"]);
    addSid(result.sidAminoAcidsPct.leucine, ingredient, share, ["leucine"]);
    addSid(result.sidAminoAcidsPct.histidine, ingredient, share, ["histidine"]);
    addSid(
      result.sidAminoAcidsPct.phenylalanineTyrosine,
      ingredient,
      share,
      ["phenylalanine", "tyrosine"],
      "phenylalanineTyrosine",
    );

    add(
      result.minerals.calciumPct,
      ingredient,
      share,
      ingredient.macroMinerals.calciumPct,
      structuralZero(ingredient, "macroMineral"),
    );
    add(
      result.minerals.totalPhosphorusPct,
      ingredient,
      share,
      ingredient.macroMinerals.totalPhosphorusPct,
      structuralZero(ingredient, "macroMineral"),
    );
    add(
      result.minerals.availablePhosphorusPct,
      ingredient,
      share,
      ingredient.macroMinerals.availablePhosphorusPct,
      structuralZero(ingredient, "macroMineral"),
    );
    add(
      result.minerals.sttdPhosphorusPct,
      ingredient,
      share,
      sttdPhosphorusPctOf(ingredient),
      structuralZero(ingredient, "macroMineral"),
    );
    add(
      result.minerals.sodiumPct,
      ingredient,
      share,
      ingredient.macroMinerals.sodiumPct,
      structuralZero(ingredient, "macroMineral"),
    );
    add(
      result.minerals.chloridePct,
      ingredient,
      share,
      ingredient.macroMinerals.chloridePct,
      structuralZero(ingredient, "macroMineral"),
    );
    add(
      result.minerals.potassiumPct,
      ingredient,
      share,
      ingredient.macroMinerals.potassiumPct,
      structuralZero(ingredient, "macroMineral"),
    );

    addTrace(result.traceMineralsPpm.zinc, ingredient, share, "zinc");
    addTrace(result.traceMineralsPpm.iron, ingredient, share, "iron");
    addTrace(result.traceMineralsPpm.manganese, ingredient, share, "manganese");
    addTrace(result.traceMineralsPpm.copper, ingredient, share, "copper");
    addTrace(result.traceMineralsPpm.iodine, ingredient, share, "iodine");
    addTrace(result.traceMineralsPpm.selenium, ingredient, share, "selenium");

    const vitaminEntries = [
      ["vitaminAIuKg", result.vitamins.vitaminAIuKg],
      ["vitaminDIuKg", result.vitamins.vitaminDIuKg],
      ["vitaminEIuKg", result.vitamins.vitaminEIuKg],
      ["vitaminKMgKg", result.vitamins.vitaminKMgKg],
      ["vitaminB1MgKg", result.vitamins.vitaminB1MgKg],
      ["riboflavinMgKg", result.vitamins.riboflavinMgKg],
      ["vitaminB6MgKg", result.vitamins.vitaminB6MgKg],
      ["vitaminB12McgKg", result.vitamins.vitaminB12McgKg],
      ["pantothenicAcidMgKg", result.vitamins.pantothenicAcidMgKg],
      ["niacinMgKg", result.vitamins.niacinMgKg],
      ["folicAcidMgKg", result.vitamins.folicAcidMgKg],
      ["biotinMgKg", result.vitamins.biotinMgKg],
      ["totalCholineMgKg", result.vitamins.totalCholineMgKg],
    ] as const;
    for (const [key, target] of vitaminEntries) {
      add(
        target,
        ingredient,
        share,
        ingredient.vitamins[key],
        structuralZero(ingredient, "vitamin"),
      );
      addSupplemented(
        result.supplementation.vitamins[key],
        ingredient,
        share,
        ingredient.vitamins[key],
      );
    }

    for (const nutrient of [
      "zinc",
      "iron",
      "manganese",
      "copper",
      "iodine",
      "selenium",
    ] as const) {
      addSupplemented(
        result.supplementation.traceMineralsPpm[nutrient],
        ingredient,
        share,
        ingredient.traceMineralsPpm[nutrient],
      );
    }

    if (ingredient.id.startsWith("soybean-meal-")) result.soybeanMealPct += row.inclusionPct;
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

export function evaluateDietForPhase(
  formula: DietFormula,
  phase: NutritionPhase,
  energySystem: EnergySystem,
  prices: readonly IngredientPrice[] = [],
  library: IngredientLibrary = INGREDIENT_LIBRARY,
): DietPhaseEvaluation {
  const analysis = analyzeDiet(formula, prices, library);
  const energyMeasure =
    energySystem === "ME"
      ? analysis.energy.metabolizableKcalKg
      : analysis.energy.netKcalKg;

  const checks: DietConstraintCheck[] = [];
  const unsupportedConstraints: string[] = [];

  const selectedPublishedEnergy =
    energySystem === "ME"
      ? phase.requirements.metabolizableEnergyKcalKg
      : phase.requirements.netEnergyKcalKg;

  if (selectedPublishedEnergy !== undefined) {
    checkMin(
      checks,
      `energy-${energySystem.toLowerCase()}`,
      energySystem === "ME" ? "Metabolizable energy" : "Net energy",
      energyMeasure,
      selectedPublishedEnergy,
      "kcal/kg",
    );
  }

  const targets = resolveNutritionTargets(phase, {
    system: energySystem,
    kcalKg: selectedPublishedEnergy,
  });

  {
    const aa = targets.aminoAcids;
    checkMin(checks, "sid-lysine", "SID lysine", analysis.sidAminoAcidsPct.lysine, aa.sidLysinePct, "%");
    checkMin(
      checks,
      "sid-met-cys",
      "SID methionine + cysteine",
      analysis.sidAminoAcidsPct.methionineCysteine,
      aa.sidMethionineCysteinePct,
      "%",
    );
    checkMin(checks, "sid-threonine", "SID threonine", analysis.sidAminoAcidsPct.threonine, aa.sidThreoninePct, "%");
    checkMin(checks, "sid-tryptophan", "SID tryptophan", analysis.sidAminoAcidsPct.tryptophan, aa.sidTryptophanPct, "%");
    checkMin(checks, "sid-valine", "SID valine", analysis.sidAminoAcidsPct.valine, aa.sidValinePct, "%");
    checkMin(checks, "sid-isoleucine", "SID isoleucine", analysis.sidAminoAcidsPct.isoleucine, aa.sidIsoleucinePct, "%");
    checkMin(checks, "sid-leucine", "SID leucine", analysis.sidAminoAcidsPct.leucine, aa.sidLeucinePct, "%");
    checkMin(checks, "sid-histidine", "SID histidine", analysis.sidAminoAcidsPct.histidine, aa.sidHistidinePct, "%");
    checkMin(
      checks,
      "sid-phe-tyr",
      "SID phenylalanine + tyrosine",
      analysis.sidAminoAcidsPct.phenylalanineTyrosine,
      aa.sidPhenylalanineTyrosinePct,
      "%",
    );

    if (targets.minerals.calciumPct !== undefined) {
      checkMin(checks, "calcium", "Calcium", analysis.minerals.calciumPct, targets.minerals.calciumPct, "%");
    }
    if (targets.minerals.sttdPhosphorusPct !== undefined) {
      checkMin(
        checks,
        "sttd-phosphorus",
        "STTD phosphorus",
        analysis.minerals.sttdPhosphorusPct,
        targets.minerals.sttdPhosphorusPct,
        "%",
      );
    }
    if (targets.minerals.availablePhosphorusPct !== undefined) {
      checkMin(
        checks,
        "available-phosphorus",
        "Available phosphorus",
        analysis.minerals.availablePhosphorusPct,
        targets.minerals.availablePhosphorusPct,
        "%",
      );
    }
    checkMin(checks, "sodium", "Sodium", analysis.minerals.sodiumPct, targets.minerals.sodiumPct, "%");

    if (targets.minerals.chloridePct !== undefined) {
      checkMin(checks, "chloride", "Chloride", analysis.minerals.chloridePct, targets.minerals.chloridePct, "%");
    }
  }

  if (targets.crudeProteinPct !== undefined) {
    checkMin(
      checks,
      "crude-protein",
      "Crude protein",
      analysis.crudeProteinPct,
      targets.crudeProteinPct,
      "%",
    );
  }
  if (targets.digestibleProteinPct !== undefined) {
    checkMin(
      checks,
      "digestible-protein",
      "Digestible protein (swine SID)",
      analysis.digestibleProteinPct,
      targets.digestibleProteinPct,
      "%",
    );
  }
  if (targets.potassiumPct !== undefined) {
    checkMin(
      checks,
      "potassium",
      "Potassium",
      analysis.minerals.potassiumPct,
      targets.potassiumPct,
      "%",
    );
  }
  if (phase.requirements.linoleicAcidPct !== undefined) {
    checkMin(
      checks,
      "linoleic-acid",
      "Linoleic acid",
      analysis.fattyAcids.linoleicAcidPct,
      phase.requirements.linoleicAcidPct,
      "%",
    );
  }

  const trace = phase.requirements.traceMinerals;
  if (trace) {
    checkMin(checks, "zinc", "Zinc", analysis.traceMineralsPpm.zinc, trace.zincPpm, "ppm");
    checkMin(checks, "iron", "Iron", analysis.traceMineralsPpm.iron, trace.ironPpm, "ppm");
    checkMin(checks, "manganese", "Manganese", analysis.traceMineralsPpm.manganese, trace.manganesePpm, "ppm");
    checkMin(checks, "copper", "Copper", analysis.traceMineralsPpm.copper, trace.copperPpm, "ppm");
    checkMin(checks, "iodine", "Iodine", analysis.traceMineralsPpm.iodine, trace.iodinePpm, "ppm");
    checkMin(checks, "selenium", "Selenium", analysis.traceMineralsPpm.selenium, trace.seleniumPpm, "ppm");
  }

  const vitamins = phase.requirements.vitamins;
  if (vitamins) {
    checkMin(checks, "vitamin-a", "Vitamin A", analysis.vitamins.vitaminAIuKg, vitamins.vitaminAIuKg, "IU/kg");
    checkMin(checks, "vitamin-d", "Vitamin D", analysis.vitamins.vitaminDIuKg, vitamins.vitaminDIuKg, "IU/kg");
    checkMin(checks, "vitamin-e", "Vitamin E", analysis.vitamins.vitaminEIuKg, vitamins.vitaminEIuKg, "IU/kg");
    checkMin(checks, "vitamin-k", "Vitamin K", analysis.vitamins.vitaminKMgKg, vitamins.vitaminKMgKg, "mg/kg");
    checkMin(checks, "niacin", "Niacin", analysis.vitamins.niacinMgKg, vitamins.niacinMgKg, "mg/kg");
    checkMin(checks, "riboflavin", "Riboflavin", analysis.vitamins.riboflavinMgKg, vitamins.riboflavinMgKg, "mg/kg");
    checkMin(
      checks,
      "pantothenic-acid",
      "Pantothenic acid",
      analysis.vitamins.pantothenicAcidMgKg,
      vitamins.pantothenicAcidMgKg,
      "mg/kg",
    );
    checkMin(
      checks,
      "vitamin-b12",
      "Vitamin B12",
      analysis.vitamins.vitaminB12McgKg,
      vitamins.vitaminB12McgKg,
      "mcg/kg",
    );
    if (vitamins.totalCholineMgKg !== undefined) {
      checkMin(
        checks,
        "total-choline",
        "Total choline",
        analysis.vitamins.totalCholineMgKg,
        vitamins.totalCholineMgKg,
        "mg/kg",
      );
    }
  }

  const practical = phase.requirements.practical;
  if (practical.soybeanMealMaxPct !== undefined) {
    checkKnownMax(
      checks,
      "soybean-meal",
      "Soybean meal inclusion",
      analysis.soybeanMealPct,
      practical.soybeanMealMaxPct,
      "%",
    );
  }
  if (practical.lLysineHclMaxPct !== undefined) {
    checkKnownMax(
      checks,
      "l-lysine-hcl",
      "L-lysine HCl inclusion",
      analysis.lLysineHclPct,
      practical.lLysineHclMaxPct,
      "%",
    );
  }
  if (practical.neutralDetergentFibreMinPct !== undefined) {
    checkMin(
      checks,
      "neutral-detergent-fibre",
      "Neutral detergent fibre",
      analysis.neutralDetergentFibrePct,
      practical.neutralDetergentFibreMinPct,
      "%",
    );
  }
  if (practical.calciumToTotalPhosphorusMinRatio !== undefined) {
    unsupportedConstraints.push("calciumToTotalPhosphorusMinRatio");
  }
  if (practical.sidLysineToCrudeProteinMaxPct !== undefined) {
    checkRatioMax(
      checks,
      "sid-lysine-cp",
      "SID lysine : crude protein",
      analysis.sidAminoAcidsPct.lysine,
      analysis.crudeProteinPct,
      practical.sidLysineToCrudeProteinMaxPct,
    );
  }

  if (practical.highlyDigestibleProteinPct) {
    unsupportedConstraints.push("highlyDigestibleProteinPct");
  }
  if (practical.highlyDigestibleCarbohydratePct !== undefined) {
    unsupportedConstraints.push("highlyDigestibleCarbohydratePct");
  }

  const anyFail = checks.some((check) => check.status === "fail");
  const anyIncomplete =
    checks.some((check) => check.status === "incomplete") ||
    unsupportedConstraints.length > 0;
  const status: DietEvaluationStatus = anyFail
    ? "invalid"
    : anyIncomplete
      ? "incomplete"
      : "valid";

  return {
    phaseId: phase.id,
    energySystem,
    energyKcalKg: energyMeasure.complete ? energyMeasure.value : null,
    analysis,
    checks,
    status,
    passes: status === "valid",
    unsupportedConstraints,
  };
}

type NutrientFamily =
  | "energy"
  | "crudeProtein"
  | "digestibleProtein"
  | "fibre"
  | "fattyAcid"
  | "aminoAcid"
  | "macroMineral"
  | "traceMineral"
  | "vitamin";

/**
 * Some ingredient classes cannot materially contribute certain nutrient
 * families. A missing field in those cases is a structural zero, not unknown.
 *
 * This must stay deliberately narrower than "missing source value = zero".
 * Premix vitamin/mineral content, for example, is unknown until a supplier
 * specification is loaded.
 */
function structuralZero(
  ingredient: IngredientNutrientRecord,
  family: NutrientFamily,
): boolean {
  switch (family) {
    case "energy":
      return (
        ingredient.category === "mineral" ||
        ingredient.category === "amino_acid" ||
        ingredient.category === "vitamin_mineral_premix"
      );
    case "crudeProtein":
      return (
        ingredient.category === "mineral" ||
        ingredient.category === "oil_fat" ||
        ingredient.category === "vitamin_mineral_premix"
      );
    case "digestibleProtein":
      return (
        ingredient.category === "mineral" ||
        ingredient.category === "oil_fat" ||
        ingredient.category === "vitamin_mineral_premix"
      );
    case "fibre":
      return (
        ingredient.category === "mineral" ||
        ingredient.category === "oil_fat" ||
        ingredient.category === "amino_acid" ||
        ingredient.category === "vitamin_mineral_premix"
      );
    case "fattyAcid":
      return (
        ingredient.category === "mineral" ||
        ingredient.category === "amino_acid" ||
        ingredient.category === "vitamin_mineral_premix"
      );
    case "aminoAcid":
      return (
        ingredient.category === "mineral" ||
        ingredient.category === "oil_fat" ||
        ingredient.category === "amino_acid" ||
        ingredient.category === "vitamin_mineral_premix"
      );
    case "macroMineral":
      return (
        ingredient.category === "oil_fat" ||
        ingredient.category === "amino_acid" ||
        ingredient.category === "mineral" ||
        ingredient.category === "vitamin_mineral_premix"
      );
    case "traceMineral":
      return (
        ingredient.category === "oil_fat" ||
        ingredient.category === "amino_acid" ||
        ingredient.category === "mineral"
      );
    case "vitamin":
      return (
        ingredient.category === "mineral" ||
        ingredient.category === "amino_acid"
      );
  }
}

function add(
  target: AnalyzedNutrient,
  ingredient: IngredientNutrientRecord,
  share: number,
  value: number | undefined,
  missingIsZero = false,
): void {
  if (value === undefined) {
    if (!missingIsZero) markMissing(target, ingredient.id);
    return;
  }
  target.value += share * value;
}

function addSupplemented(
  target: AnalyzedNutrient,
  ingredient: IngredientNutrientRecord,
  share: number,
  value: number | undefined,
): void {
  add(
    target,
    ingredient,
    share,
    value,
    ingredient.category !== "vitamin_mineral_premix",
  );
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
    if (value === undefined) {
      if (!structuralZero(ingredient, "aminoAcid")) {
        markMissing(target, ingredient.id);
        return;
      }
      continue;
    }
    subtotal += value;
  }
  target.value += share * subtotal;
}

function addTrace(
  target: AnalyzedNutrient,
  ingredient: IngredientNutrientRecord,
  share: number,
  nutrient: string,
): void {
  add(
    target,
    ingredient,
    share,
    ingredient.traceMineralsPpm[nutrient],
    structuralZero(ingredient, "traceMineral"),
  );
}

function markMissing(target: AnalyzedNutrient, ingredientId: string): void {
  target.complete = false;
  if (!target.missingIngredientIds.includes(ingredientId)) {
    target.missingIngredientIds.push(ingredientId);
  }
}

function checkMin(
  checks: DietConstraintCheck[],
  id: string,
  label: string,
  actual: AnalyzedNutrient,
  bound: number,
  unit: string,
): void {
  if (!actual.complete) {
    checks.push(incompleteCheck(id, label, actual, bound, "min", unit));
    return;
  }
  const passes = actual.value >= bound;
  checks.push({
    id,
    label,
    actual: actual.value,
    bound,
    relation: "min",
    status: passes ? "pass" : "fail",
    passes,
    unit,
    missingIngredientIds: [],
  });
}

function checkKnownMax(
  checks: DietConstraintCheck[],
  id: string,
  label: string,
  actual: number,
  bound: number,
  unit: string,
): void {
  const passes = actual <= bound;
  checks.push({
    id,
    label,
    actual,
    bound,
    relation: "max",
    status: passes ? "pass" : "fail",
    passes,
    unit,
    missingIngredientIds: [],
  });
}

function checkRange(
  checks: DietConstraintCheck[],
  id: string,
  label: string,
  actual: AnalyzedNutrient,
  bound: { min: number; max: number },
  unit: string,
): void {
  if (!actual.complete) {
    checks.push(incompleteCheck(id, label, actual, bound, "range", unit));
    return;
  }
  const passes = actual.value >= bound.min && actual.value <= bound.max;
  checks.push({
    id,
    label,
    actual: actual.value,
    bound,
    relation: "range",
    status: passes ? "pass" : "fail",
    passes,
    unit,
    missingIngredientIds: [],
  });
}

function checkRatioRange(
  checks: DietConstraintCheck[],
  id: string,
  label: string,
  numerator: AnalyzedNutrient,
  denominator: AnalyzedNutrient,
  bound: { min: number; max: number },
): void {
  const missing = mergeMissing(numerator, denominator);
  if (!numerator.complete || !denominator.complete || denominator.value <= 0) {
    checks.push({
      id,
      label,
      actual: null,
      knownSubtotal: denominator.value > 0 ? numerator.value / denominator.value : undefined,
      bound,
      relation: "range",
      status: "incomplete",
      passes: null,
      unit: "ratio",
      missingIngredientIds: missing,
    });
    return;
  }
  const actual = numerator.value / denominator.value;
  const passes = actual >= bound.min && actual <= bound.max;
  checks.push({
    id,
    label,
    actual,
    bound,
    relation: "range",
    status: passes ? "pass" : "fail",
    passes,
    unit: "ratio",
    missingIngredientIds: [],
  });
}

function checkRatioMax(
  checks: DietConstraintCheck[],
  id: string,
  label: string,
  numerator: AnalyzedNutrient,
  denominator: AnalyzedNutrient,
  bound: number,
): void {
  const missing = mergeMissing(numerator, denominator);
  if (!numerator.complete || !denominator.complete || denominator.value <= 0) {
    checks.push({
      id,
      label,
      actual: null,
      knownSubtotal: denominator.value > 0 ? (numerator.value / denominator.value) * 100 : undefined,
      bound,
      relation: "max",
      status: "incomplete",
      passes: null,
      unit: "%",
      missingIngredientIds: missing,
    });
    return;
  }
  const actual = (numerator.value / denominator.value) * 100;
  const passes = actual <= bound;
  checks.push({
    id,
    label,
    actual,
    bound,
    relation: "max",
    status: passes ? "pass" : "fail",
    passes,
    unit: "%",
    missingIngredientIds: [],
  });
}

function incompleteCheck(
  id: string,
  label: string,
  actual: AnalyzedNutrient,
  bound: number | { min: number; max: number },
  relation: "min" | "range",
  unit: string,
): DietConstraintCheck {
  return {
    id,
    label,
    actual: null,
    knownSubtotal: actual.value,
    bound,
    relation,
    status: "incomplete",
    passes: null,
    unit,
    missingIngredientIds: actual.missingIngredientIds,
  };
}

function mergeMissing(...values: AnalyzedNutrient[]): string[] {
  return Array.from(new Set(values.flatMap((value) => value.missingIngredientIds)));
}

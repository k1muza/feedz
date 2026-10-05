import type { GLPK } from "glpk.js";

import {
  analyzeDiet,
  type AnalyzedNutrient,
  type DietAnalysis,
  type DietFormula,
  type IngredientPrice,
} from "./diet-formula";
import {
  INGREDIENT_LIBRARY,
  type IngredientLibrary,
} from "./ingredient-nutrients";
import {
  ingredientDefaultPrice,
  ingredientDefaultPricePerKg,
} from "./feed-ingredient-prices";
import { resolveNutritionTargets, type EnergySystem } from "./nutrition-targets";
import type { NutritionPhase } from "./nutrition";

export type FormulationIngredientOption = {
  ingredientId: string;
  pricePerKg: number;
  minInclusionPct?: number;
  maxInclusionPct?: number;
};

export type FormulationUnsupportedRequirement =
  | "digestible-protein"
  | "available-phosphorus"
  | "potassium"
  | "linoleic-acid"
  | "calcium-phosphorus-ratio"
  | "vitamin-trace-mineral-supplementation";

export type FormulationSettings = {
  /**
   * Apply Brazilian Tables Chapter 7 vitamin and trace-mineral supplementation
   * guidance as hard formulation constraints. These are deliberately separate
   * from total-diet nutrient requirements.
   */
  includeSupplementationTargets?: boolean;
  traceMineralBasis?: "inorganic" | "organic";
};

export type FormulationMissingData = {
  ingredientId: string;
  nutrientIds: string[];
};

export type FormulationDiagnostic = {
  constraintId: string;
  label: string;
  unit: string;
  relation: "min" | "max";
  bound: number;
  actual: number;
  shortfall: number;
  excess: number;
};

export type FormulationSolution = {
  formula: DietFormula;
  costPerKg: number;
  analysis: DietAnalysis;
};

export type FormulationAlternativeKind =
  | "low-soy"
  | "low-import"
  | "simple";

export type FormulationNutrientComparison = {
  id: string;
  label: string;
  unit: string;
  relation: "min" | "max";
  requirement: number;
  actual: number;
  margin: number;
  marginPct: number | null;
  binding: boolean;
};

export type IngredientOpportunityRecipe = {
  formula: DietFormula;
  costPerKg: number;
};

export type IngredientOpportunityPoint = {
  costTolerancePct: number;
  maxInclusionPct: number;
  resultingCostPerKg: number;
  recipe: IngredientOpportunityRecipe;
};

export type IngredientOpportunity = {
  ingredientId: string;
  currentInclusionPct: number;
  points: IngredientOpportunityPoint[];
};

export type FormulationAlternative = {
  id: FormulationAlternativeKind;
  label: string;
  description: string;
  solution: FormulationSolution;
  nutrientProfile: FormulationNutrientComparison[];
  costIncreasePct: number;
};

export const ALTERNATIVE_COST_TOLERANCE_PCT = 3;
export const INGREDIENT_OPPORTUNITY_COST_TOLERANCES_PCT = [1, 2, 3] as const;

export type LeastCostFormulationResult =
  | {
      status: "optimal";
      solution: FormulationSolution;
      nutrientProfile: FormulationNutrientComparison[];
      alternatives: FormulationAlternative[];
      ingredientOpportunities: IngredientOpportunity[];
      alternativeCostTolerancePct: number;
      ingredientOpportunityCostTolerancesPct: readonly number[];
      unsupportedRequirements: FormulationUnsupportedRequirement[];
    }
  | {
      status: "missing-data";
      missingData: FormulationMissingData[];
      unsupportedRequirements: FormulationUnsupportedRequirement[];
      message: string;
    }
  | {
      status: "infeasible";
      diagnostics: FormulationDiagnostic[];
      bestEffort?: FormulationSolution;
      unsupportedRequirements: FormulationUnsupportedRequirement[];
      message: string;
    }
  | {
      status: "error";
      unsupportedRequirements: FormulationUnsupportedRequirement[];
      message: string;
    };

export type FormulationIngredientPriceResolver = (
  ingredientId: string,
) => number | undefined;

export type FormulationIngredientSuggestionResult =
  | {
      status: "suggested";
      ingredientIds: string[];
      candidateCount: number;
      unsupportedRequirements: FormulationUnsupportedRequirement[];
    }
  | {
      status: "infeasible";
      candidateCount: number;
      unsupportedRequirements: FormulationUnsupportedRequirement[];
      message: string;
    }
  | {
      status: "error";
      candidateCount: number;
      unsupportedRequirements: FormulationUnsupportedRequirement[];
      message: string;
    };

type ConstraintSpec = {
  id: string;
  label: string;
  unit: string;
  relation: "min" | "max";
  bound: number;
  measure: (analysis: DietAnalysis) => AnalyzedNutrient;
};

type PreparedIngredient = {
  option: FormulationIngredientOption;
  variable: string;
  minFraction: number;
  maxFraction: number;
  coefficients: Map<string, number>;
};

function unsupportedRequirementsForPhase(
  phase: NutritionPhase,
  settings: FormulationSettings = {},
): FormulationUnsupportedRequirement[] {
  const unsupported: FormulationUnsupportedRequirement[] = [];
  if (settings.includeSupplementationTargets && !phase.supplementation) {
    unsupported.push("vitamin-trace-mineral-supplementation");
  }
  if (phase.requirements.practical.calciumToTotalPhosphorusMinRatio !== undefined) {
    unsupported.push("calcium-phosphorus-ratio");
  }
  return unsupported;
}

/**
 * Least-cost formulation against Brazilian Tables requirements.
 *
 * Primary mode is deliberately strict: modeled nutrient constraints are hard
 * constraints. If no exact formulation exists, a second diagnostic LP adds
 * deviation variables and minimizes relative nutrient shortfall/excess so the
 * caller can explain what prevents feasibility.
 */
export async function formulateLeastCostDiet(
  phase: NutritionPhase,
  energySystem: EnergySystem,
  options: readonly FormulationIngredientOption[],
  library: IngredientLibrary = INGREDIENT_LIBRARY,
  settings: FormulationSettings = {},
): Promise<LeastCostFormulationResult> {
  const unsupportedRequirements = unsupportedRequirementsForPhase(phase, settings);

  if (options.length === 0) {
    return {
      status: "error",
      unsupportedRequirements,
      message: "At least one available ingredient is required.",
    };
  }

  try {
    validateOptions(options, library);

    const constraints = buildConstraintSpecs(phase, energySystem, settings);
    const prepared = prepareIngredients(options, constraints, library);
    const missingData = collectMissingData(prepared, constraints);

    if (missingData.length > 0) {
      return {
        status: "missing-data",
        missingData,
        unsupportedRequirements,
        message:
          "Some selected ingredients are missing nutrient values required by the strict formulation model. PigFlow will not assume those values are zero.",
      };
    }

    const glpk = await loadGlpk();
    const strict = await solveStrict(glpk, prepared, constraints);

    if (strict.status === "optimal") {
      const solution = buildSolution(strict.vars, prepared, library);
      const alternatives = await buildAlternativeFormulations(
        glpk,
        prepared,
        constraints,
        solution,
        library,
      );
      const ingredientOpportunities = await buildIngredientOpportunities(
        glpk,
        prepared,
        constraints,
        solution,
        library,
      );
      return {
        status: "optimal",
        solution,
        nutrientProfile: buildNutrientProfile(solution.analysis, constraints),
        alternatives,
        ingredientOpportunities,
        alternativeCostTolerancePct: ALTERNATIVE_COST_TOLERANCE_PCT,
        ingredientOpportunityCostTolerancesPct:
          INGREDIENT_OPPORTUNITY_COST_TOLERANCES_PCT,
        unsupportedRequirements,
      };
    }

    const diagnostic = await solveDiagnostic(glpk, prepared, constraints);
    if (diagnostic.status !== "optimal") {
      return {
        status: "infeasible",
        diagnostics: [],
        unsupportedRequirements,
        message:
          "No feasible diet was found within the ingredient bounds, and the diagnostic model could not produce a best-effort solution.",
      };
    }

    const bestEffort = buildSolution(diagnostic.vars, prepared, library);
    return {
      status: "infeasible",
      diagnostics: describeDiagnostics(bestEffort.analysis, constraints),
      bestEffort,
      unsupportedRequirements,
      message:
        "No exact least-cost diet satisfies all modeled hard constraints. The diagnostic diet minimizes relative nutrient deviations.",
    };
  } catch (error) {
    return {
      status: "error",
      unsupportedRequirements,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Build a phase-aware priced candidate basket for the formulation workbench.
 *
 * Candidates must have both:
 * - complete data for every hard nutrient constraint; and
 * - a planning price.
 *
 * GLPK uses those planning prices to verify that the candidate pool contains a
 * feasible least-cost solution. We deliberately retain every other complete,
 * priced candidate as an alternative instead of collapsing the workbench to
 * the ingredients used by that one default-price optimum. This lets the final
 * formulation react when the farmer edits prices.
 */
export async function suggestFormulationIngredients(
  phase: NutritionPhase,
  energySystem: EnergySystem,
  library: IngredientLibrary = INGREDIENT_LIBRARY,
  priceForIngredient: FormulationIngredientPriceResolver = ingredientDefaultPricePerKg,
): Promise<FormulationIngredientSuggestionResult> {
  const unsupportedRequirements = unsupportedRequirementsForPhase(phase);

  try {
    const constraints = buildConstraintSpecs(phase, energySystem);
    const options: FormulationIngredientOption[] = library.ingredients.flatMap(
      (ingredient) => {
        const pricePerKg = priceForIngredient(ingredient.id);
        if (
          pricePerKg === undefined ||
          !Number.isFinite(pricePerKg) ||
          pricePerKg < 0
        ) {
          return [];
        }
        return [{ ingredientId: ingredient.id, pricePerKg }];
      },
    );
    const prepared = prepareIngredients(options, constraints, library).filter(
      (ingredient) =>
        constraints.every((constraint) =>
          ingredient.coefficients.has(constraint.id),
        ),
    );

    if (prepared.length === 0) {
      return {
        status: "error",
        candidateCount: 0,
        unsupportedRequirements,
        message:
          "No loaded ingredient has both a planning price and complete data for every modeled formulation constraint.",
      };
    }

    const glpk = await loadGlpk();
    const strict = await solveStrict(glpk, prepared, constraints);
    if (strict.status !== "optimal") {
      return {
        status: "infeasible",
        candidateCount: prepared.length,
        unsupportedRequirements,
        message:
          "No feasible starter basket could be found from the complete, priced ingredient pool.",
      };
    }

    const solution = buildSolution(strict.vars, prepared, library);
    const usedIngredientIds = solution.formula.ingredients.map(
      (ingredient) => ingredient.ingredientId,
    );
    const used = new Set(usedIngredientIds);
    const alternativeIngredientIds = prepared
      .map((ingredient) => ingredient.option.ingredientId)
      .filter((ingredientId) => !used.has(ingredientId));

    return {
      status: "suggested",
      ingredientIds: [...usedIngredientIds, ...alternativeIngredientIds],
      candidateCount: prepared.length,
      unsupportedRequirements,
    };
  } catch (error) {
    return {
      status: "error",
      candidateCount: 0,
      unsupportedRequirements,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

function buildConstraintSpecs(
  phase: NutritionPhase,
  energySystem: EnergySystem,
  settings: FormulationSettings = {},
): ConstraintSpec[] {
  const selectedEnergyKcalKg =
    energySystem === "ME"
      ? phase.requirements.metabolizableEnergyKcalKg
      : phase.requirements.netEnergyKcalKg;
  const targets = resolveNutritionTargets(phase, {
    system: energySystem,
    kcalKg: selectedEnergyKcalKg,
  });
  const constraints: ConstraintSpec[] = [
    {
      id: `energy-${energySystem.toLowerCase()}`,
      label: energySystem === "ME" ? "Metabolizable energy" : "Net energy",
      unit: "kcal/kg",
      relation: "min",
      bound: selectedEnergyKcalKg,
      measure: (analysis) =>
        energySystem === "ME"
          ? analysis.energy.metabolizableKcalKg
          : analysis.energy.netKcalKg,
    },
    {
      id: "sid-lysine",
      label: "SID lysine",
      unit: "%",
      relation: "min",
      bound: targets.aminoAcids.sidLysinePct,
      measure: (analysis) => analysis.sidAminoAcidsPct.lysine,
    },
    {
      id: "sid-met-cys",
      label: "SID methionine + cysteine",
      unit: "%",
      relation: "min",
      bound: targets.aminoAcids.sidMethionineCysteinePct,
      measure: (analysis) => analysis.sidAminoAcidsPct.methionineCysteine,
    },
    {
      id: "sid-threonine",
      label: "SID threonine",
      unit: "%",
      relation: "min",
      bound: targets.aminoAcids.sidThreoninePct,
      measure: (analysis) => analysis.sidAminoAcidsPct.threonine,
    },
    {
      id: "sid-tryptophan",
      label: "SID tryptophan",
      unit: "%",
      relation: "min",
      bound: targets.aminoAcids.sidTryptophanPct,
      measure: (analysis) => analysis.sidAminoAcidsPct.tryptophan,
    },
    {
      id: "sid-valine",
      label: "SID valine",
      unit: "%",
      relation: "min",
      bound: targets.aminoAcids.sidValinePct,
      measure: (analysis) => analysis.sidAminoAcidsPct.valine,
    },
    {
      id: "sid-isoleucine",
      label: "SID isoleucine",
      unit: "%",
      relation: "min",
      bound: targets.aminoAcids.sidIsoleucinePct,
      measure: (analysis) => analysis.sidAminoAcidsPct.isoleucine,
    },
    {
      id: "sid-leucine",
      label: "SID leucine",
      unit: "%",
      relation: "min",
      bound: targets.aminoAcids.sidLeucinePct,
      measure: (analysis) => analysis.sidAminoAcidsPct.leucine,
    },
    {
      id: "sid-histidine",
      label: "SID histidine",
      unit: "%",
      relation: "min",
      bound: targets.aminoAcids.sidHistidinePct,
      measure: (analysis) => analysis.sidAminoAcidsPct.histidine,
    },
    {
      id: "sid-phe-tyr",
      label: "SID phenylalanine + tyrosine",
      unit: "%",
      relation: "min",
      bound: targets.aminoAcids.sidPhenylalanineTyrosinePct,
      measure: (analysis) => analysis.sidAminoAcidsPct.phenylalanineTyrosine,
    },
    {
      id: "sodium",
      label: "Sodium",
      unit: "%",
      relation: "min",
      bound: targets.minerals.sodiumPct,
      measure: (analysis) => analysis.minerals.sodiumPct,
    },
  ];

  if (targets.crudeProteinPct !== undefined) {
    constraints.push({
      id: "crude-protein",
      label: "Crude protein",
      unit: "%",
      relation: "min",
      bound: targets.crudeProteinPct,
      measure: (analysis) => analysis.crudeProteinPct,
    });
  }

  if (targets.digestibleProteinPct !== undefined) {
    constraints.push({
      id: "digestible-protein",
      label: "Digestible protein (swine SID)",
      unit: "%",
      relation: "min",
      bound: targets.digestibleProteinPct,
      measure: (analysis) => analysis.digestibleProteinPct,
    });
  }

  if (targets.potassiumPct !== undefined) {
    constraints.push({
      id: "potassium",
      label: "Potassium",
      unit: "%",
      relation: "min",
      bound: targets.potassiumPct,
      measure: (analysis) => analysis.minerals.potassiumPct,
    });
  }

  if (targets.minerals.calciumPct !== undefined) {
    constraints.push({
      id: "calcium",
      label: "Calcium",
      unit: "%",
      relation: "min",
      bound: targets.minerals.calciumPct,
      measure: (analysis) => analysis.minerals.calciumPct,
    });
  }

  if (targets.minerals.sttdPhosphorusPct !== undefined) {
    constraints.push({
      id: "sttd-phosphorus",
      label: "Standardized digestible phosphorus",
      unit: "%",
      relation: "min",
      bound: targets.minerals.sttdPhosphorusPct,
      measure: (analysis) => analysis.minerals.sttdPhosphorusPct,
    });
  }

  if (targets.minerals.availablePhosphorusPct !== undefined) {
    constraints.push({
      id: "available-phosphorus",
      label: "Available phosphorus",
      unit: "%",
      relation: "min",
      bound: targets.minerals.availablePhosphorusPct,
      measure: (analysis) => analysis.minerals.availablePhosphorusPct,
    });
  }

  if (targets.minerals.chloridePct !== undefined) {
    constraints.push({
      id: "chloride",
      label: "Chloride",
      unit: "%",
      relation: "min",
      bound: targets.minerals.chloridePct,
      measure: (analysis) => analysis.minerals.chloridePct,
    });
  }

  if (phase.requirements.linoleicAcidPct !== undefined) {
    constraints.push({
      id: "linoleic-acid",
      label: "Linoleic acid",
      unit: "%",
      relation: "min",
      bound: phase.requirements.linoleicAcidPct,
      measure: (analysis) => analysis.fattyAcids.linoleicAcidPct,
    });
  }

  const practical = phase.requirements.practical;
  if (practical.neutralDetergentFibreMinPct !== undefined) {
    constraints.push({
      id: "neutral-detergent-fibre",
      label: "Neutral detergent fibre",
      unit: "%",
      relation: "min",
      bound: practical.neutralDetergentFibreMinPct,
      measure: (analysis) => analysis.neutralDetergentFibrePct,
    });
  }

  if (practical.lLysineHclMaxPct !== undefined) {
    constraints.push({
      id: "l-lysine-hcl",
      label: "L-lysine HCl inclusion",
      unit: "%",
      relation: "max",
      bound: practical.lLysineHclMaxPct,
      measure: (analysis) => ({
        value: analysis.lLysineHclPct,
        complete: true,
        missingIngredientIds: [],
      }),
    });
  }

  if (settings.includeSupplementationTargets && phase.supplementation) {
    const vitamins = phase.supplementation.vitamins;
    const vitaminConstraints: Array<{
      id: string;
      label: string;
      unit: string;
      bound: number;
      measure: (analysis: DietAnalysis) => AnalyzedNutrient;
    }> = [
      {
        id: "supplement-vitamin-a",
        label: "Supplemented vitamin A",
        unit: "IU/kg",
        bound: vitamins.vitaminAIuKg,
        measure: (analysis) => analysis.supplementation.vitamins.vitaminAIuKg,
      },
      {
        id: "supplement-vitamin-d3",
        label: "Supplemented vitamin D3",
        unit: "IU/kg",
        bound: vitamins.vitaminDIuKg,
        measure: (analysis) => analysis.supplementation.vitamins.vitaminDIuKg,
      },
      {
        id: "supplement-vitamin-e",
        label: "Supplemented vitamin E",
        unit: "IU/kg",
        bound: vitamins.vitaminEIuKg,
        measure: (analysis) => analysis.supplementation.vitamins.vitaminEIuKg,
      },
      {
        id: "supplement-vitamin-k3",
        label: "Supplemented vitamin K3",
        unit: "mg/kg",
        bound: vitamins.vitaminKMgKg,
        measure: (analysis) => analysis.supplementation.vitamins.vitaminKMgKg,
      },
      {
        id: "supplement-vitamin-b1",
        label: "Supplemented vitamin B1",
        unit: "mg/kg",
        bound: vitamins.vitaminB1MgKg,
        measure: (analysis) => analysis.supplementation.vitamins.vitaminB1MgKg,
      },
      {
        id: "supplement-vitamin-b2",
        label: "Supplemented vitamin B2",
        unit: "mg/kg",
        bound: vitamins.riboflavinMgKg,
        measure: (analysis) => analysis.supplementation.vitamins.riboflavinMgKg,
      },
      {
        id: "supplement-vitamin-b6",
        label: "Supplemented vitamin B6",
        unit: "mg/kg",
        bound: vitamins.vitaminB6MgKg,
        measure: (analysis) => analysis.supplementation.vitamins.vitaminB6MgKg,
      },
      {
        id: "supplement-vitamin-b12",
        label: "Supplemented vitamin B12",
        unit: "mcg/kg",
        bound: vitamins.vitaminB12McgKg,
        measure: (analysis) => analysis.supplementation.vitamins.vitaminB12McgKg,
      },
      {
        id: "supplement-pantothenic-acid",
        label: "Supplemented pantothenic acid",
        unit: "mg/kg",
        bound: vitamins.pantothenicAcidMgKg,
        measure: (analysis) => analysis.supplementation.vitamins.pantothenicAcidMgKg,
      },
      {
        id: "supplement-niacin",
        label: "Supplemented niacin",
        unit: "mg/kg",
        bound: vitamins.niacinMgKg,
        measure: (analysis) => analysis.supplementation.vitamins.niacinMgKg,
      },
      {
        id: "supplement-folic-acid",
        label: "Supplemented folic acid",
        unit: "mg/kg",
        bound: vitamins.folicAcidMgKg,
        measure: (analysis) => analysis.supplementation.vitamins.folicAcidMgKg,
      },
      {
        id: "supplement-biotin",
        label: "Supplemented biotin",
        unit: "mg/kg",
        bound: vitamins.biotinMgKg,
        measure: (analysis) => analysis.supplementation.vitamins.biotinMgKg,
      },
      {
        id: "supplement-choline",
        label: "Supplemented choline",
        unit: "mg/kg",
        bound: vitamins.totalCholineMgKg,
        measure: (analysis) => analysis.supplementation.vitamins.totalCholineMgKg,
      },
    ];
    constraints.push(
      ...vitaminConstraints.map((constraint) => ({
        ...constraint,
        relation: "min" as const,
      })),
    );

    const basis = settings.traceMineralBasis ?? "inorganic";
    const trace = phase.supplementation.traceMinerals[basis];
    const traceMeasures = [
      ["copper", "Copper", trace.copperPpm, (analysis: DietAnalysis) => analysis.supplementation.traceMineralsPpm.copper],
      ["iron", "Iron", trace.ironPpm, (analysis: DietAnalysis) => analysis.supplementation.traceMineralsPpm.iron],
      ["manganese", "Manganese", trace.manganesePpm, (analysis: DietAnalysis) => analysis.supplementation.traceMineralsPpm.manganese],
      ["selenium", "Selenium", trace.seleniumPpm, (analysis: DietAnalysis) => analysis.supplementation.traceMineralsPpm.selenium],
      ["zinc", "Zinc", trace.zincPpm, (analysis: DietAnalysis) => analysis.supplementation.traceMineralsPpm.zinc],
      ["iodine", "Iodine", trace.iodinePpm, (analysis: DietAnalysis) => analysis.supplementation.traceMineralsPpm.iodine],
    ] as const;
    for (const [id, label, bound, measure] of traceMeasures) {
      if (bound === undefined) continue;
      constraints.push({
        id: `supplement-${id}`,
        label: `Supplemented ${label.toLowerCase()}`,
        unit: "ppm",
        relation: "min",
        bound,
        measure,
      });
    }
  }

  return constraints;
}

function prepareIngredients(
  options: readonly FormulationIngredientOption[],
  constraints: readonly ConstraintSpec[],
  library: IngredientLibrary,
): PreparedIngredient[] {
  return options.map((option, index) => {
    const ingredient = library.ingredients.find(
      (candidate) => candidate.id === option.ingredientId,
    );
    if (!ingredient) {
      throw new Error(`Unknown ingredient: ${option.ingredientId}.`);
    }

    const sourceMin = ingredient.constraints.minInclusionPct ?? 0;
    const sourceMax = ingredient.constraints.maxInclusionPct ?? 100;
    const requestedMin = option.minInclusionPct ?? 0;
    const requestedMax = option.maxInclusionPct ?? 100;
    const minPct = Math.max(sourceMin, requestedMin);
    const maxPct = Math.min(sourceMax, requestedMax);

    if (minPct > maxPct) {
      throw new Error(
        `Ingredient ${ingredient.name} has incompatible inclusion bounds: minimum ${minPct}% exceeds maximum ${maxPct}%.`,
      );
    }

    const single = analyzeDiet(
      { ingredients: [{ ingredientId: option.ingredientId, inclusionPct: 100 }] },
      [],
      library,
    );

    const coefficients = new Map<string, number>();
    for (const constraint of constraints) {
      const measure = constraint.measure(single);
      if (measure.complete) {
        coefficients.set(constraint.id, measure.value);
      }
    }

    return {
      option,
      variable: `x_${index}`,
      minFraction: minPct / 100,
      maxFraction: maxPct / 100,
      coefficients,
    };
  });
}

function collectMissingData(
  ingredients: readonly PreparedIngredient[],
  constraints: readonly ConstraintSpec[],
): FormulationMissingData[] {
  return ingredients.flatMap((ingredient) => {
    const nutrientIds = constraints
      .filter((constraint) => !ingredient.coefficients.has(constraint.id))
      .map((constraint) => constraint.id);
    return nutrientIds.length > 0
      ? [{ ingredientId: ingredient.option.ingredientId, nutrientIds }]
      : [];
  });
}

async function solveStrict(
  glpk: GLPK,
  ingredients: readonly PreparedIngredient[],
  constraints: readonly ConstraintSpec[],
): Promise<{ status: "optimal"; vars: Record<string, number> } | { status: "infeasible" }> {
  const {
    GLP_DB,
    GLP_FX,
    GLP_LO,
    GLP_MIN,
    GLP_MSG_OFF,
    GLP_OPT,
  } = glpk;

  const lp = {
    name: "PigFlowLeastCostDiet",
    objective: {
      direction: GLP_MIN,
      name: "cost_per_kg",
      vars: ingredients.map((ingredient) => ({
        name: ingredient.variable,
        coef: ingredient.option.pricePerKg,
      })),
    },
    subjectTo: [
      {
        name: "total_inclusion",
        vars: ingredients.map((ingredient) => ({
          name: ingredient.variable,
          coef: 1,
        })),
        bnds: { type: GLP_FX, lb: 1, ub: 1 },
      },
      ...constraints.map((constraint) => ({
        name: `nutrient_${constraint.id}`,
        vars: ingredients.map((ingredient) => ({
          name: ingredient.variable,
          coef: ingredient.coefficients.get(constraint.id) ?? 0,
        })),
        bnds:
          constraint.relation === "min"
            ? { type: GLP_LO, lb: constraint.bound, ub: 0 }
            : { type: glpk.GLP_UP, lb: 0, ub: constraint.bound },
      })),
    ],
    bounds: ingredients.map((ingredient) => ({
      name: ingredient.variable,
      type:
        Math.abs(ingredient.minFraction - ingredient.maxFraction) <= 1e-12
          ? GLP_FX
          : GLP_DB,
      lb: ingredient.minFraction,
      ub: ingredient.maxFraction,
    })),
  };

  const result = await glpk.solve(lp, {
    msglev: GLP_MSG_OFF,
    presol: true,
  });

  if (result.result.status !== GLP_OPT) {
    return { status: "infeasible" };
  }

  return { status: "optimal", vars: result.result.vars };
}


type LinearObjective = {
  name: string;
  coefficient: (ingredient: PreparedIngredient) => number;
};

async function solveAlternativeObjective(
  glpk: GLPK,
  ingredients: readonly PreparedIngredient[],
  constraints: readonly ConstraintSpec[],
  objective: LinearObjective,
  costCapPerKg: number,
): Promise<{ status: "optimal"; vars: Record<string, number> } | { status: "infeasible" }> {
  const {
    GLP_DB,
    GLP_FX,
    GLP_LO,
    GLP_MIN,
    GLP_MSG_OFF,
    GLP_OPT,
    GLP_UP,
  } = glpk;

  const lp = {
    name: `PigFlowAlternative_${objective.name}`,
    objective: {
      direction: GLP_MIN,
      name: objective.name,
      vars: ingredients.map((ingredient) => ({
        name: ingredient.variable,
        // A tiny cost term resolves ties without changing the requested strategy.
        coef:
          objective.coefficient(ingredient) +
          ingredient.option.pricePerKg * 1e-8,
      })),
    },
    subjectTo: [
      {
        name: "total_inclusion",
        vars: ingredients.map((ingredient) => ({
          name: ingredient.variable,
          coef: 1,
        })),
        bnds: { type: GLP_FX, lb: 1, ub: 1 },
      },
      {
        name: "alternative_cost_cap",
        vars: ingredients.map((ingredient) => ({
          name: ingredient.variable,
          coef: ingredient.option.pricePerKg,
        })),
        bnds: { type: GLP_UP, lb: 0, ub: costCapPerKg },
      },
      ...constraints.map((constraint) => ({
        name: `nutrient_${constraint.id}`,
        vars: ingredients.map((ingredient) => ({
          name: ingredient.variable,
          coef: ingredient.coefficients.get(constraint.id) ?? 0,
        })),
        bnds:
          constraint.relation === "min"
            ? { type: GLP_LO, lb: constraint.bound, ub: 0 }
            : { type: GLP_UP, lb: 0, ub: constraint.bound },
      })),
    ],
    bounds: ingredients.map((ingredient) => ({
      name: ingredient.variable,
      type:
        Math.abs(ingredient.minFraction - ingredient.maxFraction) <= 1e-12
          ? GLP_FX
          : GLP_DB,
      lb: ingredient.minFraction,
      ub: ingredient.maxFraction,
    })),
  };

  const result = await glpk.solve(lp, {
    msglev: GLP_MSG_OFF,
    presol: true,
  });

  if (result.result.status !== GLP_OPT) {
    return { status: "infeasible" };
  }

  return { status: "optimal", vars: result.result.vars };
}

function buildNutrientProfile(
  analysis: DietAnalysis,
  constraints: readonly ConstraintSpec[],
): FormulationNutrientComparison[] {
  return constraints.flatMap((constraint) => {
    const measure = constraint.measure(analysis);
    if (!measure.complete) return [];

    const actual = measure.value;
    const margin =
      constraint.relation === "min"
        ? actual - constraint.bound
        : constraint.bound - actual;
    const scale = Math.max(Math.abs(constraint.bound), 1e-9);
    const bindingTolerance = Math.max(scale * 1e-5, 1e-7);

    return [
      {
        id: constraint.id,
        label: constraint.label,
        unit: constraint.unit,
        relation: constraint.relation,
        requirement: constraint.bound,
        actual,
        margin,
        marginPct:
          Math.abs(constraint.bound) <= 1e-12
            ? null
            : (margin / Math.abs(constraint.bound)) * 100,
        binding: Math.abs(margin) <= bindingTolerance,
      },
    ];
  });
}

function costIncreasePct(
  alternative: FormulationSolution,
  optimum: FormulationSolution,
): number {
  if (optimum.costPerKg <= 0) return 0;
  return Math.max(
    0,
    ((alternative.costPerKg / optimum.costPerKg) - 1) * 100,
  );
}

function importBurden(ingredientId: string): number {
  const scope = ingredientDefaultPrice(ingredientId)?.sourceScope;
  if (scope === "global-fallback") return 2;
  if (scope === "regional") return 1;
  if (scope === "harare" || scope === "zimbabwe") return 0;
  // Unknown origin should not be rewarded as though it were verified local.
  return 1;
}

function sameFormula(
  a: FormulationSolution,
  b: FormulationSolution,
): boolean {
  const byId = new Map(
    a.formula.ingredients.map((row) => [row.ingredientId, row.inclusionPct]),
  );
  const ids = new Set([
    ...a.formula.ingredients.map((row) => row.ingredientId),
    ...b.formula.ingredients.map((row) => row.ingredientId),
  ]);
  return [...ids].every(
    (id) =>
      Math.abs(
        (byId.get(id) ?? 0) -
          (b.formula.ingredients.find((row) => row.ingredientId === id)
            ?.inclusionPct ?? 0),
      ) < 0.01,
  );
}

async function buildSimplerAlternative(
  glpk: GLPK,
  ingredients: readonly PreparedIngredient[],
  constraints: readonly ConstraintSpec[],
  optimum: FormulationSolution,
  costCapPerKg: number,
  library: IngredientLibrary,
): Promise<FormulationSolution | undefined> {
  let active = [...ingredients];
  let solved = await solveAlternativeObjective(
    glpk,
    active,
    constraints,
    {
      name: "simplify_cost",
      coefficient: (ingredient) => ingredient.option.pricePerKg,
    },
    costCapPerKg,
  );
  if (solved.status !== "optimal") return undefined;

  let current = buildSolution(solved.vars, active, library);

  while (true) {
    const removable = current.formula.ingredients
      .map((row) => ({
        ...row,
        prepared: active.find(
          (ingredient) => ingredient.option.ingredientId === row.ingredientId,
        ),
      }))
      .filter((row) => (row.prepared?.minFraction ?? 0) <= 1e-12)
      .sort((a, b) => a.inclusionPct - b.inclusionPct);

    let removed = false;
    for (const row of removable) {
      const trialIngredients = active.filter(
        (ingredient) => ingredient.option.ingredientId !== row.ingredientId,
      );
      if (trialIngredients.length === 0) continue;

      const trial = await solveAlternativeObjective(
        glpk,
        trialIngredients,
        constraints,
        {
          name: "simplify_cost",
          coefficient: (ingredient) => ingredient.option.pricePerKg,
        },
        costCapPerKg,
      );
      if (trial.status !== "optimal") continue;

      active = trialIngredients;
      current = buildSolution(trial.vars, active, library);
      removed = true;
      break;
    }

    if (!removed) break;
  }

  return sameFormula(current, optimum) ? undefined : current;
}

async function buildIngredientOpportunities(
  glpk: GLPK,
  ingredients: readonly PreparedIngredient[],
  constraints: readonly ConstraintSpec[],
  optimum: FormulationSolution,
  library: IngredientLibrary,
): Promise<IngredientOpportunity[]> {
  const optimumInclusion = new Map(
    optimum.formula.ingredients.map((row) => [
      row.ingredientId,
      row.inclusionPct,
    ]),
  );
  const opportunities: IngredientOpportunity[] = [];

  for (const target of ingredients) {
    const ingredientId = target.option.ingredientId;
    const currentInclusionPct = optimumInclusion.get(ingredientId) ?? 0;

    // Opportunities answer "what unused ingredient could I introduce?"
    if (currentInclusionPct > 1e-5) continue;

    const points: IngredientOpportunityPoint[] = [];
    for (const costTolerancePct of INGREDIENT_OPPORTUNITY_COST_TOLERANCES_PCT) {
      const costCapPerKg =
        optimum.costPerKg * (1 + costTolerancePct / 100);
      const solved = await solveAlternativeObjective(
        glpk,
        ingredients,
        constraints,
        {
          name: `maximize_${ingredientId.replace(/[^a-zA-Z0-9_]/g, "_")}`,
          coefficient: (ingredient) =>
            ingredient.option.ingredientId === ingredientId ? -1 : 0,
        },
        costCapPerKg,
      );
      if (solved.status !== "optimal") continue;

      const solution = buildSolution(solved.vars, ingredients, library);
      const maxInclusionPct =
        solution.formula.ingredients.find(
          (row) => row.ingredientId === ingredientId,
        )?.inclusionPct ?? 0;

      points.push({
        costTolerancePct,
        maxInclusionPct,
        resultingCostPerKg: solution.costPerKg,
        recipe: {
          formula: solution.formula,
          costPerKg: solution.costPerKg,
        },
      });
    }

    if (
      points.some((point) => point.maxInclusionPct > 0.01)
    ) {
      opportunities.push({
        ingredientId,
        currentInclusionPct,
        points,
      });
    }
  }

  return opportunities.sort((a, b) => {
    const aMax = a.points.at(-1)?.maxInclusionPct ?? 0;
    const bMax = b.points.at(-1)?.maxInclusionPct ?? 0;
    return bMax - aMax;
  });
}

async function buildAlternativeFormulations(
  glpk: GLPK,
  ingredients: readonly PreparedIngredient[],
  constraints: readonly ConstraintSpec[],
  optimum: FormulationSolution,
  library: IngredientLibrary,
): Promise<FormulationAlternative[]> {
  const costCapPerKg =
    optimum.costPerKg * (1 + ALTERNATIVE_COST_TOLERANCE_PCT / 100);
  const alternatives: FormulationAlternative[] = [];

  const strategies: Array<{
    id: Exclude<FormulationAlternativeKind, "simple">;
    label: string;
    description: string;
    objective: LinearObjective;
  }> = [
    {
      id: "low-soy",
      label: "Lower soy",
      description: "Minimizes total soybean-meal inclusion within the cost ceiling.",
      objective: {
        name: "low_soy",
        coefficient: (ingredient) =>
          ingredient.option.ingredientId.startsWith("soybean-meal-") ? 1 : 0,
      },
    },
    {
      id: "low-import",
      label: "Lower imports",
      description:
        "Prefers local ingredients, penalizing global imports more heavily than regional imports.",
      objective: {
        name: "low_import",
        coefficient: (ingredient) =>
          importBurden(ingredient.option.ingredientId),
      },
    },
  ];

  for (const strategy of strategies) {
    const solved = await solveAlternativeObjective(
      glpk,
      ingredients,
      constraints,
      strategy.objective,
      costCapPerKg,
    );
    if (solved.status !== "optimal") continue;

    const solution = buildSolution(solved.vars, ingredients, library);
    if (
      sameFormula(solution, optimum) ||
      alternatives.some((alternative) =>
        sameFormula(alternative.solution, solution),
      )
    ) {
      continue;
    }

    alternatives.push({
      id: strategy.id,
      label: strategy.label,
      description: strategy.description,
      solution,
      nutrientProfile: buildNutrientProfile(solution.analysis, constraints),
      costIncreasePct: costIncreasePct(solution, optimum),
    });
  }

  const simpler = await buildSimplerAlternative(
    glpk,
    ingredients,
    constraints,
    optimum,
    costCapPerKg,
    library,
  );
  if (
    simpler &&
    !alternatives.some((alternative) =>
      sameFormula(alternative.solution, simpler),
    )
  ) {
    alternatives.push({
      id: "simple",
      label: "Simpler recipe",
      description:
        "Greedily removes dispensable ingredients while keeping hard constraints and the cost ceiling.",
      solution: simpler,
      nutrientProfile: buildNutrientProfile(simpler.analysis, constraints),
      costIncreasePct: costIncreasePct(simpler, optimum),
    });
  }

  return alternatives;
}

async function solveDiagnostic(
  glpk: GLPK,
  ingredients: readonly PreparedIngredient[],
  constraints: readonly ConstraintSpec[],
): Promise<{ status: "optimal"; vars: Record<string, number> } | { status: "infeasible" }> {
  const {
    GLP_DB,
    GLP_FX,
    GLP_LO,
    GLP_MIN,
    GLP_MSG_OFF,
    GLP_OPT,
    GLP_UP,
  } = glpk;

  const deviationVars = constraints.map((constraint) => {
    const name = `deviation_${constraint.id}`;
    const scale = Math.max(Math.abs(constraint.bound), 1e-9);
    return { name, coef: 1 / scale };
  });

  const lp = {
    name: "PigFlowFormulationDiagnostic",
    objective: {
      direction: GLP_MIN,
      name: "relative_nutrient_deviation",
      vars: [
        ...deviationVars,
        // Resolve ties between equally deficient diets in favour of lower cost
        // without allowing cost to outweigh nutrient feasibility.
        ...ingredients.map((ingredient) => ({
          name: ingredient.variable,
          coef: ingredient.option.pricePerKg * 1e-9,
        })),
      ],
    },
    subjectTo: [
      {
        name: "total_inclusion",
        vars: ingredients.map((ingredient) => ({
          name: ingredient.variable,
          coef: 1,
        })),
        bnds: { type: GLP_FX, lb: 1, ub: 1 },
      },
      ...constraints.map((constraint) => ({
        name: `nutrient_${constraint.id}`,
        vars: [
          ...ingredients.map((ingredient) => ({
            name: ingredient.variable,
            coef: ingredient.coefficients.get(constraint.id) ?? 0,
          })),
          {
            name: `deviation_${constraint.id}`,
            coef: constraint.relation === "min" ? 1 : -1,
          },
        ],
        bnds:
          constraint.relation === "min"
            ? { type: GLP_LO, lb: constraint.bound, ub: 0 }
            : { type: GLP_UP, lb: 0, ub: constraint.bound },
      })),
    ],
    bounds: [
      ...ingredients.map((ingredient) => ({
        name: ingredient.variable,
        type:
          Math.abs(ingredient.minFraction - ingredient.maxFraction) <= 1e-12
            ? GLP_FX
            : GLP_DB,
        lb: ingredient.minFraction,
        ub: ingredient.maxFraction,
      })),
      ...constraints.map((constraint) => ({
        name: `deviation_${constraint.id}`,
        type: GLP_LO,
        lb: 0,
        ub: 0,
      })),
    ],
  };

  const result = await glpk.solve(lp, {
    msglev: GLP_MSG_OFF,
    presol: true,
  });

  if (result.result.status !== GLP_OPT) {
    return { status: "infeasible" };
  }

  return { status: "optimal", vars: result.result.vars };
}

function buildSolution(
  vars: Record<string, number>,
  ingredients: readonly PreparedIngredient[],
  library: IngredientLibrary,
): FormulationSolution {
  const rows = ingredients
    .map((ingredient) => ({
      ingredientId: ingredient.option.ingredientId,
      inclusionPct: Math.max(0, vars[ingredient.variable] ?? 0) * 100,
    }))
    .filter((row) => row.inclusionPct > 1e-7);

  // GLPK floating-point output can be microscopically off 100. Normalize once,
  // then let analyzeDiet independently recompute every modeled nutrient.
  const total = rows.reduce((sum, row) => sum + row.inclusionPct, 0);
  const formula: DietFormula = {
    ingredients: rows.map((row) => ({
      ...row,
      inclusionPct: (row.inclusionPct / total) * 100,
    })),
  };
  const prices: IngredientPrice[] = ingredients.map((ingredient) => ({
    ingredientId: ingredient.option.ingredientId,
    pricePerKg: ingredient.option.pricePerKg,
  }));
  const analysis = analyzeDiet(formula, prices, library);

  if (analysis.costPerKg === undefined) {
    throw new Error("Optimizer returned a diet with an unresolved ingredient price.");
  }

  return {
    formula,
    costPerKg: analysis.costPerKg,
    analysis,
  };
}

function describeDiagnostics(
  analysis: DietAnalysis,
  constraints: readonly ConstraintSpec[],
): FormulationDiagnostic[] {
  return constraints.flatMap((constraint) => {
    const measure = constraint.measure(analysis);
    if (!measure.complete) return [];

    const actual = measure.value;
    const shortfall =
      constraint.relation === "min"
        ? Math.max(0, constraint.bound - actual)
        : 0;
    const excess =
      constraint.relation === "max"
        ? Math.max(0, actual - constraint.bound)
        : 0;

    if (shortfall <= 1e-7 && excess <= 1e-7) return [];

    return [
      {
        constraintId: constraint.id,
        label: constraint.label,
        unit: constraint.unit,
        relation: constraint.relation,
        bound: constraint.bound,
        actual,
        shortfall,
        excess,
      },
    ];
  });
}

function validateOptions(
  options: readonly FormulationIngredientOption[],
  library: IngredientLibrary,
): void {
  const seen = new Set<string>();
  for (const option of options) {
    if (seen.has(option.ingredientId)) {
      throw new Error(`Duplicate ingredient option: ${option.ingredientId}.`);
    }
    seen.add(option.ingredientId);

    if (!library.ingredients.some((ingredient) => ingredient.id === option.ingredientId)) {
      throw new Error(`Unknown ingredient: ${option.ingredientId}.`);
    }
    if (!Number.isFinite(option.pricePerKg) || option.pricePerKg < 0) {
      throw new Error(
        `Ingredient ${option.ingredientId} must have a non-negative finite price per kg.`,
      );
    }
    for (const [label, value] of [
      ["minimum", option.minInclusionPct],
      ["maximum", option.maxInclusionPct],
    ] as const) {
      if (
        value !== undefined &&
        (!Number.isFinite(value) || value < 0 || value > 100)
      ) {
        throw new Error(
          `Ingredient ${option.ingredientId} has an invalid ${label} inclusion: ${value}%.`,
        );
      }
    }
  }
}

async function loadGlpk(): Promise<GLPK> {
  const module = await import("glpk.js");
  return module.default();
}

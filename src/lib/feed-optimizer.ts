type GLPK = Awaited<ReturnType<typeof import("glpk.js/node")["default"]>>;

import {
  analyzeDiet,
  type AnalyzedNutrient,
  type DietAnalysis,
  type DietFormula,
  type IngredientPrice,
} from "./diet-formula";
import {
  INGREDIENT_LIBRARY,
  SOYBEAN_MEAL_FAMILY_ID,
  type IngredientLibrary,
} from "./ingredient-nutrients";
import {
  ingredientDefaultPrice,
  ingredientDefaultPricePerKg,
} from "./feed-ingredient-prices";
import {
  aggregateInclusionRules,
  aggregateLabel,
  describeAggregateSource,
  describeMaxSource,
  effectiveInclusionLimits,
  type AggregateInclusionRule,
} from "./ingredient-inclusion-limits";
import { resolveNutritionTargets, type EnergySystem } from "./nutrition-targets";
import type { NutritionPhase } from "./nutrition";
import type { FormulationAssessment } from "./formulation-assessment-model";

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
  | "calcium-phosphorus-ratio";

export type FormulationRunOptions = {
  /**
   * Also search the 3%-cost alternatives and ingredient opportunities. Off
   * for comparison re-runs (e.g. premix replacement), which need only the
   * least-cost recipe.
   */
  explore?: boolean;
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
  assessment?: FormulationAssessment;
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
      /** Separate from LP feasibility; API callers attach the full assessment. */
      assessment?: FormulationAssessment;
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
      assessment?: FormulationAssessment;
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

export type FormulationIngredientCompletionResult =
  | {
      status: "suggested" | "complete";
      /** The smallest set of extra ingredients needed alongside the current pool. */
      ingredientIds: string[];
      /** Inclusion from the feasibility model, useful for ranking—not a final recipe. */
      projectedInclusionPct: Record<string, number>;
      candidateCount: number;
      /** Current ingredients the studio will set aside because required data is missing. */
      setAsideIngredientIds: string[];
      unsupportedRequirements: FormulationUnsupportedRequirement[];
    }
  | {
      status: "infeasible" | "error";
      candidateCount: number;
      setAsideIngredientIds: string[];
      unsupportedRequirements: FormulationUnsupportedRequirement[];
      message: string;
    };

export type FormulationIncompleteRequirement = {
  id: string;
  label: string;
  unit: string;
  relation: "min" | "max";
  requirement: number;
  missingIngredientIds: string[];
};

export type FormulationEvaluation = {
  analysis: DietAnalysis;
  nutrientProfile: FormulationNutrientComparison[];
  /** Modeled constraints that cannot be checked because ingredient data is missing. */
  incompleteRequirements: FormulationIncompleteRequirement[];
  unsupportedRequirements: FormulationUnsupportedRequirement[];
};

export type FormulationRequirement = {
  id: string;
  label: string;
  unit: string;
  relation: "min" | "max";
  bound: number;
};

/**
 * The hard constraints the optimizer enforces for a phase, so callers can
 * publish exactly what formulation and evaluation are checked against.
 * Brazilian Tables Chapter 7 supplementation guidance is advisory and is
 * never part of this list; see formulation-assessment.
 */
export function formulationRequirements(
  phase: NutritionPhase,
  energySystem: EnergySystem,
): FormulationRequirement[] {
  return buildConstraintSpecs(phase, energySystem).map(
    ({ id, label, unit, relation, bound }) => ({ id, label, unit, relation, bound }),
  );
}

/**
 * Re-evaluate an existing formula against the same constraints used by the
 * optimizer. Reports use this server-side so their nutrient results never
 * depend on values supplied by the browser.
 */
export function evaluateFormulation(
  phase: NutritionPhase,
  energySystem: EnergySystem,
  formula: DietFormula,
  library: IngredientLibrary = INGREDIENT_LIBRARY,
): FormulationEvaluation {
  const constraints = buildConstraintSpecs(phase, energySystem);
  const analysis = analyzeDiet(formula, [], library);
  return {
    analysis,
    nutrientProfile: buildNutrientProfile(analysis, constraints),
    incompleteRequirements: constraints.flatMap((constraint) => {
      const measure = constraint.measure(analysis);
      if (measure.complete) return [];
      return [
        {
          id: constraint.id,
          label: constraint.label,
          unit: constraint.unit,
          relation: constraint.relation,
          requirement: constraint.bound,
          missingIngredientIds: measure.missingIngredientIds,
        },
      ];
    }),
    unsupportedRequirements: unsupportedRequirementsForPhase(phase),
  };
}

/**
 * GLPK feasibility and independently recomputed nutrient totals may differ
 * microscopically at binding constraints. Match the existing 1e-5 relative
 * binding-window convention, while retaining a small absolute floor for
 * targets close to zero. Never use display rounding as a feasibility rule.
 */
export function nutrientFeasibilityTolerance(bound: number): number {
  return Math.max(Math.abs(bound) * 1e-5, 1e-7);
}

export type ConstraintSpec = {
  id: string;
  label: string;
  unit: string;
  relation: "min" | "max";
  bound: number;
  measure: (analysis: DietAnalysis) => AnalyzedNutrient;
};

export type PreparedIngredient = {
  option: FormulationIngredientOption;
  variable: string;
  familyId: string;
  minFraction: number;
  maxFraction: number;
  coefficients: Map<string, number>;
  /** Family and constraint-group ceilings this ingredient counts toward. */
  aggregateRules: readonly AggregateInclusionRule[];
};

export function unsupportedRequirementsForPhase(
  phase: NutritionPhase,
): FormulationUnsupportedRequirement[] {
  const unsupported: FormulationUnsupportedRequirement[] = [];
  if (phase.requirements.practical.calciumToTotalPhosphorusMinRatio !== undefined) {
    unsupported.push("calcium-phosphorus-ratio");
  }
  return unsupported;
}

/**
 * Least-cost formulation against Brazilian Tables requirements.
 *
 * Primary mode is deliberately strict: modeled nutrient constraints are hard
 * constraints. Every ingredient, commercial premixes included, contributes
 * through the same coefficients, so a premix that documents SID lysine
 * reduces the crystalline lysine the recipe needs. If no exact formulation exists, a second diagnostic LP adds
 * deviation variables and minimizes relative nutrient shortfall/excess so the
 * caller can explain what prevents feasibility.
 */
export async function formulateLeastCostDiet(
  phase: NutritionPhase,
  energySystem: EnergySystem,
  options: readonly FormulationIngredientOption[],
  library: IngredientLibrary = INGREDIENT_LIBRARY,
  { explore = true }: FormulationRunOptions = {},
): Promise<LeastCostFormulationResult> {
  const unsupportedRequirements = unsupportedRequirementsForPhase(phase);

  if (options.length === 0) {
    return {
      status: "error",
      unsupportedRequirements,
      message: "At least one available ingredient is required.",
    };
  }

  try {
    validateOptions(options, library);

    const constraints = buildConstraintSpecs(phase, energySystem);
    const prepared = prepareIngredients(options, constraints, library, phase);
    const missingData = collectMissingData(prepared, constraints);

    if (missingData.length > 0) {
      return {
        status: "missing-data",
        missingData,
        unsupportedRequirements,
        message:
          "Some selected ingredients are missing nutrient values required by the strict formulation model. FeedSport will not assume those values are zero.",
      };
    }

    const glpk = await loadGlpk();
    const strict = await solveStrict(glpk, prepared, constraints);

    if (strict.status === "optimal") {
      const solution = buildSolution(strict.vars, prepared, library);
      const alternatives = explore
        ? await buildAlternativeFormulations(glpk, prepared, constraints, solution, library)
        : [];
      const ingredientOpportunities = explore
        ? await buildIngredientOpportunities(glpk, prepared, constraints, solution, library)
        : [];
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
        // A commercial premix is chosen deliberately, never auto-suggested.
        if (ingredient.category === "vitamin_mineral_premix") return [];
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
    const prepared = prepareIngredients(options, constraints, library, phase).filter(
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

/**
 * Find the minimum number of catalogue ingredients that make an existing pool
 * feasible. Current bounds and prices are preserved. Other complete, priced
 * catalogue ingredients are optional binary choices in a mixed-integer model,
 * so this answers the setup screen's actual question: "what must I add to this
 * list?" rather than returning a generic stage basket.
 */
export async function suggestFormulationAdditions(
  phase: NutritionPhase,
  energySystem: EnergySystem,
  currentOptions: readonly FormulationIngredientOption[],
  library: IngredientLibrary = INGREDIENT_LIBRARY,
  priceForIngredient: FormulationIngredientPriceResolver = ingredientDefaultPricePerKg,
): Promise<FormulationIngredientCompletionResult> {
  const unsupportedRequirements = unsupportedRequirementsForPhase(phase);
  const currentIds = new Set(currentOptions.map((option) => option.ingredientId));

  try {
    validateOptions(currentOptions, library);
    const constraints = buildConstraintSpecs(phase, energySystem);
    const currentById = new Map(
      currentOptions.map((option) => [option.ingredientId, option]),
    );
    const options: FormulationIngredientOption[] = library.ingredients.flatMap(
      (ingredient) => {
        const current = currentById.get(ingredient.id);
        if (current) return [current];
        if (ingredient.category === "vitamin_mineral_premix") return [];
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
    const allPrepared = prepareIngredients(options, constraints, library, phase);
    const missing = collectMissingData(allPrepared, constraints);
    const missingIds = new Set(missing.map((row) => row.ingredientId));
    const setAsideIngredientIds = currentOptions
      .map((option) => option.ingredientId)
      .filter((id) => missingIds.has(id));
    const prepared = allPrepared.filter(
      (ingredient) => !missingIds.has(ingredient.option.ingredientId),
    );

    if (prepared.length === 0) {
      return {
        status: "error",
        candidateCount: 0,
        setAsideIngredientIds,
        unsupportedRequirements,
        message:
          "No loaded ingredient has both a planning price and complete data for every modeled formulation constraint.",
      };
    }

    const glpk = await loadGlpk();
    const solved = await solveMinimumAdditions(
      glpk,
      prepared,
      constraints,
      currentIds,
    );
    if (solved.status !== "optimal") {
      return {
        status: "infeasible",
        candidateCount: prepared.length,
        setAsideIngredientIds,
        unsupportedRequirements,
        message:
          "No feasible additions were found from the complete, priced ingredient catalogue.",
      };
    }

    const projectedInclusionPct = Object.fromEntries(
      prepared
        .map((ingredient) => [
          ingredient.option.ingredientId,
          Math.max(0, solved.vars[ingredient.variable] ?? 0) * 100,
        ] as const)
        .filter(([, pct]) => pct > 1e-7),
    );
    const ingredientIds = prepared
      .filter((ingredient) => {
        const id = ingredient.option.ingredientId;
        return !currentIds.has(id) && (projectedInclusionPct[id] ?? 0) > 1e-7;
      })
      .sort(
        (a, b) =>
          (projectedInclusionPct[b.option.ingredientId] ?? 0) -
          (projectedInclusionPct[a.option.ingredientId] ?? 0),
      )
      .map((ingredient) => ingredient.option.ingredientId);

    return {
      status: ingredientIds.length ? "suggested" : "complete",
      ingredientIds,
      projectedInclusionPct,
      candidateCount: prepared.length,
      setAsideIngredientIds,
      unsupportedRequirements,
    };
  } catch (error) {
    return {
      status: "error",
      candidateCount: 0,
      setAsideIngredientIds: [],
      unsupportedRequirements,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export function buildConstraintSpecs(
  phase: NutritionPhase,
  energySystem: EnergySystem,
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
      label: phase.species === "broiler" ? "Digestible protein" : "Digestible protein (swine SID)",
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
        assumedZeroIngredientIds: [],
        totalOnlyIngredientIds: [],
      }),
    });
  }

  return constraints;
}

export function prepareIngredients(
  options: readonly FormulationIngredientOption[],
  constraints: readonly ConstraintSpec[],
  library: IngredientLibrary,
  phase: NutritionPhase,
): PreparedIngredient[] {
  const rules = aggregateInclusionRules(phase, library);
  const prepared = options.map((option, index): PreparedIngredient => {
    const ingredient = library.ingredients.find(
      (candidate) => candidate.id === option.ingredientId,
    );
    if (!ingredient) {
      throw new Error(`Unknown ingredient: ${option.ingredientId}.`);
    }

    // Static and phase-specific FeedSport limits; requests can only tighten them.
    const { minPct, maxPct, feedsport } = effectiveInclusionLimits(
      ingredient.id,
      ingredient.constraints,
      phase,
      option,
    );

    if (minPct > maxPct) {
      const maxSource =
        maxPct === feedsport.maxPct && feedsport.maxSource !== "none"
          ? ` (${describeMaxSource(feedsport)})`
          : "";
      throw new Error(
        `Ingredient ${ingredient.name} has incompatible inclusion bounds: minimum ${minPct}% exceeds maximum ${maxPct}%${maxSource}.`,
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
      familyId: ingredient.familyId,
      minFraction: minPct / 100,
      maxFraction: maxPct / 100,
      coefficients,
      aggregateRules: rules.filter((rule) => rule.memberIngredientIds.includes(ingredient.id)),
    };
  });
  assertAggregateMinimumsFit(prepared, library);
  return prepared;
}

/**
 * Fixed or minimum inclusions that alone exceed a family or group ceiling
 * can never be feasible. Report them plainly; the ceiling is never relaxed.
 */
function assertAggregateMinimumsFit(
  ingredients: readonly PreparedIngredient[],
  library: IngredientLibrary,
): void {
  for (const { rule, members } of aggregateRowsOf(ingredients)) {
    const required = members.filter((ingredient) => ingredient.minFraction > 1e-12);
    const minPct = required.reduce((sum, ingredient) => sum + ingredient.minFraction, 0) * 100;
    if (minPct <= rule.maxPct + 1e-9) continue;
    const parts = required.map((ingredient) =>
      `${library.ingredients.find((record) => record.id === ingredient.option.ingredientId)?.name ?? ingredient.option.ingredientId} ${+(ingredient.minFraction * 100).toFixed(4)}%`);
    throw new Error(
      `${aggregateLabel(rule)}: fixed or minimum inclusions add up to ${+minPct.toFixed(4)}% (${parts.join(", ")}), above its combined maximum of ${rule.maxPct}% (${describeAggregateSource(rule)}).`,
    );
  }
}

/** LP row (and dual) name of a family or group ceiling. */
export function aggregateRowName(rule: Pick<AggregateInclusionRule, "key">): string {
  return `aggregate_${rule.key.replace(":", "_")}`;
}

/** Each applicable ceiling with the members present in this model. */
function aggregateRowsOf(ingredients: readonly PreparedIngredient[]) {
  const rows = new Map<string, { rule: AggregateInclusionRule; members: PreparedIngredient[] }>();
  for (const ingredient of ingredients) {
    for (const rule of ingredient.aggregateRules) {
      const row = rows.get(rule.key) ?? { rule, members: [] };
      row.members.push(ingredient);
      rows.set(rule.key, row);
    }
  }
  return [...rows.values()];
}

/**
 * One row per family or group ceiling: the members' combined inclusion is at
 * most the ceiling. Rows derive from the ingredients actually in the model,
 * so every LP (least cost, alternatives, completion, diagnostics) carries the
 * same ceilings. A row that cannot bind (members' own maxima already sum
 * below the ceiling) is omitted.
 */
export function aggregateInclusionRows(
  glpk: GLPK,
  ingredients: readonly PreparedIngredient[],
) {
  return aggregateRowsOf(ingredients).flatMap(({ rule, members }) => {
    const bound = rule.maxPct / 100;
    const reachable = members.reduce((sum, ingredient) => sum + ingredient.maxFraction, 0);
    if (reachable <= bound + 1e-12) return [];
    return [{
      name: aggregateRowName(rule),
      vars: members.map((ingredient) => ({ name: ingredient.variable, coef: 1 })),
      bnds: { type: glpk.GLP_UP, lb: 0, ub: bound },
    }];
  });
}

export function collectMissingData(
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

type LpModel = Parameters<GLPK["solve"]>[0];

/**
 * GLPK's presolver can report OPTIMAL for an infeasible model (for example a
 * basket that cannot reach SID valine without crystalline valine). Every
 * reported optimum is checked against its own constraint rows; if one is
 * violated, the model is solved again without presolve, which reports the
 * true status. The post-solve assessment remains the final safeguard.
 */
async function solveLp(glpk: GLPK, lp: LpModel) {
  const presolved = await glpk.solve(lp, { msglev: glpk.GLP_MSG_OFF, presol: true });
  if (presolved.result.status !== glpk.GLP_OPT || satisfiesRows(glpk, lp, presolved.result.vars)) return presolved;
  return glpk.solve(lp, { msglev: glpk.GLP_MSG_OFF, presol: false });
}

function satisfiesRows(glpk: GLPK, lp: LpModel, vars: Record<string, number>): boolean {
  return lp.subjectTo.every((row) => {
    const value = row.vars.reduce((sum, term) => sum + term.coef * (vars[term.name] ?? 0), 0);
    const { type, lb, ub } = row.bnds;
    const ok = (bound: number, holds: boolean) => holds || Math.abs(value - bound) <= Math.max(1e-7, Math.abs(bound) * 1e-6);
    if (type === glpk.GLP_FX) return ok(lb, Math.abs(value - lb) <= 0);
    if (type === glpk.GLP_LO) return ok(lb, value >= lb);
    if (type === glpk.GLP_UP) return ok(ub, value <= ub);
    if (type === glpk.GLP_DB) return ok(lb, value >= lb) && ok(ub, value <= ub);
    return true;
  });
}

export async function solveStrict(
  glpk: GLPK,
  ingredients: readonly PreparedIngredient[],
  constraints: readonly ConstraintSpec[],
): Promise<
  | {
      status: "optimal";
      vars: Record<string, number>;
      /** Row duals keyed by row name (`total_inclusion`, `nutrient_<id>`, `aggregate_<kind>_<id>`). */
      dual: Record<string, number>;
    }
  | { status: "infeasible" }
> {
  const {
    GLP_DB,
    GLP_FX,
    GLP_LO,
    GLP_MIN,
    GLP_OPT,
  } = glpk;

  const lp = {
    name: "FeedSportLeastCostDiet",
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
      ...aggregateInclusionRows(glpk, ingredients),
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

  const result = await solveLp(glpk, lp);

  if (result.result.status !== GLP_OPT) {
    return { status: "infeasible" };
  }

  return { status: "optimal", vars: result.result.vars, dual: result.result.dual ?? {} };
}

async function solveMinimumAdditions(
  glpk: GLPK,
  ingredients: readonly PreparedIngredient[],
  constraints: readonly ConstraintSpec[],
  currentIds: ReadonlySet<string>,
): Promise<
  | { status: "optimal"; vars: Record<string, number> }
  | { status: "infeasible" }
> {
  const { GLP_DB, GLP_FX, GLP_LO, GLP_MIN, GLP_OPT, GLP_UP } = glpk;
  const optional = ingredients.filter(
    (ingredient) => !currentIds.has(ingredient.option.ingredientId),
  );
  const binaryName = (ingredient: PreparedIngredient) =>
    `add_${ingredient.variable}`;
  const maxPrice = Math.max(
    1,
    ...ingredients.map((ingredient) => ingredient.option.pricePerKg),
  );

  const lp = {
    name: "FeedSportMinimumIngredientAdditions",
    objective: {
      direction: GLP_MIN,
      name: "number_of_additions",
      vars: [
        ...optional.map((ingredient) => ({
          name: binaryName(ingredient),
          coef: 1,
        })),
        ...ingredients.map((ingredient) => ({
          name: ingredient.variable,
          // Tie-breaks prefer using more of the farmer's list, then lower cost.
          // Their combined weight stays far below one binary ingredient.
          coef:
            (currentIds.has(ingredient.option.ingredientId) ? 0 : 1e-4) +
            (ingredient.option.pricePerKg / maxPrice) * 1e-6,
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
        vars: ingredients.map((ingredient) => ({
          name: ingredient.variable,
          coef: ingredient.coefficients.get(constraint.id) ?? 0,
        })),
        bnds:
          constraint.relation === "min"
            ? { type: GLP_LO, lb: constraint.bound, ub: 0 }
            : { type: GLP_UP, lb: 0, ub: constraint.bound },
      })),
      ...aggregateInclusionRows(glpk, ingredients),
      ...optional.flatMap((ingredient) => [
        {
          name: `enable_${ingredient.variable}`,
          vars: [
            { name: ingredient.variable, coef: 1 },
            { name: binaryName(ingredient), coef: -ingredient.maxFraction },
          ],
          bnds: { type: GLP_UP, lb: 0, ub: 0 },
        },
        ...(ingredient.minFraction > 1e-12
          ? [
              {
                name: `minimum_${ingredient.variable}`,
                vars: [
                  { name: ingredient.variable, coef: 1 },
                  {
                    name: binaryName(ingredient),
                    coef: -ingredient.minFraction,
                  },
                ],
                bnds: { type: GLP_LO, lb: 0, ub: 0 },
              },
            ]
          : []),
      ]),
    ],
    bounds: ingredients.map((ingredient) => {
      const current = currentIds.has(ingredient.option.ingredientId);
      return {
        name: ingredient.variable,
        type:
          current &&
          Math.abs(ingredient.minFraction - ingredient.maxFraction) <= 1e-12
            ? GLP_FX
            : GLP_DB,
        lb: current ? ingredient.minFraction : 0,
        ub: ingredient.maxFraction,
      };
    }),
    binaries: optional.map(binaryName),
  };

  const result = await solveLp(glpk, lp);
  if (result.result.status !== GLP_OPT) return { status: "infeasible" };
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
    GLP_OPT,
    GLP_UP,
  } = glpk;

  const lp = {
    name: `FeedSportAlternative_${objective.name}`,
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
      ...aggregateInclusionRows(glpk, ingredients),
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

  const result = await solveLp(glpk, lp);

  if (result.result.status !== GLP_OPT) {
    return { status: "infeasible" };
  }

  return { status: "optimal", vars: result.result.vars };
}

export function buildNutrientProfile(
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
    const bindingTolerance = nutrientFeasibilityTolerance(constraint.bound);

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
          ingredient.familyId === SOYBEAN_MEAL_FAMILY_ID ? 1 : 0,
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

export async function solveDiagnostic(
  glpk: GLPK,
  ingredients: readonly PreparedIngredient[],
  constraints: readonly ConstraintSpec[],
): Promise<{ status: "optimal"; vars: Record<string, number> } | { status: "infeasible" }> {
  const {
    GLP_DB,
    GLP_FX,
    GLP_LO,
    GLP_MIN,
    GLP_OPT,
    GLP_UP,
  } = glpk;

  const deviationVars = constraints.map((constraint) => {
    const name = `deviation_${constraint.id}`;
    const scale = Math.max(Math.abs(constraint.bound), 1e-9);
    return { name, coef: 1 / scale };
  });

  const lp = {
    name: "FeedSportFormulationDiagnostic",
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
      // Inclusion ceilings stay hard: the best-effort diet relaxes only
      // nutrient requirements, never ingredient, family or group limits.
      ...aggregateInclusionRows(glpk, ingredients),
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

  const result = await solveLp(glpk, lp);

  if (result.result.status !== GLP_OPT) {
    return { status: "infeasible" };
  }

  return { status: "optimal", vars: result.result.vars };
}

export function buildSolution(
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

export function describeDiagnostics(
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

export function validateOptions(
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

export async function loadGlpk(): Promise<GLPK> {
  // These formulation routines execute in server-side API routes. Use the
  // package's Node entrypoint so Next.js does not bundle the browser build and
  // rewrite the relative glpk.wasm asset path.
  const module = await import("glpk.js/node");
  return module.default();
}

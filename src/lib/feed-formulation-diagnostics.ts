/**
 * Formulation diagnostics: explain, diagnose, and stress-test least-cost
 * solutions using the same constraint model and GLPK solve as the optimizer.
 *
 * Marginal answers come from LP duals (shadow prices and reduced costs).
 * Anything reported as an actual cost change is confirmed by re-solving the
 * modified scenario rather than extrapolated from duals.
 */
type GLPK = Awaited<ReturnType<typeof import("glpk.js/node")["default"]>>;

import {
  buildConstraintSpecs,
  buildNutrientProfile,
  buildSolution,
  collectMissingData,
  describeDiagnostics,
  formulateLeastCostDiet,
  loadGlpk,
  prepareIngredients,
  solveDiagnostic,
  solveStrict,
  validateOptions,
  type ConstraintSpec,
  type FormulationDiagnostic,
  type FormulationIngredientOption,
  type FormulationMissingData,
  type FormulationNutrientComparison,
  type FormulationSettings,
  type FormulationSolution,
  type PreparedIngredient,
} from "./feed-optimizer";
import type { IngredientLibrary } from "./ingredient-nutrients";
import type { EnergySystem } from "./nutrition-targets";
import type { NutritionPhase } from "./nutrition";

export type FormulationScenario = {
  phase: NutritionPhase;
  energySystem: EnergySystem;
  options: readonly FormulationIngredientOption[];
  library: IngredientLibrary;
  settings?: FormulationSettings;
};

type Model = {
  constraints: ConstraintSpec[];
  prepared: PreparedIngredient[];
};

type Duals = Record<string, number>;

type LeanSolve =
  | {
      status: "optimal";
      model: Model;
      solution: FormulationSolution;
      nutrientProfile: FormulationNutrientComparison[];
      vars: Record<string, number>;
      dual: Duals;
    }
  | { status: "infeasible"; model: Model }
  | { status: "missing-data"; missingData: FormulationMissingData[] };

export type DiagnosticFailure =
  | { status: "missing-data"; missingData: FormulationMissingData[] }
  | { status: "infeasible" }
  | { status: "error"; message: string };

const EPSILON = 1e-9;

function buildModel(scenario: FormulationScenario, options = scenario.options): Model {
  validateOptions(options, scenario.library);
  const constraints = buildConstraintSpecs(scenario.phase, scenario.energySystem, scenario.settings);
  return {
    constraints,
    prepared: prepareIngredients(options, constraints, scenario.library, scenario.phase),
  };
}

async function solveModel(
  glpk: GLPK,
  model: Model,
  library: IngredientLibrary,
  constraints: readonly ConstraintSpec[] = model.constraints,
): Promise<LeanSolve> {
  const missingData = collectMissingData(model.prepared, constraints);
  if (missingData.length > 0) return { status: "missing-data", missingData };

  const solved = await solveStrict(glpk, model.prepared, constraints);
  if (solved.status !== "optimal") return { status: "infeasible", model };

  const solution = buildSolution(solved.vars, model.prepared, library);
  return {
    status: "optimal",
    model,
    solution,
    nutrientProfile: buildNutrientProfile(solution.analysis, constraints),
    vars: solved.vars,
    dual: solved.dual,
  };
}

async function solveScenario(
  glpk: GLPK,
  scenario: FormulationScenario,
  options = scenario.options,
): Promise<LeanSolve> {
  return solveModel(glpk, buildModel(scenario, options), scenario.library);
}

/** Price minus the shadow value of everything the ingredient supplies. */
function reducedCostPerKg(
  pricePerKg: number,
  coefficients: ReadonlyMap<string, number>,
  constraints: readonly ConstraintSpec[],
  dual: Duals,
): number {
  return constraints.reduce(
    (sum, constraint) =>
      sum - (coefficients.get(constraint.id) ?? 0) * (dual[`nutrient_${constraint.id}`] ?? 0),
    pricePerKg - (dual.total_inclusion ?? 0),
  );
}

/** Cost per kg of feed of tightening a constraint by one unit (always ≥ 0). */
function tighteningCostPerUnit(constraint: ConstraintSpec, dual: Duals): number {
  const value = dual[`nutrient_${constraint.id}`] ?? 0;
  return Math.max(0, constraint.relation === "min" ? value : -value);
}

function inclusionMap(solution: FormulationSolution | undefined): Map<string, number> {
  return new Map(
    (solution?.formula.ingredients ?? []).map((row) => [row.ingredientId, row.inclusionPct]),
  );
}

export type InclusionChange = {
  ingredientId: string;
  basePct: number;
  newPct: number;
};

export function inclusionChanges(
  base: FormulationSolution,
  next: FormulationSolution,
  thresholdPct = 0.01,
): InclusionChange[] {
  const before = inclusionMap(base);
  const after = inclusionMap(next);
  return [...new Set([...before.keys(), ...after.keys()])]
    .map((ingredientId) => ({
      ingredientId,
      basePct: before.get(ingredientId) ?? 0,
      newPct: after.get(ingredientId) ?? 0,
    }))
    .filter((change) => Math.abs(change.newPct - change.basePct) > thresholdPct)
    .sort((a, b) => Math.abs(b.newPct - b.basePct) - Math.abs(a.newPct - a.basePct));
}

async function guard<T>(run: () => Promise<T>): Promise<T | { status: "error"; message: string }> {
  try {
    return await run();
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : String(error) };
  }
}

function failure(result: LeanSolve): DiagnosticFailure {
  return result.status === "missing-data"
    ? { status: "missing-data", missingData: result.missingData }
    : { status: "infeasible" };
}

// ---------------------------------------------------------------------------
// Limiting nutrients

export type LimitingNutrient = {
  constraintId: string;
  label: string;
  unit: string;
  relation: "min" | "max";
  bound: number;
  actual: number;
  /** Cost per kg of feed for tightening the requirement by one unit. */
  costPerKgPerUnit: number;
  /** Cost per kg of feed for tightening the requirement by 1% of its value. */
  costPerKgPerPercent: number;
};

function limitingNutrients(
  constraints: readonly ConstraintSpec[],
  profile: readonly FormulationNutrientComparison[],
  dual: Duals,
): LimitingNutrient[] {
  return constraints
    .flatMap((constraint) => {
      const row = profile.find((candidate) => candidate.id === constraint.id);
      const costPerKgPerUnit = tighteningCostPerUnit(constraint, dual);
      if (!row?.binding || costPerKgPerUnit <= EPSILON) return [];
      return [
        {
          constraintId: constraint.id,
          label: constraint.label,
          unit: constraint.unit,
          relation: constraint.relation,
          bound: constraint.bound,
          actual: row.actual,
          costPerKgPerUnit,
          costPerKgPerPercent: costPerKgPerUnit * Math.abs(constraint.bound) * 0.01,
        },
      ];
    })
    .sort((a, b) => b.costPerKgPerPercent - a.costPerKgPerPercent);
}

// ---------------------------------------------------------------------------
// explain

export type IngredientExplanation = {
  ingredientId: string;
  offered: boolean;
  status:
    | "selected"
    | "at_max_limit"
    | "at_min_limit"
    | "not_selected"
    | "not_offered"
    | "missing_data";
  inclusionPct: number;
  pricePerKg: number;
  minPct?: number;
  maxPct?: number;
  /** Reduced cost per kg of ingredient: how far its price is from break-even. */
  reducedCostPerKg?: number;
  /** For selected ingredients: share of each limiting nutrient it supplies. */
  supplies?: Array<{ constraintId: string; sharePct: number }>;
  missingNutrientIds?: string[];
};

export type FormulationExplanation =
  | {
      status: "optimal";
      solution: FormulationSolution;
      nutrientProfile: FormulationNutrientComparison[];
      limitingNutrients: LimitingNutrient[];
      ingredients: IngredientExplanation[];
    }
  | DiagnosticFailure;

export async function explainFormulation(
  scenario: FormulationScenario,
  /** Ingredients not offered to the solver to price out against the solution. */
  outsideCandidates: readonly FormulationIngredientOption[] = [],
): Promise<FormulationExplanation> {
  return guard(async () => {
    const glpk = await loadGlpk();
    const solved = await solveScenario(glpk, scenario);
    if (solved.status !== "optimal") return failure(solved);

    const { constraints, prepared } = solved.model;
    const limiting = limitingNutrients(constraints, solved.nutrientProfile, solved.dual);

    const offered = prepared.map((ingredient): IngredientExplanation => {
      const fraction = Math.max(0, solved.vars[ingredient.variable] ?? 0);
      const reducedCost = reducedCostPerKg(
        ingredient.option.pricePerKg,
        ingredient.coefficients,
        constraints,
        solved.dual,
      );
      const atMax = ingredient.maxFraction < 1 && fraction >= ingredient.maxFraction - 1e-7;
      const atMin = ingredient.minFraction > 0 && fraction <= ingredient.minFraction + 1e-7;
      const status: IngredientExplanation["status"] =
        fraction <= 1e-7
          ? "not_selected"
          : atMax && reducedCost < -EPSILON
            ? "at_max_limit"
            : atMin && reducedCost > EPSILON
              ? "at_min_limit"
              : "selected";

      const supplies =
        fraction > 1e-7
          ? limiting.flatMap(({ constraintId }) => {
              const total = prepared.reduce(
                (sum, other) =>
                  sum +
                  (other.coefficients.get(constraintId) ?? 0) *
                    Math.max(0, solved.vars[other.variable] ?? 0),
                0,
              );
              const own = (ingredient.coefficients.get(constraintId) ?? 0) * fraction;
              const sharePct = total > EPSILON ? (own / total) * 100 : 0;
              return sharePct >= 1 ? [{ constraintId, sharePct }] : [];
            })
          : undefined;

      return {
        ingredientId: ingredient.option.ingredientId,
        offered: true,
        status,
        inclusionPct: fraction * 100,
        pricePerKg: ingredient.option.pricePerKg,
        minPct: ingredient.minFraction * 100,
        maxPct: ingredient.maxFraction * 100,
        reducedCostPerKg: reducedCost,
        ...(supplies && supplies.length > 0
          ? { supplies: supplies.sort((a, b) => b.sharePct - a.sharePct) }
          : {}),
      };
    });

    const outside = outsideCandidates.map((option): IngredientExplanation => {
      const [candidate] = prepareIngredients([option], constraints, scenario.library, scenario.phase);
      const missing = constraints
        .filter((constraint) => !candidate.coefficients.has(constraint.id))
        .map((constraint) => constraint.id);
      return missing.length > 0
        ? {
            ingredientId: option.ingredientId,
            offered: false,
            status: "missing_data",
            inclusionPct: 0,
            pricePerKg: option.pricePerKg,
            missingNutrientIds: missing,
          }
        : {
            ingredientId: option.ingredientId,
            offered: false,
            status: "not_offered",
            inclusionPct: 0,
            pricePerKg: option.pricePerKg,
            reducedCostPerKg: reducedCostPerKg(
              option.pricePerKg,
              candidate.coefficients,
              constraints,
              solved.dual,
            ),
          };
    });

    return {
      status: "optimal" as const,
      solution: solved.solution,
      nutrientProfile: solved.nutrientProfile,
      limitingNutrients: limiting,
      ingredients: [...offered, ...outside],
    };
  });
}

// ---------------------------------------------------------------------------
// diagnose infeasibility

export type UnachievableRequirement = {
  constraintId: string;
  label: string;
  unit: string;
  relation: "min" | "max";
  bound: number;
  /** Best value reachable for this nutrient alone, ignoring every other requirement. */
  bestAchievable: number;
  bestSources: string[];
};

export type InfeasibilityFix = {
  kind: "add_ingredients" | "restore_default_limits";
  ingredientIds: string[];
  costPerKg: number;
  inclusions: Array<{ ingredientId: string; inclusionPct: number }>;
};

export type InfeasibilityDiagnosis =
  | { status: "feasible"; costPerKg: number }
  | {
      status: "infeasible";
      boundIssues: Array<{ kind: "min_sum_above_100" | "max_sum_below_100"; totalPct: number }>;
      unachievable: UnachievableRequirement[];
      /** A minimal set of requirements that cannot be met together. */
      conflictingConstraintIds: string[];
      deviations: FormulationDiagnostic[];
      fixes: InfeasibilityFix[];
      candidatesTested: number;
    }
  | { status: "missing-data"; missingData: FormulationMissingData[] }
  | { status: "error"; message: string };

/**
 * Exact best value of one nutrient within the inclusion bounds alone: fill
 * every minimum, then spend the remaining share on the richest sources.
 */
function extremeAchievable(
  constraint: ConstraintSpec,
  prepared: readonly PreparedIngredient[],
): { value: number; sources: string[] } | undefined {
  const remaining = 1 - prepared.reduce((sum, ingredient) => sum + ingredient.minFraction, 0);
  if (remaining < -EPSILON) return undefined;

  const direction = constraint.relation === "min" ? -1 : 1;
  const ranked = [...prepared].sort(
    (a, b) =>
      direction *
      ((a.coefficients.get(constraint.id) ?? 0) - (b.coefficients.get(constraint.id) ?? 0)),
  );
  let left = remaining;
  let value = 0;
  const sources: string[] = [];
  for (const ingredient of ranked) {
    const extra = Math.min(Math.max(0, ingredient.maxFraction - ingredient.minFraction), left);
    left -= extra;
    const fraction = ingredient.minFraction + extra;
    value += (ingredient.coefficients.get(constraint.id) ?? 0) * fraction;
    if (extra > EPSILON) sources.push(ingredient.option.ingredientId);
  }
  if (left > 1e-7) return undefined;
  return { value, sources };
}

export async function diagnoseInfeasibility(
  scenario: FormulationScenario,
  {
    addCandidates = [],
    defaultLimitOptions,
  }: {
    /** Priced ingredients not in the scenario that may be added as a fix. */
    addCandidates?: readonly FormulationIngredientOption[];
    /** The scenario options with request-level inclusion limits removed. */
    defaultLimitOptions?: readonly FormulationIngredientOption[];
  } = {},
): Promise<InfeasibilityDiagnosis> {
  return guard(async () => {
    const glpk = await loadGlpk();
    const model = buildModel(scenario);
    const base = await solveModel(glpk, model, scenario.library);
    if (base.status === "missing-data") {
      return { status: "missing-data" as const, missingData: base.missingData };
    }
    if (base.status === "optimal") {
      return { status: "feasible" as const, costPerKg: base.solution.costPerKg };
    }

    const { constraints, prepared } = model;
    const minSum = prepared.reduce((sum, ingredient) => sum + ingredient.minFraction, 0) * 100;
    const maxSum = prepared.reduce((sum, ingredient) => sum + ingredient.maxFraction, 0) * 100;
    const boundIssues = [
      ...(minSum > 100 + 1e-7 ? [{ kind: "min_sum_above_100" as const, totalPct: minSum }] : []),
      ...(maxSum < 100 - 1e-7 ? [{ kind: "max_sum_below_100" as const, totalPct: maxSum }] : []),
    ];

    const unachievable = constraints.flatMap((constraint): UnachievableRequirement[] => {
      const extreme = extremeAchievable(constraint, prepared);
      if (!extreme) return [];
      const tolerance = Math.max(Math.abs(constraint.bound) * 1e-7, 1e-9);
      const fails =
        constraint.relation === "min"
          ? extreme.value < constraint.bound - tolerance
          : extreme.value > constraint.bound + tolerance;
      return fails
        ? [
            {
              constraintId: constraint.id,
              label: constraint.label,
              unit: constraint.unit,
              relation: constraint.relation,
              bound: constraint.bound,
              bestAchievable: extreme.value,
              bestSources: extreme.sources,
            },
          ]
        : [];
    });

    // Deletion filter: drop each requirement in turn and keep it dropped if
    // the rest are still infeasible. What survives is an irreducible set.
    let conflicting: ConstraintSpec[] = [];
    if (boundIssues.length === 0) {
      conflicting = [...constraints];
      for (const constraint of constraints) {
        const trial = conflicting.filter((candidate) => candidate !== constraint);
        const solved = await solveStrict(glpk, prepared, trial);
        if (solved.status !== "optimal") conflicting = trial;
      }
    }

    const diagnostic = await solveDiagnostic(glpk, prepared, constraints);
    const deviations =
      diagnostic.status === "optimal"
        ? describeDiagnostics(
            buildSolution(diagnostic.vars, prepared, scenario.library).analysis,
            constraints,
          )
        : [];

    const fixes: InfeasibilityFix[] = [];
    const toFix = (
      kind: InfeasibilityFix["kind"],
      ingredientIds: string[],
      solution: FormulationSolution,
    ): InfeasibilityFix => ({
      kind,
      ingredientIds,
      costPerKg: solution.costPerKg,
      inclusions: solution.formula.ingredients.map(({ ingredientId, inclusionPct }) => ({
        ingredientId,
        inclusionPct,
      })),
    });

    if (defaultLimitOptions) {
      const relaxed = await solveScenario(glpk, scenario, defaultLimitOptions);
      if (relaxed.status === "optimal") {
        const changed = scenario.options
          .filter((option, index) => {
            const other = defaultLimitOptions[index];
            return (
              option.minInclusionPct !== other?.minInclusionPct ||
              option.maxInclusionPct !== other?.maxInclusionPct
            );
          })
          .map((option) => option.ingredientId);
        fixes.push(toFix("restore_default_limits", changed, relaxed.solution));
      }
    }

    // Single-ingredient additions, confirmed by re-solving.
    const usable = addCandidates.filter((candidate) => {
      const [prepared] = prepareIngredients([candidate], constraints, scenario.library, scenario.phase);
      return constraints.every((constraint) => prepared.coefficients.has(constraint.id));
    });
    for (const candidate of usable) {
      const solved = await solveScenario(glpk, scenario, [...scenario.options, candidate]);
      if (solved.status === "optimal") {
        fixes.push(toFix("add_ingredients", [candidate.ingredientId], solved.solution));
      }
    }

    // No single addition works: start from the whole pool and greedily remove
    // candidates while staying feasible, leaving a small sufficient set.
    if (!fixes.some((fix) => fix.kind === "add_ingredients") && usable.length > 1) {
      let pool = [...usable];
      let solved = await solveScenario(glpk, scenario, [...scenario.options, ...pool]);
      if (solved.status === "optimal") {
        for (const candidate of [...usable].sort((a, b) => b.pricePerKg - a.pricePerKg)) {
          const trialPool = pool.filter((other) => other !== candidate);
          const trial = await solveScenario(glpk, scenario, [...scenario.options, ...trialPool]);
          if (trial.status === "optimal") {
            pool = trialPool;
            solved = trial;
          }
        }
        if (solved.status === "optimal") {
          fixes.push(
            toFix(
              "add_ingredients",
              pool.map((candidate) => candidate.ingredientId),
              solved.solution,
            ),
          );
        }
      }
    }

    fixes.sort((a, b) => a.costPerKg - b.costPerKg);

    return {
      status: "infeasible" as const,
      boundIssues,
      unachievable,
      conflictingConstraintIds: conflicting.map((constraint) => constraint.id),
      deviations,
      fixes,
      candidatesTested: usable.length,
    };
  });
}

// ---------------------------------------------------------------------------
// sensitivity

export type ScenarioChange = {
  ingredientId: string;
  pricePerKg?: number;
  minInclusionPct?: number;
  maxInclusionPct?: number;
};

export type SensitivityScenario = {
  name: string;
  changes: readonly ScenarioChange[];
};

export type SensitivityOutcome = {
  name: string;
  changes: readonly ScenarioChange[];
  status: "optimal" | "infeasible" | "missing-data" | "error";
  message?: string;
  solution?: FormulationSolution;
  costChangePerKg?: number;
  inclusionChanges?: InclusionChange[];
  newlyLimiting?: string[];
  noLongerLimiting?: string[];
};

export type SensitivityAnalysis =
  | {
      status: "optimal";
      base: FormulationSolution;
      baseLimiting: LimitingNutrient[];
      outcomes: SensitivityOutcome[];
    }
  | DiagnosticFailure;

export async function runSensitivityAnalysis(
  scenario: FormulationScenario,
  variations: readonly SensitivityScenario[],
): Promise<SensitivityAnalysis> {
  return guard(async () => {
    const glpk = await loadGlpk();
    const base = await solveScenario(glpk, scenario);
    if (base.status !== "optimal") return failure(base);
    const baseLimiting = limitingNutrients(base.model.constraints, base.nutrientProfile, base.dual);
    const baseLimitingIds = new Set(baseLimiting.map((row) => row.constraintId));

    const outcomes: SensitivityOutcome[] = [];
    for (const variation of variations) {
      const options = scenario.options.map((option) => {
        const change = variation.changes.find((candidate) => candidate.ingredientId === option.ingredientId);
        return change
          ? {
              ...option,
              ...(change.pricePerKg !== undefined ? { pricePerKg: change.pricePerKg } : {}),
              ...(change.minInclusionPct !== undefined ? { minInclusionPct: change.minInclusionPct } : {}),
              ...(change.maxInclusionPct !== undefined ? { maxInclusionPct: change.maxInclusionPct } : {}),
            }
          : option;
      });

      try {
        const solved = await solveScenario(glpk, scenario, options);
        if (solved.status !== "optimal") {
          outcomes.push({ name: variation.name, changes: variation.changes, status: solved.status });
          continue;
        }
        const limiting = new Set(
          limitingNutrients(solved.model.constraints, solved.nutrientProfile, solved.dual).map(
            (row) => row.constraintId,
          ),
        );
        outcomes.push({
          name: variation.name,
          changes: variation.changes,
          status: "optimal",
          solution: solved.solution,
          costChangePerKg: solved.solution.costPerKg - base.solution.costPerKg,
          inclusionChanges: inclusionChanges(base.solution, solved.solution),
          newlyLimiting: [...limiting].filter((id) => !baseLimitingIds.has(id)),
          noLongerLimiting: [...baseLimitingIds].filter((id) => !limiting.has(id)),
        });
      } catch (error) {
        outcomes.push({
          name: variation.name,
          changes: variation.changes,
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { status: "optimal" as const, base: base.solution, baseLimiting, outcomes };
  });
}

// ---------------------------------------------------------------------------
// ingredient opportunities

export type IngredientOpportunityResult = {
  ingredientId: string;
  pricePerKg: number;
  /** Negative: the ingredient pays for itself at current shadow prices. */
  reducedCostPerKg: number;
  /** Highest price at which the ingredient would enter the solution. */
  entryPricePerKg: number;
  /** Nutrients that make the ingredient valuable, by shadow value per kg. */
  valuedFor: Array<{ constraintId: string; valuePerKg: number }>;
  /** Confirmed by re-solving with the ingredient offered. */
  confirmed?: {
    costPerKg: number;
    savingPerKg: number;
    inclusionPct: number;
    inclusionChanges: InclusionChange[];
  };
};

export type IngredientOpportunityAnalysis =
  | {
      status: "optimal";
      base: FormulationSolution;
      limitingNutrients: LimitingNutrient[];
      opportunities: IngredientOpportunityResult[];
      nearMisses: IngredientOpportunityResult[];
      skippedForMissingData: string[];
    }
  | DiagnosticFailure;

export async function findIngredientOpportunities(
  scenario: FormulationScenario,
  candidates: readonly FormulationIngredientOption[],
  { nearMissLimit = 5 }: { nearMissLimit?: number } = {},
): Promise<IngredientOpportunityAnalysis> {
  return guard(async () => {
    const glpk = await loadGlpk();
    const base = await solveScenario(glpk, scenario);
    if (base.status !== "optimal") return failure(base);
    const { constraints } = base.model;

    const priced: IngredientOpportunityResult[] = [];
    const skippedForMissingData: string[] = [];
    for (const candidate of candidates) {
      const [prepared] = prepareIngredients([candidate], constraints, scenario.library, scenario.phase);
      if (!constraints.every((constraint) => prepared.coefficients.has(constraint.id))) {
        skippedForMissingData.push(candidate.ingredientId);
        continue;
      }
      const reducedCost = reducedCostPerKg(candidate.pricePerKg, prepared.coefficients, constraints, base.dual);
      priced.push({
        ingredientId: candidate.ingredientId,
        pricePerKg: candidate.pricePerKg,
        reducedCostPerKg: reducedCost,
        entryPricePerKg: candidate.pricePerKg - reducedCost,
        valuedFor: constraints
          .map((constraint) => ({
            constraintId: constraint.id,
            valuePerKg:
              (prepared.coefficients.get(constraint.id) ?? 0) *
              (base.dual[`nutrient_${constraint.id}`] ?? 0),
          }))
          .filter((row) => row.valuePerKg > 1e-6)
          .sort((a, b) => b.valuePerKg - a.valuePerKg)
          .slice(0, 4),
      });
    }

    const opportunities: IngredientOpportunityResult[] = [];
    for (const result of priced.filter((row) => row.reducedCostPerKg < -1e-7)) {
      const option = candidates.find((candidate) => candidate.ingredientId === result.ingredientId)!;
      const solved = await solveScenario(glpk, scenario, [...scenario.options, option]);
      if (solved.status !== "optimal") continue;
      const savingPerKg = base.solution.costPerKg - solved.solution.costPerKg;
      if (savingPerKg <= 1e-7) continue;
      opportunities.push({
        ...result,
        confirmed: {
          costPerKg: solved.solution.costPerKg,
          savingPerKg,
          inclusionPct: inclusionMap(solved.solution).get(result.ingredientId) ?? 0,
          inclusionChanges: inclusionChanges(base.solution, solved.solution),
        },
      });
    }
    opportunities.sort((a, b) => b.confirmed!.savingPerKg - a.confirmed!.savingPerKg);

    const opportunityIds = new Set(opportunities.map((row) => row.ingredientId));
    const nearMisses = priced
      .filter((row) => !opportunityIds.has(row.ingredientId) && row.entryPricePerKg > 0)
      .sort((a, b) => a.reducedCostPerKg / a.pricePerKg - b.reducedCostPerKg / b.pricePerKg)
      .slice(0, nearMissLimit);

    return {
      status: "optimal" as const,
      base: base.solution,
      limitingNutrients: limitingNutrients(constraints, base.nutrientProfile, base.dual),
      opportunities,
      nearMisses,
      skippedForMissingData,
    };
  });
}

// ---------------------------------------------------------------------------
// strategy comparison

export type StrategyOutcome = {
  id: string;
  label: string;
  description: string;
  status: "optimal" | "infeasible" | "missing-data" | "error" | "not-distinct";
  message?: string;
  solution?: FormulationSolution;
  nutrientProfile?: FormulationNutrientComparison[];
};

export type ExtraStrategy = {
  id: string;
  label: string;
  description: string;
  scenario: FormulationScenario;
};

export async function compareFormulationStrategies(
  scenario: FormulationScenario,
  extraStrategies: readonly ExtraStrategy[] = [],
): Promise<StrategyOutcome[] | { status: "error"; message: string }> {
  return guard(async () => {
    const outcomes: StrategyOutcome[] = [];
    const result = await formulateLeastCostDiet(
      scenario.phase,
      scenario.energySystem,
      scenario.options,
      scenario.library,
      scenario.settings,
    );

    if (result.status === "optimal") {
      outcomes.push({
        id: "least_cost",
        label: "Least cost",
        description: "Minimum-cost formulation meeting every requirement.",
        status: "optimal",
        solution: result.solution,
        nutrientProfile: result.nutrientProfile,
      });
      const builtIn: Array<[string, string, string]> = [
        ["simple", "Simpler recipe", "Fewest ingredients"],
        ["low-soy", "Lower soy", "Least soybean meal"],
        ["low-import", "Lower imports", "Prefers local ingredients"],
      ];
      for (const [id, label, aim] of builtIn) {
        const alternative = result.alternatives.find((candidate) => candidate.id === id);
        outcomes.push({
          id: id.replace("-", "_"),
          label,
          description: `${aim} within ${result.alternativeCostTolerancePct}% of least cost.`,
          ...(alternative
            ? {
                status: "optimal" as const,
                solution: alternative.solution,
                nutrientProfile: alternative.nutrientProfile,
              }
            : {
                status: "not-distinct" as const,
                message: `No distinct formulation within ${result.alternativeCostTolerancePct}% of least cost.`,
              }),
        });
      }
    } else {
      outcomes.push({
        id: "least_cost",
        label: "Least cost",
        description: "Minimum-cost formulation meeting every requirement.",
        status: result.status,
        message: result.message,
      });
    }

    const glpk = await loadGlpk();
    for (const strategy of extraStrategies) {
      try {
        const solved = await solveScenario(glpk, strategy.scenario);
        outcomes.push({
          id: strategy.id,
          label: strategy.label,
          description: strategy.description,
          status: solved.status,
          ...(solved.status === "optimal"
            ? { solution: solved.solution, nutrientProfile: solved.nutrientProfile }
            : {}),
        });
      } catch (error) {
        outcomes.push({
          id: strategy.id,
          label: strategy.label,
          description: strategy.description,
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return outcomes;
  });
}

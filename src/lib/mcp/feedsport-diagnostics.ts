/**
 * Agent-facing diagnostics: explain, diagnose, sensitivity, opportunities and
 * strategy comparison. All numbers come from the engine in
 * feed-formulation-diagnostics; this file resolves input and phrases results.
 */
import {
  compareFormulationStrategies,
  diagnoseInfeasibility,
  explainFormulation,
  findIngredientOpportunities,
  runSensitivityAnalysis,
  type DiagnosticFailure,
  type ExtraStrategy,
  type InclusionChange,
  type LimitingNutrient,
  type SensitivityScenario,
} from "@/lib/feed-formulation-diagnostics";
import { formulationRequirements, type FormulationIngredientOption } from "@/lib/feed-optimizer";
import { INGREDIENT_LIBRARY, type IngredientLibrary } from "@/lib/ingredient-nutrients";
import { PUBLIC_PREMIX_ID } from "@/lib/public-feed-premix";

import {
  CURRENCY,
  FeedSportInputError,
  buildScenario,
  comparisonRows,
  libraryName,
  priceRecord,
  recipeRows,
  resolveRequestedIngredient,
  round,
  snake,
  type FeedSportServiceContext,
  type FormulationBaseInput,
} from "./feedsport-service";

const MARGINAL_NOTE =
  "Shadow prices and price gaps are marginal values from the GLPK solution and hold for small changes. Use run_sensitivity_analysis to confirm larger changes.";

const perTonne = (perKg: number) => round(perKg * 1000, 2);
const money = (value: number) => `$${Math.abs(value).toFixed(2)}/t`;
const pct = (value: number, digits?: number) =>
  `${value.toFixed(digits ?? (Math.abs(value) >= 1 ? 1 : Math.abs(value) >= 0.1 ? 2 : 3))}%`;

type Scenario = ReturnType<typeof buildScenario>;

function labelLookup(built: Scenario): (constraintId: string) => string {
  const labels = new Map(
    formulationRequirements(
      built.scenario.phase,
      built.scenario.energySystem,
      built.scenario.settings,
    ).map((requirement) => [requirement.id, requirement.label]),
  );
  return (constraintId) => labels.get(constraintId) ?? constraintId;
}

function nameOf(id: string, library: IngredientLibrary = INGREDIENT_LIBRARY): string {
  return libraryName(id, library);
}

function failureResponse(result: DiagnosticFailure | { status: "error"; message: string }, built: Scenario) {
  if (result.status === "missing-data") {
    return {
      status: "missing_data" as const,
      message:
        "Some ingredients are missing nutrient values required by the formulation model. FeedSport will not assume those values are zero.",
      missing_data: result.missingData.map((row) => ({
        ingredient: row.ingredientId,
        nutrients: row.nutrientIds.map(snake),
      })),
      ...built.common,
    };
  }
  if (result.status === "infeasible") {
    return {
      status: "infeasible" as const,
      message: "No valid formulation exists for this request. Call diagnose_infeasibility to find out why.",
      ...built.common,
    };
  }
  return { status: "error" as const, message: result.message, ...built.common };
}

function limitingRows(limiting: readonly LimitingNutrient[]) {
  return limiting.map((row) => ({
    nutrient: snake(row.constraintId),
    label: row.label,
    unit: row.unit,
    relation: row.relation,
    requirement: round(row.bound),
    actual: round(row.actual),
    cost_per_tonne_per_unit: round(row.costPerKgPerUnit * 1000, 4),
    cost_per_tonne_per_1_percent_tighter: perTonne(row.costPerKgPerPercent),
  }));
}

function changeRows(changes: readonly InclusionChange[], library: IngredientLibrary) {
  return changes.map((change) => ({
    ingredient: change.ingredientId,
    name: nameOf(change.ingredientId, library),
    from_percent: round(change.basePct, 3),
    to_percent: round(change.newPct, 3),
  }));
}

function describeChanges(changes: readonly InclusionChange[], library: IngredientLibrary, limit = 3): string {
  return changes
    .slice(0, limit)
    .map(
      (change) =>
        `${nameOf(change.ingredientId, library)} ${pct(change.basePct)} → ${pct(change.newPct)}`,
    )
    .join(", ");
}

/**
 * Priced ingredients outside the request. Requested candidates must have a
 * FeedSport price; the default pool silently skips unpriced ingredients.
 */
function candidateOptions(
  built: Scenario,
  context: FeedSportServiceContext,
  requested?: readonly string[],
): FormulationIngredientOption[] {
  const offered = new Set(built.request.ingredientIds);
  const ids = requested
    ? requested.map((name) => resolveRequestedIngredient(name, INGREDIENT_LIBRARY))
    : INGREDIENT_LIBRARY.ingredients.map((ingredient) => ingredient.id);

  return [...new Set(ids)].flatMap((id) => {
    if (offered.has(id) || id === PUBLIC_PREMIX_ID) return [];
    const price = priceRecord(id, undefined, context);
    if (!price) {
      if (requested) {
        throw new FeedSportInputError(`FeedSport has no planning price for candidate ${id}.`);
      }
      return [];
    }
    return [{ ingredientId: id, pricePerKg: price.price_per_tonne / 1000 }];
  });
}

// ---------------------------------------------------------------------------
// explain_formulation

export type ExplainInput = FormulationBaseInput & { ingredients_to_explain?: string[] };

export async function explainFormulationTool(input: ExplainInput, context: FeedSportServiceContext) {
  const built = buildScenario(input, context);
  const { library } = built.request;
  const label = labelLookup(built);

  const offered = new Set(built.request.ingredientIds);
  const focusIds = (input.ingredients_to_explain ?? []).map((name) =>
    resolveRequestedIngredient(name, INGREDIENT_LIBRARY),
  );
  const outside = focusIds
    .filter((id) => !offered.has(id))
    .map((id) => {
      const price = priceRecord(id, undefined, context);
      if (!price) {
        throw new FeedSportInputError(`FeedSport has no planning price for ${id}, so it cannot be priced against this formulation.`);
      }
      return { ingredientId: id, pricePerKg: price.price_per_tonne / 1000 };
    });

  const result = await explainFormulation(built.scenario, outside);
  if (result.status !== "optimal") return failureResponse(result, built);

  const findings: string[] = [`Least-cost formulation: ${money(result.solution.costPerKg * 1000)}.`];
  if (result.limitingNutrients.length > 0) {
    findings.push(
      `Limiting nutrients, most costly first: ${result.limitingNutrients.map((row) => row.label).join(", ")}.`,
    );
    for (const row of result.limitingNutrients.slice(0, 3)) {
      findings.push(
        `Raising the ${row.label} requirement by 1% would add about ${money(row.costPerKgPerPercent * 1000)}.`,
      );
    }
  }

  const focus = new Set(focusIds);
  const ingredients = result.ingredients.map((row) => {
    const name = nameOf(row.ingredientId, library);
    const base = {
      ingredient: row.ingredientId,
      name,
      status: row.status,
      offered_to_solver: row.offered,
      percentage: round(row.inclusionPct, 4),
      price_per_tonne: perTonne(row.pricePerKg),
      ...(row.minPct !== undefined
        ? { limits: { min_percent: round(row.minPct, 4), max_percent: round(row.maxPct!, 4) } }
        : {}),
    };
    const rc = row.reducedCostPerKg ?? 0;

    if (row.ingredientId === PUBLIC_PREMIX_ID) {
      // Fixed by FeedSport to deliver supplementation; marginal values don't apply.
      return { ...base, status: "fixed_inclusion" as const };
    }

    if (row.status === "missing_data") {
      findings.push(`${name} cannot be evaluated: FeedSport has no ${row.missingNutrientIds!.map(snake).join(", ")} data for it.`);
      return { ...base, missing_nutrients: row.missingNutrientIds!.map(snake) };
    }

    if (row.status === "not_selected" || row.status === "not_offered") {
      const entryPrice = row.pricePerKg - rc;
      const prefix = row.status === "not_offered" ? `${name} was not offered to the solver, but` : `${name} is not selected:`;
      if (row.status === "not_offered" && rc < -1e-9) {
        findings.push(
          `${name} was not offered to the solver, but at ${money(row.pricePerKg * 1000)} it would pay its way: its nutrients are worth up to ${money(entryPrice * 1000)} here. Call find_ingredient_opportunities to get the confirmed saving.`,
        );
        return {
          ...base,
          would_lower_cost: true,
          entry_price_per_tonne: perTonne(entryPrice),
          price_gap_per_tonne: perTonne(rc),
        };
      }
      if (row.status === "not_offered" || focus.has(row.ingredientId) || focus.size === 0) {
        findings.push(
          entryPrice > 0
            ? `${prefix} at ${money(row.pricePerKg * 1000)} it is ${money(rc * 1000)} too expensive for the nutrients it supplies, so it would only enter below ${money(entryPrice * 1000)}. Forcing 1% in would add about ${money(rc * 10)}.`
            : `${prefix} it would not lower cost even if free — the nutrients it supplies are not limiting in this formulation, so including it would only displace other ingredients.`,
        );
      }
      return {
        ...base,
        price_gap_per_tonne: perTonne(rc),
        ...(entryPrice > 0
          ? { entry_price_per_tonne: perTonne(entryPrice) }
          : { would_not_enter_at_any_price: true }),
        cost_per_tonne_of_forcing_1_percent: round(rc * 10, 2),
      };
    }

    if (row.status === "at_max_limit") {
      findings.push(
        `${name} is held at its ${pct(row.maxPct!)} maximum; each extra 1% allowed would save about ${money(-rc * 10)}.`,
      );
      return { ...base, saving_per_tonne_per_extra_1_percent_allowed: round(-rc * 10, 2) };
    }

    if (row.status === "at_min_limit") {
      findings.push(
        `${name} is held at its ${pct(row.minPct!)} minimum; each 1% less would save about ${money(rc * 10)}.`,
      );
      return { ...base, saving_per_tonne_per_1_percent_less: round(rc * 10, 2) };
    }

    const supplies = (row.supplies ?? []).map((supply) => ({
      nutrient: snake(supply.constraintId),
      label: label(supply.constraintId),
      share_percent: round(supply.sharePct, 1),
    }));
    if (focus.has(row.ingredientId) && supplies.length > 0) {
      findings.push(
        `${name} is selected at ${pct(row.inclusionPct)} because it is a cost-effective source of ${supplies
          .slice(0, 3)
          .map((supply) => `${supply.label} (${pct(supply.share_percent, 0)} of the diet's supply)`)
          .join(", ")}.`,
      );
    }
    return { ...base, ...(supplies.length > 0 ? { supplies_limiting_nutrients: supplies } : {}) };
  });

  return {
    status: "optimal" as const,
    cost_per_tonne: perTonne(result.solution.costPerKg),
    currency: CURRENCY,
    findings,
    limiting_nutrients: limitingRows(result.limitingNutrients),
    ingredients,
    recipe: recipeRows(result.solution.formula, built.pricesPerTonne, library),
    requirement_comparison: comparisonRows(result.nutrientProfile),
    notes: [...built.notes, MARGINAL_NOTE],
    ...built.common,
  };
}

// ---------------------------------------------------------------------------
// diagnose_infeasibility

export type DiagnoseInput = FormulationBaseInput & {
  candidate_ingredients?: string[];
};

export async function diagnoseInfeasibilityTool(input: DiagnoseInput, context: FeedSportServiceContext) {
  const built = buildScenario(input, context);
  const { library } = built.request;
  const label = labelLookup(built);

  const hasRequestLimits = built.options.some(
    (option) =>
      option.ingredientId !== PUBLIC_PREMIX_ID &&
      (option.minInclusionPct !== undefined || option.maxInclusionPct !== undefined),
  );
  const defaultLimitOptions = hasRequestLimits
    ? built.options.map((option) =>
        option.ingredientId === PUBLIC_PREMIX_ID
          ? option
          : { ingredientId: option.ingredientId, pricePerKg: option.pricePerKg },
      )
    : undefined;

  const result = await diagnoseInfeasibility(built.scenario, {
    addCandidates: candidateOptions(built, context, input.candidate_ingredients),
    defaultLimitOptions,
  });

  if (result.status === "feasible") {
    return {
      status: "feasible" as const,
      message: "A valid formulation exists for this request; call formulate to get it.",
      cost_per_tonne: perTonne(result.costPerKg),
      currency: CURRENCY,
      ...built.common,
    };
  }
  if (result.status !== "infeasible") return failureResponse(result, built);

  const findings: string[] = [];
  for (const issue of result.boundIssues) {
    findings.push(
      issue.kind === "min_sum_above_100"
        ? `Ingredient minimums add up to ${pct(issue.totalPct, 2)}, more than 100%.`
        : `Ingredient maximums add up to only ${pct(issue.totalPct, 2)}, less than 100%.`,
    );
  }
  for (const row of result.unachievable) {
    findings.push(
      `${row.label} cannot be met by any blend of these ingredients within their inclusion limits: the best possible is ${round(row.bestAchievable, 4)} ${row.unit} against a ${row.relation === "min" ? "minimum" : "maximum"} of ${round(row.bound, 4)} ${row.unit}.`,
    );
  }
  const unachievableIds = new Set(result.unachievable.map((row) => row.constraintId));
  const otherShortfalls = result.deviations.filter((row) => !unachievableIds.has(row.constraintId));
  if (otherShortfalls.length > 0) {
    findings.push(
      `The closest achievable diet also misses: ${otherShortfalls
        .map(
          (row) =>
            `${row.label} (${round(row.actual, 4)} vs ${row.relation === "min" ? "minimum" : "maximum"} ${round(row.bound, 4)} ${row.unit})`,
        )
        .join(", ")}.`,
    );
  }
  if (result.conflictingConstraintIds.length > 1 || (result.conflictingConstraintIds.length === 1 && !unachievableIds.has(result.conflictingConstraintIds[0]))) {
    findings.push(
      `These requirements cannot all be met at once: ${result.conflictingConstraintIds.map(label).join(", ")}. Removing any one of them would make the rest achievable, but FeedSport requirements cannot be relaxed — change the ingredients instead.`,
    );
  }
  const fixes = result.fixes.slice(0, 5);
  for (const fix of fixes) {
    const names = fix.ingredientIds.map((id) => nameOf(id, library)).join(" + ");
    findings.push(
      fix.kind === "add_ingredients"
        ? `Adding ${names} makes a valid formulation possible at ${money(fix.costPerKg * 1000)}.`
        : `Removing the request's own inclusion limits on ${names} (keeping FeedSport defaults) makes it feasible at ${money(fix.costPerKg * 1000)}.`,
    );
  }
  if (fixes.length === 0) {
    findings.push(`No fix was found among ${result.candidatesTested} priced FeedSport ingredients with complete data.`);
  }

  return {
    status: "infeasible" as const,
    findings,
    inclusion_limit_issues: result.boundIssues.map((issue) => ({
      issue: issue.kind,
      total_percent: round(issue.totalPct, 4),
    })),
    unachievable_requirements: result.unachievable.map((row) => ({
      nutrient: snake(row.constraintId),
      label: row.label,
      unit: row.unit,
      relation: row.relation,
      requirement: round(row.bound),
      best_achievable: round(row.bestAchievable),
      best_sources: row.bestSources,
    })),
    conflicting_requirements: result.conflictingConstraintIds.map((id) => ({
      nutrient: snake(id),
      label: label(id),
    })),
    closest_approach: result.deviations.map((row) => ({
      nutrient: snake(row.constraintId),
      label: row.label,
      unit: row.unit,
      requirement: round(row.bound),
      best_achievable: round(row.actual),
      ...(row.relation === "min" ? { shortfall: round(row.shortfall) } : { excess: round(row.excess) }),
    })),
    fixes: fixes.map((fix) => ({
      kind: fix.kind,
      ingredients: fix.ingredientIds,
      cost_per_tonne: perTonne(fix.costPerKg),
      recipe: fix.inclusions
        .sort((a, b) => b.inclusionPct - a.inclusionPct)
        .map((row) => ({ ingredient: row.ingredientId, percentage: round(row.inclusionPct, 5) })),
    })),
    candidates_tested: result.candidatesTested,
    notes: [
      ...built.notes,
      "Fixes are confirmed by re-solving. Call formulate with the suggested ingredients to get the full validated result.",
    ],
    ...built.common,
  };
}

// ---------------------------------------------------------------------------
// run_sensitivity_analysis

export type SensitivityChangeInput = {
  ingredient: string;
  price_per_tonne?: number;
  price_change_percent?: number;
  min_percent?: number;
  max_percent?: number;
};

export type SensitivityInput = FormulationBaseInput & {
  scenarios?: Array<{ name?: string; changes: SensitivityChangeInput[] }>;
  price_steps_percent?: number[];
};

export async function runSensitivityAnalysisTool(input: SensitivityInput, context: FeedSportServiceContext) {
  const built = buildScenario(input, context);
  const { library, ingredientIds } = built.request;
  const label = labelLookup(built);
  const basePrice = new Map(built.options.map((option) => [option.ingredientId, option.pricePerKg]));

  const variations: SensitivityScenario[] = input.scenarios
    ? input.scenarios.map((scenario, index) => ({
        name: scenario.name ?? `Scenario ${index + 1}`,
        changes: scenario.changes.map((change) => {
          const id = resolveRequestedIngredient(change.ingredient, INGREDIENT_LIBRARY);
          if (!ingredientIds.includes(id)) {
            throw new FeedSportInputError(`Scenario changes ${id}, which is not in the ingredient list.`);
          }
          if (id === PUBLIC_PREMIX_ID && (change.min_percent !== undefined || change.max_percent !== undefined)) {
            throw new FeedSportInputError("The FeedSport premix inclusion is fixed; it cannot be varied.");
          }
          if (change.price_per_tonne !== undefined && change.price_change_percent !== undefined) {
            throw new FeedSportInputError(`Give either price_per_tonne or price_change_percent for ${id}, not both.`);
          }
          const pricePerKg =
            change.price_per_tonne !== undefined
              ? change.price_per_tonne / 1000
              : change.price_change_percent !== undefined
                ? basePrice.get(id)! * (1 + change.price_change_percent / 100)
                : undefined;
          return {
            ingredientId: id,
            ...(pricePerKg !== undefined ? { pricePerKg: Math.max(0, pricePerKg) } : {}),
            ...(change.min_percent !== undefined ? { minInclusionPct: change.min_percent } : {}),
            ...(change.max_percent !== undefined ? { maxInclusionPct: change.max_percent } : {}),
          };
        }),
      }))
    : ingredientIds
        .filter((id) => id !== PUBLIC_PREMIX_ID)
        .flatMap((id) =>
          (input.price_steps_percent ?? [-10, 10]).map((step) => ({
            name: `${nameOf(id, library)} price ${step > 0 ? "+" : ""}${step}%`,
            changes: [{ ingredientId: id, pricePerKg: Math.max(0, basePrice.get(id)! * (1 + step / 100)) }],
          })),
        );

  const result = await runSensitivityAnalysis(built.scenario, variations);
  if (result.status !== "optimal") return failureResponse(result, built);

  const baseCost = result.base.costPerKg;
  const scenarios = result.outcomes.map((outcome) => ({
    name: outcome.name,
    changes: outcome.changes.map((change) => ({
      ingredient: change.ingredientId,
      ...(change.pricePerKg !== undefined
        ? {
            price_per_tonne: perTonne(change.pricePerKg),
            base_price_per_tonne: perTonne(basePrice.get(change.ingredientId)!),
          }
        : {}),
      ...(change.minInclusionPct !== undefined ? { min_percent: change.minInclusionPct } : {}),
      ...(change.maxInclusionPct !== undefined ? { max_percent: change.maxInclusionPct } : {}),
    })),
    status: outcome.status === "missing-data" ? "missing_data" : outcome.status,
    ...(outcome.message ? { message: outcome.message } : {}),
    ...(outcome.solution
      ? {
          cost_per_tonne: perTonne(outcome.solution.costPerKg),
          cost_change_per_tonne: perTonne(outcome.costChangePerKg!),
          cost_change_percent: round((outcome.costChangePerKg! / baseCost) * 100, 2),
          recipe_changes: changeRows(outcome.inclusionChanges!, library),
          newly_limiting: outcome.newlyLimiting!.map(label),
          no_longer_limiting: outcome.noLongerLimiting!.map(label),
        }
      : {}),
  }));

  const findings = [`Base formulation: ${money(baseCost * 1000)}.`];
  for (const outcome of result.outcomes) {
    if (outcome.status !== "optimal") {
      findings.push(`${outcome.name}: ${outcome.status === "infeasible" ? "no valid formulation" : outcome.message ?? outcome.status}.`);
      continue;
    }
    const delta = outcome.costChangePerKg! * 1000;
    const recipe = outcome.inclusionChanges!.length > 0
      ? `; recipe shifts: ${describeChanges(outcome.inclusionChanges!, library)}`
      : "; recipe unchanged";
    findings.push(
      `${outcome.name}: ${Math.abs(delta) < 0.005 ? "no cost change" : `cost ${delta > 0 ? "+" : "−"}${money(delta)}`}${recipe}.`,
    );
  }

  return {
    status: "optimal" as const,
    base_cost_per_tonne: perTonne(baseCost),
    currency: CURRENCY,
    base_recipe: recipeRows(result.base.formula, built.pricesPerTonne, library),
    base_limiting_nutrients: result.baseLimiting.map((row) => row.label),
    findings,
    scenarios,
    notes: [
      ...built.notes,
      "Each scenario is fully re-solved. Inclusion limits in scenarios are still clamped to FeedSport defaults.",
    ],
    ...built.common,
  };
}

// ---------------------------------------------------------------------------
// find_ingredient_opportunities

export type OpportunitiesInput = FormulationBaseInput & {
  candidate_ingredients?: string[];
  limit?: number;
};

export async function findIngredientOpportunitiesTool(input: OpportunitiesInput, context: FeedSportServiceContext) {
  const built = buildScenario(input, context);
  const { library } = built.request;
  const label = labelLookup(built);
  const candidates = candidateOptions(built, context, input.candidate_ingredients);
  const limit = input.limit ?? 5;

  const result = await findIngredientOpportunities(built.scenario, candidates);
  if (result.status !== "optimal") return failureResponse(result, built);

  const findings = [`Current formulation: ${money(result.base.costPerKg * 1000)}.`];
  if (result.limitingNutrients.length > 0) {
    findings.push(
      `The most limiting nutrient is ${result.limitingNutrients[0].label}` +
        (result.limitingNutrients.length > 1
          ? `, followed by ${result.limitingNutrients.slice(1, 3).map((row) => row.label).join(" and ")}.`
          : "."),
    );
  }
  const opportunities = result.opportunities.slice(0, limit);
  for (const row of opportunities) {
    const confirmed = row.confirmed!;
    const displaced = confirmed.inclusionChanges.filter(
      (change) => change.ingredientId !== row.ingredientId && change.newPct < change.basePct,
    );
    findings.push(
      `Introducing ${nameOf(row.ingredientId, library)} at ${money(row.pricePerKg * 1000)} (${pct(confirmed.inclusionPct, 2)} inclusion) lowers cost by ${money(confirmed.savingPerKg * 1000)} to ${money(confirmed.costPerKg * 1000)}` +
        (row.valuedFor.length > 0 ? `, mainly as a source of ${row.valuedFor.slice(0, 2).map((value) => label(value.constraintId)).join(" and ")}` : "") +
        (displaced.length > 0 ? `; it reduces ${describeChanges(displaced, library, 2)}` : "") +
        ".",
    );
  }
  if (opportunities.length === 0) {
    findings.push(`None of the ${candidates.length - result.skippedForMissingData.length} priced candidates would lower cost at current prices.`);
  }
  for (const row of result.nearMisses.slice(0, 3)) {
    findings.push(
      `${nameOf(row.ingredientId, library)} would start paying its way below ${money(row.entryPricePerKg * 1000)} (currently ${money(row.pricePerKg * 1000)}).`,
    );
  }

  return {
    status: "optimal" as const,
    base_cost_per_tonne: perTonne(result.base.costPerKg),
    currency: CURRENCY,
    findings,
    limiting_nutrients: limitingRows(result.limitingNutrients),
    opportunities: opportunities.map((row) => ({
      ingredient: row.ingredientId,
      name: nameOf(row.ingredientId, library),
      price_per_tonne: perTonne(row.pricePerKg),
      saving_per_tonne: perTonne(row.confirmed!.savingPerKg),
      new_cost_per_tonne: perTonne(row.confirmed!.costPerKg),
      inclusion_percent: round(row.confirmed!.inclusionPct, 4),
      valued_for: row.valuedFor.map((value) => ({
        nutrient: snake(value.constraintId),
        label: label(value.constraintId),
        value_per_tonne: perTonne(value.valuePerKg),
      })),
      recipe_changes: changeRows(row.confirmed!.inclusionChanges, library),
    })),
    near_misses: result.nearMisses.map((row) => ({
      ingredient: row.ingredientId,
      name: nameOf(row.ingredientId, library),
      price_per_tonne: perTonne(row.pricePerKg),
      entry_price_per_tonne: perTonne(row.entryPricePerKg),
      price_gap_per_tonne: perTonne(row.reducedCostPerKg),
    })),
    candidates_tested: candidates.length - result.skippedForMissingData.length,
    skipped_for_missing_data: result.skippedForMissingData,
    notes: [
      ...built.notes,
      "Savings are confirmed by re-solving with each candidate offered. FeedSport optimizes cost against fixed requirements; animal-performance effects are not modelled.",
    ],
    ...built.common,
  };
}

// ---------------------------------------------------------------------------
// compare_formulation_strategies

export type CompareInput = FormulationBaseInput & {
  force_ingredients?: Array<{ ingredient: string; min_percent: number }>;
  compare_programme_ids?: string[];
};

export async function compareFormulationStrategiesTool(input: CompareInput, context: FeedSportServiceContext) {
  const built = buildScenario(input, context);
  const { library } = built.request;
  const extras: ExtraStrategy[] = [];

  const hasRequestLimits = built.options.some(
    (option) =>
      option.ingredientId !== PUBLIC_PREMIX_ID &&
      (option.minInclusionPct !== undefined || option.maxInclusionPct !== undefined),
  );
  if (hasRequestLimits) {
    extras.push({
      id: "without_request_limits",
      label: "Without request limits",
      description: "Least cost with only FeedSport's default inclusion limits, showing what the request's own limits cost.",
      scenario: {
        ...built.scenario,
        options: built.options.map((option) =>
          option.ingredientId === PUBLIC_PREMIX_ID
            ? option
            : { ingredientId: option.ingredientId, pricePerKg: option.pricePerKg },
        ),
      },
    });
  }

  for (const force of input.force_ingredients ?? []) {
    const id = resolveRequestedIngredient(force.ingredient, INGREDIENT_LIBRARY);
    if (id === PUBLIC_PREMIX_ID) {
      throw new FeedSportInputError("The FeedSport premix inclusion is fixed; it cannot be forced.");
    }
    const existing = built.options.find((option) => option.ingredientId === id);
    let options: FormulationIngredientOption[];
    if (existing) {
      options = built.options.map((option) =>
        option.ingredientId === id
          ? { ...option, minInclusionPct: Math.max(option.minInclusionPct ?? 0, force.min_percent) }
          : option,
      );
    } else {
      const price = priceRecord(id, undefined, context);
      if (!price) throw new FeedSportInputError(`FeedSport has no planning price for ${id}.`);
      options = [
        ...built.options,
        { ingredientId: id, pricePerKg: price.price_per_tonne / 1000, minInclusionPct: force.min_percent },
      ];
    }
    extras.push({
      id: `forced_${snake(id)}`,
      label: `Force ${nameOf(id, library)} ≥ ${pct(force.min_percent)}`,
      description: `Least cost with at least ${force.min_percent}% ${nameOf(id, library)}.`,
      scenario: { ...built.scenario, options },
    });
  }

  for (const programmeId of input.compare_programme_ids ?? []) {
    const other = buildScenario({ ...input, programme_id: programmeId }, context);
    extras.push({
      id: `programme_${other.common.programme.id}`,
      label: other.common.programme.name,
      description: "Least cost with the same ingredients against a different programme's requirements.",
      scenario: other.scenario,
    });
  }

  const outcomes = await compareFormulationStrategies(built.scenario, extras);
  if (!Array.isArray(outcomes)) return failureResponse(outcomes, built);

  const leastCost = outcomes.find((outcome) => outcome.id === "least_cost")?.solution?.costPerKg;
  const strategies = outcomes.map((outcome) => {
    const solution = outcome.solution;
    return {
      id: outcome.id,
      label: outcome.label,
      description: outcome.description,
      status: outcome.status === "missing-data" ? "missing_data" : outcome.status.replace("-", "_"),
      ...(outcome.message ? { message: outcome.message } : {}),
      ...(solution
        ? {
            cost_per_tonne: perTonne(solution.costPerKg),
            ...(leastCost !== undefined
              ? {
                  cost_vs_least_cost_per_tonne: perTonne(solution.costPerKg - leastCost),
                  cost_vs_least_cost_percent: round(((solution.costPerKg - leastCost) / leastCost) * 100, 2),
                }
              : {}),
            ingredient_count: solution.formula.ingredients.length,
            soybean_meal_percent: round(solution.analysis.soybeanMealPct, 3),
            binding_requirements: (outcome.nutrientProfile ?? [])
              .filter((row) => row.binding)
              .map((row) => row.label),
            recipe: [...solution.formula.ingredients]
              .sort((a, b) => b.inclusionPct - a.inclusionPct)
              .map((row) => ({ ingredient: row.ingredientId, percentage: round(row.inclusionPct, 5) })),
          }
        : {}),
    };
  });

  const findings = strategies.map((strategy) => {
    if (!("cost_per_tonne" in strategy) || strategy.cost_per_tonne === undefined) {
      return `${strategy.label}: ${(strategy.message ?? strategy.status.replace("_", " ")).replace(/\.$/, "")}.`;
    }
    const delta = strategy.cost_vs_least_cost_per_tonne;
    return `${strategy.label}: ${money(strategy.cost_per_tonne)}, ${strategy.ingredient_count} ingredients, ${pct(strategy.soybean_meal_percent ?? 0)} soybean meal` +
      (strategy.id !== "least_cost" && delta !== undefined ? ` (${delta >= 0 ? "+" : "−"}${money(delta)} vs least cost)` : "") +
      ".";
  });

  return {
    status: "ok" as const,
    currency: CURRENCY,
    findings,
    strategies,
    notes: [...built.notes, "Every strategy is solved against FeedSport requirements; none relaxes them."],
    ...built.common,
  };
}

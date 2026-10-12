import { analyzeDiet, type AnalyzedNutrient, type DietAnalysis, type DietFormula } from "./diet-formula";
import {
  commercialPremixById,
  eligibleCommercialPremixes,
  type CommercialPremix,
} from "./commercial-premixes";
import {
  buildConstraintSpecs,
  formulateLeastCostDiet,
  nutrientFeasibilityTolerance,
  type FormulationAlternative,
  type FormulationIngredientOption,
  type LeastCostFormulationResult,
} from "./feed-optimizer";
import { aggregateLabel, aggregateTolerancePct, checkAggregateInclusion, describeAggregateSource } from "./ingredient-inclusion-limits";
import type { IngredientLibrary, IngredientNutrientRecord } from "./ingredient-nutrients";
import type { NutritionPhase } from "./nutrition";
import type { EnergySystem } from "./nutrition-targets";
import {
  INCLUSION_POLICY_VERSION,
  assessmentHeadline,
  requirementCounts,
  supplementationCounts,
  type DataStatus,
  type DocumentationGap,
  type FormulationAssessment,
  type FormulationVerdict,
  type PremixComparison,
  type PremixOption,
  type PremixRecipeEffect,
  type RequirementCheck,
  type SupplementationComparison,
} from "./formulation-assessment-model";

export * from "./formulation-assessment-model";

type GuidanceSpec = {
  id: string;
  label: string;
  unit: string;
  group: SupplementationComparison["group"];
  recommended: number | undefined;
  measure: (analysis: DietAnalysis) => AnalyzedNutrient;
};

/**
 * Brazilian Tables Chapter 7 vitamin and trace-mineral supplementation
 * recommendations. Advisory by default: they are compared with the recipe
 * and never constrain the optimizer or decide feasibility.
 */
export function supplementationGuidance(phase: NutritionPhase): GuidanceSpec[] {
  const guidance = phase.supplementation;
  if (!guidance) return [];
  const v = guidance.vitamins;
  const t = guidance.traceMinerals.inorganic;
  const vitamin = (id: string, label: string, unit: string, recommended: number | undefined, key: keyof DietAnalysis["vitamins"]): GuidanceSpec =>
    ({ id, label, unit, group: "vitamin", recommended, measure: (analysis) => analysis.supplementation.vitamins[key] });
  const mineral = (id: string, label: string, recommended: number | undefined, key: keyof DietAnalysis["traceMineralsPpm"]): GuidanceSpec =>
    ({ id, label, unit: "mg/kg", group: "trace_mineral", recommended, measure: (analysis) => analysis.supplementation.traceMineralsPpm[key] });
  return [
    vitamin("vitamin-a", "Vitamin A", "IU/kg", v.vitaminAIuKg, "vitaminAIuKg"),
    vitamin("vitamin-d3", "Vitamin D3", "IU/kg", v.vitaminDIuKg, "vitaminDIuKg"),
    vitamin("vitamin-e", "Vitamin E", "IU/kg", v.vitaminEIuKg, "vitaminEIuKg"),
    vitamin("vitamin-k3", "Vitamin K3", "mg/kg", v.vitaminKMgKg, "vitaminKMgKg"),
    vitamin("vitamin-b1", "Vitamin B1", "mg/kg", v.vitaminB1MgKg, "vitaminB1MgKg"),
    vitamin("vitamin-b2", "Vitamin B2", "mg/kg", v.riboflavinMgKg, "riboflavinMgKg"),
    vitamin("vitamin-b6", "Vitamin B6", "mg/kg", v.vitaminB6MgKg, "vitaminB6MgKg"),
    vitamin("vitamin-b12", "Vitamin B12", "mcg/kg", v.vitaminB12McgKg, "vitaminB12McgKg"),
    vitamin("pantothenic-acid", "Pantothenic acid", "mg/kg", v.pantothenicAcidMgKg, "pantothenicAcidMgKg"),
    vitamin("niacin", "Niacin", "mg/kg", v.niacinMgKg, "niacinMgKg"),
    vitamin("folic-acid", "Folic acid", "mg/kg", v.folicAcidMgKg, "folicAcidMgKg"),
    vitamin("biotin", "Biotin", "mg/kg", v.biotinMgKg, "biotinMgKg"),
    vitamin("choline", "Choline", "mg/kg", v.totalCholineMgKg, "totalCholineMgKg"),
    mineral("copper", "Copper", t.copperPpm, "copper"),
    mineral("iron", "Iron", t.ironPpm, "iron"),
    mineral("manganese", "Manganese", t.manganesePpm, "manganese"),
    mineral("selenium", "Selenium", t.seleniumPpm, "selenium"),
    mineral("zinc", "Zinc", t.zincPpm, "zinc"),
    mineral("iodine", "Iodine", t.iodinePpm, "iodine"),
  ].filter((spec) => spec.recommended !== undefined && spec.recommended > 0);
}

const dataStatus = (measure: AnalyzedNutrient): DataStatus =>
  measure.missingIngredientIds.length ? "missing" : measure.assumedZeroIngredientIds.length ? "assumed_zero" : "published";

const joinLabels = (labels: string[]) =>
  labels.length < 2
    ? labels[0] ?? ""
    : `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;

/** "SID lysine is not met. Soybean meal family exceeds its combined maximum (35% > 25%)." */
function failureSummary(failed: readonly RequirementCheck[]): string {
  const requirements = failed.filter((check) => !check.aggregate);
  const ceilings = failed.filter((check) => check.aggregate);
  const pct = (value: number) => `${+value.toFixed(2)}%`;
  return [
    requirements.length ? `${joinLabels(requirements.map((check) => check.label))} ${requirements.length === 1 ? "is" : "are"} not met.` : "",
    ...ceilings.map((check) => `${check.label} exceeds its combined maximum (${pct(check.actual)} > ${pct(check.bound)}).`),
  ].filter(Boolean).join(" ");
}

function premixesIn(formula: DietFormula, library: IngredientLibrary): IngredientNutrientRecord[] {
  return formula.ingredients.flatMap((row) => {
    if (!(row.inclusionPct > 0)) return [];
    const record = library.ingredients.find((ingredient) => ingredient.id === row.ingredientId);
    return record?.category === "vitamin_mineral_premix" ? [record] : [];
  });
}

export function buildFormulationAssessment(
  phase: NutritionPhase,
  energySystem: EnergySystem,
  formula: DietFormula,
  library: IngredientLibrary,
  options: {
    /** False when this is the optimizer's closest (diagnostic) recipe. */
    optimizerFeasible?: boolean;
    checkOptimizerConsistency?: boolean;
  } = {},
): FormulationAssessment {
  const optimizerFeasible = options.optimizerFeasible ?? true;
  const analysis = analyzeDiet(formula, [], library);
  const single = new Map(formula.ingredients
    .filter((row) => row.inclusionPct > 0)
    .map((row) => [row.ingredientId, {
      share: row.inclusionPct / 100,
      analysis: analyzeDiet({ ingredients: [{ ingredientId: row.ingredientId, inclusionPct: 100 }] }, [], library),
    }]));
  const contributionsOf = (measureOf: (analysis: DietAnalysis) => AnalyzedNutrient) =>
    [...single].flatMap(([ingredientId, { share, analysis: alone }]) => {
      const value = measureOf(alone).value * share;
      return value > 0 ? [{ ingredientId, value }] : [];
    });

  const requirements: RequirementCheck[] = buildConstraintSpecs(phase, energySystem).map((spec) => {
    const measure = spec.measure(analysis);
    const tolerance = nutrientFeasibilityTolerance(spec.bound);
    const met = spec.relation === "min"
      // Missing values can only add, so a known subtotal at the minimum is met.
      ? measure.value + tolerance >= spec.bound
      : measure.complete && measure.value - tolerance <= spec.bound;
    return {
      id: spec.id,
      label: spec.label,
      unit: spec.unit,
      relation: spec.relation,
      bound: spec.bound,
      actual: measure.value,
      status: met ? "met" : "not_met",
      limiting: met && measure.complete && Math.abs(measure.value - spec.bound) <= tolerance,
      data: dataStatus(measure),
      missingIngredientIds: measure.missingIngredientIds,
      assumedZeroIngredientIds: measure.assumedZeroIngredientIds,
      totalOnlyIngredientIds: measure.totalOnlyIngredientIds,
      contributions: contributionsOf(spec.measure),
      enforcedByOptimizer: true,
    };
  });

  // Family and constraint-group ceilings cap the members' combined inclusion,
  // checked from canonical membership exactly as the optimizer enforces them.
  for (const { rule, actualPct, contributions, exceeds } of checkAggregateInclusion(formula.ingredients, phase, library)) {
    requirements.push({
      id: rule.key,
      label: aggregateLabel(rule),
      unit: "%",
      relation: "max",
      bound: rule.maxPct,
      actual: actualPct,
      status: exceeds ? "not_met" : "met",
      limiting: !exceeds && Math.abs(actualPct - rule.maxPct) <= aggregateTolerancePct(rule.maxPct),
      data: "published",
      missingIngredientIds: [],
      assumedZeroIngredientIds: [],
      totalOnlyIngredientIds: [],
      contributions: contributions.map((row) => ({ ingredientId: row.ingredientId, value: row.inclusionPct })),
      enforcedByOptimizer: true,
      aggregate: {
        kind: rule.kind,
        id: rule.id,
        name: rule.name,
        memberIngredientIds: [...rule.memberIngredientIds],
        source: {
          type: rule.source.type,
          reference: rule.source.reference,
          ...(rule.source.url ? { url: rule.source.url } : {}),
          derivation: rule.source.derivation,
          justification: rule.source.justification,
          description: describeAggregateSource(rule),
        },
      },
    });
  }

  const premixes = premixesIn(formula, library);
  // The manufacturer's dose is a hard requirement like any inclusion limit.
  for (const premix of premixes) {
    const product = commercialPremixById(premix.id);
    if (!product) continue;
    const actual = formula.ingredients.find((row) => row.ingredientId === premix.id)?.inclusionPct ?? 0;
    requirements.push({
      id: "premix-dose",
      label: "Premix dose",
      unit: "%",
      relation: "equal",
      bound: product.inclusionPct,
      actual,
      status: Math.abs(actual - product.inclusionPct) <= 1e-6 ? "met" : "not_met",
      limiting: false,
      data: "published",
      missingIngredientIds: [],
      assumedZeroIngredientIds: [],
      totalOnlyIngredientIds: [],
      contributions: [],
      enforcedByOptimizer: true,
    });
  }

  const guidance = supplementationGuidance(phase);
  const supplementationRows: SupplementationComparison[] = guidance.map((spec) => {
    const measure = spec.measure(analysis);
    const recommended = spec.recommended!;
    const at = measure.value + nutrientFeasibilityTolerance(recommended) >= recommended;
    const undocumented = [...measure.assumedZeroIngredientIds, ...measure.missingIngredientIds];
    return {
      id: spec.id,
      label: spec.label,
      unit: spec.unit,
      group: spec.group,
      recommended,
      actual: measure.value,
      pctOfRecommendation: (measure.value / recommended) * 100,
      status: at ? "at_recommendation" : undocumented.length ? "no_data" : "below_recommendation",
      data: dataStatus(measure),
      undocumentedIngredientIds: undocumented,
    };
  });

  const documentationGaps: DocumentationGap[] = premixes.flatMap((premix) => [
    ...requirements
      .filter((check) => check.totalOnlyIngredientIds.includes(premix.id))
      .map((check) => ({ ingredientId: premix.id, nutrientId: check.id, label: check.label, reason: "total_only" as const })),
    ...supplementationRows
      .filter((row) => row.undocumentedIngredientIds.includes(premix.id))
      .map((row) => ({ ingredientId: premix.id, nutrientId: row.id, label: row.label, reason: "not_documented" as const })),
  ]);

  const consistencyErrors = options.checkOptimizerConsistency
    ? requirements
        .filter((check) => check.enforcedByOptimizer && check.status === "not_met")
        .map((check) => `${check.label} failed post-solve validation despite an enforced optimizer bound (actual ${check.actual}, ${check.relation === "min" ? "minimum" : check.relation === "max" ? "maximum" : "required"} ${check.bound}, tolerance ${nutrientFeasibilityTolerance(check.bound)}).`)
    : [];

  const failed = requirements.filter((check) => check.status === "not_met");
  const verdict: FormulationVerdict = !optimizerFeasible
    ? "infeasible"
    : failed.length || consistencyErrors.length
      ? "fails_requirements"
      : "meets_requirements";
  const assumed = requirements.filter((check) => check.data === "assumed_zero");
  const supplementation = phase.supplementation
    ? {
        source: `Brazilian Tables Chapter 7 supplementation recommendations, table${phase.supplementation.sourceTables.length === 1 ? "" : "s"} ${phase.supplementation.sourceTables.join(", ")}`,
        traceMineralBasis: "inorganic" as const,
        rows: supplementationRows,
      }
    : null;
  const assessment: FormulationAssessment = {
    schemaVersion: 2,
    inclusionPolicy: INCLUSION_POLICY_VERSION,
    optimizerFeasible,
    verdict,
    requirements,
    supplementation,
    documentationGaps,
    consistencyErrors,
    headline: "",
    summary: [
      verdict === "infeasible"
        ? "No recipe from these ingredients and limits meets every hard requirement; the closest recipe is assessed. Do not mix it."
        : failed.length
          ? failureSummary(failed)
          : "Every hard requirement of the selected programme is met.",
      assumed.length
        ? `Premix values that are not documented are counted as 0 (${assumed.length} requirement${assumed.length === 1 ? "" : "s"}); that is conservative and labelled as an assumption, not a verified value.`
        : "",
      supplementation
        ? `Vitamin and trace-mineral supplementation is compared with Chapter 7 recommendations as an advisory; it does not affect this result.`
        : "",
    ].filter(Boolean).join(" "),
    scope: "Hard requirements: the programme's energy, protein, SID amino-acid and mineral requirements, practical ingredient limits, combined ingredient-family and added-fat ceilings and the manufacturer's premix dose. FeedSport does not verify ingredient quality, manufacturing accuracy, storage or animal health.",
  };
  assessment.headline = assessmentHeadline(assessment);
  return assessment;
}

/** Used when the optimizer produced no recipe at all, not even a closest one. */
export function buildInfeasibleFormulationAssessment(message: string): FormulationAssessment {
  return {
    schemaVersion: 2,
    inclusionPolicy: INCLUSION_POLICY_VERSION,
    optimizerFeasible: false,
    verdict: "infeasible",
    requirements: [],
    supplementation: null,
    documentationGaps: [],
    consistencyErrors: [],
    headline: "No recipe meets every hard requirement",
    summary: message || "The selected ingredients and limits cannot produce a recipe that satisfies the hard requirements.",
    scope: "No recipe was produced, so nothing was assessed.",
  };
}

/**
 * Bad optional recipes cannot invalidate an independently feasible primary
 * solution. This only rejects the alternatives; it never forgives the same
 * consistency failures on the primary solution.
 */
export function keepConsistentAlternatives<T extends { assessment: FormulationAssessment }>(
  alternatives: readonly T[],
): T[] {
  return alternatives.filter((alternative) => alternative.assessment.consistencyErrors.length === 0);
}

/** The library with one premix's macro-nutrient contributions removed (counterfactual only). */
function withoutPremixContribution(library: IngredientLibrary, premixId: string): IngredientLibrary {
  return {
    ...library,
    ingredients: library.ingredients.map((record) => record.id !== premixId ? record : {
      ...record,
      composition: {},
      energy: {},
      aminoAcids: { totalPct: {}, sidDigestibilityPct: {}, sidPct: {} },
      macroMinerals: {},
    }),
  };
}

/**
 * How much the selected premix's documented macro-nutrients (amino acids,
 * minerals, protein, energy) changed the recipe. Null when the premix
 * documents none of them, so it cannot have changed anything.
 */
export async function premixRecipeEffect(
  phase: NutritionPhase,
  energySystem: EnergySystem,
  options: readonly FormulationIngredientOption[],
  library: IngredientLibrary,
  formula: DietFormula,
): Promise<PremixRecipeEffect | null> {
  const premix = premixesIn(formula, library)[0];
  if (!premix) return null;
  const alone = analyzeDiet({ ingredients: [{ ingredientId: premix.id, inclusionPct: 100 }] }, [], library);
  const requirementIds = buildConstraintSpecs(phase, energySystem)
    .filter((spec) => spec.measure(alone).value > 0)
    .map((spec) => spec.id);
  if (!requirementIds.length) return null;

  const counterfactualLibrary = withoutPremixContribution(library, premix.id);
  const without = await formulateLeastCostDiet(phase, energySystem, options, counterfactualLibrary, { explore: false });
  const withPct = new Map(formula.ingredients.map((row) => [row.ingredientId, row.inclusionPct]));
  const withoutPct = new Map(without.status === "optimal" ? without.solution.formula.ingredients.map((row) => [row.ingredientId, row.inclusionPct]) : []);
  const changes = without.status !== "optimal" ? [] : [...new Set([...withPct.keys(), ...withoutPct.keys()])]
    .filter((id) => {
      const category = library.ingredients.find((record) => record.id === id)?.category;
      return category === "amino_acid" || category === "mineral";
    })
    .map((ingredientId) => ({ ingredientId, withPremixPct: withPct.get(ingredientId) ?? 0, withoutContributionPct: withoutPct.get(ingredientId) ?? 0 }))
    .filter((change) => Math.abs(change.withPremixPct - change.withoutContributionPct) > 1e-4);
  return {
    premixId: premix.id,
    requirementIds,
    changes,
    costPerTonneWithoutContribution: without.status === "optimal" ? without.solution.costPerKg * 1000 : null,
  };
}

function premixOption(
  product: CommercialPremix,
  current: boolean,
  run: { status: PremixOption["status"]; message?: string; formula?: DietFormula; costPerKg?: number; assessment?: FormulationAssessment },
  priceMissing: boolean,
): PremixOption {
  const counts = run.assessment ? requirementCounts(run.assessment) : { met: 0, total: 0 };
  const supplementation = run.assessment ? supplementationCounts(run.assessment) : { at: 0, total: 0 };
  return {
    premixId: product.id,
    name: product.name,
    inclusionPct: product.inclusionPct,
    inclusionKgPerTonne: product.inclusionKgPerTonne,
    current,
    status: run.status,
    ...(run.message ? { message: run.message } : {}),
    costPerTonne: run.costPerKg === undefined ? null : run.costPerKg * 1000,
    costExcludesPremix: priceMissing,
    requirementsMet: counts.met,
    requirementsTotal: counts.total,
    recipe: run.formula?.ingredients.map((row) => ({ ingredientId: row.ingredientId, inclusionPct: row.inclusionPct })) ?? [],
    documentationGapLabels: [...new Set(run.assessment?.documentationGaps.map((gap) => gap.label) ?? [])],
    supplementationAt: supplementation.at,
    supplementationTotal: supplementation.total,
  };
}

/**
 * Which alternative, if any, to suggest. A suggestion needs a recipe that
 * meets every hard requirement and a concrete improvement shown by its
 * re-run: fewer documentation gaps, more Chapter 7 recommendations met, a
 * hard requirement the current premix's recipe misses, or a lower cost.
 * Higher concentrations alone never count; only recommendations reached do.
 */
export function suggestPremixReplacement(
  current: PremixOption | null,
  alternatives: readonly PremixOption[],
): { suggestedPremixId: string | null; reasons: string[] } {
  const reasonsFor = (option: PremixOption): string[] => {
    if (option.status !== "optimal" || option.requirementsMet < option.requirementsTotal) return [];
    if (!current) return [`meets all ${option.requirementsTotal} hard requirements with ${option.name} at its manufacturer dose`];
    const reasons: string[] = [];
    if (current.status !== "optimal" || current.requirementsMet < current.requirementsTotal) {
      reasons.push(`meets all ${option.requirementsTotal} hard requirements; the current premix's recipe meets ${current.requirementsMet}`);
    }
    if (option.documentationGapLabels.length < current.documentationGapLabels.length) {
      reasons.push(`${option.documentationGapLabels.length ? option.documentationGapLabels.length : "no"} documentation gap${option.documentationGapLabels.length === 1 ? "" : "s"} instead of ${current.documentationGapLabels.length}`);
    }
    if (option.supplementationAt > current.supplementationAt) {
      reasons.push(`${option.supplementationAt} of ${option.supplementationTotal} Chapter 7 recommendations reached instead of ${current.supplementationAt}`);
    }
    if (!option.costExcludesPremix && !current.costExcludesPremix && option.costPerTonne !== null && current.costPerTonne !== null &&
      option.costPerTonne < current.costPerTonne - 0.005) {
      reasons.push(`$${(current.costPerTonne - option.costPerTonne).toFixed(2)}/t cheaper`);
    }
    return reasons;
  };
  const ranked = alternatives
    .map((option) => ({ option, reasons: reasonsFor(option) }))
    .filter((entry) => entry.reasons.length)
    .sort((a, b) =>
      a.option.documentationGapLabels.length - b.option.documentationGapLabels.length ||
      b.option.supplementationAt - a.option.supplementationAt ||
      (a.option.costPerTonne ?? Infinity) - (b.option.costPerTonne ?? Infinity));
  return ranked.length
    ? { suggestedPremixId: ranked[0].option.premixId, reasons: ranked[0].reasons }
    : { suggestedPremixId: null, reasons: [] };
}

/**
 * Re-run the formulation with every other eligible commercial premix in
 * place of the selected one (Replace, never Add). Manufacturer-recipe-only
 * products are excluded: they fix the whole recipe, not just a dose.
 */
export async function comparePremixes(input: {
  phase: NutritionPhase;
  energySystem: EnergySystem;
  programmeId: string;
  options: readonly FormulationIngredientOption[];
  library: IngredientLibrary;
  current: { formula: DietFormula; costPerKg: number; assessment: FormulationAssessment; feasible: boolean } | null;
  /** Ingredients whose price is a placeholder 0 (no quotation). */
  unpricedIngredientIds?: readonly string[];
  priceForPremix: (premixId: string) => number | undefined;
}): Promise<PremixComparison | null> {
  const { phase, energySystem, programmeId, library } = input;
  const unpriced = new Set(input.unpricedIngredientIds ?? []);
  const currentProduct = input.options.map((option) => commercialPremixById(option.ingredientId)).find((product) => product !== undefined);
  if (currentProduct?.manufacturerRecipe) return null;
  const inLibrary = (id: string) => library.ingredients.some((record) => record.id === id);
  const candidates = eligibleCommercialPremixes(programmeId, phase.id)
    .filter((product) => product.id !== currentProduct?.id && !product.manufacturerRecipe && inLibrary(product.id));
  if (!candidates.length) return null;

  const basal = input.options.filter((option) => !commercialPremixById(option.ingredientId));
  const alternatives = await Promise.all(candidates.map(async (product) => {
    const price = input.priceForPremix(product.id);
    const options = [...basal, { ingredientId: product.id, pricePerKg: price ?? 0, minInclusionPct: product.inclusionPct, maxInclusionPct: product.inclusionPct }];
    const result = await formulateLeastCostDiet(phase, energySystem, options, library, { explore: false });
    if (result.status === "optimal") {
      const assessment = buildFormulationAssessment(phase, energySystem, result.solution.formula, library);
      return premixOption(product, false, { status: "optimal", formula: result.solution.formula, costPerKg: result.solution.costPerKg, assessment }, price === undefined);
    }
    if (result.status === "infeasible" && result.bestEffort) {
      const assessment = buildFormulationAssessment(phase, energySystem, result.bestEffort.formula, library, { optimizerFeasible: false });
      return premixOption(product, false, { status: "infeasible", message: result.message, formula: result.bestEffort.formula, costPerKg: result.bestEffort.costPerKg, assessment }, price === undefined);
    }
    return premixOption(product, false, { status: result.status === "missing-data" ? "missing-data" : result.status === "infeasible" ? "infeasible" : "error", message: result.message }, price === undefined);
  }));
  const current = currentProduct && input.current
    ? premixOption(currentProduct, true, {
        status: input.current.feasible ? "optimal" : "infeasible",
        formula: input.current.formula,
        costPerKg: input.current.costPerKg,
        assessment: input.current.assessment,
      }, unpriced.has(currentProduct.id))
    : null;
  return {
    currentPremixId: currentProduct?.id ?? null,
    options: current ? [current, ...alternatives] : alternatives,
    ...suggestPremixReplacement(current, alternatives),
  };
}

export type AssessedFormulation = {
  result: LeastCostFormulationResult;
  assessment?: FormulationAssessment;
  alternatives?: (FormulationAlternative & { assessment: FormulationAssessment })[];
  premixComparison: PremixComparison | null;
  premixEffect: PremixRecipeEffect | null;
};

/**
 * The single formulation entry point for the optimize API, Studio and MCP:
 * solve, assess every hard requirement, compare Chapter 7 supplementation,
 * explain the premix's effect on the recipe and re-run premix alternatives.
 */
export async function formulateAndAssess(input: {
  phase: NutritionPhase;
  energySystem: EnergySystem;
  programmeId: string;
  options: readonly FormulationIngredientOption[];
  library: IngredientLibrary;
  unpricedIngredientIds?: readonly string[];
  priceForPremix: (premixId: string) => number | undefined;
  onDiscardedAlternative?: (id: string, errors: string[]) => void;
}): Promise<AssessedFormulation> {
  const { phase, energySystem, options, library } = input;
  const result = await formulateLeastCostDiet(phase, energySystem, options, library);
  const recipe = result.status === "optimal" ? result.solution : result.status === "infeasible" ? result.bestEffort : undefined;
  const assessment = recipe
    ? buildFormulationAssessment(phase, energySystem, recipe.formula, library, {
        optimizerFeasible: result.status === "optimal",
        checkOptimizerConsistency: result.status === "optimal",
      })
    : result.status === "infeasible"
      ? buildInfeasibleFormulationAssessment(result.message)
      : undefined;
  // An optional lower-soy/simple/low-import alternative must never make a
  // valid primary formulation fail. Evaluate each independently and omit
  // alternative recipes that breach enforced nutritional bounds.
  const alternatives = result.status === "optimal"
    ? keepConsistentAlternatives(result.alternatives.map((alternative) => {
        const alternativeAssessment = buildFormulationAssessment(phase, energySystem, alternative.solution.formula, library, { checkOptimizerConsistency: true });
        if (alternativeAssessment.consistencyErrors.length) input.onDiscardedAlternative?.(alternative.id, alternativeAssessment.consistencyErrors);
        return { ...alternative, assessment: alternativeAssessment };
      }))
    : undefined;
  const healthy = !!assessment && !assessment.consistencyErrors.length;
  const premixEffect = healthy && result.status === "optimal"
    ? await premixRecipeEffect(phase, energySystem, options, library, result.solution.formula)
    : null;
  const premixComparison = healthy && recipe
    ? await comparePremixes({
        phase,
        energySystem,
        programmeId: input.programmeId,
        options,
        library,
        current: { formula: recipe.formula, costPerKg: recipe.costPerKg, assessment: assessment!, feasible: result.status === "optimal" },
        unpricedIngredientIds: input.unpricedIngredientIds,
        priceForPremix: input.priceForPremix,
      })
    : null;
  return { result, assessment, alternatives, premixComparison, premixEffect };
}

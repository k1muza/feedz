import { assessUpperLimits } from "./cfia-maximum-nutrients";
import { analyzeDiet, type AnalyzedNutrient, type DietAnalysis, type DietFormula } from "./diet-formula";
import {
  automaticPremixExclusion,
  commercialPremixById,
  eligibleCommercialPremixes,
  type CommercialPremix,
} from "./commercial-premixes";
import {
  buildConstraintSpecs,
  formulateLeastCostDiet,
  type FormulationAlternative,
  type FormulationIngredientOption,
  type LeastCostFormulationResult,
} from "./feed-optimizer";
import { aggregateLabel, checkAggregateInclusion, describeAggregateSource } from "./ingredient-inclusion-limits";
import { inclusionTotalOf, normaliseInclusionTotal } from "./inclusion-total";
import {
  INCLUSION_TOLERANCE_PCT,
  aggregateTolerancePct,
  distinguishingDp,
  exactDp,
  nutrientFeasibilityTolerance,
  withinBound,
} from "./numerical-tolerance";
import type { IngredientLibrary, IngredientNutrientRecord } from "./ingredient-nutrients";
import type { NutritionPhase } from "./nutrition";
import type { EnergySystem } from "./nutrition-targets";
import {
  INCLUSION_POLICY_VERSION,
  UPPER_LIMIT_VITAMIN_IDS,
  assessmentHeadline,
  formatUpperLimitValue,
  requirementCounts,
  supplementationCounts,
  upperLimitCounts,
  upperLimitRows,
  type DataStatus,
  type DocumentationGap,
  type FormulationAssessment,
  type FormulationVerdict,
  type PremixComparison,
  type PremixComparisonGoal,
  type PremixOption,
  type PremixVitaminLimit,
  type PremixRecipeEffect,
  type RequirementCheck,
  type SupplementationComparison,
  type UpperLimitAssessment,
  type VitaminLimitAdvice,
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

/** "vitamin A", "copper": a nutrient name inside a sentence. */
const inSentence = (label: string) => label.replace(/^Vitamin /, "vitamin ").replace(/^(Copper|Iodine|Iron|Manganese|Selenium|Zinc|Calcium|Phosphorus|Sodium|Potassium)$/, (name) => name.toLowerCase());

/** "Vitamin A and vitamin D". */
const nutrientNames = (rows: readonly { label: string }[]) => {
  const names = joinLabels(rows.map((row) => inSentence(row.label)));
  return names.charAt(0).toUpperCase() + names.slice(1);
};

const joinLabels = (labels: string[]) =>
  labels.length < 2
    ? labels[0] ?? ""
    : `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;

/** "SID lysine is not met. Soybean meal family exceeds its combined maximum (35% > 25%)." */
function failureSummary(failed: readonly RequirementCheck[]): string {
  const requirements = failed.filter((check) => !check.aggregate);
  const ceilings = failed.filter((check) => check.aggregate);
  // Enough decimals that the combined inclusion visibly differs from the ceiling.
  const pct = (value: number, check: RequirementCheck) => `${+value.toFixed(distinguishingDp(check.actual, check.bound, exactDp(check.bound, 0, 2)))}%`;
  return [
    requirements.length ? `${joinLabels(requirements.map((check) => check.label))} ${requirements.length === 1 ? "is" : "are"} not met.` : "",
    ...ceilings.map((check) => `${check.label} exceeds its combined maximum (${pct(check.actual, check)} > ${pct(check.bound, check)}).`),
  ].filter(Boolean).join(" ");
}

function premixesIn(formula: DietFormula, library: IngredientLibrary): IngredientNutrientRecord[] {
  return formula.ingredients.flatMap((row) => {
    if (!(row.inclusionPct > 0)) return [];
    const record = library.ingredients.find((ingredient) => ingredient.id === row.ingredientId);
    return record?.category === "vitamin_mineral_premix" ? [record] : [];
  });
}

/**
 * Assesses a recipe against every hard requirement.
 *
 * Batch total: amounts that total 100% to floating-point precision are
 * assessed exactly as given. Amounts within INCLUSION_TOTAL_TOLERANCE_PCT of
 * 100% (typed or shown to two decimals) are a rounding residual, recorded as
 * `inclusionTotalPct`: nutrients are measured on the mix those amounts make
 * (each amount as a share of their total), while the premix dose and the
 * ingredient-family ceilings are judged on the amounts as entered, the ones
 * that are weighed, so a residual elsewhere never moves a fixed dose or a
 * capped family off its bound. A larger difference is an incomplete or
 * excessive batch and is rejected, never rescaled.
 */
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
  const inclusionTotalPct = inclusionTotalOf(formula.ingredients);
  const composition: DietFormula = { ingredients: normaliseInclusionTotal(formula.ingredients) };
  const analysis = analyzeDiet(composition, [], library);
  const single = new Map(composition.ingredients
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
    // Missing values can only add, so a known subtotal at the minimum is met.
    const met = (spec.relation === "min" || measure.complete) && withinBound(spec.relation, measure.value, spec.bound, tolerance);
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
    const actual = formula.ingredients.reduce((sum, row) => sum + (row.ingredientId === premix.id ? row.inclusionPct : 0), 0);
    requirements.push({
      id: "premix-dose",
      label: "Premix dose",
      unit: "%",
      relation: "equal",
      bound: product.inclusionPct,
      actual,
      status: withinBound("equal", actual, product.inclusionPct, INCLUSION_TOLERANCE_PCT) ? "met" : "not_met",
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
    const at = withinBound("min", measure.value, recommended, nutrientFeasibilityTolerance(recommended));
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

  // CFIA maxima: advisory references on total-diet concentrations, never constraints.
  const upperLimits: UpperLimitAssessment = assessUpperLimits(phase, analysis, contributionsOf, (id) => (single.get(id)?.share ?? 0) * 100);
  const exceeded = upperLimits.status === "assessed" ? upperLimits.rows.filter((row) => row.status === "exceeds") : [];

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
        .map((check) => `${check.label} failed post-solve validation despite an enforced optimizer bound (actual ${check.actual}, ${check.relation === "min" ? "minimum" : check.relation === "max" ? "maximum" : "required"} ${check.bound}, tolerance ${check.aggregate ? aggregateTolerancePct(check.bound) : check.relation === "equal" ? INCLUSION_TOLERANCE_PCT : nutrientFeasibilityTolerance(check.bound)}).`)
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
    ...(Math.abs(inclusionTotalPct - 100) > INCLUSION_TOLERANCE_PCT ? { inclusionTotalPct } : {}),
    verdict,
    requirements,
    supplementation,
    upperLimits,
    documentationGaps,
    consistencyErrors,
    headline: "",
    summary: [
      verdict === "infeasible"
        ? "No recipe from these ingredients and limits meets every hard requirement; the closest recipe is assessed. Do not mix it."
        : failed.length
          ? failureSummary(failed)
          : "Every hard requirement of the selected programme is met.",
      Math.abs(inclusionTotalPct - 100) > INCLUSION_TOLERANCE_PCT
        ? `The amounts total ${inclusionTotalPct.toFixed(distinguishingDp(inclusionTotalPct, 100, 2))}%, a rounding difference: nutrients are measured on the mix they make, and the premix dose and ingredient limits on the amounts as entered.`
        : "",
      assumed.length
        ? `Premix values that are not documented are counted as 0 (${assumed.length} requirement${assumed.length === 1 ? "" : "s"}); that is conservative and labelled as an assumption, not a verified value.`
        : "",
      supplementation
        ? `Vitamin and trace-mineral supplementation is compared with Chapter 7 recommendations as an advisory; it does not affect this result.`
        : "",
      upperLimits.status === "assessed"
        ? exceeded.length
          ? `${nutrientNames(exceeded)} ${exceeded.length === 1 ? "is" : "are"} above the CFIA reference maximum for ${upperLimits.category.label.toLowerCase()} feed. The CFIA maxima are advisory references; they do not affect this result.`
          : "Total-diet vitamin and mineral concentrations are compared with CFIA reference maxima as an advisory; they do not affect this result."
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

function vitaminLimitsOf(assessment: FormulationAssessment | undefined): PremixVitaminLimit[] | undefined {
  if (assessment?.upperLimits?.status !== "assessed") return undefined;
  return upperLimitRows(assessment)
    .filter((row) => UPPER_LIMIT_VITAMIN_IDS.includes(row.id))
    .map(({ id, label, unit, max, actual, status }) => ({ id, label, unit, max, actual, status }));
}

function premixOption(
  product: CommercialPremix,
  current: boolean,
  run: { status: PremixOption["status"]; message?: string; formula?: DietFormula; costPerKg?: number; assessment?: FormulationAssessment; goalUnavailable?: boolean },
  priceMissing: boolean,
  stage: { programmeId: string; phaseId: string },
): PremixOption {
  const counts = run.assessment ? requirementCounts(run.assessment) : { met: 0, total: 0 };
  const supplementation = run.assessment ? supplementationCounts(run.assessment) : { at: 0, total: 0 };
  const vitaminLimits = vitaminLimitsOf(run.assessment);
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
    ...(vitaminLimits ? { vitaminLimits, upperLimitExceedanceLabels: upperLimitCounts(run.assessment!).exceeds.map((row) => row.label) } : {}),
    vitaminSource: { verificationStatus: product.verificationStatus, basis: product.source?.basis ?? "not stated" },
    compatibleOnLabel: automaticPremixExclusion(product, stage.programmeId, stage.phaseId) === undefined,
    ...(run.goalUnavailable ? { goalUnavailable: true } : {}),
  };
}

/**
 * Known CFIA vitamin exceedances an option introduces or worsens relative to
 * `before`. A vitamin the option does not document is unknown, never better.
 */
function vitaminTradeOffs(before: readonly PremixVitaminLimit[] | undefined, option: PremixOption): string[] {
  const was = new Map((before ?? []).map((row) => [row.id, row]));
  return (option.vitaminLimits ?? []).flatMap((row) => {
    if (row.status !== "exceeds") return [];
    const previous = was.get(row.id);
    if (!previous || previous.status !== "exceeds") {
      return [`${row.label} would be ${formatUpperLimitValue(row.actual, row.unit)}, above the CFIA reference maximum of ${formatUpperLimitValue(row.max, row.unit)}`];
    }
    return row.actual > previous.actual + nutrientFeasibilityTolerance(row.max)
      ? [`${row.label} would rise from ${formatUpperLimitValue(previous.actual, row.unit)} to ${formatUpperLimitValue(row.actual, row.unit)}, above the CFIA reference maximum of ${formatUpperLimitValue(row.max, row.unit)}`]
      : [];
  });
}

/**
 * Which alternative, if any, to suggest. A suggestion needs a recipe that
 * meets every hard requirement and a concrete improvement shown by its
 * re-run: more Chapter 7 recommendations met, a hard requirement the current
 * premix's recipe misses, or a lower complete-feed cost. Higher concentrations
 * alone never count; only recommendations reached do. Fewer documentation
 * gaps is reported alongside such an improvement, but a better-documented
 * label is not evidence of better nutrition, so it never qualifies or ranks
 * a suggestion by itself. An alternative that introduces or worsens a known
 * CFIA vitamin exceedance is never a straightforward improvement, however
 * cheap or close to Chapter 7: the comparison keeps both for the farmer.
 * With no premix selected, the feed has no vitamin supplementation at all, so
 * a compatible premix is still suggested, preferring one within the maxima,
 * and any exceedance it brings is stated in its reasons.
 */
export function suggestPremixReplacement(
  current: PremixOption | null,
  alternatives: readonly PremixOption[],
): { suggestedPremixId: string | null; reasons: string[] } {
  const reasonsFor = (option: PremixOption): string[] => {
    if (option.status !== "optimal" || option.requirementsMet < option.requirementsTotal) return [];
    // Its recipe was formulated for least cost, not the goal shown: not comparable.
    if (option.goalUnavailable) return [];
    const tradeOffs = vitaminTradeOffs(current?.vitaminLimits, option);
    if (!current) {
      return [
        `meets all ${option.requirementsTotal} hard requirements with ${option.name} at its manufacturer dose`,
        ...(option.vitaminLimits ?? []).filter((row) => row.status === "exceeds")
          .map((row) => `brings ${inSentence(row.label)} to ${formatUpperLimitValue(row.actual, row.unit)}, above the CFIA reference maximum of ${formatUpperLimitValue(row.max, row.unit)}`),
      ];
    }
    if (tradeOffs.length) return [];
    const reasons: string[] = [];
    if (current.status !== "optimal" || current.requirementsMet < current.requirementsTotal) {
      reasons.push(`meets all ${option.requirementsTotal} hard requirements; the current premix's recipe meets ${current.requirementsMet}`);
    }
    if (option.supplementationAt > current.supplementationAt) {
      reasons.push(`${option.supplementationAt} of ${option.supplementationTotal} recommendations reached instead of ${current.supplementationAt}`);
    }
    if (!option.costExcludesPremix && !current.costExcludesPremix && option.costPerTonne !== null && current.costPerTonne !== null &&
      option.costPerTonne < current.costPerTonne - 0.005) {
      reasons.push(`$${(current.costPerTonne - option.costPerTonne).toFixed(2)}/t cheaper`);
    }
    if (reasons.length && option.documentationGapLabels.length < current.documentationGapLabels.length) {
      reasons.push(`${option.documentationGapLabels.length ? option.documentationGapLabels.length : "no"} documentation gap${option.documentationGapLabels.length === 1 ? "" : "s"} instead of ${current.documentationGapLabels.length}`);
    }
    return reasons;
  };
  const ranked = alternatives
    .map((option) => ({ option, reasons: reasonsFor(option) }))
    .filter((entry) => entry.reasons.length)
    .sort((a, b) =>
      vitaminTradeOffs(current?.vitaminLimits, a.option).length - vitaminTradeOffs(current?.vitaminLimits, b.option).length ||
      b.option.supplementationAt - a.option.supplementationAt ||
      (a.option.costPerTonne ?? Infinity) - (b.option.costPerTonne ?? Infinity) ||
      a.option.documentationGapLabels.length - b.option.documentationGapLabels.length);
  return ranked.length
    ? { suggestedPremixId: ranked[0].option.premixId, reasons: ranked[0].reasons }
    : { suggestedPremixId: null, reasons: [] };
}

/**
 * The response to a CFIA vitamin A, D or E exceedance, from the premix
 * comparison's own re-runs (same basal ingredients, prices, limits and goal).
 * An alternative is recommended only when it is on-label for the phase, its
 * re-run meets every hard requirement, it documents every exceeded vitamin,
 * it lowers at least one of them without raising any, and it introduces no
 * new vitamin exceedance, and its re-run used the same goal as the recipe
 * shown (never a least-cost fallback). Ranked by exceedances resolved, then remaining
 * excess, then cost; never by how many vitamins a label lists. Null when the
 * recipe exceeds no CFIA vitamin maximum. Advice only: nothing is replaced.
 */
export function adviseOnVitaminLimits(
  assessment: FormulationAssessment,
  current: PremixOption | null,
  alternatives: readonly PremixOption[],
  currentPremix: { id: string; name: string } | null,
): VitaminLimitAdvice | null {
  const exceeded = upperLimitCounts(assessment).vitaminExceedances;
  if (!exceeded.length) return null;
  const before = vitaminLimitsOf(assessment) ?? [];
  const beforeById = new Map(before.map((row) => [row.id, row]));
  const exceedances = exceeded.map((row) => {
    const premixContribution = currentPremix ? row.contributions.find((c) => c.ingredientId === currentPremix.id)?.value ?? 0 : 0;
    return {
      id: row.id,
      label: row.label,
      unit: row.unit,
      max: row.max,
      actual: row.actual,
      contributions: row.contributions,
      premixContribution,
      premixResponsible: premixContribution > 0 && withinBound("max", row.actual - premixContribution, row.max, nutrientFeasibilityTolerance(row.max)),
    };
  });
  const labels = joinLabels(exceeded.map((row) => inSentence(row.label)));

  const notRecommended: VitaminLimitAdvice["notRecommended"] = [];
  const candidates: { option: PremixOption; after: Map<string, PremixVitaminLimit> }[] = [];
  for (const option of alternatives) {
    const after = new Map((option.vitaminLimits ?? []).map((row) => [row.id, row]));
    const undocumented = exceeded.filter((row) => !after.has(row.id) || after.get(row.id)!.status === "not_documented");
    const tradeOffs = vitaminTradeOffs(before, option);
    const reason = option.compatibleOnLabel === false
      ? "it is only permitted for this phase as an off-label simulation"
      : option.goalUnavailable
        ? "it has no recipe for the selected goal within 3% of least cost, so it cannot be compared on the same goal"
        : option.status !== "optimal" || option.requirementsMet < option.requirementsTotal
        ? option.status === "optimal" || option.status === "infeasible"
          ? `its re-run meets ${option.requirementsMet} of ${option.requirementsTotal} hard requirements`
          : `it produced no recipe${option.message ? ` (${option.message})` : ""}`
        : undocumented.length
          ? `it does not document ${joinLabels(undocumented.map((row) => inSentence(row.label)))}, so the concentration cannot be evaluated; an undocumented value is not evidence of a lower one`
          : tradeOffs.length
            ? tradeOffs.join("; ")
            : !exceeded.some((row) => after.get(row.id)!.actual < row.actual - nutrientFeasibilityTolerance(row.max))
              ? `it does not lower the calculated ${labels}`
              : "";
    if (reason) notRecommended.push({ premixId: option.premixId, name: option.name, reason });
    else candidates.push({ option, after });
  }

  const resolvedCount = (after: Map<string, PremixVitaminLimit>) => exceeded.filter((row) => after.get(row.id)!.status === "within").length;
  const remainingExcess = (after: Map<string, PremixVitaminLimit>) =>
    exceeded.reduce((sum, row) => sum + Math.max(0, after.get(row.id)!.actual - row.max) / row.max, 0);
  candidates.sort((a, b) =>
    resolvedCount(b.after) - resolvedCount(a.after) ||
    remainingExcess(a.after) - remainingExcess(b.after) ||
    (a.option.costPerTonne ?? Infinity) - (b.option.costPerTonne ?? Infinity));

  const best = candidates[0];
  const currentName = currentPremix?.name ?? "the selected premix";
  const responsible = exceedances.some((row) => row.premixResponsible);
  if (!best) {
    return {
      exceedances,
      currentPremixId: currentPremix?.id ?? null,
      recommendation: null,
      notRecommended,
      message: responsible
        ? `${alternatives.length ? `No compatible alternative premix demonstrably lowers the calculated ${labels} while meeting every hard requirement.` : "No other compatible commercial premix is available for this phase."} Verify the vitamin specifications of ${currentName} with its manufacturer.`
        : `${currentName === "the selected premix" ? "The premix" : currentName} is not the only source of the calculated ${labels}; replacing it alone would not bring the recipe within the reference maximum. Check the vitamin values of the other contributing ingredients.`,
    };
  }

  const { option, after } = best;
  const resolved = resolvedCount(after) === exceeded.length;
  const changes = before.map((row) => {
    const next = after.get(row.id);
    return { id: row.id, label: row.label, unit: row.unit, max: row.max, before: row.actual, beforeStatus: row.status, after: next?.actual ?? 0, afterStatus: next?.status ?? "not_documented" as const };
  }).filter((row) => beforeById.has(row.id));
  const costKnown = option.costPerTonne !== null && current?.costPerTonne != null && !option.costExcludesPremix && !current.costExcludesPremix;
  const reduced = exceeded.map((row) => `${inSentence(row.label)} to ${formatUpperLimitValue(after.get(row.id)!.actual, row.unit)}`);
  const remaining = exceeded.filter((row) => after.get(row.id)!.status !== "within");
  return {
    exceedances,
    currentPremixId: currentPremix?.id ?? null,
    recommendation: {
      premixId: option.premixId,
      name: option.name,
      resolved,
      changes,
      costPerTonne: option.costPerTonne,
      costDeltaPerTonne: costKnown ? option.costPerTonne! - current!.costPerTonne! : null,
      costExcludesPremix: option.costExcludesPremix,
      requirementsMet: option.requirementsMet,
      requirementsTotal: option.requirementsTotal,
      otherExceedanceLabels: (option.upperLimitExceedanceLabels ?? []).filter((label) => !option.vitaminLimits?.some((row) => row.label === label)),
    },
    notRecommended,
    message: `Consider replacing ${currentName} with ${option.name}, which reduces the calculated ${joinLabels(reduced)}.` +
      (resolved
        ? ""
        : ` ${nutrientNames(remaining)} ${remaining.length === 1 ? "remains" : "remain"} above the reference maximum with ${option.name}, so the exceedance is reduced, not resolved.`),
  };
}

/**
 * Re-run the formulation with every other eligible commercial premix in
 * place of the selected one (Replace, never Add). Manufacturer-recipe-only
 * products are excluded: they fix the whole recipe, not just a dose. With a
 * goal, each re-run uses that goal's recipe (or its least-cost recipe when
 * the goal has none within 3%), so options compare like with like.
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
  goal?: PremixComparisonGoal | null;
}): Promise<PremixComparison | null> {
  const { phase, energySystem, programmeId, library } = input;
  const goal = input.goal ?? null;
  const stage = { programmeId, phaseId: phase.id };
  const unpriced = new Set(input.unpricedIngredientIds ?? []);
  const currentProduct = input.options.map((option) => commercialPremixById(option.ingredientId)).find((product) => product !== undefined);
  if (currentProduct?.manufacturerRecipe) return null;
  const inLibrary = (id: string) => library.ingredients.some((record) => record.id === id);
  const candidates = eligibleCommercialPremixes(programmeId, phase.id)
    .filter((product) => product.id !== currentProduct?.id && !product.manufacturerRecipe && inLibrary(product.id));
  // With no alternative, a vitamin exceedance still needs its advice
  // (verify the selected premix with its manufacturer).
  const exceedsVitamin = !!input.current && upperLimitCounts(input.current.assessment).vitaminExceedances.length > 0;
  if (!candidates.length && !exceedsVitamin) return null;

  const basal = input.options.filter((option) => !commercialPremixById(option.ingredientId));
  const alternatives = await Promise.all(candidates.map(async (product) => {
    const price = input.priceForPremix(product.id);
    const options = [...basal, { ingredientId: product.id, pricePerKg: price ?? 0, minInclusionPct: product.inclusionPct, maxInclusionPct: product.inclusionPct }];
    const result = await formulateLeastCostDiet(phase, energySystem, options, library, { explore: false, alternatives: goal !== null });
    if (result.status === "optimal") {
      const goalRecipe = goal ? result.alternatives.find((alternative) => alternative.id === goal)?.solution : undefined;
      const recipe = goalRecipe ?? result.solution;
      const assessment = buildFormulationAssessment(phase, energySystem, recipe.formula, library);
      return premixOption(product, false, { status: "optimal", formula: recipe.formula, costPerKg: recipe.costPerKg, assessment, goalUnavailable: goal !== null && !goalRecipe }, price === undefined, stage);
    }
    if (result.status === "infeasible" && result.bestEffort) {
      const assessment = buildFormulationAssessment(phase, energySystem, result.bestEffort.formula, library, { optimizerFeasible: false });
      return premixOption(product, false, { status: "infeasible", message: result.message, formula: result.bestEffort.formula, costPerKg: result.bestEffort.costPerKg, assessment }, price === undefined, stage);
    }
    return premixOption(product, false, { status: result.status === "missing-data" ? "missing-data" : result.status === "infeasible" ? "infeasible" : "error", message: result.message }, price === undefined, stage);
  }));
  const current = currentProduct && input.current
    ? premixOption(currentProduct, true, {
        status: input.current.feasible ? "optimal" : "infeasible",
        formula: input.current.formula,
        costPerKg: input.current.costPerKg,
        assessment: input.current.assessment,
      }, unpriced.has(currentProduct.id), stage)
    : null;
  const vitaminAdvice = input.current
    ? adviseOnVitaminLimits(input.current.assessment, current, alternatives, currentProduct ? { id: currentProduct.id, name: currentProduct.name } : null)
    : null;
  const recommended = vitaminAdvice?.recommendation;
  return {
    currentPremixId: currentProduct?.id ?? null,
    options: current ? [current, ...alternatives] : alternatives,
    // A validated vitamin replacement takes precedence; otherwise the usual
    // improvements decide, never at the cost of a new vitamin exceedance.
    ...(recommended
      ? {
          suggestedPremixId: recommended.premixId,
          reasons: [
            ...recommended.changes
              .filter((change) => vitaminAdvice!.exceedances.some((row) => row.id === change.id))
              .map((change) => `brings ${inSentence(change.label)} from ${formatUpperLimitValue(change.before, change.unit)} to ${formatUpperLimitValue(change.after, change.unit)} (CFIA reference maximum ${formatUpperLimitValue(change.max, change.unit)})`),
            `meets all ${recommended.requirementsTotal} hard requirements`,
          ],
        }
      : suggestPremixReplacement(current, alternatives)),
    goal,
    vitaminAdvice,
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
 * solve, assess every hard requirement, compare Chapter 7 supplementation
 * and CFIA maxima, explain the premix's effect on the recipe and re-run
 * premix alternatives. With a goal, the premix comparison describes that
 * goal's recipe (when one exists within 3% of least cost).
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
  goal?: PremixComparisonGoal | null;
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
  // The recipe the farmer sees: the goal's alternative when there is one.
  const shown = input.goal ? alternatives?.find((alternative) => alternative.id === input.goal) : undefined;
  const premixComparison = healthy && recipe
    ? await comparePremixes({
        phase,
        energySystem,
        programmeId: input.programmeId,
        options,
        library,
        current: shown
          ? { formula: shown.solution.formula, costPerKg: shown.solution.costPerKg, assessment: shown.assessment, feasible: true }
          : { formula: recipe.formula, costPerKg: recipe.costPerKg, assessment: assessment!, feasible: result.status === "optimal" },
        unpricedIngredientIds: input.unpricedIngredientIds,
        priceForPremix: input.priceForPremix,
        goal: shown ? input.goal : null,
      })
    : null;
  return { result, assessment, alternatives, premixComparison, premixEffect };
}

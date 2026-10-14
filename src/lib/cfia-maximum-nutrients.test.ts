import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { renderStudioFormulationPdf } from "@/components/formulation-studio/studio-formulation-pdf";
import {
  CFIA_PHASE_MAPPINGS,
  CFIA_TABLES,
  assessUpperLimits,
  cfiaReferenceForPhase,
} from "./cfia-maximum-nutrients";
import { commercialPremixById, eligibleCommercialPremixes } from "./commercial-premixes";
import { analyzeDiet, type DietFormula } from "./diet-formula";
import { INGREDIENT_DEFAULT_PRICES, ingredientDefaultPricePerKg } from "./feed-ingredient-prices";
import { buildConstraintSpecs, formulateLeastCostDiet, type FormulationIngredientOption } from "./feed-optimizer";
import { FEED_PROGRAMMES, feedProgrammePhaseById } from "./feed-programmes";
import {
  adviseOnVitaminLimits,
  buildFormulationAssessment,
  formulateAndAssess,
  suggestPremixReplacement,
  upperLimitCounts,
  upperLimitRows,
  upperLimitSentence,
  upperLimitTitle,
  type FormulationAssessment,
  type PremixOption,
  type PremixVitaminLimit,
} from "./formulation-assessment";
import { ingredientLibraryForPhase, type IngredientLibrary } from "./ingredient-nutrients";
import { formulate } from "./mcp/feedsport-service";
import { renderPublicFormulationPdf } from "./public-formulation-pdf";

const GROWER = { programmeId: "grow-finish-pig", phaseId: "br2024-5-43-63-91d-26-47kg" };
const BROILER = { programmeId: "broiler-standard", phaseId: "br2024-2-30-17-27d-0.68-1.49kg" };
const BASAL = [
  "corn-yellow-dent", "soybean-meal-dehulled-solvent-extracted", "wheat-bran", "soybean-degummed-oil", "limestone-ground",
  "dicalcium-phosphate", "sodium-chloride", "l-lysine-hcl", "dl-methionine", "l-threonine", "l-tryptophan", "l-valine",
];

const priceOf = (id: string) => ingredientDefaultPricePerKg(id) ?? 0;

function optionsWith(premixId: string): FormulationIngredientOption[] {
  const premix = commercialPremixById(premixId)!;
  return [
    ...BASAL.map((ingredientId) => ({ ingredientId, pricePerKg: priceOf(ingredientId) })),
    { ingredientId: premixId, pricePerKg: priceOf(premixId), minInclusionPct: premix.inclusionPct, maxInclusionPct: premix.inclusionPct },
  ];
}

async function formulateStage(stage: { programmeId: string; phaseId: string }, premixId: string, library?: IngredientLibrary) {
  const phase = feedProgrammePhaseById(stage.programmeId, stage.phaseId)!;
  const lib = library ?? ingredientLibraryForPhase(phase);
  const options = optionsWith(premixId);
  const assessed = await formulateAndAssess({
    phase,
    energySystem: "ME",
    programmeId: stage.programmeId,
    options,
    library: lib,
    priceForPremix: (id) => ingredientDefaultPricePerKg(id),
  });
  return { phase, library: lib, options, ...assessed };
}

/** A library where one premix no longer documents some vitamins. */
function withoutVitamins(library: IngredientLibrary, premixId: string, keys: string[]): IngredientLibrary {
  return {
    ...library,
    ingredients: library.ingredients.map((record) => record.id !== premixId ? record : {
      ...record,
      vitamins: Object.fromEntries(Object.entries(record.vitamins).filter(([key]) => !keys.includes(key))),
    }),
  };
}

const vitamin = (id: string, actual: number, max: number, status: PremixVitaminLimit["status"]): PremixVitaminLimit =>
  ({ id, label: id === "vitamin-a" ? "Vitamin A" : id === "vitamin-d" ? "Vitamin D" : "Vitamin E", unit: "IU/kg", max, actual, status });

const option = (overrides: Partial<PremixOption> & Pick<PremixOption, "premixId">): PremixOption => ({
  name: overrides.premixId,
  inclusionPct: 0.2,
  inclusionKgPerTonne: 2,
  current: false,
  status: "optimal",
  costPerTonne: 300,
  costExcludesPremix: false,
  requirementsMet: 23,
  requirementsTotal: 23,
  recipe: [],
  documentationGapLabels: [],
  supplementationAt: 5,
  supplementationTotal: 19,
  compatibleOnLabel: true,
  ...overrides,
});

/** An assessment whose only content is a CFIA vitamin A exceedance of `actual` IU/kg. */
function vitaminAExceedance(actual: number): FormulationAssessment {
  return {
    schemaVersion: 2,
    optimizerFeasible: true,
    verdict: "meets_requirements",
    requirements: [],
    supplementation: null,
    upperLimits: {
      status: "assessed",
      enforcement: "advisory",
      source: "CFIA",
      sourceUrl: "https://inspection.canada.ca",
      category: { id: "swine-grower-25-50kg", label: "Grower (25 to 50 kg)" },
      mapping: { basis: "26–47 kg", explanation: "", crossesBoundary: false },
      basis: "",
      rows: [
        { id: "vitamin-a", label: "Vitamin A", unit: "IU/kg", group: "vitamin", max: 20000, actual, status: "exceeds", data: "published", undocumentedPremixIds: [], missingIngredientIds: [], contributions: [{ ingredientId: "current", value: actual }] },
        { id: "vitamin-d", label: "Vitamin D", unit: "IU/kg", group: "vitamin", max: 3500, actual: 1000, status: "within", data: "published", undocumentedPremixIds: [], missingIngredientIds: [], contributions: [{ ingredientId: "current", value: 1000 }] },
      ],
      notAssessed: [],
    },
    documentationGaps: [],
    consistencyErrors: [],
    headline: "Meets all 0 hard requirements",
    summary: "",
    scope: "",
  };
}

const ALARMING = /critical|danger|toxic|unsafe/i;

describe("CFIA maximum nutrient values", () => {
  it("1. imports only the swine and chicken tables, exactly as published", () => {
    assert.deepEqual(CFIA_TABLES.map((table) => table.id), ["swine", "chickens"]);
    for (const table of CFIA_TABLES) {
      for (const nutrient of table.nutrients) assert.equal(nutrient.values.length, table.categories.length, `${table.id} ${nutrient.id}`);
    }
    const value = (tableId: string, nutrientId: string, categoryId: string) => {
      const table = CFIA_TABLES.find((t) => t.id === tableId)!;
      return table.nutrients.find((n) => n.id === nutrientId)!.values[table.categories.findIndex((c) => c.id === categoryId)];
    };
    // Spot values from Table 1 (Swine) and Table 2 (Chickens), modified 2024-07-03.
    assert.equal(value("swine", "vitamin-a", "swine-grower-25-50kg"), 20000);
    assert.equal(value("swine", "vitamin-d", "swine-lactating-sows"), 3500);
    assert.equal(value("swine", "vitamin-e", "swine-starter-under-7kg"), 2000);
    assert.equal(value("swine", "copper", "swine-starter-11-25kg"), 250);
    assert.equal(value("swine", "copper", "swine-grower-25-50kg"), 125);
    assert.equal(value("swine", "zinc", "swine-starter-11-25kg"), 3000);
    assert.equal(value("swine", "manganese", "swine-finisher-75-100kg"), 1000);
    assert.equal(value("chickens", "vitamin-a", "chicken-grower-4-8wk"), 20000);
    assert.equal(value("chickens", "vitamin-d", "chicken-starter"), 10000);
    assert.equal(value("chickens", "vitamin-e", "chicken-starter"), 1000);
    assert.equal(value("chickens", "zinc", "chicken-grower-4-8wk"), 250);
    // No other species' tables, by id or by category.
    const every = JSON.stringify(CFIA_TABLES).toLowerCase();
    for (const species of ["cattle", "dairy", "beef", "sheep", "goat", "horse", "rabbit", "fish", "turkey"]) assert.ok(!every.includes(species), species);
  });

  it("2. maps every supported phase to exactly one CFIA column, and anything else to an explicit unsupported status", () => {
    const phases = new Map(FEED_PROGRAMMES.flatMap((programme) => programme.phases.map((phase) => [phase.id, { phase, species: programme.species }] as const)));
    assert.equal(new Set(CFIA_PHASE_MAPPINGS.map((mapping) => mapping.phaseId)).size, CFIA_PHASE_MAPPINGS.length, "one mapping per phase");
    for (const [id, { phase, species }] of phases) {
      const reference = cfiaReferenceForPhase(phase);
      assert.equal(reference.status, "mapped", id);
      if (reference.status !== "mapped") continue;
      assert.equal(reference.table, species === "broiler" ? "chickens" : "swine", id);
      assert.ok(reference.mapping.explanation.length > 20, `${id} explains its column`);
      // The explicit table agrees with its documented rule.
      if (species === "broiler") {
        const mid = (phase.ageMinDays! + phase.ageMaxDays!) / 2;
        assert.equal(reference.category.id, mid < 28 ? "chicken-starter" : "chicken-grower-4-8wk", id);
      } else if (phase.phaseClass === "gestation") assert.equal(reference.category.id, "swine-dry-sows", id);
      else if (phase.phaseClass === "lactation") assert.equal(reference.category.id, "swine-lactating-sows", id);
      else if (phase.phaseClass === "boar") assert.equal(reference.category.id, "swine-sexually-active-boars", id);
      else {
        const mid = (phase.sourceMinWeightKg + phase.sourceMaxWeightKg) / 2;
        const bands: [number, string][] = [[7, "swine-starter-under-7kg"], [11, "swine-starter-7-11kg"], [25, "swine-starter-11-25kg"], [50, "swine-grower-25-50kg"], [75, "swine-grower-50-75kg"], [100, "swine-finisher-75-100kg"], [Infinity, "swine-finisher-100-135kg"]];
        assert.equal(reference.category.id, bands.find(([upper]) => mid < upper)![1], id);
        if (phase.sourceMaxWeightKg > 135) assert.match(reference.mapping.explanation, /beyond the 135 kg end/, `${id} discloses that it extends past the published column`);
      }
      if (reference.mapping.crossesBoundary) assert.match(reference.mapping.explanation, /boundary|start of the CFIA Grower/, `${id} explains the boundary`);
    }
    for (const mapping of CFIA_PHASE_MAPPINGS) assert.ok(phases.has(mapping.phaseId), `${mapping.phaseId} is a real phase`);

    const unknown = { id: "layer-peak-production" };
    assert.equal(cfiaReferenceForPhase(unknown).status, "unsupported");
    const analysis = analyzeDiet({ ingredients: [{ ingredientId: "corn-yellow-dent", inclusionPct: 100 }] });
    assert.deepEqual(assessUpperLimits(unknown, analysis, () => [], () => 0).status, "unsupported");
  });

  it("3. a vitamin or mineral above its CFIA maximum never makes the optimiser infeasible or constrains it", async () => {
    const { result, assessment } = await formulateStage(GROWER, "sustar-glypro-x912");
    assert.equal(result.status, "optimal");
    assert.equal(assessment!.verdict, "meets_requirements");
    const exceeded = upperLimitCounts(assessment!).vitaminExceedances.map((row) => row.id);
    assert.deepEqual(exceeded, ["vitamin-a", "vitamin-d"]);
    // No CFIA maximum is ever an optimiser row, for any phase. (Sodium, calcium
    // and potassium are Brazilian Tables minimums; they stay minimums.)
    const cfiaIds = new Set(CFIA_TABLES.flatMap((table) => table.nutrients.map((n) => n.id)));
    for (const programme of FEED_PROGRAMMES) {
      for (const phase of programme.phases) {
        for (const spec of buildConstraintSpecs(phase, "ME")) {
          assert.ok(!(cfiaIds.has(spec.id) && spec.relation === "max"), `${phase.id} caps ${spec.id}`);
          assert.ok(!["vitamin-a", "vitamin-d", "vitamin-e", "copper", "iodine", "iron", "manganese", "selenium", "zinc", "phosphorus"].includes(spec.id), `${phase.id} constrains ${spec.id}`);
        }
      }
    }
    // Nor a hard requirement: the verdict and headline come from hard requirements only.
    assert.ok(assessment!.requirements.every((check) => !(cfiaIds.has(check.id) && check.relation === "max")));
    assert.match(assessment!.headline, /^Meets all \d+ hard requirements$/);
  });

  it("4. the validated non-vitamin, non-mineral maximum (L-lysine HCl) is a GLPK row, and the assessment checks the same bound", async () => {
    const maxima = new Map<string, number>();
    for (const programme of FEED_PROGRAMMES) {
      for (const phase of programme.phases) {
        for (const spec of buildConstraintSpecs(phase, "ME")) if (spec.relation === "max") maxima.set(`${phase.id}:${spec.id}`, spec.bound);
      }
    }
    assert.deepEqual([...maxima], [["pic-mature-boar:l-lysine-hcl", 0.25]], "only source-backed maxima are enforced; none is invented");

    const phase = feedProgrammePhaseById("mature-boar", "pic-mature-boar")!;
    const library = ingredientLibraryForPhase(phase);
    // Crystalline lysine far cheaper than soybean meal, so the optimiser wants more than the maximum.
    const ingredients = ["corn-yellow-dent", "soybean-meal-dehulled-solvent-extracted", "wheat-bran", "soybean-hulls", "soybean-degummed-oil", "limestone-ground", "dicalcium-phosphate", "sodium-chloride", "l-lysine-hcl", "dl-methionine", "l-threonine", "l-tryptophan"];
    const options = ingredients.map((ingredientId) => ({ ingredientId, pricePerKg: ingredientId === "l-lysine-hcl" ? 0.001 : priceOf(ingredientId) }));
    const result = await formulateLeastCostDiet(phase, "ME", options, library, { explore: false });
    assert.equal(result.status, "optimal");
    if (result.status !== "optimal") return;
    const lysine = result.solution.formula.ingredients.find((row) => row.ingredientId === "l-lysine-hcl")?.inclusionPct ?? 0;
    assert.ok(Math.abs(lysine - 0.25) < 1e-6, `capped at its maximum, got ${lysine}`);
    const check = buildFormulationAssessment(phase, "ME", result.solution.formula, library).requirements.find((row) => row.id === "l-lysine-hcl")!;
    assert.equal(check.relation, "max");
    assert.equal(check.bound, 0.25);
    assert.equal(check.status, "met");
    assert.equal(check.enforcedByOptimizer, true);
    assert.equal(check.limiting, true, "the optimiser and the assessment see the same bound");
  });

  it("7. a vitamin exceedance triggers the premix comparison with every eligible alternative", async () => {
    const { premixComparison } = await formulateStage(GROWER, "sustar-glypro-x912");
    assert.ok(premixComparison?.vitaminAdvice, "vitamin advice is produced");
    const alternatives = premixComparison!.options.filter((o) => !o.current);
    assert.ok(alternatives.length > 0);
    for (const alternative of alternatives) assert.ok(alternative.vitaminLimits?.length, `${alternative.premixId} was re-assessed against CFIA`);
    const advice = premixComparison!.vitaminAdvice!;
    assert.deepEqual(advice.exceedances.map((row) => [row.id, row.actual, row.max, row.premixResponsible]), [
      ["vitamin-a", 56000, 20000, true],
      ["vitamin-d", 16000, 3500, true],
    ]);

    // A broiler premix with no alternative still gets advice: verify with the manufacturer.
    const broiler = await formulateStage(BROILER, "sustar-glypro-x812");
    const broilerAdvice = broiler.premixComparison?.vitaminAdvice;
    assert.ok(broilerAdvice);
    assert.equal(broilerAdvice!.recommendation, null);
    assert.match(broilerAdvice!.message, /Verify the vitamin specifications of Sustar GlyPro X812/);
    assert.equal(broiler.premixComparison!.suggestedPremixId, null);
  });

  it("8. a replacement resolves the exceedance only when its calculated concentration is demonstrably within the maximum", async () => {
    const { premixComparison } = await formulateStage(GROWER, "sustar-glypro-x912");
    const rec = premixComparison!.vitaminAdvice!.recommendation!;
    assert.equal(rec.premixId, "caremix-pig-grower");
    assert.equal(rec.resolved, true);
    const a = rec.changes.find((change) => change.id === "vitamin-a")!;
    assert.deepEqual([a.before, a.after, a.max, a.afterStatus], [56000, 10000, 20000, "within"]);
    assert.equal(premixComparison!.suggestedPremixId, "caremix-pig-grower");
    assert.match(premixComparison!.vitaminAdvice!.message, /^Consider replacing Sustar GlyPro X912 .* with Caremix Pig Grower .*, which reduces the calculated vitamin A to 10,000 IU\/kg and vitamin D to 1,500 IU\/kg\.$/);

    // Lower but still above: suggested as a reduction, never as resolved.
    const assessment = vitaminAExceedance(56000);
    const current = option({ premixId: "current", current: true, vitaminLimits: [vitamin("vitamin-a", 56000, 20000, "exceeds"), vitamin("vitamin-d", 1000, 3500, "within")] });
    const lower = option({ premixId: "lower", vitaminLimits: [vitamin("vitamin-a", 25000, 20000, "exceeds"), vitamin("vitamin-d", 1000, 3500, "within")] });
    const partial = adviseOnVitaminLimits(assessment, current, [lower], { id: "current", name: "Current" })!;
    assert.equal(partial.recommendation?.premixId, "lower");
    assert.equal(partial.recommendation?.resolved, false);
    assert.match(partial.message, /Vitamin A remains above the reference maximum with lower, so the exceedance is reduced, not resolved\./);

    // Within the maximum ranks above merely lower, whatever the cost.
    const within = option({ premixId: "within", costPerTonne: 900, vitaminLimits: [vitamin("vitamin-a", 15000, 20000, "within"), vitamin("vitamin-d", 1000, 3500, "within")] });
    assert.equal(adviseOnVitaminLimits(assessment, current, [lower, within], { id: "current", name: "Current" })!.recommendation?.premixId, "within");
  });

  it("9. an alternative with missing vitamin data is never treated as safer", async () => {
    const assessment = vitaminAExceedance(56000);
    const current = option({ premixId: "current", current: true, vitaminLimits: [vitamin("vitamin-a", 56000, 20000, "exceeds"), vitamin("vitamin-d", 1000, 3500, "within")] });
    // Its vitamin A counts as 0 only because it isn't documented.
    const silent = option({ premixId: "silent", costPerTonne: 100, documentationGapLabels: [], vitaminLimits: [vitamin("vitamin-a", 0, 20000, "not_documented"), vitamin("vitamin-d", 1000, 3500, "within")] });
    const advice = adviseOnVitaminLimits(assessment, current, [silent], { id: "current", name: "Current" })!;
    assert.equal(advice.recommendation, null);
    assert.match(advice.notRecommended[0].reason, /does not document vitamin A/);
    assert.match(advice.message, /Verify the vitamin specifications of Current/);

    // End to end: Caremix without its vitamin A and D values is not recommended.
    const phase = feedProgrammePhaseById(GROWER.programmeId, GROWER.phaseId)!;
    const library = withoutVitamins(ingredientLibraryForPhase(phase), "caremix-pig-grower", ["vitaminAIuKg", "vitaminDIuKg"]);
    const { premixComparison } = await formulateStage(GROWER, "sustar-glypro-x912", library);
    assert.equal(premixComparison!.vitaminAdvice!.recommendation, null);
    assert.notEqual(premixComparison!.suggestedPremixId, "caremix-pig-grower");
    const caremix = premixComparison!.options.find((o) => o.premixId === "caremix-pig-grower")!;
    assert.equal(caremix.vitaminLimits!.find((row) => row.id === "vitamin-a")!.status, "not_documented");
  });

  it("10. an incompatible premix is never compared or suggested", async () => {
    const { premixComparison } = await formulateStage(GROWER, "sustar-glypro-x912");
    const eligible = new Set(eligibleCommercialPremixes(GROWER.programmeId, GROWER.phaseId).map((p) => p.id));
    for (const o of premixComparison!.options) assert.ok(eligible.has(o.premixId), `${o.premixId} is eligible`);
    for (const id of ["caremix-pig-weaner", "caremix-pig-finisher", "sustar-glypro-x911", "sustar-glypro-x913", "sustar-glypro-x812", "sustar-glypro-x811", "cj-s174-boar-premix"]) {
      assert.ok(!premixComparison!.options.some((o) => o.premixId === id), `${id} is not compared for a grower`);
    }
    // Off-label simulation products are never recommended, even when they would resolve it.
    const assessment = vitaminAExceedance(56000);
    const current = option({ premixId: "current", current: true, vitaminLimits: [vitamin("vitamin-a", 56000, 20000, "exceeds")] });
    const offLabel = option({ premixId: "off-label", compatibleOnLabel: false, vitaminLimits: [vitamin("vitamin-a", 9000, 20000, "within")] });
    const advice = adviseOnVitaminLimits(assessment, current, [offLabel], { id: "current", name: "Current" })!;
    assert.equal(advice.recommendation, null);
    assert.match(advice.notRecommended[0].reason, /off-label/);
  });

  it("11. the farmer's selected premix is never replaced automatically", async () => {
    const { result, premixComparison } = await formulateStage(GROWER, "sustar-glypro-x912");
    assert.equal(result.status, "optimal");
    if (result.status !== "optimal") return;
    const premixes = result.solution.formula.ingredients.filter((row) => commercialPremixById(row.ingredientId) && row.inclusionPct > 0);
    assert.deepEqual(premixes.map((row) => [row.ingredientId, row.inclusionPct]), [["sustar-glypro-x912", 0.2]]);
    assert.equal(premixComparison!.currentPremixId, "sustar-glypro-x912");
    assert.equal(premixComparison!.options.find((o) => o.current)?.premixId, "sustar-glypro-x912");
  });

  it("12. recipe costs and hard-requirement outcomes stay correct, for the current recipe and the suggested one", async () => {
    const { phase, library, result, assessment, premixComparison } = await formulateStage(GROWER, "sustar-glypro-x912");
    assert.equal(result.status, "optimal");
    if (result.status !== "optimal") return;
    const cost = (formula: DietFormula) => formula.ingredients.reduce((sum, row) => sum + (row.inclusionPct / 100) * priceOf(row.ingredientId) * 1000, 0);
    const current = premixComparison!.options.find((o) => o.current)!;
    assert.ok(Math.abs(current.costPerTonne! - cost(result.solution.formula)) < 0.01);
    assert.equal(current.requirementsMet, assessment!.requirements.length);

    const rec = premixComparison!.vitaminAdvice!.recommendation!;
    const caremix = premixComparison!.options.find((o) => o.premixId === rec.premixId)!;
    const formula = { ingredients: caremix.recipe };
    assert.ok(Math.abs(rec.costPerTonne! - cost(formula)) < 0.01, "the suggested recipe's cost is its ingredients at your prices");
    assert.ok(Math.abs(rec.costDeltaPerTonne! - (rec.costPerTonne! - current.costPerTonne!)) < 1e-9);
    const reassessed = buildFormulationAssessment(phase, "ME", formula, library);
    assert.equal(reassessed.verdict, "meets_requirements");
    assert.equal(rec.requirementsMet, reassessed.requirements.length);
    assert.equal(rec.requirementsTotal, reassessed.requirements.length);
    assert.equal(caremix.recipe.find((row) => row.ingredientId === "caremix-pig-grower")?.inclusionPct, 3.2, "at its manufacturer dose");
    assert.ok(!caremix.recipe.some((row) => row.ingredientId === "sustar-glypro-x912"), "replaced, never stacked");
  });

  it("13. Studio, MCP, the manual check and the Studio PDF report the same CFIA assessment and suggestion", async () => {
    const { phase, library, result, assessment, premixComparison } = await formulateStage(GROWER, "sustar-glypro-x912");
    assert.equal(result.status, "optimal");
    if (result.status !== "optimal") return;

    // Manual check of the same recipe (the evaluate API's builder).
    const manual = buildFormulationAssessment(phase, "ME", result.solution.formula, library);
    assert.deepEqual(manual.upperLimits, assessment!.upperLimits);

    // MCP, selected mode, same ingredients and prices.
    const mcp = await formulate({
      programme_id: `${GROWER.programmeId}:${GROWER.phaseId}`,
      energy_system: "ME",
      ingredient_mode: "selected",
      ingredients: [...BASAL, "sustar-glypro-x912"],
    }, { prices: INGREDIENT_DEFAULT_PRICES });
    assert.equal(mcp.status, "optimal");
    if (mcp.status !== "optimal") return;
    const upper = mcp.nutritional_validation.advisories.upper_limits;
    assert.ok(upper && upper.status === "assessed");
    if (!upper || upper.status !== "assessed") return;
    const rows = upperLimitRows(assessment!);
    assert.deepEqual(upper.checks.map((c) => [c.nutrient, c.status]), rows.map((row) => [row.id.replaceAll("-", "_"), row.status]));
    const a = upper.checks.find((c) => c.nutrient === "vitamin_a")!;
    assert.equal(a.title, "Vitamin A exceeds the reference maximum");
    assert.equal(a.explanation, "The current formulation provides 56,000 IU/kg against the CFIA reference maximum of 20,000 IU/kg.");
    assert.equal(mcp.nutritional_validation.overall_status, "meets_requirements");
    const advice = mcp.premix_advisory?.vitamin_upper_limit_advice;
    assert.equal(advice?.message, premixComparison!.vitaminAdvice!.message);
    assert.equal(advice?.suggested_replacement?.premix, "caremix-pig-grower");
    assert.equal(advice?.suggested_replacement?.exceedance_resolved, true);
    assert.equal(mcp.premix_advisory?.suggested_replacement, "caremix-pig-grower");

    // Studio PDF: the same title, sentence, suggestion and outcome, in Advisories.
    const pdf = await renderStudioFormulationPdf({
      documentName: "CFIA check",
      programmeName: "Grow-Finish Pig",
      phaseLabel: phase.label,
      weightRange: phase.sourceWeightRange,
      source: "Brazilian Tables 2024",
      goalLabel: "Least cost",
      goalDescription: "Cheapest recipe that meets every hard requirement.",
      mode: "Optimised",
      batchKg: 1000,
      costPerTonne: result.solution.costPerKg * 1000,
      assessment: assessment!,
      premixComparison,
      ingredients: result.solution.formula.ingredients.map((row) => ({ name: row.ingredientId, setting: "Available", inclusionPct: row.inclusionPct, pricePerTonne: priceOf(row.ingredientId) * 1000 })),
      nutrients: [],
      advisories: [],
      notes: [],
    });
    const text = pdf.text.join(" ");
    const vitaminA = rows.find((row) => row.id === "vitamin-a")!;
    const advisoriesAt = text.indexOf("ADVISORIES");
    assert.ok(advisoriesAt >= 0);
    assert.ok(text.indexOf(upperLimitTitle(vitaminA)) > advisoriesAt, "in the Advisories section");
    for (const expected of [upperLimitSentence(vitaminA), "Suggested action: Consider replacing Sustar GlyPro X912", "Current premix: Sustar GlyPro X912", "Suggested alternative: Caremix Pig Grower", "Exceedance resolved: yes", "Hard requirements: 23 of 23 met."]) {
      assert.ok(text.replace(/\s+/g, " ").includes(expected), `PDF includes "${expected}"`);
    }
    assert.match(text, /Updated formulation cost: \$\d[\d,]*\.\d\d per tonne \(\+\$\d+\.\d\d per tonne\)/);

    // Calm wording everywhere.
    for (const [where, value] of [["assessment", assessment], ["mcp", mcp], ["pdf", text]] as const) {
      assert.ok(!ALARMING.test(JSON.stringify(value)), `${where} uses no alarming labels`);
    }
  });

  it("13. the public formulator PDF renders the CFIA findings for the same assessment", async () => {
    const { phase, result, assessment } = await formulateStage(GROWER, "sustar-glypro-x912");
    assert.equal(result.status, "optimal");
    if (result.status !== "optimal") return;
    const bytes = await renderPublicFormulationPdf({
      programme: FEED_PROGRAMMES.find((programme) => programme.id === GROWER.programmeId)!,
      phase,
      priority: { id: "least-cost", label: "Least cost", description: "Cheapest recipe that meets every hard requirement." },
      formula: { ingredients: [...result.solution.formula.ingredients] },
      premix: commercialPremixById("sustar-glypro-x912")!,
      manufacturerRecipe: false,
      nutrientProfile: result.nutrientProfile,
      assessment: assessment!,
      costPerKg: result.solution.costPerKg,
      costIncreasePct: 0,
    });
    assert.ok(bytes.length > 10_000);
  });

  it("premix comparison: a general suggestion never trades a new vitamin exceedance for cost or Chapter 7", () => {
    const current = option({ premixId: "current", current: true, costPerTonne: 400, supplementationAt: 4, vitaminLimits: [vitamin("vitamin-a", 10000, 20000, "within")] });
    const cheaperButHigh = option({ premixId: "cheap", costPerTonne: 300, supplementationAt: 10, vitaminLimits: [vitamin("vitamin-a", 56000, 20000, "exceeds")] });
    assert.deepEqual(suggestPremixReplacement(current, [cheaperButHigh]), { suggestedPremixId: null, reasons: [] });
    const cheaperAndWithin = option({ premixId: "fine", costPerTonne: 300, vitaminLimits: [vitamin("vitamin-a", 12000, 20000, "within")] });
    assert.equal(suggestPremixReplacement(current, [cheaperButHigh, cheaperAndWithin]).suggestedPremixId, "fine");
    // With no premix at all, the compatible premix is still offered, preferring one within the maxima, and any exceedance is stated.
    assert.equal(suggestPremixReplacement(null, [cheaperButHigh, cheaperAndWithin]).suggestedPremixId, "fine");
    const only = suggestPremixReplacement(null, [cheaperButHigh]);
    assert.equal(only.suggestedPremixId, "cheap");
    assert.ok(only.reasons.some((reason) => /^brings vitamin A to 56,000 IU\/kg, above the CFIA reference maximum of 20,000 IU\/kg$/.test(reason)));
  });
});

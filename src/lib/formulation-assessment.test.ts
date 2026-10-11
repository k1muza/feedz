import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { commercialPremixById } from "./commercial-premixes";
import { analyzeDiet, type DietFormula } from "./diet-formula";
import { ingredientDefaultPricePerKg } from "./feed-ingredient-prices";
import { formulateLeastCostDiet, formulationRequirements, nutrientFeasibilityTolerance, type FormulationIngredientOption } from "./feed-optimizer";
import { feedProgrammePhaseById } from "./feed-programmes";
import {
  buildFormulationAssessment,
  buildInfeasibleFormulationAssessment,
  comparePremixes,
  formulateAndAssess,
  isFormulationAssessment,
  isLegacyAssessment,
  keepConsistentAlternatives,
  premixRecipeEffect,
  suggestPremixReplacement,
  supplementationGuidance,
  type PremixOption,
} from "./formulation-assessment";
import { ingredientLibraryForPhase, ingredientLibraryWithCustomPremixes, type CustomPremixProfile } from "./ingredient-nutrients";
import { studioPremixProblems, poolWithPremixSelection } from "./studio-commercial-premix";
import { formulate as mcpFormulate } from "./mcp/feedsport-service";
import { INGREDIENT_DEFAULT_PRICES } from "./feed-ingredient-prices";

const programmeId = "grow-finish-pig";
const phase = feedProgrammePhaseById(programmeId, "br2024-5-43-63-91d-26-47kg")!;
const library = ingredientLibraryForPhase(phase);

const BASAL = [
  "corn-yellow-dent",
  "soybean-meal-solvent-extracted",
  "wheat-bran",
  "soybean-degummed-oil",
  "limestone-ground",
  "dicalcium-phosphate",
  "sodium-chloride",
  "l-lysine-hcl",
  "dl-methionine",
  "l-threonine",
  "l-tryptophan",
  "l-valine",
];

/** A documented premix for tests only: not a real product. */
const FIXTURE_DOSE = 2.5;
const fixture = (id: string, aminoAcids: CustomPremixProfile["aminoAcids"]): CustomPremixProfile => ({
  id,
  name: "Test fixture premix",
  vitamins: { vitaminAIuKg: 400_000, vitaminDIuKg: 80_000 },
  traceMineralsPpm: { zinc: 4_000, copper: 400 },
  aminoAcids,
});
const fixtureLibrary = ingredientLibraryWithCustomPremixes([
  fixture("test-sid-premix", { totalPct: { lysine: 7 }, sidPct: { lysine: 6, methionine: 2, threonine: 2 } }),
  fixture("test-total-only-premix", { totalPct: { lysine: 7, methionine: 2, threonine: 2 } }),
  fixture("test-empty-premix", {}),
], library);

const option = (id: string, extra: Partial<FormulationIngredientOption> = {}): FormulationIngredientOption => ({
  ingredientId: id,
  pricePerKg: ingredientDefaultPricePerKg(id) ?? 0,
  ...extra,
});
const basalOptions = () => BASAL.map((id) => option(id, id === "soybean-degummed-oil" ? { maxInclusionPct: 4 } : {}));
const withFixture = (id: string) => [...basalOptions(), option(id, { pricePerKg: 3, minInclusionPct: FIXTURE_DOSE, maxInclusionPct: FIXTURE_DOSE })];
const withProduct = (id: string) => {
  const product = commercialPremixById(id)!;
  return [...basalOptions(), option(id, { minInclusionPct: product.inclusionPct, maxInclusionPct: product.inclusionPct })];
};
const pct = (formula: DietFormula, id: string) => formula.ingredients.find((row) => row.ingredientId === id)?.inclusionPct ?? 0;

async function solved(options: FormulationIngredientOption[], lib = fixtureLibrary) {
  const result = await formulateLeastCostDiet(phase, "ME", options, lib, { explore: false });
  assert.equal(result.status, "optimal", "the test basket must be feasible");
  if (result.status !== "optimal") throw new Error("infeasible");
  return result.solution;
}

describe("hard requirements versus Chapter 7 supplementation advisories", () => {
  test("1. Chapter 7 guidance never becomes a hard constraint or a failure by default", async () => {
    const hardIds = formulationRequirements(phase, "ME").map((r) => r.id);
    assert.ok(supplementationGuidance(phase).length > 0);
    assert.ok(hardIds.every((id) => !/^supplement-|vitamin|zinc|copper|iodine|selenium/.test(id)));

    // A premix with only 2 vitamins and 2 trace minerals documented.
    const solution = await solved(withFixture("test-empty-premix"));
    const assessment = buildFormulationAssessment(phase, "ME", solution.formula, fixtureLibrary);
    assert.equal(assessment.verdict, "meets_requirements");
    assert.match(assessment.headline, /^Meets all \d+ hard requirements$/);
    const rows = assessment.supplementation!.rows;
    assert.ok(rows.some((row) => row.status !== "at_recommendation"), "some Chapter 7 values are below recommendation");
    assert.ok(assessment.requirements.every((check) => !rows.some((row) => row.id === check.id)));
  });

  test("2. genuine amino-acid and mineral deficiencies still fail", () => {
    const formula = { ingredients: [{ ingredientId: "corn-yellow-dent", inclusionPct: 97.5 }, { ingredientId: "test-sid-premix", inclusionPct: 2.5 }] };
    const assessment = buildFormulationAssessment(phase, "ME", formula, fixtureLibrary);
    const failed = new Set(assessment.requirements.filter((c) => c.status === "not_met").map((c) => c.id));
    assert.ok(failed.has("sid-lysine"));
    assert.ok(failed.has("calcium"));
    assert.equal(assessment.verdict, "fails_requirements");
    assert.match(assessment.headline, /^Doesn't meet \d+ hard requirements?$/);
  });
});

describe("commercial premixes are full nutritional ingredients", () => {
  test("3. documented premix amino acids add to the diet's SID and total amino acids", () => {
    const base = { ingredients: [{ ingredientId: "corn-yellow-dent", inclusionPct: 70 }, { ingredientId: "soybean-meal-solvent-extracted", inclusionPct: 27.5 }] };
    const withPremix = analyzeDiet({ ingredients: [...base.ingredients, { ingredientId: "test-sid-premix", inclusionPct: 2.5 }] }, [], fixtureLibrary);
    const withEmpty = analyzeDiet({ ingredients: [...base.ingredients, { ingredientId: "test-empty-premix", inclusionPct: 2.5 }] }, [], fixtureLibrary);
    assert.ok(Math.abs(withPremix.sidAminoAcidsPct.lysine.value - withEmpty.sidAminoAcidsPct.lysine.value - 0.025 * 6) < 1e-12);
    assert.ok(Math.abs(withPremix.totalAminoAcidsPct.lysine.value - withEmpty.totalAminoAcidsPct.lysine.value - 0.025 * 7) < 1e-12);
    assert.ok(Math.abs(withPremix.sidAminoAcidsPct.threonine.value - withEmpty.sidAminoAcidsPct.threonine.value - 0.025 * 2) < 1e-12);
  });

  test("4. documented SID amino acids reduce the crystalline amino acids the optimizer adds", async () => {
    const documented = await solved(withFixture("test-sid-premix"));
    const undocumented = await solved(withFixture("test-empty-premix"));
    assert.ok(pct(documented.formula, "l-lysine-hcl") < pct(undocumented.formula, "l-lysine-hcl") - 0.05,
      `lysine HCl ${pct(documented.formula, "l-lysine-hcl")} vs ${pct(undocumented.formula, "l-lysine-hcl")}`);
    assert.ok(documented.costPerKg < undocumented.costPerKg, "the premix's lysine has value in the least-cost solution");

    const effect = await premixRecipeEffect(phase, "ME", withFixture("test-sid-premix"), fixtureLibrary, documented.formula);
    assert.ok(effect?.requirementIds.includes("sid-lysine"));
    const lysine = effect?.changes.find((c) => c.ingredientId === "l-lysine-hcl");
    assert.ok(lysine && lysine.withoutContributionPct > lysine.withPremixPct, "the effect is reported for the Studio note");
  });

  test("5. a total amino acid is never counted as SID", async () => {
    const totalOnly = await solved(withFixture("test-total-only-premix"));
    const undocumented = await solved(withFixture("test-empty-premix"));
    assert.ok(Math.abs(pct(totalOnly.formula, "l-lysine-hcl") - pct(undocumented.formula, "l-lysine-hcl")) < 1e-6);
    const assessment = buildFormulationAssessment(phase, "ME", totalOnly.formula, fixtureLibrary);
    const lysine = assessment.requirements.find((c) => c.id === "sid-lysine")!;
    assert.ok(lysine.totalOnlyIngredientIds.includes("test-total-only-premix"));
    assert.ok(!lysine.contributions.some((c) => c.ingredientId === "test-total-only-premix"));
    assert.ok(assessment.documentationGaps.some((g) => g.nutrientId === "sid-lysine" && g.reason === "total_only"));
  });

  test("6. premix nutrients are counted exactly once", async () => {
    const solution = await solved(withFixture("test-sid-premix"));
    const assessment = buildFormulationAssessment(phase, "ME", solution.formula, fixtureLibrary);
    for (const check of assessment.requirements.filter((c) => c.relation === "min")) {
      const sum = check.contributions.reduce((total, c) => total + c.value, 0);
      assert.ok(Math.abs(sum - check.actual) <= 1e-9 * Math.max(1, check.actual), check.id);
      assert.ok(check.contributions.filter((c) => c.ingredientId === "test-sid-premix").length <= 1, check.id);
    }
    const lysine = assessment.requirements.find((c) => c.id === "sid-lysine")!;
    assert.ok(Math.abs(lysine.contributions.find((c) => c.ingredientId === "test-sid-premix")!.value - FIXTURE_DOSE / 100 * 6) < 1e-12);
    const zinc = assessment.supplementation!.rows.find((r) => r.id === "zinc")!;
    assert.ok(Math.abs(zinc.actual - FIXTURE_DOSE / 100 * 4_000) < 1e-9, "supplemented zinc is the premix alone, once");
  });

  test("7. the manufacturer dose stays enforced", async () => {
    const x912 = commercialPremixById("sustar-glypro-x912")!;
    const solution = await solved(withProduct(x912.id), library);
    assert.ok(Math.abs(pct(solution.formula, x912.id) - x912.inclusionPct) < 1e-9);
    const off = { ingredients: solution.formula.ingredients.map((row) => row.ingredientId === "corn-yellow-dent" ? { ...row, inclusionPct: row.inclusionPct - 0.1 } : row.ingredientId === x912.id ? { ...row, inclusionPct: row.inclusionPct + 0.1 } : row) };
    const dose = buildFormulationAssessment(phase, "ME", off, library).requirements.find((c) => c.id === "premix-dose")!;
    assert.equal(dose.status, "not_met");
    assert.deepEqual(studioPremixProblems({ [x912.id]: { role: "fixed", fixed: 0.3 } }, programmeId, phase.id), [`${x912.name} must be fixed at its manufacturer dose of 2 kg/t.`]);
  });

  test("8. missing premix data are labelled, never silent verified zeros", async () => {
    const caremix = commercialPremixById("caremix-pig-grower")!;
    const run = await formulateLeastCostDiet(phase, "ME", withProduct(caremix.id), library, { explore: false });
    const recipe = run.status === "optimal" ? run.solution : run.status === "infeasible" ? run.bestEffort : undefined;
    assert.ok(recipe, "Caremix must still formulate: undocumented values are conservative zeros, not missing data");
    const assessment = buildFormulationAssessment(phase, "ME", recipe.formula, library);
    const energy = assessment.requirements.find((c) => c.id === "energy-me")!;
    assert.equal(energy.data, "assumed_zero");
    assert.ok(energy.assumedZeroIngredientIds.includes(caremix.id));
    assert.ok(assessment.supplementation!.rows.every((row) => row.status !== "at_recommendation" || row.data !== "published" || !row.undocumentedIngredientIds.length));
    assert.ok(assessment.supplementation!.rows.filter((row) => row.status === "no_data").every((row) => row.undocumentedIngredientIds.includes(caremix.id)));
    assert.ok(assessment.documentationGaps.length > 0);
    assert.ok(assessment.documentationGaps.every((gap) => gap.ingredientId === caremix.id));
  });
});

describe("premix replacement lives in Advisories and re-runs the whole diet", () => {
  const options = withProduct("sustar-glypro-x912");

  test("9, 11 and 12. each alternative is a full re-run, never stacked, with partial costs disclosed", async () => {
    const primary = await solved(options, library);
    const assessment = buildFormulationAssessment(phase, "ME", primary.formula, library);
    const comparison = await comparePremixes({
      phase, energySystem: "ME", programmeId, options, library,
      current: { formula: primary.formula, costPerKg: primary.costPerKg, assessment, feasible: true },
      priceForPremix: ingredientDefaultPricePerKg,
    });
    assert.ok(comparison);
    assert.equal(comparison.currentPremixId, "sustar-glypro-x912");
    const caremix = comparison.options.find((o) => o.premixId === "caremix-pig-grower")!;
    assert.ok(caremix, "the stage-eligible Caremix product is compared");
    const premixesIn = (o: PremixOption) => o.recipe.filter((row) => commercialPremixById(row.ingredientId));
    for (const o of comparison.options) assert.equal(premixesIn(o).length, 1, "exactly one premix per recipe");
    assert.deepEqual(premixesIn(caremix).map((row) => row.ingredientId), ["caremix-pig-grower"]);
    assert.ok(Math.abs(premixesIn(caremix)[0].inclusionPct - 3.2) < 1e-9, "inserted at its manufacturer dose");
    assert.notEqual(pct({ ingredients: caremix.recipe }, "corn-yellow-dent"), pct(primary.formula, "corn-yellow-dent"), "the rest is re-optimised");
    assert.ok(caremix.requirementsTotal > 0, "every nutrient is recalculated");
    assert.equal(caremix.costExcludesPremix, ingredientDefaultPricePerKg("caremix-pig-grower") === undefined);
    assert.equal(comparison.options.find((o) => o.current)!.costExcludesPremix, false);

    // Studio's Replace action removes the old premix before inserting the new one.
    const pool = poolWithPremixSelection({ "sustar-glypro-x912": { role: "fixed", fixed: 0.2 }, "corn-yellow-dent": { role: "available" } }, programmeId, "caremix-pig-grower", phase.id);
    assert.equal(pool["sustar-glypro-x912"], undefined);
    assert.deepEqual(pool["caremix-pig-grower"], { role: "fixed", fixed: 3.2 });
    assert.deepEqual(studioPremixProblems({ ...pool, "sustar-glypro-x912": { role: "fixed", fixed: 0.2 } }, programmeId, phase.id), ["Only one premix may be included in a formulation."]);
  });

  test("10. suggestions are advisory, need a re-run improvement, and never count higher concentrations alone", () => {
    const base: PremixOption = {
      premixId: "a", name: "A", inclusionPct: 0.2, inclusionKgPerTonne: 2, current: true, status: "optimal",
      costPerTonne: 400, costExcludesPremix: false, requirementsMet: 20, requirementsTotal: 20, recipe: [],
      documentationGapLabels: ["Vitamin E"], supplementationAt: 9, supplementationTotal: 14,
    };
    // Same reached recommendations, same gaps, dearer: richer vitamins alone are not a reason.
    assert.equal(suggestPremixReplacement(base, [{ ...base, premixId: "b", current: false, costPerTonne: 410 }]).suggestedPremixId, null);
    // An alternative that misses a hard requirement is never suggested.
    assert.equal(suggestPremixReplacement(base, [{ ...base, premixId: "c", current: false, documentationGapLabels: [], requirementsMet: 19 }]).suggestedPremixId, null);
    const better = suggestPremixReplacement(base, [{ ...base, premixId: "d", current: false, documentationGapLabels: [], supplementationAt: 13, costPerTonne: 406.42 }]);
    assert.equal(better.suggestedPremixId, "d");
    assert.ok(better.reasons.some((r) => /documentation gap/.test(r)) && better.reasons.some((r) => /13 of 14/.test(r)));
  });

  test("10. the optimize/MCP entry point reports alternatives separately from hard requirements", async () => {
    const assessed = await formulateAndAssess({ phase, energySystem: "ME", programmeId, options, library, priceForPremix: ingredientDefaultPricePerKg });
    assert.equal(assessed.result.status, "optimal");
    assert.ok(assessed.premixComparison && assessed.premixComparison.options.length >= 2);
    assert.equal(assessed.assessment!.verdict, "meets_requirements", "an available alternative never changes feasibility");
    assert.ok(assessed.assessment!.requirements.every((c) => !c.id.includes("premix-alternative")));
  });
});

describe("consistency across surfaces and post-solve protection", () => {
  test("13. MCP, the optimize entry point and recipe evaluation agree on the same formulation", async () => {
    const ingredients = [...BASAL, "sustar-glypro-x912"];
    const mcp = await mcpFormulate({
      programme_id: `${programmeId}:${phase.id}`,
      ingredient_mode: "selected",
      ingredients,
      constraints: { "soybean-degummed-oil": { max_percent: 4 } },
    }, { prices: INGREDIENT_DEFAULT_PRICES });
    assert.equal(mcp.status, "optimal");
    if (mcp.status !== "optimal") return;
    // Re-evaluating MCP's recipe, as Studio's evaluate API does, gives the same verdict.
    const formula = { ingredients: mcp.ingredients.map((row) => ({ ingredientId: row.ingredient, inclusionPct: row.percentage })) };
    const total = formula.ingredients.reduce((t, row) => t + row.inclusionPct, 0);
    const evaluated = buildFormulationAssessment(phase, "ME", { ingredients: formula.ingredients.map((row) => ({ ...row, inclusionPct: row.inclusionPct * 100 / total })) }, library);
    assert.equal(mcp.nutritional_validation.headline, evaluated.headline);
    assert.equal(mcp.nutritional_validation.overall_status, evaluated.verdict);
    assert.deepEqual(mcp.nutritional_validation.hard_requirements.map((r) => [r.label, r.status]), evaluated.requirements.map((r) => [r.label, r.status]));
    assert.deepEqual(mcp.nutritional_validation.advisories.premix_documentation_gaps.map((g) => g.label), evaluated.documentationGaps.map((g) => g.label));
    assert.ok(mcp.premix_advisory, "MCP carries the same premix advisory as Studio");
  });

  test("14. genuine post-solve violations are rejected; GLPK-sized residuals are not", () => {
    assert.ok(nutrientFeasibilityTolerance(0.208) < 1e-5);
    const deficient = { ingredients: [{ ingredientId: "corn-yellow-dent", inclusionPct: 100 }] };
    const checked = buildFormulationAssessment(phase, "ME", deficient, library, { checkOptimizerConsistency: true });
    assert.ok(checked.consistencyErrors.some((message) => message.startsWith("SID lysine failed post-solve validation")));
    assert.equal(checked.verdict, "fails_requirements");
    assert.equal(checked.headline, "Engine consistency error");

    const ok = buildInfeasibleFormulationAssessment("Sample.");
    const candidates = [
      { id: "low-soy", assessment: checked },
      { id: "low-import", assessment: ok },
    ];
    assert.deepEqual(keepConsistentAlternatives(candidates).map((c) => c.id), ["low-import"]);
    assert.equal(candidates[0].assessment.consistencyErrors.length > 0, true, "filtering never pardons the primary");
  });

  test("14. a GLPK presolve 'optimum' that breaks a hard bound is reported as infeasible, never as a recipe", async () => {
    // No crystalline valine: SID valine cannot reach the minimum. GLPK's presolver
    // used to return OPTIMAL here with SID valine and tryptophan below their minimums.
    const ids = BASAL.filter((id) => id !== "l-valine" && id !== "wheat-bran");
    const result = await formulateLeastCostDiet(phase, "ME", ids.map((id) => option(id)), library, { explore: false });
    assert.equal(result.status, "infeasible");
    if (result.status !== "infeasible") return;
    assert.ok(result.diagnostics.some((d) => d.constraintId === "sid-valine"));
    const closest = buildFormulationAssessment(phase, "ME", result.bestEffort!.formula, library, { optimizerFeasible: false });
    assert.equal(closest.verdict, "infeasible");
    assert.ok(closest.requirements.some((c) => c.id === "sid-valine" && c.status === "not_met"));
  });

  test("saved assessments: schema 2 round-trips; schema 1 is legacy and never re-scored", async () => {
    const solution = await solved(withFixture("test-sid-premix"));
    const assessment = buildFormulationAssessment(phase, "ME", solution.formula, fixtureLibrary);
    const restored = JSON.parse(JSON.stringify(assessment));
    assert.ok(isFormulationAssessment(restored));
    assert.deepEqual(restored, assessment);
    const legacy = { schemaVersion: 1, verdict: "needs_verification", nutrientChecks: [], categories: [] };
    assert.equal(isFormulationAssessment(legacy), false);
    assert.equal(isLegacyAssessment(legacy), true);
  });
});

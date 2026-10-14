import assert from "node:assert/strict";
import { before, describe, test } from "node:test";

import { POST as evaluatePost } from "@/app/api/feed-formulation/evaluate/route";
import { POST as optimizePost } from "@/app/api/feed-formulation/optimize/route";
import {
  evaluateManual,
  formulate,
  manualAmounts,
  manualPct,
  nutrientRows,
  restoreVersion,
  summarise,
  validateManualRecipe,
  type EngineContext,
  type SavedVersion,
  type Snapshot,
} from "@/components/formulation-studio/engine";
import { analyzeDiet } from "./diet-formula";
import { ingredientDefaultPricePerKg } from "./feed-ingredient-prices";
import { snake } from "./feed-number-format";
import { evaluateFormulation, formulateLeastCostDiet } from "./feed-optimizer";
import { feedProgrammePhaseById } from "./feed-programmes";
import { buildFormulationAssessment, requirementDisplay, type FormulationAssessment, type RequirementCheck } from "./formulation-assessment";
import { normaliseInclusionTotal } from "./inclusion-total";
import { ingredientLibraryForPhase } from "./ingredient-nutrients";
import { analyseFormulation } from "./mcp/feedsport-service";
import { INGREDIENT_DEFAULT_PRICES } from "./feed-ingredient-prices";

// The production reproduction: Grow-Finish Pig, Grower 47–74 kg (Brazilian
// Tables 2024), Caremix Pig Grower fixed at 32 kg/t, optimised, then wheat
// bran and soybean meal adjusted by hand. Untouched amounts keep their exact
// optimised values behind two-decimal inputs, so the edited recipe totals 100%
// only to within input rounding. Caremix's calculated profile supplies calcium,
// sodium and lysine, so the optimum puts corn at its 65% family ceiling.

const PROGRAMME_ID = "grow-finish-pig";
const PHASE_ID = "br2024-5-43-91-119d-47-74kg";
const PREMIX = "caremix-pig-grower";
const CORN = "corn-yellow-dent";
const BRAN = "wheat-bran";
const SBM = "soybean-meal-solvent-extracted";
const phase = feedProgrammePhaseById(PROGRAMME_ID, PHASE_ID)!;
const library = ingredientLibraryForPhase(phase);
const BASAL = [CORN, SBM, BRAN, "soybean-degummed-oil", "limestone-ground", "dicalcium-phosphate", "sodium-chloride", "l-lysine-hcl", "dl-methionine", "l-threonine", "l-tryptophan", "l-valine"];

type Row = { ingredientId: string; inclusionPct: number };
let optimised: Row[] = [];

before(async () => {
  const options = [
    ...BASAL.map((ingredientId) => ({ ingredientId, pricePerKg: ingredientDefaultPricePerKg(ingredientId) ?? 0, ...(ingredientId === "soybean-degummed-oil" ? { maxInclusionPct: 4 } : {}) })),
    { ingredientId: PREMIX, pricePerKg: 0, minInclusionPct: 3.2, maxInclusionPct: 3.2 },
  ];
  const result = await formulateLeastCostDiet(phase, "ME", options, library, { explore: false });
  assert.equal(result.status, "optimal");
  if (result.status !== "optimal") return;
  optimised = result.solution.formula.ingredients.filter((row) => row.inclusionPct > 1e-6);
});

const pctOf = (rows: readonly Row[], id: string) => rows.find((row) => row.ingredientId === id)?.inclusionPct ?? 0;
const withAmounts = (rows: readonly Row[], amounts: Record<string, number>): Row[] =>
  rows.map((row) => (row.ingredientId in amounts ? { ...row, inclusionPct: amounts[row.ingredientId] } : row));
const total = (rows: readonly Row[]) => rows.reduce((sum, row) => sum + row.inclusionPct, 0);
/** Wheat bran and soybean meal retyped at two decimals and moved by `delta`, everything else exact: the reported edit. */
const handEdited = (delta: number) => withAmounts(optimised, {
  [BRAN]: +(+pctOf(optimised, BRAN).toFixed(2) + delta).toFixed(2),
  [SBM]: +(+pctOf(optimised, SBM).toFixed(2) - delta).toFixed(2),
});
const assess = (rows: readonly Row[]) => buildFormulationAssessment(phase, "ME", { ingredients: [...rows] }, library);
const check = (assessment: FormulationAssessment, id: string) => assessment.requirements.find((row) => row.id === id)!;
const cornFamily = (assessment: FormulationAssessment) => assessment.requirements.find((row) => row.aggregate?.memberIngredientIds.includes(CORN))!;
const statuses = (assessment: FormulationAssessment) => Object.fromEntries(assessment.requirements.map((row) => [row.id, row.status]));

async function evaluate(rows: readonly Row[]) {
  const response = await evaluatePost(new Request("http://localhost/api/feed-formulation/evaluate", {
    method: "POST",
    body: JSON.stringify({ programmeId: PROGRAMME_ID, phaseId: PHASE_ID, energySystem: "ME", ingredients: rows }),
  }));
  return { status: response.status, body: await response.json() };
}

describe("the reproduced manual assessment", () => {
  test("the optimised recipe meets every requirement, with corn at its 65% ceiling and the premix at 3.2%", () => {
    const assessment = assess(optimised);
    assert.equal(assessment.verdict, "meets_requirements");
    assert.ok(Math.abs(pctOf(optimised, CORN) - 65) < 1e-9, "the scenario binds corn at exactly 65%");
    assert.equal(pctOf(optimised, PREMIX), 3.2, "the solver returns the fixed dose exactly");
    assert.equal(cornFamily(assessment).status, "met");
    assert.equal(cornFamily(assessment).limiting, true);
    assert.equal(check(assessment, "premix-dose").status, "met");
    assert.equal(assessment.inclusionTotalPct, undefined, "an exact 100% total is assessed as given");
  });

  test("a hand edit leaves a rounding residual but never moves the fixed premix dose (was: 3.199868% ≠ 3.2%)", async () => {
    const edited = handEdited(1);
    assert.ok(Math.abs(total(edited) - 100) > 1e-6 && Math.abs(total(edited) - 100) < 0.05, "the residual from two-decimal inputs");
    const { status, body } = await evaluate(edited);
    assert.equal(status, 200);
    const premix = check(body.assessment, "premix-dose");
    assert.equal(premix.status, "met");
    assert.equal(premix.actual, 3.2, "judged on the amount entered and weighed");
    assert.equal(body.assessment.inclusionTotalPct, total(edited));
    assert.match(body.assessment.summary, /amounts total 99\.99\d+%, a rounding difference/);
  });

  test("the reported nutrient failures are genuine shortfalls, written so they can be seen", async () => {
    // Moving 0.25% from soybean meal to wheat bran lowers SID lysine to about
    // 0.8856% against the published 0.891%; two-decimal display would hide it
    // as "0.89% / ≥0.89%".
    const { body } = await evaluate(handEdited(0.25));
    for (const id of ["sid-lysine", "sid-met-cys", "sid-threonine", "sid-tryptophan"]) {
      const row: RequirementCheck = check(body.assessment, id);
      assert.equal(row.status, "not_met", id);
      assert.ok(row.bound - row.actual > 1e-4, `${id} is short by far more than any tolerance`);
      const { dp, gap } = requirementDisplay(row, 2);
      assert.notEqual(row.actual.toFixed(dp), row.bound.toFixed(dp), `${id} never reads as equal to its requirement`);
      assert.match(gap!.text, /^0\.00\d+ percentage points below the minimum$/);
    }
    assert.equal(check(body.assessment, "sid-lysine").bound, 0.891, "the Brazilian Tables target is unchanged");
  });

  test("the edit in the other direction meets energy and every amino acid but genuinely misses phosphorus and chloride", async () => {
    const { body } = await evaluate(handEdited(-0.5));
    const failed = body.assessment.requirements.filter((row: RequirementCheck) => row.status === "not_met").map((row: RequirementCheck) => row.id);
    assert.deepEqual(failed, ["sttd-phosphorus", "chloride"]);
    assert.match(requirementDisplay(check(body.assessment, "sttd-phosphorus"), 2).gap!.text, /percentage points below the minimum/);
  });

  test("nutrients are measured on the mix the entered amounts make", () => {
    const edited = handEdited(1);
    const assessment = assess(edited);
    const mix = analyzeDiet({ ingredients: normaliseInclusionTotal(edited) }, [], library);
    assert.equal(check(assessment, "sid-lysine").actual, mix.sidAminoAcidsPct.lysine.value);
  });
});

describe("premix fixed dose", () => {
  // Balance each change on wheat bran so the total stays exactly 100%.
  const premixAt = (pct: number) => withAmounts(optimised, { [PREMIX]: pct, [BRAN]: pctOf(optimised, BRAN) + 3.2 - pct });

  test("exactly 3.2% is met, including 3.2 written as a floating-point sum", () => {
    assert.equal(check(assess(premixAt(3.2)), "premix-dose").status, "met");
    assert.equal(check(assess(premixAt(1.1 + 2.1)), "premix-dose").status, "met");
  });

  test("slightly below or above 3.2% is not met, and says by how much", () => {
    for (const [pct, side] of [[3.1999, "below"], [3.2001, "above"]] as const) {
      const row = check(assess(premixAt(pct)), "premix-dose");
      assert.equal(row.status, "not_met", String(pct));
      assert.equal(requirementDisplay(row, 2).gap!.text, `0.00010 percentage points ${side} the required value`);
    }
  });
});

describe("corn family ceiling", () => {
  test("exactly 65% with a rounding residual elsewhere is met (was: rescaled to 65.0015% and failed)", async () => {
    const short = withAmounts(optimised, { [BRAN]: +pctOf(optimised, BRAN).toFixed(2) - 0.01 });
    assert.ok(total(short) < 100 && total(short) > 99.95);
    const { body } = await evaluate(short);
    assert.equal(cornFamily(body.assessment).status, "met");
    assert.equal(cornFamily(body.assessment).actual, 65);
  });

  test("a genuine exceedance fails and is reported with its real figures", () => {
    const over = withAmounts(optimised, { [CORN]: 65.01, [SBM]: pctOf(optimised, SBM) - 0.01 });
    const assessment = assess(over);
    assert.equal(cornFamily(assessment).status, "not_met");
    assert.match(assessment.summary, /exceeds its combined maximum \(65\.01% > 65%\)/);
  });
});

describe("batch total policy", () => {
  test("an exact 100% total, including floating-point sums, is assessed as given", () => {
    assert.equal(assess(optimised).inclusionTotalPct, undefined);
  });

  test("a residual within ±0.05 is accepted and recorded; beyond it the batch is rejected, never rescaled", async () => {
    const within = withAmounts(optimised, { [CORN]: pctOf(optimised, CORN) + 0.04 });
    assert.equal(assess(within).inclusionTotalPct, total(within));
    const beyond = withAmounts(optimised, { [CORN]: pctOf(optimised, CORN) + 0.06 });
    assert.throws(() => assess(beyond), /must sum to 100%/);
    const { status, body } = await evaluate(beyond);
    assert.equal(status, 400);
    assert.match(body.message, /must sum to 100%; received 100\.06/);
  });
});

describe("one set of rules across optimiser, manual check, API and MCP", () => {
  const mcp = (rows: readonly Row[]) => analyseFormulation({
    programme_id: `${PROGRAMME_ID}:${PHASE_ID}`,
    energy_system: "ME",
    recipe: rows.map((row) => ({ ingredient: row.ingredientId, percentage: row.inclusionPct })),
  }, { prices: INGREDIENT_DEFAULT_PRICES });

  test("an unchanged manual copy is assessed exactly as the optimiser's recipe, everywhere", async () => {
    const { body } = await evaluate(optimised);
    const asOptimised = buildFormulationAssessment(phase, "ME", { ingredients: optimised }, library, { checkOptimizerConsistency: true });
    assert.deepEqual(asOptimised.consistencyErrors, []);
    assert.deepEqual(statuses(body.assessment), statuses(asOptimised));
    const analysis = mcp(optimised);
    assert.equal(analysis.status, "pass");
    assert.equal(analysis.nutritional_validation.overall_status, "meets_requirements");
  });

  for (const delta of [1, -1, 0.5]) {
    test(`a hand-edited recipe (${delta > 0 ? "+" : ""}${delta}% wheat bran) gets the same verdicts from the evaluate API, MCP and Studio`, async () => {
      const edited = handEdited(delta);
      const { body } = await evaluate(edited);
      const analysis = mcp(edited);
      if (analysis.status === "manufacturer_recipe") throw new Error("not a manufacturer recipe");
      const mcpStatuses = Object.fromEntries(analysis.nutritional_validation.hard_requirements.map((row) => [row.nutrient, row.status]));
      assert.deepEqual(mcpStatuses, Object.fromEntries(body.assessment.requirements.map((row: RequirementCheck) => [snake(row.id), row.status])));

      // MCP's own deficiency list and Studio's nutrient rows use the assessment's rule.
      const failedNutrients = body.assessment.requirements
        .filter((row: RequirementCheck) => row.status === "not_met" && !row.aggregate && row.relation !== "equal")
        .map((row: RequirementCheck) => snake(row.id)).sort();
      assert.deepEqual([...analysis.deficiencies, ...analysis.excesses].map((row) => row.nutrient).sort(), failedNutrients);
      assert.equal(analysis.passes, body.assessment.verdict === "meets_requirements");
      for (const row of nutrientRows(body.nutrientProfile)) {
        assert.equal(row.status === "met", check(body.assessment, row.id).status === "met", row.id);
      }
      for (const row of analysis.deficiencies) assert.ok((row as { deviation?: number }).deviation! > 0, "MCP states the unrounded shortfall");
    });
  }

  test("the evaluate API's nutrient profile comes from the same mix as its assessment", async () => {
    const edited = handEdited(1);
    const { body } = await evaluate(edited);
    const profile = evaluateFormulation(phase, "ME", { ingredients: normaliseInclusionTotal(edited) }, library).nutrientProfile;
    assert.deepEqual(body.nutrientProfile, JSON.parse(JSON.stringify(profile)));
    const lysine = profile.find((row) => row.id === "sid-lysine")!;
    assert.equal(lysine.actual, check(body.assessment, "sid-lysine").actual);
  });
});

describe("Studio: manual edits, save, reload and reassessment", () => {
  const pool: Snapshot["pool"] = {
    ...Object.fromEntries(BASAL.map((id) => [id, id === "soybean-degummed-oil" ? { role: "available" as const, max: 4 } : { role: "available" as const }])),
    [PREMIX]: { role: "fixed", fixed: 3.2 },
  };
  const snapshot: Snapshot = { programmeId: PROGRAMME_ID, phaseId: PHASE_ID, goal: "least_cost", batch: 1000, pool };
  const context = {
    catalogue: new Map([...BASAL, PREMIX].map((id) => [id, {
      id,
      name: library.ingredients.find((record) => record.id === id)?.name ?? id,
      price: id === PREMIX ? null : { usdPerTonne: (ingredientDefaultPricePerKg(id) ?? 0) * 1000 },
      ...(id === PREMIX ? { category: "Premix" } : {}),
    }])),
    programmes: {
      requirementFields: [],
      programmes: [{ id: PROGRAMME_ID, name: "Grow-Finish Pig", species: "swine", phases: [{ id: PHASE_ID, label: "Grower 47–74 kg" }] }],
      limits: {},
    },
  } as unknown as EngineContext;

  async function withRoutes<T>(run: () => Promise<T>): Promise<T> {
    const original = globalThis.fetch;
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const request = new Request(new URL(String(url), "http://localhost"), init);
      return String(url).endsWith("/optimize") ? optimizePost(request) : evaluatePost(request);
    }) as typeof fetch;
    try {
      return await run();
    } finally {
      globalThis.fetch = original;
    }
  }

  test("a hand edit with a fixed 3.2% premix passes the manual bounds check", () => {
    const amounts = manualAmounts(optimised.map((row) => ({ id: row.ingredientId, pct: row.inclusionPct })), Object.keys(pool));
    amounts.typed[BRAN] = String(+(pctOf(optimised, BRAN) + 1).toFixed(2));
    amounts.typed[SBM] = String(+(pctOf(optimised, SBM) - 1).toFixed(2));
    const pct = manualPct(amounts);
    assert.equal(pct[PREMIX], 3.2);
    assert.ok(Math.abs(Object.values(pct).reduce((sum, v) => sum + v, 0) - 100) > 1e-6, "a residual is present");
    const validity = validateManualRecipe(snapshot, pct, context);
    assert.deepEqual(validity.issues, []);

    const offDose = validateManualRecipe(snapshot, { ...pct, [PREMIX]: 3.2001, [BRAN]: pct[BRAN] - 0.0001 }, context);
    assert.deepEqual(offDose.issues.map((issue) => [issue.title, issue.body]), [[
      `${context.catalogue.get(PREMIX)!.name} must be fixed at 3.2%`,
      "The manual amount is 3.2001% and does not match its fixed inclusion.",
    ]]);
  });

  test("saving and reopening keeps the exact amounts and assessment, and a re-check agrees with it", async () => {
    const { optimisedResult, check: saved, pct } = await withRoutes(async () => {
      const optimisedResult = await formulate(snapshot, context);
      assert.equal(optimisedResult.status, "optimal");
      if (optimisedResult.status !== "optimal") throw new Error("not optimal");
      const amounts = manualAmounts(optimisedResult.recipe, Object.keys(pool));
      amounts.typed[BRAN] = String(+(optimisedResult.recipe.find((line) => line.id === BRAN)!.pct + 0.5).toFixed(2));
      amounts.typed[SBM] = String(+(optimisedResult.recipe.find((line) => line.id === SBM)!.pct - 0.5).toFixed(2));
      const pct = manualPct(amounts);
      return { optimisedResult, check: await evaluateManual(snapshot, pct, context), pct };
    });
    assert.ok(saved.assessment);
    assert.equal(check(saved.assessment!, "premix-dose").status, "met");

    const version: SavedVersion = JSON.parse(JSON.stringify({
      v: 1, date: 0, snap: snapshot,
      sum: summarise(optimisedResult, { ...saved, recipe: Object.keys(pct).map((id) => ({ id, pct: pct[id] })) }),
    }));
    const restored = restoreVersion(version);
    assert.equal(restored.mode, "manual");
    if (restored.mode !== "manual") return;
    assert.deepEqual(manualPct(restored.manual), pct, "the exact amounts, not their two-decimal display");
    assert.deepEqual(restored.check.assessment, JSON.parse(JSON.stringify(saved.assessment)));

    const rechecked = await withRoutes(() => evaluateManual(snapshot, manualPct(restored.manual), context));
    assert.deepEqual(rechecked.assessment, restored.check.assessment, "reassessing the reopened recipe gives the saved result");
    assert.deepEqual(rechecked.nutrients, restored.check.nutrients);
  });
});

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { DietFormula } from "./diet-formula";
import { ingredientDefaultPricePerKg } from "./feed-ingredient-prices";
import {
  formulateLeastCostDiet,
  loadGlpk,
  nutrientFeasibilityTolerance,
  solveDiagnostic,
  type ConstraintSpec,
  type FormulationIngredientOption,
  type PreparedIngredient,
} from "./feed-optimizer";
import { feedProgrammePhaseById } from "./feed-programmes";
import { buildFormulationAssessment } from "./formulation-assessment";
import { ingredientLibraryForPhase } from "./ingredient-nutrients";

// The closest achievable formulation (solveDiagnostic): when no recipe meets
// every requirement, minimise the worst relative deviation, then the total,
// then cost, keeping every ingredient bound, fixed amount and ceiling hard.

// ---- synthetic models, where the right answer is known exactly ----

const ingredient = (id: string, coefficients: Record<string, number>, pricePerKg = 0.3, bounds: { min?: number; max?: number } = {}): PreparedIngredient => ({
  option: { ingredientId: id, pricePerKg },
  variable: "x_" + id,
  familyId: id,
  minFraction: bounds.min ?? 0,
  maxFraction: bounds.max ?? 1,
  coefficients: new Map(Object.entries(coefficients)),
  aggregateRules: [],
});
const requirement = (id: string, bound: number, relation: "min" | "max" = "min"): ConstraintSpec => ({
  id,
  label: id,
  unit: "%",
  relation,
  bound,
  measure: () => { throw new Error("not used by the LP"); },
});
const near = (actual: number, expected: number, tol = 1e-7) => assert.ok(Math.abs(actual - expected) <= tol, `${actual} ≉ ${expected}`);

describe("closest achievable formulation: the LP", () => {
  test("minimax: no single nutrient is sacrificed to improve the sum", async () => {
    // A supplies n1 at 2 per unit, B supplies n2 at 1; both need ≥ 1.
    // Least total deviation (the former objective) takes A = 0.5: n1 met, n2 50% short.
    // Minimax balances them: A = 1/3, both 33.3% short.
    const glpk = await loadGlpk();
    const r = await solveDiagnostic(glpk, [ingredient("a", { n1: 2, n2: 0 }), ingredient("b", { n1: 0, n2: 1 })], [requirement("n1", 1), requirement("n2", 1)]);
    assert.equal(r.status, "optimal");
    if (r.status !== "optimal") return;
    near(r.vars.x_a, 1 / 3);
    near(r.worstRelativeDeviation, 1 / 3);
    near(r.totalRelativeDeviation, 2 / 3);
  });

  test("with the worst case held, the total is minimised, and cost only breaks the remaining tie", async () => {
    // Worst deviation is 0.5 (n1 against n2) whatever C does; C anywhere in
    // [0.2, 0.5] keeps that. The total is least once C ≥ 0.4 (n3 met), and
    // among those the cheaper A takes the rest: C = 0.4, A = 0.1, B = 0.5.
    const glpk = await loadGlpk();
    const r = await solveDiagnostic(
      glpk,
      [ingredient("a", { n1: 1, n2: 0, n3: 0 }, 0.1), ingredient("b", { n1: 0, n2: 1, n3: 0 }, 0.1), ingredient("c", { n1: 1, n2: 0, n3: 1 }, 5)],
      [requirement("n1", 1), requirement("n2", 1), requirement("n3", 0.4)],
    );
    assert.equal(r.status, "optimal");
    if (r.status !== "optimal") return;
    near(r.worstRelativeDeviation, 0.5);
    near(r.totalRelativeDeviation, 1);
    near(r.vars.x_c, 0.4);
    near(r.vars.x_a, 0.1);
    near(r.vars.x_b, 0.5);
  });

  test("cost never buys a worse nutrient deviation", async () => {
    // B is far cheaper but supplies nothing; the closest recipe still uses only A.
    const glpk = await loadGlpk();
    const r = await solveDiagnostic(glpk, [ingredient("a", { n1: 0.5 }, 100), ingredient("b", { n1: 0 }, 0)], [requirement("n1", 1)]);
    assert.equal(r.status, "optimal");
    if (r.status !== "optimal") return;
    near(r.vars.x_a, 1);
    near(r.worstRelativeDeviation, 0.5);
  });

  test("a fixed ingredient keeps its exact amount; only the others move", async () => {
    const fixed = 0.123456789012;
    const glpk = await loadGlpk();
    const r = await solveDiagnostic(
      glpk,
      [ingredient("a", { n1: 2, n2: 0 }, 0.3, { min: fixed, max: fixed }), ingredient("b", { n1: 0, n2: 1 })],
      [requirement("n1", 1), requirement("n2", 1)],
    );
    assert.equal(r.status, "optimal");
    if (r.status !== "optimal") return;
    assert.equal(r.vars.x_a, fixed);
    near(r.worstRelativeDeviation, 1 - 2 * fixed);
  });

  test("maximum requirements are relaxed the same way", async () => {
    // Every ingredient is above the n1 maximum of 1; the closest uses the lowest.
    const glpk = await loadGlpk();
    const r = await solveDiagnostic(glpk, [ingredient("a", { n1: 3 }), ingredient("b", { n1: 1.5 }, 9)], [requirement("n1", 1, "max")]);
    assert.equal(r.status, "optimal");
    if (r.status !== "optimal") return;
    near(r.vars.x_b, 1);
    near(r.worstRelativeDeviation, 0.5);
  });

  test("ingredient bounds that can't make 100% have no closest recipe", async () => {
    const glpk = await loadGlpk();
    const r = await solveDiagnostic(glpk, [ingredient("a", { n1: 1 }, 0.3, { max: 0.4 }), ingredient("b", { n1: 1 }, 0.3, { max: 0.4 })], [requirement("n1", 1)]);
    assert.equal(r.status, "infeasible");
  });
});

// ---- the real engine: Brazilian Tables pig grower ----

const programmeId = "grow-finish-pig";
const phase = feedProgrammePhaseById(programmeId, "br2024-5-43-63-91d-26-47kg")!;
const library = ingredientLibraryForPhase(phase);
const option = (id: string, extra: Partial<FormulationIngredientOption> = {}): FormulationIngredientOption => ({ ingredientId: id, pricePerKg: ingredientDefaultPricePerKg(id) ?? 0, ...extra });
// No crystalline valine or tryptophan: SID valine and tryptophan can't be reached.
const SHORT_POOL = ["corn-yellow-dent", "soybean-meal-solvent-extracted", "limestone-ground", "dicalcium-phosphate", "sodium-chloride", "l-lysine-hcl", "dl-methionine", "l-threonine"];
const pctOf = (formula: DietFormula, id: string) => formula.ingredients.find((row) => row.ingredientId === id)?.inclusionPct ?? 0;

describe("closest achievable formulation: the engine", () => {
  test("an infeasible pool returns the closest recipe, its unmet requirements and their deviations", async () => {
    const result = await formulateLeastCostDiet(phase, "ME", SHORT_POOL.map((id) => option(id)), library, { explore: false });
    assert.equal(result.status, "infeasible");
    if (result.status !== "infeasible") return;
    assert.ok(result.bestEffort && result.bestEffortNutrientProfile && result.closestAchievable);
    assert.ok(result.diagnostics.length > 0);
    for (const d of result.diagnostics) {
      near(d.deviationPct, ((d.shortfall + d.excess) / d.bound) * 100, 1e-9);
      assert.ok(d.shortfall + d.excess > nutrientFeasibilityTolerance(d.bound), d.constraintId + " is within tolerance yet reported unmet");
    }
    near(result.closestAchievable.worstDeviationPct, Math.max(...result.diagnostics.map((d) => d.deviationPct)), 1e-9);
    // Every modeled requirement is compared, met or not.
    assert.equal(result.bestEffortNutrientProfile.length >= result.diagnostics.length, true);
    near(result.bestEffort.formula.ingredients.reduce((t, row) => t + row.inclusionPct, 0), 100, 1e-9);
  });

  test("a closest recipe is never assessed as compliant", async () => {
    const result = await formulateLeastCostDiet(phase, "ME", SHORT_POOL.map((id) => option(id)), library, { explore: false });
    if (result.status !== "infeasible" || !result.bestEffort) return assert.fail("expected a closest recipe");
    const assessment = buildFormulationAssessment(phase, "ME", result.bestEffort.formula, library, { optimizerFeasible: false });
    assert.equal(assessment.verdict, "infeasible");
    assert.notEqual(assessment.headline.startsWith("Meets"), true);
    assert.match(assessment.summary, /Do not mix it/);
    for (const d of result.diagnostics) assert.ok(assessment.requirements.some((c) => c.id === d.constraintId && c.status === "not_met"), d.constraintId);
  });

  test("fixed amounts and tiny inclusions survive at full precision", async () => {
    const corn = 61.234567890123;
    const lysine = 0.0123456789;
    const options = SHORT_POOL.map((id) => option(id, id === "corn-yellow-dent" ? { minInclusionPct: corn, maxInclusionPct: corn } : id === "l-lysine-hcl" ? { minInclusionPct: lysine, maxInclusionPct: lysine } : {}));
    const result = await formulateLeastCostDiet(phase, "ME", options, library, { explore: false });
    if (result.status !== "infeasible" || !result.bestEffort) return assert.fail("expected a closest recipe");
    near(pctOf(result.bestEffort.formula, "corn-yellow-dent"), corn, 1e-9);
    near(pctOf(result.bestEffort.formula, "l-lysine-hcl"), lysine, 1e-12);
  });

  test("ingredient maxima and family ceilings stay hard in the closest recipe", async () => {
    const options = SHORT_POOL.map((id) => option(id, id === "soybean-meal-solvent-extracted" ? { maxInclusionPct: 15 } : {}));
    const result = await formulateLeastCostDiet(phase, "ME", options, library, { explore: false });
    if (result.status !== "infeasible" || !result.bestEffort) return assert.fail("expected a closest recipe");
    assert.ok(pctOf(result.bestEffort.formula, "soybean-meal-solvent-extracted") <= 15 + 1e-9);
    const assessment = buildFormulationAssessment(phase, "ME", result.bestEffort.formula, library, { optimizerFeasible: false });
    for (const check of assessment.requirements.filter((c) => c.aggregate)) assert.equal(check.status, "met", check.label);
  });

  test("a pool that can meet every requirement still gets the least-cost recipe", async () => {
    const pool = [...SHORT_POOL, "l-valine", "l-tryptophan", "wheat-bran", "soybean-degummed-oil"];
    const result = await formulateLeastCostDiet(phase, "ME", pool.map((id) => option(id, id === "soybean-degummed-oil" ? { maxInclusionPct: 4 } : {})), library, { explore: false });
    assert.equal(result.status, "optimal");
  });
});

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { requirementDisplay, type RequirementCheck } from "./formulation-assessment-model";
import {
  INCLUSION_TOLERANCE_PCT,
  aggregateTolerancePct,
  boundViolation,
  distinguishingDp,
  exactDp,
  gapDp,
  nutrientFeasibilityTolerance,
  withinBound,
} from "./numerical-tolerance";

describe("boundary semantics", () => {
  test("a value exactly at a minimum or maximum meets it", () => {
    assert.equal(withinBound("min", 0.891, 0.891, nutrientFeasibilityTolerance(0.891)), true);
    assert.equal(withinBound("max", 25, 25, aggregateTolerancePct(25)), true);
    assert.equal(withinBound("equal", 3.2, 3.2, INCLUSION_TOLERANCE_PCT), true);
  });

  test("a value genuinely below a minimum or above a maximum fails", () => {
    // 0.8905 is written 0.89 at two decimals but is 0.0005 short of 0.891.
    assert.equal(withinBound("min", 0.8905, 0.891, nutrientFeasibilityTolerance(0.891)), false);
    assert.equal(withinBound("min", 0.891 - 2 * nutrientFeasibilityTolerance(0.891), 0.891, nutrientFeasibilityTolerance(0.891)), false);
    assert.equal(withinBound("max", 25.01, 25, aggregateTolerancePct(25)), false);
    assert.equal(withinBound("equal", 3.2 - 1e-4, 3.2, INCLUSION_TOLERANCE_PCT), false);
    assert.equal(withinBound("equal", 3.2 + 1e-4, 3.2, INCLUSION_TOLERANCE_PCT), false);
  });

  test("solver-level differences within the tolerance are met, on either side", () => {
    const tolerance = nutrientFeasibilityTolerance(0.891);
    assert.ok(tolerance < 1e-5, "far below any formulating decision");
    assert.equal(withinBound("min", 0.891 - tolerance / 2, 0.891, tolerance), true);
    assert.equal(withinBound("max", 25 + aggregateTolerancePct(25) / 2, 25, aggregateTolerancePct(25)), true);
  });

  test("floating-point artefacts such as 0.1 + 0.2 never fail an exact bound", () => {
    assert.ok(0.1 + 0.2 > 0.3, "the artefact this guards against");
    assert.equal(withinBound("max", 0.1 + 0.2, 0.3, INCLUSION_TOLERANCE_PCT), true);
    assert.equal(withinBound("equal", 0.1 + 0.2, 0.3, INCLUSION_TOLERANCE_PCT), true);
    assert.equal(withinBound("equal", 1.1 + 2.1, 3.2, INCLUSION_TOLERANCE_PCT), true, "a premix dose typed as a sum");
  });

  test("violation is signed: positive only on the failing side", () => {
    assert.equal(boundViolation("min", 0.9, 0.891) < 0, true);
    assert.equal(boundViolation("max", 24, 25) < 0, true);
    assert.ok(Math.abs(boundViolation("min", 0.889, 0.891) - 0.002) < 1e-12);
    assert.ok(Math.abs(boundViolation("equal", 3.2001, 3.2) - 0.0001) < 1e-12);
  });
});

describe("display precision", () => {
  test("bounds keep their published decimals", () => {
    assert.equal(exactDp(0.891, 2), 3);
    assert.equal(exactDp(25, 2), 2);
    assert.equal(exactDp(3.2), 1);
    assert.equal(exactDp(3250), 0);
  });

  test("a failing value is written with the decimals that show the difference", () => {
    assert.equal(distinguishingDp(0.8886811, 0.891, 3), 3);
    assert.equal(distinguishingDp(3.199868, 3.2, 2), 4);
    assert.equal(distinguishingDp(0.889999, 0.89, 2), 6);
    assert.notEqual((0.889999).toFixed(6), (0.89).toFixed(6));
  });

  test("shortfalls are written to two significant figures", () => {
    assert.equal(gapDp(0.0023), 4);
    assert.equal(gapDp(0.00013), 5);
    assert.equal(gapDp(9.94), 1);
    assert.equal(gapDp(12), 0);
  });

  const check = (actual: number, bound: number, relation: RequirementCheck["relation"], status: RequirementCheck["status"]) =>
    ({ actual, bound, relation, status, unit: "%" }) as const;

  test("a near-boundary nutrient failure never reads as meeting its requirement", () => {
    // The production report: SID lysine "0.89% / ≥0.89%" for 0.8887 against 0.891.
    const { dp, gap } = requirementDisplay(check(0.8886811, 0.891, "min", "not_met"), 2);
    assert.equal(dp, 3);
    assert.notEqual((0.8886811).toFixed(dp), (0.891).toFixed(dp));
    assert.equal(gap?.text, "0.0023 percentage points below the minimum");
    assert.equal(gap?.short, "0.0023 short");
  });

  test("a premix dose off by a fraction shows the fraction", () => {
    const { dp, gap } = requirementDisplay(check(3.199868, 3.2, "equal", "not_met"), 2);
    assert.equal(dp, 4);
    assert.equal(gap?.text, "0.00013 percentage points below the required value");
  });

  test("a family ceiling exceeded shows its excess", () => {
    const { dp, gap } = requirementDisplay(check(25.01, 25, "max", "not_met"), 2);
    assert.equal(dp, 2);
    assert.equal(gap?.text, "0.010 percentage points above the maximum");
  });

  test("a met requirement shows its bound as published and no gap", () => {
    assert.deepEqual(requirementDisplay(check(0.891, 0.891, "min", "met"), 2), { dp: 3, gap: null });
    assert.deepEqual(requirementDisplay({ ...check(3250.2, 3250, "min", "met"), unit: "kcal/kg" }, 0), { dp: 0, gap: null });
  });

  test("energy shortfalls are given in their own unit", () => {
    const { gap } = requirementDisplay({ ...check(3240.06, 3250, "min", "not_met"), unit: "kcal/kg" }, 0);
    assert.equal(gap?.text, "9.9 kcal/kg below the minimum");
  });
});

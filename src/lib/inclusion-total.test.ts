import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { INCLUSION_TOTAL_TOLERANCE_PCT, normaliseInclusionTotal, roundInclusionsTo100 } from "./inclusion-total";

const rows = (...pcts: number[]) => pcts.map((inclusionPct, i) => ({ ingredientId: "i" + i, inclusionPct }));
const sum = (list: { inclusionPct: number }[]) => list.reduce((t, row) => t + row.inclusionPct, 0);

describe("inclusion totals", () => {
  test("rounding keeps the total at exactly 100% where naive rounding drifts", () => {
    // Each of these rounds up at two decimals, so rounding each one alone gives 100.01.
    const recipe = rows(70.006, 20.006, 9.988);
    assert.equal(+sum(recipe.map((row) => ({ inclusionPct: +row.inclusionPct.toFixed(2) }))).toFixed(6), 100.01);

    const rounded = roundInclusionsTo100(recipe);
    assert.ok(Math.abs(sum(rounded) - 100) < 1e-9);
    for (const row of rounded) assert.equal(row.inclusionPct, +row.inclusionPct.toFixed(2));
    for (const [i, row] of rounded.entries()) assert.ok(Math.abs(row.inclusionPct - recipe[i].inclusionPct) <= 0.01 + 1e-9);
  });

  test("totals within the tolerance are rescaled to 100%", () => {
    const normalised = normaliseInclusionTotal(rows(33.33, 33.33, 33.33));
    assert.ok(Math.abs(sum(normalised) - 100) < 1e-9);
    assert.ok(Math.abs(sum(normaliseInclusionTotal(rows(60.01, 40))) - 100) < 1e-9);
  });

  test("material deviations are rejected, not rescaled", () => {
    assert.throws(() => normaliseInclusionTotal(rows(60, 39.9)), /must sum to 100%; received 99\.9\./);
    assert.throws(() => normaliseInclusionTotal(rows(60, 40 + INCLUSION_TOTAL_TOLERANCE_PCT * 2)), /must sum to 100%/);
    assert.throws(() => normaliseInclusionTotal(rows(60, Number.NaN)), /must sum to 100%/);
  });
});

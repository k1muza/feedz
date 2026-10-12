import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { INCLUSION_TOTAL_TOLERANCE_PCT, normaliseInclusionTotal } from "./inclusion-total";

const rows = (...pcts: number[]) => pcts.map((inclusionPct, i) => ({ ingredientId: "i" + i, inclusionPct }));
const sum = (list: { inclusionPct: number }[]) => list.reduce((t, row) => t + row.inclusionPct, 0);

describe("inclusion totals", () => {
  test("amounts already at 100% are left exactly as they are", () => {
    const exact = rows(62.123456789, 30.876543211, 7);
    assert.deepEqual(normaliseInclusionTotal(exact), exact);
  });

  test("totals within the tolerance are rescaled to 100%", () => {
    assert.ok(Math.abs(sum(normaliseInclusionTotal(rows(33.33, 33.33, 33.33))) - 100) < 1e-9);
    assert.ok(Math.abs(sum(normaliseInclusionTotal(rows(60.01, 40))) - 100) < 1e-9);
  });

  test("material deviations are rejected, not rescaled", () => {
    assert.throws(() => normaliseInclusionTotal(rows(60, 39.9)), /must sum to 100%; received 99\.9\./);
    assert.throws(() => normaliseInclusionTotal(rows(60, 40 + INCLUSION_TOTAL_TOLERANCE_PCT * 2)), /must sum to 100%/);
    assert.throws(() => normaliseInclusionTotal(rows(60, Number.NaN)), /must sum to 100%/);
  });
});

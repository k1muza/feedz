import assert from "node:assert/strict";
import { test } from "node:test";
import { initialFeedMix } from "./public-formulation-defaults";

const initial = { sorghum: 70, soybean: 20, bran: 6, dcp: 1.2, limestone: 0.8, lysine: 0.25, methionine: 0.05 };
for (const dose of [0.1, 0.2, 4]) {
  test(`starter ingredient mix plus ${dose}% premix is exactly 100%`, () => {
    const result = initialFeedMix(initial, "sorghum", dose);
    assert.ok(Math.abs(Object.values(result).reduce((sum, pct) => sum + pct, dose) - 100) < 1e-8);
    assert.equal(result.soybean, initial.soybean);
    assert.equal(initial.sorghum, 70, "Never mutate the defaults");
  });
}

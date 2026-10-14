import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  ingredientDefaultPlanningPricePerTonne,
  ingredientDefaultPrice,
  ingredientDefaultPricePerKg,
} from "./feed-ingredient-prices";

const expectedPremixPlanningPrices: Record<string, number> = {
  "cj-s174-boar-premix": 5100,
  "sustar-glypro-x911": 7500,
  "sustar-glypro-x912": 5000,
  "sustar-glypro-x913": 2560,
  "sustar-glypro-x812": 5000,
  "sustar-glypro-x811": 3300,
};

describe("commercial premix planning prices", () => {
  test("prices Caremix from the supplier's per-bag quotation, without a planning multiplier", () => {
    for (const [id, bagUsd, bagKg] of [["caremix-pig-weaner", 42, 17], ["caremix-pig-grower", 31, 16], ["caremix-pig-finisher", 23, 13]] as const) {
      const source = ingredientDefaultPrice(id);
      assert.ok(source, id);
      assert.equal(source.sourceScope, "zimbabwe", id);
      assert.equal(source.planningMultiplier, undefined, id);
      assert.match(source.sourceLabel, /Supplier quotation/, id);
      assert.ok(Math.abs(ingredientDefaultPricePerKg(id)! - bagUsd / bagKg) < 1e-5, id);
    }
  });

  test("uses Alibaba listing midpoints multiplied by two", () => {
    for (const [ingredientId, expected] of Object.entries(expectedPremixPlanningPrices)) {
      const source = ingredientDefaultPrice(ingredientId);
      assert.ok(source, ingredientId);
      assert.equal(source.planningMultiplier, 2, ingredientId);
      assert.match(source.sourceLabel, /Alibaba/, ingredientId);
      assert.equal(
        ingredientDefaultPlanningPricePerTonne(ingredientId),
        expected,
        ingredientId,
      );
      assert.equal(expected, source.usdPerTonne * 2, ingredientId);
    }
  });
});

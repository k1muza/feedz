import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  ingredientDefaultPlanningPricePerTonne,
  ingredientDefaultPrice,
} from "./feed-ingredient-prices";
import { FEEDSPORT_RESEARCH_PREMIXES } from "./research-premixes";

const expectedPremixPlanningPrices: Record<string, number> = {
  "cj-s174-boar-premix": 5100,
  "sustar-glypro-x911": 7500,
  "sustar-glypro-x912": 5000,
  "sustar-glypro-x913": 2560,
  "sustar-glypro-x812": 5000,
  "sustar-glypro-x811": 3300,
};

describe("commercial premix planning prices", () => {
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

describe("FeedSport premix planning prices", () => {
  test("provides an internal default for every named FeedSport premix", () => {
    const expected: Record<string, number> = {
      "feedsport-research-piglet-vtm-1pct": 2500,
      "feedsport-growerpro-research-2023": 5000,
      "feedsport-finisherpro-phase1-research-2023": 5000,
      "feedsport-finisherpro-phase2-research-2023": 5000,
    };

    assert.deepEqual(
      FEEDSPORT_RESEARCH_PREMIXES.map((premix) => premix.id).sort(),
      Object.keys(expected).sort(),
    );

    for (const premix of FEEDSPORT_RESEARCH_PREMIXES) {
      const source = ingredientDefaultPrice(premix.id);
      assert.ok(source, premix.id);
      assert.equal(source.market, "FeedSport internal planning, Zimbabwe", premix.id);
      assert.match(source.sourceLabel, /FeedSport planning assumption/, premix.id);
      assert.equal(source.sourceUrl, undefined, premix.id);
      assert.equal(
        ingredientDefaultPlanningPricePerTonne(premix.id),
        expected[premix.id],
        premix.id,
      );
    }
  });
});

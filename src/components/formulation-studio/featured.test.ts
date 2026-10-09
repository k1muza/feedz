import assert from "node:assert/strict";
import { test } from "node:test";

import { mergeIngredientPrices } from "@/lib/feed-ingredient-prices";
import { FEED_PROGRAMMES } from "@/lib/feed-programmes";
import { INGREDIENT_LIBRARY } from "@/lib/ingredient-nutrients";

import { FEATURED } from "./featured";

// Featured formulations are written against real programme, phase and
// ingredient ids. One that no longer resolves would quietly vanish from Home.

test("featured formulations point at loaded programmes and phases", () => {
  for (const f of FEATURED) {
    const programme = FEED_PROGRAMMES.find((p) => p.id === f.snap.programmeId);
    assert.ok(programme, f.id + ": unknown programme " + f.snap.programmeId);
    assert.ok(programme.phases.some((ph) => ph.id === f.snap.phaseId), f.id + ": unknown phase " + f.snap.phaseId);
  }
});

test("featured formulations use catalogue ingredients with a planning price", () => {
  const known = new Set(INGREDIENT_LIBRARY.ingredients.map((g) => g.id));
  const priced = new Set(mergeIngredientPrices([]).map((p) => p.ingredientId));
  for (const f of FEATURED)
    for (const id of Object.keys(f.snap.pool)) {
      assert.ok(known.has(id), f.id + ": unknown ingredient " + id);
      assert.ok(priced.has(id), f.id + ": no planning price for " + id);
    }
});

test("featured formulation ids are unique", () => {
  assert.equal(new Set(FEATURED.map((f) => f.id)).size, FEATURED.length);
});

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { restoreIngredientPool } from "./ingredient-pool-transition";

describe("programme switching from a manufacturer-locked recipe", () => {
  const cjRows = [
    { ingredientId: "corn-yellow-dent", price: "0.24", min: "", max: "", lockedPct: "64.3" },
    { ingredientId: "fish-meal-54", price: "0.71", min: "", max: "", lockedPct: "4" },
  ];

  test("on first visit to mature-boar, leaving for grower keeps starting ingredients but unlocks CJ ratios", () => {
    const restored = restoreIngredientPool(null, cjRows);
    assert.equal(restored.mode, "automatic");
    assert.equal(restored.rows.length, 2);
    assert.deepEqual(restored.rows.map((row) => row.lockedPct), ["", ""]);
    assert.equal(restored.rows[0].price, "0.24");
    assert.equal(cjRows[0].lockedPct, "64.3", "Original CJ ration remains unchanged");
  });

  test("preserves farmer's selected basket, prices and bounds through a boar detour", () => {
    const selected = {
      mode: "selected" as const,
      rows: [{ ingredientId: "wheat-bran", price: "0.18", min: "5", max: "20", lockedPct: "" }],
    };
    const restored = restoreIngredientPool(selected, cjRows);
    assert.deepEqual(restored, selected);
    assert.notStrictEqual(restored.rows, selected.rows);
  });
});

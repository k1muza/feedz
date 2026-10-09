import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { mergeSuggestedIngredients, restoreIngredientPool } from "./ingredient-pool-transition";

describe("programme switching from a manufacturer-locked recipe", () => {
  const cjRows = [
    { ingredientId: "corn-yellow-dent", price: "0.24", min: "", max: "", lockedPct: "64.3" },
    { ingredientId: "fish-meal-54", price: "0.71", min: "", max: "", lockedPct: "4" },
  ];

  test("starting on boar then switching enables phase suggestions while retaining edited prices", () => {
    const restored = restoreIngredientPool(null, cjRows);
    assert.equal(restored.mode, "automatic");
    assert.equal(restored.rows.length, 2);
    assert.deepEqual(restored.rows.map((row) => row.lockedPct), ["", ""]);
    assert.equal(restored.rows[0].price, "0.24");
    assert.equal(restored.rows[1].price, "0.71");
    assert.equal(cjRows[0].lockedPct, "64.3", "Original CJ ration remains unchanged");
  });

  test("new grower candidates replace CJ's restricted basket while retaining shared ingredient price edits", () => {
    const original = restoreIngredientPool(null, cjRows.map((row, index) => ({ ...row, key: index })));
    const ids = [
      "corn-yellow-dent", "soybean-meal-solvent-extracted", "wheat-bran",
      "limestone-ground", "dicalcium-phosphate", "sodium-chloride", "l-lysine-hcl",
    ];
    const result = mergeSuggestedIngredients(ids, original.rows, () => "0.55");
    assert.deepEqual(result.map((row) => row.ingredientId), ids);
    assert.equal(result[0].price, "0.24", "keep edited maize price");
    assert.equal(result.find((row) => row.ingredientId === "limestone-ground")?.price, "0.55");
    assert.equal(result.find((row) => row.ingredientId === "dicalcium-phosphate")?.price, "0.55");
    assert.equal(result.find((row) => row.ingredientId === "sodium-chloride")?.price, "0.55");
    assert.equal(result.find((row) => row.ingredientId === "l-lysine-hcl")?.price, "0.55");
    assert.ok(result.every((row) => row.lockedPct === ""));
    assert.ok(!result.some((row) => row.ingredientId === "fish-meal-54"));
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

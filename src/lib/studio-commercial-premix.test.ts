import assert from "node:assert/strict";
import { test } from "node:test";
import { poolWithProgrammePremix } from "./studio-commercial-premix";

test("Studio replaces premix by animal class without inheriting old SKU or price", () => {
  const grower = poolWithProgrammePremix({ "corn-yellow-dent": { role: "available" } }, "grow-finish-pig");
  assert.equal(grower["sustar-glypro-x912"]?.fixed, 0.2);
  const broiler = poolWithProgrammePremix(grower, "broiler-standard");
  assert.equal(broiler["sustar-glypro-x912"], undefined);
  assert.equal(broiler["sustar-glypro-x812"]?.fixed, 0.1);
  const piglet = poolWithProgrammePremix(broiler, "nursery-pig");
  assert.equal(piglet["sustar-glypro-x911"]?.fixed, 0.2);
  assert.equal(piglet["sustar-glypro-x812"], undefined);
  const sow = poolWithProgrammePremix(piglet, "gestating-gilt-sow");
  assert.equal(sow["sustar-glypro-x913"]?.fixed, 0.2);
});

test("Studio mature-boar receives only CJ's manufacturer-locked recipe", () => {
  const result = poolWithProgrammePremix({ "sustar-glypro-x913": { role: "fixed", fixed: 0.2 } }, "mature-boar");
  assert.equal(result["sustar-glypro-x913"], undefined);
  assert.deepEqual(
    Object.entries(result).map(([id, item]) => [id, item.fixed]),
    [
      ["corn-yellow-dent", 64.3], ["wheat-bran", 12],
      ["soybean-meal-solvent-extracted", 15.7], ["fish-meal-54", 4],
      ["cj-s174-boar-premix", 4],
    ],
  );
  assert.ok(Object.values(result).every((item) => item.role === "fixed"));
});

test("Studio preserves an existing quoted price only for the same product", () => {
  const pool = poolWithProgrammePremix({
    "sustar-glypro-x912": { role: "fixed", fixed: 0.2, price: 1500 },
    "corn-yellow-dent": { role: "available", price: 270 },
  }, "grow-finish-pig-high-performance");
  assert.equal(pool["sustar-glypro-x912"].price, 1500);
  const switched = poolWithProgrammePremix(pool, "broiler-standard");
  assert.equal(switched["sustar-glypro-x812"].price, undefined);
  assert.equal(switched["corn-yellow-dent"].price, 270);
});

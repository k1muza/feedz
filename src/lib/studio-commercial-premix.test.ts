import assert from "node:assert/strict";
import { test } from "node:test";
import { canAddStudioIngredient, selectStudioIngredient, studioPremixProblems, poolWithCarriedPremixSelection, poolWithProgrammePremix, poolWithPremixPrice, poolWithPremixSelection, poolWithoutPremix } from "./studio-commercial-premix";

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

test("leaving CJ's boar programme clears all former manufacturer locks and offers complete basal candidates", () => {
  const boar = poolWithProgrammePremix({}, "mature-boar");
  boar["corn-yellow-dent"].price = 260;
  const grower = poolWithProgrammePremix(boar, "grow-finish-pig");
  assert.equal(grower["cj-s174-boar-premix"], undefined);
  assert.equal(grower["sustar-glypro-x912"]?.fixed, 0.2);
  assert.equal(grower["corn-yellow-dent"].role, "available");
  assert.equal(grower["corn-yellow-dent"].fixed, undefined);
  assert.equal(grower["corn-yellow-dent"].price, 260);
  for (const id of ["limestone-ground", "dicalcium-phosphate", "sodium-chloride", "l-lysine-hcl"]) {
    assert.equal(grower[id]?.role, "available", id);
  }
});

test("premixes are first-class selectable ingredients, with species/programme eligibility", () => {
  assert.equal(canAddStudioIngredient("sustar-glypro-x912", "grow-finish-pig"), true);
  assert.equal(canAddStudioIngredient("sustar-glypro-x911", "grow-finish-pig"), false);
  assert.equal(canAddStudioIngredient("aeci-v1736-pig-weaner-premix", "nursery-pig"), true);
  assert.equal(canAddStudioIngredient("aeci-v1736-pig-weaner-premix", "grow-finish-pig"), false);
  assert.equal(canAddStudioIngredient("sustar-glypro-x812", "grow-finish-pig"), false);
  assert.equal(canAddStudioIngredient("cj-s174-boar-premix", "mature-boar"), true);
  assert.equal(canAddStudioIngredient("sustar-glypro-x812", "broiler-standard"), true);
  assert.equal(canAddStudioIngredient("corn-yellow-dent", "grow-finish-pig"), true);
  assert.throws(() => selectStudioIngredient({}, "sustar-glypro-x812", "grow-finish-pig"), /not eligible/);
});

test("AECI V1736 can be explicitly simulated for grower pigs but not finishers", () => {
  const id = "aeci-v1736-pig-weaner-premix";
  const grower = "br2024-5-43-63-91d-26-47kg";
  const finisher = "br2024-5-43-91-119d-47-74kg";
  const pool = { "corn-yellow-dent": { role: "available" as const, price: 270 } };
  assert.equal(canAddStudioIngredient(id, "grow-finish-pig", pool), false);
  assert.equal(canAddStudioIngredient(id, "grow-finish-pig", pool, grower), true);
  assert.equal(canAddStudioIngredient(id, "grow-finish-pig", pool, finisher), false);
  const selection = poolWithPremixSelection(pool, "grow-finish-pig", id, grower);
  assert.equal(selection[id]?.role, "fixed");
  assert.equal(selection[id]?.fixed, 1);
  assert.equal(selection["corn-yellow-dent"]?.price, 270);
  assert.deepEqual(studioPremixProblems(selection, "grow-finish-pig", grower), []);
  assert.ok(studioPremixProblems(selection, "grow-finish-pig", finisher).some((x) => /not suitable/.test(x)));
  assert.throws(() => poolWithPremixSelection(pool, "grow-finish-pig", id, finisher), /not eligible/);
  const moved = poolWithCarriedPremixSelection(pool, selection, "grow-finish-pig", finisher);
  assert.equal(moved[id], undefined, "A weaner-labelled premix cannot carry into finishing phases");
  assert.equal(moved["sustar-glypro-x912"], undefined, "Do not silently replace the farmer's selection");
  const defaultGrower = poolWithProgrammePremix({}, "grow-finish-pig", undefined, grower);
  assert.equal(defaultGrower["sustar-glypro-x912"]?.fixed, 0.2,
    "Manufacturer-approved programme default is unchanged");
});

test("choosing an eligible premix sets manufacturer dose without discarding cereal prices", () => {
  const maize = { role: "available" as const, price: 265 };
  const choice = selectStudioIngredient(
    { "corn-yellow-dent": maize, "sustar-glypro-x912": { role: "available" } },
    "sustar-glypro-x912", "grow-finish-pig",
  );
  assert.equal(choice["sustar-glypro-x912"].role, "fixed");
  assert.equal(choice["sustar-glypro-x912"].fixed, 0.2);
  assert.equal(choice["corn-yellow-dent"].price, 265);
  assert.deepEqual(studioPremixProblems(choice, "grow-finish-pig"), []);
});

test("Studio's explicit premix selector can choose an eligible product or no premix", () => {
  const base = { "corn-yellow-dent": { role: "available" as const, price: 265 } };
  const chosen = poolWithPremixSelection(base, "grow-finish-pig", "sustar-glypro-x912");
  assert.equal(chosen["sustar-glypro-x912"]?.fixed, 0.2);
  assert.equal(chosen["corn-yellow-dent"]?.price, 265);

  const none = poolWithPremixSelection(chosen, "grow-finish-pig", null);
  assert.equal(none["sustar-glypro-x912"], undefined);
  assert.equal(none["corn-yellow-dent"]?.price, 265);
  assert.throws(
    () => poolWithPremixSelection(base, "grow-finish-pig", "sustar-glypro-x812"),
    /not eligible/,
  );

  const aeci = poolWithPremixSelection(base, "nursery-pig", "aeci-v1736-pig-weaner-premix");
  assert.equal(aeci["aeci-v1736-pig-weaner-premix"]?.fixed, 1);
  assert.equal(aeci["sustar-glypro-x911"], undefined);

  const replacementIngredients = { "wheat-bran": { role: "available" as const } };
  const carried = poolWithCarriedPremixSelection(replacementIngredients, chosen, "grow-finish-pig");
  assert.equal(carried["sustar-glypro-x912"]?.fixed, 0.2);
  assert.equal(carried["wheat-bran"]?.role, "available");
  const carriedNone = poolWithCarriedPremixSelection(replacementIngredients, none, "grow-finish-pig");
  assert.equal(carriedNone["sustar-glypro-x912"], undefined);
});

test("choosing no premix unlocks a manufacturer-restricted recipe", () => {
  const boar = poolWithProgrammePremix({}, "mature-boar");
  const none = poolWithPremixSelection(boar, "mature-boar", null);
  assert.equal(none["cj-s174-boar-premix"], undefined);
  assert.equal(none["corn-yellow-dent"]?.role, "available");
  assert.equal(none["limestone-ground"]?.role, "available");
});

test("bad saved premix choices stop in Studio before reaching HTTP 400", () => {
  const wrong = { "sustar-glypro-x812": { role: "available" as const } };
  assert.ok(studioPremixProblems(wrong, "grow-finish-pig").some((reason) => /not suitable/.test(reason)));
  const right = poolWithProgrammePremix({ "corn-yellow-dent": { role: "available" } }, "grow-finish-pig");
  assert.deepEqual(studioPremixProblems(right, "grow-finish-pig"), []);
  right["sustar-glypro-x912"].role = "available";
  assert.ok(studioPremixProblems(right, "grow-finish-pig").some((reason) => /fixed/.test(reason)));
});

test("a premix quote typed in Studio is kept at the manufacturer dose", () => {
  const pool = poolWithProgrammePremix({ "corn-yellow-dent": { role: "available" } }, "grow-finish-pig");
  const priced = poolWithPremixPrice(pool, "sustar-glypro-x912", "grow-finish-pig", 450);
  assert.equal(priced["sustar-glypro-x912"].price, 450);
  assert.equal(priced["sustar-glypro-x912"].fixed, 0.2);
  assert.equal(poolWithPremixPrice(priced, "sustar-glypro-x912", "grow-finish-pig")["sustar-glypro-x912"].price, undefined);
  assert.deepEqual(studioPremixProblems(priced, "grow-finish-pig"), []);
});

test("pricing an ineligible premix does not add the programme default beside it", () => {
  const legacy = { "sustar-glypro-x812": { role: "fixed" as const, fixed: 0.1 }, "corn-yellow-dent": { role: "available" as const } };
  const priced = poolWithPremixPrice(legacy, "sustar-glypro-x812", "grow-finish-pig", 900);
  assert.equal(priced["sustar-glypro-x812"].price, 900);
  assert.equal(priced["sustar-glypro-x912"], undefined);
  assert.ok(studioPremixProblems(priced, "grow-finish-pig").some((reason) => /not suitable/.test(reason)));
});

test("removing or unticking CJ S174 unlocks its recipe ingredients", () => {
  const boar = poolWithProgrammePremix({}, "mature-boar");
  for (const pool of [poolWithoutPremix(boar, "cj-s174-boar-premix"), poolWithoutPremix(boar, "cj-s174-boar-premix", true)]) {
    assert.ok(Object.entries(pool).every(([id, row]) => id === "cj-s174-boar-premix" || row.role === "available"), JSON.stringify(pool));
    assert.equal(pool["limestone-ground"]?.role, "available");
  }
  assert.equal(poolWithoutPremix(boar, "cj-s174-boar-premix")["cj-s174-boar-premix"], undefined);
  const unticked = poolWithoutPremix(boar, "cj-s174-boar-premix", true)["cj-s174-boar-premix"];
  assert.equal(unticked.role, "excluded");
  assert.equal(unticked.was, "fixed");
  assert.equal(canAddStudioIngredient("soybean-meal-solvent-extracted", "mature-boar", poolWithoutPremix(boar, "cj-s174-boar-premix")), true);
});

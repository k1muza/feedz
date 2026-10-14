import assert from "node:assert/strict";
import { test } from "node:test";
import { canAddStudioIngredient, selectStudioIngredient, studioPremixProblems, poolWithCarriedPremixSelection, poolWithProgrammePremix, poolWithPremixPrice, poolWithPremixSelection, poolWithoutPremix, studioPremixConflict } from "./studio-commercial-premix";

test("Studio replaces premix by animal class without inheriting old SKU or price", () => {
  const grower = poolWithProgrammePremix({ "corn-yellow-dent": { role: "available" } }, "grow-finish-pig");
  assert.equal(grower["caremix-pig-grower"]?.fixed, 3.2);
  const broiler = poolWithProgrammePremix(grower, "broiler-standard");
  assert.equal(broiler["caremix-pig-grower"], undefined);
  assert.equal(broiler["sustar-glypro-x812"]?.fixed, 0.1);
  const piglet = poolWithProgrammePremix(broiler, "nursery-pig");
  assert.equal(piglet["caremix-pig-weaner"]?.fixed, 2.8);
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
  assert.equal(grower["caremix-pig-grower"]?.fixed, 3.2);
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
  assert.equal(canAddStudioIngredient("caremix-pig-weaner", "nursery-pig"), true);
  assert.equal(canAddStudioIngredient("caremix-pig-weaner", "grow-finish-pig"), false);
  assert.equal(canAddStudioIngredient("sustar-glypro-x812", "grow-finish-pig"), false);
  assert.equal(canAddStudioIngredient("cj-s174-boar-premix", "mature-boar"), true);
  assert.equal(canAddStudioIngredient("sustar-glypro-x812", "broiler-standard"), true);
  assert.equal(canAddStudioIngredient("corn-yellow-dent", "grow-finish-pig"), true);
  assert.throws(() => selectStudioIngredient({}, "sustar-glypro-x812", "grow-finish-pig"), /not eligible/);
});

test("Caremix grower and finisher do not cross-apply between phases", () => {
  const grower = "br2024-5-43-63-91d-26-47kg";
  const finisher = "br2024-5-43-119-147d-74-103kg";
  const base = { "corn-yellow-dent": { role: "available" as const, price: 270 } };
  const growing = poolWithPremixSelection(base, "grow-finish-pig", "caremix-pig-grower", grower);
  assert.equal(growing["caremix-pig-grower"]?.fixed, 3.2);
  assert.deepEqual(studioPremixProblems(growing, "grow-finish-pig", grower), []);
  assert.equal(canAddStudioIngredient("caremix-pig-grower", "grow-finish-pig", base, finisher), false);
  assert.ok(studioPremixProblems(growing, "grow-finish-pig", finisher).some((x) => /not suitable/.test(x)));
  const finishing = poolWithPremixSelection(growing, "grow-finish-pig", "caremix-pig-finisher", finisher);
  assert.equal(finishing["caremix-pig-grower"], undefined);
  assert.equal(finishing["caremix-pig-finisher"]?.fixed, 2.6);
  assert.deepEqual(studioPremixProblems(finishing, "grow-finish-pig", finisher), []);
  assert.equal(canAddStudioIngredient("caremix-pig-finisher", "grow-finish-pig", base, grower), false);
  const moved = poolWithCarriedPremixSelection(base, growing, "grow-finish-pig", finisher);
  assert.deepEqual(moved["caremix-pig-grower"], growing["caremix-pig-grower"], "Wrong stage is kept for the farmer to resolve");
  assert.equal(moved["caremix-pig-finisher"], undefined, "Explicit selection is not silently replaced");
  assert.equal(poolWithProgrammePremix({}, "grow-finish-pig", undefined, grower)["caremix-pig-grower"]?.fixed, 3.2);
  assert.equal(poolWithProgrammePremix({}, "grow-finish-pig", undefined, finisher)["caremix-pig-finisher"]?.fixed, 2.6);
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

  const caremix = poolWithPremixSelection(base, "nursery-pig", "caremix-pig-weaner");
  assert.equal(caremix["caremix-pig-weaner"]?.fixed, 2.8);
  assert.equal(caremix["sustar-glypro-x911"], undefined);

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
  right["caremix-pig-grower"].role = "available";
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

// Stage and programme changes keep the farmer's premix: an eligible one with its
// dose and price, an ineligible one unchanged until the farmer decides.
const GROWER_26_47 = "br2024-5-43-63-91d-26-47kg";
const FINISHER_103_131 = "br2024-5-43-147-175d-103-131kg";

test("an eligible premix keeps its manufacturer dose and price across a stage change", () => {
  const grower = poolWithPremixPrice(
    poolWithPremixSelection({ "corn-yellow-dent": { role: "available", price: 270 } }, "grow-finish-pig", "sustar-glypro-x912", GROWER_26_47),
    "sustar-glypro-x912", "grow-finish-pig", 4200, GROWER_26_47,
  );
  const finisher = poolWithCarriedPremixSelection(grower, grower, "grow-finish-pig", FINISHER_103_131);
  assert.deepEqual(finisher["sustar-glypro-x912"], { role: "fixed", fixed: 0.2, price: 4200 });
  assert.equal(finisher["corn-yellow-dent"].price, 270);
  assert.equal(Object.keys(finisher).filter((id) => id.startsWith("caremix")).length, 0, "no default added beside it");
  assert.equal(studioPremixConflict(finisher, "grow-finish-pig", FINISHER_103_131), null);
  assert.deepEqual(studioPremixProblems(finisher, "grow-finish-pig", FINISHER_103_131), []);
});

test("Caremix Pig Grower is kept, with dose and price, and reported when moved to a finisher stage", () => {
  const grower = poolWithPremixPrice(
    poolWithPremixSelection({ "corn-yellow-dent": { role: "available", price: 270 } }, "grow-finish-pig", "caremix-pig-grower", GROWER_26_47),
    "caremix-pig-grower", "grow-finish-pig", 1450, GROWER_26_47,
  );
  assert.deepEqual(grower["caremix-pig-grower"], { role: "fixed", fixed: 3.2, price: 1450 });
  const finisher = poolWithCarriedPremixSelection(grower, grower, "grow-finish-pig", FINISHER_103_131);
  assert.deepEqual(finisher["caremix-pig-grower"], { role: "fixed", fixed: 3.2, price: 1450 }, "never silently removed");
  assert.equal(finisher["caremix-pig-finisher"], undefined, "never silently substituted");
  const conflict = studioPremixConflict(finisher, "grow-finish-pig", FINISHER_103_131);
  assert.equal(conflict?.premix.id, "caremix-pig-grower");
  assert.match(conflict!.reason, /grower phases only.*finisher phase/);
  assert.equal(conflict!.eligible[0].id, "caremix-pig-finisher", "the phase default is offered first");
  assert.ok(conflict!.eligible.every((p) => p.id !== "caremix-pig-grower"));
  // The engine still refuses to formulate it, so a run cannot slip through.
  assert.ok(studioPremixProblems(finisher, "grow-finish-pig", FINISHER_103_131).some((x) => /not suitable/.test(x)));
  // Moving back to a grower stage needs no decision and keeps the price.
  const back = poolWithCarriedPremixSelection(finisher, finisher, "grow-finish-pig", GROWER_26_47);
  assert.deepEqual(back["caremix-pig-grower"], { role: "fixed", fixed: 3.2, price: 1450 });
  assert.equal(studioPremixConflict(back, "grow-finish-pig", GROWER_26_47), null);
});

test("a programme change keeps an ineligible premix for the farmer to resolve", () => {
  const pig = poolWithPremixSelection({ "corn-yellow-dent": { role: "available" } }, "grow-finish-pig", "caremix-pig-grower", GROWER_26_47);
  const broiler = poolWithCarriedPremixSelection(pig, pig, "broiler-standard");
  assert.equal(broiler["caremix-pig-grower"]?.fixed, 3.2);
  assert.equal(broiler["sustar-glypro-x812"], undefined);
  assert.match(studioPremixConflict(broiler, "broiler-standard")!.reason, /not this programme/);
  // Without a premix, a programme change does not add one either.
  const none = poolWithCarriedPremixSelection({ "corn-yellow-dent": { role: "available" } }, { "corn-yellow-dent": { role: "available" } }, "broiler-standard");
  assert.deepEqual(Object.keys(none), ["corn-yellow-dent"]);
});

test("the farmer resolves a stage conflict by replacing the premix or explicitly continuing without one", () => {
  const grower = poolWithPremixSelection({ "corn-yellow-dent": { role: "available", price: 270 } }, "grow-finish-pig", "caremix-pig-grower", GROWER_26_47);
  const finisher = poolWithCarriedPremixSelection(grower, grower, "grow-finish-pig", FINISHER_103_131);

  const replaced = poolWithPremixSelection(finisher, "grow-finish-pig", "caremix-pig-finisher", FINISHER_103_131);
  assert.equal(replaced["caremix-pig-grower"], undefined);
  assert.deepEqual(replaced["caremix-pig-finisher"], { role: "fixed", fixed: 2.6 }, "the old SKU's price is not inherited");
  assert.equal(studioPremixConflict(replaced, "grow-finish-pig", FINISHER_103_131), null);

  const without = poolWithoutPremix(finisher, "caremix-pig-grower");
  assert.deepEqual(without, { "corn-yellow-dent": { role: "available", price: 270 } });
  assert.equal(studioPremixConflict(without, "grow-finish-pig", FINISHER_103_131), null);
  assert.deepEqual(studioPremixProblems(without, "grow-finish-pig", FINISHER_103_131), []);
  // An explicit no-premix choice survives later stage changes.
  assert.deepEqual(poolWithCarriedPremixSelection(without, without, "grow-finish-pig", GROWER_26_47), without);
});

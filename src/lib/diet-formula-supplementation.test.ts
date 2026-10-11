import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { commercialPremixById } from "./commercial-premixes";
import { analyzeDiet } from "./diet-formula";
import {
  INGREDIENT_LIBRARY,
  ingredientLibraryWithCommercialPremixes,
  type IngredientLibrary,
} from "./ingredient-nutrients";

const cornId = "corn-yellow-dent";
const soybeanId = "soybean-meal-solvent-extracted";
// Synthetic fixture for independent numeric accounting tests; AECI V1736
// now contributes its user-confirmed per-tonne finished-feed label minima.
const aeciPremix = commercialPremixById("aeci-v1736-pig-weaner-premix");
if (!aeciPremix) throw new Error("Missing AECI V1736 premix record");

const weanerPremixId = "test-known-micronutrient-premix";
const knownPremix = {
  ...aeciPremix,
  id: weanerPremixId,
  name: "Synthetic known-micronutrient premix (test fixture only)",
  guaranteedMinimumAsFed: {
    sourceUrl: "https://example.com/test-fixture-only",
    vitamins: { vitaminKMgKg: 300 },
    traceMineralsPpm: { copper: 1_000 },
  },
};
const library = ingredientLibraryWithCommercialPremixes([knownPremix], INGREDIENT_LIBRARY);

function near(actual: number, expected: number): void {
  assert.ok(Math.abs(actual - expected) < 1e-9, `Expected ${actual} to equal ${expected}`);
}

describe("supplemented micronutrients versus total dietary micronutrients", () => {
  test("maize and soybean meal do not count as supplemented copper even when their copper is known", () => {
    const analysis = analyzeDiet({
      ingredients: [
        { ingredientId: cornId, inclusionPct: 60 },
        { ingredientId: soybeanId, inclusionPct: 40 },
      ],
    });
    const naturalCopper = 0.6 * 2.23 + 0.4 * 16.9;
    near(analysis.traceMineralsPpm.copper.value, naturalCopper);
    assert.equal(analysis.traceMineralsPpm.copper.complete, true);
    near(analysis.supplementation.traceMineralsPpm.copper.value, 0);
    assert.equal(analysis.supplementation.traceMineralsPpm.copper.complete, true);
    near(analysis.supplementation.vitamins.vitaminKMgKg.value, 0);
    assert.equal(analysis.supplementation.vitamins.vitaminKMgKg.complete, true);
  });

  test("synthetic known premix supplies 10 ppm copper and 3 mg/kg vitamin K3, not basal contributions", () => {
    const analysis = analyzeDiet({
      ingredients: [
        { ingredientId: cornId, inclusionPct: 59 },
        { ingredientId: soybeanId, inclusionPct: 40 },
        { ingredientId: weanerPremixId, inclusionPct: 1 },
      ],
    }, [], library);

    near(analysis.supplementation.traceMineralsPpm.copper.value, 10);
    near(analysis.supplementation.vitamins.vitaminKMgKg.value, 3);
    assert.equal(analysis.supplementation.traceMineralsPpm.copper.complete, true);
    assert.equal(analysis.supplementation.vitamins.vitaminKMgKg.complete, true);

    // The total-diet figure remains distinct and retains naturally present copper.
    near(analysis.traceMineralsPpm.copper.value, 10 + 0.59 * 2.23 + 0.4 * 16.9);
    assert.ok(analysis.traceMineralsPpm.copper.value > analysis.supplementation.traceMineralsPpm.copper.value);

    // Missing premix data stay unknown; a blank choline or selenium declaration
    // must not become an assumed zero or a confirmed pass.
    assert.equal(analysis.supplementation.vitamins.totalCholineMgKg.complete, false);
    assert.ok(analysis.supplementation.vitamins.totalCholineMgKg.missingIngredientIds.includes(weanerPremixId));
    assert.equal(analysis.supplementation.traceMineralsPpm.selenium.complete, false);
    assert.ok(analysis.supplementation.traceMineralsPpm.selenium.missingIngredientIds.includes(weanerPremixId));
  });

  test("AECI V1736 per-tonne label minima are credited at 10 kg/t", () => {
    const actualLibrary = ingredientLibraryWithCommercialPremixes([aeciPremix], INGREDIENT_LIBRARY);
    const analysis = analyzeDiet({
      ingredients: [
        { ingredientId: cornId, inclusionPct: 59 },
        { ingredientId: soybeanId, inclusionPct: 40 },
        { ingredientId: aeciPremix.id, inclusionPct: 1 },
      ],
    }, [], actualLibrary);
    near(analysis.supplementation.vitamins.vitaminAIuKg.value, 5_000);
    near(analysis.supplementation.vitamins.vitaminDIuKg.value, 2_000);
    near(analysis.supplementation.vitamins.vitaminEIuKg.value, 10);
    near(analysis.supplementation.vitamins.vitaminKMgKg.value, 0.3);
    near(analysis.supplementation.vitamins.vitaminB1MgKg.value, 1.5);
    near(analysis.supplementation.vitamins.riboflavinMgKg.value, 3);
    near(analysis.supplementation.vitamins.vitaminB6MgKg.value, 1);
    near(analysis.supplementation.vitamins.vitaminB12McgKg.value, 15);
    near(analysis.supplementation.vitamins.niacinMgKg.value, 15);
    near(analysis.supplementation.vitamins.folicAcidMgKg.value, 0.1);
    near(analysis.supplementation.traceMineralsPpm.zinc.value, 30);
    near(analysis.supplementation.traceMineralsPpm.manganese.value, 15);
    near(analysis.supplementation.traceMineralsPpm.iron.value, 25);
    near(analysis.supplementation.traceMineralsPpm.copper.value, 1);
    near(analysis.supplementation.traceMineralsPpm.iodine.value, 0.3);
    for (const checked of [
      analysis.supplementation.vitamins.vitaminAIuKg,
      analysis.supplementation.vitamins.vitaminDIuKg,
      analysis.supplementation.vitamins.vitaminEIuKg,
      analysis.supplementation.vitamins.vitaminKMgKg,
      analysis.supplementation.vitamins.vitaminB1MgKg,
      analysis.supplementation.vitamins.riboflavinMgKg,
      analysis.supplementation.vitamins.vitaminB6MgKg,
      analysis.supplementation.vitamins.vitaminB12McgKg,
      analysis.supplementation.vitamins.niacinMgKg,
      analysis.supplementation.vitamins.folicAcidMgKg,
      analysis.supplementation.traceMineralsPpm.zinc,
      analysis.supplementation.traceMineralsPpm.manganese,
      analysis.supplementation.traceMineralsPpm.iron,
      analysis.supplementation.traceMineralsPpm.copper,
      analysis.supplementation.traceMineralsPpm.iodine,
    ]) {
      assert.equal(checked.complete, true);
      assert.deepEqual(checked.missingIngredientIds, []);
    }
    for (const genuinelyUnknown of [
      analysis.supplementation.vitamins.totalCholineMgKg,
      analysis.supplementation.vitamins.biotinMgKg,
      analysis.supplementation.vitamins.pantothenicAcidMgKg,
      analysis.supplementation.traceMineralsPpm.selenium,
    ]) {
      assert.equal(genuinelyUnknown.complete, false);
      assert.ok(genuinelyUnknown.missingIngredientIds.includes(aeciPremix.id));
    }
  });

  test("a separately added mineral source with a declared trace nutrient still counts as supplementation", () => {
    const template = INGREDIENT_LIBRARY.ingredients.find((row) => row.id === "calcium-carbonate");
    if (!template) throw new Error("Missing mineral fixture");

    // Deliberately synthetic mineral source for testing category accounting only.
    const copperMineral = {
      ...template,
      id: "test-standalone-copper-mineral",
      name: "Test standalone mineral supplement",
      traceMineralsPpm: { copper: 1_000 },
    };
    const withStandaloneMineral: IngredientLibrary = {
      ...library,
      ingredients: [...library.ingredients, copperMineral],
    };
    const analysis = analyzeDiet({
      ingredients: [
        { ingredientId: cornId, inclusionPct: 58.5 },
        { ingredientId: soybeanId, inclusionPct: 40 },
        { ingredientId: weanerPremixId, inclusionPct: 1 },
        { ingredientId: copperMineral.id, inclusionPct: 0.5 },
      ],
    }, [], withStandaloneMineral);

    near(analysis.supplementation.traceMineralsPpm.copper.value, 15); // 10 from premix + 5 from mineral
    near(analysis.supplementation.vitamins.vitaminKMgKg.value, 3);
    near(analysis.traceMineralsPpm.copper.value, 15 + 0.585 * 2.23 + 0.4 * 16.9);
    assert.equal(analysis.supplementation.traceMineralsPpm.copper.complete, true);
  });

  test("declared basal vitamin concentrations contribute to total vitamins, not supplemented vitamins", () => {
    const corn = INGREDIENT_LIBRARY.ingredients.find((row) => row.id === cornId);
    if (!corn) throw new Error("Missing corn fixture");
    const testLibrary: IngredientLibrary = {
      ...INGREDIENT_LIBRARY,
      ingredients: [
        ...INGREDIENT_LIBRARY.ingredients.filter((row) => row.id !== cornId),
        {
          ...corn,
          // Synthetic known basal vitamin value, not a claim about actual maize.
          vitamins: { ...corn.vitamins, vitaminKMgKg: 12 },
        },
      ],
    };
    const analysis = analyzeDiet({ ingredients: [{ ingredientId: cornId, inclusionPct: 100 }] }, [], testLibrary);
    near(analysis.vitamins.vitaminKMgKg.value, 12);
    near(analysis.supplementation.vitamins.vitaminKMgKg.value, 0);
    assert.equal(analysis.supplementation.vitamins.vitaminKMgKg.complete, true);
  });
});

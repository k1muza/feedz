import assert from "node:assert/strict";
import test from "node:test";

import {
  INGREDIENT_LIBRARY,
  INGREDIENT_LIBRARY_SOURCE,
  ingredientLibraryForSpecies,
  ingredientLibraryWithCustomPremixes,
  loadIngredientLibrarySource,
} from "./ingredient-nutrients";

test("ingredient library is the single canonical ingredient dataset", () => {
  assert.equal(INGREDIENT_LIBRARY_SOURCE.schemaVersion, 2);
  assert.equal(INGREDIENT_LIBRARY_SOURCE.ingredients.length, 113);
  assert.equal(INGREDIENT_LIBRARY.ingredients.length, 113);

  const ids = INGREDIENT_LIBRARY_SOURCE.ingredients.map((ingredient) => ingredient.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("species nutrition lives under the canonical ingredient record", () => {
  const maize = INGREDIENT_LIBRARY_SOURCE.ingredients.find(
    (ingredient) => ingredient.id === "corn-yellow-dent",
  );
  assert.ok(maize);

  assert.ok(maize.nutrition.swine);
  assert.ok(maize.nutrition.poultry);
  assert.equal(maize.nutrition.swine.energy.metabolizableKcalKg, 3360);
  assert.equal(maize.nutrition.poultry.energy.metabolizableKcalKg, 3364);
});

test("poultry library materializes only ingredients with poultry profiles", () => {
  const poultry = ingredientLibraryForSpecies("poultry");
  assert.equal(poultry.ingredients.length, 102);
  assert.ok(poultry.ingredients.every((ingredient) => ingredient.species === "poultry"));
});

test("Brazilian source tables remain represented in the master library", () => {
  const counts = new Map<string, number>();
  for (const ingredient of INGREDIENT_LIBRARY_SOURCE.ingredients) {
    const table = ingredient.provenance.sourceTable ?? "unknown";
    counts.set(table, (counts.get(table) ?? 0) + 1);
  }

  assert.equal(counts.get("Table 1.01"), 102);
  assert.equal(counts.get("Table 1.09"), 6);
  assert.equal(counts.get("Table 1.10"), 5);
});


test("library loader rejects duplicate ingredient IDs", () => {
  const duplicate = structuredClone(INGREDIENT_LIBRARY_SOURCE);
  duplicate.ingredients.push(structuredClone(duplicate.ingredients[0]));

  assert.throws(
    () => loadIngredientLibrarySource(duplicate),
    /Duplicate IDs in FeedSport ingredient library/,
  );
});

test("custom premixes are validated before reaching the optimizer", () => {
  assert.throws(
    () =>
      ingredientLibraryWithCustomPremixes(
        [
          {
            id: "bad-premix",
            name: "Bad premix",
            vitamins: { vitaminAIuKg: Number.NaN },
            traceMineralsPpm: { zinc: 100 },
          },
        ],
        INGREDIENT_LIBRARY,
      ),
    /Invalid input|nan|NaN/i,
  );
});

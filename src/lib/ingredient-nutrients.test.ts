import assert from "node:assert/strict";
import test from "node:test";
import { COMMERCIAL_PREMIXES } from "./commercial-premixes";

import {
  INGREDIENT_LIBRARY,
  INGREDIENT_LIBRARY_SOURCE,
  PREMIX_RECORDS,
  ingredientLibraryForSpecies,
  ingredientLibraryWithCustomPremixes,
  ingredientLibraryWithCommercialPremixes,
  ingredientProfileAttribution,
  nutrientValueSource,
  loadIngredientLibrarySource,
} from "./ingredient-nutrients";

test("ingredient library is the single canonical ingredient dataset", () => {
  assert.equal(INGREDIENT_LIBRARY_SOURCE.schemaVersion, 2);
  // 113 feedstuffs plus 7 manufacturer vitamin-mineral premixes.
  assert.equal(INGREDIENT_LIBRARY_SOURCE.ingredients.length, 120);
  assert.equal(INGREDIENT_LIBRARY.ingredients.length, 113);
  assert.ok(INGREDIENT_LIBRARY_SOURCE.ingredients.every((item) => item.provenance.source?.url && item.provenance.verificationStatus),
    "All canonical ingredient records must explicitly carry a source and verification status");

  const ids = INGREDIENT_LIBRARY_SOURCE.ingredients.map((ingredient) => ingredient.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("premixes live in the library but join a formulation only when selected", () => {
  const premixes = INGREDIENT_LIBRARY_SOURCE.ingredients.filter((ingredient) => ingredient.premix);
  assert.equal(premixes.length, 7);
  assert.ok(premixes.every((ingredient) => ingredient.category === "vitamin_mineral_premix"));
  assert.deepEqual(PREMIX_RECORDS.map((record) => record.id), premixes.map((ingredient) => ingredient.id));
  assert.deepEqual(COMMERCIAL_PREMIXES.map((product) => product.id), premixes.map((ingredient) => ingredient.id));
  const premixIds = new Set(premixes.map((ingredient) => ingredient.id));
  for (const library of [INGREDIENT_LIBRARY, ingredientLibraryForSpecies("poultry")]) {
    assert.ok(library.ingredients.every((ingredient) => !premixIds.has(ingredient.id)));
  }
  // Supplier premixes carry the manufacturer's citation, not the Brazilian Tables'.
  const x912 = premixes.find((ingredient) => ingredient.id === "sustar-glypro-x912")!;
  assert.equal(x912.provenance.source?.priority, "supplier");
  assert.equal(x912.provenance.verificationStatus, "manufacturer_unverified");
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
  assert.equal(poultry.ingredients.length, 113);
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


test("all canonical species ingredient profiles carry a traceable nutrition source and verification status", () => {
  for (const species of ["swine", "poultry"] as const) {
    const library = ingredientLibraryForSpecies(species);
    for (const ingredient of library.ingredients) {
      const origin = ingredientProfileAttribution(ingredient);
      assert.ok(origin.source?.url?.startsWith("https://"), ingredient.id);
      assert.ok(origin.source?.title, ingredient.id);
      assert.equal(origin.verificationStatus, "published_reference", ingredient.id);
      assert.equal(origin.species, species);
    }
  }
  const maize = INGREDIENT_LIBRARY.ingredients.find((item) => item.id === "corn-yellow-dent")!;
  const source = nutrientValueSource(maize, "composition.crudeProteinPct");
  assert.ok(source?.publisher && source.url, "Use per-nutrient source when present, otherwise the library reference");
});

test("supplier premixes retain sourced label minima without inventing digestible values", () => {
  const product = COMMERCIAL_PREMIXES.find((item) => item.id === "sustar-glypro-x912")!;
  const supplemented = ingredientLibraryWithCommercialPremixes([product], INGREDIENT_LIBRARY);
  const record = supplemented.ingredients.find((item) => item.id === product.id)!;
  const origin = ingredientProfileAttribution(record);
  assert.equal(origin.source?.publisher, product.manufacturer);
  assert.equal(origin.source?.url, product.specificationUrl);
  assert.equal(origin.verificationStatus, "manufacturer_unverified");
  assert.equal(record.vitamins.vitaminAIuKg, 28_000_000);
  assert.equal(record.traceMineralsPpm.zinc, 40_000);
  assert.equal(record.provenance.nutrientSources["vitamins.vitaminAIuKg"]?.url, product.specificationUrl);
  assert.equal(record.aminoAcids.sidPct.lysine, undefined, "No unverified supplier guarantees credited as SID");
});

test("custom premix profiles explicitly disclose unsourced user-provided nutrient data", () => {
  const supplemented = ingredientLibraryWithCustomPremixes([
    { id: "farmer-mix-01", name: "Farmer supplied", vitamins: { vitaminAIuKg: 1000 }, traceMineralsPpm: {} },
  ], INGREDIENT_LIBRARY);
  const profile = ingredientProfileAttribution(supplemented.ingredients.at(-1)!);
  assert.equal(profile.verificationStatus, "user_supplied_unverified");
  assert.equal(profile.source, null, "Do not fabricate a publisher URL for user-entered values");
  const withReference = ingredientLibraryWithCustomPremixes([
    {
      id: "farmer-supplier-mix", name: "Farmer with datasheet",
      vitamins: { vitaminAIuKg: 2400 }, traceMineralsPpm: {},
      source: {
        publisher: "User-provided supplier",
        title: "Supplier nutrient sheet (user supplied, unverified)",
        url: "https://example.com/test-data-sheet",
        basis: "as-fed",
        priority: "supplier",
      },
    },
  ], INGREDIENT_LIBRARY);
  const cited = ingredientProfileAttribution(withReference.ingredients.at(-1)!);
  assert.equal(cited.source?.url, "https://example.com/test-data-sheet");
  assert.equal(cited.verificationStatus, "user_supplied_unverified", "A citation alone is not independent verification");
});

test("cottonseed meal 38 keeps published poultry ME and copper", () => {
  const cottonseed = INGREDIENT_LIBRARY_SOURCE.ingredients.find(
    (ingredient) => ingredient.id === "cottonseed-meal-38",
  );
  assert.ok(cottonseed);

  assert.equal(cottonseed.nutrition.poultry?.energy.metabolizableKcalKg, 1951);
  assert.equal(cottonseed.nutrition.poultry?.traceMineralsPpm.copper, 10.5);
  assert.equal(cottonseed.nutrition.swine?.traceMineralsPpm.copper, 10.5);
});

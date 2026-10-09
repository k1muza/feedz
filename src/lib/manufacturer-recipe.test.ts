import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { commercialPremixById } from "./commercial-premixes";
import { feedProgrammePhaseById } from "./feed-programmes";
import { ingredientLibraryForPhase, ingredientLibraryWithCustomPremixes } from "./ingredient-nutrients";
import { assessManufacturerRecipe } from "./manufacturer-recipe";

describe("CJ S174 prescribed recipe verification limits", () => {
  test("preserves original ratios and explicitly marks missing fish-meal and CJ premix nutrients as unknown", () => {
    const premix = commercialPremixById("cj-s174-boar-premix");
    assert.ok(premix?.manufacturerRecipe);
    const phase = feedProgrammePhaseById("mature-boar", "pic-mature-boar");
    assert.ok(phase);
    const library = ingredientLibraryWithCustomPremixes(
      [{ id: premix.id, name: premix.name, vitamins: {}, traceMineralsPpm: {} }],
      ingredientLibraryForPhase(phase),
    );
    const recipe = {
      ingredients: premix.manufacturerRecipe.map(({ ingredientId, percent }) => ({
        ingredientId, inclusionPct: percent,
      })),
    };
    const result = assessManufacturerRecipe(premix, recipe, phase, "ME", library);
    assert.equal(result.status, "manufacturer_recipe");
    assert.equal(result.verification, "unverified");
    assert.deepEqual(result.recipe.ingredients, recipe.ingredients);
    assert.ok(result.incompleteRequirements.some((row) =>
      row.missingIngredientIds.includes("fish-meal-54")), "Missing fish-meal fibre must remain unknown");
    assert.ok(result.incompleteRequirements.some((row) =>
      row.missingIngredientIds.includes(premix.id)), "Incomplete CJ macro-nutrient matrix must not be counted as zero");
    assert.ok(result.incompleteRequirements.some((row) =>
      /sodium|chloride|phosphorus|energy|lysine/i.test(row.label) && row.missingIngredientIds.includes(premix.id)),
    "CJ salt, phosphorus, energy and lysine cannot be assumed absent");
    assert.ok(result.unsupportedRequirements.includes("vitamin-trace-mineral-supplementation"));
  });

  test("refuses an altered manufacturer ration", () => {
    const premix = commercialPremixById("cj-s174-boar-premix");
    assert.ok(premix?.manufacturerRecipe);
    const phase = feedProgrammePhaseById("mature-boar", "pic-mature-boar");
    assert.ok(phase);
    const library = ingredientLibraryWithCustomPremixes(
      [{ id: premix.id, name: premix.name, vitamins: {}, traceMineralsPpm: {} }],
      ingredientLibraryForPhase(phase),
    );
    const changed = premix.manufacturerRecipe.map(({ ingredientId, percent }) => ({
      ingredientId, inclusionPct: ingredientId === "corn-yellow-dent" ? percent + 1 : percent,
    }));
    assert.throws(() => assessManufacturerRecipe(premix, { ingredients: changed }, phase, "ME", library), /restricted/);
  });
});

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { commercialPremixById } from "./commercial-premixes";
import { feedProgrammePhaseById } from "./feed-programmes";
import { ingredientLibraryForPhase } from "./ingredient-nutrients";
import { assessManufacturerRecipe, buildManufacturerRecipeReport } from "./manufacturer-recipe";

describe("CJ S174 prescribed recipe verification limits", () => {
  test("preserves original ratios, keeps fish-meal gaps unknown and labels CJ's undocumented values as assumptions", () => {
    const premix = commercialPremixById("cj-s174-boar-premix");
    assert.ok(premix?.manufacturerRecipe);
    const phase = feedProgrammePhaseById("mature-boar", "pic-mature-boar");
    assert.ok(phase);
    const library = ingredientLibraryForPhase(phase);
    const recipe = {
      ingredients: premix.manufacturerRecipe.map(({ ingredientId, percent }) => ({
        ingredientId, inclusionPct: percent,
      })),
    };
    const result = assessManufacturerRecipe(premix, recipe, phase, "ME", library);
    assert.equal(result.status, "manufacturer_recipe");
    assert.deepEqual(result.recipe.ingredients, recipe.ingredients);
    assert.ok(result.incompleteRequirements.some((row) =>
      row.missingIngredientIds.includes("fish-meal-54")), "Missing fish-meal fibre must remain unknown");
    // CJ publishes total lysine and total phosphorus only: never credited as SID or digestible.
    const check = (id: string) => result.assessment.requirements.find((row) => row.id === id)!;
    assert.ok(check("sid-lysine").totalOnlyIngredientIds.includes(premix.id), "Total lysine is not SID lysine");
    assert.ok(check("sid-lysine").assumedZeroIngredientIds.includes(premix.id));
    assert.ok(!check("sid-lysine").contributions.some((row) => row.ingredientId === premix.id));
    assert.ok(check("energy-me").assumedZeroIngredientIds.includes(premix.id), "Undocumented energy is an explicit assumption");
    assert.equal(check("energy-me").data, "assumed_zero");
    // Its labelled salt minimum does contribute sodium, by molar mass.
    assert.ok(check("sodium").contributions.some((row) => row.ingredientId === premix.id));
    assert.ok(result.assessment.documentationGaps.some((gap) => gap.reason === "total_only" && gap.nutrientId === "sid-lysine"));
    assert.ok(!result.unsupportedRequirements.includes("vitamin-trace-mineral-supplementation"),
      "Supplier analysis gap must not masquerade as missing Brazilian Tables supplementation targets");
    const report = buildManufacturerRecipeReport(premix, phase, "ME", library);
    assert.equal(report.premix_analysis.status, "included");
    assert.ok(report.incomplete_requirements.every((row) => !row.missing_data_for.includes(premix.id)), "CJ gaps are labelled assumptions, not missing data");
    assert.ok(!("incompleteRequirements" in report), "No duplicate camelCase requirement arrays");
    assert.ok(!("checkedShortfalls" in report), "No duplicate camelCase shortfall arrays");
    assert.ok(!("unsupportedRequirements" in report), "No duplicate unsupported requirements");
    assert.ok(report.checked_shortfalls.every((row) => typeof row.nutrient === "string"));
    assert.equal(report.cost_per_kg, null, "No supplier price must not silently become zero");
  });

  test("refuses an altered manufacturer ration", () => {
    const premix = commercialPremixById("cj-s174-boar-premix");
    assert.ok(premix?.manufacturerRecipe);
    const phase = feedProgrammePhaseById("mature-boar", "pic-mature-boar");
    assert.ok(phase);
    const library = ingredientLibraryForPhase(phase);
    const changed = premix.manufacturerRecipe.map(({ ingredientId, percent }) => ({
      ingredientId, inclusionPct: ingredientId === "corn-yellow-dent" ? percent + 1 : percent,
    }));
    assert.throws(() => assessManufacturerRecipe(premix, { ingredients: changed }, phase, "ME", library), /restricted/);
  });
});

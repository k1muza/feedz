import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { ingredientDefaultPricePerKg } from "./feed-ingredient-prices";
import {
  formulateLeastCostDiet,
  suggestFormulationAdditions,
  suggestFormulationIngredients,
  type FormulationIngredientOption,
} from "./feed-optimizer";
import { feedProgrammeById } from "./feed-programmes";
import { ingredientLibraryForPhase } from "./ingredient-nutrients";

const priced = (ingredientId: string): FormulationIngredientOption => {
  const pricePerKg = ingredientDefaultPricePerKg(ingredientId);
  assert.notEqual(pricePerKg, undefined, `${ingredientId} has a planning price`);
  return { ingredientId, pricePerKg: pricePerKg! };
};

describe("ingredient completion suggestions", () => {
  test("the recommended additions turn the current pool into a feasible formulation", async () => {
    const programme = feedProgrammeById("grow-finish-pig");
    assert.ok(programme);
    const phase = programme.phases[0];
    const library = ingredientLibraryForPhase(phase);
    const current = [
      priced("corn-yellow-dent"),
      priced("soybean-meal-solvent-extracted"),
    ];

    const suggestion = await suggestFormulationAdditions(
      phase,
      "ME",
      current,
      library,
    );
    assert.equal(suggestion.status, "suggested");
    if (suggestion.status !== "suggested") return;
    assert.ok(suggestion.ingredientIds.length > 0);
    assert.ok(
      suggestion.ingredientIds.every(
        (id) => !current.some((option) => option.ingredientId === id),
      ),
    );

    const result = await formulateLeastCostDiet(
      phase,
      "ME",
      [
        ...current,
        ...suggestion.ingredientIds.map(priced),
      ],
      library,
    );
    assert.equal(result.status, "optimal");
  });

  test("reports complete when the current pool already contains a feasible basket", async () => {
    const programme = feedProgrammeById("grow-finish-pig");
    assert.ok(programme);
    const phase = programme.phases[0];
    const library = ingredientLibraryForPhase(phase);
    const basket = await suggestFormulationIngredients(phase, "ME", library);
    assert.equal(basket.status, "suggested");
    if (basket.status !== "suggested") return;

    const completion = await suggestFormulationAdditions(
      phase,
      "ME",
      basket.ingredientIds.map(priced),
      library,
    );
    assert.equal(completion.status, "complete");
    if (completion.status === "complete") {
      assert.deepEqual(completion.ingredientIds, []);
    }
  });
});

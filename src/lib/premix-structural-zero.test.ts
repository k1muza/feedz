import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { analyzeDiet } from "./diet-formula";
import { ingredientLibraryForPhase, ingredientLibraryWithCustomPremixes } from "./ingredient-nutrients";
import { feedProgrammePhaseById } from "./feed-programmes";
import { commercialPremixById } from "./commercial-premixes";

const nursery = feedProgrammePhaseById("nursery-pig", "br2024-5-32-35-49d-8.4-17.9kg");
if (!nursery) throw new Error("Nursery phase unavailable");

function withPremix(id: string) {
  const library = ingredientLibraryWithCustomPremixes(
    [{ id, name: id, vitamins: {}, traceMineralsPpm: {} }],
    ingredientLibraryForPhase(nursery!),
  );
  return analyzeDiet(
    { ingredients: [
      { ingredientId: "corn-yellow-dent", inclusionPct: 99 },
      { ingredientId: id, inclusionPct: 1 },
    ] }, [], library,
  );
}

describe("unverified commercial premix structural assumptions", () => {
  const macros = (analysis: ReturnType<typeof withPremix>) => [
    analysis.energy.metabolizableKcalKg,
    analysis.energy.netKcalKg,
    analysis.crudeProteinPct,
    analysis.neutralDetergentFibrePct,
    analysis.sidAminoAcidsPct.lysine,
    analysis.minerals.sodiumPct,
    analysis.minerals.totalPhosphorusPct,
  ];

  test("Sustar X911 and a custom simple premix do not cause false missing-data on basal macronutrients", () => {
    for (const id of ["sustar-glypro-x911", "farmer-vitamin-mineral-premix"]) {
      const analysis = withPremix(id);
      for (const value of macros(analysis)) {
        assert.ok(!value.missingIngredientIds.includes(id), `${id} incorrectly unknown in basal nutrient`);
      }
      assert.ok(analysis.vitamins.vitaminAIuKg.missingIngredientIds.includes(id),
        "Premix vitamins remain unverified, never presumed zero");
    }
  });

  test("CJ S174 remains unknown for nutrients it can actually supply", () => {
    const cj = commercialPremixById("cj-s174-boar-premix");
    assert.ok(cj && cj.formulationCompatibility === "manufacturer_recipe_only");
    const analysis = withPremix(cj.id);
    for (const value of macros(analysis)) {
      assert.ok(value.missingIngredientIds.includes(cj.id),
        "CJ compound premix without an analytical value must not count as zero");
    }
  });
});

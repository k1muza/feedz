import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { ingredientDefaultPricePerKg } from "./feed-ingredient-prices";
import { formulateLeastCostDiet, suggestFormulationIngredients } from "./feed-optimizer";
import { FEED_PROGRAMMES, feedProgrammeById } from "./feed-programmes";
import {
  describeMaxSource,
  feedsportInclusionLimits,
  phaseInclusionRecommendation,
} from "./ingredient-inclusion-limits";
import {
  INGREDIENT_LIBRARY,
  POULTRY_INGREDIENT_LIBRARY,
  ingredientLibraryForPhase,
  sttdPhosphorusPctOf,
} from "./ingredient-nutrients";
import { getProgrammes } from "./mcp/feedsport-service";
import { BRAZILIAN_2024_BROILER_STANDARD_NUTRITION, nutritionPhaseAtWeight } from "./nutrition";

const SOYBEAN_MEAL = "soybean-meal-solvent-extracted";
const FULL_FAT_SOY = "soybean-full-fat-extruded";

const BROILER_PROGRAMMES = FEED_PROGRAMMES.filter((programme) => programme.species === "broiler");

function broilerPhase(programmeId: string, index: number) {
  const programme = feedProgrammeById(programmeId);
  assert.ok(programme, `${programmeId} is registered`);
  const phase = programme.phases[index];
  assert.ok(phase, `${programmeId} has phase ${index}`);
  return phase;
}

describe("broiler programmes", () => {
  test("all three Brazilian broiler programmes are loaded with every published phase", () => {
    assert.deepEqual(
      BROILER_PROGRAMMES.map((programme) => [programme.id, programme.phases.length]),
      [
        ["broiler-standard", 6],
        ["broiler-high-performance", 6],
        ["broiler-high-performance-hot", 4],
      ],
    );
    for (const programme of BROILER_PROGRAMMES) {
      assert.equal(programme.status, "loaded");
      assert.ok(programme.phases.every((phase) => phase.species === "broiler"));
    }
    assert.ok(
      FEED_PROGRAMMES.filter((programme) => programme.species === "swine").every((programme) =>
        programme.phases.every((phase) => phase.species === "swine"),
      ),
    );
  });

  test("phase IDs are unique across every programme", () => {
    const ids = BROILER_PROGRAMMES.flatMap((programme) => programme.phases.map((phase) => phase.id));
    assert.equal(new Set(ids).size, ids.length);
  });

  test("published Table 2.30 targets are carried into the formulation phase", () => {
    const phase = broilerPhase("broiler-standard", 0);
    assert.equal(phase.id, "br2024-2-30-0-8d-0.05-0.24kg");
    assert.equal(phase.phaseClass, "pre-starter");
    assert.equal(phase.ageMinDays, 0);
    assert.equal(phase.ageMaxDays, 8);
    assert.equal(phase.requirements.metabolizableEnergyKcalKg, 2930);
    assert.equal(phase.requirements.sidLysinePct, 1.269);
    assert.equal(phase.requirements.sidAminoAcidsPct.methionineCysteine, 0.927);
    assert.equal(phase.requirements.digestibleProteinPct, 21.25);
    assert.equal(phase.requirements.minerals.calciumPct, 1.099);
    assert.equal(phase.requirements.minerals.availablePhosphorusPct, 0.524);
    assert.equal(phase.requirements.minerals.sodiumPct, 0.216);
    assert.equal(phase.requirements.aminoAcids.methionineCysteineToLysPct, 73);
  });

  test("digestible phosphorus is not enforced because inorganic phosphates lack poultry values", () => {
    for (const programme of BROILER_PROGRAMMES) {
      for (const phase of programme.phases) {
        assert.equal(phase.requirements.minerals.sttdPhosphorusPct, undefined);
      }
    }
  });

  test("weight lookup resolves shared band boundaries to the following phase", () => {
    assert.equal(nutritionPhaseAtWeight(0.1, BRAZILIAN_2024_BROILER_STANDARD_NUTRITION).phaseClass, "pre-starter");
    assert.equal(nutritionPhaseAtWeight(0.24, BRAZILIAN_2024_BROILER_STANDARD_NUTRITION).phaseClass, "starter");
    assert.equal(nutritionPhaseAtWeight(3.7, BRAZILIAN_2024_BROILER_STANDARD_NUTRITION).ageMaxDays, 49);
  });

  test("MCP programme listing reports the broiler species", () => {
    const listed = getProgrammes({ query: "broiler" });
    assert.equal(listed.length, 3);
    assert.ok(listed.every((programme) => programme.species === "broiler"));
  });
});

describe("broiler ingredient values", () => {
  test("broiler phases formulate against poultry nutrient values", () => {
    const phase = broilerPhase("broiler-standard", 2);
    assert.equal(ingredientLibraryForPhase(phase), POULTRY_INGREDIENT_LIBRARY);
    assert.equal(ingredientLibraryForPhase(broilerPhase("grow-finish-pig", 0)), INGREDIENT_LIBRARY);

    const corn = POULTRY_INGREDIENT_LIBRARY.ingredients.find((ingredient) => ingredient.id === "corn-yellow-dent");
    assert.equal(corn?.energy.metabolizableKcalKg, 3364);
    assert.equal(corn && sttdPhosphorusPctOf(corn), 0.09);
  });

  test("minerals and crystalline amino acids have poultry profiles without swine-only phosphorus", () => {
    const dcp = POULTRY_INGREDIENT_LIBRARY.ingredients.find((ingredient) => ingredient.id === "dicalcium-phosphate");
    assert.ok(dcp);
    assert.equal(dcp.macroMinerals.availablePhosphorusPct, 18.5);
    assert.equal(dcp.macroMinerals.sttdPhosphorusPct, undefined);
    assert.equal(sttdPhosphorusPctOf(dcp), undefined);

    const methionine = POULTRY_INGREDIENT_LIBRARY.ingredients.find((ingredient) => ingredient.id === "dl-methionine");
    assert.equal(methionine?.aminoAcids.sidPct.methionine, 99.5);
  });
});

describe("broiler inclusion limits", () => {
  test("broiler phases use the Table 1.01 broiler columns", () => {
    const starter = broilerPhase("broiler-standard", 0);
    const finisher = broilerPhase("broiler-standard", 5);

    assert.equal(feedsportInclusionLimits(FULL_FAT_SOY, {}, starter).maxPct, 15);
    assert.equal(feedsportInclusionLimits(FULL_FAT_SOY, {}, finisher).maxPct, 20);
    // Broiler finisher feeds use the broiler grower column.
    assert.equal(phaseInclusionRecommendation(SOYBEAN_MEAL, finisher)?.column, "grower");
    assert.equal(feedsportInclusionLimits(SOYBEAN_MEAL, {}, finisher).maxPct, 35);
    assert.equal(
      describeMaxSource(feedsportInclusionLimits(SOYBEAN_MEAL, {}, finisher)),
      "Brazilian Tables 2024, Table 1.01 broiler grower maximum",
    );
  });

  test("swine limits are unchanged when only a phase class is given", () => {
    assert.equal(feedsportInclusionLimits(SOYBEAN_MEAL, {}, "finisher").maxPct, 20);
    assert.equal(feedsportInclusionLimits(FULL_FAT_SOY, {}, "starter").maxPct, 25);
  });
});

describe("broiler least-cost formulation", () => {
  test("every broiler phase formulates from its suggested ingredient basket", async () => {
    for (const programme of BROILER_PROGRAMMES) {
      for (const phase of programme.phases) {
        const library = ingredientLibraryForPhase(phase);
        const suggestion = await suggestFormulationIngredients(phase, "ME", library);
        assert.equal(suggestion.status, "suggested", `${phase.id} has a feasible basket`);
        if (suggestion.status !== "suggested") continue;

        const result = await formulateLeastCostDiet(
          phase,
          "ME",
          suggestion.ingredientIds.map((ingredientId) => ({
            ingredientId,
            pricePerKg: ingredientDefaultPricePerKg(ingredientId)!,
          })),
          library,
        );
        assert.equal(result.status, "optimal", `${phase.id} formulates`);
        if (result.status !== "optimal") continue;

        const energy = result.solution.analysis.energy.metabolizableKcalKg;
        assert.ok(energy.complete);
        assert.ok(energy.value >= phase.requirements.metabolizableEnergyKcalKg - 1e-6);
        for (const row of result.solution.formula.ingredients) {
          const ingredient = library.ingredients.find((candidate) => candidate.id === row.ingredientId)!;
          const limits = feedsportInclusionLimits(row.ingredientId, ingredient.constraints, phase);
          assert.ok(row.inclusionPct <= limits.maxPct + 1e-6, `${row.ingredientId} respects ${phase.id} limit`);
        }
      }
    }
  });
});

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { ingredientDefaultPricePerKg, INGREDIENT_DEFAULT_PRICES } from "./feed-ingredient-prices";
import { formulateLeastCostDiet, suggestFormulationIngredients } from "./feed-optimizer";
import { feedProgrammePhaseById } from "./feed-programmes";
import {
  effectiveInclusionLimits,
  feedsportInclusionLimits,
  phaseInclusionRecommendation,
} from "./ingredient-inclusion-limits";
import { INGREDIENT_LIBRARY, ingredientLibraryWithCustomPremixes } from "./ingredient-nutrients";
import { analyseFormulation, formulate } from "./mcp/feedsport-service";
import type { NutritionPhase, NutritionPhaseClass } from "./nutrition";
import {
  PUBLIC_PREMIX_ID,
  PUBLIC_PREMIX_INCLUSION_PCT,
  publicPremixProfileForPhase,
} from "./public-feed-premix";

const FULL_FAT_SOY = "soybean-full-fat-extruded";
const SOYBEAN_MEAL = "soybean-meal-solvent-extracted";
const MAIZE = "corn-yellow-dent";

const PRE_STARTER = { programme: "nursery-pig", phase: "br2024-5-32-14-21d-4.4-6.2kg" };
const GROWER = { programme: "grow-finish-pig", phase: "br2024-5-43-63-91d-26-47kg" };

function phase(ref: { programme: string; phase: string }): NutritionPhase {
  const found = feedProgrammePhaseById(ref.programme, ref.phase);
  assert.ok(found, `phase ${ref.programme}:${ref.phase} exists`);
  return found;
}

function maxPct(ingredientId: string, phaseClass: NutritionPhaseClass | undefined): number {
  const ingredient = INGREDIENT_LIBRARY.ingredients.find((candidate) => candidate.id === ingredientId);
  assert.ok(ingredient, `${ingredientId} is in the library`);
  return feedsportInclusionLimits(ingredientId, ingredient.constraints, phaseClass).maxPct;
}

function inclusion(formula: { ingredients: readonly { ingredientId: string; inclusionPct: number }[] }, id: string) {
  return formula.ingredients.find((row) => row.ingredientId === id)?.inclusionPct ?? 0;
}

describe("phase-specific inclusion limits", () => {
  test("pre-starter uses the Brazilian starter column", () => {
    assert.equal(maxPct(FULL_FAT_SOY, "pre-starter"), 25);
    assert.equal(phaseInclusionRecommendation(FULL_FAT_SOY, "pre-starter")?.column, "starter");
  });

  test("soybean meal max follows the growing-pig phase", () => {
    assert.equal(maxPct(SOYBEAN_MEAL, "starter"), 30);
    assert.equal(maxPct(SOYBEAN_MEAL, "grower"), 25);
    assert.equal(maxPct(SOYBEAN_MEAL, "finisher"), 20);
  });

  test("sow phases use the sows columns", () => {
    assert.equal(maxPct(SOYBEAN_MEAL, "gestation"), 15);
    assert.equal(maxPct(FULL_FAT_SOY, "lactation"), 30);
  });

  test("grower maize respects its Brazilian max instead of 100%", () => {
    assert.equal(maxPct(MAIZE, "grower"), 65);
  });

  test("boars and unmapped ingredients keep their existing limits", () => {
    assert.equal(maxPct(FULL_FAT_SOY, "boar"), 100);
    assert.equal(maxPct("wheat-bran", "grower"), 100);
    assert.equal(maxPct("corn-oil", "starter"), 100);
  });

  test("static ingredient limits still apply and the tighter limit wins", () => {
    const tighterStatic = feedsportInclusionLimits(FULL_FAT_SOY, { maxInclusionPct: 12 }, "starter");
    assert.equal(tighterStatic.maxPct, 12);
    assert.equal(tighterStatic.maxSource, "ingredient");
    const looserStatic = feedsportInclusionLimits(FULL_FAT_SOY, { minInclusionPct: 2, maxInclusionPct: 40 }, "starter");
    assert.equal(looserStatic.maxPct, 25);
    assert.equal(looserStatic.minPct, 2);
    assert.equal(looserStatic.maxSource, "brazilian-phase");
  });

  test("requests can tighten but never relax the phase maximum", () => {
    const relaxed = effectiveInclusionLimits(FULL_FAT_SOY, {}, "pre-starter", { maxInclusionPct: 40 });
    assert.equal(relaxed.maxPct, 25);
    assert.deepEqual(relaxed.ignoredRequests, [{ bound: "max", requestedPct: 40, appliedPct: 25 }]);

    const tightened = effectiveInclusionLimits(FULL_FAT_SOY, {}, "pre-starter", { maxInclusionPct: 15 });
    assert.equal(tightened.maxPct, 15);
    assert.deepEqual(tightened.ignoredRequests, []);
  });
});

describe("optimizer enforces phase limits", () => {
  // Mirrors the public calculator: suggested pool, fixed premix, supplementation on.
  async function publicCalculatorFormulation(target: NutritionPhase) {
    const suggestion = await suggestFormulationIngredients(target, "ME");
    assert.equal(suggestion.status, "suggested");
    if (suggestion.status !== "suggested") throw new Error("unreachable");
    const options = suggestion.ingredientIds.flatMap((ingredientId) => {
      const pricePerKg = ingredientDefaultPricePerKg(ingredientId);
      return pricePerKg === undefined ? [] : [{ ingredientId, pricePerKg }];
    });
    options.push({
      ingredientId: PUBLIC_PREMIX_ID,
      pricePerKg: ingredientDefaultPricePerKg(PUBLIC_PREMIX_ID) ?? 0,
      minInclusionPct: PUBLIC_PREMIX_INCLUSION_PCT,
      maxInclusionPct: PUBLIC_PREMIX_INCLUSION_PCT,
    } as (typeof options)[number]);
    const library = ingredientLibraryWithCustomPremixes([publicPremixProfileForPhase(target)], INGREDIENT_LIBRARY);
    return formulateLeastCostDiet(target, "ME", options, library, {
      includeSupplementationTargets: true,
      traceMineralBasis: "inorganic",
    });
  }

  test("pre-starter least cost keeps full-fat soy at or below 25%, above its 10% practical level", async () => {
    const result = await publicCalculatorFormulation(phase(PRE_STARTER));
    assert.equal(result.status, "optimal");
    if (result.status !== "optimal") return;
    const fullFatSoy = inclusion(result.solution.formula, FULL_FAT_SOY);
    assert.ok(fullFatSoy <= 25 + 1e-6, `full-fat soy ${fullFatSoy}% must be <= 25%`);
    // practical (10%) is advisory: the solver may go above it.
    assert.ok(fullFatSoy > 10, `full-fat soy ${fullFatSoy}% should exceed the 10% practical level`);
    for (const alternative of result.alternatives) {
      assert.ok(inclusion(alternative.solution.formula, FULL_FAT_SOY) <= 25 + 1e-6, `${alternative.id} respects 25%`);
    }
  });

  test("grower maize is capped at its Brazilian grower max", async () => {
    // Without a second energy or tryptophan source this diet is infeasible once
    // maize is capped at 65%; L-tryptophan is one of the confirmed fixes.
    const ids = [MAIZE, SOYBEAN_MEAL, "wheat-bran", "soybean-degummed-oil", "dicalcium-phosphate", "limestone-ground", "sodium-chloride", "l-lysine-hcl", "dl-methionine", "l-threonine", "l-tryptophan"];
    const result = await formulateLeastCostDiet(
      phase(GROWER),
      "ME",
      ids.map((ingredientId) => ({ ingredientId, pricePerKg: ingredientDefaultPricePerKg(ingredientId)! })),
    );
    assert.equal(result.status, "optimal");
    if (result.status !== "optimal") return;
    const maize = inclusion(result.solution.formula, MAIZE);
    assert.ok(maize <= 65 + 1e-6, `maize ${maize}% must be <= 65%`);
    assert.ok(maize >= 65 - 1e-6, `maize ${maize}% should be held at its 65% cap`);
    assert.ok(inclusion(result.solution.formula, SOYBEAN_MEAL) <= 25 + 1e-6);
  });
});

describe("MCP reports effective phase limits", () => {
  const context = { prices: INGREDIENT_DEFAULT_PRICES };
  const programmeId = `${PRE_STARTER.programme}:${PRE_STARTER.phase}`;
  const ingredients = [MAIZE, FULL_FAT_SOY, SOYBEAN_MEAL, "dicalcium-phosphate", "limestone-ground", "sodium-chloride", "l-lysine-hcl", "dl-methionine", "l-threonine", "premix"];

  test("a requested max above the Brazilian limit keeps 25% and explains why", async () => {
    const result = await formulate(
      { programme_id: programmeId, ingredients, constraints: { [FULL_FAT_SOY]: { max_percent: 40 } } },
      context,
    );
    const limit = "inclusion_limits" in result ? result.inclusion_limits?.find((row) => row.ingredient === FULL_FAT_SOY) : undefined;
    assert.equal(limit?.max_percent, 25);
    assert.equal(limit?.feedsport_default.max_percent, 25);
    assert.ok(
      "notes" in result && result.notes?.some((note) => note.includes("Requested max 40%") && note.includes("Table 1.01")),
      "explains the ignored request",
    );
  });

  test("a tighter requested max is applied", async () => {
    const result = await formulate(
      { programme_id: programmeId, ingredients, constraints: { [FULL_FAT_SOY]: { max_percent: 15 } } },
      context,
    );
    const limit = "inclusion_limits" in result ? result.inclusion_limits?.find((row) => row.ingredient === FULL_FAT_SOY) : undefined;
    assert.equal(limit?.max_percent, 15);
  });

  test("recipe analysis flags inclusion above the phase max", () => {
    const result = analyseFormulation(
      {
        programme_id: programmeId,
        recipe: [
          { ingredient: MAIZE, percentage: 55 },
          { ingredient: FULL_FAT_SOY, percentage: 38.8 },
          { ingredient: SOYBEAN_MEAL, percentage: 5.2 },
          { ingredient: "premix", percentage: 1 },
        ],
      },
      context,
    );
    assert.equal(result.passes, false);
    const violation = result.inclusion_limit_violations.find((row) => row.ingredient === FULL_FAT_SOY);
    assert.equal(violation?.max_percent, 25);
  });
});

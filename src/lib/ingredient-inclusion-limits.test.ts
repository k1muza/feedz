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
import { INGREDIENT_LIBRARY, INGREDIENT_LIBRARY_SOURCE, ingredientLibraryWithCustomPremixes } from "./ingredient-nutrients";
import { analyseFormulation, formulate } from "./mcp/feedsport-service";
import type { NutritionPhase, NutritionPhaseClass } from "./nutrition";
import {
  PUBLIC_PREMIX_ID,
  PUBLIC_PREMIX_INCLUSION_PCT,
  publicPremixProfileForPhase,
} from "./public-feed-premix";

const FULL_FAT_SOY = "soybean-full-fat-extruded";
const SOYBEAN_MEAL = "soybean-meal-solvent-extracted";
const DEHULLED_SOYBEAN_MEAL = "soybean-meal-dehulled-solvent-extracted";
const WHEAT_BRAN = "wheat-bran";
const SUNFLOWER_MEAL = "sunflower-meal-solvent-extracted";
const MAIZE = "corn-yellow-dent";

const PRE_STARTER = { programme: "nursery-pig", phase: "br2024-5-32-14-21d-4.4-6.2kg" };
const GROWER = { programme: "grow-finish-pig", phase: "br2024-5-43-63-91d-26-47kg" };
const WEANER = { programme: "nursery-pig", phase: "br2024-5-32-35-49d-8.4-17.9kg" };
const FINISHER = { programme: "grow-finish-pig", phase: "br2024-5-43-119-147d-74-103kg" };

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

  test("48% CP dehulled soybean meal uses its own Table 1.01 row", () => {
    // Published separately for the 48% CP row (printed page 170), not borrowed from 45.6% CP.
    const columns = { "pre-starter": 30, starter: 30, grower: 25, finisher: 20, gestation: 15, lactation: 25 } as const;
    for (const [phaseClass, expected] of Object.entries(columns)) {
      assert.equal(maxPct(DEHULLED_SOYBEAN_MEAL, phaseClass as NutritionPhaseClass), expected, phaseClass);
    }
    const limits = feedsportInclusionLimits(DEHULLED_SOYBEAN_MEAL, {}, "pre-starter");
    assert.equal(limits.maxSource, "brazilian-phase");
    assert.equal(limits.phase?.practicalPct, 30);
    assert.equal(maxPct(DEHULLED_SOYBEAN_MEAL, "boar"), 100);
  });

  test("wheat bran and sunflower meal use their own Table 1.01 rows", () => {
    // Pages 198 (Wheat, Bran) and 190 (Sunflower, Meal): [practical, max] per column.
    const expected = {
      [WHEAT_BRAN]: { starter: [2, 5], grower: [5, 12], finisher: [8, 15], gestation: [15, 35], lactation: [5, 15] },
      [SUNFLOWER_MEAL]: { starter: [5, 10], grower: [8, 15], finisher: [10, 18], gestation: [13, 20], lactation: [10, 20] },
    } as const;
    for (const [ingredientId, columns] of Object.entries(expected)) {
      for (const [phaseClass, [practical, max]] of Object.entries(columns)) {
        const limits = feedsportInclusionLimits(ingredientId, {}, phaseClass as NutritionPhaseClass);
        assert.equal(limits.maxPct, max, `${ingredientId} ${phaseClass} max`);
        assert.equal(limits.phase?.practicalPct, practical, `${ingredientId} ${phaseClass} practical`);
        assert.equal(limits.maxSource, "brazilian-phase");
      }
      assert.equal(maxPct(ingredientId, "pre-starter"), columns.starter[1]);
      assert.equal(maxPct(ingredientId, "boar"), 100);
    }
  });

  test("phase recommendations stay attached to the correct Table 1.01 source row", () => {
    const expectedPages: Record<string, number> = {
      "corn-yellow-dent": 73,
      "soybean-meal-solvent-extracted": 165,
      "soybean-meal-dehulled-solvent-extracted": 169,
      "soybean-degummed-oil": 153,
      "corn-ddgs": 61,
      "corn-high-lysine-grain": 77,
      "corn-high-oil-grain": 79,
      "rice-broken": 139,
      "sorghum-grain-high-tannin": 149,
      "soybean-full-fat-extruded": 155,
      "rice-bran": 137,
      "cassava-whole": 49,
      "cottonseed-meal-38": 87,
      "fish-meal-54": 97,
      "sunflower-meal-solvent-extracted": 189,
      "wheat-bran": 197,
    };

    const recommendationRows = INGREDIENT_LIBRARY_SOURCE.ingredients.filter(
      (ingredient) => ingredient.nutrition.swine?.recommendedInclusionPct,
    );
    assert.equal(recommendationRows.length, Object.keys(expectedPages).length);

    for (const ingredient of recommendationRows) {
      assert.equal(ingredient.provenance.sourceTable, "Table 1.01", ingredient.id);
      assert.equal(
        ingredient.provenance.sourcePage,
        expectedPages[ingredient.id],
        `${ingredient.id} source page`,
      );
    }
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
    assert.equal(maxPct("sorghum-grain", "grower"), 100);
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

describe("optimizer enforces the 48% soybean-meal limit", () => {
  test("cheap dehulled soybean meal is held at its 30% weaner maximum", async () => {
    const ids = ["sorghum-grain", FULL_FAT_SOY, SOYBEAN_MEAL, DEHULLED_SOYBEAN_MEAL, "soybean-degummed-oil", "dicalcium-phosphate", "limestone-ground", "sodium-chloride", "l-lysine-hcl", "dl-methionine", "l-threonine", "l-tryptophan", "l-valine"];
    const result = await formulateLeastCostDiet(
      phase(WEANER),
      "ME",
      // Priced low enough that it would exceed 30% without the limit (46.7% before the fix).
      ids.map((ingredientId) => ({
        ingredientId,
        pricePerKg: ingredientId === DEHULLED_SOYBEAN_MEAL ? 0.4 : ingredientDefaultPricePerKg(ingredientId)!,
      })),
    );
    assert.equal(result.status, "optimal");
    if (result.status !== "optimal") return;
    const dehulled = inclusion(result.solution.formula, DEHULLED_SOYBEAN_MEAL);
    assert.ok(dehulled <= 30 + 1e-6, `dehulled soybean meal ${dehulled}% must be <= 30%`);
    assert.ok(dehulled >= 30 - 1e-6, `dehulled soybean meal ${dehulled}% should be held at its 30% cap`);
  });
});

describe("optimizer enforces wheat bran and sunflower meal limits", () => {
  const ids = [MAIZE, SOYBEAN_MEAL, DEHULLED_SOYBEAN_MEAL, FULL_FAT_SOY, WHEAT_BRAN, SUNFLOWER_MEAL, "soybean-degummed-oil", "dicalcium-phosphate", "limestone-ground", "sodium-chloride", "l-lysine-hcl", "dl-methionine", "l-threonine", "l-tryptophan"];
  const solve = (prices: Record<string, number>) =>
    formulateLeastCostDiet(
      phase(FINISHER),
      "ME",
      ids.map((ingredientId) => ({ ingredientId, pricePerKg: prices[ingredientId] ?? ingredientDefaultPricePerKg(ingredientId)! })),
    );

  test("free wheat bran is held at its 15% finisher maximum", async () => {
    // Used at 41.4% before the source row was mapped.
    const result = await solve({ [WHEAT_BRAN]: 0, [SUNFLOWER_MEAL]: 0 });
    assert.equal(result.status, "optimal");
    if (result.status !== "optimal") return;
    assert.ok(Math.abs(inclusion(result.solution.formula, WHEAT_BRAN) - 15) < 1e-6);
    assert.ok(inclusion(result.solution.formula, SUNFLOWER_MEAL) <= 18 + 1e-6);
  });

  test("free sunflower meal with expensive soy is held at its 18% finisher maximum", async () => {
    const result = await solve({ [SUNFLOWER_MEAL]: 0, [SOYBEAN_MEAL]: 2, [DEHULLED_SOYBEAN_MEAL]: 2, [FULL_FAT_SOY]: 2 });
    assert.equal(result.status, "optimal");
    if (result.status !== "optimal") return;
    assert.ok(Math.abs(inclusion(result.solution.formula, SUNFLOWER_MEAL) - 18) < 1e-6);
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

  test("inclusion_limits reports the Brazilian limit for both soybean meals", async () => {
    const result = await formulate(
      {
        programme_id: `${WEANER.programme}:${WEANER.phase}`,
        ingredients: [...ingredients, DEHULLED_SOYBEAN_MEAL],
      },
      context,
    );
    const limits = "inclusion_limits" in result ? result.inclusion_limits : undefined;
    for (const id of [SOYBEAN_MEAL, DEHULLED_SOYBEAN_MEAL]) {
      const limit = limits?.find((row) => row.ingredient === id);
      assert.equal(limit?.max_percent, 30, id);
      assert.match(limit?.feedsport_default.max_source ?? "", /Table 1\.01 starter maximum/, id);
    }
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

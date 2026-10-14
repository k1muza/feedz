import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { analyseFormulation, formulate, resolvePhase, type FeedSportServiceContext } from "./feedsport-service";
import {
  COMMERCIAL_PREMIXES,
  automaticPremixExclusion,
  commercialPremixById,
  commercialPremixForProgramme,
  premixNutrientContributions,
} from "@/lib/commercial-premixes";
import { analyzeDiet } from "@/lib/diet-formula";
import { INGREDIENT_DEFAULT_PRICES, ingredientDefaultPlanningPricePerTonne } from "@/lib/feed-ingredient-prices";
import { FEED_PROGRAMMES } from "@/lib/feed-programmes";
import { buildFormulationAssessment, supplementationGuidance } from "@/lib/formulation-assessment";
import { ingredientLibraryForPhase } from "@/lib/ingredient-nutrients";

const context: FeedSportServiceContext = { prices: INGREDIENT_DEFAULT_PRICES };
const NURSERY = "nursery-pig:br2024-5-32-35-49d-8.4-17.9kg";
const GROWER_EARLY = "grow-finish-pig:br2024-5-43-63-91d-26-47kg";
const GROWER_LATE = "grow-finish-pig:br2024-5-43-91-119d-47-74kg";
const FINISHER = "grow-finish-pig:br2024-5-43-119-147d-74-103kg";
const BROILER = "broiler-standard:br2024-2-30-17-27d-0.68-1.49kg";

const withoutPrices = (...ids: string[]): FeedSportServiceContext =>
  ({ prices: INGREDIENT_DEFAULT_PRICES.filter((price) => !ids.includes(price.ingredientId)) });

type Formulated = Awaited<ReturnType<typeof formulate>>;
type Recipe = Extract<Formulated, { ingredients: unknown }>;

function premixRows(result: Formulated) {
  assert.ok("ingredients" in result, `expected a recipe, got status ${result.status}`);
  return (result as Recipe).ingredients.filter((row) => commercialPremixById(row.ingredient));
}

/** The common shape of an automatic result that includes `premixId` correctly. */
function assertAutomaticPremix(result: Formulated, premixId: string) {
  assert.equal(result.status, "optimal");
  if (result.status !== "optimal") return;
  const product = commercialPremixById(premixId)!;
  const rows = premixRows(result);
  assert.equal(rows.length, 1, "exactly one commercial premix");
  assert.equal(rows[0].ingredient, premixId);
  assert.ok(Math.abs(rows[0].percentage - product.inclusionPct) < 1e-6, "fixed at the manufacturer dose");
  assert.equal(result.formulation_basis.ingredient_mode, "automatic");
  assert.equal(result.formulation_basis.candidate_ingredients.filter((id) => commercialPremixById(id)).length, 1);
  assert.equal(result.premix_included, true);
  assert.equal(result.feed_completeness, "complete_with_premix");
  assert.equal(result.premix_selection?.premix, premixId);
  assert.equal(result.premix_analysis.status, "included");
  assert.equal(result.premix_analysis.product_id, premixId);
  assert.equal(result.nutritional_validation.overall_status, "meets_requirements");
  const dose = result.nutritional_validation.hard_requirements.find((row) => row.nutrient === "premix_dose");
  assert.equal(dose?.status, "met", "the manufacturer dose is a hard requirement");
  // The canonical planning price, not a copy of it.
  const price = ingredientDefaultPlanningPricePerTonne(premixId, context.prices)!;
  assert.equal(rows[0].price_per_tonne, Math.round(price * 100) / 100);
  assert.deepEqual(result.data_sources.prices.find((row) => row.ingredient === premixId)?.source, "feedsport_planning_price");
}

describe("automatic formulation includes the programme's commercial premix", () => {
  it("1. nursery pigs get Caremix PigWeaner at 2.8%, priced and costed into the complete feed", async () => {
    const result = await formulate({ programme_id: NURSERY }, context);
    assertAutomaticPremix(result, "caremix-pig-weaner");
    if (result.status !== "optimal") return;
    assert.equal(result.premix_selection?.basis, "programme_default");
    const premix = premixRows(result)[0];
    assert.equal(premix.price_per_tonne, 2470.59);
    assert.equal(premix.kg_per_tonne, 28);
    // 9. The premix's share of the cost at its fixed dose, and a total that is the whole feed.
    assert.ok(Math.abs(premix.cost_contribution_per_tonne! - 0.028 * 2470.59) < 0.01);
    const total = result.ingredients.reduce((sum, row) => sum + row.cost_contribution_per_tonne!, 0);
    assert.ok(Math.abs(total - result.cost_per_tonne) < 0.05, `rows ${total} vs total ${result.cost_per_tonne}`);
    assert.ok(result.notes.some((note) => /caremix-pig-weaner .*fixed manufacturer dose/.test(note)));
  });

  it("2. both grower phases get Caremix Pig Grower at 3.2%", async () => {
    for (const programme_id of [GROWER_EARLY, GROWER_LATE]) {
      assertAutomaticPremix(await formulate({ programme_id }, context), "caremix-pig-grower");
    }
  });

  it("3. finishers get the finisher-compatible Caremix Pig Finisher at 2.6%", async () => {
    assertAutomaticPremix(await formulate({ programme_id: FINISHER }, context), "caremix-pig-finisher");
  });

  it("4. broilers get the poultry premix Sustar X812, never a pig premix", async () => {
    const result = await formulate({ programme_id: BROILER }, context);
    assertAutomaticPremix(result, "sustar-glypro-x812");
    assert.equal(commercialPremixById("sustar-glypro-x812")!.species, "broiler");
  });

  it("5. never combines two premixes, in the result or in any re-run alternative", async () => {
    const result = await formulate({ programme_id: GROWER_EARLY }, context);
    assert.equal(premixRows(result).length, 1);
    if (result.status !== "optimal") return;
    const options = result.premix_advisory?.options ?? [];
    assert.ok(options.length >= 2, "Caremix and Sustar X912 are both compared");
    for (const option of options) {
      assert.equal(option.recipe.filter((row) => commercialPremixById(row.ingredient)).length, 1, `${option.premix} is replaced, never stacked`);
    }
    await assert.rejects(
      formulate({ programme_id: GROWER_EARLY, constraints: { "caremix-pig-grower": {}, "sustar-glypro-x912": {} } }, context),
      /one commercial premix at a time/,
    );
  });

  it("6. incompatible premixes are excluded and cannot be forced in", async () => {
    await assert.rejects(formulate({ programme_id: NURSERY, constraints: { "caremix-pig-grower": {} } }, context), /not assigned/);
    await assert.rejects(formulate({ programme_id: GROWER_EARLY, constraints: { "caremix-pig-finisher": {} } }, context), /not assigned/);
    await assert.rejects(formulate({ programme_id: FINISHER, constraints: { "caremix-pig-grower": {} } }, context), /not assigned/);
    await assert.rejects(formulate({ programme_id: BROILER, constraints: { "sustar-glypro-x912": {} } }, context), /not assigned/);
    // For every phase, whatever automatic mode may choose is on-label for that phase.
    for (const programme of FEED_PROGRAMMES) {
      for (const phase of programme.phases) {
        const chosen = commercialPremixForProgramme(programme.id, phase.id, (premix) => !automaticPremixExclusion(premix, programme.id, phase.id));
        if (!chosen) continue;
        const pig = chosen.species === "pig";
        assert.equal(pig, programme.species === "swine", `${chosen.id} for ${programme.id}`);
        if (chosen.eligiblePhaseClasses?.length) assert.ok(chosen.eligiblePhaseClasses.some((allowed) => allowed === phase.phaseClass), `${chosen.id} for ${phase.id}`);
      }
    }
  });

  it("7. an unpriced default falls back to a priced eligible premix, and none at all is reported as incomplete", async () => {
    const fallback = await formulate({ programme_id: NURSERY }, withoutPrices("caremix-pig-weaner"));
    assertAutomaticPremix(fallback, "sustar-glypro-x911");
    if (fallback.status === "optimal") {
      assert.equal(fallback.premix_selection?.basis, "available_alternative");
      assert.match(fallback.premix_selection?.unavailable_premixes?.find((row) => row.premix === "caremix-pig-weaner")?.reason ?? "", /planning price/);
    }

    const none = await formulate({ programme_id: NURSERY }, withoutPrices("caremix-pig-weaner", "sustar-glypro-x911"));
    assert.equal(none.status, "basal_only");
    if (none.status !== "basal_only") return;
    assert.equal(none.optimizer_status, "optimal");
    assert.match(none.message ?? "", /could not establish a complete feed/);
    assert.equal(none.premix_included, false);
    assert.equal(none.feed_completeness, "incomplete");
    assert.match(none.feed_completeness_note, /NOT a complete feed/);
    assert.equal(none.premix_selection?.basis, "unavailable");
    assert.equal(none.premix_selection?.unavailable_premixes?.length, 2);
    assert.equal(premixRows(none).length, 0);

    // A recipe-locked manufacturer product cannot be optimised around.
    const boar = await formulate({ programme_id: "mature-boar:pic-mature-boar" }, context);
    assert.equal(boar.status, "basal_only");
    if (boar.status === "basal_only") {
      assert.match(boar.premix_selection?.unavailable_premixes?.[0].reason ?? "", /manufacturer's fixed recipe/);
    }
  });

  it("8. premix nutrients are credited exactly once alongside every other ingredient", async () => {
    const result = await formulate({ programme_id: NURSERY }, context);
    assert.equal(result.status, "optimal");
    if (result.status !== "optimal") return;
    const { phase } = resolvePhase(NURSERY);
    const library = ingredientLibraryForPhase(phase);
    const formula = { ingredients: result.ingredients.map((row) => ({ ingredientId: row.ingredient, inclusionPct: row.percentage })) };
    const assessment = buildFormulationAssessment(phase, "ME", formula, library);
    const premix = commercialPremixById("caremix-pig-weaner")!;
    const documented = new Map(premixNutrientContributions(premix).map((row) => [row.path, row]));

    // Hard requirements: one premix contribution, equal to its documented value at the dose.
    for (const [id, path] of [["sid-lysine", "aminoAcids.sidPct.lysine"], ["calcium", "macroMinerals.calciumPct"], ["sodium", "macroMinerals.sodiumPct"]] as const) {
      const check = assessment.requirements.find((row) => row.id === id)!;
      const fromPremix = check.contributions.filter((row) => row.ingredientId === premix.id);
      assert.equal(fromPremix.length, 1, `${id} credited once`);
      assert.ok(Math.abs(fromPremix[0].value - documented.get(path)!.finishedFeedContribution) < 1e-6, id);
      const sum = check.contributions.reduce((total, row) => total + row.value, 0);
      assert.ok(Math.abs(sum - check.actual) < 1e-6, `${id}: contributions add up to the recipe value`);
    }

    // Vitamins and trace minerals: recipe value = basal + premix, never premix twice.
    const single = (ingredientId: string) => analyzeDiet({ ingredients: [{ ingredientId, inclusionPct: 100 }] }, [], library);
    const rows = assessment.supplementation!.rows;
    for (const spec of supplementationGuidance(phase)) {
      const expected = formula.ingredients.reduce((sum, row) => sum + spec.measure(single(row.ingredientId)).value * row.inclusionPct / 100, 0);
      const premixPart = spec.measure(single(premix.id)).value * premix.inclusionPct / 100;
      const actual = rows.find((row) => row.id === spec.id)!.actual;
      assert.ok(Math.abs(actual - expected) <= 1e-6 * Math.max(1, expected), `${spec.id}: ${actual} vs ${expected}`);
      const label = premixNutrientContributions(premix).find((row) => row.nutrient === spec.label);
      if (label) assert.ok(Math.abs(premixPart - label.finishedFeedContribution) <= 1e-6 * Math.max(1, premixPart), `${spec.id} premix share`);
    }
    const vitaminA = result.nutritional_validation.advisories.supplementation!.comparisons.find((row) => row.nutrient === "vitamin_a")!;
    assert.equal(vitaminA.recipe, Math.round(documented.get("vitamins.vitaminAIuKg")!.finishedFeedContribution));
  });

  it("9. a supplier quote for the premix replaces its planning price in the complete-feed cost", async () => {
    const quoted = await formulate({ programme_id: NURSERY, constraints: { "caremix-pig-weaner": { price_per_tonne: 3000 } } }, context);
    assert.equal(quoted.status, "optimal");
    if (quoted.status !== "optimal") return;
    assert.equal(quoted.premix_selection?.basis, "explicit");
    assert.equal(premixRows(quoted).length, 1);
    const premix = premixRows(quoted)[0];
    assert.equal(premix.price_per_tonne, 3000);
    assert.ok(Math.abs(premix.cost_contribution_per_tonne! - 84) < 0.01);
    assert.equal(quoted.data_sources.prices.find((row) => row.ingredient === "caremix-pig-weaner")?.source, "request");
  });

  it("10. analysing the automatic recipe reproduces its assessment and completeness", async () => {
    for (const programme_id of [NURSERY, GROWER_EARLY]) {
      const result = await formulate({ programme_id }, context);
      assert.equal(result.status, "optimal");
      if (result.status !== "optimal") continue;
      const analysis = analyseFormulation({ programme_id, recipe: result.ingredients.map((row) => ({ ingredient: row.ingredient, percentage: row.percentage })) }, context);
      assert.equal(analysis.status, "pass");
      if (!("nutritional_validation" in analysis) || !("premix_included" in analysis)) continue;
      assert.equal(analysis.nutritional_validation.overall_status, result.nutritional_validation.overall_status);
      assert.equal(analysis.nutritional_validation.headline, result.nutritional_validation.headline);
      // The recipe is returned rounded, so values agree to rounding and statuses exactly.
      const analysed = analysis.nutritional_validation.advisories.supplementation!.comparisons;
      const formulated = result.nutritional_validation.advisories.supplementation!.comparisons;
      assert.deepEqual(analysed.map((row) => [row.nutrient, row.status, row.data_status]), formulated.map((row) => [row.nutrient, row.status, row.data_status]));
      analysed.forEach((row, i) => assert.ok(Math.abs(row.recipe - formulated[i].recipe) <= 1e-6 * Math.max(1, row.recipe) + 1e-4, row.nutrient));
      assert.equal(analysis.premix_included, true);
      assert.equal(analysis.feed_completeness, result.feed_completeness);
      assert.ok(Math.abs((analysis.cost_per_tonne ?? 0) - result.cost_per_tonne) < 0.05);
    }
  });

  it("11. selected mode keeps the farmer's basket: no premix is added, and the result says so", async () => {
    const basket = ["corn-yellow-dent", "soybean-meal-dehulled-solvent-extracted", "soybean-degummed-oil", "dicalcium-phosphate", "limestone-ground", "sodium-chloride", "l-lysine-hcl", "dl-methionine", "l-threonine", "l-tryptophan", "l-valine"];
    const result = await formulate({ programme_id: GROWER_EARLY, ingredients: basket }, context);
    assert.equal(result.status, "optimal");
    if (result.status !== "optimal") return;
    assert.deepEqual(result.formulation_basis.candidate_ingredients, basket);
    assert.equal(premixRows(result).length, 0);
    assert.equal(result.premix_included, false);
    assert.equal(result.feed_completeness, "incomplete");
    assert.equal("premix_selection" in result, false);
  });

  it("12. an explicit premix choice is never silently replaced", async () => {
    const automatic = await formulate({ programme_id: GROWER_EARLY, constraints: { "sustar-glypro-x912": {} } }, context);
    assertAutomaticPremix(automatic, "sustar-glypro-x912");
    if (automatic.status === "optimal") {
      assert.equal(automatic.premix_selection?.basis, "explicit");
      assert.equal(automatic.premix_advisory?.current_premix, "sustar-glypro-x912");
    }
    const basket = ["corn-yellow-dent", "soybean-meal-dehulled-solvent-extracted", "soybean-degummed-oil", "dicalcium-phosphate", "limestone-ground", "sodium-chloride", "l-lysine-hcl", "dl-methionine", "l-threonine", "l-tryptophan", "l-valine", "sustar-glypro-x912"];
    const selected = await formulate({ programme_id: GROWER_EARLY, ingredients: basket }, context);
    assert.equal(premixRows(selected).map((row) => row.ingredient).join(), "sustar-glypro-x912");
  });

  it("13. stage eligibility and the manufacturer dose are still enforced", async () => {
    await assert.rejects(
      formulate({ programme_id: NURSERY, constraints: { "caremix-pig-weaner": { min_percent: 3, max_percent: 3 } } }, context),
      /must remain at 28 kg\/t/,
    );
    await assert.rejects(
      formulate({ programme_id: NURSERY, ingredients: ["corn-yellow-dent", "soybean-meal-dehulled-solvent-extracted", "caremix-pig-finisher"] }, context),
      /not assigned/,
    );
    for (const premix of COMMERCIAL_PREMIXES.filter((product) => product.id.startsWith("caremix-"))) {
      assert.ok(premix.eligiblePhaseClasses?.length, `${premix.id} keeps its stage restriction`);
    }
  });

  it("compares Caremix Pig Grower with Sustar X912 on identical basal ingredients and complete-feed cost", async () => {
    const result = await formulate({ programme_id: GROWER_EARLY }, context);
    assert.equal(result.status, "optimal");
    if (result.status !== "optimal") return;
    const advisory = result.premix_advisory!;
    assert.equal(advisory.current_premix, "caremix-pig-grower");
    const basal = new Set(result.formulation_basis.candidate_ingredients.filter((id) => !commercialPremixById(id)));
    const caremix = advisory.options.find((option) => option.premix === "caremix-pig-grower")!;
    const sustar = advisory.options.find((option) => option.premix === "sustar-glypro-x912")!;
    assert.equal(caremix.cost_per_tonne, result.cost_per_tonne, "the current option is the primary result");
    for (const option of [caremix, sustar]) {
      assert.ok(option.recipe.every((row) => basal.has(row.ingredient) || row.ingredient === option.premix), `${option.premix} uses only the shared basal pool`);
      const premixRow = option.recipe.find((row) => row.ingredient === option.premix)!;
      assert.ok(Math.abs(premixRow.percent - commercialPremixById(option.premix)!.inclusionPct) < 1e-6);
      assert.equal(option.cost_excludes_unpriced_premix, false, "both are costed with their planning price");
    }
  });
});

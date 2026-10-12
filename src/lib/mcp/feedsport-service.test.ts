import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { analyseFormulation, formulate, getIngredient, getIngredientFamilies, ingredientNutrients, FeedSportInputError, type FeedSportServiceContext } from "./feedsport-service";
import { INGREDIENT_LIBRARY, ingredientLibraryWithCustomPremixes } from "@/lib/ingredient-nutrients";
import { INGREDIENT_DEFAULT_PRICES } from "@/lib/feed-ingredient-prices";
import { diagnoseInfeasibilityTool } from "./feedsport-diagnostics";
import { commercialPremixById } from "@/lib/commercial-premixes";

const context: FeedSportServiceContext = { prices: INGREDIENT_DEFAULT_PRICES };
const programme_id = "nursery-pig:br2024-5-32-35-49d-8.4-17.9kg";

describe("MCP nutrition profile provenance", () => {
  it("identifies Brazilian Tables ingredient profiles and manufacturer premixes separately", () => {
    const maize = getIngredient("corn-yellow-dent", context);
    assert.equal((maize.nutrition_profile_source as { verificationStatus?: string }).verificationStatus, "published_reference");
    assert.ok(maize.nutrition_profile_source.source?.url);
    const commercial = getIngredient("sustar-glypro-x912", context);
    assert.ok("nutrient_contributions" in commercial);
    assert.equal(commercial.verification_status, "manufacturer_unverified");
    assert.equal(commercial.nutrition_profile_source.verificationStatus, "manufacturer_unverified");
    assert.ok(commercial.nutrient_contributions.length);
    assert.ok(commercial.nutrition_profile_source.source?.url?.startsWith("https://"));
  });

  it("serializes a premix's nutrient composition exactly like any ingredient, for both species", () => {
    const pig = getIngredient("sustar-glypro-x912", context);
    const record = INGREDIENT_LIBRARY.ingredients.find((item) => item.id === "sustar-glypro-x912")!;
    assert.ok(pig.nutrients, "premix nutrients are not hidden");
    assert.deepEqual(pig.nutrients, ingredientNutrients(record), "the same values the optimizer uses");
    assert.ok(Object.keys(pig.nutrients).length >= 15);
    assert.equal(pig.default_constraints.min_inclusion_percent, 0.2);
    assert.equal(pig.default_constraints.max_inclusion_percent, 0.2);
    assert.ok("inclusion_instructions" in pig && /2 kg per tonne/.test(pig.inclusion_instructions), "manufacturer metadata is kept");
    assert.doesNotMatch(JSON.stringify(pig), /cannot support a verified nutritional claim/);
    const cj = getIngredient("cj-s174-boar-premix", context);
    assert.ok(cj.nutrients?.total_lysine, "total lysine is listed as total");
    assert.ok(!Object.keys(cj.nutrients ?? {}).some((key) => key === "sid_lysine"), "never relabelled as SID");
    const broiler = getIngredient("sustar-glypro-x812", context);
    assert.ok(broiler.nutrients && Object.keys(broiler.nutrients).length > 0, "poultry premixes resolve from the poultry library");
  });

  it("does not claim the Brazilian Tables as source of an unsourced farmer premix", () => {
    const library = ingredientLibraryWithCustomPremixes([{
      id: "farmer-mix-123", name: "Farmer formula",
      vitamins: {}, traceMineralsPpm: {},
    }], INGREDIENT_LIBRARY);
    const result = getIngredient("farmer-mix-123", context, undefined, library);
    assert.ok(!("verification_status" in result));
    assert.equal(result.source_url, null);
    assert.match(result.source, /user-provided/i);
  });
});

describe("FeedSport MCP automatic ingredient mode", () => {
  it("builds the candidate pool itself for a generic formulation", async () => {
    const result = await formulate(
      {
        programme_id,
        energy_system: "ME",
        objective: "least_cost",
      },
      context,
    );

    assert.equal(result.status, "optimal");
    assert.equal(result.formulation_basis.ingredient_mode, "automatic");
    assert.ok(result.formulation_basis.candidate_count > 1);
    // Hard requirements decide the result; without a premix, Chapter 7
    // supplementation is reported as an advisory, never as a deficiency.
    assert.equal(result.nutritional_validation.overall_status, "meets_requirements");
    assert.match(result.nutritional_validation.headline, /^Meets all \d+ hard requirements$/);
    assert.ok(result.nutritional_validation.hard_requirements.every((row) => row.status === "met"));
    const chapter7 = result.nutritional_validation.advisories.supplementation?.comparisons ?? [];
    assert.ok(chapter7.length > 0);
    assert.ok(chapter7.every((row) => row.status !== "at_recommendation"));
    assert.equal(result.premix_analysis.status, "not_included");

    const analysis = analyseFormulation({
      programme_id,
      energy_system: "ME",
      recipe: result.ingredients.map((row) => ({
        ingredient: row.ingredient,
        percentage: row.percentage,
      })),
    }, context);
    assert.equal(analysis.nutritional_validation.overall_status, result.nutritional_validation.overall_status);
    assert.equal(analysis.nutritional_validation.headline, result.nutritional_validation.headline);
  });

  it("can optimise a nursery basal ration with real Sustar X911 without missing basal premix macros", async () => {
    const result = await formulate({
      programme_id,
      energy_system: "ME",
      ingredient_mode: "selected",
      ingredients: [
        "corn-yellow-dent",
        "soybean-meal-dehulled-solvent-extracted",
        "soybean-full-fat-extruded",
        "soybean-degummed-oil",
        "corn-oil",
        "dicalcium-phosphate",
        "limestone-ground",
        "sodium-chloride",
        "l-lysine-hcl",
        "dl-methionine",
        "l-threonine",
        "l-tryptophan",
        "l-valine",
        "sustar-glypro-x911",
      ],
      constraints: {
        "soybean-full-fat-extruded": { max_percent: 10 },
        "soybean-degummed-oil": { max_percent: 2 },
        "corn-oil": { max_percent: 2 },
        "sustar-glypro-x911": { min_percent: 0.2, max_percent: 0.2, price_per_tonne: 1500 },
      },
    }, context);
    assert.notEqual(result.status, "missing_data", "Sustar's omitted basal-macro values must not block solving");
    assert.equal(result.status, "optimal");
    if (result.status === "optimal") {
      assert.equal(result.nutritional_validation.overall_status, "meets_requirements");
      assert.equal(result.premix_analysis.status, "included");
      assert.equal(result.premix_analysis.product_id, "sustar-glypro-x911");
      assert.ok(result.premix_analysis.status === "included" && result.premix_analysis.contributions.length);
      // X911 documents no macro-nutrients: they are counted as 0 and labelled, not hidden.
      assert.ok(result.nutritional_validation.hard_requirements.some((row) => row.data_status === "assumed_zero" && row.assumed_zero_for?.includes("sustar-glypro-x911")));
    }
  });

  it("keeps explicit ingredient calls backward-compatible as selected mode", async () => {
    const result = await formulate(
      {
        programme_id,
        energy_system: "ME",
        ingredients: [
          "corn-yellow-dent",
          "soybean-meal-dehulled-solvent-extracted",
          "soybean-full-fat-extruded",
          "soybean-degummed-oil",
          "corn-oil",
          "dicalcium-phosphate",
          "limestone-ground",
          "sodium-chloride",
          "l-lysine-hcl",
          "dl-methionine",
          "l-threonine",
          "l-tryptophan",
          "l-valine",
        ],
        constraints: {
          "soybean-full-fat-extruded": { max_percent: 10 },
          "soybean-degummed-oil": { max_percent: 2 },
          "corn-oil": { max_percent: 2 },
        },
        objective: "least_cost",
      },
      context,
    );

    assert.equal(result.status, "optimal");
    assert.equal(result.formulation_basis.ingredient_mode, "selected");
  });

  it("never makes least cost worse by using the broader automatic pool", async () => {
    const constraints = {
      "soybean-full-fat-extruded": { max_percent: 10 },
      "soybean-degummed-oil": { max_percent: 2 },
      "corn-oil": { max_percent: 2 },
    };

    const selected = await formulate(
      {
        programme_id,
        energy_system: "ME",
        ingredients: [
          "corn-yellow-dent",
          "soybean-meal-dehulled-solvent-extracted",
          "soybean-full-fat-extruded",
          "soybean-degummed-oil",
          "corn-oil",
          "dicalcium-phosphate",
          "limestone-ground",
          "sodium-chloride",
          "l-lysine-hcl",
          "dl-methionine",
          "l-threonine",
          "l-tryptophan",
          "l-valine",
        ],
        constraints,
        objective: "least_cost",
      },
      context,
    );
    const automatic = await formulate(
      {
        programme_id,
        energy_system: "ME",
        ingredient_mode: "automatic",
        constraints,
        objective: "least_cost",
      },
      context,
    );

    assert.equal(selected.status, "optimal");
    assert.equal(automatic.status, "optimal");
    assert.ok(
      automatic.cost_per_tonne <= selected.cost_per_tonne + 0.01,
      `automatic ${automatic.cost_per_tonne} should not exceed selected ${selected.cost_per_tonne}`,
    );
  });
});


describe("CJ S174 manufacturer-only mature-boar workflow", () => {
  const product = commercialPremixById("cj-s174-boar-premix");
  if (!product?.manufacturerRecipe) throw new Error("CJ boar manufacturer recipe missing from product catalogue");
  const recipe = product.manufacturerRecipe;
  const constraints = Object.fromEntries(recipe.map(({ ingredientId, percent }) => [
    ingredientId,
    { min_percent: percent, max_percent: percent, price_per_tonne: ingredientId === product.id ? 2200 : 300 },
  ]));
  const request = {
    programme_id: "mature-boar:pic-mature-boar",
    ingredient_mode: "selected" as const,
    energy_system: "ME" as const,
    ingredients: recipe.map((row) => row.ingredientId),
    constraints,
  };

  it("returns the manufacturer's actual recipe and cost without falsely claiming optimal nutrient coverage", async () => {
    const result = await formulate(request, context);
    assert.equal(result.status, "manufacturer_recipe");
    if (result.status !== "manufacturer_recipe") return;
    assert.deepEqual(result.ingredients.map((row) => [row.ingredient, row.percentage]),
      recipe.slice().sort((a,b) => b.percent - a.percent).map((row) => [row.ingredientId, row.percent]));
    assert.equal(result.cost_per_tonne, 376);
    assert.doesNotMatch(result.nutritional_validation.headline, /ready|verified/i);
    assert.equal(result.premix_analysis.status, "included");
    assert.equal(result.premix_analysis.product_id, "cj-s174-boar-premix");
    assert.ok(result.incomplete_requirements.length > 0, "Fish meal's missing values must stay unknown.");
    assert.ok(!result.unsupported_requirements.includes("vitamin-trace-mineral-supplementation"),
      "Do not confuse the CJ premix with missing Brazilian phase guidance");
  });

  it("rejects a modified CJ recipe as a client input error with actionable mixing instructions", () => {
    const altered = recipe.map((item) => ({
      ingredient: item.ingredientId,
      percentage: item.ingredientId === "corn-yellow-dent" ? item.percent + 1 :
        item.ingredientId === "wheat-bran" ? item.percent - 1 : item.percent,
    }));
    assert.throws(() => analyseFormulation({
      programme_id: request.programme_id,
      recipe: altered,
      prices: Object.fromEntries(recipe.map((item) =>
        [item.ingredientId, item.ingredientId === product.id ? 2200 : 300])),
    }, context), (error: unknown) => error instanceof FeedSportInputError &&
      /Lock every ingredient to the manufacturer percentages/.test(error.message));
  });

  it("analyses the published boar ratios as a manufacturer recipe instead of a false nutrient pass", () => {
    const result = analyseFormulation({
      programme_id: request.programme_id,
      recipe: recipe.map((item) => ({ ingredient: item.ingredientId, percentage: item.percent })),
      prices: Object.fromEntries(recipe.map((item) =>
        [item.ingredientId, item.ingredientId === product.id ? 2200 : 300])),
    }, context);
    assert.equal(result.status, "manufacturer_recipe");
    if (result.status !== "manufacturer_recipe") throw new Error("Expected CJ manufacturer recipe");
    assert.equal(result.passes, false);
    assert.ok(result.incomplete_requirements.length > 0);
    assert.doesNotMatch(result.nutritional_validation.headline, /ready|verified/i);
  });

  it("keeps diagnose_infeasibility available as a read-only explanation without suggesting substitutions", async () => {
    const result = await diagnoseInfeasibilityTool(request, context);
    assert.equal(result.status, "manufacturer_recipe");
    if (result.status !== "manufacturer_recipe") throw new Error("Expected CJ diagnostic, not solver optimisation");
    assert.ok(result.missing_data.length > 0);
    assert.deepEqual(result.fixes, []);
    assert.doesNotMatch(result.nutritional_validation.headline, /ready|verified/i);
    assert.ok(result.findings.some((finding) => finding.includes("cannot be checked")));
    assert.ok(result.missing_data.every((row) => typeof row.nutrient === "string" && !row.nutrient.includes("Pct")));
    assert.ok(result.checked_shortfalls.every((row) =>
      typeof row.nutrient === "string" && !row.nutrient.includes("Pct") &&
      Number.isFinite(row.actual) && Number.isFinite(row.requirement)));
  });
});

describe("MCP ingredient families and aggregate limits", () => {
  const grower = "grow-finish-pig:br2024-5-43-63-91d-26-47kg";
  const recipe = [
    { ingredient: "soybean-meal-solvent-extracted", percentage: 20 },
    { ingredient: "soybean-meal-dehulled-solvent-extracted", percentage: 15 },
    { ingredient: "corn-yellow-dent", percentage: 65 },
  ];

  it("reports a family violation in analysis exactly as the shared assessment (Studio) does", () => {
    const result = analyseFormulation({ programme_id: grower, recipe }, context);
    assert.equal(result.passes, false);
    assert.ok("aggregate_limit_violations" in result);
    const [violation] = result.aggregate_limit_violations;
    assert.equal(violation.id, "soybean-meal");
    assert.equal(violation.name, "Soybean meal family");
    assert.equal(violation.combined_percent, 35);
    assert.equal(violation.max_percent, 25);
    assert.equal(violation.source_type, "feedsport_policy");
    assert.deepEqual(violation.contributions, [
      { ingredient: "soybean-meal-solvent-extracted", percent: 20 },
      { ingredient: "soybean-meal-dehulled-solvent-extracted", percent: 15 },
    ]);
    const row = result.nutritional_validation.hard_requirements.find((check) => check.aggregate?.id === "soybean-meal");
    assert.equal(row?.status, "not_met");
    assert.equal(row?.aggregate?.combined_percent, violation.combined_percent);
    assert.equal(result.nutritional_validation.inclusion_policy, "aggregate-limits-1");
  });

  it("exposes family membership and limits through get_ingredient and get_ingredient_families", () => {
    const sbm = getIngredient("soybean-meal-46-5", context, grower);
    assert.equal(sbm.family?.id, "soybean-meal");
    assert.equal(sbm.family?.members.length, 4);
    assert.deepEqual(sbm.applicable_aggregate_limits?.map((limit) => [limit.id, limit.max_percent]), [["soybean-meal", 25]]);
    const oil = getIngredient("soybean-degummed-oil", context, grower);
    assert.equal(oil.family?.members.length, 1);
    assert.deepEqual(oil.constraint_groups?.map((group) => group.id), ["total-added-fat"]);

    const all = getIngredientFamilies({ programme_id: grower });
    assert.equal(all.families.reduce((sum, item) => sum + item.members.length, 0), 122);
    const sorghum = all.families.find((item) => item.id === "sorghum-grain")!;
    assert.equal(sorghum.max_inclusion_percent, null);
    assert.ok(all.applicable_limits?.some((limit) => limit.id === "total-added-fat" && limit.max_percent === 5));
  });

  it("formulates within family ceilings in automatic mode", async () => {
    const result = await formulate({ programme_id: "nursery-pig:br2024-5-43-49-63d-16-26kg", energy_system: "ME" }, context);
    assert.equal(result.status, "optimal");
    const rows = "nutritional_validation" in result ? result.nutritional_validation.hard_requirements.filter((row) => row.aggregate) : [];
    assert.ok(rows.length > 0, "combined inclusions are reported");
    assert.ok(rows.every((row) => row.status === "met"));
  });
});

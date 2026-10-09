import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { analyseFormulation, formulate, type FeedSportServiceContext } from "./feedsport-service";
import { diagnoseInfeasibilityTool } from "./feedsport-diagnostics";
import { commercialPremixById } from "@/lib/commercial-premixes";

const context: FeedSportServiceContext = { prices: [] };
const programme_id = "nursery-pig:br2024-5-32-35-49d-8.4-17.9kg";

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
    assert.ok(!result.formulation_basis.candidate_ingredients.includes("public-premix-salt-additives"));
    assert.ok(result.unsupported_requirements.includes("vitamin-trace-mineral-supplementation"));
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
    assert.equal(result.verification, "unverified");
    assert.ok(result.incomplete_requirements.length > 0, "Premix macro-nutrient values are missing and must stay unknown.");
    assert.ok(result.unsupported_requirements.includes("vitamin-trace-mineral-supplementation"));
  });

  it("analyses the published boar ratios as unverified instead of a false nutrient pass", () => {
    const result = analyseFormulation({
      programme_id: request.programme_id,
      recipe: recipe.map((item) => ({ ingredient: item.ingredientId, percentage: item.percent })),
      prices: Object.fromEntries(recipe.map((item) =>
        [item.ingredientId, item.ingredientId === product.id ? 2200 : 300])),
    }, context);
    assert.equal(result.status, "manufacturer_recipe");
    if (result.status !== "manufacturer_recipe") throw new Error("Expected unverified CJ manufacturer recipe");
    assert.equal(result.passes, false);
    assert.ok(result.incomplete_requirements.length > 0);
  });

  it("keeps diagnose_infeasibility available as a read-only explanation without suggesting substitutions", async () => {
    const result = await diagnoseInfeasibilityTool(request, context);
    assert.equal(result.status, "unverified");
    if (result.status !== "unverified") throw new Error("Expected CJ diagnostic, not solver optimisation");
    assert.ok(result.missing_data.length > 0);
    assert.deepEqual(result.fixes, []);
    assert.ok(result.findings.some((finding) => finding.includes("cannot be verified")));
  });
});

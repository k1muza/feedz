import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formulate, type FeedSportServiceContext } from "./feedsport-service";

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

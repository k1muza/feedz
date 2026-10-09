import assert from "node:assert/strict";
import { test } from "node:test";

import { evaluateManual, formulate, validateManualRecipe, type EngineContext, type Snapshot } from "./engine";
import { poolWithProgrammePremix } from "@/lib/studio-commercial-premix";

const context = {
  catalogue: new Map([
    ["corn", { id: "corn", name: "Corn", price: { usdPerTonne: 300 } }],
    ["soy", { id: "soy", name: "Soybean meal", price: { usdPerTonne: 500 } }],
    ["premix", { id: "premix", name: "Premix", price: { usdPerTonne: 900 } }],
    ["wheat", { id: "wheat", name: "Wheat", price: { usdPerTonne: 350 } }],
  ]),
  programmes: {
    requirementFields: [],
    programmes: [{ id: "programme", name: "Programme", species: "swine", phases: [{ id: "phase", label: "Phase", limitsKey: "limits" }] }],
    limits: { limits: [{ id: "soy", name: "Soybean meal", maxPct: 30 }] },
  },
} as unknown as EngineContext;

const snapshot: Snapshot = {
  programmeId: "programme",
  phaseId: "phase",
  goal: "least_cost",
  batch: 100,
  pool: {
    corn: { role: "required", min: 60, max: 80 },
    soy: { role: "available", max: 40 },
    premix: { role: "fixed", fixed: 5 },
  },
};

test("manual recipe validity checks total, effective bounds, and fixed inclusions", () => {
  const check = validateManualRecipe(snapshot, { corn: 55, soy: 40, premix: 4 }, context);
  assert.equal(check.valid, false);
  assert.deepEqual(check.issues.map((issue) => issue.title), [
    "Recipe total is 99.00%",
    "Corn is below its minimum",
    "Soybean meal is above its maximum",
    "Premix must be fixed at 5%",
  ]);
});
test("manual recipe validity rejects ingredients outside the pool and catalogue", () => {
  const outsidePool = validateManualRecipe(snapshot, { corn: 65, soy: 20, premix: 5, wheat: 10 }, context);
  assert.equal(outsidePool.valid, false);
  assert.ok(outsidePool.issues.some((issue) => issue.title === "Wheat is not in the selected ingredient pool"));

  const unknown = validateManualRecipe(snapshot, { corn: 65, soy: 20, premix: 5, "unselected-ingredient": 10 }, context);
  assert.equal(unknown.valid, false);
  assert.ok(unknown.issues.some((issue) => issue.title === "Unknown ingredient unselected-ingredient"));
});
test("invalid manual recipes are not sent for nutrient evaluation", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    throw new Error("should not be called");
  };
  try {
    const check = await evaluateManual(snapshot, { corn: 70, soy: 25, premix: 4 }, context);
    assert.equal(check.recipeValidity.valid, false);
    assert.equal(check.nutrientAdequacy, "not-checked");
    assert.deepEqual(check.nutrients, []);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("incomplete nutrient data reports adequacy as unknown, not met", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    status: "evaluated",
    nutrientProfile: [{ id: "crude-protein", label: "Crude protein", unit: "%", relation: "min", requirement: 18, actual: 20, margin: 2, marginPct: 11.11, binding: false }],
    incompleteRequirements: [{ id: "sid-lysine", label: "SID lysine", unit: "%", relation: "min", requirement: 0.9, missingIngredientIds: ["corn"] }],
  }), { status: 200, headers: { "content-type": "application/json" } });
  try {
    const check = await evaluateManual(snapshot, { corn: 70, soy: 25, premix: 5 }, context);
    assert.equal(check.recipeValidity.valid, true);
    assert.equal(check.nutrients[0]?.status, "met");
    assert.equal(check.nutrientAdequacy, "unknown");
    assert.deepEqual(check.incompleteRequirements.map((requirement) => requirement.id), ["sid-lysine"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Studio can send a default fixed Sustar premix without inventing its purchase price", async () => {
  const originalFetch = globalThis.fetch;
  const pool = poolWithProgrammePremix({ corn: { role: "available" } }, "grow-finish-pig");
  const ctx = {
    catalogue: new Map([
      ["corn", { id: "corn", name: "Corn", price: { usdPerTonne: 300 } }],
      ["sustar-glypro-x912", { id: "sustar-glypro-x912", name: "Sustar X912", price: null }],
    ]),
    programmes: {
      requirementFields: [],
      programmes: [{ id: "grow-finish-pig", name: "Grower", species: "swine", phases: [{ id: "grower", label: "Grower", limitsKey: null }] }],
      limits: {},
    },
  } as unknown as EngineContext;
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    calls += 1;
    const request = JSON.parse(String(init?.body));
    const premix = request.ingredients.find((row: { ingredientId: string }) => row.ingredientId === "sustar-glypro-x912");
    assert.equal(premix.minInclusionPct, 0.2);
    assert.equal(premix.maxInclusionPct, 0.2);
    assert.equal(premix.pricePerKg, 0, "LP-only neutral fixed cost, not supplier quote");
    return new Response(JSON.stringify({ status: "infeasible", diagnostics: [] }), {
      status: 200, headers: { "content-type": "application/json" },
    });
  };
  try {
    const result = await formulate({
      programmeId: "grow-finish-pig", phaseId: "grower", goal: "least_cost", batch: 100, pool,
    }, ctx);
    assert.equal(result.status, "infeasible", "Formulation must reach the solver, not block over premix price");
    assert.equal(calls, 1);
    assert.ok(result.warns.some((warning) => /excludes|excludes/i.test(warning.body)));
  } finally { globalThis.fetch = originalFetch; }
});

test("Studio stops incompatible saved premixes before the network", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error("No request should be made"); };
  try {
    const result = await formulate({
      programmeId: "grow-finish-pig", phaseId: "grower", goal: "least_cost", batch: 100,
      pool: { "sustar-glypro-x812": { role: "available", price: 2000 } },
    }, {
      catalogue: new Map(),
      programmes: { requirementFields: [], programmes: [{ id: "grow-finish-pig", name: "Grower", species: "swine", phases: [{ id: "grower", label: "Grower", limitsKey: null }] }], limits: {} },
    } as unknown as EngineContext);
    assert.equal(result.status, "blocked");
    if (result.status === "blocked") assert.ok(result.errs.some((issue) => /not suitable/.test(issue.body)));
    assert.equal(calls, 0);
  } finally { globalThis.fetch = originalFetch; }
});

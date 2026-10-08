import assert from "node:assert/strict";
import { test } from "node:test";

import { evaluateManual, validateManualRecipe, type EngineContext, type Snapshot } from "./engine";

const context = {
  catalogue: new Map([
    ["corn", { id: "corn", name: "Corn", price: { usdPerTonne: 300 } }],
    ["soy", { id: "soy", name: "Soybean meal", price: { usdPerTonne: 500 } }],
    ["premix", { id: "premix", name: "Premix", price: { usdPerTonne: 900 } }],
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

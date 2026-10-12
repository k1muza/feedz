import assert from "node:assert/strict";
import { test } from "node:test";

import { POST } from "./route";
import { ingredientDefaultPricePerKg } from "@/lib/feed-ingredient-prices";
import { formulateLeastCostDiet, suggestFormulationIngredients } from "@/lib/feed-optimizer";
import { feedProgrammePhaseById } from "@/lib/feed-programmes";
import { buildFormulationAssessment } from "@/lib/formulation-assessment";
import { ingredientLibraryForPhase } from "@/lib/ingredient-nutrients";

const PROGRAMME_ID = "grow-finish-pig";
const PHASE_ID = "br2024-5-43-63-91d-26-47kg";

const evaluate = (ingredients: { ingredientId: string; inclusionPct: number }[]) =>
  POST(new Request("http://localhost/api/feed-formulation/evaluate", {
    method: "POST",
    body: JSON.stringify({ programmeId: PROGRAMME_ID, phaseId: PHASE_ID, energySystem: "ME", ingredients }),
  }));

test("an optimised grower pig recipe switched to manual amounts, unchanged, is evaluated", async () => {
  const phase = feedProgrammePhaseById(PROGRAMME_ID, PHASE_ID);
  assert.ok(phase);
  const library = ingredientLibraryForPhase(phase);
  const suggestion = await suggestFormulationIngredients(phase, "ME", library);
  assert.equal(suggestion.status, "suggested");
  if (suggestion.status !== "suggested") return;
  const result = await formulateLeastCostDiet(
    phase,
    "ME",
    suggestion.ingredientIds.map((ingredientId) => ({ ingredientId, pricePerKg: ingredientDefaultPricePerKg(ingredientId)! })),
    library,
  );
  assert.equal(result.status, "optimal");
  if (result.status !== "optimal") return;

  // "Adjust amounts manually" keeps the exact optimised amounts behind the
  // rounded inputs, so an unchanged copy is checked as the optimised recipe itself.
  const optimised = result.solution.formula.ingredients.filter((row) => row.inclusionPct > 1e-6);
  const response = await evaluate(optimised);
  assert.equal(response.status, 200, JSON.stringify(await response.clone().json()));
  const body = await response.json();
  assert.equal(body.status, "evaluated");
  const asOptimised = buildFormulationAssessment(phase, "ME", { ingredients: optimised }, library);
  assert.equal(asOptimised.verdict, "meets_requirements");
  assert.equal(body.assessment.verdict, asOptimised.verdict, "the unchanged copy is exactly as valid as the optimised recipe");
  assert.deepEqual(body.assessment.requirements, JSON.parse(JSON.stringify(asOptimised.requirements)));

  // Amounts retyped at two decimals can miss 100% by a few hundredths; they are still checked, not rejected.
  const retyped = optimised.map((row) => ({ ...row, inclusionPct: +row.inclusionPct.toFixed(2) }));
  assert.equal((await evaluate(retyped)).status, 200);
});

test("a manual recipe materially off 100% is still rejected", async () => {
  const response = await evaluate([{ ingredientId: "corn", inclusionPct: 60 }, { ingredientId: "soybean-meal", inclusionPct: 39 }]);
  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /must sum to 100%; received 99\./);
});

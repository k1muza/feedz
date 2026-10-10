import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildStudioFormulationPdf,
  studioFormulationPdfFilename,
} from "./studio-formulation-pdf";

test("renders a branded Studio PDF from the displayed formulation", async () => {
  const bytes = await buildStudioFormulationPdf({
    documentName: "Grower test mix",
    programmeName: "Grow-Finish Pig",
    phaseLabel: "Grower 50-70 kg",
    weightRange: "50-70 kg",
    source: "Brazilian Tables 2024 · Table 5.43",
    goalLabel: "Least cost",
    goalDescription: "Cheapest recipe that meets every requirement and limit.",
    mode: "Optimised",
    batchKg: 1000,
    costPerTonne: 412.34,
    leastCostPerTonne: 412.34,
    preparedFor: "Tendai Moyo",
    assessment: {
      schemaVersion: 1,
      optimizerFeasible: true,
      verdict: "needs_verification",
      nutrientChecks: [{
        nutrientId: "supplement-vitamin-e", label: "Supplemented vitamin E", categoryId: "vitamins",
        status: "unknown", requiredMin: 40, unit: "IU/kg",
        reason: "The selected premix does not publish vitamin E.", missingIngredientIds: ["premix"],
        enforcedByOptimizer: false, targetSource: "Brazilian Tables 2024, table 7.03",
      }, {
        nutrientId: "supplement-zinc", label: "Supplemented zinc", categoryId: "trace-minerals",
        status: "met", actual: 80, requiredMin: 50, unit: "ppm",
        reason: "Supplemented zinc meets the minimum target.", missingIngredientIds: [],
        enforcedByOptimizer: false, targetSource: "Brazilian Tables 2024, table 7.03",
      }],
      categories: [
        { id: "vitamins", label: "Vitamins", status: "unknown", checked: 12, required: 13, unmetNutrientIds: [], unknownNutrientIds: ["supplement-vitamin-e"], note: "One requirement cannot be verified." },
        { id: "trace-minerals", label: "Trace minerals", status: "met", checked: 6, required: 6, unmetNutrientIds: [], unknownNutrientIds: [], note: "All applicable requirements are verified." },
      ],
      consistencyErrors: [],
      summary: "The optimizer found a recipe, but vitamin E cannot be verified.",
      guidance: "Obtain the manufacturer's nutrient specification, then reformulate.",
      validationScope: "Modeled programme requirements.",
    },
    ingredients: [
      { name: "Corn, Grain (Average)", setting: "Available", inclusionPct: 64.5, pricePerTonne: 310 },
      { name: "Soybean, Meal 48% CP", setting: "Max 30%", inclusionPct: 30, pricePerTonne: 565 },
      { name: "Calcium Carbonate", setting: "Available", inclusionPct: 5.5, pricePerTonne: 145 },
    ],
    nutrients: [
      { name: "Metabolizable energy", unit: "kcal/kg", value: 3260, min: 3250, max: null, status: "met", limiting: false },
      { name: "SID lysine", unit: "%", value: 0.91, min: 0.91, max: null, status: "met", limiting: true },
    ],
    advisories: ["Soybean meal is above the practical guideline."],
    notes: ["Corn uses the FeedSport planning price."],
    generatedAt: new Date("2026-10-08T08:00:00+02:00"),
  });

  assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), "%PDF-");
  assert.ok(bytes.length > 2_000);
  assert.equal(
    studioFormulationPdfFilename("Grower test mix"),
    "feedsport-grower-test-mix.pdf",
  );
});

import assert from "node:assert/strict";
import { test } from "node:test";

import type { FormulationAssessment, RequirementCheck } from "@/lib/formulation-assessment-model";

import {
  buildStudioFormulationPdf,
  documentationGapLine,
  renderStudioFormulationPdf,
  studioFormulationPdfFilename,
  type StudioFormulationPdfInput,
} from "./studio-formulation-pdf";

const requirement = (overrides: Partial<RequirementCheck> & Pick<RequirementCheck, "id" | "label" | "unit" | "bound" | "actual">): RequirementCheck => ({
  relation: "min",
  status: "met",
  limiting: false,
  data: "published",
  missingIngredientIds: [],
  assumedZeroIngredientIds: [],
  totalOnlyIngredientIds: [],
  contributions: [],
  enforcedByOptimizer: true,
  ...overrides,
});

function assessmentFixture(failing = false): FormulationAssessment {
  return {
    schemaVersion: 2,
    optimizerFeasible: true,
    verdict: failing ? "fails_requirements" : "meets_requirements",
    requirements: [
      requirement({ id: "me", label: "Metabolizable energy", unit: "kcal/kg", bound: 3250, actual: 3260 }),
      requirement({
        id: "sid-lysine", label: "SID lysine", unit: "%", bound: 0.91, actual: failing ? 0.85 : 0.91,
        status: failing ? "not_met" : "met", limiting: !failing,
        totalOnlyIngredientIds: ["cj-s174-boar-premix"],
        contributions: [{ ingredientId: "cj-s174-boar-premix", value: 0.02 }],
      }),
      requirement({ id: "sodium", label: "Sodium", unit: "%", bound: 0.18, actual: 0.2, data: "assumed_zero", assumedZeroIngredientIds: ["cj-s174-boar-premix"] }),
      requirement({ id: "premix-dose", label: "Premix dose", unit: "%", relation: "equal", bound: 4, actual: 4 }),
    ],
    supplementation: {
      source: "Brazilian Tables Chapter 7 supplementation recommendations, table 7.03",
      traceMineralBasis: "inorganic",
      rows: [
        { id: "vitamin-e", label: "Vitamin E", unit: "IU/kg", group: "vitamin", recommended: 40, actual: 0, pctOfRecommendation: 0, status: "no_data", data: "assumed_zero", undocumentedIngredientIds: ["cj-s174-boar-premix"] },
        { id: "zinc", label: "Zinc", unit: "mg/kg", group: "trace_mineral", recommended: 100, actual: 80, pctOfRecommendation: 80, status: "below_recommendation", data: "published", undocumentedIngredientIds: [] },
      ],
    },
    documentationGaps: [
      { ingredientId: "cj-s174-boar-premix", nutrientId: "sid-lysine", label: "SID lysine", reason: "total_only" },
      { ingredientId: "cj-s174-boar-premix", nutrientId: "vitamin-e", label: "Vitamin E", reason: "not_documented" },
    ],
    consistencyErrors: [],
    headline: failing ? "Doesn't meet 1 hard requirement" : "Meets all 4 hard requirements",
    summary: failing ? "SID lysine is not met." : "Every hard requirement of the selected programme is met.",
    scope: "Hard requirements: the programme's energy, protein, SID amino-acid and mineral requirements, practical ingredient limits and the manufacturer's premix dose.",
  };
}

function input(overrides: Partial<StudioFormulationPdfInput> = {}): StudioFormulationPdfInput {
  return {
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
    assessment: assessmentFixture(),
    ingredients: [
      { name: "Corn, Grain (Average)", setting: "Available", inclusionPct: 62.5, pricePerTonne: 310 },
      { name: "Soybean, Meal 48% CP", setting: "Max 30%", inclusionPct: 30, pricePerTonne: 565 },
      { name: "Calcium Carbonate", setting: "Available", inclusionPct: 3.5, pricePerTonne: 145 },
      { name: "CJ S174 boar premix", setting: "Fixed 4%", inclusionPct: 4, pricePerTonne: null },
    ],
    nutrients: [
      { name: "Metabolizable energy", unit: "kcal/kg", value: 3260, min: 3250, max: null, status: "met", limiting: false },
      { name: "SID lysine", unit: "%", value: 0.91, min: 0.91, max: null, status: "met", limiting: true },
    ],
    advisories: ["Soybean meal is above the practical guideline."],
    notes: ["Corn uses the FeedSport planning price."],
    generatedAt: new Date("2026-10-08T08:00:00+02:00"),
    ...overrides,
  };
}

const joined = (text: string[]) => text.join(" ");

test("renders a branded Studio PDF from the displayed formulation", async () => {
  const bytes = await buildStudioFormulationPdf(input());
  assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), "%PDF-");
  assert.ok(bytes.length > 2_000);
  assert.equal(studioFormulationPdfFilename("Grower test mix"), "feedsport-grower-test-mix.pdf");
});

test("uses the hard-requirement headline and never claims verification or readiness", async () => {
  const { text } = await renderStudioFormulationPdf(input());
  const all = joined(text);
  assert.ok(text.includes("Meets all 4 hard requirements"));
  assert.ok(text.includes("Met"));
  assert.doesNotMatch(all, /\bverified\b/i);
  assert.doesNotMatch(all, /ready to (manufacture|mix)/i);
  assert.doesNotMatch(all, /can.t verify|below target|requirements verified/i);
  assert.match(all, /Assumed 0/);
  assert.match(all, /total only/);
});

test("reports failed hard requirements as Not met", async () => {
  const { text } = await renderStudioFormulationPdf(input({ assessment: assessmentFixture(true) }));
  assert.ok(text.includes("Doesn't meet 1 hard requirement"));
  assert.ok(text.includes("Not met"));
});

test("renders Chapter 7 as a % of recommendation advisory and the documentation gap line", async () => {
  const { text } = await renderStudioFormulationPdf(input());
  const all = joined(text);
  assert.ok(text.includes("ADVISORIES"));
  assert.ok(text.includes("% OF RECOMMENDATION"));
  assert.ok(text.includes("80%"));
  assert.match(all, /Below recommendation/);
  assert.match(all, /recommendations, not requirements/);
  assert.equal(
    documentationGapLine(assessmentFixture()),
    "Premix documentation is incomplete for 2 values (SID lysine, Vitamin E). Check with the manufacturer before manufacturing.",
  );
  assert.match(all, /Premix documentation is incomplete for 2 values/);
});

test("lists what the premix contributes and flags total-only values", async () => {
  const { text } = await renderStudioFormulationPdf(input());
  const all = joined(text);
  assert.ok(text.includes("WHAT THE PREMIX CONTRIBUTES"));
  assert.match(all, /Total lysine/);
  assert.match(all, /not counted toward SID/);
});

test("adds a Replace premix advisory with the comparison's reasons", async () => {
  const option = {
    inclusionPct: 0.4, inclusionKgPerTonne: 4, status: "optimal" as const, costPerTonne: 400, costExcludesPremix: false,
    requirementsMet: 4, requirementsTotal: 4, recipe: [], documentationGapLabels: [], supplementationAt: 2, supplementationTotal: 2,
  };
  const { text } = await renderStudioFormulationPdf(input({
    premixComparison: {
      currentPremixId: "a",
      options: [
        { ...option, premixId: "a", name: "Premix A", current: true },
        { ...option, premixId: "b", name: "Premix B", current: false },
      ],
      suggestedPremixId: "b",
      reasons: ["no documentation gaps instead of 2"],
    },
  }));
  const all = joined(text);
  assert.match(all, /Replace premix/);
  assert.match(all, /no documentation gaps instead of 2/);
  assert.doesNotMatch(all, /Add premix/);
});

test("shows the legacy note for a schema-1 assessment without re-scoring it", async () => {
  const { text } = await renderStudioFormulationPdf(input({
    assessment: { schemaVersion: 1, verdict: "needs_verification", categories: [] },
  }));
  const all = joined(text);
  assert.match(all, /Premix data updated/);
  assert.doesNotMatch(all, /hard requirement/i);
  assert.doesNotMatch(all, /\bverified\b|needs_verification/i);
});

test("a saved broiler result assessed before the digestible-phosphorus minimum is not shown as a pass", async () => {
  const saved = assessmentFixture();
  saved.requirements.push(requirement({ id: "available-phosphorus", label: "Available phosphorus", unit: "%", bound: 0.484, actual: 0.497 }));
  const { text } = await renderStudioFormulationPdf(input({ assessment: saved }));
  assert.match(joined(text), /Assessed before poultry digestible phosphorus was enforced/);

  const current = assessmentFixture();
  current.requirements.push(
    requirement({ id: "sttd-phosphorus", label: "Standardized digestible phosphorus", unit: "%", bound: 0.438, actual: 0.438 }),
    requirement({ id: "available-phosphorus", label: "Available phosphorus", unit: "%", bound: 0.484, actual: 0.534 }),
  );
  const fresh = await renderStudioFormulationPdf(input({ assessment: current }));
  assert.doesNotMatch(joined(fresh.text), /Assessed before poultry digestible phosphorus/);
});

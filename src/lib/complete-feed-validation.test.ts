import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { buildCompleteFeedValidation } from "./complete-feed-validation";
import { commercialPremixById, premixFinishedFeedContributions } from "./commercial-premixes";
import { formulationRequirements, type FormulationEvaluation } from "./feed-optimizer";
import { feedProgrammePhaseById } from "./feed-programmes";
import { ingredientLibraryForPhase, ingredientLibraryWithCommercialPremixes } from "./ingredient-nutrients";

const phase = feedProgrammePhaseById("grow-finish-pig", "br2024-5-43-63-91d-26-47kg");
if (!phase) throw new Error("Grow-finish test phase unavailable");
const premix = commercialPremixById("sustar-glypro-x912");
if (!premix) throw new Error("X912 unavailable");

describe("complete-feed validation", () => {
  test("calculates premix contribution in finished-feed units", () => {
    const rows = premixFinishedFeedContributions(premix);
    const vitaminA = rows.find((row) => row.nutrient === "Vitamin A");
    const zinc = rows.find((row) => row.nutrient === "Zinc");
    assert.deepEqual(vitaminA && {
      unit: vitaminA.unit,
      concentration: vitaminA.premixConcentration,
      contribution: vitaminA.finishedFeedContribution,
    }, { unit: "IU/kg", concentration: 28_000_000, contribution: 56_000 });
    assert.deepEqual(zinc && {
      unit: zinc.unit,
      concentration: zinc.premixConcentration,
      contribution: zinc.finishedFeedContribution,
    }, { unit: "ppm", concentration: 40_000, contribution: 80 });
  });

  test("credits manufacturer label minima towards micronutrient targets", () => {
    const library = ingredientLibraryWithCommercialPremixes(
      [premix],
      ingredientLibraryForPhase(phase),
    );
    const requirements = formulationRequirements(phase, "ME", {
      includeSupplementationTargets: true,
      traceMineralBasis: "inorganic",
    });
    assert.equal(requirements.find((row) => row.id === "supplement-vitamin-a")?.unit, "IU/kg");
    assert.equal(requirements.find((row) => row.id === "supplement-vitamin-b12")?.unit, "mcg/kg");
    assert.equal(requirements.find((row) => row.id === "supplement-zinc")?.unit, "ppm");
    const evaluation = {
      analysis: {} as FormulationEvaluation["analysis"],
      nutrientProfile: requirements.map((row) => ({
        id: row.id,
        label: row.label,
        unit: row.unit,
        relation: row.relation,
        requirement: row.bound,
        actual: row.bound,
        margin: 0,
        marginPct: 0,
        binding: true,
      })),
      incompleteRequirements: [],
      unsupportedRequirements: [],
    } satisfies FormulationEvaluation;
    const result = buildCompleteFeedValidation(
      phase,
      "ME",
      { ingredients: [{ ingredientId: premix.id, inclusionPct: premix.inclusionPct }] },
      library,
      evaluation,
    );
    assert.equal(result.formulationFeasibility, "feasible");
    assert.deepEqual(result.categories.map(({ label, status }) => ({ label, status })), [
      { label: "Energy, protein and amino acids", status: "met" },
      { label: "Major minerals", status: "met" },
      { label: "Vitamins", status: "met" },
      { label: "Trace minerals", status: "met" },
    ]);
    assert.equal(result.completeFeed, "complete");
  });

  test("counts nutrients no ingredient declares as not met", () => {
    const library = ingredientLibraryWithCommercialPremixes([premix], ingredientLibraryForPhase(phase));
    const result = buildCompleteFeedValidation(
      phase,
      "ME",
      { ingredients: [
        { ingredientId: "sorghum-grain", inclusionPct: 100 - premix.inclusionPct },
        { ingredientId: premix.id, inclusionPct: premix.inclusionPct },
      ] },
      library,
    );
    const vitamins = result.categories.find((row) => row.id === "vitamins");
    assert.equal(vitamins?.status, "not_met");
    assert.ok(vitamins?.missingDataNutrientIds.includes("supplement-vitamin-e"));
    assert.ok(result.categories.every((row) => row.status === "met" || row.status === "not_met"));
    assert.equal(result.completeFeed, "incomplete");
  });

  test("omits categories without loaded targets but makes no complete-feed claim", () => {
    const nursery = feedProgrammePhaseById("nursery-pig", "br2024-5-32-14-21d-4.4-6.2kg");
    assert.ok(nursery);
    const required = formulationRequirements(nursery, "ME", { includeSupplementationTargets: true, traceMineralBasis: "inorganic" });
    const evaluation = {
      analysis: {} as FormulationEvaluation["analysis"],
      nutrientProfile: required.map((row) => ({
        id: row.id, label: row.label, unit: row.unit, relation: row.relation,
        requirement: row.bound, actual: row.bound, margin: 0, marginPct: 0, binding: true,
      })),
      incompleteRequirements: [],
      unsupportedRequirements: [],
    } satisfies FormulationEvaluation;
    const result = buildCompleteFeedValidation(nursery, "ME", { ingredients: [] }, ingredientLibraryForPhase(nursery), evaluation);
    assert.deepEqual(result.categories.map((row) => row.id), ["energy-protein-amino-acids", "major-minerals"]);
    assert.equal(result.completeFeed, "incomplete");
  });

  test("prefers an approved exact profile over label minima", () => {
    const verified = {
      ...premix,
      id: "verified-x912-test-fixture",
      verificationStatus: "verified" as const,
      verifiedAsFedMicronutrients: {
        reference: "test fixture exact analysis",
        sourceUrl: "https://example.com/verified-test-profile",
        vitamins: {
          vitaminAIuKg: 1, vitaminDIuKg: 1, vitaminEIuKg: 1, vitaminKMgKg: 1,
          vitaminB1MgKg: 1, riboflavinMgKg: 1, vitaminB6MgKg: 1,
          vitaminB12McgKg: 1, pantothenicAcidMgKg: 1, niacinMgKg: 1,
          folicAcidMgKg: 1, biotinMgKg: 1, totalCholineMgKg: 1,
        },
        traceMineralsPpm: { zinc: 1, iron: 1, manganese: 1, copper: 1, iodine: 1, selenium: 1 },
      },
    };
    const library = ingredientLibraryWithCommercialPremixes([verified], ingredientLibraryForPhase(phase));
    const requirements = formulationRequirements(phase, "ME", {
      includeSupplementationTargets: true,
      traceMineralBasis: "inorganic",
    });
    const evaluation = {
      analysis: {} as FormulationEvaluation["analysis"],
      nutrientProfile: requirements.map((row) => ({
        id: row.id, label: row.label, unit: row.unit, relation: row.relation,
        requirement: row.bound, actual: row.bound, margin: 0, marginPct: 0, binding: true,
      })),
      incompleteRequirements: [],
      unsupportedRequirements: [],
    } satisfies FormulationEvaluation;
    const result = buildCompleteFeedValidation(
      phase,
      "ME",
      { ingredients: [{ ingredientId: verified.id, inclusionPct: verified.inclusionPct }] },
      library,
      evaluation,
    );
    assert.equal(result.categories.find((row) => row.id === "vitamins")?.status, "met");
    assert.equal(result.categories.find((row) => row.id === "trace-minerals")?.status, "met");
    assert.equal(result.completeFeed, "complete");
  });
});

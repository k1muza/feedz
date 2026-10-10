import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { buildCompleteFeedValidation } from "./complete-feed-validation";
import {
  FORMULATION_VERDICT_LABELS,
  buildInfeasibleFormulationAssessment,
  isFormulationAssessment,
  nutrientAssessmentStatus,
} from "./formulation-assessment";
import {
  micronutrientAssessmentGroups,
} from "./formulation-assessment-model";
import { formulationRescueIngredientCandidates } from "./formulation-rescue-ingredients";
import { commercialPremixById, premixFinishedFeedContributions } from "./commercial-premixes";
import { formulationRequirements, type FormulationEvaluation } from "./feed-optimizer";
import { feedProgrammePhaseById } from "./feed-programmes";
import { ingredientLibraryForPhase, ingredientLibraryWithCommercialPremixes } from "./ingredient-nutrients";

const phase = feedProgrammePhaseById("grow-finish-pig", "br2024-5-43-63-91d-26-47kg");
if (!phase) throw new Error("Grow-finish test phase unavailable");
const premix = commercialPremixById("sustar-glypro-x912");
if (!premix) throw new Error("X912 unavailable");

describe("canonical formulation assessment", () => {
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
    assert.equal(result.optimizerFeasible, true);
    assert.deepEqual(result.categories.map(({ label, status }) => ({ label, status })), [
      { label: "Energy, protein and amino acids", status: "met" },
      { label: "Major minerals", status: "met" },
      { label: "Vitamins", status: "met" },
      { label: "Trace minerals", status: "met" },
    ]);
    assert.equal(result.verdict, "verified");
  });

  test("manufacturer-recommended X912 inclusion remains unknown where its label is silent", () => {
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
    assert.equal(vitamins?.status, "unknown");
    assert.deepEqual(vitamins?.unknownNutrientIds, ["supplement-vitamin-e", "supplement-choline"]);
    assert.equal(result.nutrientChecks.find((row) => row.nutrientId === "supplement-vitamin-e")?.status, "unknown");
    assert.match(result.nutrientChecks.find((row) => row.nutrientId === "supplement-vitamin-e")?.reason ?? "", /not treated as zero/i);
    const micronutrients = micronutrientAssessmentGroups(result);
    assert.equal(micronutrients.find((group) => group.id === "vitamins")?.checks.length, 13);
    assert.equal(micronutrients.find((group) => group.id === "trace-minerals")?.checks.length, 6);
    assert.deepEqual(
      micronutrients.find((group) => group.id === "vitamins")?.checks.filter((check) => check.status === "unknown").map((check) => check.label),
      ["Supplemented vitamin E", "Supplemented choline"],
    );
    const rescue = formulationRescueIngredientCandidates(result, [{
      id: "documented-vitamin-premix",
      name: "Documented vitamin premix",
      category: "Premix",
      premix: { contributions: [
        { nutrient: "Vitamin E", finishedFeedContribution: 40 },
        { nutrient: "Total choline", finishedFeedContribution: 300 },
      ] },
    }], "swine");
    assert.deepEqual(rescue.map(({ id, name, category }) => ({ id, name, category })), [{
      id: "documented-vitamin-premix",
      name: "Documented vitamin premix",
      category: "Premix",
    }]);
    assert.match(rescue[0].reason, /Supplemented vitamin E/);
    assert.match(rescue[0].reason, /Supplemented choline/);
    assert.equal(result.verdict, "needs_verification");
  });

  test("retains the same verdict and label after a saved-result round trip", () => {
    const library = ingredientLibraryWithCommercialPremixes([premix], ingredientLibraryForPhase(phase));
    const assessment = buildCompleteFeedValidation(
      phase,
      "ME",
      { ingredients: [
        { ingredientId: "sorghum-grain", inclusionPct: 100 - premix.inclusionPct },
        { ingredientId: premix.id, inclusionPct: premix.inclusionPct },
      ] },
      library,
    );
    const restored: unknown = JSON.parse(JSON.stringify(assessment));
    assert.equal(isFormulationAssessment(restored), true);
    if (!isFormulationAssessment(restored)) throw new Error("Saved assessment did not restore");
    assert.equal(restored.verdict, assessment.verdict);
    assert.equal(
      FORMULATION_VERDICT_LABELS[restored.verdict],
      "Nutritional verification required",
    );
  });

  test("shows categories without loaded targets as not assessed and makes no verification claim", () => {
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
    assert.deepEqual(result.categories.map((row) => [row.id, row.status]), [
      ["energy-protein-amino-acids", "met"],
      ["major-minerals", "met"],
      ["vitamins", "not_assessed"],
      ["trace-minerals", "not_assessed"],
    ]);
    assert.equal(result.verdict, "needs_verification");
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
    assert.equal(result.verdict, "verified");
  });

  test("reports a known vitamin deficiency separately from unknown data", () => {
    const result = buildCompleteFeedValidation(
      phase,
      "ME",
      { ingredients: [{ ingredientId: "sorghum-grain", inclusionPct: 100 }] },
      ingredientLibraryForPhase(phase),
    );
    const vitaminE = result.nutrientChecks.find((row) => row.nutrientId === "supplement-vitamin-e");
    assert.equal(vitaminE?.status, "below_target");
    assert.equal(vitaminE?.actual, 0);
    assert.equal(result.categories.find((row) => row.id === "vitamins")?.status, "unmet");
    assert.equal(result.verdict, "needs_verification");
  });

  test("preserves the above-limit nutrient state", () => {
    assert.equal(nutrientAssessmentStatus("max", 1.01, 1), "above_limit");
    assert.equal(nutrientAssessmentStatus("max", 1, 1), "met");
  });

  test("represents optimizer infeasibility with the same verdict model", () => {
    const result = buildInfeasibleFormulationAssessment("No exact recipe satisfies every hard constraint.", [{
      constraintId: "sid-lysine", label: "SID lysine", unit: "%", relation: "min", bound: 0.9, actual: 0.7, shortfall: 0.2, excess: 0,
    }]);
    assert.equal(result.optimizerFeasible, false);
    assert.equal(result.verdict, "infeasible");
    assert.match(result.guidance, /reported constraint/i);
  });

  test("flags a failed hard constraint as an engine consistency error", () => {
    const requirements = formulationRequirements(phase, "ME", { includeSupplementationTargets: true, traceMineralBasis: "inorganic" });
    const hardId = formulationRequirements(phase, "ME")[0].id;
    const evaluation = {
      analysis: {} as FormulationEvaluation["analysis"],
      nutrientProfile: requirements.map((row) => ({
        id: row.id, label: row.label, unit: row.unit, relation: row.relation,
        requirement: row.bound, actual: row.id === hardId ? row.bound * 0.5 : row.bound,
        margin: row.id === hardId ? row.bound * -0.5 : 0, marginPct: row.id === hardId ? -50 : 0, binding: row.id !== hardId,
      })),
      incompleteRequirements: [],
      unsupportedRequirements: [],
    } satisfies FormulationEvaluation;
    const result = buildCompleteFeedValidation(phase, "ME", { ingredients: [] }, ingredientLibraryForPhase(phase), evaluation, { checkOptimizerConsistency: true });
    assert.ok(result.consistencyErrors.some((message) => message.includes(requirements[0].label)));
    assert.equal(result.verdict, "needs_verification");
  });
});

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import ingredientLibraryJson from "@/data/nutrition/ingredients/ingredient-library.json";

import { analyzeDiet, type DietFormula } from "./diet-formula";
import { INGREDIENT_DEFAULT_PRICES, ingredientDefaultPricePerKg } from "./feed-ingredient-prices";
import { formulateLeastCostDiet, formulationRequirements, suggestFormulationIngredients } from "./feed-optimizer";
import { FEED_PROGRAMMES, feedProgrammePhaseById } from "./feed-programmes";
import { buildFormulationAssessment, predatesPoultryDigestiblePhosphorus } from "./formulation-assessment";
import {
  INGREDIENT_LIBRARY,
  POULTRY_INGREDIENT_LIBRARY,
  sttdPhosphorusPctOf,
  type IngredientLibrary,
  type IngredientNutrientRecord,
} from "./ingredient-nutrients";
import { analyseFormulation, formulate as mcpFormulate } from "./mcp/feedsport-service";
import type { NutritionPhase } from "./nutrition";
import { resolveNutritionTargets } from "./nutrition-targets";

const DCP = "dicalcium-phosphate";
const MCP = "monocalcium-phosphate";

const BROILER_PHASES = FEED_PROGRAMMES
  .filter((programme) => programme.species === "broiler")
  .flatMap((programme) => programme.phases.map((phase) => ({ programmeId: programme.id, phase })));

const STARTER_PROGRAMME = "broiler-standard";
const starter = feedProgrammePhaseById(STARTER_PROGRAMME, "br2024-2-30-8-17d-0.24-0.68kg")!;

const record = (library: IngredientLibrary, id: string) => {
  const found = library.ingredients.find((ingredient) => ingredient.id === id);
  assert.ok(found, `${id} is in the ${library.species} library`);
  return found;
};

const close = (actual: number, expected: number, message?: string) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${message ?? ""} expected ${expected}, got ${actual}`);

/** The same phase as assessed before the poultry digestible-P minimum was enforced. */
const withoutDigestibleP = (phase: NutritionPhase): NutritionPhase => ({
  ...phase,
  requirements: {
    ...phase.requirements,
    minerals: { ...phase.requirements.minerals, sttdPhosphorusPct: undefined },
  },
});

/** A library in which one ingredient has lost its published digestible-P value. */
function withoutDigestibleValue(library: IngredientLibrary, id: string): IngredientLibrary {
  return {
    ...library,
    ingredients: library.ingredients.map((ingredient): IngredientNutrientRecord => ingredient.id !== id ? ingredient : {
      ...ingredient,
      macroMinerals: {
        ...ingredient.macroMinerals,
        digestiblePhosphorusPct: undefined,
        phosphorusDigestibilityPct: undefined,
        sttdPhosphorusPct: undefined,
        sttdPhosphorusDigestibilityPct: undefined,
      },
    }),
  };
}

const phosphorusRows = (assessment: ReturnType<typeof buildFormulationAssessment>) => ({
  digestible: assessment.requirements.find((check) => check.id === "sttd-phosphorus")!,
  available: assessment.requirements.find((check) => check.id === "available-phosphorus")!,
});

/**
 * A broiler starter recipe (days 8–17) in which dicalcium phosphate is the
 * only phosphate. The rest of the mix is fixed; maize fills to 100%.
 */
function starterRecipe(dcpPct: number): DietFormula {
  const rest: Record<string, number> = {
    "soybean-meal-solvent-extracted": 29.56261,
    "soybean-full-fat-extruded": 15,
    [DCP]: dcpPct,
    "soybean-degummed-oil": 1.21913,
    "limestone-ground": 0.90175,
    "sodium-chloride": 0.49504,
    "dl-methionine": 0.3045,
    "l-lysine-hcl": 0.0983,
    "l-threonine": 0.02588,
  };
  const corn = 100 - Object.values(rest).reduce((sum, pct) => sum + pct, 0);
  return {
    ingredients: [
      { ingredientId: "corn-yellow-dent", inclusionPct: corn },
      ...Object.entries(rest).map(([ingredientId, inclusionPct]) => ({ ingredientId, inclusionPct })),
    ],
  };
}

describe("Table 1.10 poultry digestible phosphorus", () => {
  test("1. dicalcium phosphate contributes its published poultry digestible P (12.9%, coefficient 70%)", () => {
    const dcp = record(POULTRY_INGREDIENT_LIBRARY, DCP);
    assert.equal(dcp.macroMinerals.totalPhosphorusPct, 18.5);
    assert.equal(dcp.macroMinerals.availablePhosphorusPct, 18.5);
    assert.equal(dcp.macroMinerals.digestiblePhosphorusPct, 12.9);
    assert.equal(dcp.macroMinerals.phosphorusDigestibilityPct, 70);
    assert.equal(sttdPhosphorusPctOf(dcp), 12.9);

    // As-fed: a 2% inclusion adds 2% of the as-fed concentration.
    const corn = record(POULTRY_INGREDIENT_LIBRARY, "corn-yellow-dent");
    const diet = analyzeDiet({ ingredients: [
      { ingredientId: "corn-yellow-dent", inclusionPct: 98 },
      { ingredientId: DCP, inclusionPct: 2 },
    ] }, [], POULTRY_INGREDIENT_LIBRARY);
    close(diet.minerals.sttdPhosphorusPct.value, 0.98 * sttdPhosphorusPctOf(corn)! + 0.02 * 12.9, "diet digestible P");
    close(diet.minerals.availablePhosphorusPct.value, 0.98 * corn.macroMinerals.availablePhosphorusPct! + 0.02 * 18.5, "diet available P");
    assert.ok(diet.minerals.sttdPhosphorusPct.complete);
  });

  test("2. monocalcium phosphate contributes its published poultry digestible P (15.2%, coefficient 71%)", () => {
    const mcp = record(POULTRY_INGREDIENT_LIBRARY, MCP);
    assert.equal(mcp.macroMinerals.totalPhosphorusPct, 21.4);
    assert.equal(mcp.macroMinerals.availablePhosphorusPct, 22);
    assert.equal(mcp.macroMinerals.digestiblePhosphorusPct, 15.2);
    assert.equal(mcp.macroMinerals.phosphorusDigestibilityPct, 71);
    assert.equal(sttdPhosphorusPctOf(mcp), 15.2);

    const alone = analyzeDiet({ ingredients: [{ ingredientId: MCP, inclusionPct: 100 }] }, [], POULTRY_INGREDIENT_LIBRARY);
    close(alone.minerals.sttdPhosphorusPct.value, 15.2);
    close(alone.minerals.availablePhosphorusPct.value, 22);
  });

  test("3. swine phosphorus values are unchanged and never shared with poultry", () => {
    for (const [id, swineValue, poultryValue] of [[DCP, 13.9, 12.9], [MCP, 16.4, 15.2]] as const) {
      const swine = record(INGREDIENT_LIBRARY, id);
      const poultry = record(POULTRY_INGREDIENT_LIBRARY, id);
      assert.equal(swine.macroMinerals.sttdPhosphorusPct, swineValue);
      assert.equal(sttdPhosphorusPctOf(swine), swineValue);
      assert.equal(swine.macroMinerals.digestiblePhosphorusPct, undefined, `${id}: no poultry value in the swine profile`);
      assert.equal(poultry.macroMinerals.sttdPhosphorusPct, undefined, `${id}: no swine value in the poultry profile`);
      assert.equal(sttdPhosphorusPctOf(poultry), poultryValue);
    }

    const grower = feedProgrammePhaseById("grow-finish-pig", "br2024-5-43-63-91d-26-47kg")!;
    assert.equal(grower.requirements.minerals.sttdPhosphorusPct, 0.335);
    assert.equal(grower.requirements.minerals.availablePhosphorusPct, 0.321);
  });

  test("values are stored on the published as-fed percent basis", () => {
    assert.equal(ingredientLibraryJson.basis.nutrientComposition, "as-fed");
    assert.equal(ingredientLibraryJson.basis.macroMinerals, "percent");
    for (const id of [DCP, MCP]) {
      const provenance = record(POULTRY_INGREDIENT_LIBRARY, id).provenance;
      assert.equal(provenance.sourceTable, "Table 1.10");
      assert.equal(provenance.sourcePage, 223);
      assert.match(provenance.source?.basis ?? "", /^As-fed/);
      assert.ok(provenance.notes.some((note) => /Dig\. Broilers/.test(note)), `${id} cites the poultry column`);
    }
    // The requirement is a diet percentage and reaches the optimizer unchanged.
    const targets = resolveNutritionTargets(starter);
    assert.equal(targets.minerals.sttdPhosphorusPct, 0.438);
    assert.equal(targets.minerals.availablePhosphorusPct, 0.484);
    const rows = formulationRequirements(starter, "ME").filter((row) => /phosphorus/.test(row.id));
    assert.deepEqual(rows.map((row) => [row.id, row.unit, row.relation, row.bound]), [
      ["sttd-phosphorus", "%", "min", 0.438],
      ["available-phosphorus", "%", "min", 0.484],
    ]);
  });
});

describe("poultry digestible phosphorus is a hard requirement", () => {
  test("every broiler phase enforces both published phosphorus minimums independently", () => {
    assert.equal(BROILER_PHASES.length, 16);
    for (const { phase } of BROILER_PHASES) {
      const { sttdPhosphorusPct, availablePhosphorusPct } = phase.requirements.minerals;
      assert.ok(sttdPhosphorusPct && sttdPhosphorusPct > 0, `${phase.id} digestible P`);
      assert.ok(availablePhosphorusPct && availablePhosphorusPct > 0, `${phase.id} available P`);
      assert.notEqual(sttdPhosphorusPct, availablePhosphorusPct);
      const ids = formulationRequirements(phase, "ME").map((row) => row.id);
      assert.ok(ids.includes("sttd-phosphorus") && ids.includes("available-phosphorus"), phase.id);
    }
  });

  test("4. a recipe that meets available P but not digestible P is rejected", () => {
    const assessment = buildFormulationAssessment(starter, "ME", starterRecipe(2.06305), POULTRY_INGREDIENT_LIBRARY);
    const { digestible, available } = phosphorusRows(assessment);
    assert.equal(available.status, "met");
    assert.equal(digestible.status, "not_met");
    assert.equal(digestible.data, "published");
    assert.ok(digestible.actual < 0.438);
    assert.equal(assessment.verdict, "fails_requirements");
  });

  test("5. a recipe that meets both phosphorus minimums passes them", () => {
    const assessment = buildFormulationAssessment(starter, "ME", starterRecipe(2.4), POULTRY_INGREDIENT_LIBRARY);
    const { digestible, available } = phosphorusRows(assessment);
    assert.equal(available.status, "met");
    assert.equal(digestible.status, "met");
    assert.equal(digestible.data, "published");
  });

  test("6. missing digestible-P data are never treated as zero", async () => {
    // A phosphate is a mineral, a structural-zero class for most nutrients, but
    // its published total P makes a missing digestible value unknown, not 0.
    const gap = withoutDigestibleValue(POULTRY_INGREDIENT_LIBRARY, DCP);
    const alone = analyzeDiet({ ingredients: [{ ingredientId: DCP, inclusionPct: 100 }] }, [], gap);
    assert.equal(alone.minerals.sttdPhosphorusPct.complete, false);
    assert.deepEqual(alone.minerals.sttdPhosphorusPct.missingIngredientIds, [DCP]);
    assert.equal(alone.minerals.availablePhosphorusPct.complete, true, "available P is still published");

    const options = ["corn-yellow-dent", "soybean-meal-solvent-extracted", DCP, "limestone-ground", "sodium-chloride"]
      .map((ingredientId) => ({ ingredientId, pricePerKg: ingredientDefaultPricePerKg(ingredientId)! }));
    const result = await formulateLeastCostDiet(starter, "ME", options, gap);
    assert.equal(result.status, "missing-data", "the phosphorus constraint is never dropped to reach a solution");
    if (result.status !== "missing-data") return;
    assert.ok(result.missingData.some((row) => row.ingredientId === DCP && row.nutrientIds.includes("sttd-phosphorus")));

    // A published feedstuff whose source has no poultry digestible-P value.
    const cottonseed = record(POULTRY_INGREDIENT_LIBRARY, "cottonseed-meal-38");
    assert.ok(cottonseed.macroMinerals.totalPhosphorusPct! > 0);
    assert.equal(sttdPhosphorusPctOf(cottonseed), undefined);
    const withCottonseed = await formulateLeastCostDiet(starter, "ME", [
      ...options.filter((option) => option.ingredientId !== DCP),
      { ingredientId: DCP, pricePerKg: ingredientDefaultPricePerKg(DCP)! },
      { ingredientId: "cottonseed-meal-38", pricePerKg: 0.3 },
    ], POULTRY_INGREDIENT_LIBRARY);
    assert.equal(withCottonseed.status, "missing-data");
    if (withCottonseed.status !== "missing-data") return;
    assert.deepEqual(withCottonseed.missingData.find((row) => row.ingredientId === "cottonseed-meal-38")?.nutrientIds.includes("sttd-phosphorus"), true);

    // Swine follows the same rule for STTD phosphorus.
    const swineGap = withoutDigestibleValue(INGREDIENT_LIBRARY, DCP);
    const swineAlone = analyzeDiet({ ingredients: [{ ingredientId: DCP, inclusionPct: 100 }] }, [], swineGap);
    assert.deepEqual(swineAlone.minerals.sttdPhosphorusPct.missingIngredientIds, [DCP]);
  });

  test("ingredients with no published phosphorus remain a structural zero", () => {
    for (const id of ["limestone-ground", "sodium-chloride", "soybean-degummed-oil", "dl-methionine"]) {
      const alone = analyzeDiet({ ingredients: [{ ingredientId: id, inclusionPct: 100 }] }, [], POULTRY_INGREDIENT_LIBRARY);
      assert.equal(alone.minerals.sttdPhosphorusPct.complete, true, id);
      assert.equal(alone.minerals.sttdPhosphorusPct.value, 0, id);
      assert.equal(alone.minerals.availablePhosphorusPct.complete, true, id);
    }
  });

  test("7. the optimizer, the manual evaluator and MCP agree on phosphorus", async () => {
    const ids = ["corn-yellow-dent", "soybean-meal-solvent-extracted", "soybean-full-fat-extruded", "soybean-degummed-oil",
      "dl-methionine", "l-lysine-hcl", "l-threonine", "l-valine", "l-isoleucine", "limestone-ground", DCP, "sodium-chloride"];
    const result = await formulateLeastCostDiet(starter, "ME",
      ids.map((ingredientId) => ({ ingredientId, pricePerKg: ingredientDefaultPricePerKg(ingredientId)! })),
      POULTRY_INGREDIENT_LIBRARY);
    assert.equal(result.status, "optimal");
    if (result.status !== "optimal") return;

    const solved = result.solution.analysis.minerals;
    const manual = buildFormulationAssessment(starter, "ME", result.solution.formula, POULTRY_INGREDIENT_LIBRARY, { checkOptimizerConsistency: true });
    const { digestible, available } = phosphorusRows(manual);
    assert.deepEqual(manual.consistencyErrors, []);
    assert.equal(manual.verdict, "meets_requirements");
    close(digestible.actual, solved.sttdPhosphorusPct.value);
    close(available.actual, solved.availablePhosphorusPct.value);
    assert.equal(digestible.status, "met");
    assert.equal(available.status, "met");

    const programmeId = `${STARTER_PROGRAMME}:${starter.id}`;
    const formulated = await mcpFormulate({ programme_id: programmeId, ingredient_mode: "selected", ingredients: ids }, { prices: INGREDIENT_DEFAULT_PRICES });
    assert.equal(formulated.status, "optimal");
    if (formulated.status !== "optimal") return;
    const analysed = analyseFormulation({
      programme_id: programmeId,
      recipe: formulated.ingredients.map((row) => ({ ingredient: row.ingredient, percentage: row.percentage })),
    }, { prices: INGREDIENT_DEFAULT_PRICES });
    const mcpRows = (rows: typeof formulated.nutritional_validation.hard_requirements) =>
      rows.filter((row) => /phosphorus/.test(row.nutrient)).map((row) => [row.nutrient, row.status, row.requirement]);
    assert.deepEqual(mcpRows(formulated.nutritional_validation.hard_requirements), [
      ["sttd_phosphorus", "met", 0.438],
      ["available_phosphorus", "met", 0.484],
    ]);
    assert.deepEqual(mcpRows(analysed.nutritional_validation.hard_requirements), mcpRows(formulated.nutritional_validation.hard_requirements));
  });

  test("8. broiler recipes formulated under the old rules are reassessed, not assumed valid", async () => {
    const failedUnderRestoredRule: string[] = [];
    for (const { phase } of BROILER_PHASES) {
      const library = POULTRY_INGREDIENT_LIBRARY;
      const suggestion = await suggestFormulationIngredients(phase, "ME", library);
      assert.equal(suggestion.status, "suggested", `${phase.id} has a feasible basket`);
      if (suggestion.status !== "suggested") continue;
      const options = suggestion.ingredientIds.map((ingredientId) => ({ ingredientId, pricePerKg: ingredientDefaultPricePerKg(ingredientId)! }));

      const before = await formulateLeastCostDiet(withoutDigestibleP(phase), "ME", options, library);
      assert.equal(before.status, "optimal");
      if (before.status !== "optimal") continue;
      const reassessed = buildFormulationAssessment(phase, "ME", before.solution.formula, library);
      const { digestible, available } = phosphorusRows(reassessed);
      assert.ok(digestible, `${phase.id} is reassessed against digestible P`);
      assert.equal(available.status, "met");
      assert.equal(digestible.data, "published");
      if (digestible.status === "not_met") {
        failedUnderRestoredRule.push(phase.id);
        assert.equal(reassessed.verdict, "fails_requirements");
      }

      const after = await formulateLeastCostDiet(phase, "ME", options, library);
      assert.equal(after.status, "optimal", `${phase.id} formulates with the restored constraint`);
      if (after.status !== "optimal") continue;
      const assessed = buildFormulationAssessment(phase, "ME", after.solution.formula, library, { checkOptimizerConsistency: true });
      assert.equal(assessed.verdict, "meets_requirements", phase.id);
      assert.ok(after.solution.analysis.minerals.sttdPhosphorusPct.value >= phase.requirements.minerals.sttdPhosphorusPct! - 1e-6);
      assert.ok(after.solution.analysis.minerals.availablePhosphorusPct.value >= phase.requirements.minerals.availablePhosphorusPct! - 1e-6);
    }
    // Starter and pre-starter least-cost recipes relied on available P alone.
    assert.ok(failedUnderRestoredRule.includes("br2024-2-30-0-8d-0.05-0.24kg"));
    assert.ok(failedUnderRestoredRule.includes(starter.id));
  });

  test("saved broiler assessments made before the restored minimum are flagged, not trusted", () => {
    const current = buildFormulationAssessment(starter, "ME", starterRecipe(2.4), POULTRY_INGREDIENT_LIBRARY);
    assert.equal(predatesPoultryDigestiblePhosphorus(current), false);

    const saved = buildFormulationAssessment(withoutDigestibleP(starter), "ME", starterRecipe(2.06305), POULTRY_INGREDIENT_LIBRARY);
    assert.equal(predatesPoultryDigestiblePhosphorus(saved), true);

    const swine = feedProgrammePhaseById("grow-finish-pig", "br2024-5-43-63-91d-26-47kg")!;
    const swineAssessment = buildFormulationAssessment(swine, "ME", { ingredients: [{ ingredientId: "corn-yellow-dent", inclusionPct: 100 }] }, INGREDIENT_LIBRARY);
    assert.equal(predatesPoultryDigestiblePhosphorus(swineAssessment), false);

    // The detection relies on every programme phase publishing both measures.
    for (const programme of FEED_PROGRAMMES) {
      for (const phase of programme.phases) {
        if (phase.requirements.minerals.availablePhosphorusPct === undefined) continue;
        assert.notEqual(phase.requirements.minerals.sttdPhosphorusPct, undefined, `${phase.id} publishes digestible P`);
      }
    }
  });
});

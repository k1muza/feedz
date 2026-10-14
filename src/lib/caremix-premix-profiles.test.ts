import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { POST as evaluatePost } from "@/app/api/feed-formulation/evaluate/route";
import { commercialPremixById, commercialPremixCompatibleWithProgramme, premixAnalysisForIds, premixNutrientContributions, type CommercialPremix } from "./commercial-premixes";
import { analyzeDiet, type DietFormula } from "./diet-formula";
import { INGREDIENT_DEFAULT_PRICES, ingredientDefaultPricePerKg } from "./feed-ingredient-prices";
import { formulateLeastCostDiet, type FormulationIngredientOption } from "./feed-optimizer";
import { feedProgrammePhaseById } from "./feed-programmes";
import { buildFormulationAssessment } from "./formulation-assessment";
import { ingredientLibraryForPhase, type IngredientLibrary } from "./ingredient-nutrients";
import { analyseFormulation, formulate as mcpFormulate } from "./mcp/feedsport-service";
import { poolWithProgrammePremix, studioPremixProblems } from "./studio-commercial-premix";

// Caremix publishes nutrients per kg of FINISHED FEED supplied by the premix at
// its dose. Each credited per-kg-premix value is a usable published minimum
// divided by the dose fraction; calcium comes from the manufacturer's reference
// ration. These tests recompute every value from the stored specification so
// the library cannot drift from its documented derivation.

const PROGRAMME_ID = "grow-finish-pig";
const GROWER_PHASE = "br2024-5-43-63-91d-26-47kg";
const FINISHER_PHASE = "br2024-5-43-119-147d-74-103kg";
const phase = feedProgrammePhaseById(PROGRAMME_ID, GROWER_PHASE)!;
const library = ingredientLibraryForPhase(phase);
const record = (id: string) => library.ingredients.find((row) => row.id === id)!;
const close = (actual: number | undefined, expected: number, label: string, tolerance = 1e-3) =>
  assert.ok(actual !== undefined && Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${label}: ${actual} ≠ ${expected}`);

type Bound = "min" | "max";
/** [profile path, specification row, stored bound, multiplier applied before dividing by the dose]. */
type Derivation = [path: string, row: string, bound: Bound, factor?: number];

const VITAMINS: Derivation[] = [
  ["vitamins.vitaminAIuKg", "Vitamin A", "min"],
  ["vitamins.vitaminDIuKg", "Vitamin D3", "min"],
  ["vitamins.vitaminEIuKg", "Vitamin E", "min"],
  ["vitamins.vitaminKMgKg", "Vitamin K3", "min"],
  ["vitamins.vitaminB1MgKg", "Vitamin B1", "min"],
  ["vitamins.riboflavinMgKg", "Vitamin B2", "min"],
  ["vitamins.vitaminB6MgKg", "Vitamin B6", "min"],
  ["vitamins.niacinMgKg", "Niacin", "min"],
  // d-calcium pantothenate is 92% pantothenic acid.
  ["vitamins.pantothenicAcidMgKg", "Calcium pantothenate", "min", 0.92],
  // Published in mcg/kg; stored in mg/kg.
  ["vitamins.biotinMgKg", "Biotin", "min", 1 / 1000],
  ["vitamins.vitaminB12McgKg", "Vitamin B12", "min"],
  // Published in g/kg feed; stored as % of premix.
  ["macroMinerals.sodiumPct", "Sodium", "min", 1 / 10],
  ["aminoAcids.totalPct.lysine", "Lysine", "min", 1 / 10],
];

// The Fe–Se cells are displaced on the printed sheet (the stored rows keep the
// user-approved min/max order). Each entry names the cell that holds the value.
const DERIVATIONS: Record<string, Derivation[]> = {
  "caremix-pig-weaner": [
    ...VITAMINS,
    ["vitamins.folicAcidMgKg", "Folic acid", "min"],
    ["traceMineralsPpm.copper", "Copper", "min"],
    ["traceMineralsPpm.iron", "Iron", "max"],
    ["traceMineralsPpm.iodine", "Zinc", "min"],
    ["traceMineralsPpm.manganese", "Manganese", "min"],
    ["traceMineralsPpm.zinc", "Zinc", "max"],
    ["traceMineralsPpm.selenium", "Selenium", "min"],
    ["macroMinerals.totalPhosphorusPct", "Phosphorus", "min", 1 / 10],
    ["aminoAcids.totalPct.methionine", "Methionine", "min", 1 / 10],
    ["aminoAcids.totalPct.threonine", "Threonine", "min", 1 / 10],
  ],
  "caremix-pig-grower": [
    ...VITAMINS,
    ["vitamins.folicAcidMgKg", "Folic acid", "min"],
    ["traceMineralsPpm.copper", "Copper", "min"],
    ["traceMineralsPpm.iron", "Selenium", "min"],
    ["traceMineralsPpm.iodine", "Manganese", "min"],
    ["traceMineralsPpm.manganese", "Zinc", "min"],
    ["traceMineralsPpm.zinc", "Iodine", "min"],
    ["macroMinerals.totalPhosphorusPct", "Phosphorus", "min", 1 / 10],
  ],
  "caremix-pig-finisher": [
    ...VITAMINS,
    ["traceMineralsPpm.copper", "Copper", "min"],
    ["traceMineralsPpm.iron", "Iron", "max"],
    ["traceMineralsPpm.iodine", "Zinc", "min"],
    ["traceMineralsPpm.manganese", "Manganese", "min"],
    ["traceMineralsPpm.zinc", "Zinc", "max"],
    ["traceMineralsPpm.selenium", "Selenium", "min"],
  ],
};

/** Nutrients the sheet cannot support: they stay missing, never zero. */
const MISSING: Record<string, string[]> = {
  "caremix-pig-weaner": ["vitamins.totalCholineMgKg", "aminoAcids.totalPct.tryptophan", "aminoAcids.totalPct.valine", "macroMinerals.chloridePct", "energy.metabolizableKcalKg", "composition.crudeProteinPct"],
  "caremix-pig-grower": ["traceMineralsPpm.selenium", "vitamins.totalCholineMgKg", "aminoAcids.totalPct.methionine", "aminoAcids.totalPct.threonine", "aminoAcids.totalPct.tryptophan", "aminoAcids.totalPct.valine", "macroMinerals.chloridePct", "energy.metabolizableKcalKg", "composition.crudeProteinPct"],
  "caremix-pig-finisher": ["vitamins.folicAcidMgKg", "vitamins.totalCholineMgKg", "macroMinerals.totalPhosphorusPct", "macroMinerals.sttdPhosphorusPct", "aminoAcids.totalPct.methionine", "aminoAcids.totalPct.threonine", "aminoAcids.totalPct.tryptophan", "aminoAcids.totalPct.valine", "macroMinerals.chloridePct", "energy.metabolizableKcalKg", "composition.crudeProteinPct"],
};

const valueAt = (premix: CommercialPremix, path: string): number | undefined =>
  path.split(".").reduce<unknown>((node, key) => (node as Record<string, unknown> | undefined)?.[key], premix.composition) as number | undefined;

function specValue(premix: CommercialPremix, row: string, bound: Bound): number {
  const cell = premix.finishedFeedSpecification!.rows.find((candidate) => candidate.nutrient === row)?.[bound];
  assert.ok(cell && Number.isFinite(Number(cell)), `${premix.id}: ${row} ${bound} is numeric`);
  return Number(cell);
}

/** The manufacturer's reference ration with each line's FeedSport ingredient. */
function referenceRation(premix: CommercialPremix) {
  const ration = premix.finishedFeedSpecification!.referenceRation!;
  const mass = ration.ingredients.reduce((sum, row) => sum + row.kg, 0);
  const formula: DietFormula = { ingredients: ration.ingredients.map((row) => ({ ingredientId: row.ingredientId, inclusionPct: (row.kg / mass) * 100 })) };
  const basal: DietFormula = { ingredients: formula.ingredients.filter((row) => row.ingredientId !== premix.id) };
  const premixFraction = ration.ingredients.find((row) => row.ingredientId === premix.id)!.kg / mass;
  return { ration, mass, formula, basal, premixFraction };
}

/** Grams per kg of feed from basal ingredients, using their Brazilian Tables profiles and the printed mass. */
function basalGPerKg(premix: CommercialPremix, mineral: "calciumPct" | "totalPhosphorusPct") {
  const { ration, mass } = referenceRation(premix);
  return ration.ingredients
    .filter((row) => row.ingredientId !== premix.id)
    .reduce((sum, row) => sum + row.kg * record(row.ingredientId).macroMinerals[mineral]!, 0) / mass * 10;
}

const crystalline = {
  lysine: record("l-lysine-hcl").aminoAcids.sidPct.lysine / record("l-lysine-hcl").aminoAcids.totalPct.lysine * 100,
  methionine: record("dl-methionine").composition.digestibleProteinPct! / record("dl-methionine").composition.crudeProteinPct! * 100,
  threonine: record("l-threonine").composition.digestibleProteinPct! / record("l-threonine").composition.crudeProteinPct! * 100,
};
const dcp = record("dicalcium-phosphate").macroMinerals;

describe("Caremix per-kg premix profiles are reverse-calculated from the manufacturer's specifications", () => {
  for (const [id, derivations] of Object.entries(DERIVATIONS)) {
    test(`${id}: every credited value is the published minimum divided by the dose`, () => {
      const premix = commercialPremixById(id)!;
      const fraction = premix.inclusionKgPerTonne / 1000;
      for (const [path, row, bound, factor = 1] of derivations) {
        close(valueAt(premix, path), specValue(premix, row, bound) * factor / fraction, `${id} ${path}`);
      }
      // SID amino acids use the Brazilian Tables crystalline coefficients.
      for (const [aminoAcid, total] of Object.entries(premix.composition.aminoAcids.totalPct)) {
        const coefficient = crystalline[aminoAcid as keyof typeof crystalline];
        close(premix.composition.aminoAcids.sidDigestibilityPct[aminoAcid], coefficient, `${id} ${aminoAcid} digestibility`, 1e-2);
        close(premix.composition.aminoAcids.sidPct[aminoAcid], total * coefficient / 100, `${id} SID ${aminoAcid}`);
      }
      // Phosphorus: an inorganic source with dicalcium phosphate's coefficients.
      const phosphorus = premix.composition.macroMinerals.totalPhosphorusPct;
      if (phosphorus !== undefined) {
        close(premix.composition.macroMinerals.sttdPhosphorusPct, phosphorus * dcp.sttdPhosphorusPct! / dcp.totalPhosphorusPct!, `${id} STTD P`);
        close(premix.composition.macroMinerals.availablePhosphorusPct, phosphorus * dcp.availablePhosphorusPct! / dcp.totalPhosphorusPct!, `${id} available P`);
      }
      // Every credited value cites how it was obtained.
      for (const row of premixNutrientContributions(premix)) {
        if (row.path.startsWith("aminoAcids.sidPct.") && valueAt(premix, row.path) === undefined) continue;
        assert.ok(premix.nutrientSources[row.path]?.basis, `${id} ${row.path} has a derivation`);
      }
    });

    test(`${id}: calcium is the reference ration's total minus Brazilian Tables basal calcium, inside the published range`, () => {
      const premix = commercialPremixById(id)!;
      const { ration, premixFraction } = referenceRation(premix);
      const supplied = ration.reportedPerKgFeed.calciumG - basalGPerKg(premix, "calciumPct");
      assert.ok(supplied >= specValue(premix, "Calcium", "min") && supplied <= specValue(premix, "Calcium", "max"), `${id}: ${supplied} g/kg is inside the published range`);
      close(premix.composition.macroMinerals.calciumPct, supplied / premixFraction / 10, `${id} calcium`);
    });

    test(`${id}: nutrients the sheet cannot support stay missing, never zero`, () => {
      const premix = commercialPremixById(id)!;
      for (const path of MISSING[id]) assert.equal(valueAt(premix, path), undefined, `${id} ${path}`);
      // The unlabelled "Vitamin E equivalent" row is never added to vitamin E.
      const fraction = premix.inclusionKgPerTonne / 1000;
      close(premix.composition.vitamins.vitaminEIuKg, specValue(premix, "Vitamin E", "min") / fraction, `${id} vitamin E`);
      assert.equal(premix.composition.energy.metabolizableKcalKg, undefined);
      assert.deepEqual(premix.composition.composition, {});
    });
  }

  test("phosphorus keeps the published minimum because the reference ration contradicts the published maximum", () => {
    for (const id of Object.keys(DERIVATIONS)) {
      const premix = commercialPremixById(id)!;
      const { ration } = referenceRation(premix);
      const implied = ration.reportedPerKgFeed.phosphorusG - basalGPerKg(premix, "totalPhosphorusPct");
      assert.ok(implied > specValue(premix, "Phosphorus", "max"), `${id}: the ration implies ${implied} g P/kg, above the published maximum`);
    }
  });

  test("the specification is a supplemental basis: its phosphorus and manganese are below what the basal ration alone supplies", () => {
    const premix = commercialPremixById("caremix-pig-grower")!;
    const { basal, premixFraction } = referenceRation(premix);
    const mix = analyzeDiet({ ingredients: basal.ingredients.map((row) => ({ ...row, inclusionPct: row.inclusionPct / (1 - premixFraction) })) }, [], library);
    assert.ok(mix.minerals.totalPhosphorusPct.value * 10 > specValue(premix, "Phosphorus", "max"), "basal P exceeds the whole published P range");
    assert.ok(mix.traceMineralsPpm.manganese.value > specValue(premix, "Manganese", "max"), "basal Mn exceeds the printed Mn row");
  });
});

describe("worked example: the manufacturer's Caremix Pig Grower reference ration", () => {
  const premix = commercialPremixById("caremix-pig-grower")!;
  const { ration, mass, formula, premixFraction } = referenceRation(premix);
  const mix = analyzeDiet(formula, [], library);

  test("317 kg maize + 100 kg soybean meal + 68 kg wheat bran + 16 kg Caremix is normalised to its printed 501 kg", () => {
    assert.equal(mass, 501);
    assert.equal(ration.totalKgPrinted, 501);
    close(premixFraction * 100, 3.1936, "Caremix share of the batch", 1e-4);
  });

  test("the premix's credited calcium reproduces the worksheet's 6.1 g/kg; phosphorus stays conservatively below 5.3 g/kg", () => {
    close(mix.minerals.calciumPct.value * 10, ration.reportedPerKgFeed.calciumG, "calcium g/kg");
    const phosphorus = mix.minerals.totalPhosphorusPct.value * 10;
    assert.ok(phosphorus < ration.reportedPerKgFeed.phosphorusG, `${phosphorus} g P/kg is credited, below the worksheet's 5.3`);
    close(phosphorus, basalGPerKg(premix, "totalPhosphorusPct") + premix.composition.macroMinerals.totalPhosphorusPct! * 10 * premixFraction, "phosphorus g/kg");
  });

  test("each credited premix nutrient is counted once, at the batch's actual premix share", () => {
    // The basal ingredients alone, scaled to 100%, then weighted by their 96.81% share of the batch.
    const share = 1 - premixFraction;
    const basal = analyzeDiet({ ingredients: formula.ingredients.filter((row) => row.ingredientId !== premix.id).map((row) => ({ ...row, inclusionPct: row.inclusionPct / share })) }, [], library);
    close(mix.traceMineralsPpm.zinc.value - basal.traceMineralsPpm.zinc.value * share, premix.composition.traceMineralsPpm.zinc * premixFraction, "zinc ppm");
    close(mix.supplementation.vitamins.vitaminAIuKg.value, premix.composition.vitamins.vitaminAIuKg! * premixFraction, "vitamin A IU/kg");
    close(mix.minerals.sodiumPct.value - basal.minerals.sodiumPct.value * share, premix.composition.macroMinerals.sodiumPct! * premixFraction, "sodium %");
    close(mix.sidAminoAcidsPct.lysine.value - basal.sidAminoAcidsPct.lysine.value * share, premix.composition.aminoAcids.sidPct.lysine * premixFraction, "SID lysine %");
  });

  test("at the 32 kg/t label dose the premix supplies exactly the published minimums per kg of feed", () => {
    const rows = premixNutrientContributions(premix);
    const by = (path: string) => rows.find((row) => row.path === path)!.finishedFeedContribution;
    close(by("vitamins.vitaminAIuKg"), 10000, "vitamin A IU/kg feed");
    close(by("traceMineralsPpm.zinc"), 80, "zinc mg/kg feed");
    close(by("traceMineralsPpm.copper"), 90, "copper mg/kg feed");
    close(by("vitamins.biotinMgKg"), 0.1, "biotin mg/kg feed (100 mcg)");
    close(by("macroMinerals.sodiumPct"), 0.154, "sodium % feed (1.54 g/kg)");
    close(by("aminoAcids.totalPct.lysine"), 0.039, "total lysine % feed (0.39 g/kg)");
  });
});

describe("Caremix is formulated exactly like Sustar: through the generic ingredient pipeline", () => {
  const BASAL = ["corn-yellow-dent", "soybean-meal-solvent-extracted", "wheat-bran", "soybean-degummed-oil", "limestone-ground", "dicalcium-phosphate", "sodium-chloride", "l-lysine-hcl", "dl-methionine", "l-threonine", "l-tryptophan", "l-valine"];
  const options = (premixId: string, dose: number): FormulationIngredientOption[] => [
    ...BASAL.map((ingredientId) => ({ ingredientId, pricePerKg: ingredientDefaultPricePerKg(ingredientId) ?? 0, ...(ingredientId === "soybean-degummed-oil" ? { maxInclusionPct: 4 } : {}) })),
    { ingredientId: premixId, pricePerKg: 0, minInclusionPct: dose, maxInclusionPct: dose },
  ];
  /** The same library with Caremix's profile emptied, as it was before the reverse calculation. */
  const emptied: IngredientLibrary = {
    ...library,
    ingredients: library.ingredients.map((row) => row.id !== "caremix-pig-grower" ? row : {
      ...row, aminoAcids: { totalPct: {}, sidDigestibilityPct: {}, sidPct: {} }, macroMinerals: {}, traceMineralsPpm: {}, vitamins: {},
    }),
  };
  const pct = (rows: readonly { ingredientId: string; inclusionPct: number }[], id: string) => rows.find((row) => row.ingredientId === id)?.inclusionPct ?? 0;

  test("Caremix's calcium, sodium and lysine reduce the limestone, salt and L-lysine HCl the optimiser adds", async () => {
    const credited = await formulateLeastCostDiet(phase, "ME", options("caremix-pig-grower", 3.2), library, { explore: false });
    const uncredited = await formulateLeastCostDiet(phase, "ME", options("caremix-pig-grower", 3.2), emptied, { explore: false });
    assert.equal(credited.status, "optimal");
    assert.equal(uncredited.status, "optimal");
    if (credited.status !== "optimal" || uncredited.status !== "optimal") return;
    const withCaremix = credited.solution.formula.ingredients;
    const without = uncredited.solution.formula.ingredients;
    assert.ok(pct(withCaremix, "limestone-ground") < pct(without, "limestone-ground"), "less limestone");
    assert.ok(pct(withCaremix, "sodium-chloride") < pct(without, "sodium-chloride"), "less salt");
    assert.ok(pct(withCaremix, "l-lysine-hcl") < pct(without, "l-lysine-hcl"), "less L-lysine HCl");
    assert.equal(pct(withCaremix, "caremix-pig-grower"), 3.2, "the manufacturer dose is exact");
    assert.equal(buildFormulationAssessment(phase, "ME", credited.solution.formula, library, { checkOptimizerConsistency: true }).verdict, "meets_requirements");
  });

  test("manual analysis of the optimiser's recipe agrees with the optimiser, the evaluate API and MCP", async () => {
    const mcp = await mcpFormulate({
      programme_id: `${PROGRAMME_ID}:${GROWER_PHASE}`,
      ingredient_mode: "selected",
      ingredients: [...BASAL, "caremix-pig-grower"],
      constraints: { "soybean-degummed-oil": { max_percent: 4 } },
    }, { prices: INGREDIENT_DEFAULT_PRICES });
    assert.equal(mcp.status, "optimal");
    if (mcp.status !== "optimal") return;
    assert.equal(mcp.premix_analysis.status, "included");
    if (mcp.premix_analysis.status !== "included") return;
    assert.deepEqual(mcp.premix_analysis.contributions, premixNutrientContributions(commercialPremixById("caremix-pig-grower")!));

    const recipe = mcp.ingredients.map((row) => ({ ingredientId: row.ingredient, inclusionPct: row.percentage }));
    const total = recipe.reduce((sum, row) => sum + row.inclusionPct, 0);
    const manual = buildFormulationAssessment(phase, "ME", { ingredients: recipe.map((row) => ({ ...row, inclusionPct: row.inclusionPct * 100 / total })) }, library);
    assert.deepEqual(mcp.nutritional_validation.hard_requirements.map((row) => [row.label, row.status]), manual.requirements.map((row) => [row.label, row.status]));

    const response = await evaluatePost(new Request("http://localhost/api/feed-formulation/evaluate", {
      method: "POST",
      body: JSON.stringify({ programmeId: PROGRAMME_ID, phaseId: GROWER_PHASE, energySystem: "ME", ingredients: recipe }),
    }));
    const body = await response.json();
    assert.deepEqual(body.assessment.requirements.map((row: { label: string; status: string }) => [row.label, row.status]), manual.requirements.map((row) => [row.label, row.status]));

    const analysis = analyseFormulation({ programme_id: `${PROGRAMME_ID}:${GROWER_PHASE}`, energy_system: "ME", recipe: recipe.map((row) => ({ ingredient: row.ingredientId, percentage: row.inclusionPct })) }, { prices: INGREDIENT_DEFAULT_PRICES });
    assert.equal(analysis.nutritional_validation.overall_status, manual.verdict);
  });

  test("documented Caremix vitamins and trace minerals are no longer documentation gaps; undocumented ones still are", async () => {
    const run = await formulateLeastCostDiet(phase, "ME", options("caremix-pig-grower", 3.2), library, { explore: false });
    assert.equal(run.status, "optimal");
    if (run.status !== "optimal") return;
    const assessment = buildFormulationAssessment(phase, "ME", run.solution.formula, library);
    const gaps = assessment.documentationGaps.map((gap) => gap.label.toLowerCase());
    for (const documented of ["vitamin a", "zinc", "copper"]) assert.ok(!gaps.some((label) => label.includes(documented)), `${documented} is credited`);
    assert.ok(gaps.some((label) => label.includes("selenium")), "grower selenium stays undocumented");
    assert.equal(premixAnalysisForIds(["caremix-pig-grower"]).status, "included");
  });

  test("the premix is stage-specific and only one premix may be used", () => {
    const grower = commercialPremixById("caremix-pig-grower")!;
    assert.equal(commercialPremixCompatibleWithProgramme(grower, PROGRAMME_ID, GROWER_PHASE), true);
    assert.equal(commercialPremixCompatibleWithProgramme(grower, PROGRAMME_ID, FINISHER_PHASE), false);
    assert.equal(commercialPremixCompatibleWithProgramme(commercialPremixById("caremix-pig-weaner")!, PROGRAMME_ID, GROWER_PHASE), false);
    const pool = poolWithProgrammePremix({ "corn-yellow-dent": { role: "available" } }, PROGRAMME_ID, undefined, GROWER_PHASE);
    assert.equal(pool["caremix-pig-grower"]?.fixed, 3.2);
    assert.ok(studioPremixProblems({ ...pool, "sustar-glypro-x912": { role: "fixed", fixed: 0.2 } }, PROGRAMME_ID, GROWER_PHASE).some((problem) => /Only one premix/.test(problem)));
    assert.ok(studioPremixProblems(pool, PROGRAMME_ID, FINISHER_PHASE).some((problem) => /not suitable/.test(problem)));
  });

  test("Sustar X912's profile is unchanged", () => {
    const sustar = commercialPremixById("sustar-glypro-x912")!;
    assert.deepEqual(sustar.composition.traceMineralsPpm, { copper: 13000, iron: 70000, manganese: 30000, zinc: 40000, iodine: 500, selenium: 150 });
    assert.deepEqual(sustar.composition.vitamins, {
      vitaminAIuKg: 28000000, vitaminDIuKg: 8000000, vitaminKMgKg: 9000, vitaminB1MgKg: 9000, riboflavinMgKg: 20000, vitaminB6MgKg: 8000,
      vitaminB12McgKg: 70000, pantothenicAcidMgKg: 45000, niacinMgKg: 80000, folicAcidMgKg: 4000, biotinMgKg: 300,
    });
    assert.deepEqual(sustar.composition.macroMinerals, {});
    assert.deepEqual(sustar.composition.aminoAcids.totalPct, {});
  });
});

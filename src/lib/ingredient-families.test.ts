import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { analyzeDiet } from "./diet-formula";
import { ingredientDefaultPricePerKg } from "./feed-ingredient-prices";
import {
  formulateLeastCostDiet,
  suggestFormulationAdditions,
  type FormulationIngredientOption,
} from "./feed-optimizer";
import { feedProgrammePhaseById } from "./feed-programmes";
import {
  buildFormulationAssessment,
  isFormulationAssessment,
  predatesAggregateLimits,
  type FormulationAssessment,
} from "./formulation-assessment";
import {
  aggregateInclusionRules,
  aggregateMembership,
  brazilianInclusionColumn,
  checkAggregateInclusion,
  phaseInclusionRecommendation,
} from "./ingredient-inclusion-limits";
import {
  INGREDIENT_LIBRARY_SOURCE,
  SOYBEAN_MEAL_FAMILY_ID,
  ingredientLibraryForPhase,
  ingredientLibraryForSpecies,
  loadIngredientLibrarySource,
  type IngredientLibrary,
} from "./ingredient-nutrients";
import type { NutritionPhase } from "./nutrition";

const phase = (programmeId: string, phaseId: string): NutritionPhase => {
  const resolved = feedProgrammePhaseById(programmeId, phaseId);
  assert.ok(resolved, `${programmeId}:${phaseId}`);
  return resolved;
};
const PIG_PRE_STARTER = phase("nursery-pig", "br2024-5-32-35-49d-8.4-17.9kg");
const PIG_STARTER = phase("nursery-pig", "br2024-5-43-49-63d-16-26kg");
const PIG_GROWER = phase("grow-finish-pig", "br2024-5-43-63-91d-26-47kg");
const GESTATION = phase("gestating-gilt-sow", "br2024-6-08-nulliparous-0-85d");
const BOAR = phase("mature-boar", "pic-mature-boar");
const BROILER_GROWER = phase("broiler-standard", "br2024-2-30-17-27d-0.68-1.49kg");
const BROILER_FINISHER = phase("broiler-standard", "br2024-2-30-35-43d-2.29-3.11kg");

const SBM_45 = "soybean-meal-solvent-extracted";
const SBM_48 = "soybean-meal-dehulled-solvent-extracted";
const SBM_GRADES = ["soybean-meal-44-5", SBM_45, "soybean-meal-46-5", SBM_48];
const familyOf = (id: string) => INGREDIENT_LIBRARY_SOURCE.ingredients.find((ingredient) => ingredient.id === id)!.familyId;
const family = (id: string) => INGREDIENT_LIBRARY_SOURCE.families.find((item) => item.id === id);
const priced = (ingredientId: string, extra: Partial<FormulationIngredientOption> = {}): FormulationIngredientOption => {
  const pricePerKg = ingredientDefaultPricePerKg(ingredientId);
  assert.notEqual(pricePerKg, undefined, `${ingredientId} has a planning price`);
  return { ingredientId, pricePerKg: pricePerKg!, ...extra };
};

/** A library whose soybean-meal family ceiling is replaced (or removed) for a controlled test. */
function withSoybeanMealCeiling(library: IngredientLibrary, broilerGrowerMaxPct: number | undefined): IngredientLibrary {
  return {
    ...library,
    families: library.families.map((item) => {
      if (item.id !== SOYBEAN_MEAL_FAMILY_ID) return item;
      if (broilerGrowerMaxPct === undefined) return { ...item, aggregateLimit: undefined };
      const limit = structuredClone(item.aggregateLimit!);
      limit.maxInclusionPct.broiler = { ...limit.maxInclusionPct.broiler, grower: broilerGrowerMaxPct };
      return { ...item, aggregateLimit: limit };
    }),
  };
}

const sbmTotal = (rows: readonly { ingredientId: string; inclusionPct: number }[]) =>
  rows.filter((row) => familyOf(row.ingredientId) === SOYBEAN_MEAL_FAMILY_ID).reduce((sum, row) => sum + row.inclusionPct, 0);

const STARTER_POOL = [
  "corn-yellow-dent", SBM_45, SBM_48, "soybean-full-fat-extruded", "wheat-bran",
  "calcium-carbonate", "dicalcium-phosphate", "sodium-chloride",
  "l-lysine-hcl", "dl-methionine", "l-threonine", "l-tryptophan", "l-valine",
];

describe("ingredient family data integrity", () => {
  test("every one of the 122 ingredients has exactly one valid family", () => {
    assert.equal(INGREDIENT_LIBRARY_SOURCE.ingredients.length, 122);
    const ids = new Set(INGREDIENT_LIBRARY_SOURCE.families.map((item) => item.id));
    assert.equal(ids.size, INGREDIENT_LIBRARY_SOURCE.families.length, "no duplicate family IDs");
    for (const ingredient of INGREDIENT_LIBRARY_SOURCE.ingredients) {
      assert.ok(ids.has(ingredient.familyId), `${ingredient.id} → ${ingredient.familyId}`);
    }
    const { families } = aggregateMembership();
    for (const item of INGREDIENT_LIBRARY_SOURCE.families) assert.ok(families.get(item.id)?.length, `${item.id} has members`);
  });

  test("the loader rejects unknown, duplicate and ambiguous references", () => {
    const unknown = structuredClone(INGREDIENT_LIBRARY_SOURCE);
    unknown.ingredients[0].familyId = "no-such-family";
    assert.throws(() => loadIngredientLibrarySource(unknown), /references unknown family .*no-such-family/);

    const duplicate = structuredClone(INGREDIENT_LIBRARY_SOURCE);
    duplicate.families.push(structuredClone(duplicate.families[0]));
    assert.throws(() => loadIngredientLibrarySource(duplicate), /Duplicate ingredient family ID/);

    const ambiguous = structuredClone(INGREDIENT_LIBRARY_SOURCE);
    ambiguous.constraintGroups[0].members.ingredientIds.push("lard");
    assert.throws(() => loadIngredientLibrarySource(ambiguous), /counts lard more than once/);

    const premixLimit = structuredClone(INGREDIENT_LIBRARY_SOURCE);
    premixLimit.families.find((item) => item.id === "sustar-glypro-x912")!.aggregateLimit = structuredClone(family(SOYBEAN_MEAL_FAMILY_ID)!.aggregateLimit);
    assert.throws(() => loadIngredientLibrarySource(premixLimit), /contains a commercial premix/);
  });

  test("every defined maximum carries auditable provenance", () => {
    const limited = [...INGREDIENT_LIBRARY_SOURCE.families, ...INGREDIENT_LIBRARY_SOURCE.constraintGroups].filter((item) => item.aggregateLimit);
    assert.ok(limited.length >= 10);
    for (const item of limited) {
      const source = item.aggregateLimit!.source;
      assert.ok(source.reference && source.justification && source.addresses, item.id);
      // No family maximum is published by Table 1.01; each is labelled as policy.
      assert.equal(source.type, "feedsport_policy", item.id);
      assert.ok(source.supportingReferences.some((reference) => /Table 1\.01/.test(reference.title)), item.id);
    }
  });

  test("each derived ceiling matches the per-ingredient Table 1.01 maxima it claims to derive from", () => {
    const membership = aggregateMembership();
    const columns = { swine: ["starter", "grower", "finisher", "gestation", "lactation"], broiler: ["starter", "grower"] } as const;
    const items = [
      ...INGREDIENT_LIBRARY_SOURCE.families.map((item) => ({ item, members: membership.families.get(item.id)! })),
      ...INGREDIENT_LIBRARY_SOURCE.constraintGroups.map((item) => ({ item, members: membership.groups.get(item.id)! })),
    ].filter(({ item }) => item.aggregateLimit);
    for (const { item, members } of items) {
      const { maxInclusionPct, source } = item.aggregateLimit!;
      for (const species of ["swine", "broiler"] as const) {
        for (const column of columns[species]) {
          const stored = (maxInclusionPct[species] as Record<string, number> | undefined)?.[column];
          const memberMaxima = members.flatMap((id) => {
            const recommendation = phaseInclusionRecommendation(id, { species, phaseClass: column });
            return recommendation ? [recommendation.maxPct] : [];
          });
          if (stored === undefined) continue;
          assert.ok(memberMaxima.length, `${item.id} ${species} ${column}: some member publishes a maximum`);
          assert.equal(stored, Math.max(...memberMaxima), `${item.id} ${species} ${column} is the most permissive member maximum`);
          if (source.derivation === "identical_member_maximum") {
            assert.equal(memberMaxima.length, members.length, `${item.id} ${species} ${column}: every member publishes a maximum`);
            assert.ok(memberMaxima.every((value) => value === stored), `${item.id} ${species} ${column}: members are identical`);
          }
        }
      }
    }
  });

  test("an unspecified maximum adds no restriction rather than zero", () => {
    const keys = aggregateInclusionRules(PIG_GROWER).map((rule) => rule.key);
    assert.ok(!keys.includes("family:sorghum-grain"), "sorghum has no combined maximum");
    assert.ok(!keys.includes("family:inactive-yeast"), "spent yeast has no combined maximum");
    assert.ok(!keys.includes("group:animal-protein-meals"), "investigated groups are not enforced");
    assert.ok(aggregateInclusionRules(PIG_GROWER).every((rule) => rule.maxPct > 0));
    assert.deepEqual(aggregateInclusionRules(BOAR), [], "boars have no Table 1.01 column");
    const checks = checkAggregateInclusion([{ ingredientId: "sorghum-grain", inclusionPct: 60 }, { ingredientId: "sorghum-grain-high-tannin", inclusionPct: 30 }], PIG_GROWER);
    assert.deepEqual(checks, []);
  });

  test("species and phase resolve to the existing Table 1.01 columns", () => {
    const sbm = (ref: NutritionPhase) => aggregateInclusionRules(ref).find((rule) => rule.key === "family:soybean-meal")!;
    assert.equal(brazilianInclusionColumn(PIG_PRE_STARTER), "starter");
    assert.equal(sbm(PIG_PRE_STARTER).maxPct, 30);
    assert.equal(sbm(PIG_STARTER).maxPct, 30);
    assert.equal(sbm(PIG_GROWER).maxPct, 25);
    assert.equal(sbm(GESTATION).maxPct, 15);
    assert.equal(sbm(BROILER_FINISHER).column, "grower", "broiler finisher uses the grower column");
    assert.equal(sbm(BROILER_FINISHER).maxPct, 35);
    const fat = aggregateInclusionRules(BROILER_GROWER).find((rule) => rule.key === "group:total-added-fat")!;
    assert.equal(fat.maxPct, 7);
  });

  test("a schema-2 library migrates to singleton families with no aggregate limits", () => {
    const legacy = structuredClone(INGREDIENT_LIBRARY_SOURCE) as unknown as Record<string, unknown> & { ingredients: Record<string, unknown>[] };
    legacy.schemaVersion = 2;
    delete legacy.families;
    delete legacy.constraintGroups;
    for (const ingredient of legacy.ingredients) delete ingredient.familyId;
    const migrated = loadIngredientLibrarySource(legacy);
    assert.equal(migrated.schemaVersion, 3);
    assert.ok(migrated.ingredients.every((ingredient) => ingredient.familyId === ingredient.id));
    assert.deepEqual(aggregateInclusionRules(PIG_GROWER, migrated), []);
  });
});

describe("ingredient family membership", () => {
  test("all four soybean meal grades share one family; other soy products do not", () => {
    assert.deepEqual(SBM_GRADES.map(familyOf), SBM_GRADES.map(() => SOYBEAN_MEAL_FAMILY_ID));
    for (const id of ["soybean-degummed-oil", "soybean-acid-oil", "soybean-hulls", "soybean-protein-concentrate", "soybean-full-fat-extruded", "soybean-semi-defatted-extruded"]) {
      assert.notEqual(familyOf(id), SOYBEAN_MEAL_FAMILY_ID, id);
    }
    // Soybean oil and hulls never count toward soybean meal.
    const analysis = analyzeDiet({ ingredients: [{ ingredientId: "corn-yellow-dent", inclusionPct: 90 }, { ingredientId: "soybean-degummed-oil", inclusionPct: 5 }, { ingredientId: "soybean-hulls", inclusionPct: 5 }] });
    assert.equal(analysis.soybeanMealPct, 0);
  });

  test("corn grain grades form one family; processed corn and co-products stay separate", () => {
    const grades = ["corn-grain-minus-1-sd-dm", "corn-yellow-dent", "corn-grain-plus-1-sd-dm", "corn-high-lysine-grain", "corn-high-oil-grain"];
    assert.ok(grades.every((id) => familyOf(id) === "corn-grain"));
    for (const id of ["corn-pre-cooked", "corn-ddgs", "corn-ddg-high-protein", "corn-gluten-meal-60", "corn-germ", "corn-oil"]) assert.notEqual(familyOf(id), "corn-grain", id);
  });

  test("distinct protein meals and co-products keep distinct families", () => {
    const ids = ["fish-meal-62", "feather-meal-84-cp", "bovine-meat-and-bone-meal-48-cp", "pork-meat-and-bone-meal", "poultry-by-product-meal",
      "poultry-feather-byproduct-meal", "blood-meal", "cottonseed-meal-43", "canola-meal", "corn-ddgs", "corn-ddg-high-protein", "wheat-flour", "wheat-dark-flour",
      "dicalcium-phosphate", "monocalcium-phosphate"];
    assert.equal(new Set(ids.map(familyOf)).size, ids.length);
    assert.equal(familyOf("limestone-ground"), familyOf("calcium-carbonate"));
    assert.equal(familyOf("fish-meal-54"), familyOf("fish-meal-62"));
  });

  test("commercial premixes are singleton families without aggregate limits", () => {
    const premixes = INGREDIENT_LIBRARY_SOURCE.ingredients.filter((ingredient) => ingredient.category === "vitamin_mineral_premix");
    assert.equal(premixes.length, 9);
    for (const premix of premixes) {
      assert.equal(premix.familyId, premix.id);
      assert.equal(family(premix.familyId)?.aggregateLimit, undefined);
    }
    for (const rule of aggregateInclusionRules(PIG_GROWER)) {
      assert.ok(!premixes.some((premix) => rule.memberIngredientIds.includes(premix.id)), rule.key);
    }
  });

  test("the total-added-fat group counts each fat once and nothing that merely contains fat", () => {
    const fat = aggregateInclusionRules(PIG_GROWER).find((rule) => rule.key === "group:total-added-fat")!;
    assert.equal(new Set(fat.memberIngredientIds).size, fat.memberIngredientIds.length);
    assert.ok(fat.memberIngredientIds.includes("lard") && fat.memberIngredientIds.includes("soybean-degummed-oil"));
    for (const id of ["soybean-full-fat-extruded", "rice-bran", "poultry-by-product-high-fat-meal", "corn-high-oil-grain"]) assert.ok(!fat.memberIngredientIds.includes(id), id);
    const [check] = checkAggregateInclusion([
      { ingredientId: "lard", inclusionPct: 3 },
      { ingredientId: "soybean-degummed-oil", inclusionPct: 3 },
      { ingredientId: "corn-yellow-dent", inclusionPct: 94 },
    ], PIG_GROWER).filter((row) => row.rule.kind === "group");
    assert.equal(check.actualPct, 6);
    assert.equal(check.exceeds, true, "6% added fat exceeds the 5% pig grower ceiling");
  });
});

describe("aggregate constraint enforcement (controlled 25% soybean-meal fixture)", () => {
  const library = withSoybeanMealCeiling(ingredientLibraryForPhase(BROILER_GROWER), 25);
  const recipe = (sbm45: number, sbm48: number) => [
    { ingredientId: SBM_45, inclusionPct: sbm45 },
    { ingredientId: SBM_48, inclusionPct: sbm48 },
    { ingredientId: "corn-yellow-dent", inclusionPct: 100 - sbm45 - sbm48 },
  ];

  test("combined 35% fails and combined 25% passes against a 25% family maximum", () => {
    const [over] = checkAggregateInclusion(recipe(20, 15), BROILER_GROWER, library).filter((row) => row.rule.id === SOYBEAN_MEAL_FAMILY_ID);
    assert.equal(over.actualPct, 35);
    assert.equal(over.rule.maxPct, 25);
    assert.equal(over.exceeds, true);
    assert.deepEqual(over.contributions, [{ ingredientId: SBM_45, inclusionPct: 20 }, { ingredientId: SBM_48, inclusionPct: 15 }]);
    const [at] = checkAggregateInclusion(recipe(15, 10), BROILER_GROWER, library).filter((row) => row.rule.id === SOYBEAN_MEAL_FAMILY_ID);
    assert.equal(at.exceeds, false);
  });

  test("a fixed combination above the family maximum is rejected with a clear message", async () => {
    const options = [
      priced("corn-yellow-dent"),
      priced(SBM_45, { minInclusionPct: 20, maxInclusionPct: 20 }),
      priced(SBM_48, { minInclusionPct: 15, maxInclusionPct: 15 }),
      priced("dicalcium-phosphate"), priced("calcium-carbonate"), priced("sodium-chloride"),
    ];
    const result = await formulateLeastCostDiet(BROILER_GROWER, "ME", options, library, { explore: false });
    assert.equal(result.status, "error");
    assert.match((result as { message: string }).message, /Soybean meal family: fixed or minimum inclusions add up to 35%.*combined maximum of 25%/);
  });

  test("individual ingredient maxima are still enforced", async () => {
    const options = [priced("corn-yellow-dent"), priced(SBM_45, { minInclusionPct: 36 })];
    const result = await formulateLeastCostDiet(BROILER_GROWER, "ME", options, ingredientLibraryForPhase(BROILER_GROWER), { explore: false });
    assert.equal(result.status, "error");
    assert.match((result as { message: string }).message, /minimum 36% exceeds maximum 35%/);
  });

  test("the optimizer caps the sum, which it otherwise exceeds", async () => {
    // Soybean meal priced far below corn, with oil to offset its lower energy:
    // the optimizer uses as much soybean meal as it may.
    const options = [...STARTER_POOL, "soybean-degummed-oil"].map((id) => priced(id, id.startsWith("soybean-meal") ? { pricePerKg: 0.1 } : {}));
    const capped = await formulateLeastCostDiet(BROILER_GROWER, "ME", options, library, { explore: false });
    const uncapped = await formulateLeastCostDiet(BROILER_GROWER, "ME", options, withSoybeanMealCeiling(library, undefined), { explore: false });
    assert.equal(capped.status, "optimal");
    assert.equal(uncapped.status, "optimal");
    if (capped.status !== "optimal" || uncapped.status !== "optimal") return;
    assert.ok(sbmTotal(uncapped.solution.formula.ingredients) > 25 + 1e-6, "without a family rule the grades stack");
    assert.ok(sbmTotal(capped.solution.formula.ingredients) <= 25 + 1e-6);
    // Each grade alone stays within its own Table 1.01 maximum either way.
    for (const row of uncapped.solution.formula.ingredients) {
      if (SBM_GRADES.includes(row.ingredientId)) assert.ok(row.inclusionPct <= 35 + 1e-6);
    }
  });
});

describe("aggregate limits across formulation paths", () => {
  test("least cost and every alternative respect the canonical family ceilings", async () => {
    const library = ingredientLibraryForPhase(PIG_STARTER);
    // Both priced soybean-meal grades cheap enough that alternatives want both.
    const options = STARTER_POOL.map((id) => priced(id));
    const result = await formulateLeastCostDiet(PIG_STARTER, "ME", options, library);
    assert.equal(result.status, "optimal");
    if (result.status !== "optimal") return;
    const recipes = [result.solution, ...result.alternatives.map((alternative) => alternative.solution), ...result.ingredientOpportunities.flatMap((o) => o.points.map((p) => p.recipe))];
    assert.ok(recipes.length > 1);
    for (const recipe of recipes) {
      for (const check of checkAggregateInclusion(recipe.formula.ingredients, PIG_STARTER, library)) {
        assert.equal(check.exceeds, false, `${check.rule.key} ${check.actualPct}% > ${check.rule.maxPct}%`);
      }
      assert.ok(sbmTotal(recipe.formula.ingredients) <= 30 + 1e-6);
    }
    for (const alternative of result.alternatives) {
      const assessment = buildFormulationAssessment(PIG_STARTER, "ME", alternative.solution.formula, library, { checkOptimizerConsistency: true });
      assert.deepEqual(assessment.consistencyErrors, [], alternative.id);
    }
  });

  test("ingredient completion projects recipes within family ceilings", async () => {
    const library = ingredientLibraryForPhase(PIG_GROWER);
    const current = ["corn-yellow-dent", SBM_45, SBM_48].map((id) => priced(id, id.startsWith("soybean-meal") ? { pricePerKg: 0.2 } : {}));
    const completion = await suggestFormulationAdditions(PIG_GROWER, "ME", current, library);
    assert.ok(completion.status === "suggested" || completion.status === "complete", "message" in completion ? completion.message : "");
    if (completion.status !== "suggested" && completion.status !== "complete") return;
    const projected = Object.entries(completion.projectedInclusionPct).map(([ingredientId, inclusionPct]) => ({ ingredientId, inclusionPct }));
    assert.ok(sbmTotal(projected) <= 25 + 1e-6, `projected soybean meal ${sbmTotal(projected)}%`);
  });

  test("a manual recipe over a family ceiling fails its hard requirements with full detail", () => {
    const library = ingredientLibraryForPhase(PIG_GROWER);
    const formula = { ingredients: [
      { ingredientId: SBM_45, inclusionPct: 20 },
      { ingredientId: SBM_48, inclusionPct: 15 },
      { ingredientId: "corn-yellow-dent", inclusionPct: 65 },
    ] };
    const assessment = buildFormulationAssessment(PIG_GROWER, "ME", formula, library);
    assert.equal(assessment.verdict, "fails_requirements");
    const check = assessment.requirements.find((row) => row.id === "family:soybean-meal")!;
    assert.equal(check.label, "Soybean meal family");
    assert.equal(check.status, "not_met");
    assert.equal(check.actual, 35);
    assert.equal(check.bound, 25);
    assert.deepEqual(check.contributions, [{ ingredientId: SBM_45, value: 20 }, { ingredientId: SBM_48, value: 15 }]);
    assert.equal(check.aggregate?.source.type, "feedsport_policy");
    assert.match(check.aggregate!.source.description, /Table 1\.01\), grower column/);
    assert.match(assessment.summary, /Soybean meal family exceeds its combined maximum \(35% > 25%\)/);
  });

  test("a recipe within every ceiling reports combined inclusion without failing", () => {
    const library = ingredientLibraryForPhase(PIG_GROWER);
    const formula = { ingredients: [{ ingredientId: SBM_45, inclusionPct: 14.5 }, { ingredientId: SBM_48, inclusionPct: 10 }, { ingredientId: "corn-yellow-dent", inclusionPct: 75.5 }] };
    const check = buildFormulationAssessment(PIG_GROWER, "ME", formula, library).requirements.find((row) => row.id === "family:soybean-meal")!;
    assert.equal(check.status, "met");
    assert.equal(check.actual, 24.5);
  });

  test("nutrient contributions and costs are unchanged by family data", () => {
    // The same recipe analysed against a library with no family data at all.
    const legacy = structuredClone(INGREDIENT_LIBRARY_SOURCE) as unknown as Record<string, unknown> & { ingredients: Record<string, unknown>[] };
    legacy.schemaVersion = 2;
    delete legacy.families;
    delete legacy.constraintGroups;
    for (const ingredient of legacy.ingredients) delete ingredient.familyId;
    const withoutFamilies = ingredientLibraryForSpecies("swine", loadIngredientLibrarySource(legacy));
    const formula = { ingredients: [{ ingredientId: SBM_45, inclusionPct: 20 }, { ingredientId: SBM_48, inclusionPct: 15 }, { ingredientId: "corn-yellow-dent", inclusionPct: 65 }] };
    const prices = [{ ingredientId: SBM_45, pricePerKg: 0.58 }, { ingredientId: SBM_48, pricePerKg: 0.68 }, { ingredientId: "corn-yellow-dent", pricePerKg: 0.35 }];
    const current = analyzeDiet(formula, prices, ingredientLibraryForPhase(PIG_GROWER));
    const before = analyzeDiet(formula, prices, withoutFamilies);
    // Only the soybean-meal total depends on family data; schema-2 records have none.
    assert.deepEqual({ ...current, soybeanMealPct: 0 }, { ...before, soybeanMealPct: 0 });
    assert.equal(current.soybeanMealPct, 35);
  });
});

describe("historical assessments", () => {
  test("assessments saved before aggregate limits stay readable and are flagged, never re-scored", () => {
    const library = ingredientLibraryForPhase(PIG_GROWER);
    const formula = { ingredients: [{ ingredientId: SBM_45, inclusionPct: 20 }, { ingredientId: SBM_48, inclusionPct: 15 }, { ingredientId: "corn-yellow-dent", inclusionPct: 65 }] };
    const current = buildFormulationAssessment(PIG_GROWER, "ME", formula, library);
    assert.equal(predatesAggregateLimits(current), false);

    // As stored before this change: no policy marker, no aggregate rows, verdict as originally assessed.
    const saved = JSON.parse(JSON.stringify({ ...current, verdict: "meets_requirements", requirements: current.requirements.filter((row) => !row.aggregate) })) as FormulationAssessment;
    delete (saved as { inclusionPolicy?: string }).inclusionPolicy;
    assert.equal(isFormulationAssessment(saved), true, "still a readable schema-2 assessment");
    assert.equal(predatesAggregateLimits(saved), true);
    assert.equal(saved.verdict, "meets_requirements", "the original result is kept as it was");
    assert.equal(predatesAggregateLimits({ schemaVersion: 1 }), false, "schema-1 has its own legacy note");
  });
});

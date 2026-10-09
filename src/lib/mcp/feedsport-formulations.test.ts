import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Snapshot } from "@/components/formulation-studio/engine";
import { mergeIngredientPrices } from "@/lib/feed-ingredient-prices";

import {
  addFormulationAdviceTool,
  applySuggestion,
  getSavedFormulationTool,
  listSavedFormulationsTool,
  listUsersTool,
  snapshotToolInputs,
  type FormulationStore,
  type StoredAdvice,
  type StoredFormulation,
} from "./feedsport-formulations";
import { FeedSportInputError, formulate, type FeedSportServiceContext } from "./feedsport-service";

const context = async (): Promise<FeedSportServiceContext> => ({ prices: mergeIngredientPrices([]) });

const snapshot: Snapshot = {
  programmeId: "nursery-pig",
  phaseId: "br2024-5-32-35-49d-8.4-17.9kg",
  goal: "least_cost",
  batch: 100,
  pool: {
    "corn-yellow-dent": { role: "available", price: 320 },
    "soybean-meal-dehulled-solvent-extracted": { role: "available", max: 30 },
    "soybean-full-fat-extruded": { role: "available" },
    "soybean-degummed-oil": { role: "available" },
    "corn-oil": { role: "excluded" },
    "dicalcium-phosphate": { role: "available" },
    "limestone-ground": { role: "available" },
    "sodium-chloride": { role: "available" },
    "l-lysine-hcl": { role: "available" },
    "dl-methionine": { role: "available" },
    "l-threonine": { role: "available" },
    "l-tryptophan": { role: "available" },
    "l-valine": { role: "available" },
    "sustar-glypro-x911": { role: "fixed", fixed: 0.2, price: 1500 }, // mocked supplier quote for tests only
  },
};

function memoryStore(): FormulationStore & { advice: StoredAdvice[] } {
  const advice: StoredAdvice[] = [];
  const formulations: StoredFormulation[] = [
    {
      id: "f1",
      ownerId: "u1",
      name: "Nursery starter",
      createdAt: "2026-10-01T00:00:00Z",
      updatedAt: "2026-10-02T00:00:00Z",
      versions: [
        { version: 1, createdAt: "2026-10-01T00:00:00Z", snapshot, summary: { status: "optimal", costT: 412.5, recipe: [{ id: "corn-yellow-dent", pct: 60 }] } },
        { version: 2, createdAt: "2026-10-02T00:00:00Z", snapshot: { ...snapshot, goal: "simpler" }, summary: { status: "optimal", costT: 418 } },
      ],
      advice: [],
    },
    { id: "f2", ownerId: "u2", name: "Grower", createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z", versions: [{ version: 1, createdAt: "2026-09-01T00:00:00Z", snapshot, summary: { status: "infeasible" } }], advice: [] },
  ];
  return {
    advice,
    listUsers: async () => [
      { id: "u1", email: "farmer@example.com", name: "Tendai Moyo", createdAt: "2026-09-30T00:00:00Z" },
      { id: "u2", email: "other@example.com", organisation: "Acme Pigs", createdAt: "2026-08-30T00:00:00Z" },
    ],
    listFormulations: async () => formulations.map((f) => ({ ...f, advice: advice.filter((a) => a.formulationId === f.id) })),
    getFormulation: async (id) => {
      const f = formulations.find((x) => x.id === id);
      return f ? { ...f, advice: advice.filter((a) => a.formulationId === id) } : null;
    },
    addAdvice: async (input) => {
      const saved = { ...input, id: `a${advice.length + 1}`, createdAt: "2026-10-09T00:00:00Z" };
      advice.unshift(saved);
      return saved;
    },
  };
}

describe("saved formulations for the advisor", () => {
  it("maps a studio snapshot onto selected-mode tool inputs", () => {
    const inputs = snapshotToolInputs(snapshot);
    assert.equal(inputs.programme_id, "nursery-pig:br2024-5-32-35-49d-8.4-17.9kg");
    assert.equal(inputs.ingredient_mode, "selected");
    assert.ok(!inputs.ingredients.includes("corn-oil"), "excluded ingredients are not offered");
    assert.deepEqual(inputs.constraints["corn-yellow-dent"], { price_per_tonne: 320 });
    assert.deepEqual(inputs.constraints["soybean-meal-dehulled-solvent-extracted"], { max_percent: 30 });
    assert.deepEqual(inputs.constraints["sustar-glypro-x911"], { price_per_tonne: 1500, min_percent: 0.2, max_percent: 0.2 });
    assert.equal(snapshotToolInputs({ ...snapshot, goal: "less_sbm" }).objective, "low_soy");
  });

  it("produces inputs the formulate tool accepts", async () => {
    const result = await formulate(snapshotToolInputs(snapshot), await context());
    assert.equal(result.status, "optimal");
  });

  it("lists users with their formulation counts", async () => {
    const { users } = await listUsersTool({ query: "acme" }, memoryStore());
    assert.equal(users.length, 1);
    assert.equal(users[0].email, "other@example.com");
    assert.equal(users[0].formulation_count, 1);
  });

  it("filters formulations by user email and reports the latest version", async () => {
    const result = await listSavedFormulationsTool({ user: "farmer@example.com" }, memoryStore());
    assert.equal(result.total, 1);
    assert.equal(result.formulations[0].latest_version, 2);
    assert.equal(result.formulations[0].owner.email, "farmer@example.com");
    await assert.rejects(listSavedFormulationsTool({ user: "nobody" }, memoryStore()), FeedSportInputError);
  });

  it("returns a chosen version with reproducible tool inputs", async () => {
    const result = await getSavedFormulationTool({ formulation_id: "f1", version: 1 }, memoryStore());
    assert.equal(result.version.version, 1);
    assert.equal(result.versions.length, 2);
    assert.equal(result.tool_inputs.objective, "least_cost");
    assert.equal(result.analyse_formulation_input?.recipe[0].ingredient, "corn-yellow-dent");
    await assert.rejects(getSavedFormulationTool({ formulation_id: "f1", version: 9 }, memoryStore()), FeedSportInputError);
  });

  it("applies suggested changes without touching the saved snapshot", () => {
    const next = applySuggestion(snapshot, {
      objective: "low_soy",
      changes: [
        { ingredient: "corn-oil", role: "available" },
        { ingredient: "soybean-meal-dehulled-solvent-extracted", max_percent: 25 },
        { ingredient: "l-valine", remove: true },
      ],
    });
    assert.equal(next.goal, "less_sbm");
    assert.equal(next.pool["corn-oil"].role, "available");
    assert.equal(next.pool["soybean-meal-dehulled-solvent-extracted"].max, 25);
    assert.equal(next.pool["l-valine"], undefined);
    assert.equal(snapshot.pool["corn-oil"].role, "excluded");
    assert.equal(snapshot.pool["soybean-meal-dehulled-solvent-extracted"].max, 30);
    assert.throws(() => applySuggestion(snapshot, { changes: [{ ingredient: "l-valine", role: "required" }] }), FeedSportInputError);
  });

  it("previews advice on a dry run and saves it otherwise", async () => {
    const store = memoryStore();
    const input = {
      formulation_id: "f1",
      author: "Dr Nutritionist",
      advice: "Try capping soybean meal at 25%.",
      suggestion: { changes: [{ ingredient: "soybean-meal-dehulled-solvent-extracted", max_percent: 25 }] },
    };
    const preview = await addFormulationAdviceTool({ ...input, dry_run: true }, store, context);
    assert.equal(preview.saved, false);
    assert.equal(preview.suggestion_check?.status, "optimal");
    assert.equal(store.advice.length, 0);

    const saved = await addFormulationAdviceTool(input, store, context);
    assert.equal(saved.saved, true);
    assert.equal(store.advice.length, 1);
    assert.equal(store.advice[0].version, 2);
    assert.equal(store.advice[0].suggestedSnapshot?.pool["soybean-meal-dehulled-solvent-extracted"].max, 25);
  });
});

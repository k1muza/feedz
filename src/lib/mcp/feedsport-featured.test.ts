import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import type { Snapshot } from "@/components/formulation-studio/engine";
import { mergeIngredientPrices } from "@/lib/feed-ingredient-prices";

import {
  featuredSnapshot,
  listFeaturedTool,
  saveFeaturedTool,
  setFeaturedPublishedTool,
  type FeaturedStore,
  type StoredFeatured,
} from "./feedsport-featured";
import { snapshotToolInputs } from "./feedsport-formulations";
import { FeedSportInputError, formulate, type FeedSportServiceContext } from "./feedsport-service";

const context = async (): Promise<FeedSportServiceContext> => ({ prices: mergeIngredientPrices([]) });

function memoryStore(): FeaturedStore & { rows: Map<string, StoredFeatured> } {
  const rows = new Map<string, StoredFeatured>();
  return {
    rows,
    list: async () => [...rows.values()].sort((a, b) => a.sortOrder - b.sortOrder),
    get: async (id) => rows.get(id) ?? null,
    upsert: async (f) => {
      rows.set(f.id, f);
      return f;
    },
  };
}

const grower = {
  id: "pig-grower-test",
  name: "Pig grower test",
  description: "A maize–soya grower with lysine.",
  programme_id: "grow-finish-pig:br2024-5-43-63-91d-26-47kg",
  ingredients: [
    { ingredient: "corn-yellow-dent" },
    { ingredient: "soybean-meal-solvent-extracted" },
    { ingredient: "wheat-bran", max_percent: 10 },
    { ingredient: "soybean-degummed-oil" },
    { ingredient: "l-lysine-hcl" },
    { ingredient: "l-threonine" },
    { ingredient: "dl-methionine" },
    { ingredient: "l-tryptophan" },
    { ingredient: "limestone-ground" },
    { ingredient: "dicalcium-phosphate" },
    { ingredient: "sodium-chloride" },
  ],
};

describe("featured formulations seeded by the migration", () => {
  const sql = readFileSync("supabase/migrations/20261009030000_featured_formulations.sql", "utf8");
  const snapshots = [...sql.matchAll(/'(\{"programmeId".*?\})'::jsonb/g)].map((m) => JSON.parse(m[1].replace(/''/g, "'")) as Snapshot);

  it("seeds the five original starting points", () => {
    assert.equal(snapshots.length, 5);
  });

  // One that stops formulating would quietly vanish from Home.
  it("still formulate to a valid recipe at planning prices", async () => {
    for (const snap of snapshots) {
      const result = await formulate(snapshotToolInputs(snap), await context());
      assert.equal(result.status, "optimal", snap.programmeId + ":" + snap.phaseId);
    }
  });
});

describe("featured formulation authoring", () => {
  it("builds a studio snapshot without prices", () => {
    const snap = featuredSnapshot({ ...grower, objective: "low_soy", batch_kg: 500 });
    assert.equal(snap.programmeId, "grow-finish-pig");
    assert.equal(snap.phaseId, "br2024-5-43-63-91d-26-47kg");
    assert.equal(snap.goal, "less_sbm");
    assert.equal(snap.batch, 500);
    assert.deepEqual(snap.pool["wheat-bran"], { role: "available", max: 10 });
    assert.ok(Object.values(snap.pool).every((entry) => entry.price === undefined));
    assert.throws(() => featuredSnapshot({ ...grower, ingredients: [...grower.ingredients, { ingredient: "corn-yellow-dent" }] }), FeedSportInputError);
    assert.throws(() => featuredSnapshot({ ...grower, ingredients: [{ ingredient: "corn-yellow-dent", role: "required" }] }), FeedSportInputError);
  });

  it("previews, saves with defaults, and keeps settings when replacing", async () => {
    const store = memoryStore();
    const preview = await saveFeaturedTool({ ...grower, dry_run: true }, store, context);
    assert.equal(preview.saved, false);
    assert.equal(store.rows.size, 0);

    const created = await saveFeaturedTool(grower, store, context);
    assert.equal(created.status, "created");
    assert.match(created.card?.requirements_met ?? "", /^\d+ of \d+$/);
    const row = store.rows.get("pig-grower-test")!;
    assert.equal(row.author, "FeedSport Nutrition Team");
    assert.equal(row.published, true);
    assert.equal(row.sortOrder, 100);

    await setFeaturedPublishedTool({ id: "pig-grower-test", published: false }, store);
    const updated = await saveFeaturedTool({ ...grower, name: "Renamed", sort_order: 5 }, store, context);
    assert.equal(updated.status, "updated");
    assert.equal(store.rows.get("pig-grower-test")!.published, false, "replacing keeps the published flag");
    assert.equal(store.rows.get("pig-grower-test")!.sortOrder, 5);

    const listed = await listFeaturedTool(store);
    assert.equal(listed.featured[0].name, "Renamed");
  });

  it("refuses to save a formulation FeedSport cannot formulate", async () => {
    const store = memoryStore();
    const result = await saveFeaturedTool(
      { ...grower, id: "too-thin", ingredients: [{ ingredient: "wheat-bran" }, { ingredient: "sodium-chloride" }] },
      store,
      context,
    );
    assert.equal(result.status, "rejected");
    assert.equal(store.rows.size, 0);
  });
});

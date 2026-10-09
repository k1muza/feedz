import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createMcpHandler } from "@modelcontextprotocol/server";

import type { Snapshot } from "@/components/formulation-studio/engine";
import { mergeIngredientPrices } from "@/lib/feed-ingredient-prices";

import type { FeaturedStore, StoredFeatured } from "./feedsport-featured";
import type { FormulationStore, StoredAdvice } from "./feedsport-formulations";
import { createFeedSportMcpServer } from "./feedsport-mcp-server";

// Write tools are exercised through the real MCP request path, where input
// validation happens: dry_run and unknown fields must never lead to a save.

const snapshot: Snapshot = {
  programmeId: "grow-finish-pig",
  phaseId: "br2024-5-43-63-91d-26-47kg",
  goal: "least_cost",
  batch: 1000,
  pool: Object.fromEntries(
    ["corn-yellow-dent", "soybean-meal-solvent-extracted", "soybean-degummed-oil", "l-lysine-hcl", "l-threonine", "dl-methionine", "l-tryptophan", "limestone-ground", "dicalcium-phosphate", "sodium-chloride"].map((id) => [id, { role: "available" as const }]),
  ),
};

const featuredInput = {
  id: "pig-grower-test",
  name: "Pig grower test",
  description: "Test card.",
  programme_id: "grow-finish-pig:br2024-5-43-63-91d-26-47kg",
  ingredients: Object.keys(snapshot.pool).map((ingredient) => ({ ingredient })),
};

function stores() {
  const featured = new Map<string, StoredFeatured>();
  const advice: StoredAdvice[] = [];
  const featuredStore: FeaturedStore = {
    list: async () => [...featured.values()],
    get: async (id) => featured.get(id) ?? null,
    upsert: async (f) => (featured.set(f.id, f), f),
  };
  const formulationStore: FormulationStore = {
    listUsers: async () => [{ id: "u1", email: "farmer@example.com", createdAt: "2026-10-01T00:00:00Z" }],
    listFormulations: async () => [],
    getFormulation: async (id) =>
      id === "f1"
        ? { id, ownerId: "u1", name: "Grower", createdAt: "", updatedAt: "", versions: [{ version: 1, createdAt: "", snapshot, summary: { status: "optimal" } }], advice: [] }
        : null,
    addAdvice: async (a) => {
      const saved = { ...a, id: "a1", createdAt: "" };
      advice.push(saved);
      return saved;
    },
  };
  return { featured, advice, featuredStore, formulationStore };
}

async function call(handler: ReturnType<typeof createMcpHandler>, name: string, args: unknown) {
  const response = await handler.fetch(
    new Request("http://test/api/mcp/advisor", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream", "mcp-protocol-version": "2025-06-18" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
    }),
  );
  const line = (await response.text()).split("\n").find((l) => l.startsWith("data:"));
  return JSON.parse(line!.slice(5)) as { result?: { isError?: boolean; structuredContent?: Record<string, unknown> }; error?: unknown };
}

function server() {
  const s = stores();
  const handler = createMcpHandler(() =>
    createFeedSportMcpServer(async () => mergeIngredientPrices([]), { formulations: s.formulationStore, featured: s.featuredStore }),
  );
  return { ...s, handler };
}

describe("advisor write tools", () => {
  it("save_featured_formulation with dry_run saves nothing", async () => {
    const { handler, featured } = server();
    const res = await call(handler, "save_featured_formulation", { ...featuredInput, dry_run: true });
    assert.equal(res.result?.structuredContent?.saved, false);
    assert.equal(featured.size, 0);
  });

  it("save_featured_formulation refuses unknown fields instead of dropping them", async () => {
    const { handler, featured } = server();
    const res = await call(handler, "save_featured_formulation", { ...featuredInput, dryrun: true });
    assert.ok(res.error || res.result?.isError, "expected a validation error");
    assert.equal(featured.size, 0);
  });

  it("preview_featured_formulation never saves", async () => {
    const { handler, featured } = server();
    const res = await call(handler, "preview_featured_formulation", featuredInput);
    assert.equal(res.result?.structuredContent?.status, "preview");
    assert.equal(featured.size, 0);
  });

  it("save_featured_formulation saves without dry_run", async () => {
    const { handler, featured } = server();
    const res = await call(handler, "save_featured_formulation", featuredInput);
    assert.equal(res.result?.structuredContent?.saved, true);
    assert.equal(featured.size, 1);
  });

  it("add_formulation_advice with dry_run saves nothing", async () => {
    const { handler, advice } = server();
    const res = await call(handler, "add_formulation_advice", { formulation_id: "f1", author: "Dr N", advice: "Check lysine.", dry_run: true });
    assert.equal(res.result?.structuredContent?.saved, false);
    assert.equal(advice.length, 0);
  });

  it("set_featured_formulation_published refuses unknown fields", async () => {
    const { handler, featured } = server();
    await call(handler, "save_featured_formulation", featuredInput);
    const res = await call(handler, "set_featured_formulation_published", { id: featuredInput.id, published: false, dry_run: true });
    assert.ok(res.error || res.result?.isError, "expected a validation error");
    assert.equal(featured.get(featuredInput.id)?.published, true, "the card stays published");
  });
});

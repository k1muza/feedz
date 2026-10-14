import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CatalogueIngredient } from "@/lib/studio-catalogue";
import type { StudioPhase, StudioProgrammeData } from "@/lib/studio-programmes";

import { FEED_NUTRIENTS } from "@/lib/feed-nutrients";

import { NUTRIENTS, fmtContent, nutrientById, nutrientContent, nutrientCost, phaseInclusionLimit, phaseParts, phaseRequirement, referenceIngredients } from "./nutrient-data";

const ME = nutrientById("metabolizable-energy")!;
const LYS = nutrientById("sid-lysine")!;
const MC = nutrientById("sid-methionine-cysteine")!;
const CF = nutrientById("crude-fibre")!;

function ingredient(over: Partial<CatalogueIngredient>): CatalogueIngredient {
  return {
    id: "x", name: "X", aliases: [], category: "Cereal", price: null,
    nutrients: { mePig: null, mePoultry: null, cp: null, lys: null, mc: null, thr: null, ca: null, ap: null, na: null, cf: null },
    expected: ["mePig", "cp", "lys", "mc", "thr", "ca", "ap", "na"],
    limits: [], family: { id: "x", name: "X", memberIds: ["x"], combinedLimits: [] },
    nutritionSource: { publisher: "", title: "", year: null, url: null, basis: "as-fed", sourceTable: null, sourcePage: null, verificationStatus: "published_reference", notes: [] },
    requirementValues: {}, requirementMissing: {}, nutrientSources: {},
    ...over,
  };
}

const phase = (over: Partial<StudioPhase>): StudioPhase => ({
  id: "p1", label: "Grower: 26–47 kg", weightRange: "26–47 kg", sourceTable: "5.43", sourcePage: 1, limitsKey: "swine:grower", columnLabel: "grower",
  requirements: [], programmeLimits: [], constraintIds: [], ...over,
});

const data = {
  requirementFields: [
    { nutrientId: "metabolizable-energy", name: "Metabolizable energy", unit: "kcal/kg", kind: "target" },
    { nutrientId: "sid-lysine", name: "SID lysine", unit: "%", kind: "minimum" },
  ],
  programmes: [],
  limits: { "swine:grower": [{ id: "soy", name: "Soybean meal", maxPct: 30 }] },
  aggregateLimits: {},
  limitsSource: "",
  constraintMeta: { swine: {}, broiler: {} },
} as unknown as StudioProgrammeData;

describe("nutrient content", () => {
  it("reads the optimiser's values, so synthetic amino acids count", () => {
    const dlMet = ingredient({ category: "Amino acid", expected: [], requirementValues: { swine: { "sid-met-cys": 99.5 } } });
    assert.equal(nutrientContent(dlMet, MC, "swine"), 99.5);
    assert.equal(nutrientContent(dlMet, LYS, "swine"), 0, "absent from a complete profile means none");
  });

  it("keeps missing data apart from none", () => {
    const meal = ingredient({ requirementValues: { swine: { "energy-me": 2400 } }, requirementMissing: { swine: ["sid-lysine"] } });
    assert.equal(nutrientContent(meal, LYS, "swine"), null);
    assert.equal(nutrientContent(meal, ME, "swine"), 2400);
    assert.equal(nutrientContent(meal, ME, "broiler"), null, "not in the poultry library");
  });

  it("treats fibre as missing only for feedstuffs", () => {
    assert.equal(nutrientContent(ingredient({}), CF, "swine"), null);
    assert.equal(nutrientContent(ingredient({ category: "Oil and fat", expected: ["mePig"] }), CF, "swine"), 0);
    assert.equal(nutrientContent(ingredient({ nutrients: { ...ingredient({}).nutrients, cf: 2.1 } }), CF, "swine"), 2.1);
  });

  it("leaves commercial premixes out", () => {
    const premix = ingredient({ id: "pmx", premix: {} as CatalogueIngredient["premix"] });
    assert.deepEqual(referenceIngredients([ingredient({}), premix]).map((g) => g.id), ["x"]);
  });
});

describe("nutrient cost", () => {
  const price = { usdPerTonne: 600, market: "", asOf: "", sourceLabel: "" };
  it("prices energy per Mcal and other nutrients per kg", () => {
    assert.equal(nutrientCost(ingredient({ price }), ME, 3000), 0.2);
    assert.equal(nutrientCost(ingredient({ price }), LYS, 3), 20);
  });
  it("has no cost without a price or any content", () => {
    assert.equal(nutrientCost(ingredient({}), LYS, 3), null);
    assert.equal(nutrientCost(ingredient({ price }), LYS, 0), null);
    assert.equal(nutrientCost(ingredient({ price }), LYS, null), null);
  });
});

describe("programme lookups", () => {
  it("finds the requirement by field name", () => {
    const ph = phase({ requirements: [3300, 0.98] });
    assert.equal(phaseRequirement(data, ph, ME), 3300);
    assert.equal(phaseRequirement(data, ph, LYS), 0.98);
    assert.equal(phaseRequirement(data, ph, CF), null);
    assert.equal(phaseRequirement(data, phase({ requirements: [3300, null] }), LYS), null);
  });

  it("reads the stage's inclusion limit", () => {
    assert.equal(phaseInclusionLimit(data, phase({}), "soy"), 30);
    assert.equal(phaseInclusionLimit(data, phase({}), "corn"), null);
    assert.equal(phaseInclusionLimit(data, phase({ limitsKey: null }), "soy"), null);
  });

  it("splits stage labels", () => {
    assert.deepEqual(phaseParts(phase({})), { name: "Grower", sub: "26–47 kg" });
    assert.deepEqual(phaseParts(phase({ label: "PO1 · gestation days 0–85", weightRange: "172 kg average body weight" })), { name: "PO1 · gestation days 0–85", sub: "172 kg average body weight" });
  });
});

describe("formatting", () => {
  it("formats like the design", () => {
    assert.equal(fmtContent(LYS, null), "—");
    assert.equal(fmtContent(LYS, 0), "0");
    assert.equal(fmtContent(LYS, 0.123), "0.12");
    assert.equal(fmtContent(LYS, 2.345), "2.35");
    assert.equal(fmtContent(LYS, 44.12), "44.1");
    assert.equal(fmtContent(ME, 3403.6), "3,404");
  });
});

describe("nutrient list", () => {
  it("takes every page nutrient from FEED_NUTRIENTS, linked to the optimiser", () => {
    for (const n of NUTRIENTS) {
      assert.equal(FEED_NUTRIENTS.find((f) => f.id === n.id)?.name, n.name);
      assert.ok(n.constraintId || n.id === "crude-fibre", n.id + " has no optimiser constraint");
    }
  });
});

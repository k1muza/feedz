import assert from "node:assert/strict";
import { test } from "node:test";

import { validateManualRecipe, type EngineContext, type ManualCheck } from "./engine";
import { balance, checkSig, costOf, fmtPct, inputPct, parseNum, partialValues, poolOf, verdictOf, type PgItem, type PgMix } from "./playground-model";

const catalogue = new Map([
  ["corn", { id: "corn", name: "Corn", price: { usdPerTonne: 300 }, requirementValues: { swine: { "crude-protein": 8 } } }],
  ["soy", { id: "soy", name: "Soybean meal", price: { usdPerTonne: 500 }, requirementValues: { swine: { "crude-protein": 46 } } }],
  ["premix", { id: "premix", name: "Premix", price: null, requirementValues: { swine: {} } }],
]) as unknown as EngineContext["catalogue"];

const context = {
  catalogue,
  programmes: {
    requirementFields: [],
    programmes: [{ id: "programme", name: "Programme", species: "swine", phases: [{ id: "phase", label: "Phase", limitsKey: "limits" }] }],
    limits: { limits: [{ id: "soy", name: "Soybean meal", maxPct: 30 }] },
  },
} as unknown as EngineContext;

const item = (id: string, pct: number, role: PgItem["role"] = "free", price: number | null = 300): PgItem => ({ id, pct, role, fixedPct: role === "free" ? null : pct, price });
const mixOf = (items: PgItem[], balancer = "corn"): PgMix => ({ items, autoBal: true, balancer });
const hi = (id: string) => (id === "soy" ? 30 : 100);
const nm = (id: string) => catalogue.get(id)?.name ?? id;

test("balancing moves only the balancing ingredient, never a locked one", () => {
  const mix = mixOf([item("corn", 77.5), item("soy", 20, "locked"), item("premix", 2.5, "mfr")]);
  // Adding 5% of a new ingredient takes 5% from corn; soy and the premix are not candidates.
  const r = balance(mix, "wheat", 5, hi, nm);
  assert.deepEqual(r, { ok: true, nb: 72.5 });
});

test("balancing refuses a change the balancing ingredient can't absorb, changing nothing", () => {
  const mix = mixOf([item("corn", 3), item("soy", 20, "locked")]);
  const r = balance(mix, "wheat", 5, hi, nm);
  assert.equal(r.ok, false);
  const over = balance(mixOf([item("soy", 29), item("corn", 71)], "soy"), "corn", -2, hi, nm);
  assert.equal(over.ok, false);
  assert.match(!over.ok ? over.err : "", /can’t go above 30%/);
});

test("with auto-balance off, or no balancer chosen, nothing else moves", () => {
  const items = [item("corn", 80), item("soy", 20)];
  assert.deepEqual(balance({ items, autoBal: false, balancer: "corn" }, "soy", 5, hi, nm), { ok: true });
  assert.deepEqual(balance({ items, autoBal: true, balancer: "" }, "soy", 5, hi, nm), { ok: true });
});

test("locked and manufacturer amounts reach the engine as exact fixed roles", () => {
  const exact = 20.123456789012;
  const pool = poolOf([item("corn", 60, "free", 300), { ...item("soy", exact, "locked", 520) }, item("premix", 2.5, "mfr", null)], catalogue);
  assert.deepEqual(pool.corn, { role: "available" });
  assert.deepEqual(pool.soy, { role: "fixed", fixed: exact, price: 520 });
  assert.deepEqual(pool.premix, { role: "fixed", fixed: 2.5 });
});

test("a locked amount is validated exactly as Studio validates a fixed one", () => {
  const items = [item("corn", 77.5), item("soy", 20, "locked"), item("premix", 2.5, "mfr")];
  const snap = { programmeId: "programme", phaseId: "phase", pool: poolOf(items, catalogue), goal: "least_cost" as const, batch: 1000 };
  assert.equal(validateManualRecipe(snap, { corn: 77.5, soy: 20, premix: 2.5 }, context).valid, true);
  const moved = validateManualRecipe(snap, { corn: 77.3, soy: 20.2, premix: 2.5 }, context);
  assert.ok(moved.issues.some((i) => i.title === "Soybean meal must be fixed at 20%"));
});

test("unpriced ingredients are named and left out of the cost, never counted as free", () => {
  const { costT, unpriced } = costOf([item("corn", 77.5, "free", 300), item("soy", 20, "free", 500), item("premix", 2.5, "mfr", null)]);
  assert.equal(costT, 0.775 * 300 + 0.2 * 500);
  assert.deepEqual(unpriced, ["premix"]);
});

test("an incomplete mix is never given a nutritional verdict", () => {
  const items = [item("corn", 60), item("soy", 20)];
  const met = { recipeValidity: { valid: true, total: 100, issues: [] }, nutrientAdequacy: "met", nutrients: [], incompleteRequirements: [], advisories: [], cost: 0, assessment: null } as ManualCheck;
  assert.equal(verdictOf(items, { sig: checkSig("k", items), check: met, error: null }), "incomplete");
  assert.equal(verdictOf([item("corn", 80), item("soy", 20)], { sig: "", check: met, error: null }), "meets");
  assert.equal(verdictOf([item("corn", 60, "locked"), item("soy", 50, "locked")], null), "over");
});

test("partial values add what the known ingredients supply so far", () => {
  const so = partialValues([item("corn", 50), item("soy", 20)], catalogue, "swine", ["crude-protein"]);
  assert.ok(Math.abs(so["crude-protein"] - (0.5 * 8 + 0.2 * 46)) < 1e-12);
});

test("tiny inclusions never read as zero, and typed amounts parse either decimal mark", () => {
  assert.equal(fmtPct(0.00018), "0.00018");
  assert.equal(inputPct(0.00018), "0.00018");
  assert.equal(inputPct(63.851234), "63.8512");
  assert.equal(parseNum("12,5"), 12.5);
  assert.ok(Number.isNaN(parseNum("12abc")));
});

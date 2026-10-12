import assert from "node:assert/strict";
import { test } from "node:test";

import { buildInfeasibleFormulationAssessment } from "@/lib/formulation-assessment";
import { predatesAggregateLimits, type FormulationAssessment } from "@/lib/formulation-assessment-model";

import { evaluateManual, formulate, manualAmounts, manualPct, restoreVersion, savedStateSig, summarise, type EngineContext, type ManualResult, type SavedVersion, type Snapshot, type Summary } from "./engine";

// Saved versions reopen exactly as saved (BUG-001): the stored result and, for
// manual recipes, the typed amounts and their check come back without the
// engine being asked again, even after prices or nutrient data change.

const assessment = (label: string): FormulationAssessment => ({
  ...buildInfeasibleFormulationAssessment(""),
  optimizerFeasible: true,
  verdict: "meets_requirements",
  headline: "Meets all 0 hard requirements",
  summary: label,
});

function makeContext(): EngineContext {
  return {
    catalogue: new Map([
      ["corn", { id: "corn", name: "Corn", price: { usdPerTonne: 300 } }],
      ["soy", { id: "soy", name: "Soybean meal", price: { usdPerTonne: 500 } }],
      ["premix", { id: "premix", name: "Premix", price: { usdPerTonne: 900 } }],
    ]),
    programmes: {
      requirementFields: [],
      programmes: [{ id: "programme", name: "Programme", species: "swine", phases: [{ id: "phase", label: "Phase", limitsKey: "limits" }] }],
      limits: { limits: [{ id: "soy", name: "Soybean meal", maxPct: 40 }] },
    },
  } as unknown as EngineContext;
}

const snapshot: Snapshot = {
  programmeId: "programme",
  phaseId: "phase",
  goal: "least_cost",
  batch: 250,
  pool: {
    corn: { role: "available" },
    soy: { role: "available", max: 40 },
    premix: { role: "fixed", fixed: 5 },
  },
};

/** A stand-in for the formulation service; its answers change when "today's data" does. */
function fakeService(data: { corn: number; protein: number; label: string }) {
  const calls = { optimize: 0, evaluate: 0 };
  const fetch = async (url: string | URL | Request) => {
    const path = String(url);
    if (path.endsWith("/optimize")) {
      calls.optimize += 1;
      const solution = { formula: { ingredients: [{ ingredientId: "corn", inclusionPct: data.corn }, { ingredientId: "soy", inclusionPct: 95 - data.corn }, { ingredientId: "premix", inclusionPct: 5 }] }, costPerKg: 0.4 };
      return Response.json({
        status: "optimal",
        solution,
        nutrientProfile: [{ id: "crude-protein", label: "Crude protein", unit: "%", relation: "min", requirement: 18, actual: data.protein, margin: 1, marginPct: 1, binding: true }],
        alternatives: [],
        ingredientOpportunities: [],
        assessment: assessment("optimised · " + data.label),
        premixComparison: null,
        premixEffect: null,
      });
    }
    if (path.endsWith("/evaluate")) {
      calls.evaluate += 1;
      return Response.json({
        status: "evaluated",
        nutrientProfile: [{ id: "crude-protein", label: "Crude protein", unit: "%", relation: "min", requirement: 18, actual: data.protein, margin: 1, marginPct: 1, binding: false }],
        incompleteRequirements: [],
        assessment: assessment("manual · " + data.label),
      });
    }
    throw new Error("Unexpected request " + path);
  };
  return { calls, fetch: fetch as typeof globalThis.fetch };
}

/** Saved formulations as the database keeps them: JSON, read back in a fresh session. */
function fakeStore() {
  const rows: string[] = [];
  return {
    save(snap: Snapshot, sum: Summary) {
      rows.push(JSON.stringify({ v: rows.length + 1, date: Date.now(), snap, sum }));
      return rows.length;
    },
    load: (v: number) => JSON.parse(rows[v - 1]) as SavedVersion,
  };
}

async function withFetch<T>(fetch: typeof globalThis.fetch, body: () => Promise<T>) {
  const original = globalThis.fetch;
  globalThis.fetch = fetch;
  try {
    return await body();
  } finally {
    globalThis.fetch = original;
  }
}

/** Everything a version must reopen with, independent of anything the engine says today. */
async function checkedManual(snap: Snapshot, pct: Record<string, number>, ctx: EngineContext): Promise<ManualResult> {
  const check = await evaluateManual(snap, pct, ctx);
  return { ...check, recipe: Object.keys(pct).map((id) => ({ id, pct: pct[id] })) };
}

/** Reopening must not ask the engine anything. */
function reopen(store: ReturnType<typeof fakeStore>, v: number) {
  let requests = 0;
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    requests += 1;
    throw new Error("Reopening a saved version must not call the formulation service");
  }) as typeof globalThis.fetch;
  try {
    return { restored: restoreVersion(store.load(v)), requests };
  } finally {
    globalThis.fetch = original;
  }
}

test("A: a saved manual recipe reopens in manual mode with its exact amounts, check and result, without optimising", async () => {
  const ctx = makeContext();
  const service = fakeService({ corn: 62.5, protein: 18.4, label: "at save" });
  const store = fakeStore();
  const amounts = { corn: 57.125, soy: 37.875, premix: 5 };

  const v = await withFetch(service.fetch, async () => {
    const optimised = await formulate(snapshot, ctx);
    assert.equal(optimised.status, "optimal");
    const manual = await checkedManual(snapshot, amounts, ctx);
    assert.equal(manual.recipeValidity.valid, true);
    return store.save(snapshot, summarise(optimised, manual));
  });
  assert.deepEqual(service.calls, { optimize: 1, evaluate: 1 });

  const { restored, requests } = reopen(store, v);
  assert.equal(requests, 0, "no optimisation or evaluation on reopening");
  assert.equal(restored.mode, "manual");
  if (restored.mode !== "manual") return;
  assert.deepEqual(manualPct(restored.manual), amounts);
  assert.equal(restored.manual.typed.corn, "57.13", "shown to two decimals, with the exact amount kept behind it");
  assert.equal(restored.check.assessment?.summary, "manual · at save");
  assert.equal(restored.check.nutrients[0].value, 18.4);
  assert.equal(restored.check.recipeValidity.valid, true);
  assert.equal(restored.check.cost, (57.125 * 300 + 37.875 * 500 + 5 * 900) / 100);
  assert.equal(restored.result.status, "optimal");
  assert.equal(restored.result.recipe.find((line) => line.id === "corn")?.pct, 62.5, "the optimised recipe it was edited from is kept for context");
  assert.equal(store.load(v).snap.batch, 250);
  assert.deepEqual(store.load(v).snap.pool, snapshot.pool);
});

test("B: editing a reopened manual recipe saves a new version and leaves the original intact", async () => {
  const ctx = makeContext();
  const service = fakeService({ corn: 60, protein: 18.4, label: "v1" });
  const store = fakeStore();
  const first = { corn: 55, soy: 40, premix: 5 };
  const v1 = await withFetch(service.fetch, async () => store.save(snapshot, summarise(await formulate(snapshot, ctx), await checkedManual(snapshot, first, ctx))));

  const opened = reopen(store, v1).restored;
  assert.equal(opened.mode, "manual");
  if (opened.mode !== "manual") return;
  const pct = manualPct({ ...opened.manual, typed: { ...opened.manual.typed, corn: "57.5", soy: "37.5" } });
  const v2 = await withFetch(service.fetch, async () => store.save(snapshot, summarise(opened.result, await checkedManual(snapshot, pct, ctx))));
  assert.equal(service.calls.optimize, 1, "continuing to edit never re-optimises");

  const amountsOf = (v: number) => {
    const restored = reopen(store, v).restored;
    assert.equal(restored.mode, "manual");
    return restored.mode === "manual" ? manualPct(restored.manual) : null;
  };
  assert.deepEqual(amountsOf(v1), first);
  assert.deepEqual(amountsOf(v2), { corn: 57.5, soy: 37.5, premix: 5 });
});

test("C: a historical version keeps its recipe, cost and assessment after prices and nutrient data change", async () => {
  const ctx = makeContext();
  const store = fakeStore();
  const before = fakeService({ corn: 70, protein: 18.4, label: "old data" });
  const amounts = { corn: 60, soy: 35, premix: 5 };
  const [vOpt, vManual] = await withFetch(before.fetch, async () => {
    const optimised = await formulate(snapshot, ctx);
    return [store.save(snapshot, summarise(optimised, null)), store.save(snapshot, summarise(optimised, await checkedManual(snapshot, amounts, ctx)))];
  });
  const saved = { opt: store.load(vOpt), manual: store.load(vManual) };

  // Today's data: new planning prices and a nutrient matrix that changes the answers.
  ctx.catalogue.set("corn", { ...ctx.catalogue.get("corn")!, price: { usdPerTonne: 410 } } as never);
  const after = fakeService({ corn: 50, protein: 16.9, label: "new data" });
  const today = await withFetch(after.fetch, () => formulate(snapshot, ctx));
  assert.equal(today.status === "optimal" && today.recipe.find((line) => line.id === "corn")?.pct, 50, "a re-run today would give a different recipe");

  const opt = reopen(store, vOpt);
  assert.equal(opt.requests, 0);
  assert.equal(opt.restored.mode, "optimised");
  if (opt.restored.mode === "optimised" && opt.restored.result.status === "optimal") {
    assert.equal(opt.restored.result.recipe.find((line) => line.id === "corn")?.pct, 70);
    assert.equal(opt.restored.result.costT, 400);
    assert.equal(opt.restored.result.assessment.summary, "optimised · old data");
    assert.equal(opt.restored.result.nutrients[0].value, 18.4);
  } else assert.fail("the saved optimal result should be restored");

  const manual = reopen(store, vManual);
  assert.equal(manual.requests, 0);
  assert.equal(manual.restored.mode, "manual");
  if (manual.restored.mode === "manual") {
    assert.equal(manualPct(manual.restored.manual).corn, 60);
    assert.equal(manual.restored.check.cost, (60 * 300 + 35 * 500 + 5 * 900) / 100, "the saved cost, not today's prices");
    assert.equal(manual.restored.check.assessment?.summary, "manual · old data");
    assert.equal(manual.restored.check.nutrients[0].value, 18.4);
  }
  assert.deepEqual(store.load(vOpt), saved.opt, "reopening never writes to a saved version");
  assert.deepEqual(store.load(vManual), saved.manual);
});

test("D: optimised formulations still save and reopen as optimised, for every result status", async () => {
  const ctx = makeContext();
  const service = fakeService({ corn: 65, protein: 18.4, label: "opt" });
  const store = fakeStore();
  const optimised = await withFetch(service.fetch, () => formulate(snapshot, ctx));
  const sum = summarise(optimised, null);
  assert.equal(sum.status, "optimal");
  assert.deepEqual(sum.recipe, [{ id: "corn", pct: 65 }, { id: "soy", pct: 30 }, { id: "premix", pct: 5 }]);
  const { restored, requests } = reopen(store, store.save(snapshot, sum));
  assert.equal(requests, 0);
  assert.equal(restored.mode, "optimised");
  if (restored.mode === "optimised") assert.deepEqual(restored.result, JSON.parse(JSON.stringify(optimised)));

  const infeasible = { status: "infeasible" as const, warns: [], shortfalls: [], activeCount: 3, setAside: [], assessment: buildInfeasibleFormulationAssessment("No recipe"), closest: [], costT: null, costExcludesPremix: false, premixComparison: null };
  const reopenedInfeasible = reopen(store, store.save(snapshot, summarise(infeasible, null))).restored;
  assert.equal(reopenedInfeasible.mode, "optimised");
  if (reopenedInfeasible.mode === "optimised") assert.equal(reopenedInfeasible.result.status, "infeasible");
});

test("E: versions saved before results were stored re-run explicitly and never invent manual amounts", () => {
  const legacy = (sum: Summary): SavedVersion => ({ v: 1, date: 0, snap: snapshot, sum });

  // An optimised version: re-run from its settings, as before.
  assert.deepEqual(restoreVersion(legacy({ status: "optimal", costT: 400, recipe: [{ id: "corn", pct: 70 }], assessment: assessment("x") })), { mode: "rerun", manual: null, wasManual: false });
  // A missing result is never read as manual.
  assert.deepEqual(restoreVersion(legacy({ status: "infeasible" })), { mode: "rerun", manual: null, wasManual: false });

  // A manual version keeps its saved percentages to re-enter over the re-run.
  const manual = restoreVersion(legacy({ status: "manual", costT: 410, recipe: [{ id: "corn", pct: 58.25 }, { id: "soy", pct: 36.75 }, { id: "premix", pct: 5 }], assessment: { schemaVersion: 1 } }));
  assert.equal(manual.mode, "rerun");
  if (manual.mode === "rerun") assert.deepEqual(manual.manual?.typed, { corn: "58.25", soy: "36.75", premix: "5" });

  // A manual version without its amounts says so instead of fabricating any.
  assert.deepEqual(restoreVersion(legacy({ status: "manual" })), { mode: "rerun", manual: null, wasManual: true });

  // A stored result that doesn't match its summary is not trusted.
  assert.equal(restoreVersion(legacy({ status: "manual", recipe: [{ id: "corn", pct: 100 }], result: { mode: "optimised", result: { status: "error", warns: [], message: "x" } } })).mode, "rerun");
  assert.equal(restoreVersion(legacy({ status: "optimal", result: { mode: "optimised", result: { status: "error", warns: [], message: "x" } } })).mode, "rerun");
});

test("a version saved before ingredient-family limits reopens with its original result, flagged as assessed under the old rules", async () => {
  const ctx = makeContext();
  // The formulation service as it answered before family ceilings: no inclusionPolicy.
  const old = fakeService({ corn: 62.5, protein: 18.4, label: "before family limits" });
  const legacyFetch = (async (url: string | URL | Request) => {
    const response = await old.fetch(url);
    const body = await response.json();
    delete body.assessment.inclusionPolicy;
    return Response.json(body);
  }) as typeof globalThis.fetch;
  const store = fakeStore();
  const v = await withFetch(legacyFetch, async () => store.save(snapshot, summarise(await formulate(snapshot, ctx), null)));

  const { restored, requests } = reopen(store, v);
  assert.equal(requests, 0, "never re-scored on reopening");
  assert.equal(restored.mode, "optimised");
  if (restored.mode !== "optimised" || restored.result.status !== "optimal") return assert.fail("optimised result");
  assert.equal(restored.result.assessment.verdict, "meets_requirements", "the saved verdict is kept");
  assert.equal(predatesAggregateLimits(restored.result.assessment), true);
  assert.equal(predatesAggregateLimits(assessment("current")), false);
});

test("a recipe copied into manual mode keeps its exact amounts until one is retyped", () => {
  const recipe = [{ id: "corn", pct: 57.12345678 }, { id: "soy", pct: 37.87654322 }, { id: "premix", pct: 5 }];
  const manual = manualAmounts(recipe, ["corn", "soy", "premix", "wheat"]);
  assert.deepEqual(manual.typed, { corn: "57.12", soy: "37.88", premix: "5", wheat: "0" });
  assert.deepEqual(manualPct(manual), { corn: 57.12345678, soy: 37.87654322, premix: 5 }, "unchanged, it is the recipe as calculated");

  const retyped = manualPct({ ...manual, typed: { ...manual.typed, corn: "57.1", wheat: "0.02" } });
  assert.deepEqual(retyped, { corn: 57.1, soy: 37.87654322, premix: 5, wheat: 0.02 }, "only retyped amounts change");
});

test("reopened versions match what was saved, so they show no unsaved changes", async () => {
  const ctx = makeContext();
  const service = fakeService({ corn: 62.5, protein: 18.4, label: "v" });
  const store = fakeStore();
  const ids = Object.keys(snapshot.pool);
  // As in the studio: an optimised recipe copied into manual mode, then one amount retyped as "37.50".
  const copied = manualAmounts([{ id: "corn", pct: 57.4999999 }, { id: "soy", pct: 37.5000001 }, { id: "premix", pct: 5 }], ids);
  const atSave = { ...copied, typed: { ...copied.typed, soy: "37.50" } };

  const [vOpt, vManual] = await withFetch(service.fetch, async () => {
    const optimised = await formulate(snapshot, ctx);
    return [store.save(snapshot, summarise(optimised, null)), store.save(snapshot, summarise(optimised, await checkedManual(snapshot, manualPct(atSave), ctx)))];
  });

  const opt = reopen(store, vOpt).restored;
  assert.equal(opt.mode, "optimised");
  assert.equal(savedStateSig(store.load(vOpt).snap, "optimised", { typed: {}, exact: {} }), savedStateSig(snapshot, "optimised", copied), "manual amounts don't count for an optimised version");

  const manual = reopen(store, vManual).restored;
  assert.equal(manual.mode, "manual");
  if (manual.mode !== "manual") return;
  assert.equal(savedStateSig(store.load(vManual).snap, "manual", manual.manual), savedStateSig(snapshot, "manual", atSave));
  assert.notEqual(savedStateSig(snapshot, "manual", { ...manual.manual, typed: { ...manual.manual.typed, soy: "37.4" } }), savedStateSig(snapshot, "manual", atSave), "a real edit is still an unsaved change");
});

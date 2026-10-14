import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { buildInfeasibleFormulationAssessment } from "@/lib/formulation-assessment";
import { INCLUSION_INPUT_PROPS, isValidInclusionPct } from "@/lib/inclusion-input";
import {
  manualAmounts,
  manualPct,
  restoreVersion,
  savedStateSig,
  shownAmount,
  validateManualRecipe,
  type EngineContext,
  type ManualAmounts,
  type OptimalResult,
  type SavedVersion,
  type Snapshot,
} from "./engine";

// The production QA formulation: Grow-Finish Pig, Grower 47–74 kg, saved
// with 63.85% corn and 2.23% wheat bran, which Chrome rejected under the
// manual inputs' old step="0.1".

const SAVED_RECIPE = [
  { id: "corn", pct: 63.85 },
  { id: "soy", pct: 25 },
  { id: "bran", pct: 2.23 },
  { id: "oil", pct: 2.6693 },
  { id: "lysine", pct: 0.150653585115847 },
  { id: "tryptophan", pct: 0.00017635626795979977 },
  { id: "minerals", pct: 2.8999700586162 },
  { id: "premix", pct: 3.2 },
];
const exactTotal = 100 - SAVED_RECIPE.filter((line) => line.id !== "minerals").reduce((sum, line) => sum + line.pct, 0);
SAVED_RECIPE.find((line) => line.id === "minerals")!.pct = exactTotal;

const context = {
  catalogue: new Map(SAVED_RECIPE.map(({ id }) => [id, { id, name: id, price: { usdPerTonne: 400 } }])),
  programmes: {
    requirementFields: [],
    programmes: [{ id: "programme", name: "Programme", species: "swine", phases: [{ id: "phase", label: "Phase" }] }],
    limits: {},
  },
} as unknown as EngineContext;

const snapshot: Snapshot = {
  programmeId: "programme",
  phaseId: "phase",
  goal: "least_cost",
  batch: 1000,
  pool: {
    ...Object.fromEntries(SAVED_RECIPE.map(({ id }) => [id, { role: "available" as const }])),
    premix: { role: "fixed", fixed: 3.2 },
  },
};

const assessment = { ...buildInfeasibleFormulationAssessment(""), optimizerFeasible: true, verdict: "meets_requirements" as const };

/** A version as Studio saves a checked manual recipe. */
function savedVersion(recipe: readonly { id: string; pct: number }[], snap = snapshot): SavedVersion {
  return JSON.parse(JSON.stringify({
    v: 1,
    date: 0,
    snap,
    sum: {
      status: "manual",
      costT: 400,
      recipe,
      assessment,
      result: {
        mode: "manual",
        base: { status: "optimal" } as OptimalResult,
        check: { recipeValidity: { valid: true, total: 100, issues: [] }, nutrientAdequacy: "met", nutrients: [], incompleteRequirements: [], advisories: [] },
      },
    },
  }));
}

function reopen(version: SavedVersion): ManualAmounts {
  const restored = restoreVersion(version);
  assert.equal(restored.mode, "manual");
  if (restored.mode !== "manual") throw new Error("not manual");
  return restored.manual;
}

const recipeOf = (amounts: ManualAmounts) => Object.entries(manualPct(amounts)).map(([id, pct]) => ({ id, pct }));

test("the saved QA formulation reopens with 63.85% corn and 2.23% wheat bran shown and kept exactly", () => {
  const manual = reopen(savedVersion(SAVED_RECIPE));
  assert.equal(manual.typed.corn, "63.85");
  assert.equal(manual.typed.bran, "2.23");
  assert.equal(manual.typed.soy, "25");
  assert.equal(manual.typed.premix, "3.2");
  assert.deepEqual(manualPct(manual), Object.fromEntries(SAVED_RECIPE.map((line) => [line.id, line.pct])));
  for (const value of Object.values(manual.typed)) assert.ok(isValidInclusionPct(+value), value);
  assert.deepEqual(validateManualRecipe(snapshot, manualPct(manual), context).issues, []);
});

test("small inclusions are never shown or kept as zero", () => {
  assert.equal(shownAmount(0.00017635626795979977), "0.00018");
  assert.equal(shownAmount(0.05), "0.05");
  assert.equal(shownAmount(0.0503), "0.05");
  assert.equal(shownAmount(0.150653585115847), "0.15");
  assert.equal(shownAmount(63.85), "63.85");
  assert.equal(shownAmount(0), "0");
  const manual = reopen(savedVersion(SAVED_RECIPE));
  assert.equal(manual.typed.tryptophan, "0.00018");
  assert.equal(manualPct(manual).tryptophan, 0.00017635626795979977, "the exact amount, not its display");
});

test("typed values: 0.05% amino acid, a 3.20% premix and amounts with more than two decimals", () => {
  const manual = reopen(savedVersion(SAVED_RECIPE));
  manual.typed.lysine = "0.05";
  manual.typed.premix = "3.20";
  manual.typed.oil = "2.7693";
  const pct = manualPct(manual);
  assert.equal(pct.lysine, 0.05);
  assert.equal(pct.premix, 3.2, "3.20 is the fixed 3.2% dose");
  assert.equal(pct.oil, 2.7693);
  const validity = validateManualRecipe(snapshot, pct, context);
  assert.deepEqual(validity.issues.filter((issue) => issue.id === "premix"), [], "the fixed premix is accepted");
});

test("reopening, editing and saving keeps every untouched amount at full precision", () => {
  const first = reopen(savedVersion(SAVED_RECIPE));
  first.typed.corn = "62.85";
  first.typed.bran = "3.23";
  const secondSave = recipeOf(first);
  const second = reopen(savedVersion(secondSave));
  const pct = manualPct(second);
  assert.equal(pct.corn, 62.85);
  assert.equal(pct.bran, 3.23);
  for (const line of SAVED_RECIPE.filter((row) => row.id !== "corn" && row.id !== "bran")) {
    assert.equal(pct[line.id], line.pct, line.id);
  }
  // A third round trip changes nothing, and the workspace reports no unsaved changes.
  const third = reopen(savedVersion(recipeOf(second)));
  assert.deepEqual(manualPct(third), pct);
  assert.equal(savedStateSig(snapshot, "manual", third), savedStateSig(snapshot, "manual", second));
});

test("changing the batch size never changes inclusion percentages", () => {
  const atTonne = reopen(savedVersion(SAVED_RECIPE, { ...snapshot, batch: 1000 }));
  const atBag = reopen(savedVersion(SAVED_RECIPE, { ...snapshot, batch: 25 }));
  assert.deepEqual(manualPct(atBag), manualPct(atTonne));
  assert.deepEqual(atBag.typed, atTonne.typed);
});

test("negative, non-finite and above-100% amounts are rejected, as the browser does", () => {
  const base = Object.fromEntries(SAVED_RECIPE.map((line) => [line.id, line.pct]));
  for (const bad of [-0.5, 100.01, Number.NaN, Number.POSITIVE_INFINITY]) {
    const issues = validateManualRecipe(snapshot, { ...base, lysine: bad }, context).issues;
    assert.ok(issues.some((issue) => issue.id === "lysine" && issue.title === "Enter a valid amount for lysine"), String(bad));
  }
  for (const ok of [0, 0.05, 63.85, 100]) assert.equal(isValidInclusionPct(ok), true, String(ok));
  for (const bad of [-0.01, 100.000001, Number.NaN]) assert.equal(isValidInclusionPct(bad), false, String(bad));
  assert.deepEqual([INCLUSION_INPUT_PROPS.min, INCLUSION_INPUT_PROPS.max], [0, 100], "native range matches the application's");
});

test("every inclusion % input uses the shared any-step attributes", () => {
  const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");
  const views = read("src/components/formulation-studio/views.tsx");
  const workbench = read("src/components/feed-formulation-workbench.tsx");
  for (const value of ["r.manual", "d.min", "d.max"]) {
    assert.match(views, new RegExp(`<input \\{\\.\\.\\.INCLUSION_INPUT_PROPS\\} value=\\{${value.replace(".", "\\.")}\\}`), value);
  }
  assert.equal(workbench.match(/\{\.\.\.INCLUSION_INPUT_PROPS\}/g)?.length, 3, "min, max and locked %");
  for (const source of [views, workbench]) assert.doesNotMatch(source, /step="0\.1"/);
  assert.equal(INCLUSION_INPUT_PROPS.step, "any");
});

// The manual amounts this suite builds are the ones "Adjust amounts manually" builds.
test("an optimised recipe copied into manual mode uses the same displayed amounts", () => {
  const manual = manualAmounts(SAVED_RECIPE, Object.keys(snapshot.pool));
  assert.deepEqual(manual.typed, reopen(savedVersion(SAVED_RECIPE)).typed);
});

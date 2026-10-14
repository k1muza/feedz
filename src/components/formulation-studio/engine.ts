import type { CatalogueIngredient } from "@/lib/studio-catalogue";
import { commercialPremixById } from "@/lib/commercial-premixes";
import { studioPremixProblems } from "@/lib/studio-commercial-premix";
import { isCompleteInclusionTotal } from "@/lib/inclusion-total";
import { INCLUSION_TOLERANCE_PCT, distinguishingDp, exactDp, nutrientFeasibilityTolerance, withinBound } from "@/lib/numerical-tolerance";
import type { IngredientListItem } from "@/lib/ingredient-lists";
import type { StudioPhase, StudioProgramme, StudioProgrammeData } from "@/lib/studio-programmes";
import type {
  FormulationAlternative,
  FormulationIncompleteRequirement,
  FormulationNutrientComparison,
  FormulationSolution,
  LeastCostFormulationResult,
} from "@/lib/feed-optimizer";
import { isFormulationAssessment, requirementCounts, type FormulationAssessment, type PremixComparison, type PremixRecipeEffect } from "@/lib/formulation-assessment-model";

// The formulation studio's link to FeedSport's formulation engine
// (/api/feed-formulation/optimize and /evaluate). It prices the ingredient
// pool, catches problems the solver can't explain well (no ingredients, no
// price, impossible limits), sets aside ingredients without the nutrient data
// a phase needs, and turns the engine's answer into what the workspace shows.

export type Role = "available" | "required" | "fixed" | "excluded";
export type GoalKey = "least_cost" | "simpler" | "less_sbm" | "local";

// Values come from form inputs, so numbers and strings both appear here.
export interface PoolEntry {
  role: Role;
  /** USD per tonne; absent uses the FeedSport planning price. */
  price?: number | string | null;
  min?: number | string | null;
  max?: number | string | null;
  fixed?: number | string | null;
  /** The role an unticked ingredient had, restored when it is ticked again. */
  was?: Role;
}
export type Pool = Record<string, PoolEntry>;

/** Restores a reusable list item's persisted price, role, and inclusion rule. */
export function poolEntryFromListItem(item: Pick<IngredientListItem, "role" | "price" | "minPct" | "maxPct" | "fixedPct">): PoolEntry {
  const entry: PoolEntry = {
    role: item.role,
    ...(item.price != null ? { price: item.price } : {}),
  };
  if (item.role === "fixed" && item.fixedPct != null) entry.fixed = item.fixedPct;
  if (item.role === "required" && item.minPct != null) entry.min = item.minPct;
  if ((item.role === "available" || item.role === "required") && item.maxPct != null) entry.max = item.maxPct;
  return entry;
}

/** Everything needed to reproduce a formulation. */
export interface Snapshot {
  programmeId: string;
  phaseId: string;
  pool: Pool;
  goal: GoalKey;
  batch: number;
}

export interface Issue {
  id?: string;
  /** Soft notes (default prices) show only alongside a valid recipe. */
  soft?: boolean;
  title: string;
  body: string;
}

export interface NutrientResult {
  id: string;
  name: string;
  unit: string;
  dp: number;
  value: number;
  min: number | null;
  max: number | null;
  status: "met" | "below" | "above";
  /** Exactly at its requirement, so it drives the cost. */
  limiting: boolean;
}

export interface Advisory {
  id: string;
  pct: number;
  guide: number;
  text: string;
}

export interface RecipeLine {
  id: string;
  name: string;
  pct: number;
  /** USD per tonne. */
  price: number | null;
  role: Role;
  atMax: boolean;
  hi: number;
  fsMax: number;
}

export interface Strategy {
  key: GoalKey;
  label: string;
  cost?: number;
  count?: number;
  possible: boolean;
  note?: string;
}

export interface Shortfall {
  id: string;
  name: string;
  unit: string;
  dp: number;
  kind: "min" | "max";
  best: number;
  req: number;
}

export interface Opportunity {
  id: string;
  name: string;
  /** How far the ingredient could enter for each extra percent of cost. */
  points: { tolerancePct: number; maxPct: number }[];
}

export interface OptimalResult {
  status: "optimal";
  recipe: RecipeLine[];
  /** Usable pool ingredients the recipe doesn't use. */
  unused: string[];
  /** Pool ingredients without the nutrient data this phase needs. */
  setAside: string[];
  costT: number;
  leastCostT: number;
  nutrients: NutrientResult[];
  advisories: Advisory[];
  warns: Issue[];
  strategies: Strategy[];
  /** Ingredients the simpler recipe leaves out. */
  dropped: string[];
  /** The goal asked for had no distinct recipe, so least cost is shown. */
  goalUnavailable: boolean;
  opportunities: Opportunity[];
  ms: number;
  nVars: number;
  nRows: number;
  /** True when the cost is a lower bound excluding an unquoted premix. */
  costExcludesPremix: boolean;
  /** Hard requirements, Chapter 7 advisories and premix documentation. */
  assessment: FormulationAssessment;
  /** Premix advisory: every eligible alternative re-run in place of the selected premix. */
  premixComparison: PremixComparison | null;
  /** How the premix's documented nutrients changed the rest of the recipe.
   * Only for the least-cost recipe it was computed on; null otherwise. */
  premixEffect: PremixRecipeEffect | null;
  /** The premix comparison re-runs least cost. True when another goal's recipe
   * is on screen, so the advisory must say what it was compared on. */
  premixComparedOnLeastCost: boolean;
}

export type FormulateResult =
  | { status: "manufacturer_recipe"; recipe: Array<{ id: string; name: string; pct: number }>;
      costT: number | null; message: string; warns: Issue[]; assessment: FormulationAssessment }
  | { status: "blocked"; errs: Issue[]; warns: Issue[] }
  | { status: "infeasible"; warns: Issue[]; shortfalls: Shortfall[]; activeCount: number; setAside: string[]; assessment: FormulationAssessment;
      /** The optimizer's closest recipe; shown for diagnosis, never to be mixed. */
      closest: Array<{ id: string; pct: number }>; costT: number | null; costExcludesPremix: boolean; premixComparison: PremixComparison | null }
  | { status: "error"; warns: Issue[]; message: string }
  | OptimalResult;

/** Saved with each version, for lists and comparisons without re-solving. */
export interface Summary {
  status: string;
  costT?: number;
  recipe?: { id: string; pct: number }[];
  met?: number;
  req?: number;
  adv?: number;
  fail?: number;
  unknown?: number;
  /** Schema 2. Older versions carry a schema-1 assessment and are never re-scored. */
  assessment?: FormulationAssessment | { schemaVersion: 1 };
  /** The result on screen when saved, so reopening shows it rather than re-solving
   * against today's prices and data. Versions saved before it re-run their settings. */
  result?: SavedResult;
}
/**
 * What a saved version showed. A manual recipe's amounts, cost and assessment
 * are the summary's own recipe, costT and assessment; only the rest of its
 * check and the optimised recipe it was edited from are kept here.
 */
export type SavedResult =
  | { mode: "optimised"; result: FormulateResult }
  | { mode: "manual"; base: OptimalResult; check: Omit<ManualCheck, "cost" | "assessment"> };
export interface SavedVersion {
  v: number;
  date: number;
  snap: Snapshot;
  sum: Summary;
}
/** A note from FeedSport's advising nutritionist, left through the MCP server. */
export interface SavedAdvice {
  id: string;
  /** The version it was written against; null for the formulation as a whole. */
  v: number | null;
  author: string;
  body: string;
  date: number;
  /** A suggested revision the user can open and save as a new version. */
  suggestion: Snapshot | null;
  read: boolean;
}
export interface SavedDoc {
  id: string;
  name: string;
  versions: SavedVersion[];
  /** Newest first. */
  advice: SavedAdvice[];
}

export interface EngineContext {
  catalogue: Map<string, CatalogueIngredient>;
  programmes: StudioProgrammeData;
}

export const GOAL_ALTERNATIVE: Record<Exclude<GoalKey, "least_cost">, FormulationAlternative["id"]> = {
  simpler: "simple",
  less_sbm: "low-soy",
  local: "low-import",
};

export function fmt(v: number | string, dp: number) {
  return (+v).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

/** An inclusion next to the bound it breaks: trailing zeros dropped, never written equal to it (3.2001% vs 3.2%). */
export function pctPair(value: number, bound: number): [string, string] {
  const dp = distinguishingDp(value, bound, exactDp(bound, 0, 3));
  const trim = (v: number) => fmt(v, dp).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  return [trim(value), trim(bound)];
}

export function phaseOf(programmes: StudioProgrammeData, programmeId: string, phaseId: string): { programme: StudioProgramme; phase: StudioPhase } {
  const programme = programmes.programmes.find((p) => p.id === programmeId) ?? programmes.programmes[0];
  const phase = programme.phases.find((ph) => ph.id === phaseId) ?? programme.phases[0];
  return { programme, phase };
}

function limitFor(ctx: EngineContext, phase: StudioPhase, id: string) {
  return phase.limitsKey ? ctx.programmes.limits[phase.limitsKey]?.find((l) => l.id === id) : undefined;
}

/** FeedSport's hard maximum for an ingredient at this phase (Brazilian Tables Table 1.01), or 100. */
export function fsLimit(ctx: EngineContext, phase: StudioPhase, id: string) {
  return limitFor(ctx, phase, id)?.maxPct ?? 100;
}

/** Practical guideline: going above it is allowed but triggers an advisory. */
export function guideline(ctx: EngineContext, phase: StudioPhase, id: string) {
  return limitFor(ctx, phase, id)?.practicalPct;
}

/** USD per tonne: the user's price, else the FeedSport planning price. */
export function priceOf(id: string, pool: Pool, catalogue: Map<string, CatalogueIngredient>): number | null {
  const e = pool[id];
  if (e && e.price != null && e.price !== "") return +e.price;
  return catalogue.get(id)?.price?.usdPerTonne ?? null;
}

const nameOf = (ctx: EngineContext, id: string) => ctx.catalogue.get(id)?.name ?? id;

// The engine's constraint ids, as people read them (used when it reports missing data).
const CONSTRAINT_NAMES: Record<string, string> = {
  "energy-me": "metabolizable energy",
  "energy-ne": "net energy",
  "crude-protein": "crude protein",
  "digestible-protein": "digestible protein",
  "sid-lysine": "SID lysine",
  "sid-met-cys": "SID methionine + cysteine",
  "sid-threonine": "SID threonine",
  "sid-tryptophan": "SID tryptophan",
  "sid-valine": "SID valine",
  "sid-isoleucine": "SID isoleucine",
  "sid-leucine": "SID leucine",
  "sid-histidine": "SID histidine",
  "sid-phe-tyr": "SID phenylalanine + tyrosine",
  calcium: "calcium",
  "sttd-phosphorus": "digestible phosphorus",
  "available-phosphorus": "available phosphorus",
  sodium: "sodium",
  potassium: "potassium",
  chloride: "chloride",
  "linoleic-acid": "linoleic acid",
};
const constraintName = (id: string) => CONSTRAINT_NAMES[id] ?? id.replace(/-/g, " ");

export function bounds(ctx: EngineContext, phase: StudioPhase, id: string, e: PoolEntry) {
  const fsMax = fsLimit(ctx, phase, id);
  if (e.role === "fixed") {
    const f = Number(e.fixed) || 0;
    return { lo: f, hi: f, fsMax };
  }
  const hi = e.max != null && e.max !== "" ? Math.min(+e.max, fsMax) : fsMax;
  const lo = e.role === "required" ? Number(e.min) || 0 : 0;
  return { lo, hi, fsMax };
}

const nutrientDp = (id: string, unit: string) => (unit !== "%" ? 0 : id === "crude-protein" || id === "digestible-protein" ? 1 : 2);

/**
 * One row per requirement; a nutrient with both a minimum and a maximum
 * becomes one row. Status uses the assessment's tolerance, and `dp` shows
 * each bound as published and a failing value as different from its bound.
 */
export function nutrientRows(profile: readonly FormulationNutrientComparison[]): NutrientResult[] {
  const rows = new Map<string, NutrientResult>();
  for (const n of profile) {
    const row = rows.get(n.id) ?? { id: n.id, name: n.label, unit: n.unit, dp: nutrientDp(n.id, n.unit), value: n.actual, min: null, max: null, status: "met" as NutrientResult["status"], limiting: false };
    const met = withinBound(n.relation, n.actual, n.requirement, nutrientFeasibilityTolerance(n.requirement));
    if (n.relation === "min") {
      row.min = n.requirement;
      if (!met) row.status = "below";
    } else {
      row.max = n.requirement;
      if (!met) row.status = "above";
    }
    row.dp = met ? Math.max(row.dp, exactDp(n.requirement, row.dp)) : Math.max(row.dp, distinguishingDp(n.actual, n.requirement, exactDp(n.requirement, row.dp)));
    row.limiting = row.limiting || n.binding;
    rows.set(n.id, row);
  }
  return [...rows.values()];
}

function advisoriesFor(ctx: EngineContext, phase: StudioPhase, pct: Record<string, number>): Advisory[] {
  return Object.keys(pct).flatMap((id) => {
    const g = guideline(ctx, phase, id);
    if (g == null || withinBound("max", pct[id], g, INCLUSION_TOLERANCE_PCT)) return [];
    const [shown, guide] = pctPair(pct[id], g);
    return [{ id, pct: pct[id], guide: g, text: nameOf(ctx, id) + " is included at " + shown + "%. The practical guideline for this stage is up to " + guide + "%." }];
  });
}

const pctList = (solution: FormulationSolution) => solution.formula.ingredients.filter((i) => i.inclusionPct > 1e-6).map((i) => ({ id: i.ingredientId, pct: i.inclusionPct })).sort((a, b) => b.pct - a.pct);
const pctMap = (solution: FormulationSolution) => Object.fromEntries(solution.formula.ingredients.filter((i) => i.inclusionPct > 1e-6).map((i) => [i.ingredientId, i.inclusionPct]));

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => null);
  if (!data) throw new Error("The formulation service didn’t answer. Try again.");
  return data as T;
}

/** Runs the formulation for a snapshot. Never throws: failures come back as status "error". */
export async function formulate(snap: Snapshot, ctx: EngineContext): Promise<FormulateResult> {
  const t0 = performance.now();
  const { programme, phase } = phaseOf(ctx.programmes, snap.programmeId, snap.phaseId);
  const active = Object.keys(snap.pool).filter((id) => snap.pool[id].role !== "excluded");
  const errs: Issue[] = [];
  const warns: Issue[] = [];
  for (const message of studioPremixProblems(snap.pool, snap.programmeId, snap.phaseId)) {
    errs.push({ title: "Invalid premix selection", body: message });
  }
  const realPremix = active.map(commercialPremixById).find((product) => product !== undefined);
  if (!realPremix) {
    warns.push({ title: "No commercial premix selected", body: "The recipe is formulated without vitamin and trace-mineral supplementation. Chapter 7 recommendations are compared under Advisories." });
  }

  const missingPremixPrice = !!realPremix && priceOf(realPremix.id, snap.pool, ctx.catalogue) === null;
  if (missingPremixPrice) warns.push({
    title: "Partial ingredient cost — supplier quotation required",
    body: `${realPremix!.name} has no price, so costs exclude it. At ${realPremix!.inclusionKgPerTonne} kg/t it could add a lot. Enter your price to see the full cost.`,
  });
  if (!active.length) errs.push({ title: "Add at least one ingredient", body: "There is nothing for FeedSport to mix yet." });
  for (const id of active) {
    if (priceOf(id, snap.pool, ctx.catalogue) == null && id !== realPremix?.id)
      errs.push({ id, title: "Set a price for " + nameOf(ctx, id), body: "FeedSport has no planning price for it, and least cost needs a price for every ingredient it may use." });
  }
  let lo = 0,
    hiSum = 0;
  const parts: string[] = [];
  for (const id of active) {
    const b = bounds(ctx, phase, id, snap.pool[id]);
    lo += b.lo;
    hiSum += b.hi;
    if (b.lo > 0) parts.push(nameOf(ctx, id) + " " + (snap.pool[id].role === "fixed" ? "fixed at " : "at least ") + b.lo + "%");
    const e = snap.pool[id];
    if (e.max != null && e.max !== "" && +e.max > b.fsMax)
      warns.push({ id, title: nameOf(ctx, id) + ": your maximum " + e.max + "% is above the FeedSport limit", body: "The FeedSport limit of " + b.fsMax + "% for this stage applies instead." });
  }
  if (lo > 100.0001) errs.push({ title: "Your minimums add up to " + fmt(lo, 1) + "%", body: parts.join(", ") + ". Lower one of them so the total is under 100%." });
  if (active.length && hiSum < 99.9999) errs.push({ title: "Your maximums only add up to " + fmt(hiSum, 1) + "%", body: "Raise a maximum or add an ingredient so the mix can reach 100%." });
  if (errs.length) return { status: "blocked", errs, warns };

  for (const id of active) {
    const e = snap.pool[id];
    if ((e.price == null || e.price === "") && ctx.catalogue.get(id)?.price)
      warns.push({ id, soft: true, title: nameOf(ctx, id) + " uses the FeedSport planning price", body: "$" + fmt(priceOf(id, snap.pool, ctx.catalogue)!, 0) + " / t. Your cost will differ if you pay more or less." });
  }

  // Ingredients missing a value this phase needs are set aside and the rest re-solved,
  // rather than stopping the whole formulation.
  let usable = active;
  let result: (LeastCostFormulationResult & { premixComparison?: PremixComparison | null; premixEffect?: PremixRecipeEffect | null }) | {
    status: "manufacturer_recipe";
    warning: string;
    cost_per_tonne: number | null;
    premix_analysis: { message: string };
    assessment: FormulationAssessment;
    premixComparison?: undefined;
    recipe: { ingredients: Array<{ ingredientId: string; inclusionPct: number }> };
  };
  for (;;) {
    const ingredients = usable.map((id) => {
      const b = bounds(ctx, phase, id, snap.pool[id]);
      return { ingredientId: id, pricePerKg: (priceOf(id, snap.pool, ctx.catalogue) ?? (id === realPremix?.id ? 0 : NaN)) / 1000, ...(b.lo > 0 ? { minInclusionPct: b.lo } : {}), ...(b.hi < 100 ? { maxInclusionPct: b.hi } : {}) };
    });
    if (!ingredients.length) return { status: "blocked", errs: [{ title: "None of these ingredients has the data this stage needs", body: "Add ingredients with complete nutrient values from the catalogue." }], warns };
    try {
      result = await post<typeof result>("/api/feed-formulation/optimize", { programmeId: programme.id, phaseId: phase.id, energySystem: "ME", ingredients, unpricedIngredientIds: missingPremixPrice ? [realPremix!.id] : [] });
    } catch (error) {
      return { status: "error", warns, message: error instanceof Error ? error.message : String(error) };
    }
    if (result.status !== "missing-data") break;
    const missing = new Set(result.missingData.map((m) => m.ingredientId));
    for (const m of result.missingData) {
      const labels = m.nutrientIds.map(constraintName);
      warns.push({ id: m.ingredientId, title: nameOf(ctx, m.ingredientId) + " is missing " + labels.slice(0, 4).join(", ") + (labels.length > 4 ? " and " + (labels.length - 4) + " more" : ""), body: "It can’t be used for this stage until those values are added. It has been set aside, not removed from your list." });
    }
    usable = usable.filter((id) => !missing.has(id));
  }

  if (result.status === "manufacturer_recipe") {
    if (!result.assessment) return { status: "error", warns, message: "The formulation service returned a manufacturer recipe without its nutritional assessment." };
    return {
      status: "manufacturer_recipe",
      warns,
      assessment: result.assessment,
      recipe: result.recipe.ingredients.map((row) => ({
        id: row.ingredientId,
        name: nameOf(ctx, row.ingredientId),
        pct: row.inclusionPct,
      })),
      costT: missingPremixPrice ? null : result.cost_per_tonne,
      message: `${result.warning} ${result.premix_analysis.message} This is a fixed supplier recipe, NOT a least-cost-optimised feed. No ingredient changes are authorised without manufacturer approval.`,
    };
  }
  if (result.status === "error") return { status: "error", warns, message: result.message };
  if (result.status === "infeasible") {
    if (!result.assessment) return { status: "error", warns, message: "The formulation service returned an infeasible result without its assessment." };
    return {
      status: "infeasible",
      warns,
      activeCount: usable.length,
      setAside: active.filter((id) => !usable.includes(id)),
      shortfalls: result.diagnostics.map((d) => ({ id: d.constraintId, name: d.label, unit: d.unit, dp: distinguishingDp(d.actual, d.bound, exactDp(d.bound, nutrientDp(d.constraintId, d.unit))), kind: d.relation, best: d.actual, req: d.bound })),
      assessment: result.assessment,
      closest: result.bestEffort ? pctList(result.bestEffort) : [],
      costT: result.bestEffort ? result.bestEffort.costPerKg * 1000 : null,
      costExcludesPremix: missingPremixPrice,
      premixComparison: result.premixComparison ?? null,
    };
  }

  const base = result.solution;
  const goal = snap.goal;
  const altKind = goal === "least_cost" ? null : GOAL_ALTERNATIVE[goal];
  const alt = altKind ? result.alternatives.find((a) => a.id === altKind) : undefined;
  const chosen = alt?.solution ?? base;
  const profile = alt?.nutrientProfile ?? result.nutrientProfile;
  const pct = pctMap(chosen);
  const basePct = pctMap(base);
  const recipe = Object.keys(pct)
    .sort((a, b) => pct[b] - pct[a])
    .map((id): RecipeLine => {
      const b = bounds(ctx, phase, id, snap.pool[id] ?? { role: "available" });
      const role = snap.pool[id]?.role ?? "available";
      return { id, name: nameOf(ctx, id), pct: pct[id], price: priceOf(id, snap.pool, ctx.catalogue), role, atMax: b.hi < 100 && Math.abs(pct[id] - b.hi) < 1e-3 && role !== "fixed", hi: b.hi, fsMax: b.fsMax };
    });
  const altFor = (key: Exclude<GoalKey, "least_cost">) => result.alternatives.find((a) => a.id === GOAL_ALTERNATIVE[key]);
  const strategy = (key: Exclude<GoalKey, "least_cost">, label: string, none: string): Strategy => {
    const a = altFor(key);
    return a
      ? { key, label, cost: a.solution.costPerKg * 1000, count: a.solution.formula.ingredients.filter((i) => i.inclusionPct > 1e-6).length, possible: true, note: a.description }
      : { key, label, possible: false, note: none };
  };
  const nutrients = nutrientRows(profile);
  const assessment = alt?.assessment ?? result.assessment;
  if (!assessment) return { status: "error", warns, message: "The formulation service returned a recipe without its nutritional assessment." };
  return {
    status: "optimal",
    recipe,
    unused: usable.filter((id) => !pct[id]),
    setAside: active.filter((id) => !usable.includes(id)),
    costT: chosen.costPerKg * 1000,
    leastCostT: base.costPerKg * 1000,
    nutrients,
    advisories: advisoriesFor(ctx, phase, pct),
    warns,
    strategies: [
      { key: "least_cost", label: "Least cost", cost: base.costPerKg * 1000, count: Object.keys(basePct).length, possible: true },
      strategy("simpler", "Simpler recipe", "Every ingredient is needed to stay within 3% of least cost."),
      strategy("less_sbm", "Less soybean meal", "No recipe uses less soybean meal within 3% of least cost."),
      strategy("local", "Fewer imports", "No recipe uses fewer imported ingredients within 3% of least cost."),
    ],
    dropped: alt && snap.goal === "simpler" ? Object.keys(basePct).filter((id) => !pct[id]) : [],
    goalUnavailable: snap.goal !== "least_cost" && !alt,
    opportunities: result.ingredientOpportunities.map((o) => ({ id: o.ingredientId, name: nameOf(ctx, o.ingredientId), points: o.points.map((p) => ({ tolerancePct: p.costTolerancePct, maxPct: p.maxInclusionPct })) })),
    ms: performance.now() - t0,
    nVars: usable.length,
    nRows: nutrients.length,
    costExcludesPremix: missingPremixPrice,
    assessment,
    premixComparison: result.premixComparison ?? null,
    // Both advisories describe the least-cost recipe. Never attach its effect
    // notes to a simpler, lower-soy or lower-import recipe.
    premixEffect: alt ? null : result.premixEffect ?? null,
    premixComparedOnLeastCost: !!alt,
  };
}

export interface ManualCheck {
  recipeValidity: ManualRecipeValidity;
  nutrientAdequacy: "met" | "not-met" | "unknown" | "not-checked";
  nutrients: NutrientResult[];
  incompleteRequirements: FormulationIncompleteRequirement[];
  advisories: Advisory[];
  cost: number;
  assessment: FormulationAssessment | null;
}

export interface ManualRecipeValidity {
  valid: boolean;
  total: number;
  issues: Issue[];
}

// Individual ingredient bounds are compared exactly, up to floating-point
// error, as the optimizer enforces them (INCLUSION_TOLERANCE_PCT).
const MANUAL_BOUND_TOLERANCE = INCLUSION_TOLERANCE_PCT;

/** Checks that a manual recipe is complete and obeys every configured hard ingredient bound. */
export function validateManualRecipe(snap: Snapshot, pct: Record<string, number>, ctx: EngineContext): ManualRecipeValidity {
  const { phase } = phaseOf(ctx.programmes, snap.programmeId, snap.phaseId);
  const issues: Issue[] = [];
  const values = Object.entries(pct);
  const total = values.reduce((sum, [, value]) => sum + (Number.isFinite(value) ? value : 0), 0);

  for (const [id, value] of values) {
    if (!Number.isFinite(value) || value < 0) {
      issues.push({ id, title: "Enter a valid amount for " + nameOf(ctx, id), body: "Ingredient amounts must be zero or a positive percentage." });
    }
    if (!ctx.catalogue.has(id)) {
      issues.push({ id, title: "Unknown ingredient " + id, body: "This ingredient is not in the FeedSport catalogue and cannot be checked." });
    } else if (value > MANUAL_BOUND_TOLERANCE && !Object.prototype.hasOwnProperty.call(snap.pool, id)) {
      issues.push({ id, title: nameOf(ctx, id) + " is not in the selected ingredient pool", body: "Add it to the pool before using it in this recipe." });
    }
  }
  if (!isCompleteInclusionTotal(total)) {
    issues.push({ title: "Recipe total is " + fmt(total, distinguishingDp(total, 100, 2)) + "%", body: "A complete manual recipe must add to 100%." });
  }

  for (const [id, entry] of Object.entries(snap.pool)) {
    const inclusion = pct[id] ?? 0;
    if (entry.role === "excluded") {
      if (inclusion > MANUAL_BOUND_TOLERANCE)
        issues.push({ id, title: nameOf(ctx, id) + " is excluded", body: "Set its amount to 0%, or change its ingredient setting before using it." });
      continue;
    }
    const { lo, hi, fsMax } = bounds(ctx, phase, id, entry);
    if (entry.role === "fixed") {
      if (!withinBound("equal", inclusion, lo, MANUAL_BOUND_TOLERANCE)) {
        const [amount, fixed] = pctPair(inclusion, lo);
        issues.push({ id, title: nameOf(ctx, id) + " must be fixed at " + fixed + "%", body: "The manual amount is " + amount + "% and does not match its fixed inclusion." });
      }
      continue;
    }
    if (!withinBound("min", inclusion, lo, MANUAL_BOUND_TOLERANCE)) {
      const [amount, min] = pctPair(inclusion, lo);
      issues.push({ id, title: nameOf(ctx, id) + " is below its minimum", body: "Use at least " + min + "%; the manual recipe uses " + amount + "%." });
    }
    if (!withinBound("max", inclusion, hi, MANUAL_BOUND_TOLERANCE)) {
      const source = hi === fsMax ? "FeedSport stage limit" : "configured maximum";
      const [amount, max] = pctPair(inclusion, hi);
      issues.push({ id, title: nameOf(ctx, id) + " is above its maximum", body: "The " + source + " is " + max + "%; the manual recipe uses " + amount + "%." });
    }
  }

  return { valid: issues.length === 0, total, issues };
}

/**
 * Checks typed-in amounts (manual mode). Ingredient validity is established
 * before the nutrition endpoint is called, so an incomplete/out-of-bounds
 * recipe can never inherit or display an apparently satisfactory profile.
 */
export async function evaluateManual(snap: Snapshot, pct: Record<string, number>, ctx: EngineContext): Promise<ManualCheck> {
  const { programme, phase } = phaseOf(ctx.programmes, snap.programmeId, snap.phaseId);
  const recipeValidity = validateManualRecipe(snap, pct, ctx);
  const cost = Object.keys(pct).reduce((t, id) => t + (Math.max(0, pct[id]) / 100) * (priceOf(id, snap.pool, ctx.catalogue) ?? 0), 0);
  if (!recipeValidity.valid) return { recipeValidity, nutrientAdequacy: "not-checked", nutrients: [], incompleteRequirements: [], advisories: [], cost, assessment: null };

  const data = await post<{ status: string; nutrientProfile?: FormulationNutrientComparison[]; incompleteRequirements?: FormulationIncompleteRequirement[]; assessment?: FormulationAssessment; message?: string }>("/api/feed-formulation/evaluate", {
    programmeId: programme.id,
    phaseId: phase.id,
    energySystem: "ME",
    ingredients: Object.keys(pct).filter((id) => pct[id] > 0).map((id) => ({ ingredientId: id, inclusionPct: pct[id] })),
  });
  if (data.status !== "evaluated" || !data.nutrientProfile) throw new Error(data.message ?? "Couldn’t check this recipe.");
  const nutrients = nutrientRows(data.nutrientProfile);
  const incompleteRequirements = data.incompleteRequirements ?? [];
  const hasFailure = nutrients.some((nutrient) => nutrient.status !== "met");
  return {
    recipeValidity,
    nutrientAdequacy: hasFailure ? "not-met" : incompleteRequirements.length ? "unknown" : "met",
    nutrients,
    incompleteRequirements,
    advisories: advisoriesFor(ctx, phase, pct),
    cost,
    assessment: data.assessment ?? null,
  };
}

/** A checked manual recipe, as saved. */
export interface ManualResult extends ManualCheck {
  recipe: { id: string; pct: number }[];
}

export function summarise(r: FormulateResult, manual: ManualResult | null): Summary {
  const counts = (assessment: Summary["assessment"]) => isFormulationAssessment(assessment)
    ? (({ met, total, failed }) => ({ met, req: total, fail: failed.length }))(requirementCounts(assessment))
    : {};
  if (manual) {
    const { recipeValidity, nutrientAdequacy, nutrients, incompleteRequirements, advisories } = manual;
    return {
      status: "manual", costT: manual.cost, recipe: manual.recipe, adv: advisories.length, ...counts(manual.assessment ?? undefined), ...(manual.assessment ? { assessment: manual.assessment } : {}),
      ...(r.status === "optimal" ? { result: { mode: "manual", base: r, check: { recipeValidity, nutrientAdequacy, nutrients, incompleteRequirements, advisories } } } : {}),
    };
  }
  const result: SavedResult = { mode: "optimised", result: r };
  if (r.status === "manufacturer_recipe") return { status: r.status, recipe: r.recipe.map((row) => ({ id: row.id, pct: row.pct })), ...(r.costT === null ? {} : { costT: r.costT }), ...counts(r.assessment), assessment: r.assessment, result };
  if (r.status !== "optimal") return { status: r.status, ...(r.status === "infeasible" ? { ...counts(r.assessment), assessment: r.assessment } : {}), result };
  return { status: "optimal", ...(r.costExcludesPremix ? {} : { costT: r.costT }), recipe: r.recipe.map((x) => ({ id: x.id, pct: x.pct })), adv: r.advisories.length, ...counts(r.assessment), assessment: r.assessment, result };
}

export type RestoredVersion =
  | { mode: "optimised"; result: FormulateResult }
  | { mode: "manual"; result: OptimalResult; manual: ManualAmounts; check: ManualCheck }
  /** Saved before results were stored: re-run its settings, then re-enter any saved manual amounts. */
  | { mode: "rerun"; manual: ManualAmounts | null; wasManual: boolean };

/**
 * Manual-mode amounts. `typed` is what each input shows; `exact` keeps the
 * full-precision value behind an amount filled in from a recipe, which counts
 * for as long as its input still shows it unchanged. A recipe copied into
 * manual mode is therefore checked exactly as calculated, not as its rounding.
 */
export interface ManualAmounts {
  typed: Record<string, string>;
  exact: Record<string, number>;
}

export const NO_MANUAL_AMOUNTS: ManualAmounts = { typed: {}, exact: {} };

/** How a calculated amount is shown for editing. */
export const shownAmount = (pct: number) => String(+pct.toFixed(2));

/** The amounts that count: exact values not retyped since, then typed numbers, leaving out zeros. */
export function manualPct({ typed, exact }: ManualAmounts): Record<string, number> {
  const pct: Record<string, number> = {};
  for (const id of Object.keys(typed)) {
    const v = id in exact && typed[id] === shownAmount(exact[id]) ? exact[id] : +typed[id];
    if (Number.isFinite(v) && v !== 0) pct[id] = v;
  }
  return pct;
}

/** Identifies a set of manual amounts by the values that count, however they are written. */
export const manualSig = (manual: ManualAmounts) => JSON.stringify(manualPct(manual));

/** Manual-mode amounts for a recipe: its own percentages, and 0 for the other `ids`. */
export function manualAmounts(recipe: readonly { id: string; pct: number }[], ids: Iterable<string>): ManualAmounts {
  const typed: Record<string, string> = {};
  const exact: Record<string, number> = {};
  for (const line of recipe) {
    typed[line.id] = shownAmount(line.pct);
    exact[line.id] = line.pct;
  }
  for (const id of ids) if (!(id in typed)) typed[id] = "0";
  return { typed, exact };
}

const poolIdsOf = (pool: Pool) => Object.keys(pool).filter((id) => pool[id].role !== "excluded");

/** The settings a result is calculated from. */
export const settingsSig = (s: Pick<Snapshot, "programmeId" | "phaseId" | "pool" | "goal">) => JSON.stringify({ programmeId: s.programmeId, phaseId: s.phaseId, pool: s.pool, goal: s.goal });

/** What saving records, compared with the workspace to tell whether it has unsaved changes. */
export const savedStateSig = (s: Pick<Snapshot, "programmeId" | "phaseId" | "pool" | "goal">, mode: "optimised" | "manual", manual: ManualAmounts) =>
  settingsSig(s) + mode + (mode === "manual" ? manualSig(manual) : "");

/**
 * How to reopen a saved version: exactly as saved when its result was stored,
 * without calling the engine. Older versions say so and re-run instead; a
 * manual one keeps its saved amounts rather than the re-run's recipe.
 */
export function restoreVersion(version: SavedVersion): RestoredVersion {
  const { sum, snap } = JSON.parse(JSON.stringify(version)) as SavedVersion;
  const saved = sum.result;
  const isManual = sum.status === "manual";
  if (isManual && saved?.mode === "manual" && saved.base?.status === "optimal" && saved.check && sum.recipe && typeof sum.costT === "number" && isFormulationAssessment(sum.assessment))
    return { mode: "manual", result: saved.base, manual: manualAmounts(sum.recipe, poolIdsOf(snap.pool)), check: { ...saved.check, cost: sum.costT, assessment: sum.assessment } };
  if (!isManual && saved?.mode === "optimised" && saved.result?.status === sum.status) return { mode: "optimised", result: saved.result };
  return { mode: "rerun", manual: isManual && sum.recipe?.length ? manualAmounts(sum.recipe, poolIdsOf(snap.pool)) : null, wasManual: isManual };
}

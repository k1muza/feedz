import type { CatalogueIngredient } from "@/lib/studio-catalogue";
import { commercialPremixById, publishedPremixAminoAcids, publishedMinimumTotalAminoAcidsInFeed } from "@/lib/commercial-premixes";
import { studioPremixProblems } from "@/lib/studio-commercial-premix";
import type { IngredientListItem } from "@/lib/ingredient-lists";
import type { StudioPhase, StudioProgramme, StudioProgrammeData } from "@/lib/studio-programmes";
import type {
  FormulationAlternative,
  FormulationIncompleteRequirement,
  FormulationNutrientComparison,
  FormulationSolution,
  LeastCostFormulationResult,
} from "@/lib/feed-optimizer";
import type { FormulationAssessment } from "@/lib/formulation-assessment-model";

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
  /** Canonical feasibility and nutritional-verification result. */
  assessment: FormulationAssessment;
}

export type FormulateResult =
  | { status: "manufacturer_recipe"; recipe: Array<{ id: string; name: string; pct: number }>;
      costT: number | null; message: string; warns: Issue[]; assessment: FormulationAssessment }
  | { status: "blocked"; errs: Issue[]; warns: Issue[] }
  | { status: "infeasible"; warns: Issue[]; shortfalls: Shortfall[]; activeCount: number; setAside: string[]; assessment: FormulationAssessment }
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
  /** Added in schema v1; older saved summaries are handled conservatively. */
  assessment?: FormulationAssessment;
}
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

/** One row per requirement; a nutrient with both a minimum and a maximum becomes one row. */
export function nutrientRows(profile: readonly FormulationNutrientComparison[]): NutrientResult[] {
  const rows = new Map<string, NutrientResult>();
  for (const n of profile) {
    const row = rows.get(n.id) ?? { id: n.id, name: n.label, unit: n.unit, dp: nutrientDp(n.id, n.unit), value: n.actual, min: null, max: null, status: "met" as NutrientResult["status"], limiting: false };
    if (n.relation === "min") {
      row.min = n.requirement;
      if (n.actual < n.requirement * (1 - 1e-6)) row.status = "below";
    } else {
      row.max = n.requirement;
      if (n.actual > n.requirement * (1 + 1e-6)) row.status = "above";
    }
    row.limiting = row.limiting || n.binding;
    rows.set(n.id, row);
  }
  return [...rows.values()];
}

function advisoriesFor(ctx: EngineContext, phase: StudioPhase, pct: Record<string, number>): Advisory[] {
  return Object.keys(pct).flatMap((id) => {
    const g = guideline(ctx, phase, id);
    return g != null && pct[id] > g + 1e-6
      ? [{ id, pct: pct[id], guide: g, text: nameOf(ctx, id) + " is included at " + fmt(pct[id], 1) + "%. The practical guideline for this stage is up to " + g + "%." }]
      : [];
  });
}

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
  for (const message of studioPremixProblems(snap.pool, snap.programmeId)) {
    errs.push({ title: "Invalid premix selection", body: message });
  }
  const realPremix = active.map(commercialPremixById).find((product) => product !== undefined);
  if (realPremix) {
    const guarantees = publishedPremixAminoAcids(realPremix);
    const lowerBounds = publishedMinimumTotalAminoAcidsInFeed(realPremix);
    const aminoNote = guarantees.length
      ? " Published label guarantees: " + guarantees.map((claim) =>
          `${claim.name} ${claim.minimumPct === null ? "" : "≥ " + claim.minimumPct + "%"} TOTAL in premix`,
        ).join(", ") + ". Conditional total amino-acid contributions at this inclusion: " +
        lowerBounds.map((claim) => `${claim.name} ≥${claim.minTotalFeedPct}% of finished feed`).join(", ") +
        ". These are NOT SID values; no SID contribution is credited without digestibility data."
      : " This manufacturer has not published an SID amino-acid analysis for this SKU.";
    warns.push({
      id: realPremix.id,
      title: `${realPremix.name} — supplier dose`,
      body: `Included at the supplier's published dose of ${realPremix.inclusionKgPerTonne} kg/tonne.${aminoNote} ${realPremix.specificationUrl}`,
    });
  } else {
    warns.push({ title: "No commercial premix selected", body: "Basal nutrient formulation alone does not validate vitamin and trace-mineral supplementation." });
  }

  const missingPremixPrice = !!realPremix && priceOf(realPremix.id, snap.pool, ctx.catalogue) === null;
  if (missingPremixPrice) warns.push({
    title: "Partial ingredient cost — supplier quotation required",
    body: `The displayed cost EXCLUDES ${realPremix!.name} at ${realPremix!.inclusionKgPerTonne} kg/tonne. FeedSport treats that fixed-price term as 0 ONLY inside the optimisation objective to find the cheapest basal mix. It is NOT a free product or an actual total-feed price. Enter your quote to see full costs.`,
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
  let result: LeastCostFormulationResult | {
    status: "manufacturer_recipe";
    warning: string;
    cost_per_tonne: number | null;
    premix_analysis: { message: string };
    assessment: FormulationAssessment;
    recipe: { ingredients: Array<{ ingredientId: string; inclusionPct: number }> };
  };
  for (;;) {
    const ingredients = usable.map((id) => {
      const b = bounds(ctx, phase, id, snap.pool[id]);
      return { ingredientId: id, pricePerKg: (priceOf(id, snap.pool, ctx.catalogue) ?? (id === realPremix?.id ? 0 : NaN)) / 1000, ...(b.lo > 0 ? { minInclusionPct: b.lo } : {}), ...(b.hi < 100 ? { maxInclusionPct: b.hi } : {}) };
    });
    if (!ingredients.length) return { status: "blocked", errs: [{ title: "None of these ingredients has the data this stage needs", body: "Add ingredients with complete nutrient values from the catalogue." }], warns };
    try {
      result = await post<typeof result>("/api/feed-formulation/optimize", { programmeId: programme.id, phaseId: phase.id, energySystem: "ME", ingredients });
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
      shortfalls: result.diagnostics.map((d) => ({ id: d.constraintId, name: d.label, unit: d.unit, dp: nutrientDp(d.constraintId, d.unit), kind: d.relation, best: d.actual, req: d.bound })),
      assessment: result.assessment,
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

const MANUAL_TOTAL_TOLERANCE = 0.05;
const MANUAL_BOUND_TOLERANCE = 1e-6;

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
  if (Math.abs(total - 100) > MANUAL_TOTAL_TOLERANCE) {
    issues.push({ title: "Recipe total is " + fmt(total, 2) + "%", body: "A complete manual recipe must add to 100%." });
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
      if (Math.abs(inclusion - lo) > MANUAL_BOUND_TOLERANCE)
        issues.push({ id, title: nameOf(ctx, id) + " must be fixed at " + fmt(lo, 3).replace(/\.?0+$/, "") + "%", body: "The manual amount is " + fmt(inclusion, 3).replace(/\.?0+$/, "") + "% and does not match its fixed inclusion." });
      continue;
    }
    if (inclusion < lo - MANUAL_BOUND_TOLERANCE)
      issues.push({ id, title: nameOf(ctx, id) + " is below its minimum", body: "Use at least " + fmt(lo, 3).replace(/\.?0+$/, "") + "%; the manual recipe uses " + fmt(inclusion, 3).replace(/\.?0+$/, "") + "%." });
    if (inclusion > hi + MANUAL_BOUND_TOLERANCE) {
      const source = hi === fsMax ? "FeedSport stage limit" : "configured maximum";
      issues.push({ id, title: nameOf(ctx, id) + " is above its maximum", body: "The " + source + " is " + fmt(hi, 3).replace(/\.?0+$/, "") + "%; the manual recipe uses " + fmt(inclusion, 3).replace(/\.?0+$/, "") + "%." });
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

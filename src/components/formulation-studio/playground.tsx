"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type DragEvent, type KeyboardEvent, type ReactNode, type RefObject } from "react";

import { commercialPremixById, commercialPremixCompatibleWithProgramme } from "@/lib/commercial-premixes";
import { canAddStudioIngredient } from "@/lib/studio-commercial-premix";
import { documentationGapLine, formatUpperLimitValue, requirementCounts, upperLimitRows } from "@/lib/formulation-assessment-model";

import { evaluateManual, fmt, formulate, phaseOf, priceOf, type EngineContext, type FormulateResult, type ManualCheck, type NutrientResult, type Pool, type SavedDoc } from "./engine";
import type { FeaturedFormulation } from "./featured";
import {
  balance,
  checkSig,
  costOf,
  EPS,
  exactPct,
  fixedSumOf,
  fmtPct,
  friendly,
  guidelineNotes,
  inputPct,
  isComplete,
  limitPct,
  lowerName,
  maxFor,
  parseNum,
  partialValues,
  pctOf,
  planningPrice,
  poolOf,
  premixIn,
  snapOf,
  solveSig,
  SYNTHETIC,
  totalOf,
  verdictOf,
  type BarStatus,
  type Check,
  type PgItem,
  type PgMix,
  type PgRole,
} from "./playground-model";
import { hv, sx } from "./sx";

// The Playground (design/FeedSport Playground.html): start from a featured or
// saved recipe, drag ingredients in, slide amounts, lock some, and see cost and
// the engine's nutritional check update. "Balance the rest for me" runs the
// optimiser around locked amounts and premix doses and offers the answer as a
// proposal. Nothing is stored: "Use in Studio" opens the mix as a new,
// unsaved Studio draft, and the recipe it came from is never changed.

/** A Playground mix handed to Studio: exact amounts, roles and prices. */
export interface PlaygroundDraft {
  name: string;
  programmeId: string;
  phaseId: string;
  pool: Pool;
  recipe: { id: string; pct: number }[];
}

export interface PlaygroundProps {
  engine: EngineContext;
  featured: FeaturedFormulation[];
  /** Featured recipes Home already formulated, reused rather than solved again. */
  featuredResults: Record<string, FormulateResult> | null;
  /** Saved formulations, or null while they load. */
  docs: SavedDoc[] | null;
  flash: (msg: string) => void;
  onOpenDraft: (draft: PlaygroundDraft) => void;
}

interface Source {
  key: string;
  label: string;
  short: string;
  kind: "featured" | "saved";
}

type Proposal = { sig: string } & (
  | { status: "solving" }
  | { status: "problem"; title: string; lines: string[] }
  | { status: "ok"; pct: Record<string, number>; costT: number; costExcludesPremix: boolean; met: number; total: number; meets: boolean; setAside: string[] }
  | { status: "closest"; pct: Record<string, number>; costT: number | null; costExcludesPremix: boolean; met: number; total: number; unmet: Unmet[]; worstPct: number | null; hint: string }
);

/** A requirement the closest achievable mix still misses. */
interface Unmet {
  id: string;
  name: string;
  kind: "min" | "max";
  best: string;
  req: string;
  /** % of the requirement it misses by. */
  deviationPct: number | null;
}

type Modal = { type: "source"; to: string } | { type: "studio"; name: string };

interface PgState extends PgMix {
  sourceKey: string | null;
  loading: boolean;
  loadError: string | null;
  programmeId: string;
  phaseId: string;
  base: PgMix | null;
  baseCheck: ManualCheck | null;
  hist: PgMix[];
  fut: PgMix[];
  result: Check | null;
  proposal: Proposal | null;
  msg: { id: string; text: string; ok?: boolean } | null;
  edit: { id: string; draft: string } | null;
  modal: Modal | null;
  libOpen: boolean;
  q: string;
  cat: string;
  over: boolean;
  dragging: boolean;
}

const INITIAL: PgState = {
  sourceKey: null, loading: false, loadError: null, programmeId: "", phaseId: "", items: [], autoBal: true, balancer: "", base: null, baseCheck: null,
  hist: [], fut: [], result: null, proposal: null, msg: null, edit: null, modal: null, libOpen: true, q: "", cat: "All", over: false, dragging: false,
};

const LIB_KEY = "fs-pg-lib";
/**
 * The ingredient that keeps the mix at 100% by default: maize when it's in the
 * mix and free, else the largest free cereal. No cereal, no default; the
 * farmer chooses.
 */
function defaultBalancer(items: readonly PgItem[], catalogue: EngineContext["catalogue"]): string {
  const cereals = items.filter((i) => i.role === "free" && catalogue.get(i.id)?.category === "Cereal").sort((a, b) => b.pct - a.pct);
  return (cereals.find((i) => i.id.startsWith("corn-grain")) ?? cereals[0])?.id ?? "";
}

// Category colours from the design, for the catalogue's categories.
const CATC: Record<string, string> = {
  Cereal: "#d39a35", "Oil and fat": "#d39a35", "Protein meal": "#2f5a3f", "By-product": "#a08a5c",
  "Amino acid": "#7da35f", Mineral: "#6c7a86", Premix: "#8c6a7e", Other: "#b9b6ab",
};
const dotOf = (category: string) => CATC[category] ?? "#b9b6ab";
const CATS: [string, string[] | null][] = [
  ["All", null], ["Energy", ["Cereal", "Oil and fat", "By-product"]], ["Protein", ["Protein meal"]], ["Minerals", ["Mineral", "Premix"]], ["Amino acids", ["Amino acid"]],
];

const cloneMix = (m: PgMix): PgMix => ({ items: m.items.map((i) => ({ ...i })), autoBal: m.autoBal, balancer: m.balancer });

const STATUS_COLOR: Record<BarStatus, string> = { met: "#2f5a3f", below: "#c0573f", above: "#d39a35", partial: "#b9b6ab", unknown: "#b9b6ab" };
const STATUS_LABEL: Record<BarStatus, string> = { met: "OK", below: "Too low", above: "Too high", partial: "So far", unknown: "Unknown" };
const STATUS_FG: Partial<Record<BarStatus, string>> = { met: "#2f5a3f", below: "#a8432f", above: "#8a5a14" };

const PG_CSS =
  ".fs-pg input[type=range]{accent-color:#2f5a3f;height:22px}.fs-pg input[type=range]:disabled{accent-color:#b9b6ab}" +
  ".fs-pg button:disabled{cursor:not-allowed}.fs-pg button:focus-visible{outline:2px solid #2f5a3f;outline-offset:1px}" +
  ".fs-pg .fs-pg-tip:hover{text-decoration:underline}";

export function Playground(props: PlaygroundProps) {
  const { engine, featured, featuredResults, docs, flash, onOpenDraft } = props;
  const catalogue = engine.catalogue;
  const [S, setS] = useState<PgState>(INITIAL);
  const set = (patch: Partial<PgState> | ((s: PgState) => Partial<PgState>)) => setS((s) => ({ ...s, ...(typeof patch === "function" ? patch(s) : patch) }));

  // The library panel's open state is remembered per browser.
  useEffect(() => {
    try {
      if (localStorage.getItem(LIB_KEY) === "0") set({ libOpen: false });
    } catch {
      // Storage blocked: the panel starts open.
    }
  }, []);

  // ---- layout: columns follow the space the Playground has, not the window ----
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1100);
  useLayoutEffect(() => {
    const el = frame.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth) setWidth(el.clientWidth);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- recipes to start from ----
  const sources: Source[] = [
    ...featured.map((f): Source => ({ key: "f:" + f.id, label: f.name, short: f.name, kind: "featured" })),
    ...(docs ?? [])
      .filter((d) => d.versions[d.versions.length - 1]?.sum.recipe?.length)
      .map((d): Source => ({ key: "s:" + d.id, label: d.name + " (saved)", short: d.name, kind: "saved" })),
  ];
  const source = sources.find((x) => x.key === S.sourceKey) ?? null;

  const loadToken = useRef(0);
  // Slider moves on one ingredient within a moment of each other are one undo step.
  const lastCo = useRef<{ k: string; t: number } | null>(null);
  const load = async (key: string) => {
    const token = ++loadToken.current;
    set({ ...INITIAL, libOpen: S.libOpen, sourceKey: key, loading: true });
    const fail = (loadError: string) => {
      if (token === loadToken.current) set({ loading: false, loadError });
    };
    let programmeId: string, phaseId: string, pool: Pool, recipe: { id: string; pct: number }[];
    if (key.startsWith("f:")) {
      const f = featured.find((x) => "f:" + x.id === key);
      if (!f) return fail("That recipe is no longer published.");
      const r = featuredResults?.[f.id] ?? (await formulate(f.snap, engine));
      if (r.status === "manufacturer_recipe") return fail("This is a manufacturer’s fixed recipe, so its amounts can’t be changed here.");
      if (r.status !== "optimal") return fail("This recipe doesn’t formulate against today’s data, so it can’t be opened here.");
      ({ programmeId, phaseId, pool } = f.snap);
      recipe = r.recipe.map((x) => ({ id: x.id, pct: x.pct }));
    } else {
      const d = docs?.find((x) => "s:" + x.id === key);
      const v = d?.versions[d.versions.length - 1];
      if (!d || !v?.sum.recipe?.length) return fail("That saved formulation has no recipe to start from.");
      ({ programmeId, phaseId, pool } = v.snap);
      recipe = v.sum.recipe;
    }
    const { programme, phase } = phaseOf(engine.programmes, programmeId, phaseId);
    if (Object.keys(pool).some((id) => !!commercialPremixById(id)?.manufacturerRecipe && pool[id].role !== "excluded"))
      return fail("This recipe follows a manufacturer’s fixed recipe, so its amounts can’t be changed here.");
    const items: PgItem[] = recipe
      .filter((x) => x.pct > 0)
      .map((x) => {
        const mfr = !!commercialPremixById(x.id);
        const role: PgRole = mfr ? "mfr" : pool[x.id]?.role === "fixed" ? "locked" : "free";
        return { id: x.id, pct: x.pct, role, fixedPct: role === "free" ? null : x.pct, price: priceOf(x.id, pool, catalogue) };
      });
    const balancer = defaultBalancer(items, catalogue);
    const mix: PgMix = { items, autoBal: true, balancer };
    let baseCheck: ManualCheck | null = null;
    let error: string | null = null;
    try {
      baseCheck = await evaluateManual(snapOf(programme.id, phase.id, items, catalogue), pctOf(items), engine);
    } catch (e) {
      error = e instanceof Error ? e.message : "Couldn’t check this recipe.";
    }
    if (token !== loadToken.current) return;
    set({ loading: false, programmeId: programme.id, phaseId: phase.id, ...cloneMix(mix), base: cloneMix(mix), baseCheck, result: { sig: checkSig(key, items), check: baseCheck, error } });
  };

  // Start from the first recipe once there is one.
  const firstKey = sources[0]?.key ?? null;
  useEffect(() => {
    if (!S.sourceKey && firstKey) void load(firstKey);
    // Only the first available recipe should start a load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstKey]);

  // ---- live check: the engine checks a complete mix a moment after edits stop ----
  const ready = !!S.sourceKey && !S.loading && !S.loadError;
  const curSig = checkSig(S.sourceKey ?? "", S.items);
  const latestSig = useRef(curSig);
  latestSig.current = curSig;
  const complete = isComplete(S.items);
  const over = fixedSumOf(S.items) > 100 + EPS;
  useEffect(() => {
    if (!ready || S.result?.sig === curSig || !complete || over) return;
    const sig = curSig;
    const items = S.items;
    const t = setTimeout(() => {
      evaluateManual(snapOf(S.programmeId, S.phaseId, items, catalogue), pctOf(items), engine)
        .then((check) => latestSig.current === sig && set({ result: { sig, check, error: null } }))
        .catch((e) => latestSig.current === sig && set({ result: { sig, check: null, error: e instanceof Error ? e.message : "Couldn’t check this recipe." } }));
    }, 300);
    return () => clearTimeout(t);
    // The amounts (curSig) decide what to check; older answers are ignored by signature.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curSig, ready]);

  if (!ready) return <Frame frame={frame}>{loadingView(S, sources, docs, load)}</Frame>;

  const { programme, phase } = phaseOf(engine.programmes, S.programmeId, S.phaseId);
  const species = programme.species;
  const nm = (id: string) => catalogue.get(id)?.name ?? id;
  const hi = (id: string) => maxFor(engine, phase, id);
  const hasData = (id: string) => !(catalogue.get(id)?.requirementMissing[species] ?? []).some((c) => phase.constraintIds.includes(c));
  const knownToSpecies = (id: string) => !!catalogue.get(id)?.requirementValues[species] || !!catalogue.get(id)?.requirementMissing[species];

  // ---- edits ----
  const reject = (id: string, text: string) => set({ msg: { id, text } });
  const commit = (fn: (m: PgMix) => void, co?: string, extra?: Partial<PgState>) => {
    const now = Date.now();
    const coal = !!co && lastCo.current?.k === co && now - lastCo.current.t < 900;
    lastCo.current = co ? { k: co, t: now } : null;
    setS((s) => {
      const m = cloneMix(s);
      fn(m);
      for (const i of m.items) if (Math.abs(i.pct) < 1e-10) i.pct = 0;
      return { ...s, ...m, hist: coal ? s.hist : [...s.hist, cloneMix(s)].slice(-80), fut: [], proposal: null, msg: null, ...(extra ?? {}) };
    });
  };
  const bal = (id: string, d: number) => balance(S, id, d, hi, nm);

  const setPct = (id: string, raw: string, co?: string) => {
    const it = S.items.find((i) => i.id === id);
    if (!it || it.role !== "free") return;
    const n = nm(id);
    if (S.autoBal && S.balancer === id) return reject(id, n + " adjusts itself to keep the mix at 100%.");
    const val = parseNum(raw);
    if (Number.isNaN(val) || val < 0) return reject(id, "Type an amount in %, like 12.5.");
    if (val > hi(id) + 1e-9) return reject(id, n + " can be at most " + limitPct(hi(id)) + "% at this stage.");
    const d = val - it.pct;
    if (Math.abs(d) < 1e-12) return;
    const b = bal(id, d);
    if (!b.ok) return reject(id, b.err);
    commit((m) => {
      m.items.find((i) => i.id === id)!.pct = val;
      if (b.nb != null) m.items.find((i) => i.id === m.balancer)!.pct = b.nb;
    }, co);
  };
  const toggleLock = (id: string) => {
    const it = S.items.find((i) => i.id === id)!;
    const n = nm(id);
    if (it.role === "mfr") return;
    if (it.role === "locked")
      return commit((m) => {
        const x = m.items.find((i) => i.id === id)!;
        x.role = "free";
        x.fixedPct = null;
      }, undefined, { msg: { id, ok: true, text: "Unlocked. You can slide it again." } });
    if (S.autoBal && S.balancer === id) return reject(id, n + " is keeping the mix at 100%, so it can’t be locked. Pick another ingredient for that first.");
    if (!(it.pct > 0)) return reject(id, "Give it an amount first. To keep it out, just take it out of the mix.");
    commit((m) => {
      const x = m.items.find((i) => i.id === id)!;
      x.role = "locked";
      x.fixedPct = x.pct;
    }, undefined, { msg: { id, ok: true, text: "Locked at " + fmtPct(it.pct) + "%. Nothing will move it unless you change it here." } });
  };
  const remove = (id: string) => {
    const it = S.items.find((i) => i.id === id)!;
    const n = nm(id);
    if (S.autoBal && S.balancer === id) return reject(id, n + " is keeping the mix at 100%. Pick another ingredient for that before taking it out.");
    const b = bal(id, -it.pct);
    if (!b.ok) return reject(id, b.err);
    commit((m) => {
      m.items = m.items.filter((i) => i.id !== id);
      if (b.nb != null) m.items.find((i) => i.id === m.balancer)!.pct = b.nb;
    }, undefined, { edit: S.edit?.id === id ? null : S.edit });
    flash(n + " taken out" + (b.nb != null && it.pct > 0 ? ". " + nm(S.balancer) + " filled the gap." : "."));
  };
  const add = (id: string) => {
    if (S.items.some((i) => i.id === id)) return;
    const product = commercialPremixById(id);
    if (!product) {
      commit((m) => void m.items.push({ id, pct: 0, role: "free", fixedPct: null, price: planningPrice(catalogue, id) }), undefined, { msg: { id, ok: true, text: "Added. Slide to choose how much." }, over: false, dragging: false });
      return;
    }
    // A premix comes in at its manufacturer's dose, in place of any other premix.
    const old = premixIn(S.items);
    const b = bal(id, product.inclusionPct - (old?.pct ?? 0));
    if (!b.ok) return void (set({ over: false, dragging: false }), flash(b.err));
    commit((m) => {
      m.items = m.items.filter((i) => i.id !== old?.id);
      m.items.push({ id, pct: product.inclusionPct, role: "mfr", fixedPct: product.inclusionPct, price: planningPrice(catalogue, id) });
      if (b.nb != null) m.items.find((i) => i.id === m.balancer)!.pct = b.nb;
    }, undefined, { msg: { id, ok: true, text: (old ? "Replaced " + nm(old.id) + ". " : "Added at ") + (old ? "Set at " : "") + "the manufacturer’s dose of " + product.inclusionKgPerTonne + " kg/t." }, over: false, dragging: false });
  };
  const setPrice = (id: string, raw: string) => {
    const val = raw === "" ? null : parseNum(raw);
    if (val != null && (Number.isNaN(val) || val < 0)) return reject(id, "Type a price per tonne, or leave it blank.");
    commit((m) => void (m.items.find((i) => i.id === id)!.price = val));
  };
  const confirmEdit = () => {
    if (!S.edit) return;
    const id = S.edit.id;
    const it = S.items.find((i) => i.id === id)!;
    const n = nm(id);
    const val = parseNum(S.edit.draft);
    if (Number.isNaN(val) || val <= 0) return reject(id, "Type the new locked amount, more than 0%.");
    if (val > hi(id) + 1e-9) return reject(id, n + " can be at most " + limitPct(hi(id)) + "% at this stage.");
    const sum = fixedSumOf(S.items.filter((i) => i.id !== id)) + val;
    if (sum > 100 + EPS) return reject(id, "Locked amounts would add up to " + fmtPct(sum) + "%, which is more than the whole mix.");
    const b = bal(id, val - it.pct);
    if (!b.ok) return reject(id, b.err);
    commit((m) => {
      const x = m.items.find((i) => i.id === id)!;
      x.fixedPct = val;
      x.pct = val;
      if (b.nb != null) m.items.find((i) => i.id === m.balancer)!.pct = b.nb;
    }, undefined, { edit: null, msg: { id, ok: true, text: "Now locked at " + fmtPct(val) + "%." } });
  };
  const undoRedo = (dir: -1 | 1) => {
    lastCo.current = null;
    setS((s) => {
      const from = dir < 0 ? s.hist : s.fut;
      if (!from.length) return s;
      const n = cloneMix(from[from.length - 1]);
      return dir < 0
        ? { ...s, ...n, hist: s.hist.slice(0, -1), fut: [...s.fut, cloneMix(s)], proposal: null, msg: null, edit: null }
        : { ...s, ...n, fut: s.fut.slice(0, -1), hist: [...s.hist, cloneMix(s)], proposal: null, msg: null, edit: null };
    });
  };

  // ---- rebalance: the optimiser, around locked amounts and the premix dose ----
  const rebalance = async () => {
    const sig = solveSig(S.sourceKey!, S.items);
    const errs: string[] = [];
    if (fixedSumOf(S.items) > 100 + EPS) errs.push("Locked amounts add up to more than 100%.");
    for (const i of S.items) {
      if (!hasData(i.id) && i.role === "locked") errs.push(nm(i.id) + " is locked but is missing nutrient data. Unlock it or take it out.");
      else if (i.price == null && (i.role !== "mfr" || planningPrice(catalogue, i.id) != null)) errs.push("Add a price for " + nm(i.id) + " so it can be costed.");
    }
    if (errs.length) return set({ proposal: { sig, status: "problem", title: "Almost there", lines: errs } });
    set({ proposal: { sig, status: "solving" } });
    const items = S.items;
    const r = await formulate(snapOf(S.programmeId, S.phaseId, items, catalogue), engine);
    const land = (p: Proposal) => setS((s) => (s.proposal?.sig === sig && solveSig(s.sourceKey!, s.items) === sig ? { ...s, proposal: p } : s));
    if (r.status === "blocked") return land({ sig, status: "problem", title: "Almost there", lines: r.errs.map((e) => e.title + ". " + e.body) });
    if (r.status === "error") return land({ sig, status: "problem", title: "Couldn’t work it out", lines: [r.message] });
    if (r.status === "manufacturer_recipe") return land({ sig, status: "problem", title: "This premix fixes the whole recipe", lines: [r.message] });
    const locks = items.filter((i) => i.role === "locked").map((i) => lowerName(nm(i.id)));
    if (r.status === "infeasible") {
      const short = [...new Set(r.shortfalls.map((x) => lowerName(friendly(x.id, x.name))))];
      const hint = locks.length ? "Try unlocking " + locks.join(" or ") + ", or add another ingredient." : "Try adding another ingredient.";
      const lost = r.setAside.filter((id) => items.some((i) => i.id === id && i.role !== "free"));
      if (!r.closest.length || lost.length)
        return land({ sig, status: "problem", title: "These ingredients can’t meet every need", lines: [(short.length ? "They can’t reach the target for " + short.join(" or ") + ". " : "") + hint] });
      // The closest achievable mix: offered to look at and try, never as a recipe that meets the needs.
      const pct: Record<string, number> = {};
      for (const x of r.closest) pct[x.id] = x.pct;
      for (const i of items) if (i.role !== "free") pct[i.id] = i.fixedPct ?? i.pct;
      const rows = new Map((r.closestNutrients ?? []).map((n) => [n.id, n]));
      const unmet: Unmet[] = r.shortfalls.map((x) => {
        const row = rows.get(x.id);
        const v = (n: number) => (row ? fmtNutrient(row, n) : fmt(n, x.dp) + (x.unit === "%" ? "%" : " " + x.unit));
        return { id: x.id, name: friendly(x.id, x.name), kind: x.kind, best: v(x.best), req: v(x.req), deviationPct: x.deviationPct ?? null };
      }).sort((a, b) => (b.deviationPct ?? 0) - (a.deviationPct ?? 0));
      const { met, total } = requirementCounts(r.assessment);
      return land({ sig, status: "closest", pct, costT: r.costT, costExcludesPremix: r.costExcludesPremix, met, total, unmet, worstPct: r.closestAchievable?.worstDeviationPct ?? null, hint });
    }
    const lostLocked = r.setAside.filter((id) => items.some((i) => i.id === id && i.role !== "free"));
    if (lostLocked.length) return land({ sig, status: "problem", title: "Almost there", lines: lostLocked.map((id) => nm(id) + " is locked but is missing nutrient data. Unlock it or take it out.") });
    const pct: Record<string, number> = {};
    for (const x of r.recipe) pct[x.id] = x.pct;
    // Locked amounts and premix doses go back exactly as they were, never as the solver rounded them.
    for (const i of items) if (i.role !== "free") pct[i.id] = i.fixedPct ?? i.pct;
    const { met, total } = requirementCounts(r.assessment);
    land({ sig, status: "ok", pct, costT: r.costT, costExcludesPremix: r.costExcludesPremix, met, total, meets: r.assessment.verdict === "meets_requirements", setAside: r.setAside });
  };

  // ---- derived ----
  const total = totalOf(S.items);
  const fresh = S.result && S.result.sig === curSig ? S.result : null;
  const last = fresh ?? S.result;
  const stale = complete && !over && !fresh;
  const verdict = over ? "over" : !complete ? "incomplete" : stale ? "checking" : verdictOf(S.items, fresh);
  const check = last?.check ?? null;
  const { costT, unpriced } = costOf(S.items);
  const baseCost = S.base ? costOf(S.base.items).costT : 0;
  const baseRows = S.baseCheck?.nutrients ?? [];
  const nReq = (fresh?.check?.assessment?.requirements.length ?? check?.assessment?.requirements.length) || baseRows.length;
  const failed = fresh?.check?.assessment ? requirementCounts(fresh.check.assessment).failed : [];
  const failedNames = [...new Set([...failed.map((f) => lowerName(friendly(f.id, f.label))), ...(fresh?.check?.nutrients ?? []).filter((n) => n.status !== "met").map((n) => lowerName(friendly(n.id, n.name)))])];

  const st = ((): { bg: string; fg: string; title: string; sub: string } => {
    switch (verdict) {
      case "checking":
        return { bg: "#f3f0e8", fg: "#45473f", title: "Checking your mix…", sub: "Results update a moment after you stop moving things." };
      case "meets":
        return { bg: "#2f5a3f", fg: "#faf8f3", title: "Meets all " + nReq + " needs", sub: "For " + programme.name + " · " + phase.label + ", at the amounts shown." };
      case "fails":
        return { bg: "#f8ebe5", fg: "#5e2417", title: (failed.length || failedNames.length) + " of " + nReq + " needs not met", sub: "Check " + failedNames.join(", ") + " below. “Balance the rest for me” can try to fix it." };
      case "incomplete":
        return { bg: "#f7ecd6", fg: "#5c3d0a", title: "Your mix adds up to " + fmtPct(total) + "%", sub: (total < 100 ? "Add " + fmtPct(100 - total) + "% more" : "Take " + fmtPct(total - 100) + "% out") + " to see whether it meets every need. Bars below show what’s there so far." };
      case "unknown":
        return { bg: "#ece8df", fg: "#222420", title: "Can’t fully check this mix", sub: "An ingredient is missing nutrient data. See “Worth knowing”." };
      case "invalid": {
        const issue = fresh?.check?.recipeValidity.issues[0];
        return { bg: "#f8ebe5", fg: "#5e2417", title: issue ? issue.title : "Something needs fixing first", sub: issue ? issue.body : "" };
      }
      case "over":
        return { bg: "#f8ebe5", fg: "#5e2417", title: "Locked amounts are over 100%", sub: "Unlock or lower one of them." };
      default:
        return { bg: "#f8ebe5", fg: "#5e2417", title: "Couldn’t check this mix", sub: fresh?.error ?? "Try again in a moment." };
    }
  })();

  // Nutrient bars: the engine's rows for a checked mix; what the known ingredients add so far otherwise.
  const rowsShown: (NutrientResult & { bar: BarStatus })[] = (() => {
    const unknownIds = new Set((check?.incompleteRequirements ?? []).map((r) => r.id));
    if (complete && !over && check && check.nutrients.length)
      return check.nutrients.map((n) => ({ ...n, bar: unknownIds.has(n.id) ? "unknown" : n.status }));
    const so = partialValues(S.items, catalogue, species, baseRows.map((n) => n.id));
    return baseRows.map((n) => ({ ...n, value: so[n.id], bar: "partial" as const }));
  })();
  const fnv = fmtNutrient;

  const notes: { text: string; kind: string; dot: string }[] = [];
  if (complete && !over && check) {
    for (const issue of check.recipeValidity.valid ? [] : check.recipeValidity.issues) notes.push({ kind: "Needs fixing", dot: "#a8432f", text: issue.title + ". " + issue.body });
    for (const n of check.nutrients) {
      const syn = SYNTHETIC[n.id];
      if (n.status !== "below" || !syn || !catalogue.has(syn)) continue;
      notes.push({ kind: "Suggestion", dot: "#2f5a3f", text: friendly(n.id, n.name) + " is short. " + (S.items.some((i) => i.id === syn) ? "A little more " + nm(syn) + " usually fixes it." : "Adding a little " + nm(syn) + " usually fixes it.") });
    }
    const a = check.assessment;
    if (a) {
      const low = (a.supplementation?.rows ?? []).filter((r) => r.status === "below_recommendation").map((r) => r.label);
      if (low.length) notes.push({ kind: "Supplementation · Brazilian Tables Ch. 7", dot: "#2f5a3f", text: "Below the suggested supplementation: " + (low.length > 5 ? low.slice(0, 5).join(", ") + " and " + (low.length - 5) + " more" : low.join(", ")) + "." });
      for (const row of upperLimitRows(a).filter((r) => r.status === "exceeds"))
        notes.push({ kind: "CFIA reference maximum · advisory only", dot: "#a8432f", text: row.label + " is above the reference level of " + formatUpperLimitValue(row.max, row.unit) + "." });
    }
    const missing = new Map<string, string[]>();
    for (const r of check.incompleteRequirements) for (const id of r.missingIngredientIds) missing.set(id, [...(missing.get(id) ?? []), lowerName(friendly(r.id, r.label))]);
    for (const [id, what] of missing) notes.push({ kind: "Missing data", dot: "#8d8a80", text: nm(id) + " has no " + what.join(", ") + " value, so " + (what.length === 1 ? "it" : "they") + " can’t be checked." });
    const gaps = a ? documentationGapLine(a) : null;
    if (gaps) notes.push({ kind: "Missing data", dot: "#8d8a80", text: gaps });
  }
  for (const g of guidelineNotes(S.items, engine, phase)) notes.push({ kind: "Practical guideline", dot: "#e3aa45", text: nm(g.id) + " is at " + fmtPct(g.pct) + "%. Farmers usually keep it under " + limitPct(g.guide) + "% at this stage." });

  // ---- columns ----
  const three = width >= 1080;
  const two = width >= 720;
  const lw = S.libOpen ? (three ? "250px" : "240px") : "48px";
  const cols = three ? lw + " minmax(0,1fr) 340px" : two ? lw + " minmax(0,1fr)" : "minmax(0,1fr)";
  const areas = three ? '"lib mix res"' : two ? '"lib mix" "res res"' : '"mix" "res" "lib"';
  const stick = three ? "sticky" : "static";
  const colMaxH = three ? "calc(100vh - 96px)" : two ? "760px" : "none";
  const vert = two;
  const toggleLib = () => {
    const v = !S.libOpen;
    try {
      localStorage.setItem(LIB_KEY, v ? "1" : "0");
    } catch {
      // Not remembered; still toggles.
    }
    set({ libOpen: v });
  };

  // ---- library ----
  const inMix = (id: string) => S.items.some((i) => i.id === id);
  const needle = S.q.trim().toLowerCase();
  const catSet = (CATS.find((c) => c[0] === S.cat) ?? CATS[0])[1];
  const libIds = [...catalogue.values()]
    .filter((g) => {
      if (inMix(g.id) || !knownToSpecies(g.id)) return false;
      const product = commercialPremixById(g.id);
      if (product && (product.manufacturerRecipe || !commercialPremixCompatibleWithProgramme(product, programme.id, phase.id) || !canAddStudioIngredient(g.id, programme.id, undefined, phase.id))) return false;
      if (catSet && !catSet.includes(g.category)) return false;
      return !needle || [g.name, g.category, ...g.aliases].join(" ").toLowerCase().includes(needle);
    })
    .sort((a, b) => Number(!hasData(a.id) || !a.price) - Number(!hasData(b.id) || !b.price) || a.name.localeCompare(b.name))
    .map((g) => g.id);
  const lib = libIds.map((id) => {
    const g = catalogue.get(id)!;
    const el = hasData(id);
    const price = g.price?.usdPerTonne ?? null;
    const cp = g.nutrients.cp;
    const sub = !el ? "Missing some nutrient data" : price == null ? "No price yet" : (cp != null && cp >= 1 ? cp.toFixed(cp >= 10 ? 0 : 1) + "% protein · " : g.category === "Mineral" || g.category === "Premix" ? g.category.toLowerCase() + " · " : "") + "$" + fmt(price, 0) + "/t";
    return { id, name: g.name, dot: dotOf(g.category), sub, warn: !el || price == null };
  });

  // ---- mix ----
  const onOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (!S.over) set({ over: true });
  };
  const onLeave = (e: DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) set({ over: false });
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    set({ over: false, dragging: false });
    if (id && catalogue.has(id)) add(id);
  };
  const scale = Math.max(100, total);
  const totalOk = complete;
  const offBy = total - 100;
  const balOpts = S.items.filter((i) => i.role === "free").map((i) => ({ id: i.id, label: nm(i.id) }));

  const curSolve = solveSig(S.sourceKey!, S.items);
  const p = S.proposal && S.proposal.sig === curSolve ? S.proposal : null;
  const lockedNames = S.items.filter((i) => i.role === "locked").map((i) => lowerName(nm(i.id)));
  const keeps = [...lockedNames, ...(premixIn(S.items) ? ["the premix"] : [])];
  const rebText = keeps.length
    ? "Keeps " + keeps.join(", ").replace(/, ([^,]*)$/, " and $1") + " where " + (keeps.length === 1 && !premixIn(S.items) ? "it is" : "they are") + ", and works out the cheapest amounts for everything else in your mix."
    : "Works out the cheapest amounts for everything in your mix.";

  // ---- modal ----
  const M = S.modal;
  const good = verdict === "meets" && !unpriced.length;
  const mDis = stale || over;

  const btn = (enabled: boolean): CSSProperties => sx(`border:1px solid #d6d2c6;background:#fff;border-radius:7px;padding:9px 11px;font:500 14px/1 'IBM Plex Sans',sans-serif;color:${enabled ? "#222420" : "#b9b6ab"}`);

  return (
    <Frame frame={frame}>
      <div style={sx("display:flex;justify-content:space-between;align-items:flex-end;gap:14px;flex-wrap:wrap")}>
        <div style={sx("display:flex;flex-direction:column;gap:6px;min-width:0")}>
          <h1 style={sx("margin:0;font:600 26px/1.2 'IBM Plex Sans',sans-serif;letter-spacing:-0.015em")}>Playground</h1>
          <p style={sx("margin:0;font:400 14px/1.5 'IBM Plex Sans',sans-serif;color:#64665c;max-width:640px;text-wrap:pretty")}>Drag ingredients into the mix and slide to change amounts. Results update as you go. Nothing is saved until you send it to Studio.</p>
        </div>
        <div style={sx("display:flex;gap:8px;align-items:center;flex-wrap:wrap")}>
          <label style={sx("display:flex;align-items:center;gap:8px;font:400 13px/1 'IBM Plex Sans',sans-serif;color:#64665c")}>
            Recipe for
            <select
              value={S.sourceKey ?? ""}
              onChange={(e) => {
                const to = e.target.value;
                if (to === S.sourceKey) return;
                if (S.hist.length) set({ modal: { type: "source", to } });
                else void load(to);
              }}
              style={sx("border:1px solid #d6d2c6;background:#fff;border-radius:7px;padding:9px 10px;font:500 14px/1 'IBM Plex Sans',sans-serif;color:#222420;max-width:260px")}
            >
              {sources.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </label>
          <button onClick={() => undoRedo(-1)} disabled={!S.hist.length} aria-label="Undo" title="Undo" style={btn(!!S.hist.length)}>↶</button>
          <button onClick={() => undoRedo(1)} disabled={!S.fut.length} aria-label="Redo" title="Redo" style={btn(!!S.fut.length)}>↷</button>
          <button
            onClick={() => S.base && commit((m) => Object.assign(m, cloneMix(S.base!)), undefined, { edit: null })}
            disabled={!S.hist.length}
            style={sx(`border:1px solid #d6d2c6;background:#fff;border-radius:7px;padding:9px 12px;font:500 13px/1 'IBM Plex Sans',sans-serif;color:${S.hist.length ? "#222420" : "#b9b6ab"};white-space:nowrap`)}
          >
            Start over
          </button>
          <button onClick={() => set({ modal: { type: "studio", name: (source?.short ?? "Playground mix") + " · playground" } })} className={hv("deep")} style={sx("border:0;background:#2f5a3f;color:#faf8f3;font:600 14px/1 'IBM Plex Sans',sans-serif;padding:10px 15px;border-radius:7px;white-space:nowrap")}>
            Use in Studio
          </button>
        </div>
      </div>

      <div style={sx(`display:grid;grid-template-columns:${cols};grid-template-areas:${areas};gap:18px;align-items:start`)}>
        {/* LIBRARY */}
        {!S.libOpen && (
          <button onClick={toggleLib} aria-label="Show ingredients" title="Show ingredients" className={hv("edge")} style={sx(`grid-area:lib;position:${stick};top:80px;border:1px solid #e2dfd6;background:#fff;border-radius:12px;padding:${vert ? "14px 0" : "12px 14px"};display:flex;flex-direction:${vert ? "column" : "row"};align-items:center;justify-content:${vert ? "flex-start" : "center"};gap:10px;color:#222420;min-height:${vert ? "220px" : "0"}`)}>
            <PanelIcon open />
            <span style={sx(`font:600 13px/1 'IBM Plex Sans',sans-serif;writing-mode:${vert ? "vertical-rl" : "horizontal-tb"};transform:${vert ? "rotate(180deg)" : "none"};white-space:nowrap`)}>Ingredients</span>
            <span style={sx("font:500 11px/1 'IBM Plex Mono',monospace;color:#64665c;background:#f3f0e8;padding:3px 5px;border-radius:4px")}>{libIds.length}</span>
          </button>
        )}
        {S.libOpen && (
          <div style={sx(`grid-area:lib;background:#fff;border:1px solid #e2dfd6;border-radius:12px;display:flex;flex-direction:column;position:${stick};top:80px;max-height:${colMaxH};overflow:hidden;min-width:0`)}>
            <div style={sx("padding:14px 14px 10px;display:flex;flex-direction:column;gap:10px;border-bottom:1px solid #ece8df")}>
              <div style={sx("display:flex;justify-content:space-between;align-items:center;gap:8px")}>
                <span style={sx("font:600 15px/1.2 'IBM Plex Sans',sans-serif")}>Ingredients</span>
                <button onClick={toggleLib} aria-label="Hide ingredients" title="Hide ingredients" className={hv("soft")} style={sx("border:0;background:transparent;color:#64665c;width:30px;height:30px;border-radius:6px;display:flex;align-items:center;justify-content:center")}>
                  <PanelIcon />
                </button>
              </div>
              <input value={S.q} onChange={(e) => set({ q: e.target.value })} placeholder="Search" aria-label="Search ingredients" style={sx("width:100%;border:1px solid #d6d2c6;background:#faf8f3;border-radius:7px;padding:9px 11px;font:400 14px/1 'IBM Plex Sans',sans-serif;color:#222420")} />
              <div style={sx("display:flex;gap:5px;flex-wrap:wrap")}>
                {CATS.map(([label]) => {
                  const on = S.cat === label;
                  return (
                    <button key={label} onClick={() => set({ cat: label })} aria-pressed={on} style={sx(`border:1px solid ${on ? "#222420" : "#d6d2c6"};background:${on ? "#222420" : "#fff"};color:${on ? "#faf8f3" : "#45473f"};font:500 12px/1 'IBM Plex Sans',sans-serif;padding:6px 9px;border-radius:999px;white-space:nowrap`)}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={sx("padding:8px;display:flex;flex-direction:column;gap:6px;overflow-y:auto;overflow-x:hidden;min-height:0")}>
              {lib.map((l) => (
                <div
                  key={l.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", l.id);
                    e.dataTransfer.effectAllowed = "copy";
                    set({ dragging: true });
                  }}
                  onDragEnd={() => set({ dragging: false, over: false })}
                  className={hv("libItem")}
                  style={sx("flex:none;min-width:0;display:flex;align-items:center;gap:10px;padding:10px 10px 10px 8px;border:1px solid #ece8df;border-radius:9px;background:#fff;cursor:grab;user-select:none")}
                >
                  <span aria-hidden style={sx("font:400 14px/1 'IBM Plex Mono',monospace;color:#c9c5b8;letter-spacing:-2px")}>⋮⋮</span>
                  <span style={sx(`width:10px;height:10px;border-radius:3px;background:${l.dot};flex:none`)} />
                  <span style={sx("display:flex;flex-direction:column;gap:3px;min-width:0;flex:1")}>
                    <span style={sx("font:500 14px/1.2 'IBM Plex Sans',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")} title={l.name}>{l.name}</span>
                    <span style={sx(`font:400 12px/1.2 'IBM Plex Sans',sans-serif;color:${l.warn ? "#8a5a14" : "#64665c"};white-space:nowrap;overflow:hidden;text-overflow:ellipsis`)}>{l.sub}</span>
                  </span>
                  <button onClick={() => add(l.id)} aria-label={"Add " + l.name + " to the mix"} title="Add to mix" className={hv("addBtn")} style={sx("width:30px;height:30px;flex:none;border:1px solid #d6d2c6;background:#fff;border-radius:7px;font:500 17px/1 'IBM Plex Sans',sans-serif;color:#2f5a3f;display:flex;align-items:center;justify-content:center")}>
                    +
                  </button>
                </div>
              ))}
              {!libIds.length && <div style={sx("padding:16px 8px;font:400 13px/1.4 'IBM Plex Sans',sans-serif;color:#8d8a80;text-align:center")}>{needle ? "Nothing matches “" + S.q + "”." : "Everything in this group is already in your mix."}</div>}
            </div>
          </div>
        )}

        {/* MIX */}
        <div
          onDragOver={onOver}
          onDragLeave={onLeave}
          onDrop={onDrop}
          style={sx(`grid-area:mix;background:${S.over ? "#f1f5ef" : "#fff"};border:2px ${S.dragging || S.over ? "dashed" : "solid"} ${S.over ? "#2f5a3f" : S.dragging ? "#9fb7a4" : "#e2dfd6"};border-radius:12px;display:flex;flex-direction:column;min-width:0;transition:background .15s,border-color .15s`)}
        >
          <div style={sx("padding:16px 18px 14px;display:flex;flex-direction:column;gap:12px;border-bottom:1px solid #ece8df")}>
            <div style={sx("display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap")}>
              <span style={sx("font:600 15px/1.2 'IBM Plex Sans',sans-serif")}>Your mix</span>
              <span style={sx("display:flex;align-items:baseline;gap:8px")}>
                <span style={sx(`font:600 22px/1 'IBM Plex Sans',sans-serif;color:${totalOk ? "#2f5a3f" : "#8a5a14"}`)}>{fmtPct(total)}%</span>
                <span style={sx(`font:500 12px/1 'IBM Plex Sans',sans-serif;color:${totalOk ? "#2f5a3f" : "#8a5a14"}`)}>{totalOk ? "adds up" : offBy < 0 ? fmtPct(-offBy) + "% to go" : fmtPct(offBy) + "% too much"}</span>
              </span>
            </div>
            <div aria-hidden style={sx("position:relative;height:12px;border-radius:6px;background:#f3f0e8;display:flex;overflow:hidden")}>
              {S.items.filter((i) => i.pct > 0).map((i) => (
                <span key={i.id} title={nm(i.id) + " " + fmtPct(i.pct) + "%"} style={sx(`width:${((i.pct / scale) * 100).toFixed(3)}%;background:${dotOf(catalogue.get(i.id)?.category ?? "")};border-right:2px solid #fff;display:block;flex:none;transition:width .2s ease`)} />
              ))}
            </div>
            <div style={sx("display:flex;align-items:center;gap:8px 10px;flex-wrap:wrap;font:400 13px/1.3 'IBM Plex Sans',sans-serif;color:#45473f")}>
              <button
                role="switch"
                aria-checked={S.autoBal}
                onClick={() => commit((m) => {
                  m.autoBal = !m.autoBal;
                  if (m.autoBal && !m.balancer) m.balancer = defaultBalancer(m.items, catalogue);
                })}
                style={sx("border:0;background:transparent;padding:0;display:flex;align-items:center;gap:8px;font:400 13px/1 'IBM Plex Sans',sans-serif;color:#45473f")}
              >
                <span style={sx(`width:32px;height:18px;border-radius:999px;background:${S.autoBal ? "#2f5a3f" : "#c9c5b8"};position:relative;display:block;transition:background .15s`)}>
                  <span style={sx(`position:absolute;top:2px;left:${S.autoBal ? "16px" : "2px"};width:14px;height:14px;border-radius:50%;background:#fff;display:block;transition:left .15s;box-shadow:0 1px 2px rgba(0,0,0,.2)`)} />
                </span>
                Keep it at 100% using
              </button>
              <select
                value={S.balancer}
                onChange={(e) => {
                  const id = e.target.value;
                  commit((m) => void (m.balancer = id));
                }}
                disabled={!S.autoBal}
                aria-label="Ingredient that keeps the mix at 100%"
                style={sx(`border:1px solid #d6d2c6;background:#fff;border-radius:6px;padding:5px 7px;font:500 13px/1 'IBM Plex Sans',sans-serif;color:#222420;opacity:${S.autoBal ? "1" : ".5"};max-width:200px`)}
              >
                <option value="">choose…</option>
                {balOpts.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={sx("padding:8px;display:flex;flex-direction:column;gap:5px")}>
            {S.items.map((it) => (
              <MixCard
                key={it.id}
                it={it}
                name={nm(it.id)}
                dot={dotOf(catalogue.get(it.id)?.category ?? "")}
                hi={hi(it.id)}
                isBal={S.autoBal && S.balancer === it.id}
                hasData={hasData(it.id)}
                msg={S.msg && S.msg.id === it.id ? S.msg : null}
                editing={S.edit?.id === it.id ? S.edit.draft : null}
                onSlide={(v) => setPct(it.id, v, "sl:" + it.id)}
                onPct={(v) => setPct(it.id, v)}
                onPrice={(v) => setPrice(it.id, v)}
                onLock={() => toggleLock(it.id)}
                onRemove={() => remove(it.id)}
                onStartEdit={() => set({ edit: { id: it.id, draft: exactPct(it.fixedPct) }, msg: null })}
                onEditDraft={(d) => set((s) => ({ edit: s.edit ? { ...s.edit, draft: d } : s.edit }))}
                onConfirmEdit={confirmEdit}
                onCancelEdit={() => set({ edit: null })}
              />
            ))}
            <div style={sx(`border:2px dashed ${S.over ? "#2f5a3f" : S.dragging ? "#9fb7a4" : "#e2dfd6"};border-radius:10px;padding:14px;text-align:center;font:400 13px/1.45 'IBM Plex Sans',sans-serif;color:${S.over || S.dragging ? "#2f5a3f" : "#8d8a80"};background:${S.over ? "#e6efe6" : "transparent"};transition:all .15s`)}>
              {S.over ? "Drop to add" : !S.libOpen ? "Open the ingredients panel to add more" : S.items.length ? "Drag more ingredients here, or press + in the list" : "Drag ingredients here to start a mix"}
            </div>
          </div>
        </div>

        {/* RESULTS */}
        <div style={sx(`grid-area:res;display:flex;flex-direction:column;gap:12px;position:${stick};top:80px;max-height:${three ? "calc(100vh - 96px)" : "none"};overflow-y:${three ? "auto" : "visible"};min-width:0`)}>
          <div aria-live="polite" style={sx(`flex:none;border-radius:12px;padding:16px 18px;background:${st.bg};color:${st.fg};display:flex;flex-direction:column;gap:5px;transition:background .2s`)}>
            <span style={sx("font:600 17px/1.25 'IBM Plex Sans',sans-serif")}>{st.title}</span>
            {st.sub && <span style={sx("font:400 13px/1.45 'IBM Plex Sans',sans-serif;opacity:.9;text-wrap:pretty")}>{st.sub}</span>}
          </div>

          <div style={sx(`flex:none;background:#fff;border:1px solid #e2dfd6;border-radius:12px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;opacity:${stale ? ".45" : "1"};transition:opacity .15s`)}>
            <span style={sx("display:flex;flex-direction:column;gap:5px")}>
              <span style={sx("font:400 12px/1 'IBM Plex Sans',sans-serif;color:#64665c")}>Cost per tonne</span>
              <span style={sx("font:600 24px/1 'IBM Plex Sans',sans-serif;letter-spacing:-0.01em")}>{"$" + fmt(costT, 2)}</span>
            </span>
            <span style={sx("display:flex;flex-direction:column;gap:5px;align-items:flex-end")}>
              <span style={sx("font:500 13px/1 'IBM Plex Mono',monospace;color:#45473f")}>{Math.abs(costT - baseCost) < 0.005 ? "same as start" : (costT > baseCost ? "+" : "−") + "$" + fmt(Math.abs(costT - baseCost), 2) + " vs start"}</span>
              <span style={sx(`font:400 12px/1.3 'IBM Plex Sans',sans-serif;color:${unpriced.length ? "#8a5a14" : "#8d8a80"};text-align:right`)}>
                {unpriced.length ? "Not counting " + unpriced.map((id) => lowerName(nm(id))).join(", ") + " (no price)" : !complete ? "For the " + fmtPct(total) + "% so far" : "Ingredients only"}
              </span>
            </span>
          </div>

          {rowsShown.length > 0 && (
            <div style={sx("flex:none;background:#fff;border:1px solid #e2dfd6;border-radius:12px;overflow:hidden")}>
              <div style={sx("padding:14px 18px 6px;display:flex;justify-content:space-between;align-items:baseline;gap:10px")}>
                <span style={sx("font:600 15px/1.2 'IBM Plex Sans',sans-serif")}>Nutrients</span>
                <span style={sx("font:400 12px/1.3 'IBM Plex Sans',sans-serif;color:#64665c;text-align:right")}>{programme.name + " · " + phase.label}</span>
              </div>
              <div style={sx(`padding:4px 18px 8px;display:flex;flex-direction:column;opacity:${stale ? ".45" : "1"};transition:opacity .15s`)}>
                {rowsShown.map((n) => {
                  const base = baseRows.find((x) => x.id === n.id);
                  const sc = Math.max((n.min ?? 0) * 1.5, (n.max ?? 0) * 1.15) || 1;
                  const pos = (x: number) => Math.max(0, Math.min(100, (x / sc) * 100));
                  const zoneL = n.min != null ? pos(n.min) : 0;
                  const zoneR = n.max != null ? pos(n.max) : 100;
                  const status: BarStatus = verdict === "checking" && n.bar === "partial" ? "partial" : n.bar;
                  const label = verdict === "checking" && n.bar === "partial" ? "Checking" : STATUS_LABEL[status];
                  const need = n.min != null && n.max != null ? fnv(n, n.min).replace(/%$/, "").replace(/ kcal$/, "") + "–" + fnv(n, n.max) : n.min != null ? "at least " + fnv(n, n.min) : n.max != null ? "at most " + fnv(n, n.max) : "";
                  return (
                    <div key={n.id} style={sx("padding:9px 0;display:flex;flex-direction:column;gap:6px;border-bottom:1px solid #f3f0e8")}>
                      <div style={sx("display:flex;justify-content:space-between;align-items:baseline;gap:8px")}>
                        <span title={n.name + ", " + n.unit} style={sx("font:500 13px/1.2 'IBM Plex Sans',sans-serif;color:#222420")}>{friendly(n.id, n.name)}</span>
                        <span style={sx("display:flex;align-items:baseline;gap:8px;white-space:nowrap")}>
                          <span style={sx("font:500 13px/1 'IBM Plex Mono',monospace")}>{n.bar === "unknown" ? "?" : fnv(n, n.value)}</span>
                          <span style={sx(`font:600 11px/1 'IBM Plex Sans',sans-serif;color:${STATUS_FG[status] ?? "#8d8a80"};min-width:52px;text-align:right`)}>{label}</span>
                        </span>
                      </div>
                      <div style={sx("position:relative;height:10px;border-radius:5px;background:#f3f0e8")}>
                        <span style={sx(`position:absolute;top:0;bottom:0;left:${zoneL.toFixed(2)}%;width:${(zoneR - zoneL).toFixed(2)}%;background:#e1ecdf;display:block;border-radius:2px`)} />
                        <span style={sx(`position:absolute;left:0;top:2px;bottom:2px;width:${pos(n.value).toFixed(2)}%;background:${STATUS_COLOR[status]};border-radius:3px;display:block;transition:width .3s ease,background .2s`)} />
                        {n.min != null && <span style={sx(`position:absolute;top:-3px;bottom:-3px;left:${pos(n.min).toFixed(2)}%;width:2px;background:#2f5a3f;display:block`)} />}
                        {n.max != null && <span style={sx(`position:absolute;top:-3px;bottom:-3px;left:${pos(n.max).toFixed(2)}%;width:2px;background:#2f5a3f;display:block`)} />}
                        {base && <span title="Starting recipe" style={sx(`position:absolute;top:-4px;left:${pos(base.value).toFixed(2)}%;width:0;height:0;margin-left:-4px;border-left:4px solid transparent;border-right:4px solid transparent;border-top:5px solid #8d8a80;display:block`)} />}
                      </div>
                      {need && <span style={sx("font:400 11px/1 'IBM Plex Sans',sans-serif;color:#8d8a80")}>{"Needs " + need}</span>}
                    </div>
                  );
                })}
              </div>
              <div style={sx("padding:8px 18px 12px;display:flex;gap:12px;flex-wrap:wrap;font:400 11px/1 'IBM Plex Sans',sans-serif;color:#64665c")}>
                <span style={sx("display:flex;align-items:center;gap:5px")}><span style={sx("width:14px;height:8px;background:#e1ecdf;border-left:2px solid #2f5a3f;display:block")} />Target range</span>
                <span style={sx("display:flex;align-items:center;gap:5px")}><span style={sx("width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:5px solid #8d8a80;display:block")} />Starting recipe</span>
              </div>
            </div>
          )}

          <div style={sx("flex:none;background:#fff;border:1px solid #e2dfd6;border-radius:12px;padding:14px 18px;display:flex;flex-direction:column;gap:10px")}>
            <span style={sx("font:600 14px/1.2 'IBM Plex Sans',sans-serif")}>Balance the rest for me</span>
            <span style={sx("font:400 13px/1.45 'IBM Plex Sans',sans-serif;color:#64665c;text-wrap:pretty")}>{rebText}</span>
            {!p && (
              <button onClick={() => void rebalance()} className={hv("mint")} style={sx("border:1px solid #2f5a3f;background:#fff;color:#2f5a3f;font:600 13px/1 'IBM Plex Sans',sans-serif;padding:10px 12px;border-radius:7px")}>
                Find the cheapest mix
              </button>
            )}
            {p?.status === "solving" && <div role="status" style={sx("padding:10px 12px;border-radius:7px;background:#f3f0e8;font:400 13px/1.4 'IBM Plex Sans',sans-serif;color:#45473f")}>Working it out…</div>}
            {p?.status === "problem" && (
              <div role="alert" style={sx("padding:12px;border-radius:8px;background:#f8ebe5;display:flex;flex-direction:column;gap:6px;font:400 13px/1.45 'IBM Plex Sans',sans-serif;color:#5e2417")}>
                <span style={sx("font-weight:600")}>{p.title}</span>
                {p.lines.map((l, i) => (
                  <span key={i} style={sx("text-wrap:pretty")}>{l}</span>
                ))}
                <span style={sx("color:#45473f")}>Your mix hasn’t been changed.</span>
                <button onClick={() => set({ proposal: null })} style={sx("align-self:flex-start;border:0;background:transparent;padding:0;font:500 12px/1 'IBM Plex Sans',sans-serif;color:#45473f;text-decoration:underline")}>OK</button>
              </div>
            )}
            {p?.status === "closest" && <ClosestCard p={p} items={S.items} costNow={costT} nm={nm} onApply={() => commit((m) => m.items.forEach((i) => (i.pct = p.pct[i.id] ?? 0)))} onDiscard={() => set({ proposal: null })} />}
            {p?.status === "ok" && <ProposalCard p={p} items={S.items} costNow={costT} nm={nm} onApply={() => commit((m) => m.items.forEach((i) => (i.pct = p.pct[i.id] ?? 0)))} onDiscard={() => set({ proposal: null })} />}
          </div>

          {notes.length > 0 && (
            <div style={sx(`flex:none;background:#fff;border:1px solid #e2dfd6;border-radius:12px;padding:14px 18px;display:flex;flex-direction:column;gap:8px;opacity:${stale ? ".45" : "1"}`)}>
              <span style={sx("font:600 14px/1.2 'IBM Plex Sans',sans-serif")}>Worth knowing</span>
              {notes.map((n, i) => (
                <div key={i} style={sx("display:flex;gap:9px;align-items:flex-start;font:400 13px/1.45 'IBM Plex Sans',sans-serif;color:#222420")}>
                  <span style={sx(`width:7px;height:7px;border-radius:50%;background:${n.dot};flex:none;margin-top:6px`)} />
                  <span style={sx("display:flex;flex-direction:column;gap:2px")}>
                    <span style={sx("text-wrap:pretty")}>{n.text}</span>
                    <span style={sx("font:400 11px/1.2 'IBM Plex Sans',sans-serif;color:#8d8a80")}>{n.kind}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
          <span style={sx("flex:none;font:400 11px/1.4 'IBM Plex Sans',sans-serif;color:#8d8a80;padding:0 4px")}>Experimental. Not a manufacturing instruction.</span>
        </div>
      </div>

      {M && (
        <div style={sx("position:fixed;inset:0;background:rgba(34,36,32,.42);display:flex;align-items:center;justify-content:center;padding:16px;z-index:50")}>
          <div role="dialog" aria-modal="true" aria-label={M.type === "source" ? "Start a new mix?" : "Use this mix in Studio"} style={sx("background:#fff;border-radius:12px;width:460px;max-width:100%;box-shadow:0 20px 60px rgba(0,0,0,.25);animation:fsin .2s ease-out")}>
            <div style={sx("padding:20px 22px;display:flex;flex-direction:column;gap:12px")}>
              <span style={sx("font:600 18px/1.25 'IBM Plex Sans',sans-serif")}>{M.type === "source" ? "Start a new mix?" : "Use this mix in Studio"}</span>
              <span style={sx("font:400 14px/1.5 'IBM Plex Sans',sans-serif;color:#45473f;text-wrap:pretty")}>
                {M.type === "source"
                  ? "Switching to " + lowerName(sources.find((x) => x.key === M.to)?.label ?? "another recipe") + " starts again from that recipe. Your changes here will be lost. Nothing in Studio is affected."
                  : "Creates a new draft in Studio. " + (source?.kind === "saved" ? "Your saved “" + source.short + "” stays as it is." : "The featured recipe stays as it is.")}
              </span>
              {M.type === "studio" && (
                <>
                  <label style={sx("display:flex;flex-direction:column;gap:6px;font:400 12px/1 'IBM Plex Sans',sans-serif;color:#64665c")}>
                    Name in Studio
                    <input value={M.name} onChange={(e) => set({ modal: { type: "studio", name: e.target.value } })} style={sx("border:1px solid #d6d2c6;border-radius:7px;padding:9px 10px;font:400 14px/1 'IBM Plex Sans',sans-serif;color:#222420")} />
                  </label>
                  <div style={sx(`padding:10px 12px;border-radius:7px;background:${stale ? "#f3f0e8" : good ? "#e6efe6" : "#f7ecd6"};color:${stale ? "#45473f" : good ? "#2f5a3f" : "#5c3d0a"};font:400 13px/1.45 'IBM Plex Sans',sans-serif;text-wrap:pretty`)}>
                    {stale ? "Waiting for the latest check…" : good ? "Meets every need. Locked amounts, the premix dose and your prices go across exactly." : over ? "Locked amounts add up to more than 100%. Lower one before sending it." : "This mix isn’t finished yet, so it goes across as a draft that needs fixing."}
                  </div>
                </>
              )}
            </div>
            <div style={sx("padding:14px 22px;border-top:1px solid #ece8df;display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap")}>
              <button onClick={() => set({ modal: null })} style={sx("border:1px solid #d6d2c6;background:#fff;border-radius:7px;padding:10px 14px;font:500 14px/1 'IBM Plex Sans',sans-serif;color:#222420")}>Cancel</button>
              {M.type === "source" ? (
                <button onClick={() => void load(M.to)} style={sx("border:0;background:#2f5a3f;color:#faf8f3;border-radius:7px;padding:10px 14px;font:600 14px/1 'IBM Plex Sans',sans-serif")}>Start new mix</button>
              ) : (
                <button
                  disabled={mDis}
                  onClick={() => {
                    const name = M.name.trim() || "Playground mix";
                    set({ modal: null });
                    onOpenDraft({ name, programmeId: S.programmeId, phaseId: S.phaseId, pool: poolOf(S.items, catalogue), recipe: S.items.filter((i) => i.pct > 0).map((i) => ({ id: i.id, pct: i.pct })) });
                  }}
                  style={sx(`border:0;background:${mDis ? "#9aa79d" : "#2f5a3f"};color:#faf8f3;border-radius:7px;padding:10px 14px;font:600 14px/1 'IBM Plex Sans',sans-serif`)}
                >
                  {good ? "Create draft" : "Create draft to fix"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Frame>
  );
}

function Frame({ frame, children }: { frame: RefObject<HTMLDivElement>; children: ReactNode }) {
  return (
    <div className="fs-pg" style={sx("padding:24px clamp(14px,2.5vw,32px) 48px;display:flex;flex-direction:column;gap:18px")}>
      <style dangerouslySetInnerHTML={{ __html: PG_CSS }} />
      <div ref={frame} style={sx("display:flex;flex-direction:column;gap:18px;min-width:0")}>
        {children}
      </div>
    </div>
  );
}

function loadingView(S: PgState, sources: Source[], docs: SavedDoc[] | null, load: (key: string) => Promise<void>) {
  const msg = S.loadError ?? (S.loading || docs === null || sources.length ? "Opening the recipe…" : "There’s no recipe to start from yet. Formulate one in Studio first, then come back to play with it.");
  return (
    <>
      <div style={sx("display:flex;flex-direction:column;gap:6px")}>
        <h1 style={sx("margin:0;font:600 26px/1.2 'IBM Plex Sans',sans-serif;letter-spacing:-0.015em")}>Playground</h1>
        <p style={sx("margin:0;font:400 14px/1.5 'IBM Plex Sans',sans-serif;color:#64665c;max-width:640px")}>Drag ingredients into the mix and slide to change amounts. Results update as you go. Nothing is saved until you send it to Studio.</p>
      </div>
      <div role="status" style={sx("background:#fff;border:1px solid #e2dfd6;border-radius:12px;padding:20px 22px;display:flex;flex-direction:column;gap:12px;font:400 14px/1.5 'IBM Plex Sans',sans-serif;color:#45473f")}>
        <span>{msg}</span>
        {S.loadError && sources.length > 0 && (
          <label style={sx("display:flex;align-items:center;gap:8px;font:400 13px/1 'IBM Plex Sans',sans-serif;color:#64665c")}>
            Try another recipe
            <select value={S.sourceKey ?? ""} onChange={(e) => void load(e.target.value)} style={sx("border:1px solid #d6d2c6;background:#fff;border-radius:7px;padding:9px 10px;font:500 14px/1 'IBM Plex Sans',sans-serif;color:#222420")}>
              {sources.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </label>
        )}
      </div>
    </>
  );
}

function PanelIcon({ open = false }: { open?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <path d="M6 2.5v11" stroke="currentColor" strokeWidth="1.4" />
      <path d={open ? "M9 6l2 2-2 2" : "M11 6l-2 2 2 2"} stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** An input that keeps what's typed until Enter or leaving it; Escape puts the value back. */
function DraftInput({ value, onCommit, readOnly = false, style, label, title, placeholder }: { value: string; onCommit: (v: string) => void; readOnly?: boolean; style: CSSProperties; label: string; title?: string; placeholder?: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const skip = useRef(false);
  return (
    <input
      inputMode="decimal"
      aria-label={label}
      title={title}
      placeholder={placeholder}
      readOnly={readOnly}
      value={draft ?? value}
      onChange={(e) => !readOnly && setDraft(e.target.value)}
      onBlur={() => {
        const d = draft;
        setDraft(null);
        if (skip.current) return void (skip.current = false);
        if (d != null && d.trim() !== value) onCommit(d.trim());
      }}
      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          skip.current = true;
          e.currentTarget.blur();
        }
      }}
      style={style}
    />
  );
}

interface MixCardProps {
  it: PgItem;
  name: string;
  dot: string;
  hi: number;
  isBal: boolean;
  hasData: boolean;
  msg: { text: string; ok?: boolean } | null;
  /** The new locked amount being typed, or null. */
  editing: string | null;
  onSlide: (v: string) => void;
  onPct: (v: string) => void;
  onPrice: (v: string) => void;
  onLock: () => void;
  onRemove: () => void;
  onStartEdit: () => void;
  onEditDraft: (d: string) => void;
  onConfirmEdit: () => void;
  onCancelEdit: () => void;
}

function MixCard({ it, name: n, dot, hi, isBal, hasData, msg: m, editing, ...on }: MixCardProps) {
  const locked = it.role === "locked";
  const mfr = it.role === "mfr";
  const free = it.role === "free";
  const editable = free && !isBal;
  const tag = mfr ? "Manufacturer dose" : isBal ? "Adjusts itself" : !hasData ? "Missing data" : it.price == null ? "No price" : locked ? "Locked" : "";
  const kg = (1000 * it.pct) / 100;
  const hint = mfr ? "Set by the manufacturer" : hi < 100 ? "Up to " + limitPct(hi) + "% at this stage" : "";
  const step = hi <= 1 ? 0.001 : hi <= 10 ? 0.01 : 0.05;
  const fixedW = Math.min(100, (it.pct / Math.min(100, Math.max(hi, it.pct * 1.5))) * 100).toFixed(1) + "%";
  return (
    <div style={sx(`border:1px solid ${m && !m.ok ? "#e3aa45" : locked || mfr ? "#c9c5b8" : "#ece8df"};background:${locked || mfr ? "#faf8f3" : "#fff"};border-radius:9px;padding:7px 8px 7px 12px;display:flex;flex-direction:column;gap:6px;animation:fsin .2s ease-out`)}>
      <div style={sx("display:flex;align-items:center;gap:6px 12px;flex-wrap:wrap")}>
        <div style={sx("flex:0 1 190px;min-width:130px;display:flex;flex-direction:column;gap:3px")}>
          <span style={sx("display:flex;align-items:center;gap:7px;min-width:0")}>
            <span style={sx(`width:9px;height:9px;border-radius:2px;background:${dot};flex:none`)} />
            <span title={n} style={sx("font:600 14px/1.2 'IBM Plex Sans',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{n}</span>
            {tag && (
              <span title={hint} style={sx(`font:500 10px/1 'IBM Plex Sans',sans-serif;padding:3px 5px;border-radius:3px;background:${mfr ? "#ece4ea" : isBal ? "#f7ecd6" : locked ? "#222420" : "#ece8df"};color:${mfr ? "#5e4456" : isBal ? "#8a5a14" : locked ? "#faf8f3" : "#45473f"};white-space:nowrap`)}>
                {locked ? "Locked at " + fmtPct(it.fixedPct) + "%" : tag}
              </span>
            )}
          </span>
          <span title={hint} style={sx("display:flex;align-items:center;gap:4px;font:400 11px/1 'IBM Plex Sans',sans-serif;color:#64665c;white-space:nowrap")}>
            <span>{fmt(kg, kg < 10 ? 1 : 0)} kg/t ·</span>
            <label style={sx("display:flex;align-items:center;gap:1px")}>
              $
              <DraftInput
                label={n + " price per tonne"}
                value={it.price == null ? "" : String(+it.price.toFixed(2))}
                placeholder="price?"
                onCommit={on.onPrice}
                style={sx(`width:52px;border:0;border-bottom:1px dashed ${it.price == null ? "#e3aa45" : "#c9c5b8"};background:transparent;padding:1px 1px;font:500 11px/1 'IBM Plex Mono',monospace;color:#222420;text-align:right`)}
              />
              /t
            </label>
          </span>
        </div>
        <div style={sx("flex:1 1 160px;min-width:0;display:flex;align-items:center;gap:10px")}>
          {free ? (
            <input type="range" min={0} max={hi} step={step} value={it.pct} onChange={(e) => on.onSlide(e.target.value)} disabled={!editable} aria-label={n + " amount"} title={hint} style={sx("flex:1;min-width:0")} />
          ) : (
            <div style={sx("flex:1;min-width:0;height:22px;display:flex;align-items:center")}>
              <span style={sx("flex:1;height:6px;border-radius:3px;background:#ece8df;position:relative;display:block")}>
                <span style={sx(`position:absolute;left:0;top:0;bottom:0;width:${fixedW};border-radius:3px;background:repeating-linear-gradient(135deg,#45473f 0 3px,#8d8a80 3px 6px);display:block`)} />
              </span>
            </div>
          )}
        </div>
        <div style={sx("display:flex;align-items:center;gap:4px;flex:none;margin-left:auto")}>
          {editing != null ? (
            <>
              <input
                inputMode="decimal"
                aria-label={"New locked amount for " + n}
                autoFocus
                value={editing}
                onChange={(e) => on.onEditDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") on.onConfirmEdit();
                  if (e.key === "Escape") on.onCancelEdit();
                }}
                style={sx("width:70px;border:1px solid #e3aa45;background:#fff;border-radius:6px;padding:6px 7px;font:500 13px/1 'IBM Plex Mono',monospace;text-align:right")}
              />
              <button onClick={on.onConfirmEdit} style={sx("border:0;background:#2f5a3f;color:#faf8f3;font:600 12px/1 'IBM Plex Sans',sans-serif;padding:7px 9px;border-radius:6px")}>Set</button>
              <button onClick={on.onCancelEdit} style={sx("border:0;background:transparent;color:#64665c;font:500 12px/1 'IBM Plex Sans',sans-serif;padding:7px 4px")}>Cancel</button>
            </>
          ) : (
            <label style={sx("display:flex;align-items:center;gap:3px")}>
              <DraftInput
                label={n + " amount in percent"}
                title={"Exact: " + exactPct(it.pct) + "%"}
                value={inputPct(it.pct)}
                readOnly={!editable}
                onCommit={on.onPct}
                style={sx(`width:76px;border:1px solid ${editable ? "#d6d2c6" : "#ece8df"};background:${editable ? "#fff" : "#f3f0e8"};border-radius:6px;padding:6px 7px;font:500 13px/1 'IBM Plex Mono',monospace;color:#222420;text-align:right`)}
              />
              <span style={sx("font:400 12px/1 'IBM Plex Sans',sans-serif;color:#64665c")}>%</span>
            </label>
          )}
          {locked && editing == null && (
            <button onClick={on.onStartEdit} aria-label={"Change locked amount for " + n} title="Change locked amount" className={hv("mint")} style={sx("border:0;background:transparent;color:#2f5a3f;width:28px;height:28px;border-radius:6px;font:500 13px/1 'IBM Plex Sans',sans-serif")}>
              ✎
            </button>
          )}
          {!mfr && (
            <button
              onClick={on.onLock}
              aria-pressed={locked}
              aria-label={(locked ? "Unlock " : "Lock ") + n}
              title={locked ? "Locked: nothing moves it. Click to unlock." : "Lock this amount so balancing never changes it"}
              style={sx(`border:1px solid ${locked ? "#222420" : "#d6d2c6"};background:${locked ? "#222420" : "#fff"};color:${locked ? "#faf8f3" : "#64665c"};border-radius:6px;width:28px;height:28px;display:flex;align-items:center;justify-content:center`)}
            >
              <svg width="10" height="11" viewBox="0 0 10 11" aria-hidden>
                <rect x="1" y="5" width="8" height="6" rx="1.2" fill="currentColor" />
                <path d={locked ? "M3 5V3.5a2 2 0 0 1 4 0V5" : "M3 5V3.5a2 2 0 0 1 4 0"} stroke="currentColor" strokeWidth="1.4" fill="none" />
              </svg>
            </button>
          )}
          <button onClick={on.onRemove} aria-label={"Take " + n + " out of the mix"} title="Take out of the mix" className={hv("soft")} style={sx("border:0;background:transparent;color:#8d8a80;font:400 17px/1 'IBM Plex Sans',sans-serif;width:26px;height:28px;border-radius:5px")}>
            ×
          </button>
        </div>
      </div>
      {m && (
        <div role="status" style={sx(`padding:6px 9px;border-radius:6px;background:${m.ok ? "#eef4ec" : "#fbeee0"};color:${m.ok ? "#2f5a3f" : "#7a4a0c"};font:400 12px/1.4 'IBM Plex Sans',sans-serif;text-wrap:pretty`)}>{m.text}</div>
      )}
    </div>
  );
}

function ProposalCard({ p, items, costNow, nm, onApply, onDiscard }: { p: Extract<Proposal, { status: "ok" }>; items: PgItem[]; costNow: number; nm: (id: string) => string; onApply: () => void; onDiscard: () => void }) {
  const d = p.costT - costNow;
  const changes = changesOf(items, p.pct);
  const sub = (p.meets ? "Meets all " + p.total + " needs. " : p.met + " of " + p.total + " needs met. ") + "Locked amounts unchanged." + (p.costExcludesPremix ? " Cost leaves out the unpriced premix." : "") + (p.setAside.length ? " " + p.setAside.map(nm).join(", ") + " left out: missing nutrient data." : "");
  return (
    <div style={sx("border:1px solid #2f5a3f;border-radius:8px;overflow:hidden;animation:fsin .2s ease-out")}>
      <div style={sx("padding:10px 12px;background:#f1f5ef;display:flex;flex-direction:column;gap:4px")}>
        <span style={sx("font:600 14px/1.25 'IBM Plex Sans',sans-serif;color:#2f5a3f")}>{"$" + fmt(p.costT, 2) + " per tonne" + (Math.abs(d) < 0.005 ? "" : " (" + (d < 0 ? "saves $" : "adds $") + fmt(Math.abs(d), 2) + ")")}</span>
        <span style={sx("font:400 12px/1.4 'IBM Plex Sans',sans-serif;color:#45473f")}>{sub}</span>
      </div>
      <div style={sx("padding:8px 12px;display:flex;flex-direction:column;gap:5px")}>
        {changes.length ? (
          changes.map((x) => (
            <div key={x.i.id} style={sx("display:flex;justify-content:space-between;gap:8px;font:400 12px/1.3 'IBM Plex Sans',sans-serif")}>
              <span style={sx("white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{nm(x.i.id)}</span>
              <span style={sx("font:400 12px/1.3 'IBM Plex Mono',monospace;color:#45473f;white-space:nowrap")}>{fmtPct(x.i.pct) + " → " + fmtPct(x.to) + "%"}</span>
            </div>
          ))
        ) : (
          <span style={sx("font:400 12px/1.3 'IBM Plex Sans',sans-serif;color:#45473f")}>Your mix is already the cheapest these ingredients allow.</span>
        )}
      </div>
      <div style={sx("padding:10px 12px;border-top:1px solid #e2dfd6;display:flex;gap:8px")}>
        <button onClick={onApply} style={sx("border:0;background:#2f5a3f;color:#faf8f3;font:600 13px/1 'IBM Plex Sans',sans-serif;padding:9px 12px;border-radius:6px")}>Use this mix</button>
        <button onClick={onDiscard} style={sx("border:0;background:transparent;color:#45473f;font:500 13px/1 'IBM Plex Sans',sans-serif;padding:9px 6px")}>No thanks</button>
      </div>
    </div>
  );
}

/** A nutrient value as the results panel writes it: 1.038%, 3,250 kcal. */
function fmtNutrient(n: { unit: string; dp: number }, v: number) {
  return n.unit === "%" ? fmt(v, n.dp) + "%" : fmt(v, 0) + " " + (n.unit.includes("kcal") ? "kcal" : n.unit);
}

/** The ingredient changes a proposal makes, largest first. */
function changesOf(items: PgItem[], pct: Record<string, number>) {
  return items
    .map((i) => ({ i, to: pct[i.id] ?? 0 }))
    .filter((x) => Math.abs(x.to - x.i.pct) > 1e-4)
    .sort((a, b) => Math.abs(b.to - b.i.pct) - Math.abs(a.to - a.i.pct))
    .slice(0, 6);
}

/**
 * When no mix of these ingredients meets every need: the one that misses
 * them least (worst miss first, then the total, then cost). Shown with what
 * it still misses and by how much; it is never called suitable.
 */
function ClosestCard({ p, items, costNow, nm, onApply, onDiscard }: { p: Extract<Proposal, { status: "closest" }>; items: PgItem[]; costNow: number; nm: (id: string) => string; onApply: () => void; onDiscard: () => void }) {
  const changes = changesOf(items, p.pct);
  const missing = p.total - p.met;
  return (
    <div role="alert" style={sx("border:1px solid #c0573f;border-radius:8px;overflow:hidden;animation:fsin .2s ease-out")}>
      <div style={sx("padding:10px 12px;background:#f8ebe5;display:flex;flex-direction:column;gap:4px;color:#5e2417")}>
        <span style={sx("font:600 14px/1.25 'IBM Plex Sans',sans-serif")}>These ingredients can’t meet every need</span>
        <span style={sx("font:400 12px/1.45 'IBM Plex Sans',sans-serif;text-wrap:pretty")}>
          {"This is the closest they can get: still " + (missing > 0 ? missing + " of " + p.total : "some") + " needs not met. Not suitable for feeding as it is. " + p.hint}
        </span>
      </div>
      <div style={sx("padding:8px 12px;display:flex;flex-direction:column;gap:6px;border-bottom:1px solid #e2dfd6")}>
        <span style={sx("font:600 12px/1.3 'IBM Plex Sans',sans-serif;color:#45473f")}>Still not met</span>
        {p.unmet.map((u) => (
          <div key={u.id} style={sx("display:flex;flex-direction:column;gap:2px;font:400 12px/1.35 'IBM Plex Sans',sans-serif")}>
            <span style={sx("display:flex;justify-content:space-between;gap:8px")}>
              <span style={sx("font-weight:500")}>{u.name}</span>
              <span style={sx("font:500 12px/1.3 'IBM Plex Mono',monospace;color:#a8432f;white-space:nowrap")}>{u.deviationPct != null ? fmtPct(u.deviationPct) + "% " + (u.kind === "min" ? "short" : "over") : u.kind === "min" ? "short" : "over"}</span>
            </span>
            <span style={sx("color:#64665c")}>{"Best " + u.best + " · needs " + (u.kind === "min" ? "at least " : "at most ") + u.req}</span>
          </div>
        ))}
      </div>
      <div style={sx("padding:8px 12px;display:flex;flex-direction:column;gap:5px")}>
        {p.costT != null && (
          <span style={sx("font:400 12px/1.35 'IBM Plex Sans',sans-serif;color:#45473f")}>
            {"$" + fmt(p.costT, 2) + " per tonne (" + (p.costT - costNow < 0 ? "−" : "+") + "$" + fmt(Math.abs(p.costT - costNow), 2) + ")" + (p.costExcludesPremix ? ", not counting the unpriced premix" : "") + ". Locked amounts unchanged."}
          </span>
        )}
        {changes.map((x) => (
          <div key={x.i.id} style={sx("display:flex;justify-content:space-between;gap:8px;font:400 12px/1.3 'IBM Plex Sans',sans-serif")}>
            <span style={sx("white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{nm(x.i.id)}</span>
            <span style={sx("font:400 12px/1.3 'IBM Plex Mono',monospace;color:#45473f;white-space:nowrap")}>{fmtPct(x.i.pct) + " → " + fmtPct(x.to) + "%"}</span>
          </div>
        ))}
        {!changes.length && <span style={sx("font:400 12px/1.3 'IBM Plex Sans',sans-serif;color:#45473f")}>Your mix is already as close as these ingredients get.</span>}
      </div>
      <div style={sx("padding:10px 12px;border-top:1px solid #e2dfd6;display:flex;gap:8px;flex-wrap:wrap;align-items:center")}>
        {changes.length > 0 && <button onClick={onApply} style={sx("border:1px solid #2f5a3f;background:#fff;color:#2f5a3f;font:600 13px/1 'IBM Plex Sans',sans-serif;padding:9px 12px;border-radius:6px")}>Try this mix</button>}
        <button onClick={onDiscard} style={sx("border:0;background:transparent;color:#45473f;font:500 13px/1 'IBM Plex Sans',sans-serif;padding:9px 6px")}>{changes.length ? "No thanks" : "OK"}</button>
      </div>
    </div>
  );
}

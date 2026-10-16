import type { CatalogueIngredient } from "@/lib/studio-catalogue";
import type { StudioPhase } from "@/lib/studio-programmes";
import { commercialPremixById } from "@/lib/commercial-premixes";
import { isCompleteInclusionTotal } from "@/lib/inclusion-total";
import { INCLUSION_TOLERANCE_PCT } from "@/lib/numerical-tolerance";
import { requirementCounts } from "@/lib/formulation-assessment-model";

import { fmt, fsLimit, guideline, type EngineContext, type ManualCheck, type NutrientResult, type Pool, type PoolEntry, type Snapshot } from "./engine";

// The Playground's recipe model (design/FeedSport Playground.html): a mix of
// ingredients at exact percentages, each free to move, locked by the farmer
// (Studio's "fixed" role) or set by a premix manufacturer. Nothing here judges
// nutrition: complete recipes are checked by the engine (evaluateManual), and
// rebalancing is the engine's optimiser run on the pool built by poolOf().

/** free: the farmer moves it; locked: Studio's "fixed" role; mfr: a premix at its manufacturer dose. */
export type PgRole = "free" | "locked" | "mfr";

export interface PgItem {
  id: string;
  /** Exact inclusion, %. Never the rounded number an input shows. */
  pct: number;
  role: PgRole;
  /** The locked or manufacturer amount; null while free. */
  fixedPct: number | null;
  /** USD per tonne; null when nobody has priced it. */
  price: number | null;
}

/** What undo, redo and "Start over" restore. */
export interface PgMix {
  items: PgItem[];
  autoBal: boolean;
  /** The ingredient that keeps the mix at 100%; "" when none is chosen. */
  balancer: string;
}

/** The amount nothing below this counts as: the optimiser's inclusion tolerance. */
export const EPS = INCLUSION_TOLERANCE_PCT;

/** USD per tonne the catalogue plans with, or null. */
export const planningPrice = (catalogue: Map<string, CatalogueIngredient>, id: string) => catalogue.get(id)?.price?.usdPerTonne ?? null;

export const totalOf = (items: readonly PgItem[]) => items.reduce((t, i) => t + i.pct, 0);
export const fixedSumOf = (items: readonly PgItem[]) => items.reduce((t, i) => t + (i.role === "free" ? 0 : i.pct), 0);
export const isComplete = (items: readonly PgItem[]) => isCompleteInclusionTotal(totalOf(items));

/** Ingredients with an amount, as the engine reads a recipe. */
export function pctOf(items: readonly PgItem[]): Record<string, number> {
  const pct: Record<string, number> = {};
  for (const i of items) if (i.pct > 0) pct[i.id] = i.pct;
  return pct;
}

/**
 * The mix as a Studio ingredient pool. Locked and manufacturer amounts become
 * Studio's fixed role at their exact amount, so the optimiser and the
 * validator hold them as min == max. A price is only written when it differs
 * from the planning price, so Studio still says when a planning price is used.
 */
export function poolOf(items: readonly PgItem[], catalogue: Map<string, CatalogueIngredient>): Pool {
  const pool: Pool = {};
  for (const i of items) {
    const entry: PoolEntry = i.role === "free" ? { role: "available" } : { role: "fixed", fixed: i.fixedPct ?? i.pct };
    if (i.price != null && i.price !== planningPrice(catalogue, i.id)) entry.price = i.price;
    pool[i.id] = entry;
  }
  return pool;
}

export function snapOf(programmeId: string, phaseId: string, items: readonly PgItem[], catalogue: Map<string, CatalogueIngredient>): Snapshot {
  return { programmeId, phaseId, pool: poolOf(items, catalogue), goal: "least_cost", batch: 1000 };
}

/** What a check is for: the exact amounts and roles. Prices don't change nutrition. */
export const checkSig = (sourceKey: string, items: readonly PgItem[]) => JSON.stringify([sourceKey, items.map((i) => [i.id, i.pct, i.role, i.fixedPct])]);
/** What a rebalance is for: amounts, roles and prices. */
export const solveSig = (sourceKey: string, items: readonly PgItem[]) => JSON.stringify([sourceKey, items.map((i) => [i.id, i.pct, i.role, i.fixedPct, i.price])]);

/** Ingredient cost per tonne of what's in the mix, leaving out (and naming) anything unpriced. */
export function costOf(items: readonly PgItem[]) {
  let costT = 0;
  const unpriced: string[] = [];
  for (const i of items) {
    if (!(i.pct > 0)) continue;
    if (i.price == null) unpriced.push(i.id);
    else costT += (i.pct / 100) * i.price;
  }
  return { costT, unpriced };
}

/** The highest amount an ingredient may have at this stage (FeedSport's limit, or 100). */
export const maxFor = (ctx: EngineContext, phase: StudioPhase, id: string) => fsLimit(ctx, phase, id);

export type BalanceResult = { ok: true; nb?: number } | { ok: false; err: string };

/**
 * Keeps the mix at 100% when `id` changes by `d` points: the balancing
 * ingredient moves by −d, and nothing else moves. A change it can't absorb is
 * refused rather than spread over other ingredients.
 */
export function balance(mix: PgMix, id: string, d: number, hiOf: (id: string) => number, nameOf: (id: string) => string): BalanceResult {
  if (!mix.autoBal || !mix.balancer || mix.balancer === id || Math.abs(d) < 1e-12) return { ok: true };
  const b = mix.items.find((i) => i.id === mix.balancer);
  if (!b || b.role !== "free") return { ok: true };
  const nb = b.pct - d;
  const bn = nameOf(b.id);
  if (nb < -1e-9) return { ok: false, err: "There isn’t enough " + lowerName(bn) + " left to make room. Lower something else first, or switch off “Keep it at 100%”." };
  if (nb > hiOf(b.id) + 1e-9) return { ok: false, err: bn + " can’t go above " + limitPct(hiOf(b.id)) + "% for this stage, so it can’t fill the gap. Add something else instead." };
  return { ok: true, nb: Math.max(0, nb) };
}

/** An amount for reading: never "0" for a tiny inclusion, and no trailing noise. */
export function fmtPct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (Math.abs(v) < 1e-9) return "0";
  if (Math.abs(v) < 0.1) return String(+v.toPrecision(2));
  return fmt(v, Math.abs(v) < 1 ? 3 : 2);
}

/** A limit or guideline as published: no trailing zeros (30%, 0.35%). */
export const limitPct = (v: number) => fmtPct(v).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");

/** An amount as an input shows it: up to four decimals, or three significant figures below 0.01%. */
export function inputPct(v: number): string {
  if (v > 0 && v < 0.01) return String(+v.toPrecision(3));
  return String(+v.toFixed(4));
}

/** The full-precision amount, for the title behind an input. */
export const exactPct = (v: number | null | undefined) => (v == null ? "" : String(+(+v).toPrecision(12)));

export const lowerName = (name: string) => name.replace(/^[A-Z](?![A-Z0-9])/, (c) => c.toLowerCase());

/** Parses what a farmer typed: comma or point decimals, NaN otherwise. */
export function parseNum(s: string): number {
  const t = String(s).trim().replace(",", ".");
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)) return NaN;
  return parseFloat(t);
}

/** The premix in a mix, if any. */
export const premixIn = (items: readonly PgItem[]) => items.find((i) => !!commercialPremixById(i.id));

// ---- what the results panel says ----

/** Requirement ids as the Playground names them; anything else keeps the engine's label. */
export const FRIENDLY: Record<string, string> = {
  "energy-me": "Energy",
  "energy-ne": "Energy",
  "crude-protein": "Protein",
  "digestible-protein": "Digestible protein",
  "sid-lysine": "Lysine",
  "sid-met-cys": "Methionine + cysteine",
  "sid-threonine": "Threonine",
  "sid-tryptophan": "Tryptophan",
  "sid-valine": "Valine",
  "sid-isoleucine": "Isoleucine",
  "sid-leucine": "Leucine",
  "sid-histidine": "Histidine",
  "sid-phe-tyr": "Phenylalanine + tyrosine",
  calcium: "Calcium",
  "sttd-phosphorus": "Digestible phosphorus",
  "available-phosphorus": "Available phosphorus",
  sodium: "Sodium (salt)",
  potassium: "Potassium",
  chloride: "Chloride",
  "linoleic-acid": "Linoleic acid",
};
export const friendly = (id: string, label: string) => FRIENDLY[id] ?? label;

/** The amino acid an ingredient supplies on its own, for "a little more usually fixes it". */
export const SYNTHETIC: Record<string, string> = {
  "sid-lysine": "l-lysine-hcl",
  "sid-met-cys": "dl-methionine",
  "sid-threonine": "l-threonine",
  "sid-tryptophan": "l-tryptophan",
};

export type Verdict = "checking" | "meets" | "fails" | "incomplete" | "invalid" | "unknown" | "error" | "over";

export interface Check {
  /** checkSig of the amounts it describes. */
  sig: string;
  check: ManualCheck | null;
  /** The engine couldn't be reached or refused the recipe. */
  error: string | null;
}

/**
 * The headline for a mix and its latest check. Locked amounts over 100% and
 * incomplete mixes are known without the engine; everything else is the
 * engine's assessment, never a client-side judgement.
 */
export function verdictOf(items: readonly PgItem[], c: Check | null): Verdict {
  if (fixedSumOf(items) > 100 + INCLUSION_TOLERANCE_PCT) return "over";
  if (!isComplete(items)) return "incomplete";
  if (!c) return "checking";
  if (c.error || !c.check) return "error";
  const k = c.check;
  if (!k.recipeValidity.valid) return "invalid";
  if (k.assessment && k.assessment.consistencyErrors.length) return "error";
  if (k.nutrientAdequacy === "not-met" || (k.assessment && requirementCounts(k.assessment).failed.length)) return "fails";
  if (k.nutrientAdequacy === "unknown") return "unknown";
  return k.nutrientAdequacy === "met" ? "meets" : "error";
}

/**
 * What the known ingredients contribute so far to each requirement: the
 * catalogue's per-ingredient values (computed as the optimiser does) times
 * the amount. Only for an incomplete mix, labelled as partial, never judged.
 */
export function partialValues(items: readonly PgItem[], catalogue: Map<string, CatalogueIngredient>, species: "swine" | "broiler", ids: readonly string[]) {
  const out: Record<string, number> = {};
  for (const id of ids) out[id] = 0;
  for (const i of items) {
    if (!(i.pct > 0)) continue;
    const values = catalogue.get(i.id)?.requirementValues[species] ?? {};
    for (const id of ids) out[id] += (i.pct / 100) * (values[id] ?? 0);
  }
  return out;
}

/** Practical-guideline notes: allowed, but above what farmers usually use at this stage. */
export function guidelineNotes(items: readonly PgItem[], ctx: EngineContext, phase: StudioPhase) {
  return items.flatMap((i) => {
    const g = guideline(ctx, phase, i.id);
    if (g == null || !(i.pct > g + 1e-6)) return [];
    return [{ id: i.id, pct: i.pct, guide: g }];
  });
}

/** The nutrient rows the results panel draws, with their status in Playground terms. */
export type BarStatus = NutrientResult["status"] | "partial" | "unknown";

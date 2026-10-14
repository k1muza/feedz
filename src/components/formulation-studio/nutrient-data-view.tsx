import { useMemo, useState } from "react";

import type { NutrientGroup } from "@/lib/feed-nutrients";
import type { CatalogueIngredient } from "@/lib/studio-catalogue";
import type { StudioPhase, StudioProgrammeData } from "@/lib/studio-programmes";

import { fmt } from "./engine";
import {
  NUTRIENTS,
  NUTRIENT_GROUPS,
  categoryColor,
  categoryRank,
  costUnit,
  fmtContent,
  fmtCost,
  fmtWithUnit,
  nutrientById,
  nutrientContent,
  nutrientCost,
  phaseInclusionLimit,
  phaseParts,
  phaseRequirement,
  requirementIndex,
  programmeSets,
  referenceIngredients,
  type NutrientRef,
  type Species,
} from "./nutrient-data";
import { Pager, pagerVals } from "./pager";
import { BACK_LINK, CARD, CARD_HEAD, CARD_SUB, CARD_TITLE, DETAIL_PAGE, EDGE_BTN, HATCH, MONO_KICKER, MORE_BTN, PAGE, SEARCH_INPUT, StageSelect, chip, nameList, pct, plural, resolveStage, seg, type StageTarget } from "./reference-ui";
import { hv, sx } from "./sx";

// Markup for /studio/nutrients, /studio/nutrients/sources and
// /studio/nutrients/[id], transcribed from design/FeedSport Nutrients.html.
// Filters, sorting and the chart choices are local to this screen; only the
// page and the open nutrient live in the URL.

export interface NutrientDataProps {
  catalogue: CatalogueIngredient[];
  programmes: StudioProgrammeData;
  /** Nutrient id on /studio/nutrients/[id]; null on the list. */
  sel: string | null;
  /** /studio/nutrients/sources: the ingredient × nutrient heatmap. */
  sources: boolean;
  open: (id: string) => void;
  openSources: () => void;
  goList: () => void;
  /** Page of the list, kept in the URL. `replace` swaps the history entry instead of adding one. */
  page: number;
  pageSize: number;
  setPage: (page: number, replace?: boolean) => void;
  setPageSize: (size: number) => void;
}

export function NutrientData(props: NutrientDataProps) {
  const ings = useMemo(() => referenceIngredients(props.catalogue), [props.catalogue]);
  const N = nutrientById(props.sel);
  if (props.sources) return <NutrientSources {...props} ings={ings} />;
  return N ? <NutrientDetail {...props} ings={ings} N={N} /> : <NutrientList {...props} ings={ings} />;
}

type Inner = NutrientDataProps & { ings: CatalogueIngredient[] };

/** Pig values for every nutrient, aligned with `ings`. The list and heatmap use pig ME; poultry energy is on the energy page. */
const usePigValues = (ings: CatalogueIngredient[]) => useMemo(() => new Map(NUTRIENTS.map((n) => [n.id, ings.map((g) => nutrientContent(g, n, "swine"))])), [ings]);


// ---- list ----

const LIST_COLS = "display:grid;grid-template-columns:minmax(0,2.1fr) minmax(0,1.6fr) 190px 150px 24px;gap:20px";

function NutrientList({ ings, programmes, open, openSources, page, pageSize, setPage, setPageSize }: Inner) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<"All" | NutrientGroup>("All");
  const progs = programmes.programmes;
  const pig = usePigValues(ings);
  const needle = q.trim().toLowerCase();
  const rows = NUTRIENTS.filter((n) => (group === "All" || n.group === group) && (!needle || n.name.toLowerCase().includes(needle) || n.shortName.toLowerCase() === needle || n.guide.summary.toLowerCase().includes(needle))).map((n) => {
    const vals = pig.get(n.id)!;
    const top = ings
      .map((g, i) => ({ g, v: vals[i] }))
      .filter((x): x is { g: CatalogueIngredient; v: number } => x.v != null && x.v > 0)
      .sort((a, b) => b.v - a.v)
      .slice(0, 3);
    const req = progs.map((p) => ({ p, on: programmeSets(programmes, p, n) }));
    const used = req.filter((r) => r.on).length;
    const miss = vals.filter((v) => v == null).length;
    return { n, top, req, used, miss };
  });
  const pg = pagerVals(rows.length, page, pageSize, (p) => setPage(p), setPageSize);
  const filter = (apply: () => void) => {
    apply();
    if (page !== 1) setPage(1, true);
  };

  return (
    <div style={sx(PAGE)}>
      <div style={sx("display:flex;flex-direction:column;gap:6px")}>
        <span style={sx(MONO_KICKER)}>Reference data</span>
        <h1 style={sx("margin:0;font:600 26px/1.2 'IBM Plex Sans',sans-serif;letter-spacing:-0.015em")}>Nutrient data</h1>
        <p style={sx("margin:0;font:400 14px/1.5 'IBM Plex Sans',sans-serif;color:#64665c;max-width:680px;text-wrap:pretty")}>The nutrients FeedSport balances, which ingredients supply them, and how much each feeding programme asks for. Values are on an as-fed basis.</p>
      </div>

      <div style={sx("display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap")}>
        <div style={sx("display:flex;gap:6px;flex-wrap:wrap")}>
          {(["All", ...NUTRIENT_GROUPS] as const).map((g) => {
            const on = group === g;
            return (
              <button key={g} type="button" aria-pressed={on} onClick={() => filter(() => setGroup(g))} style={sx(chip(on))}>
                <span>{g}</span>
                <span style={sx("font:400 12px/1 'IBM Plex Mono',monospace;opacity:.7")}>{g === "All" ? NUTRIENTS.length : NUTRIENTS.filter((n) => n.group === g).length}</span>
              </button>
            );
          })}
        </div>
        <input value={q} onChange={(e) => filter(() => setQ(e.target.value))} placeholder="Search nutrients" aria-label="Search nutrients" style={sx(SEARCH_INPUT)} />
      </div>

      <div style={sx("background:#fff;border:1px solid #e2dfd6;border-radius:10px;overflow:auto")}>
        <div style={sx("min-width:880px")}>
          <div style={sx(`${LIST_COLS};padding:11px 20px;font:500 11px/1 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;letter-spacing:0.05em;background:#faf8f3;border-bottom:1px solid #e2dfd6`)}>
            <span>Nutrient</span>
            <span>Richest sources</span>
            <span>Required by</span>
            <span>Data coverage</span>
            <span />
          </div>
          {rows.slice(pg.from, pg.to).map(({ n, top, req, used, miss }) => (
            <button key={n.id} type="button" onClick={() => open(n.id)} className={hv("rowLite")} style={sx(`width:100%;border:0;border-top:1px solid #ece8df;background:#fff;text-align:left;${LIST_COLS};padding:16px 20px;align-items:center;color:#222420`)}>
              <div style={sx("display:flex;flex-direction:column;gap:5px;min-width:0")}>
                <span style={sx("font:500 11px/1 'IBM Plex Mono',monospace;color:#8d8a80;text-transform:uppercase;letter-spacing:0.05em")}>{n.group}</span>
                <div style={sx("display:flex;align-items:baseline;gap:8px;flex-wrap:wrap")}>
                  <span style={sx("font:600 15px/1.25 'IBM Plex Sans',sans-serif")}>{n.name}</span>
                  <span style={sx("font:400 12px/1 'IBM Plex Mono',monospace;color:#64665c")}>{n.unit}</span>
                </div>
                <span style={sx("font:400 13px/1.45 'IBM Plex Sans',sans-serif;color:#45473f;text-wrap:pretty")}>{n.guide.summary}</span>
              </div>
              <div style={sx("display:flex;flex-direction:column;gap:6px;max-width:270px")}>
                {top.map((t) => (
                  <div key={t.g.id} style={sx("display:flex;align-items:center;gap:8px;font:400 13px/1.2 'IBM Plex Sans',sans-serif")}>
                    <span style={{ ...sx("width:8px;height:8px;border-radius:2px;flex:none"), background: categoryColor(t.g.category) }} />
                    <span style={sx("flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{t.g.name}</span>
                    <span style={sx("font:400 12px/1 'IBM Plex Mono',monospace;color:#45473f")}>{fmtContent(n, t.v)}</span>
                  </div>
                ))}
              </div>
              <div style={sx("display:flex;flex-direction:column;gap:7px")}>
                <div style={sx("display:flex;gap:2px;flex-wrap:wrap")}>
                  {req.map(({ p, on }) => (
                    <span key={p.id} title={p.name + (on ? "" : " · not set")} style={sx(`width:7px;height:11px;border-radius:2px;background:${on ? "#2f5a3f" : "#e2dfd6"}`)} />
                  ))}
                </div>
                <span style={sx("font:400 12px/1.2 'IBM Plex Sans',sans-serif;color:#45473f")}>{used ? used + " of " + progs.length + " programmes" : "Not required"}</span>
              </div>
              <div style={sx("display:flex;flex-direction:column;gap:7px")}>
                <div style={sx("height:6px;border-radius:3px;background:#ece8df;overflow:hidden")}>
                  <div style={{ ...sx("height:100%"), width: pct(((ings.length - miss) / Math.max(1, ings.length)) * 100), background: miss ? "#e3aa45" : "#2f5a3f" }} />
                </div>
                <span style={sx("font:400 12px/1.2 'IBM Plex Sans',sans-serif;color:#45473f")}>{ings.length - miss + " of " + ings.length + " ingredients"}</span>
              </div>
              <span aria-hidden style={sx("font:400 18px/1 'IBM Plex Sans',sans-serif;color:#8d8a80;text-align:right")}>›</span>
            </button>
          ))}
          {rows.length === 0 && <div style={sx("padding:28px 20px;border-top:1px solid #ece8df;font:400 14px/1.4 'IBM Plex Sans',sans-serif;color:#64665c")}>No nutrients match “{q}”.</div>}
        </div>
        <Pager pg={pg.pager} />
      </div>

      <button type="button" onClick={openSources} className={hv("rowLite")} style={sx("border:1px solid #e2dfd6;border-radius:10px;background:#fff;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;gap:16px;text-align:left;color:#222420")}>
        <span style={sx("display:flex;flex-direction:column;gap:5px")}>
          <span style={sx(CARD_TITLE)}>Where each nutrient comes from</span>
          <span style={sx(`${CARD_SUB};max-width:620px`)}>Every ingredient against every nutrient, shaded by how much it supplies. Find the richest sources and the gaps in the data at a glance.</span>
        </span>
        <span aria-hidden style={sx("font:400 18px/1 'IBM Plex Sans',sans-serif;color:#8d8a80")}>›</span>
      </button>
    </div>
  );
}

// ---- sources (heatmap) ----

// The first column carries the card's 20px left padding so it can stay pinned flush to the edge.
const HEAT_COLS = `display:grid;grid-template-columns:180px repeat(${NUTRIENTS.length},minmax(56px,1fr));gap:2px`;
const HEAT_MIN_WIDTH = 180 + NUTRIENTS.length * 58 + 20;
// Pinned while the grid scrolls: white shadows cover the 2px row gaps cells slide under, and a hairline marks the edge.
const HEAT_PIN = "position:sticky;left:0;background:#fff;box-shadow:0 2px 0 #fff,0 -2px 0 #fff,1px 0 0 #ece8df";

/** Each nutrient's richest few, so every heatmap column shows its peak in the short view. */
const HEAT_KEY_PER_NUTRIENT = 2;

function NutrientSources({ ings, open, goList }: Inner) {
  const [keyOnly, setKeyOnly] = useState(false);
  const pig = usePigValues(ings);
  const heat = useMemo(() => {
    const maxBy = new Map(NUTRIENTS.map((n) => [n.id, Math.max(0, ...pig.get(n.id)!.map((v) => v ?? 0))]));
    const key = new Set(
      NUTRIENTS.flatMap((n) =>
        pig
          .get(n.id)!
          .map((v, i) => ({ v: v ?? 0, i }))
          .filter((x) => x.v > 0)
          .sort((a, b) => b.v - a.v)
          .slice(0, HEAT_KEY_PER_NUTRIENT)
          .map((x) => x.i),
      ),
    );
    const order = ings.map((g, i) => ({ g, i })).sort((a, b) => categoryRank(a.g.category) - categoryRank(b.g.category) || a.g.name.localeCompare(b.g.name));
    return { maxBy, key, order };
  }, [ings, pig]);
  const heatRows = keyOnly ? heat.order.filter((r) => heat.key.has(r.i)) : heat.order;

  return (
    <div style={sx(DETAIL_PAGE)}>
      <div style={sx("display:flex")}>
        <button type="button" onClick={goList} className={hv("back")} style={sx(BACK_LINK)}>← Nutrient data</button>
      </div>
      <div style={sx(CARD)}>
        <div style={sx(`${CARD_HEAD};display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap`)}>
          <div style={sx("display:flex;gap:6px;flex-wrap:wrap")}>
            {(
              [
                [false, "All ingredients"],
                [true, "Richest sources"],
              ] as const
            ).map(([k, label]) => (
              <button key={label} type="button" aria-pressed={keyOnly === k} onClick={() => setKeyOnly(k)} style={sx(chip(keyOnly === k))}>{label}</button>
            ))}
          </div>
          <div style={sx("display:flex;gap:14px;font:400 12px/1 'IBM Plex Sans',sans-serif;color:#64665c;flex-wrap:wrap;align-items:center")}>
            <span style={sx("display:flex;align-items:center;gap:6px")}><span style={sx("width:44px;height:10px;border-radius:2px;background:linear-gradient(90deg,#edf1ea,#2f5a3f)")} />Low → high</span>
            <span style={sx("display:flex;align-items:center;gap:6px")}><span style={sx("width:14px;height:10px;border-radius:2px;background:#fff;border:1px solid #e2dfd6")} />None</span>
            <span style={sx("display:flex;align-items:center;gap:6px")}><span style={sx(`width:14px;height:10px;border-radius:2px;background:${HATCH}`)} />Missing</span>
          </div>
        </div>
        {/* Its own scroll area, so the nutrient headings and ingredient names stay in view both ways. */}
        <div style={sx("overflow:auto;max-height:calc(100vh - 140px);overscroll-behavior:contain")}>
          <div style={{ ...sx("display:flex;flex-direction:column;gap:2px;padding:0 20px 18px 0"), minWidth: HEAT_MIN_WIDTH }}>
            <div style={sx(`${HEAT_COLS};position:sticky;top:0;z-index:2;background:#fff;padding:14px 0 4px;box-shadow:0 1px 0 #ece8df`)}>
              <span style={sx(`${HEAT_PIN};z-index:1;align-self:stretch;margin:-14px 0 -4px;box-shadow:1px 0 0 #ece8df`)} />
              {NUTRIENTS.map((n) => (
                <button key={n.id} type="button" onClick={() => open(n.id)} title={n.name + " · " + n.unit} className={hv("soft")} style={sx("border:0;background:transparent;font:500 11px/1.25 'IBM Plex Mono',monospace;color:#45473f;padding:6px 2px;border-radius:4px;align-self:end")}>{n.shortName}</button>
              ))}
            </div>
            {heatRows.map(({ g, i }) => (
              <div key={g.id} style={sx(HEAT_COLS)}>
                <div style={sx(`${HEAT_PIN};z-index:1;display:flex;align-items:center;gap:8px;font:400 13px/1.2 'IBM Plex Sans',sans-serif;padding:0 8px 0 20px;min-width:0`)}>
                  <span style={{ ...sx("width:8px;height:8px;border-radius:2px;flex:none"), background: categoryColor(g.category) }} />
                  <span title={g.name} style={sx("white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{g.name}</span>
                </div>
                {NUTRIENTS.map((n) => <HeatCell key={n.id} g={g} n={n} v={pig.get(n.id)![i]} max={heat.maxBy.get(n.id)!} open={() => open(n.id)} />)}
              </div>
            ))}
          </div>
        </div>
        <div style={sx("padding:10px 20px 14px;border-top:1px solid #ece8df;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center;font:400 12px/1.4 'IBM Plex Sans',sans-serif;color:#64665c")}>
          <span>{(keyOnly ? "The " + HEAT_KEY_PER_NUTRIENT + " richest sources of each nutrient. " : "All " + ings.length + " ingredients, by category. ") + "ME shown with pig values. Shading uses a square-root scale so small amounts stay visible."}</span>
        </div>
      </div>
    </div>
  );
}

function HeatCell({ g, n, v, max, open }: { g: CatalogueIngredient; n: NutrientRef; v: number | null; max: number; open: () => void }) {
  const base = sx("height:30px;border-radius:3px;display:flex;align-items:center;justify-content:center;font:400 11px/1 'IBM Plex Mono',monospace;cursor:pointer");
  const title = g.name + " · " + n.name + ": ";
  if (v == null) return <div onClick={open} title={title + "missing"} style={{ ...base, background: HATCH }} />;
  if (!v || !max) return <div onClick={open} title={title + "none"} style={{ ...base, background: "#fff", border: "1px solid #ece8df" }} />;
  const a = Math.sqrt(v / max);
  return (
    <div onClick={open} title={title + fmtContent(n, v) + " " + n.unit} style={{ ...base, background: "rgba(47,90,63," + (0.08 + 0.86 * a).toFixed(3) + ")", color: a > 0.5 ? "#fff" : "#222420" }}>
      {fmtContent(n, v)}
    </div>
  );
}

// ---- detail ----

type Metric = "conc" | "cost" | "need";
type SortKey = "name" | "cat" | "val" | "pct" | "price" | "cost" | "need";
interface Row {
  g: CatalogueIngredient;
  v: number | null;
  cost: number | null;
  need: number | null;
  lim: number | null;
}

const BAR_PREVIEW = 12;
const ROW_PREVIEW = 20;
const TABLE_COLS = "display:grid;grid-template-columns:minmax(150px,1.5fr) 104px 96px minmax(120px,1fr) 88px 116px 120px;gap:14px";
const ASCENDING_FIRST: SortKey[] = ["name", "cat", "cost", "need", "price"];

function NutrientDetail({ ings, programmes, N, open, goList }: Inner & { N: NutrientRef }) {
  const [picked, setPicked] = useState<StageTarget | null>(null);
  const [metricPick, setMetric] = useState<Metric>("conc");
  const [scale, setScale] = useState<"log" | "lin">("log");
  const [sortK, setSortK] = useState<SortKey>("val");
  const [sortD, setSortD] = useState(-1);
  const [zeros, setZeros] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [barsAll, setBarsAll] = useState(false);
  const [rowsAll, setRowsAll] = useState(false);

  const progs = programmes.programmes;
  const { programme: prog, phase } = resolveStage(programmes, picked, (ph) => phaseRequirement(programmes, ph, N) != null);
  const sp: Species = prog.species;
  const isMe = N.id === "metabolizable-energy";
  const pctUnit = N.unit === "%";
  const uShort = pctUnit ? "%" : "kcal/kg";
  const req = phaseRequirement(programmes, phase, N);
  const isTarget = N.requirement === "target";
  const reqWord = isTarget ? "target" : "minimum";
  const speciesWord = sp === "broiler" ? "poultry" : "pigs";
  const fu = (v: number) => fmtWithUnit(N, v);

  const rows: Row[] = ings.map((g) => {
    const v = nutrientContent(g, N, sp);
    return { g, v, cost: nutrientCost(g, N, v), need: v != null && v > 0 && req != null ? (req / v) * 100 : null, lim: phaseInclusionLimit(programmes, phase, g.id) };
  });
  const pos = rows.filter((r): r is Row & { v: number } => r.v != null && r.v > 0);
  const maxV = Math.max(0, ...pos.map((r) => r.v));
  const missing = rows.filter((r) => r.v == null);
  const zeroRows = rows.filter((r) => r.v === 0);
  const reqProgs = progs.filter((p) => programmeSets(programmes, p, N));
  const metric: Metric = metricPick === "need" && !reqProgs.length ? "conc" : metricPick;
  const richest = pos.slice().sort((a, b) => b.v - a.v)[0];
  const cheapest = pos.filter((r) => r.cost != null).sort((a, b) => a.cost! - b.cost!)[0];

  const lg = Math.log10;
  const W = (v: number, lo: number, hi: number) => {
    if (!(v > 0) || !(hi > 0)) return "0%";
    const r = scale === "log" ? (lg(v) - lg(lo)) / (lg(hi) - lg(lo) || 1) : v / hi;
    return pct(Math.max(1.2, Math.min(100, r * 100)));
  };
  const enter = (id: string) => () => hover !== id && setHover(id);
  const unhover = () => setHover(null);

  // ---- chart ----
  type Bar = { r: Row; w: string; bg: string; label: string; fg: string; lim?: number | null };
  let bars: Bar[] = [];
  let chartTitle = "";
  let chartSub = "";
  let barsEmptyText = "";
  if (metric === "conc") {
    const lo = Math.min(...pos.map((r) => r.v)) / 2;
    bars = pos.slice().sort((a, b) => b.v - a.v).map((r, i) => ({ r, w: W(r.v, lo, maxV), bg: categoryColor(r.g.category), label: fu(r.v), fg: i === 0 ? "#2f5a3f" : "#45473f" }));
    chartTitle = "Richest sources of " + N.noun;
    chartSub = (isMe ? "Energy per kg of ingredient for " + speciesWord : N.name + " in each ingredient") + ", as fed." + (scale === "log" ? " Log scale, so small amounts stay readable." : "");
    barsEmptyText = "No ingredient in the catalogue contains this nutrient.";
  } else if (metric === "cost") {
    const priced = pos.filter((r) => r.cost != null);
    const mn = Math.min(...priced.map((r) => r.cost!));
    const mx = Math.max(...priced.map((r) => r.cost!));
    bars = priced.sort((a, b) => a.cost! - b.cost!).map((r, i) => ({ r, w: W(r.cost!, mn / 2, mx), bg: categoryColor(r.g.category), label: fmtCost(r.cost!), fg: i === 0 ? "#2f5a3f" : "#45473f" }));
    chartTitle = "Cheapest way to buy " + N.noun;
    chartSub = "What 1 " + (isMe ? "Mcal" : "kg of " + N.noun) + " costs when bought through each ingredient, at default prices. Ingredients carry other nutrients too, so the optimiser may still pick a dearer source.";
    barsEmptyText = "No priced ingredient contains this nutrient.";
  } else {
    if (req == null) barsEmptyText = phase.label + " (" + prog.name + ") sets no " + N.name.toLowerCase() + " requirement. Pick another stage above.";
    else
      bars = pos
        .filter((r) => r.need != null)
        .sort((a, b) => a.need! - b.need!)
        .map((r) => {
          const over = r.need! > 100;
          return {
            r, lim: r.lim, w: pct(Math.min(100, r.need!)),
            bg: over ? "repeating-linear-gradient(135deg,#c9c5b8 0 4px,#ece8df 4px 8px)" : categoryColor(r.g.category),
            label: over ? "Can’t alone" : fmt(r.need!, r.need! < 10 ? 2 : 1) + "%",
            fg: over ? "#8d8a80" : r.lim != null && r.need! > r.lim ? "#8a5a14" : "#45473f",
          };
        });
    chartTitle = "Inclusion needed to meet " + phaseParts(phase).name;
    chartSub = "Share of the feed each ingredient would need to be to supply the " + (req != null ? fu(req) + " " + reqWord : reqWord) + " on its own, for " + prog.name + ". Amber figures pass the stage’s inclusion limit.";
  }
  const shownBars = barsAll ? bars : bars.slice(0, BAR_PREVIEW);
  const legend = [...new Set(shownBars.map((b) => b.r.g.category))].sort((a, b) => categoryRank(a) - categoryRank(b));
  const foot: { k: string; v: string }[] = [];
  if (missing.length) foot.push({ k: "Missing data:", v: nameList(missing.map((r) => r.g.name)) + ". Treated as unknown, not zero; FeedSport sets these aside when this nutrient is required." });
  if (metric === "cost") {
    const unpriced = pos.filter((r) => r.cost == null);
    if (unpriced.length) foot.push({ k: "No price:", v: nameList(unpriced.map((r) => r.g.name)) + "." });
  }
  if (zeroRows.length && metric === "conc") foot.push({ k: "Contains none:", v: nameList(zeroRows.map((r) => r.g.name)) + "." });

  // ---- stats ----
  // Pig and poultry energy aren't comparable, so the energy range stays within the selected species.
  const rangePhases = reqProgs.filter((p) => !isMe || p.species === sp).flatMap((p) => p.phases);
  const reqVals = rangePhases.map((ph) => phaseRequirement(programmes, ph, N)).filter((v): v is number => v != null);
  const lo = Math.min(...reqVals);
  const hi = Math.max(...reqVals);
  const stats = [
    { label: "Required by", val: reqProgs.length ? reqProgs.length + " of " + progs.length : "None", sub: reqProgs.length ? "feeding programmes" : "tracked for reference only" },
    { label: (isTarget ? "Target" : "Minimum") + " across stages", val: reqVals.length ? (lo === hi ? fu(lo) : fmtContent(N, lo) + "–" + fu(hi)) : "—", sub: reqVals.length ? "lowest to highest stage" + (isMe ? ", " + speciesWord : "") : "no programme sets one" },
    { label: "Richest source", val: richest ? richest.g.name : "—", sub: richest ? fu(richest.v) + " as fed" : "" },
    { label: "Cheapest per " + (isMe ? "Mcal" : "kg"), val: cheapest ? cheapest.g.name : "—", sub: cheapest ? fmtCost(cheapest.cost!) + " per " + costUnit(N) : "no priced source" },
    { label: phase.label, val: req != null ? fu(req) : "Not set", sub: prog.name + (req != null ? " · " + reqWord : " · no requirement") },
  ];

  // ---- requirement by stage ----
  const stageVals = prog.phases.map((ph) => ({ ph, v: phaseRequirement(programmes, ph, N) })).filter((x): x is { ph: StudioPhase; v: number } => x.v != null);
  const scaleMax = Math.max(0, ...stageVals.map((x) => x.v)) * 1.08 || 1;
  const lysIdx = requirementIndex(programmes, "sid-lysine");
  const reqEmptyText = !N.requirement
    ? "No FeedSport programme sets a " + N.name.toLowerCase() + " requirement. Ingredient inclusion limits keep it in check instead."
    : prog.name + " sets no " + N.name.toLowerCase() + " requirement. Pick another programme above.";

  // ---- value map ----
  const priced = pos.filter((r) => r.g.price);
  let xTicks: { l: string; label: string }[] = [];
  let yTicks: { b: string; label: string }[] = [];
  let pts: { r: Row; l: number; b: number; showLabel: boolean }[] = [];
  if (priced.length) {
    const px = priced.map((r) => r.g.price!.usdPerTonne);
    const py = priced.map((r) => r.v);
    const x0 = Math.min(...px) / 1.5, x1 = Math.max(...px) * 1.5, y0 = Math.min(...py) / 1.8, y1 = Math.max(...py) * 1.8;
    const X = (v: number) => ((lg(v) - lg(x0)) / (lg(x1) - lg(x0) || 1)) * 100;
    const Y = (v: number) => ((lg(v) - lg(y0)) / (lg(y1) - lg(y0) || 1)) * 100;
    const ticks = (a: number, b: number) => {
      let out: number[] = [];
      for (let k = Math.floor(lg(a)); k <= Math.ceil(lg(b)); k++)
        [1, 2, 5].forEach((m) => {
          const t = m * Math.pow(10, k);
          if (t >= a && t <= b) out.push(+t.toPrecision(3));
        });
      const decade = (t: number) => Math.abs(lg(t) - Math.round(lg(t))) < 1e-9;
      if (out.length > 6) out = out.filter((t) => decade(t) || /^5/.test(String(t).replace(/^0\.0*/, "")));
      if (out.length > 6) out = out.filter(decade);
      return out;
    };
    xTicks = ticks(x0, x1).map((t) => ({ l: pct(X(t)), label: "$" + fmt(t, 0) }));
    yTicks = ticks(y0, y1).map((t) => ({ b: pct(Y(t)), label: isMe ? fmt(t, 0) : String(t) }));
    const key = new Set([...priced.slice().sort((a, b) => a.cost! - b.cost!).slice(0, 3), ...priced.slice().sort((a, b) => b.v - a.v).slice(0, 2)].map((r) => r.g.id));
    pts = priced.map((r) => ({ r, l: X(r.g.price!.usdPerTonne), b: Y(r.v), showLabel: key.has(r.g.id) }));
  }

  // ---- table ----
  const sortBy: Record<SortKey, (r: Row) => string | number | null> = { name: (r) => r.g.name, cat: (r) => r.g.category, val: (r) => r.v, pct: (r) => r.v, price: (r) => r.g.price?.usdPerTonne ?? null, cost: (r) => r.cost, need: (r) => r.need };
  const tAll = rows
    .filter((r) => zeros || r.v !== 0)
    .sort((a, b) => {
      const x = sortBy[sortK](a), y = sortBy[sortK](b);
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return (typeof x === "string" ? x.localeCompare(y as string) : x - (y as number)) * sortD;
    });
  const tRows = rowsAll ? tAll : tAll.slice(0, ROW_PREVIEW);
  const cols: [SortKey, string, "left" | "right"][] = [
    ["name", "Ingredient", "left"], ["cat", "Category", "left"], ["val", "Content, " + uShort, "right"], ["pct", "vs richest", "left"],
    ["price", "Price $/t", "right"], ["cost", isMe ? "$/Mcal" : "$/kg " + N.noun, "right"], ["need", "To meet " + (isTarget ? "target" : "min"), "right"],
  ];
  const sortOn = (k: SortKey) => {
    setSortD(sortK === k ? -sortD : ASCENDING_FIRST.includes(k) ? 1 : -1);
    setSortK(k);
  };

  const idx = NUTRIENTS.findIndex((n) => n.id === N.id);
  const prev = NUTRIENTS[(idx - 1 + NUTRIENTS.length) % NUTRIENTS.length];
  const next = NUTRIENTS[(idx + 1) % NUTRIENTS.length];
  const go = (id: string) => () => {
    setHover(null);
    open(id);
  };

  return (
    <div style={sx(DETAIL_PAGE)}>
      <div style={sx("display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap")}>
        <button type="button" onClick={goList} className={hv("back")} style={sx(BACK_LINK)}>← Nutrient data</button>
        <div style={sx("display:flex;gap:6px")}>
          <button type="button" onClick={go(prev.id)} className={hv("edge")} style={sx(EDGE_BTN)}>‹ {prev.shortName}</button>
          <button type="button" onClick={go(next.id)} className={hv("edge")} style={sx(EDGE_BTN)}>{next.shortName} ›</button>
        </div>
      </div>

      <div style={sx("display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap")}>
        <div style={sx("display:flex;flex-direction:column;gap:8px;min-width:0")}>
          <span style={sx(MONO_KICKER)}>{N.group}</span>
          <div style={sx("display:flex;align-items:baseline;gap:12px;flex-wrap:wrap")}>
            <h1 style={sx("margin:0;font:600 30px/1.15 'IBM Plex Sans',sans-serif;letter-spacing:-0.02em")}>{N.name}</h1>
            <span style={sx("font:500 13px/1 'IBM Plex Mono',monospace;color:#45473f;background:#f3f0e8;padding:5px 8px;border-radius:5px")}>{N.unit}</span>
          </div>
          <p style={sx("margin:0;font:400 14px/1.5 'IBM Plex Sans',sans-serif;color:#64665c;max-width:640px;text-wrap:pretty")}>{N.guide.measured}</p>
        </div>
        <StageSelect programmes={programmes} programme={prog} phase={phase} onPick={setPicked} note={(ph) => (phaseRequirement(programmes, ph, N) != null ? "" : " · not set")} />
      </div>

      <div style={sx("background:#fff;border:1px solid #e2dfd6;border-radius:10px;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))")}>
        <div style={sx("padding:16px 20px;display:flex;flex-direction:column;gap:7px;border-right:1px solid #ece8df")}>
          <span style={sx("font:500 11px/1 'IBM Plex Mono',monospace;color:#2f5a3f;text-transform:uppercase;letter-spacing:0.05em")}>What it does</span>
          <span style={sx("font:400 14px/1.5 'IBM Plex Sans',sans-serif;color:#222420;text-wrap:pretty")}>{N.guide.role}</span>
        </div>
        <div style={sx("padding:16px 20px;display:flex;flex-direction:column;gap:7px;border-right:1px solid #ece8df")}>
          <span style={sx("font:500 11px/1 'IBM Plex Mono',monospace;color:#8a5a14;text-transform:uppercase;letter-spacing:0.05em")}>If too little</span>
          <span style={sx("font:400 14px/1.5 'IBM Plex Sans',sans-serif;color:#222420;text-wrap:pretty")}>{N.guide.tooLow}</span>
        </div>
        <div style={sx("padding:16px 20px;display:flex;flex-direction:column;gap:7px")}>
          <span style={sx("font:500 11px/1 'IBM Plex Mono',monospace;color:#8a5a14;text-transform:uppercase;letter-spacing:0.05em")}>If too much</span>
          <span style={sx("font:400 14px/1.5 'IBM Plex Sans',sans-serif;color:#222420;text-wrap:pretty")}>{N.guide.tooHigh}</span>
        </div>
      </div>

      <div style={sx("display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px")}>
        {stats.map((s) => (
          <div key={s.label} style={sx("background:#fff;border:1px solid #e2dfd6;border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:7px;min-width:0")}>
            <span style={sx("font:500 11px/1.3 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;letter-spacing:0.05em")}>{s.label}</span>
            <span style={sx("font:600 19px/1.2 'IBM Plex Sans',sans-serif;letter-spacing:-0.01em")}>{s.val}</span>
            <span style={sx("font:400 12px/1.3 'IBM Plex Sans',sans-serif;color:#64665c")}>{s.sub}</span>
          </div>
        ))}
      </div>

      <div style={sx(CARD)}>
        <div style={sx(`${CARD_HEAD};display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap`)}>
          <div style={sx("display:flex;flex-direction:column;gap:5px;max-width:560px")}>
            <span style={sx(CARD_TITLE)}>{chartTitle}</span>
            <span style={sx(CARD_SUB)}>{chartSub}</span>
          </div>
          <div style={sx("display:flex;gap:10px;flex-wrap:wrap;align-items:center")}>
            <div style={sx("display:flex;background:#f3f0e8;border-radius:8px;padding:3px;gap:2px")}>
              {(
                [
                  ["conc", "Content"],
                  ["cost", "Cost per unit"],
                  ["need", "Inclusion to meet"],
                ] as [Metric, string][]
              )
                .filter(([k]) => k !== "need" || reqProgs.length > 0)
                .map(([k, label]) => (
                  <button key={k} type="button" aria-pressed={metric === k} onClick={() => setMetric(k)} style={sx(`border:0;${seg(metric === k)};font:500 13px/1 'IBM Plex Sans',sans-serif;padding:8px 11px;border-radius:6px`)}>{label}</button>
                ))}
            </div>
            {metric !== "need" && (
              <div style={sx("display:flex;background:#f3f0e8;border-radius:8px;padding:3px;gap:2px")}>
                {(
                  [
                    ["log", "Log"],
                    ["lin", "Linear"],
                  ] as const
                ).map(([k, label]) => (
                  <button key={k} type="button" aria-pressed={scale === k} onClick={() => setScale(k)} style={sx(`border:0;${seg(scale === k)};font:500 12px/1 'IBM Plex Mono',monospace;padding:8px 10px;border-radius:6px`)}>{label}</button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={sx("padding:14px 20px 6px;display:flex;gap:14px;flex-wrap:wrap;font:400 12px/1 'IBM Plex Sans',sans-serif;color:#64665c")}>
          {legend.map((c) => (
            <span key={c} style={sx("display:flex;align-items:center;gap:6px")}>
              <span style={{ ...sx("width:10px;height:10px;border-radius:2px"), background: categoryColor(c) }} />
              {c}
            </span>
          ))}
          {metric === "need" && (
            <>
              <span style={sx("display:flex;align-items:center;gap:6px")}><span style={sx("width:2px;height:12px;background:#222420")} />Inclusion limit</span>
              <span style={sx("display:flex;align-items:center;gap:6px")}><span style={sx("width:14px;height:10px;border-radius:2px;background:repeating-linear-gradient(135deg,#c9c5b8 0 3px,#ece8df 3px 6px)")} />Can’t meet alone</span>
            </>
          )}
        </div>
        <div style={sx("padding:6px 20px 14px;display:flex;flex-direction:column")}>
          {shownBars.map((b) => (
            <div key={b.r.g.id} onMouseEnter={enter(b.r.g.id)} onMouseLeave={unhover} style={sx(`display:grid;grid-template-columns:minmax(96px,170px) minmax(0,1fr) 112px;gap:14px;align-items:center;padding:5px 8px;margin:0 -8px;border-radius:5px;background:${hover === b.r.g.id ? "#f3efe4" : "transparent"}`)}>
              <span title={b.r.g.name} style={sx("font:400 13px/1.2 'IBM Plex Sans',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{b.r.g.name}</span>
              <div style={sx("height:16px;background:#f5f3ed;border-radius:3px;position:relative")}>
                <div style={{ ...sx("position:absolute;left:0;top:0;bottom:0;border-radius:3px;transition:width .4s cubic-bezier(.2,.7,.2,1)"), width: b.w, background: b.bg }} />
                {b.lim != null && <div title={"Inclusion limit " + b.lim + "%"} style={{ ...sx("position:absolute;top:-3px;bottom:-3px;width:2px;background:#222420"), left: Math.min(100, b.lim) + "%" }} />}
              </div>
              <span style={sx(`font:500 12px/1.2 'IBM Plex Mono',monospace;text-align:right;color:${b.fg}`)}>{b.label}</span>
            </div>
          ))}
          {bars.length === 0 && <div style={sx("padding:20px 0;font:400 14px/1.45 'IBM Plex Sans',sans-serif;color:#64665c")}>{barsEmptyText}</div>}
          {bars.length > BAR_PREVIEW && (
            <div style={sx("padding-top:10px")}>
              <button type="button" onClick={() => setBarsAll(!barsAll)} style={sx(MORE_BTN)}>{barsAll ? "Show the top " + BAR_PREVIEW : "Show all " + bars.length + " ingredients"}</button>
            </div>
          )}
        </div>
        {foot.length > 0 && (
          <div style={sx("padding:11px 20px 14px;border-top:1px solid #ece8df;display:flex;flex-direction:column;gap:5px;font:400 12px/1.45 'IBM Plex Sans',sans-serif;color:#64665c")}>
            {foot.map((f) => (
              <span key={f.k}>
                <span style={sx("color:#45473f;font-weight:500")}>{f.k}</span> {f.v}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={sx("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr));gap:20px;align-items:start")}>
        <div style={sx(CARD)}>
          <div style={sx(`${CARD_HEAD};display:flex;flex-direction:column;gap:5px`)}>
            <span style={sx(CARD_TITLE)}>Requirement by stage</span>
            <span style={sx(CARD_SUB)}>{stageVals.length ? (isTarget ? "Target" : "Minimum") + " for each stage of " + prog.name + (pctUnit ? ", % of feed" : ", kcal/kg") + ". Select a stage to compare against it." : "Requirements set by FeedSport feeding programmes."}</span>
          </div>
          <div style={sx("padding:10px 20px 18px;display:flex;flex-direction:column;gap:14px")}>
            {stageVals.length > 0 && (
              <div style={sx("display:flex;flex-direction:column;gap:2px")}>
                <span style={sx("font:500 11px/1 'IBM Plex Mono',monospace;color:#8d8a80;text-transform:uppercase;letter-spacing:0.05em;padding:6px 0")}>{prog.species === "broiler" ? "Broilers" : "Pigs"} · {prog.source}</span>
                {stageVals.map(({ ph, v }) => {
                  const parts = phaseParts(ph);
                  const lys = lysIdx >= 0 ? ph.requirements[lysIdx] : null;
                  const left = pct((v / scaleMax) * 100);
                  return (
                    <button key={ph.id} type="button" onClick={() => setPicked({ progId: prog.id, phaseId: ph.id })} className={hv("stage")} style={sx(`border:0;text-align:left;width:calc(100% + 16px);margin:0 -8px;padding:7px 8px;border-radius:5px;background:${ph.id === phase.id ? "#f3efe4" : "transparent"};display:grid;grid-template-columns:minmax(100px,150px) minmax(0,1fr) 92px;gap:12px;align-items:center;color:#222420`)}>
                      <span style={sx("display:flex;flex-direction:column;gap:3px;min-width:0")}>
                        <span style={sx("font:500 13px/1.2 'IBM Plex Sans',sans-serif")}>{parts.name}</span>
                        <span style={sx("font:400 11px/1.2 'IBM Plex Mono',monospace;color:#8d8a80")}>{parts.sub}</span>
                      </span>
                      <span style={sx("height:12px;position:relative;display:block")}>
                        <span style={{ ...sx("position:absolute;left:0;top:5px;height:2px;background:#cfdccc;display:block"), width: left }} />
                        <span style={{ ...sx("position:absolute;top:0;width:12px;height:12px;margin-left:-6px;border-radius:50%;background:#2f5a3f;border:2px solid #fff;box-shadow:0 0 0 1px #2f5a3f;display:block;transition:left .4s ease"), left }} />
                      </span>
                      <span style={sx("display:flex;flex-direction:column;gap:3px;align-items:flex-end")}>
                        <span style={sx("font:500 12px/1 'IBM Plex Mono',monospace")}>{fmtContent(N, v)}</span>
                        <span style={sx("font:400 11px/1 'IBM Plex Sans',sans-serif;color:#8d8a80")}>{(N.id === "sid-methionine-cysteine" || N.id === "sid-threonine") && lys ? Math.round((v / lys) * 100) + "% of lysine" : reqWord}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {stageVals.length === 0 && <div style={sx("padding:14px 0;font:400 14px/1.45 'IBM Plex Sans',sans-serif;color:#64665c;text-wrap:pretty")}>{reqEmptyText}</div>}
          </div>
        </div>

        <div style={sx(CARD)}>
          <div style={sx(`${CARD_HEAD};display:flex;flex-direction:column;gap:5px`)}>
            <span style={sx(CARD_TITLE)}>Value map</span>
            <span style={sx(CARD_SUB)}>Content against price. Ingredients towards the top left give more {N.noun} per dollar. Both axes are logarithmic.</span>
          </div>
          <div style={sx("padding:18px 20px 14px 20px")}>
            {pts.length > 0 ? (
              <>
                <div style={sx("position:relative;height:300px;margin:0 6px 30px 52px;border-left:1px solid #c9c5b8;border-bottom:1px solid #c9c5b8")}>
                  {yTicks.map((t) => (
                    <div key={"y" + t.label}>
                      <div style={{ ...sx("position:absolute;left:0;right:0;height:1px;background:#f0ede5"), bottom: t.b }} />
                      <span style={{ ...sx("position:absolute;left:-52px;width:44px;text-align:right;transform:translateY(50%);font:400 11px/1 'IBM Plex Mono',monospace;color:#8d8a80"), bottom: t.b }}>{t.label}</span>
                    </div>
                  ))}
                  {xTicks.map((t) => (
                    <div key={"x" + t.label}>
                      <div style={{ ...sx("position:absolute;top:0;bottom:0;width:1px;background:#f0ede5"), left: t.l }} />
                      <span style={{ ...sx("position:absolute;bottom:-20px;transform:translateX(-50%);font:400 11px/1 'IBM Plex Mono',monospace;color:#8d8a80"), left: t.l }}>{t.label}</span>
                    </div>
                  ))}
                  <span style={sx("position:absolute;top:8px;left:10px;font:500 11px/1 'IBM Plex Mono',monospace;color:#2f5a3f;text-transform:uppercase;letter-spacing:0.05em")}>↖ Richer, cheaper</span>
                  {pts.map(({ r, l, b, showLabel }) => {
                    const h = hover === r.g.id;
                    const flip = l > 70;
                    return (
                      <div key={r.g.id} onMouseEnter={enter(r.g.id)} onMouseLeave={unhover} title={r.g.name + " · " + fu(r.v!) + " · $" + fmt(r.g.price!.usdPerTonne, 0) + "/t"} style={{ ...sx("position:absolute;width:0;height:0"), left: pct(l), bottom: pct(b), zIndex: h ? 3 : 1 }}>
                        <span style={{ ...sx("position:absolute;left:-6px;top:-6px;width:12px;height:12px;border-radius:50%;border:2px solid #fff;display:block;transition:box-shadow .15s"), background: categoryColor(r.g.category), boxShadow: h ? "0 0 0 3px rgba(34,36,32,.28)" : "0 0 0 1px rgba(34,36,32,.12)" }} />
                        {(showLabel || h) && <span style={{ ...sx("position:absolute;top:-7px;white-space:nowrap;font:500 11px/1 'IBM Plex Sans',sans-serif;color:#222420;background:rgba(255,255,255,.85);padding:1px 3px;border-radius:3px"), left: flip ? "auto" : "10px", right: flip ? "10px" : "auto" }}>{r.g.name}</span>}
                      </div>
                    );
                  })}
                </div>
                <div style={sx("display:flex;justify-content:space-between;gap:10px;font:400 12px/1.3 'IBM Plex Sans',sans-serif;color:#64665c;padding-left:52px")}>
                  <span>↑ {N.noun}, {uShort}</span>
                  <span>Price, $/t →</span>
                </div>
              </>
            ) : (
              <div style={sx("padding:14px 0;font:400 14px/1.45 'IBM Plex Sans',sans-serif;color:#64665c")}>No priced ingredients contain this nutrient.</div>
            )}
          </div>
        </div>
      </div>

      <div style={sx(CARD)}>
        <div style={sx(`${CARD_HEAD};display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap`)}>
          <div style={sx("display:flex;flex-direction:column;gap:5px")}>
            <span style={sx(CARD_TITLE)}>{N.name} by ingredient</span>
            <span style={sx(CARD_SUB)}>As fed, at FeedSport default prices. Select a column heading to sort.</span>
          </div>
          <button type="button" role="checkbox" aria-checked={zeros} onClick={() => setZeros(!zeros)} style={sx("border:0;background:transparent;display:flex;align-items:center;gap:8px;font:400 13px/1 'IBM Plex Sans',sans-serif;color:#45473f;padding:4px 0")}>
            <span style={sx(`width:16px;height:16px;border-radius:4px;border:1px solid ${zeros ? "#2f5a3f" : "#b9b6ab"};background:${zeros ? "#2f5a3f" : "#fff"};color:#fff;font:600 11px/14px 'IBM Plex Sans',sans-serif;text-align:center`)}>{zeros ? "✓" : ""}</span>
            Show ingredients with none ({zeroRows.length})
          </button>
        </div>
        <div style={sx("overflow:auto")}>
          <div style={sx("min-width:830px")}>
            <div style={sx(`${TABLE_COLS};padding:0 20px;background:#faf8f3;border-bottom:1px solid #e2dfd6`)}>
              {cols.map(([k, label, align]) => {
                const on = sortK === k;
                return (
                  <button key={k} type="button" onClick={() => sortOn(k)} style={sx(`border:0;background:transparent;padding:11px 0;text-align:${align};font:500 11px/1.2 'IBM Plex Mono',monospace;color:${on ? "#222420" : "#64665c"};text-transform:uppercase;letter-spacing:0.05em`)}>
                    {label}
                    {on ? (sortD < 0 ? " ↓" : " ↑") : ""}
                  </button>
                );
              })}
            </div>
            {tRows.map((r) => {
              const miss = r.v == null;
              const over = r.need != null && r.need > 100;
              const limOver = r.need != null && r.lim != null && r.need > r.lim && !over;
              const dot = categoryColor(r.g.category);
              return (
                <div key={r.g.id} onMouseEnter={enter(r.g.id)} onMouseLeave={unhover} style={sx(`${TABLE_COLS};padding:11px 20px;border-top:1px solid #ece8df;align-items:center;font:400 13px/1.2 'IBM Plex Sans',sans-serif;background:${hover === r.g.id ? "#f7f3ea" : "#fff"}`)}>
                  <span title={r.g.name} style={sx("font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{r.g.name}</span>
                  <span style={sx("display:flex;align-items:center;gap:7px;color:#45473f;min-width:0")}>
                    <span style={{ ...sx("flex:none;width:8px;height:8px;border-radius:2px"), background: dot }} />
                    <span style={sx("white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{r.g.category}</span>
                  </span>
                  <span title={miss ? "Missing data" : undefined} style={sx(`font:500 13px/1 'IBM Plex Mono',monospace;text-align:right;color:${miss ? "#8d8a80" : "#222420"}`)}>{fmtContent(N, r.v)}</span>
                  <span style={sx("display:flex;align-items:center;gap:8px")}>
                    <span style={sx("flex:1;height:6px;border-radius:3px;background:#ece8df;overflow:hidden;display:block")}>
                      <span style={{ ...sx("display:block;height:100%"), width: r.v != null && r.v > 0 && maxV ? pct((r.v / maxV) * 100) : "0%", background: dot }} />
                    </span>
                    <span style={sx("font:400 11px/1 'IBM Plex Mono',monospace;color:#64665c;width:34px;text-align:right")}>{r.v != null && r.v > 0 && maxV ? Math.round((r.v / maxV) * 100) + "%" : "—"}</span>
                  </span>
                  <span style={sx("font:400 13px/1 'IBM Plex Mono',monospace;text-align:right;color:#45473f")}>{r.g.price ? fmt(r.g.price.usdPerTonne, 0) : "—"}</span>
                  <span style={sx(`font:400 13px/1 'IBM Plex Mono',monospace;text-align:right;color:${r.g.id === cheapest?.g.id ? "#2f5a3f" : r.cost != null ? "#45473f" : "#b9b6ab"}`)}>{r.cost != null ? fmtCost(r.cost) : "—"}</span>
                  <span style={sx(`font:400 13px/1 'IBM Plex Mono',monospace;text-align:right;color:${over ? "#8d8a80" : limOver ? "#8a5a14" : r.need != null ? "#45473f" : "#b9b6ab"}`)}>{req == null || r.need == null ? "—" : over ? ">100%" : fmt(r.need, r.need < 10 ? 2 : 1) + "%"}</span>
                </div>
              );
            })}
            {tAll.length > ROW_PREVIEW && (
              <div style={sx("padding:12px 20px;border-top:1px solid #ece8df")}>
                <button type="button" onClick={() => setRowsAll(!rowsAll)} style={sx(MORE_BTN)}>{rowsAll ? "Show the first " + ROW_PREVIEW : "Show all " + plural(tAll.length, "ingredient")}</button>
              </div>
            )}
          </div>
        </div>
        <div style={sx("padding:11px 20px 14px;border-top:1px solid #ece8df;font:400 12px/1.45 'IBM Plex Sans',sans-serif;color:#64665c;text-wrap:pretty")}>
          {(isMe ? "Energy values for " + speciesWord + ", following the selected stage. " : "") +
            "“To meet " + (isTarget ? "target" : "min") + "” is the inclusion needed to reach the " + phase.label + " " + reqWord + " (" + prog.name + ") from that ingredient alone; amber means it passes the stage’s inclusion limit. Missing values are unknown, not zero."}
        </div>
      </div>
    </div>
  );
}

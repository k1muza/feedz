import { useMemo, useState } from "react";

import type { CatalogueIngredient } from "@/lib/studio-catalogue";
import type { StudioPhase, StudioProgrammeData } from "@/lib/studio-programmes";

import { fmt } from "./engine";
import {
  CATEGORY_ORDER,
  NUTRIENTS,
  categoryColor,
  categoryRank,
  fmtContent,
  fmtCost,
  fmtWithUnit,
  nutrientById,
  nutrientContent,
  nutrientCost,
  phaseInclusionLimit,
  phaseRequirement,
  type NutrientRef,
  type Species,
} from "./nutrient-data";
import { Pager, pagerVals } from "./pager";
import { BACK_LINK, CARD, CARD_HEAD, CARD_SUB, CARD_TITLE, DETAIL_PAGE, EDGE_BTN, MONO_KICKER, PAGE, SEARCH_INPUT, StageSelect, chip, nameList, pct, plural, resolveStage, seg, type StageTarget } from "./reference-ui";
import { hv, sx } from "./sx";

// Markup for /studio/catalogue and /studio/catalogue/[id], transcribed from
// design/FeedSport Ingredients.html. Nutrients, their values and formatting
// come from nutrient-data.ts, stages and limits from the programme data the
// optimiser uses, and the search, category and page from the studio (URL).

export interface IngredientDataProps {
  catalogue: CatalogueIngredient[];
  programmes: StudioProgrammeData;
  /** Ingredient id on /studio/catalogue/[id]; null on the list. */
  sel: string | null;
  /** Catalogue rows the search and category leave, in catalogue order. */
  matches: CatalogueIngredient[];
  q: string;
  setQ: (q: string) => void;
  category: string | null;
  setCategory: (category: string | null) => void;
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  /** Your lists the ingredient can be added to. */
  addTargets: (g: CatalogueIngredient) => { label: string; inSet: boolean; add: () => void }[];
  open: (id: string) => void;
  goList: () => void;
  openNutrient: (id: string) => void;
}

const ME = nutrientById("metabolizable-energy")!;
const CP = nutrientById("crude-protein")!;
const LYS = nutrientById("sid-lysine")!;
/** The nutrients drawn as a mini bar chart on each list row. */
const FOOTPRINT = ["metabolizable-energy", "crude-protein", "sid-lysine", "sid-methionine-cysteine", "sid-threonine", "calcium", "available-phosphorus", "sodium", "crude-fibre"].map((id) => nutrientById(id)!);
const footLabel = (n: NutrientRef) => n.shortName.replace(/^SID /, "");

const pigValue = (g: CatalogueIngredient, n: NutrientRef) => nutrientContent(g, n, "swine");
/** Nutrients with no value for this ingredient, pig basis (poultry energy too). */
const missingFor = (g: CatalogueIngredient) => NUTRIENTS.filter((n) => pigValue(g, n) == null || (n === ME && nutrientContent(g, ME, "broiler") == null));
const fmtPrice = (g: CatalogueIngredient) => (g.price ? "$" + fmt(g.price.usdPerTonne, 0) : "No price");
/** Catalogue order: by category, then name. */
const byCatalogueOrder = (a: CatalogueIngredient, b: CatalogueIngredient) => categoryRank(a.category) - categoryRank(b.category) || a.name.localeCompare(b.name);

export function IngredientData(props: IngredientDataProps) {
  if (!props.sel) return <IngredientList {...props} />;
  const g = props.catalogue.find((x) => x.id === props.sel);
  return g ? <IngredientDetail {...props} g={g} /> : <NotFound goList={props.goList} />;
}

function NotFound({ goList }: { goList: () => void }) {
  return (
    <div style={sx(DETAIL_PAGE)}>
      <div style={sx("display:flex")}>
        <button type="button" onClick={goList} className={hv("back")} style={sx(BACK_LINK)}>← Ingredient catalogue</button>
      </div>
      <p style={sx("margin:0;font:400 15px/1.5 'IBM Plex Sans',sans-serif;color:#64665c")}>This ingredient isn’t in the catalogue.</p>
    </div>
  );
}

// ---- list ----

type ListSort = "name" | "cat" | "cp" | "me" | "price";
const LIST_COLS = "display:grid;grid-template-columns:minmax(0,2.2fr) 170px 96px 96px 104px 110px 24px;gap:18px";

function IngredientList({ catalogue, matches, q, setQ, category, setCategory, page, pageSize, setPage, setPageSize, open }: IngredientDataProps) {
  const [sortK, setSortK] = useState<ListSort>("cat");
  const [sortD, setSortD] = useState(1);
  const categories = CATEGORY_ORDER.filter((c) => catalogue.some((g) => g.category === c));
  // Footprint bars are relative to the richest ingredient in the catalogue.
  const maxBy = useMemo(() => new Map(FOOTPRINT.map((n) => [n.id, Math.max(0, ...catalogue.map((g) => pigValue(g, n) ?? 0))])), [catalogue]);

  const sortBy: Record<ListSort, (g: CatalogueIngredient) => string | number | null> = {
    name: (g) => g.name,
    cat: (g) => categoryRank(g.category),
    cp: (g) => pigValue(g, CP),
    me: (g) => pigValue(g, ME),
    price: (g) => g.price?.usdPerTonne ?? null,
  };
  const rows = [...matches].sort((a, b) => {
    const x = sortBy[sortK](a), y = sortBy[sortK](b);
    if (x == null && y == null) return a.name.localeCompare(b.name);
    if (x == null) return 1;
    if (y == null) return -1;
    const d = typeof x === "string" ? x.localeCompare(y as string) : x - (y as number);
    return d * sortD || a.name.localeCompare(b.name);
  });
  const pg = pagerVals(rows.length, page, pageSize, setPage, setPageSize);
  const cols: [ListSort | null, string, "left" | "right"][] = [["name", "Ingredient", "left"], [null, "Profile", "left"], ["cp", "Protein", "right"], ["me", "ME kcal/kg", "right"], ["price", "Price $/t", "right"], [null, "Data", "right"], [null, "", "right"]];
  const sortOn = (k: ListSort) => {
    setSortD(sortK === k ? -sortD : k === "name" || k === "price" ? 1 : -1);
    setSortK(k);
  };

  return (
    <div style={sx(PAGE)}>
      <div style={sx("display:flex;flex-direction:column;gap:6px")}>
        <span style={sx(MONO_KICKER)}>Reference data</span>
        <h1 style={sx("margin:0;font:600 26px/1.2 'IBM Plex Sans',sans-serif;letter-spacing:-0.015em")}>Ingredient catalogue</h1>
        <p style={sx("margin:0;font:400 14px/1.5 'IBM Plex Sans',sans-serif;color:#64665c;max-width:680px;text-wrap:pretty")}>Every ingredient FeedSport can formulate with, its nutrient profile and default price. Values are on an as-fed basis.</p>
      </div>

      <div style={sx("display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap")}>
        <div style={sx("display:flex;gap:6px;flex-wrap:wrap")}>
          {[null, ...categories].map((c) => (
            <button key={c ?? "All"} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} style={sx(chip(category === c))}>
              <span>{c ?? "All"}</span>
              <span style={sx("font:400 12px/1 'IBM Plex Mono',monospace;opacity:.7")}>{c ? catalogue.filter((g) => g.category === c).length : catalogue.length}</span>
            </button>
          ))}
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ingredients" aria-label="Search ingredients" style={sx(SEARCH_INPUT)} />
      </div>

      <div style={sx("background:#fff;border:1px solid #e2dfd6;border-radius:10px;overflow:auto")}>
        <div style={sx("min-width:920px")}>
          <div style={sx(`${LIST_COLS};padding:0 20px;background:#faf8f3;border-bottom:1px solid #e2dfd6;align-items:end`)}>
            {cols.map(([k, label, align]) => {
              const on = k != null && sortK === k;
              return (
                <button key={label || "go"} type="button" disabled={!k} onClick={() => k && sortOn(k)} style={sx(`border:0;background:transparent;padding:11px 0;text-align:${align};font:500 11px/1.2 'IBM Plex Mono',monospace;color:${on ? "#222420" : "#64665c"};text-transform:uppercase;letter-spacing:0.05em;cursor:${k ? "pointer" : "default"};white-space:nowrap`)}>
                  {label}
                  {on ? (sortD < 0 ? " ↓" : " ↑") : ""}
                </button>
              );
            })}
          </div>
          {rows.slice(pg.from, pg.to).map((g) => {
            const miss = g.premix ? [] : missingFor(g);
            const dot = categoryColor(g.category);
            const cp = pigValue(g, CP);
            const me = pigValue(g, ME);
            return (
              <button key={g.id} type="button" onClick={() => open(g.id)} className={hv("rowLite")} style={sx(`width:100%;border:0;border-top:1px solid #ece8df;background:#fff;text-align:left;${LIST_COLS};padding:14px 20px;align-items:center;color:#222420`)}>
                <div style={sx("display:flex;flex-direction:column;gap:5px;min-width:0")}>
                  <div style={sx("display:flex;align-items:center;gap:8px;flex-wrap:wrap")}>
                    <span style={sx("font:600 15px/1.25 'IBM Plex Sans',sans-serif")}>{g.name}</span>
                    <span style={sx("display:flex;align-items:center;gap:5px;font:500 11px/1 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;letter-spacing:0.04em")}>
                      <span style={{ ...sx("width:8px;height:8px;border-radius:2px"), background: dot }} />
                      {g.category}
                    </span>
                  </div>
                  <span style={sx("font:400 13px/1.45 'IBM Plex Sans',sans-serif;color:#45473f;text-wrap:pretty")}>{describe(g)}</span>
                </div>
                <div style={sx("display:flex;flex-direction:column;gap:4px")}>
                  <div style={sx("display:flex;gap:3px;align-items:flex-end;height:28px")}>
                    {FOOTPRINT.map((n) => {
                      const v = pigValue(g, n);
                      const max = maxBy.get(n.id)!;
                      return (
                        <span key={n.id} title={n.name + ": " + (v == null ? "missing" : fmtContent(n, v) + " " + n.unit)} style={sx("flex:1;height:100%;background:#f3f0e8;border-radius:2px;position:relative;display:block;overflow:hidden")}>
                          <span style={{ ...sx("position:absolute;left:0;right:0;bottom:0;display:block"), height: v == null ? "100%" : v > 0 && max ? Math.max(8, Math.sqrt(v / max) * 100).toFixed(1) + "%" : "0%", background: v == null ? "repeating-linear-gradient(135deg,#c9c5b8 0 2px,#ece8df 2px 4px)" : dot }} />
                        </span>
                      );
                    })}
                  </div>
                  <div style={sx("display:flex;gap:3px")}>
                    {FOOTPRINT.map((n) => (
                      <span key={n.id} style={sx("flex:1;text-align:center;font:400 8px/1 'IBM Plex Mono',monospace;color:#8d8a80;overflow:hidden;white-space:nowrap")}>{footLabel(n)}</span>
                    ))}
                  </div>
                </div>
                <span style={sx("font:500 13px/1 'IBM Plex Mono',monospace;text-align:right")}>{cp ? fmtContent(CP, cp) + "%" : "—"}</span>
                <span style={sx("font:500 13px/1 'IBM Plex Mono',monospace;text-align:right")}>{me ? fmtContent(ME, me) : "—"}</span>
                <span style={sx(`font:500 13px/1 'IBM Plex Mono',monospace;text-align:right;color:${g.price ? "#222420" : "#8a5a14"}`)}>{fmtPrice(g)}</span>
                <span style={sx("display:flex;justify-content:flex-end")}>
                  <span title={miss.length ? "No value for " + miss.map((n) => n.name).join(", ") : undefined} style={sx(`font:500 11px/1 'IBM Plex Sans',sans-serif;padding:4px 7px;border-radius:4px;white-space:nowrap;background:${miss.length || g.premix ? "#ece8df" : "#e6efe6"};color:${miss.length || g.premix ? "#45473f" : "#2f5a3f"}`)}>{g.premix ? "Supplier spec" : miss.length ? miss.length + " missing" : "Complete"}</span>
                </span>
                <span aria-hidden style={sx("font:400 18px/1 'IBM Plex Sans',sans-serif;color:#8d8a80;text-align:right")}>›</span>
              </button>
            );
          })}
          {rows.length === 0 && <div style={sx("padding:28px 20px;border-top:1px solid #ece8df;font:400 14px/1.4 'IBM Plex Sans',sans-serif;color:#64665c")}>{q ? "No ingredients match “" + q + "”." : "No ingredients in this category."}</div>}
        </div>
        <Pager pg={pg.pager} />
      </div>

      <EnergyProteinMap catalogue={catalogue} open={open} />
    </div>
  );
}

/** One line under the name: what kind of ingredient it is, from the library. */
function describe(g: CatalogueIngredient) {
  if (g.premix) return g.premix.application + " · " + g.premix.manufacturer;
  const same = (a: string) => a.toLowerCase() === g.name.toLowerCase();
  const aliases = g.aliases.filter((a) => !same(a));
  const parts = [...(same(g.family.name) ? [] : [g.family.name]), ...(aliases.length ? ["also " + aliases.slice(0, 3).join(", ")] : [])];
  return parts.length ? parts.join(" · ") : g.nutritionSource.publisher + " profile";
}

function EnergyProteinMap({ catalogue, open }: { catalogue: CatalogueIngredient[]; open: (id: string) => void }) {
  const [species, setSpecies] = useState<Species>("swine");
  const [hover, setHover] = useState<string | null>(null);
  const X_MAX = 100, Y_MAX = 9000;
  const pts = catalogue
    .map((g) => ({ g, x: nutrientContent(g, CP, species) ?? 0, y: nutrientContent(g, ME, species) ?? 0 }))
    .filter((p) => !p.g.premix && (p.x > 0 || p.y > 0));
  const maxP = Math.max(1, ...pts.map((p) => p.g.price?.usdPerTonne ?? 0));
  // Dearest first so cheap ingredients draw on top; labels skip any that would collide with one already placed.
  const placed: { l: number; b: number }[] = [];
  const marks = pts
    .sort((a, b) => (b.g.price?.usdPerTonne ?? 0) - (a.g.price?.usdPerTonne ?? 0))
    .map((p) => {
      const l = (Math.min(p.x, X_MAX) / X_MAX) * 100, b = (Math.min(p.y, Y_MAX) / Y_MAX) * 100;
      const size = p.g.price ? 10 + Math.sqrt(p.g.price.usdPerTonne / maxP) * 18 : 10;
      const h = hover === p.g.id;
      const clash = placed.some((o) => Math.abs(o.l - l) < 13 && Math.abs(o.b - b) < 7);
      if (!clash && !h) placed.push({ l, b });
      return { ...p, l, b, size, h, showLabel: h || !clash, flip: l > 72 };
    });
  return (
    <div style={sx(CARD)}>
      <div style={sx(`${CARD_HEAD};display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap`)}>
        <div style={sx("display:flex;flex-direction:column;gap:5px;max-width:620px")}>
          <span style={sx(CARD_TITLE)}>Energy and protein map</span>
          <span style={sx(CARD_SUB)}>Each ingredient placed by its protein and energy content. Bigger circles cost more per tonne. Minerals and premixes carry neither, so they’re left off.</span>
        </div>
        <div style={sx("display:flex;background:#f3f0e8;border-radius:8px;padding:3px;gap:2px")}>
          {(
            [
              ["swine", "Pigs"],
              ["broiler", "Poultry"],
            ] as const
          ).map(([k, label]) => (
            <button key={k} type="button" aria-pressed={species === k} onClick={() => setSpecies(k)} style={sx(`border:0;${seg(species === k)};font:500 13px/1 'IBM Plex Sans',sans-serif;padding:8px 11px;border-radius:6px`)}>{label}</button>
          ))}
        </div>
      </div>
      <div style={sx("padding:20px 20px 14px;overflow:hidden")}>
        <div style={sx("position:relative;height:340px;margin:0 8px 30px 52px;border-left:1px solid #c9c5b8;border-bottom:1px solid #c9c5b8")}>
          {[0, 2000, 4000, 6000, 8000].map((t) => (
            <div key={"y" + t}>
              <div style={{ ...sx("position:absolute;left:0;right:0;height:1px;background:#f0ede5"), bottom: (t / Y_MAX) * 100 + "%" }} />
              <span style={{ ...sx("position:absolute;left:-52px;width:44px;text-align:right;transform:translateY(50%);font:400 11px/1 'IBM Plex Mono',monospace;color:#8d8a80"), bottom: (t / Y_MAX) * 100 + "%" }}>{fmt(t, 0)}</span>
            </div>
          ))}
          {[0, 20, 40, 60, 80, 100].map((t) => (
            <div key={"x" + t}>
              <div style={{ ...sx("position:absolute;top:0;bottom:0;width:1px;background:#f0ede5"), left: t + "%" }} />
              <span style={{ ...sx("position:absolute;bottom:-20px;transform:translateX(-50%);font:400 11px/1 'IBM Plex Mono',monospace;color:#8d8a80"), left: t + "%" }}>{t}%</span>
            </div>
          ))}
          <span style={sx("position:absolute;top:8px;left:10px;font:500 11px/1 'IBM Plex Mono',monospace;color:#8a5a14;text-transform:uppercase;letter-spacing:0.05em")}>Energy-dense</span>
          <span style={sx("position:absolute;bottom:8px;right:10px;font:500 11px/1 'IBM Plex Mono',monospace;color:#2f5a3f;text-transform:uppercase;letter-spacing:0.05em")}>Protein-dense</span>
          {marks.map((p) => (
            <div
              key={p.g.id}
              onClick={() => open(p.g.id)}
              onMouseEnter={() => setHover(p.g.id)}
              onMouseLeave={() => setHover(null)}
              title={p.g.name + " · CP " + fmt(p.x, 1) + "% · ME " + fmt(p.y, 0) + (p.g.price ? " · $" + fmt(p.g.price.usdPerTonne, 0) + "/t" : " · no price")}
              style={{ ...sx("position:absolute;width:0;height:0;cursor:pointer"), left: pct(p.l), bottom: pct(p.b), zIndex: p.h ? 5 : 1 }}
            >
              <span style={{ ...sx("position:absolute;border-radius:50%;opacity:.88;border:2px solid #fff;display:block"), left: -p.size / 2, top: -p.size / 2, width: p.size, height: p.size, background: categoryColor(p.g.category), boxShadow: p.h ? "0 0 0 3px rgba(34,36,32,.3)" : p.g.price ? "0 0 0 1px rgba(34,36,32,.15)" : "0 0 0 1px #8a5a14" }} />
              {p.showLabel && <span style={{ ...sx("position:absolute;top:-7px;white-space:nowrap;font:500 11px/1 'IBM Plex Sans',sans-serif;color:#222420;background:rgba(255,255,255,.85);padding:1px 3px;border-radius:3px"), left: p.flip ? "auto" : p.size / 2 + 4, right: p.flip ? p.size / 2 + 4 : "auto" }}>{p.g.name}</span>}
            </div>
          ))}
        </div>
        <div style={sx("display:flex;justify-content:space-between;gap:10px;font:400 12px/1.3 'IBM Plex Sans',sans-serif;color:#64665c;padding-left:52px;flex-wrap:wrap")}>
          <span>↑ ME, kcal/kg ({species === "broiler" ? "poultry" : "pigs"})</span>
          <span>Crude protein, % →</span>
        </div>
      </div>
    </div>
  );
}

// ---- detail ----

/** Starting inclusion for "What it contributes", by category, before a programme limit caps it. */
const DEFAULT_INCLUSION: Record<string, number> = { Cereal: 55, "Oil and fat": 3, "Protein meal": 20, "By-product": 10, Other: 10, "Amino acid": 0.3, Mineral: 1, Premix: 2.5 };
/** Slider range when the stage sets no limit. */
const INCLUSION_RANGE: Record<string, number> = { "Oil and fat": 10, "Amino acid": 1, Mineral: 5, Premix: 5 };

/** "swine:grower" → "Pigs · grower". */
const limitsKeyLabel = (key: string) => {
  const [species, column] = key.split(":");
  return (species === "broiler" ? "Broilers" : "Pigs") + " · " + column;
};

function IngredientDetail({ g, catalogue, programmes, addTargets, open, goList, openNutrient }: IngredientDataProps & { g: CatalogueIngredient }) {
  const [picked, setPicked] = useState<StageTarget | null>(null);
  const [inclPick, setIncl] = useState<number | null>(null);
  const { programme: prog, phase } = resolveStage(programmes, picked);
  const sp: Species = prog.species;
  const dot = categoryColor(g.category);
  const others = useMemo(() => catalogue.filter((x) => !x.premix), [catalogue]);
  const pick = (t: StageTarget) => {
    setPicked(t);
    setIncl(null);
  };

  // Missing data the optimiser would trip over in this stage.
  const meta = programmes.constraintMeta[sp];
  const setAsideFor = (ph: StudioPhase, species: Species) => (!g.requirementValues[species] ? ph.constraintIds : ph.constraintIds.filter((id) => g.requirementMissing[species]?.includes(id)));
  const setAside = g.premix ? [] : setAsideFor(phase, sp);
  const setAsideText = !g.requirementValues[sp]
    ? g.name + " isn’t in the " + (sp === "broiler" ? "poultry" : "pig") + " nutrient library, so FeedSport can’t use it in " + prog.name + "."
    : "FeedSport sets " + g.name + " aside in " + phase.label + " (" + prog.name + ") because it has no " + setAside.map((id) => (meta[id]?.label ?? id).toLowerCase()).join(" or ") + " value.";

  const lim = phaseInclusionLimit(programmes, phase, g.id);
  const limitKeys = Object.keys(programmes.limits);
  const allLims = limitKeys.map((k) => programmes.limits[k].find((l) => l.id === g.id)?.maxPct).filter((v): v is number => v != null);
  const lo = Math.min(...allLims), hi = Math.max(...allLims);
  const fmtLim = (v: number) => fmt(v, v < 1 ? 1 : 0) + "%";
  const missing = missingFor(g);
  const cp = nutrientContent(g, CP, sp), lys = nutrientContent(g, LYS, sp), me = nutrientContent(g, ME, sp);
  const meOther = nutrientContent(g, ME, sp === "broiler" ? "swine" : "broiler");
  const priceStat = { label: "Default price", val: g.price ? "$" + fmt(g.price.usdPerTonne, 0) + "/t" : "No price", sub: g.price ? g.price.market + " · " + g.price.asOf : "add a price to formulate with it", fg: g.price ? "#222420" : "#8a5a14" };
  // A commercial premix supplies nutrients only at its dose, so it gets its own figures, not per-kg ones.
  const stats = g.premix ? [
    priceStat,
    { label: "Dose", val: fmt(g.premix.inclusionKgPerTonne, 1) + " kg/t", sub: fmt(g.premix.inclusionPct, 2) + "% of feed", fg: "#222420" },
    { label: "Documented nutrients", val: String(g.premix.contributions.length), sub: "at the manufacturer dose", fg: "#222420" },
    { label: "Cost at dose", val: g.price ? "$" + fmt((g.premix.inclusionPct / 100) * g.price.usdPerTonne, 2) + "/t" : "—", sub: g.price ? "added to each tonne of feed" : "no price", fg: "#222420" },
  ] : [
    priceStat,
    { label: "Crude protein", val: cp ? fmtWithUnit(CP, cp) : cp == null ? "No data" : "None", sub: lys ? fmtWithUnit(LYS, lys) + " SID lysine" : "as fed", fg: "#222420" },
    { label: "Energy", val: me ? fmtWithUnit(ME, me) : me == null ? "No data" : "None", sub: me ? (sp === "broiler" ? "poultry" : "pigs") + (meOther ? " · " + fmt(meOther, 0) + " for " + (sp === "broiler" ? "pigs" : "poultry") : "") : "contributes no energy", fg: "#222420" },
    { label: "Max in " + phase.label, val: lim != null ? fmtLim(lim) : "No limit", sub: allLims.length ? (lo === hi ? fmtLim(lo) : fmtLim(lo) + "–" + fmtLim(hi)) + " across stages" : "in any stage", fg: "#222420" },
    { label: "Nutrient data", val: NUTRIENTS.length - missing.length + " of " + NUTRIENTS.length, sub: missing.length ? "missing " + nameList(missing.map((n) => n.shortName), 4) : "complete", fg: missing.length ? "#45473f" : "#2f5a3f" },
  ];

  // ---- what it contributes at an inclusion ----
  const inclMax = lim ?? INCLUSION_RANGE[g.category] ?? 100;
  const defIncl = g.premix ? g.premix.inclusionPct : DEFAULT_INCLUSION[g.category] ?? 10;
  const incl = Math.min(inclPick ?? defIncl, inclMax);
  const inclStep = inclMax <= 1 ? 0.01 : inclMax <= 10 ? 0.1 : 0.5;
  const contrib = NUTRIENTS.flatMap((n) => {
    const req = phaseRequirement(programmes, phase, n);
    if (req == null) return [];
    const v = nutrientContent(g, n, sp);
    if (v == null) return [{ n, w: "0%", label: "Missing", fg: "#8d8a80", bg: "#c9c5b8" }];
    const share = ((incl / 100) * v / req) * 100;
    return [{ n, w: pct(Math.min(100, share)), label: share >= 999 ? ">999%" : fmt(share, share < 10 ? 1 : 0) + "%", fg: share >= 100 ? "#2f5a3f" : "#45473f", bg: dot }];
  });
  const addedCost = g.price ? (incl / 100) * g.price.usdPerTonne : null;

  // ---- limits by stage column ----
  const limVals = limitKeys.flatMap((k) => {
    const l = programmes.limits[k].find((x) => x.id === g.id);
    return l ? [l.maxPct, l.practicalPct ?? 0] : [];
  });
  const lScale = limVals.length ? Math.max(...limVals) * 1.15 : 100;
  const limRows = limitKeys.map((key) => {
    const l = programmes.limits[key].find((x) => x.id === g.id);
    const species: Species = key.startsWith("broiler") ? "broiler" : "swine";
    const phases = programmes.programmes.flatMap((p) => p.phases.filter((ph) => ph.limitsKey === key).map((ph) => ({ p, ph })));
    const aside = !g.premix && phases.some(({ ph }) => setAsideFor(ph, species).length > 0);
    // Selecting a row compares against the first such stage, in the current programme if it has one.
    const target = phases.find((x) => x.p.id === prog.id) ?? phases[0];
    return { key, l, aside, target, on: phase.limitsKey === key };
  });

  // ---- closest substitutes ----
  const subs = useMemo(() => {
    const maxBy = new Map(NUTRIENTS.map((n) => [n.id, Math.max(0, ...others.map((x) => pigValue(x, n) ?? 0))]));
    const vec = (x: CatalogueIngredient) => NUTRIENTS.map((n) => {
      const v = pigValue(x, n), max = maxBy.get(n.id)!;
      return v == null || !max ? null : Math.sqrt(v / max);
    });
    const mine = vec(g);
    return others
      .filter((x) => x.id !== g.id)
      .map((x) => {
        const o = vec(x);
        let s = 0, k = 0;
        const diffs: { n: NutrientRef; d: number }[] = [];
        o.forEach((v, i) => {
          if (v != null && mine[i] != null) {
            s += (v - mine[i]!) ** 2;
            k++;
            diffs.push({ n: NUTRIENTS[i], d: v - mine[i]! });
          }
        });
        return { x, d: k ? Math.sqrt(s / k) : 1, diffs };
      })
      .sort((a, b) => a.d - b.d)
      .slice(0, 3);
  }, [g, others]);

  const order = useMemo(() => [...catalogue].sort(byCatalogueOrder), [catalogue]);
  const idx = order.findIndex((x) => x.id === g.id);
  const prev = order[(idx - 1 + order.length) % order.length];
  const next = order[(idx + 1) % order.length];
  const targets = addTargets(g);
  const extraSources = [...new Map(Object.values(g.nutrientSources).filter((s): s is NonNullable<typeof s> => !!s && s.url !== g.nutritionSource.url).map((s) => [s.url, s])).values()];
  const src = g.nutritionSource;

  return (
    <div style={sx(DETAIL_PAGE)}>
      <div style={sx("display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap")}>
        <button type="button" onClick={goList} className={hv("back")} style={sx(BACK_LINK)}>← Ingredient catalogue</button>
        <div style={sx("display:flex;gap:6px;min-width:0")}>
          <button type="button" onClick={() => open(prev.id)} className={hv("edge")} style={{ ...sx(EDGE_BTN), maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis" }}>‹ {prev.name}</button>
          <button type="button" onClick={() => open(next.id)} className={hv("edge")} style={{ ...sx(EDGE_BTN), maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis" }}>{next.name} ›</button>
        </div>
      </div>

      <div style={sx("display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap")}>
        <div style={sx("display:flex;flex-direction:column;gap:8px;min-width:0")}>
          <span style={sx(`${MONO_KICKER};display:flex;align-items:center;gap:6px`)}>
            <span style={{ ...sx("width:9px;height:9px;border-radius:2px"), background: dot }} />
            {g.category}
          </span>
          <h1 style={sx("margin:0;font:600 30px/1.15 'IBM Plex Sans',sans-serif;letter-spacing:-0.02em")}>{g.name}</h1>
          <p style={sx("margin:0;font:400 14px/1.5 'IBM Plex Sans',sans-serif;color:#64665c;max-width:640px;text-wrap:pretty")}>{describe(g)}</p>
          {targets.length > 0 && (
            <div style={sx("display:flex;gap:8px;flex-wrap:wrap;padding-top:4px")}>
              {targets.map((t) => (
                <button key={t.label} type="button" onClick={t.add} disabled={t.inSet} style={sx(`font:600 13px/1 'IBM Plex Sans',sans-serif;padding:9px 12px;border-radius:7px;background:#fff;border:1px solid ${t.inSet ? "#e2dfd6" : "#2f5a3f"};color:${t.inSet ? "#64665c" : "#2f5a3f"};cursor:${t.inSet ? "default" : "pointer"}`)}>{t.label}</button>
              ))}
            </div>
          )}
        </div>
        {!g.premix && <StageSelect programmes={programmes} programme={prog} phase={phase} onPick={pick} />}
      </div>

      {setAside.length > 0 && (
        <div style={sx("display:flex;gap:10px;align-items:flex-start;padding:12px 16px;background:#f3f0e8;border:1px solid #e2dfd6;border-radius:8px;font:400 14px/1.45 'IBM Plex Sans',sans-serif;color:#45473f")}>
          <span style={sx("font:600 11px/1 'IBM Plex Mono',monospace;color:#64665c;background:#e2dfd6;padding:4px 6px;border-radius:4px;flex:none")}>DATA GAP</span>
          <span>{setAsideText}</span>
        </div>
      )}

      <div style={sx("background:#fff;border:1px solid #e2dfd6;border-radius:10px;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))")}>
        <div style={sx("padding:16px 20px;display:flex;flex-direction:column;gap:7px;border-right:1px solid #ece8df")}>
          <span style={sx("font:500 11px/1 'IBM Plex Mono',monospace;color:#2f5a3f;text-transform:uppercase;letter-spacing:0.05em")}>Nutrient source</span>
          <span style={sx("font:600 14px/1.4 'IBM Plex Sans',sans-serif")}>{src.publisher}{src.year ? " · " + src.year : ""}</span>
          <span style={sx("font:400 13px/1.45 'IBM Plex Sans',sans-serif;color:#45473f")}>{src.title}</span>
          <span style={sx("font:400 12px/1.4 'IBM Plex Sans',sans-serif;color:#8a5a14")}>
            {src.verificationStatus.replaceAll("_", " ")} · {src.basis}
            {src.sourceTable ? " · " + src.sourceTable : ""}
            {src.sourcePage != null ? " · p. " + src.sourcePage : ""}
          </span>
          {src.url && <a href={src.url} target="_blank" rel="noopener noreferrer" style={sx("font:600 12px/1.3 'IBM Plex Sans',sans-serif;text-decoration:underline")}>View original source ↗</a>}
        </div>
        <div style={sx("padding:16px 20px;display:flex;flex-direction:column;gap:7px")}>
          <span style={sx("font:500 11px/1 'IBM Plex Mono',monospace;color:#8a5a14;text-transform:uppercase;letter-spacing:0.05em")}>Notes</span>
          {src.notes.length === 0 && extraSources.length === 0 && <span style={sx("font:400 14px/1.5 'IBM Plex Sans',sans-serif;color:#64665c")}>No notes on this profile.</span>}
          {src.notes.map((note, i) => (
            <span key={i} style={sx("font:400 13px/1.5 'IBM Plex Sans',sans-serif;text-wrap:pretty")}>{note}</span>
          ))}
          {extraSources.map((s) => (
            <span key={s.url} style={sx("font:400 13px/1.5 'IBM Plex Sans',sans-serif")}>
              Some values from {s.publisher}, {s.title}.{" "}
              <a href={s.url} target="_blank" rel="noopener noreferrer" style={sx("font-weight:600;text-decoration:underline")}>Source ↗</a>
            </span>
          ))}
        </div>
      </div>

      {g.premix && (
        <div style={sx("background:#fdf9ef;border:1px solid #ecd8ad;border-radius:10px;padding:16px 20px;display:flex;flex-direction:column;gap:8px")}>
          <span style={sx("font:500 11px/1 'IBM Plex Mono',monospace;color:#8a5a14;text-transform:uppercase;letter-spacing:0.05em")}>Premix use and complete-feed contribution</span>
          <span style={sx("font:400 13px/1.45 'IBM Plex Sans',sans-serif;color:#45473f")}>{g.premix.application} · {g.premix.permittedSpecies} · {g.premix.permittedProgrammePrefixes.join(", ")}</span>
          <span style={sx("font:500 13px/1.45 'IBM Plex Sans',sans-serif")}>{g.premix.inclusionInstructions}</span>
          <div style={sx("display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:0 24px")}>
            {g.premix.contributions.map((c) => (
              <div key={c.nutrient} style={sx("display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-top:1px solid #ecd8ad;font:400 13px/1.3 'IBM Plex Sans',sans-serif")}>
                <span>{c.nutrient}</span>
                <span style={sx("font-weight:600")}>{(c.basis === "minimum_guarantee" ? "≥ " : "") + fmt(c.finishedFeedContribution, c.finishedFeedContribution < 1 ? 3 : 1) + " " + c.unit}</span>
              </div>
            ))}
          </div>
          <span style={sx("font:400 12px/1.4 'IBM Plex Sans',sans-serif;color:#8a5a14")}>{g.premix.contributions.some((c) => c.basis === "verified_analysis") ? "Verified as-fed profile" : "Manufacturer label minima · not independently verified"}</span>
        </div>
      )}

      <div style={sx("display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px")}>
        {stats.map((s) => (
          <div key={s.label} style={sx("background:#fff;border:1px solid #e2dfd6;border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:7px;min-width:0")}>
            <span style={sx("font:500 11px/1.3 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;letter-spacing:0.05em")}>{s.label}</span>
            <span style={sx(`font:600 19px/1.2 'IBM Plex Sans',sans-serif;letter-spacing:-0.01em;color:${s.fg}`)}>{s.val}</span>
            <span style={sx("font:400 12px/1.3 'IBM Plex Sans',sans-serif;color:#64665c")}>{s.sub}</span>
          </div>
        ))}
      </div>

      {!g.premix && <NutrientProfile g={g} others={others} sp={sp} openNutrient={openNutrient} />}

      {!g.premix && (
      <div style={sx("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr));gap:20px;align-items:start")}>
        <div style={sx(CARD)}>
          <div style={sx(`${CARD_HEAD};display:flex;flex-direction:column;gap:5px`)}>
            <span style={sx(CARD_TITLE)}>What it contributes</span>
            <span style={sx(CARD_SUB)}>Share of each {phase.label} requirement ({prog.name}) this ingredient covers at the chosen inclusion. The bar ends at 100% of the requirement.</span>
          </div>
          <div style={sx("padding:16px 20px 6px;display:flex;flex-direction:column;gap:10px")}>
            <div style={sx("display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap")}>
              <span style={sx("font:500 12px/1 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;letter-spacing:0.05em")}>Inclusion</span>
              <span style={sx("font:600 22px/1 'IBM Plex Sans',sans-serif;letter-spacing:-0.01em")}>{fmt(incl, inclMax <= 1 ? 2 : 1)}% of feed</span>
            </div>
            <input type="range" min={0} max={inclMax} step={inclStep} value={incl} onChange={(e) => setIncl(+e.target.value)} aria-label="Inclusion, % of feed" style={sx("width:100%;accent-color:#2f5a3f")} />
            <div style={sx("display:flex;justify-content:space-between;font:400 11px/1 'IBM Plex Mono',monospace;color:#8d8a80")}>
              <span>0%</span>
              <span>{fmt(inclMax, inclMax < 1 ? 2 : 0)}%{lim != null ? " · stage limit" : ""}</span>
            </div>
          </div>
          <div style={sx("padding:8px 20px 14px;display:flex;flex-direction:column")}>
            {contrib.map((b) => (
              <div key={b.n.id} style={sx("display:grid;grid-template-columns:minmax(90px,150px) minmax(0,1fr) 84px;gap:12px;align-items:center;padding:5px 0")}>
                <span title={b.n.name} style={sx("font:400 13px/1.2 'IBM Plex Sans',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{b.n.shortName}</span>
                <span style={sx("height:14px;background:#f5f3ed;border-radius:3px;position:relative;display:block")}>
                  <span style={{ ...sx("position:absolute;left:0;top:0;bottom:0;border-radius:3px;display:block;transition:width .25s ease"), width: b.w, background: b.bg }} />
                </span>
                <span style={sx(`font:500 12px/1.2 'IBM Plex Mono',monospace;text-align:right;color:${b.fg}`)}>{b.label}</span>
              </div>
            ))}
            {contrib.length === 0 && <div style={sx("padding:10px 0;font:400 14px/1.45 'IBM Plex Sans',sans-serif;color:#64665c")}>This stage sets no requirements this ingredient supplies.</div>}
          </div>
          <div style={sx("padding:12px 20px 14px;border-top:1px solid #ece8df;font:400 13px/1.4 'IBM Plex Sans',sans-serif;color:#45473f")}>
            {addedCost != null ? "Adds $" + fmt(addedCost, addedCost < 10 ? 2 : 0) + " to each tonne of feed" : "No price, so cost isn’t shown"}
          </div>
        </div>

        <div style={sx(CARD)}>
          <div style={sx(`${CARD_HEAD};display:flex;flex-direction:column;gap:5px`)}>
            <span style={sx(CARD_TITLE)}>Inclusion limits by stage</span>
            <span style={sx(CARD_SUB)}>{allLims.length ? "Hard maximums the optimiser applies in each stage column, scaled to the highest (" + fmtLim(hi) + "). Select a row to compare against that stage." : "FeedSport sets no maximum for " + g.name + ". The optimiser can use as much as the recipe allows."}</span>
          </div>
          <div style={sx("padding:10px 20px 16px;display:flex;flex-direction:column;gap:2px")}>
            {limRows.map((r) => (
              <button key={r.key} type="button" disabled={!r.target} onClick={() => r.target && pick({ progId: r.target.p.id, phaseId: r.target.ph.id })} className={hv("stage")} style={sx(`border:0;text-align:left;width:calc(100% + 16px);margin:0 -8px;padding:7px 8px;border-radius:5px;background:${r.on ? "#f3efe4" : "transparent"};display:grid;grid-template-columns:minmax(110px,170px) minmax(0,1fr) 78px;gap:12px;align-items:center;color:#222420`)}>
                <span style={sx("font:400 13px/1.2 'IBM Plex Sans',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{limitsKeyLabel(r.key)}</span>
                <span style={sx("height:12px;background:#f5f3ed;border-radius:3px;position:relative;display:block")}>
                  <span style={{ ...sx("position:absolute;left:0;top:0;bottom:0;border-radius:3px;display:block;transition:width .35s ease"), width: r.aside || !r.l ? "100%" : pct((r.l.maxPct / lScale) * 100), background: r.aside ? "repeating-linear-gradient(135deg,#c9c5b8 0 3px,#ece8df 3px 6px)" : r.l ? dot : "#e6efe6" }} />
                  {!r.aside && r.l?.practicalPct != null && <span title={"Advisory: up to " + r.l.practicalPct + "%"} style={{ ...sx("position:absolute;top:-3px;bottom:-3px;width:2px;background:#e3aa45;display:block"), left: pct((r.l.practicalPct / lScale) * 100) }} />}
                </span>
                <span style={sx(`font:500 12px/1 'IBM Plex Mono',monospace;text-align:right;color:${r.aside ? "#8d8a80" : "#222420"}`)}>{r.aside ? "Set aside" : r.l ? fmtLim(r.l.maxPct) : "No limit"}</span>
              </button>
            ))}
            {g.family.combinedLimits.length > 0 && (
              <div style={sx("display:flex;flex-direction:column;gap:4px;padding-top:10px;margin-top:6px;border-top:1px solid #ece8df;font:400 12px/1.4 'IBM Plex Sans',sans-serif;color:#45473f")}>
                <span style={sx("font:500 11px/1 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;letter-spacing:0.05em;padding-bottom:2px")}>Combined limits</span>
                {g.family.combinedLimits.map((l) => (
                  <span key={l.stage + l.label}>
                    {l.stage} · {l.label}: max {fmtLim(l.maxPct)} combined <span style={sx("color:#8d8a80")}>({l.sourceType === "published" ? "published" : "FeedSport policy"})</span>
                  </span>
                ))}
              </div>
            )}
            <div style={sx("display:flex;gap:14px;flex-wrap:wrap;font:400 12px/1 'IBM Plex Sans',sans-serif;color:#64665c;padding-top:10px")}>
              <span style={sx("display:flex;gap:6px;align-items:center")}><span style={{ ...sx("width:14px;height:9px;border-radius:2px"), background: dot }} />Hard maximum</span>
              <span style={sx("display:flex;gap:6px;align-items:center")}><span style={sx("width:2px;height:12px;background:#e3aa45")} />Advisory level</span>
              <span style={sx("display:flex;gap:6px;align-items:center")}><span style={sx("width:14px;height:9px;border-radius:2px;background:repeating-linear-gradient(135deg,#c9c5b8 0 3px,#ece8df 3px 6px)")} />Set aside, missing data</span>
            </div>
          </div>
        </div>
      </div>
      )}

      {!g.premix && subs.length > 0 && (
        <div style={sx("display:flex;flex-direction:column;gap:12px")}>
          <div style={sx("display:flex;flex-direction:column;gap:5px")}>
            <span style={sx(CARD_TITLE)}>Closest substitutes</span>
            <span style={sx(CARD_SUB)}>Ingredients with the most similar nutrient profile, in case {g.name} is unavailable or dear.</span>
          </div>
          <div style={sx("display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px")}>
            {subs.map(({ x, d, diffs }) => {
              const sim = Math.max(0, Math.round((1 - d) * 100));
              const top = diffs.filter((t) => Math.abs(t.d) > 0.05).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 2).map((t) => (t.d > 0 ? "more " : "less ") + t.n.noun);
              const pd = x.price && g.price ? x.price.usdPerTonne - g.price.usdPerTonne : null;
              return (
                <button key={x.id} type="button" onClick={() => open(x.id)} className={hv("card")} style={sx("border:1px solid #e2dfd6;background:#fff;border-radius:10px;padding:14px 16px;text-align:left;display:flex;flex-direction:column;gap:10px;color:#222420")}>
                  <div style={sx("display:flex;justify-content:space-between;align-items:baseline;gap:10px;width:100%")}>
                    <span style={sx("display:flex;align-items:center;gap:7px;font:600 15px/1.2 'IBM Plex Sans',sans-serif;min-width:0")}>
                      <span style={{ ...sx("flex:none;width:9px;height:9px;border-radius:2px"), background: categoryColor(x.category) }} />
                      {x.name}
                    </span>
                    <span style={sx("flex:none;font:500 12px/1 'IBM Plex Mono',monospace;color:#2f5a3f")}>{sim}% similar</span>
                  </div>
                  <span style={sx("height:5px;width:100%;background:#ece8df;border-radius:3px;display:block;overflow:hidden")}>
                    <span style={{ ...sx("display:block;height:100%;background:#2f5a3f"), width: sim + "%" }} />
                  </span>
                  <span style={sx("font:400 13px/1.4 'IBM Plex Sans',sans-serif;color:#45473f")}>{top.length ? top.join(", ").replace(/^./, (c) => c.toUpperCase()) + "." : "Nearly identical profile."}</span>
                  <span style={sx(`font:500 12px/1 'IBM Plex Mono',monospace;color:${pd != null && pd < 0 ? "#2f5a3f" : "#45473f"}`)}>
                    {!x.price ? "No price" : pd == null ? fmtPrice(x) + "/t" : pd === 0 ? "Same price" : "$" + fmt(Math.abs(pd), 0) + "/t " + (pd < 0 ? "cheaper" : "dearer")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const PROFILE_COLS = "display:grid;grid-template-columns:minmax(170px,1.2fr) 120px minmax(220px,2.2fr) 88px 124px;gap:16px";

/** Where the ingredient sits among the catalogue for every nutrient. */
function NutrientProfile({ g, others, sp, openNutrient }: { g: CatalogueIngredient; others: CatalogueIngredient[]; sp: Species; openNutrient: (id: string) => void }) {
  const lg = Math.log10;
  const rows = NUTRIENTS.map((n) => {
    const v = nutrientContent(g, n, sp);
    const vals = others.map((x) => ({ x, v: nutrientContent(x, n, sp) })).filter((t): t is { x: CatalogueIngredient; v: number } => t.v != null && t.v > 0);
    const lo = Math.min(...vals.map((t) => t.v)) / 1.6, hi = Math.max(...vals.map((t) => t.v)) * 1.6;
    const L = (x: number) => pct(((lg(x) - lg(lo)) / (lg(hi) - lg(lo) || 1)) * 100);
    const sorted = [...vals].sort((a, b) => b.v - a.v);
    const rank = sorted.findIndex((t) => t.x.id === g.id) + 1;
    const med = sorted.length ? sorted[Math.floor(sorted.length / 2)].v : null;
    const costs = vals.map((t) => ({ id: t.x.id, c: nutrientCost(t.x, n, t.v) })).filter((t): t is { id: string; c: number } => t.c != null).sort((a, b) => a.c - b.c);
    const myCost = nutrientCost(g, n, v);
    const cRank = costs.findIndex((t) => t.id === g.id) + 1;
    return { n, v, vals, L, rank, sorted, med, myCost, cRank, costs };
  });
  return (
    <div style={sx(CARD)}>
      <div style={sx(`${CARD_HEAD};display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap`)}>
        <div style={sx("display:flex;flex-direction:column;gap:5px;max-width:640px")}>
          <span style={sx(CARD_TITLE)}>Nutrient profile</span>
          <span style={sx(CARD_SUB)}>Where {g.name} sits among all catalogue ingredients for each nutrient, using {sp === "broiler" ? "poultry" : "pig"} values. Select a nutrient to open it.</span>
        </div>
        <div style={sx("display:flex;gap:14px;flex-wrap:wrap;font:400 12px/1 'IBM Plex Sans',sans-serif;color:#64665c;align-items:center")}>
          <span style={sx("display:flex;align-items:center;gap:6px")}><span style={{ ...sx("width:12px;height:12px;border-radius:50%;border:2px solid #fff"), background: categoryColor(g.category), boxShadow: "0 0 0 1px " + categoryColor(g.category) }} />{g.name}</span>
          <span style={sx("display:flex;align-items:center;gap:6px")}><span style={sx("width:7px;height:7px;border-radius:50%;background:#c9c5b8")} />Other ingredients</span>
          <span style={sx("display:flex;align-items:center;gap:6px")}><span style={sx("width:2px;height:12px;background:#8d8a80")} />Median</span>
        </div>
      </div>
      <div style={sx("overflow:auto")}>
        <div style={sx("min-width:800px")}>
          <div style={sx(`${PROFILE_COLS};padding:11px 20px;font:500 11px/1.2 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;letter-spacing:0.05em;background:#faf8f3;border-bottom:1px solid #e2dfd6`)}>
            <span>Nutrient</span>
            <span style={sx("text-align:right")}>Content</span>
            <span>Low ← catalogue → high</span>
            <span style={sx("text-align:right")}>Rank</span>
            <span style={sx("text-align:right")}>Cost per unit</span>
          </div>
          {rows.map((r) => {
            const dot = categoryColor(g.category);
            return (
              <div key={r.n.id} style={sx(`${PROFILE_COLS};padding:10px 20px;border-top:1px solid #ece8df;align-items:center;font:400 13px/1.2 'IBM Plex Sans',sans-serif`)}>
                <span style={sx("display:flex;flex-direction:column;gap:3px;min-width:0")}>
                  <button type="button" onClick={() => openNutrient(r.n.id)} className={hv("back")} style={sx("border:0;background:transparent;padding:0;text-align:left;font:500 13px/1.2 'IBM Plex Sans',sans-serif;color:#222420")}>{r.n.name}</button>
                  <span style={sx("font:400 11px/1 'IBM Plex Mono',monospace;color:#8d8a80")}>{r.n.unit + (r.n === ME ? " · " + (sp === "broiler" ? "poultry" : "pigs") : "")}</span>
                </span>
                <span style={sx(`font:500 13px/1 'IBM Plex Mono',monospace;text-align:right;white-space:nowrap;color:${r.v ? "#222420" : "#8d8a80"}`)}>{r.v == null ? "—" : r.v === 0 ? "0" : fmtWithUnit(r.n, r.v)}</span>
                <span style={sx("position:relative;height:22px;display:block")}>
                  <span style={sx("position:absolute;left:0;right:0;top:10px;height:2px;background:#f0ede5;display:block")} />
                  {r.vals.filter((t) => t.x.id !== g.id).map((t) => (
                    <span key={t.x.id} title={t.x.name + ": " + fmtContent(r.n, t.v)} style={{ ...sx("position:absolute;top:7px;width:8px;height:8px;margin-left:-4px;border-radius:50%;background:#c9c5b8;display:block"), left: r.L(t.v) }} />
                  ))}
                  {r.med != null && <span style={{ ...sx("position:absolute;top:4px;width:2px;height:14px;margin-left:-1px;background:#8d8a80;display:block"), left: r.L(r.med) }} />}
                  {r.v != null && r.v > 0 ? (
                    <span style={{ ...sx("position:absolute;top:3px;width:16px;height:16px;margin-left:-8px;border-radius:50%;border:2px solid #fff;display:block;transition:left .4s ease"), left: r.L(r.v), background: dot, boxShadow: "0 0 0 1px " + dot }} />
                  ) : (
                    <span style={sx("position:absolute;left:0;top:3px;font:400 12px/16px 'IBM Plex Sans',sans-serif;color:#8d8a80;background:#fff;padding-right:8px")}>{r.v == null ? "No data for this ingredient" : "Contains none"}</span>
                  )}
                </span>
                <span style={sx(`font:400 12px/1 'IBM Plex Mono',monospace;text-align:right;color:${r.rank === 1 ? "#2f5a3f" : "#45473f"}`)}>{r.v && r.rank ? "#" + r.rank + " of " + r.sorted.length : "—"}</span>
                <span style={sx("display:flex;flex-direction:column;gap:3px;align-items:flex-end")}>
                  <span style={sx("font:400 13px/1 'IBM Plex Mono',monospace;color:#45473f")}>{r.myCost != null ? fmtCost(r.myCost) + (r.n.unit === "%" ? "/kg" : "/Mcal") : "—"}</span>
                  {r.myCost != null && r.cRank > 0 && <span style={sx(`font:400 11px/1 'IBM Plex Sans',sans-serif;color:${r.cRank === 1 ? "#2f5a3f" : "#8d8a80"}`)}>{r.cRank === 1 ? "Cheapest source" : "#" + r.cRank + " of " + plural(r.costs.length, "source")}</span>}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div style={sx("padding:11px 20px 14px;border-top:1px solid #ece8df;font:400 12px/1.45 'IBM Plex Sans',sans-serif;color:#64665c;text-wrap:pretty")}>Positions use a log scale across all ingredients that contain the nutrient. Cost per unit is what 1 kg of the nutrient (1 Mcal for energy) costs when bought through this ingredient at the default price.</div>
    </div>
  );
}

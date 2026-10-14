import { useState } from "react";

import { ADV_LINK, CARD, DataTag, MONO_HEAD, StatusGlyph } from "./marks";
import { sx } from "./sx";
import type { UpperLimitAdvisoryVals } from "./upper-limit-advisory";

// CFIA reference maximums in the Advisories tab. Same cards, type and spacing
// as every other advisory; red only for an established exceedance, the
// dashed Missing tag for a value the premix does not document.

const RED = "#a63d2a";
const RED_BORDER = "#e7b3a6";

const toneColor = (tone: string) => (tone === "bad" ? RED : tone === "good" ? "#2b6a42" : tone === "warn" ? "#8a5f18" : "#222420");

function ExceedanceHeading({ title }: { title: string }) {
  return (
    <span style={sx("display:flex;align-items:center;gap:10px;flex-wrap:wrap")}>
      <StatusGlyph shape="square" color="#b2412e" size={8} />
      <span style={sx(MONO_HEAD + ";color:" + RED)}>Upper limit</span>
      <span style={sx("font:600 15px/1.2 'IBM Plex Sans',sans-serif;color:" + RED)}>{title}</span>
    </span>
  );
}

/** One card for the vitamin exceedances (with the premix suggestion) and one per mineral. */
export function UpperLimitAdvisories({ upper }: { upper: UpperLimitAdvisoryVals }) {
  const action = upper.vitamins?.action;
  return (
    <>
      {upper.vitamins && (
        <section aria-label="Vitamin above a CFIA reference maximum" style={sx(`${CARD};border-color:${RED_BORDER};overflow:hidden`)}>
          <div style={sx("display:flex;flex-direction:column;gap:12px;padding:14px 18px;border-bottom:1px solid #ece8df")}>
            {upper.vitamins.items.map((item) => (
              <div key={item.key} style={sx("display:flex;flex-direction:column;gap:5px")}>
                <ExceedanceHeading title={item.title} />
                <span style={sx("font:400 14px/1.55 'IBM Plex Sans',sans-serif;color:#33352f")}>{item.text} {item.contributors}</span>
              </div>
            ))}
            <span style={sx("font:400 12px/1.45 'IBM Plex Sans',sans-serif;color:#64665c")}>{upper.source} · {upper.category}. {upper.mapping} Advisory reference: it doesn&apos;t change whether the recipe meets its hard requirements.</span>
          </div>
          {action && (
            <div style={sx("display:flex;flex-wrap:wrap")}>
              <div style={sx("flex:1 1 320px;padding:16px 18px;display:flex;flex-direction:column;gap:12px")}>
                <span style={sx("font:400 14px/1.55 'IBM Plex Sans',sans-serif;color:#33352f")}><b style={sx("font-weight:600")}>Suggested action:</b> {action.text}</span>
                {action.status && (
                  <span style={sx(`display:flex;align-items:center;gap:7px;font:500 12px/1.3 'IBM Plex Sans',sans-serif;color:${action.resolved ? "#2b6a42" : RED}`)}>
                    <StatusGlyph shape={action.resolved ? "dot" : "square"} color={action.resolved ? "#2f7a4a" : "#b2412e"} size={6} />{action.status} · re-run with your ingredients, limits and prices
                  </span>
                )}
                {action.basis && <span style={sx("font:400 12px/1.45 'IBM Plex Sans',sans-serif;color:#8a5f18")}>{action.basis}</span>}
                <div style={sx("display:flex;gap:10px;align-items:center;flex-wrap:wrap")}>
                  {action.compare && <button onClick={action.compare} style={sx("border:1px solid #2f5a3f;background:#fff;color:#2f5a3f;font:600 13px/1 'IBM Plex Sans',sans-serif;padding:10px 13px;border-radius:6px")}>Review alternative</button>}
                  {action.replace && <button onClick={action.replace} style={sx("border:0;background:#2f5a3f;color:#fff;font:600 13px/1 'IBM Plex Sans',sans-serif;padding:11px 14px;border-radius:6px")}>Replace premix</button>}
                  {!action.replace && action.url && <a href={action.url} target="_blank" rel="noopener" style={sx(ADV_LINK)}>Supplier data sheet ↗</a>}
                </div>
              </div>
              {action.rows.length > 0 && (
                <div style={sx("flex:1 1 300px;padding:14px 18px;background:#faf8f3;border-left:1px solid #ece8df;display:flex;flex-direction:column")}>
                  <span style={sx(MONO_HEAD + ";padding-bottom:8px")}>Result of the re-run</span>
                  {action.rows.map((row) => (
                    <div key={row.label} style={sx("display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-top:1px solid #ece8df;font:400 13px/1.35 'IBM Plex Sans',sans-serif")}>
                      <span>{row.label}</span><span style={sx(`text-align:right;font-weight:600;color:${toneColor(row.tone)}`)}>{row.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}
      {upper.minerals.map((item) => (
        <section key={item.key} aria-label="Mineral above a CFIA reference maximum" style={sx(`${CARD};border-color:${RED_BORDER};padding:14px 18px;display:flex;flex-direction:column;gap:6px`)}>
          <ExceedanceHeading title={item.title} />
          <span style={sx("font:400 14px/1.55 'IBM Plex Sans',sans-serif;color:#33352f")}>{item.text} {item.contributors}</span>
          <span style={sx("font:400 12px/1.45 'IBM Plex Sans',sans-serif;color:#64665c")}>{upper.source} · {upper.category}. Advisory reference: it doesn&apos;t change whether the recipe meets its hard requirements.</span>
        </section>
      ))}
    </>
  );
}

const GRID = "display:grid;grid-template-columns:minmax(150px,1.4fr) 90px 110px minmax(180px,1.6fr);gap:14px;padding:10px 18px";

/** Every CFIA reference for the phase, beside the Chapter 7 comparison but separate from it. */
export function UpperLimitTable({ upper }: { upper: UpperLimitAdvisoryVals }) {
  const [all, setAll] = useState(false);
  const shown = all ? upper.rows : upper.rows.slice(0, 5);
  return (
    <section aria-label="CFIA reference maximums" style={sx(`${CARD};overflow:hidden`)}>
      <div style={sx("display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid #ece8df;flex-wrap:wrap")}>
        <span style={sx(MONO_HEAD)}>Upper limits</span><span style={sx("font:600 15px/1.2 'IBM Plex Sans',sans-serif")}>Compared with CFIA reference maximums</span>
        <span style={sx("margin-left:auto;font:400 12px/1.3 'IBM Plex Sans',sans-serif;color:#64665c")}>{upper.counts}</span>
      </div>
      <div style={sx(`${GRID};background:#faf8f3;font:500 11px/1 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;letter-spacing:0.04em`)}>
        <span>Nutrient</span><span style={sx("text-align:right")}>Recipe</span><span style={sx("text-align:right")}>Maximum</span><span>Comparison</span>
      </div>
      {shown.map((row) => (
        <div key={row.key} data-status={row.status} style={sx(`${GRID};border-top:1px solid #ece8df;align-items:center;font:400 13px/1.3 'IBM Plex Sans',sans-serif`)}>
          <span>{row.name}</span>
          <span style={sx(`text-align:right;font-weight:600;color:${row.status === "exceeds" ? RED : "#222420"}`)}>{row.recipe}</span>
          <span style={sx("text-align:right;color:#45473f")}>{row.max}</span>
          <span style={sx(`display:flex;align-items:center;gap:8px;color:${row.status === "exceeds" ? RED : "#45473f"}`)}>
            {row.status === "exceeds" && <StatusGlyph shape="square" color="#b2412e" size={7} />}
            {row.status === "not_documented" && <DataTag label="Missing" dashed />}
            {row.text}
          </span>
        </div>
      ))}
      <div style={sx("display:flex;justify-content:space-between;gap:12px;padding:11px 18px;border-top:1px solid #ece8df;font:400 12px/1.5 'IBM Plex Sans',sans-serif;color:#64665c;flex-wrap:wrap")}>
        <span>Reference maximums, not requirements; they never change the recipe or its result. {upper.source}, {upper.category}. {upper.mapping} {upper.basis} {upper.notAssessed}</span>
        {upper.rows.length > 5 && <button onClick={() => setAll(!all)} style={sx(ADV_LINK + ";color:#222420")}>{all ? "Show fewer" : "Show all " + upper.rows.length}</button>}
      </div>
    </section>
  );
}

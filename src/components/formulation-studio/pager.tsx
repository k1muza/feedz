import type { ChangeEvent } from "react";

import { sx } from "./sx";

// Paged tables in the studio (catalogue, formulations, nutrients): the page
// maths and the footer with the range shown, page size and page buttons.

export const PAGE_SIZES = [10, 25, 50];
export const DEFAULT_PAGE_SIZE = PAGE_SIZES[0];
export const pageCount = (total: number, size: number) => Math.max(1, Math.ceil(total / size));

type PageBtn = { label: string; bg: string; fg: string; bd: string; go: () => void };

/** The footer pager shared by paged tables, plus the slice of rows on the current page. */
export function pagerVals(total: number, wantPage: number, size: number, setPage: (p: number) => void, setSize: (n: number) => void) {
  const pages = pageCount(total, size),
    page = Math.min(Math.max(1, wantPage), pages);
  const from = (page - 1) * size,
    to = Math.min(total, from + size);
  const goPage = (p: number) => () => p >= 1 && p <= pages && p !== page && setPage(p);
  const pager = {
    text: total ? "Showing " + (from + 1) + "–" + to + " of " + total : "0 results", prev: goPage(page - 1), next: goPage(page + 1), prevColor: page > 1 ? "#222420" : "#b9b6ab", nextColor: page < pages ? "#222420" : "#b9b6ab", prevDisabled: page <= 1, nextDisabled: page >= pages,
    pages: Array.from({ length: pages }, (_, i) => i + 1)
      .filter((p) => pages <= 7 || p === 1 || p === pages || Math.abs(p - page) <= 1)
      .reduce<PageBtn[]>((acc, p, i, arr) => {
        if (i && p - arr[i - 1] > 1) acc.push({ label: "…", bg: "transparent", fg: "#64665c", bd: "transparent", go: () => {} });
        acc.push({ label: String(p), bg: p === page ? "#222420" : "#fff", fg: p === page ? "#faf8f3" : "#222420", bd: p === page ? "#222420" : "#d0cdc3", go: goPage(p) });
        return acc;
      }, []),
    size: String(size), onSize: (e: ChangeEvent<HTMLSelectElement>) => setSize(+e.target.value),
  };
  return { from, to, pager };
}

export type PagerVals = ReturnType<typeof pagerVals>["pager"];

// Footer of a paged table: the range shown, page size, and page buttons.
export function Pager({ pg }: { pg: PagerVals }) {
  return (
    <div style={sx("display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 18px;border-top:1px solid #e2dfd6;background:#faf8f3;flex-wrap:wrap;position:sticky;left:0")}>
      <div style={sx("display:flex;align-items:center;gap:12px;font:400 13px/1 'IBM Plex Sans',sans-serif;color:#45473f")}>
        <span>{pg.text}</span>
        <label style={sx("display:flex;align-items:center;gap:6px;color:#64665c")}>
          Per page
          <select value={pg.size} onChange={pg.onSize} style={sx("font:500 13px/1 'IBM Plex Sans',sans-serif;padding:5px 6px;border:1px solid #d0cdc3;border-radius:6px;background:#fff;color:#222420")}>
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>
      <div style={sx("display:flex;align-items:center;gap:6px")}>
        <button onClick={pg.prev} disabled={pg.prevDisabled} aria-label="Previous page" style={sx(`border:1px solid #d0cdc3;background:#fff;color:${pg.prevColor};font:500 13px/1 'IBM Plex Sans',sans-serif;padding:7px 10px;border-radius:6px`)}>‹ Prev</button>
        {pg.pages.map((p, i) => (
          <button key={i} onClick={p.go} style={sx(`min-width:32px;border:1px solid ${p.bd};background:${p.bg};color:${p.fg};font:600 13px/1 'IBM Plex Sans',sans-serif;padding:7px 8px;border-radius:6px`)}>{p.label}</button>
        ))}
        <button onClick={pg.next} disabled={pg.nextDisabled} aria-label="Next page" style={sx(`border:1px solid #d0cdc3;background:#fff;color:${pg.nextColor};font:500 13px/1 'IBM Plex Sans',sans-serif;padding:7px 10px;border-radius:6px`)}>Next ›</button>
      </div>
    </div>
  );
}

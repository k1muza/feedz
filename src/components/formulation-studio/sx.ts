import type { CSSProperties } from "react";

// The studio views keep the design prototype's inline CSS strings verbatim so
// colours, spacing and type stay identical to design/FeedSport Prototype.html.
// sx() turns one of those strings into a React style object, and swaps the
// IBM Plex family names for the self-hosted next/font variables.

const cache = new Map<string, CSSProperties>();

const FONT_SWAPS: [RegExp, string][] = [
  [/'IBM Plex Sans'/g, "var(--font-fs-sans)"],
  [/'IBM Plex Mono'/g, "var(--font-fs-mono)"],
];

function camel(prop: string) {
  if (prop.startsWith("-webkit-")) prop = "Webkit-" + prop.slice(8);
  return prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

export function sx(css: string): CSSProperties {
  const hit = cache.get(css);
  if (hit) return hit;
  const out: Record<string, string> = {};
  for (const decl of css.split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim();
    let value = decl.slice(i + 1).trim();
    if (!prop || !value) continue;
    for (const [re, to] of FONT_SWAPS) value = value.replace(re, to);
    out[camel(prop)] = value;
  }
  cache.set(css, out);
  return out;
}

// The prototype's `style-hover` rules. Inline styles win over classes, so the
// hover declarations are marked !important.
export const HOVER = {
  amber: "background:#e8b55a",
  nav: "background:#2b2d29",
  green: "background:#28503a",
  card: "border-color:#b9b6ab",
  row: "background:#faf8f3",
  field: "border-color:#e2dfd6",
  pool: "background:#f3f0e8",
  chip: "border-color:#2f5a3f",
  signout: "color:#faf8f3",
  trash: "background:#f7e4df",
  soft: "background:#f3f0e8;color:#222420",
  danger: "background:#fdf3f0",
  light: "background:#fff",
  outline: "background:#eef3ee",
} as const;

export const hv = (k: keyof typeof HOVER) => "fsh-" + k;

export const STUDIO_CSS =
  ".fs-studio{background:#faf8f3;font-family:var(--font-fs-sans),sans-serif;color:#222420;-webkit-font-smoothing:antialiased;line-height:normal;font-size:16px}" +
  "body:has(.fs-studio){background:#faf8f3}" +
  ".fs-studio a{color:#2f5a3f}.fs-studio a:hover{color:#1f3e2b}" +
  ".fs-studio *{box-sizing:border-box}" +
  ".fs-studio button{font-family:inherit;cursor:pointer}" +
  ".fs-studio input,.fs-studio select{font-family:inherit}" +
  ".fs-studio input:focus,.fs-studio select:focus{outline:2px solid #2f5a3f;outline-offset:1px}" +
  ".fs-studio [data-navscroll]::-webkit-scrollbar{display:none}" +
  // Auth screens: once the two panels sit side by side (420px + 460px), the
  // brand panel stays put at screen height while the form scrolls.
  "@media (min-width:880px){.fs-studio .fs-auth-aside{position:sticky;top:0;height:100vh;align-self:flex-start}}" +
  // The sidebar is 20% wider on wide screens.
  ".fs-studio .fs-sidebar{width:232px}@media (min-width:1600px){.fs-studio .fs-sidebar{width:278px}}" +
  // On short screens the sidebar scrolls, with a thin scrollbar in its own colours.
  ".fs-studio .fs-sidebar{overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#45473f transparent}" +
  ".fs-studio .fs-sidebar::-webkit-scrollbar{width:8px}.fs-studio .fs-sidebar::-webkit-scrollbar-track{background:transparent}" +
  ".fs-studio .fs-sidebar::-webkit-scrollbar-thumb{background:#45473f;border-radius:8px;border:2px solid #222420}.fs-studio .fs-sidebar::-webkit-scrollbar-thumb:hover{background:#64665c}" +
  "@keyframes fsspin{to{transform:rotate(360deg)}}" +
  "@keyframes fsin{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}" +
  Object.entries(HOVER)
    .map(([k, decl]) => `.fs-studio .fsh-${k}:hover{${decl.replace(/$/, " !important")}}`)
    .join("");

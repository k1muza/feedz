import { sx } from "./sx";

// Status marks and card styles shared by the studio views. Red is for a hard
// requirement that is not met or an established CFIA exceedance; amber for an
// optional advisory; a dashed tag for missing data. Never red for uncertainty.

export function StatusGlyph({ shape, color, size = 9 }: { shape: string; color: string; size?: number }) {
  const base = `flex:none;display:inline-block;width:${size}px;height:${size}px;background:${color}`;
  return <span aria-hidden style={sx(shape === "triangle" ? `${base};width:${size + 2}px;clip-path:polygon(50% 0,100% 100%,0 100%)` : shape === "dot" ? `${base};border-radius:50%` : base)} />;
}

const MONO_TAG = "font:500 10px/1 'IBM Plex Mono',monospace;letter-spacing:0.04em;text-transform:uppercase;padding:4px 6px;border-radius:4px;white-space:nowrap";

/** Data status tag: Published / Assumed 0 / Missing. Never a requirement status. */
export function DataTag({ label, dashed }: { label: string; dashed?: boolean }) {
  return <span style={sx(`${MONO_TAG};${dashed ? "border:1px dashed #b9b6ab;background:#fff;color:#45473f" : "border:1px solid transparent;background:#efece4;color:#45473f"}`)}>{label}</span>;
}

/** Amber diamond: advisory, optional, never blocks. */
export function Diamond({ size = 8 }: { size?: number }) {
  return <span aria-hidden style={sx(`flex:none;display:inline-block;width:${size}px;height:${size}px;background:#c98a1e;transform:rotate(45deg)`)} />;
}

export const ADV_LINK = "border:0;background:transparent;padding:0;font:600 13px/1.3 'IBM Plex Sans',sans-serif;color:#2f5a3f;text-decoration:underline;text-underline-offset:3px;cursor:pointer";
export const CARD = "background:#fff;border:1px solid #e2dfd6;border-radius:10px";
export const MONO_HEAD = "font:500 11px/1 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;letter-spacing:0.05em";

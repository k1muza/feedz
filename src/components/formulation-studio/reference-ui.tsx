import type { StudioPhase, StudioProgramme, StudioProgrammeData } from "@/lib/studio-programmes";

import { sx } from "./sx";

// Shared by the reference pages (nutrient data, ingredient catalogue): page
// and card styles from the designs, and the "Compare against" stage picker.

const PAGE_FRAME = "display:flex;flex-direction:column;max-width:1600px;width:100%;margin:0 auto;animation:fsin .25s ease-out";
export const PAGE = PAGE_FRAME + ";padding:36px clamp(16px,4vw,40px) 56px;gap:22px";
export const DETAIL_PAGE = PAGE_FRAME + ";padding:28px clamp(16px,4vw,40px) 56px;gap:20px";
export const CARD = "background:#fff;border:1px solid #e2dfd6;border-radius:10px;overflow:hidden";
export const CARD_HEAD = "padding:16px 20px;border-bottom:1px solid #e2dfd6";
export const CARD_TITLE = "font:600 15px/1.2 'IBM Plex Sans',sans-serif";
export const CARD_SUB = "font:400 13px/1.45 'IBM Plex Sans',sans-serif;color:#64665c;text-wrap:pretty";
export const MONO_KICKER = "font:500 12px/1 'IBM Plex Mono',monospace;color:#64665c;letter-spacing:0.06em;text-transform:uppercase";
export const MORE_BTN = "border:0;background:transparent;padding:0;font:600 13px/1 'IBM Plex Sans',sans-serif;color:#2f5a3f";
export const HATCH = "repeating-linear-gradient(135deg,#ece8df 0 3px,#f7f5ef 3px 6px)";
export const BACK_LINK = "border:0;background:transparent;padding:6px 0;font:500 13px/1 'IBM Plex Sans',sans-serif;color:#2f5a3f;display:flex;gap:6px;align-items:center";
export const EDGE_BTN = "border:1px solid #d6d2c6;background:#fff;border-radius:7px;padding:8px 12px;font:400 13px/1 'IBM Plex Sans',sans-serif;color:#45473f;white-space:nowrap";
export const SEARCH_INPUT = "width:240px;max-width:100%;border:1px solid #d6d2c6;background:#fff;border-radius:7px;padding:9px 12px;font:400 14px/1 'IBM Plex Sans',sans-serif;color:#222420";

/** Filter chip: dark when on. */
export const chip = (on: boolean) => `border:1px solid ${on ? "#222420" : "#d6d2c6"};background:${on ? "#222420" : "#fff"};color:${on ? "#faf8f3" : "#45473f"};font:500 13px/1 'IBM Plex Sans',sans-serif;padding:8px 12px;border-radius:999px;display:flex;gap:6px;align-items:center;white-space:nowrap`;
/** Segmented-control button: raised when on. */
export const seg = (on: boolean) => `background:${on ? "#fff" : "transparent"};color:${on ? "#222420" : "#64665c"};box-shadow:${on ? "0 1px 2px rgba(34,36,32,.14)" : "none"}`;
export const pct = (x: number) => x.toFixed(2) + "%";
export const plural = (n: number, word: string) => n + " " + word + (n === 1 ? "" : "s");

/** "A, B, C and 4 more" — footnotes stay a line or two however many ingredients they name. */
export function nameList(names: string[], max = 8) {
  return names.length <= max ? names.join(", ") : names.slice(0, max).join(", ") + " and " + (names.length - max) + " more";
}

// ---- the stage a reference page compares against ----

export interface StageTarget {
  progId: string;
  phaseId: string;
}

const DEFAULT_PROGRAMME = "grow-finish-pig";

/**
 * The stage compared against: the one picked, or else the first stage that
 * passes `prefer` (grow-finish pigs first), or else grow-finish pigs' first stage.
 */
export function resolveStage(data: StudioProgrammeData, picked: StageTarget | null, prefer: (phase: StudioPhase) => boolean = () => true): { programme: StudioProgramme; phase: StudioPhase } {
  const progs = data.programmes;
  const programme = picked && progs.find((p) => p.id === picked.progId);
  const phase = programme?.phases.find((ph) => ph.id === picked!.phaseId);
  if (programme && phase) return { programme, phase };
  const ordered = [...progs].sort((a, b) => +(b.id === DEFAULT_PROGRAMME) - +(a.id === DEFAULT_PROGRAMME));
  for (const p of ordered) {
    const ph = p.phases.find(prefer);
    if (ph) return { programme: p, phase: ph };
  }
  return { programme: ordered[0], phase: ordered[0].phases[0] };
}

/** "Compare against": every programme's stages, grouped by programme. `note` marks a stage, e.g. " · not set". */
export function StageSelect({ programmes, programme, phase, onPick, note }: { programmes: StudioProgrammeData; programme: StudioProgramme; phase: StudioPhase; onPick: (t: StageTarget) => void; note?: (phase: StudioPhase) => string }) {
  return (
    <label style={sx("display:flex;flex-direction:column;gap:6px;font:500 11px/1 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;letter-spacing:0.05em")}>
      Compare against
      <select
        value={programme.id + "|" + phase.id}
        onChange={(e) => {
          const [progId, phaseId] = e.target.value.split("|");
          onPick({ progId, phaseId });
        }}
        style={sx("border:1px solid #d6d2c6;background:#fff;border-radius:7px;padding:9px 10px;font:400 14px/1 'IBM Plex Sans',sans-serif;color:#222420;min-width:240px;max-width:100%;text-transform:none;letter-spacing:0")}
      >
        {programmes.programmes.map((p) => (
          <optgroup key={p.id} label={p.name}>
            {p.phases.map((ph) => (
              <option key={ph.id} value={p.id + "|" + ph.id}>{ph.label + (note?.(ph) ?? "")}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

import { useState } from "react";

import { sx } from "./sx";

/** An "i" that shows `text` on hover or focus, and toggles it on click or tap.
 * Fixed to the viewport so the recipe table's horizontal scroller cannot clip it.
 */
export function InfoTip({ text }: { text: string }) {
  const [pinned, setPinned] = useState(false);
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const place = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    // Half the tooltip's widest box (260px + padding) plus an 8px gutter from the screen edge.
    setAt({ x: Math.min(Math.max(rect.left + rect.width / 2, 148), window.innerWidth - 148), y: rect.bottom + 6 });
  };
  const hide = () => { if (!pinned) setAt(null); };
  return (
    <span style={sx("display:inline-flex;flex:none")}>
      <button
        type="button"
        aria-label="Premix effect"
        aria-expanded={!!at}
        onMouseEnter={(e) => place(e.currentTarget)}
        onMouseLeave={hide}
        onFocus={(e) => place(e.currentTarget)}
        onBlur={() => { setPinned(false); setAt(null); }}
        onClick={(e) => {
          if (pinned) { setPinned(false); setAt(null); } else { setPinned(true); place(e.currentTarget); }
        }}
        style={sx("width:15px;height:15px;border-radius:50%;border:1px solid #9aa597;background:#fff;color:#45473f;padding:0;display:inline-flex;align-items:center;justify-content:center;font:italic 600 10px/1 Georgia,serif;cursor:pointer")}
      >i</button>
      {at && (
        <span role="tooltip" style={sx(`position:fixed;left:${at.x}px;top:${at.y}px;transform:translateX(-50%);width:max-content;max-width:260px;padding:8px 10px;border-radius:6px;background:#222420;color:#fff;font:400 12px/1.4 'IBM Plex Sans',sans-serif;text-align:left;box-shadow:0 4px 14px rgba(0,0,0,.18);z-index:60;white-space:normal;pointer-events:none`)}>{text}</span>
      )}
    </span>
  );
}

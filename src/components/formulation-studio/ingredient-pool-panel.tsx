"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

import { hv, sx } from "./sx";

const MONO_LABEL = "font:500 12px/1 'IBM Plex Mono',monospace;color:#64665c;text-transform:uppercase;letter-spacing:0.05em";

export interface IngredientPoolPremixRow {
  sku: string;
  sub: string;
  open?: () => void;
  replace?: () => void;
}

export interface IngredientPoolRow {
  name: string;
  short: string;
  chip: { deco: string };
  nameColor: string;
  roleColor: string;
  open?: () => void;
}

interface IngredientPoolPanelProps {
  poolCount: number | string;
  premixPoolRow?: IngredientPoolPremixRow | null;
  poolRows: IngredientPoolRow[];
  totalRows?: number;
  previewCount?: number;
  onAdd?: () => void;
}

function Action({ children, className, onClick, style }: { children: ReactNode; className?: string; onClick?: () => void; style: CSSProperties }) {
  if (!onClick) return <div className={className} style={style}>{children}</div>;
  return <button type="button" onClick={onClick} className={className} style={style}>{children}</button>;
}

export function IngredientPoolPanel({
  poolCount,
  premixPoolRow,
  poolRows,
  totalRows = poolRows.length,
  previewCount = 5,
  onAdd,
}: IngredientPoolPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = poolRows.length > previewCount;
  const shownRows = expanded ? poolRows : poolRows.slice(0, previewCount);
  const hiddenRows = Math.max(0, totalRows - previewCount);

  return (
    <div
      data-testid="ingredient-pool-panel"
      style={sx("padding:18px 22px;border-bottom:1px solid #ece8df;display:flex;flex-direction:column;gap:4px")}
    >
      <div style={sx("display:flex;justify-content:space-between;align-items:center;padding-bottom:6px")}>
        <span style={sx(MONO_LABEL)}>2 · Ingredients · {poolCount}</span>
        <Action onClick={onAdd} style={sx("border:0;background:transparent;font:600 13px/1 'IBM Plex Sans',sans-serif;color:#2f5a3f;padding:4px 0")}>
          + Add
        </Action>
      </div>

      {premixPoolRow && (
        <div style={sx("display:flex;align-items:center;gap:8px;padding:9px 10px;margin:0 -8px 4px;border-radius:7px;background:#f3f0e8")}>
          <Action onClick={premixPoolRow.open} style={sx("flex:1;min-width:0;border:0;background:transparent;padding:0;text-align:left;display:flex;flex-direction:column;gap:3px;color:#222420")}>
            <span style={sx("display:flex;align-items:center;gap:7px;font:600 14px/1.2 'IBM Plex Sans',sans-serif;min-width:0")}>
              <span style={sx("flex:none;font:600 9px/1 'IBM Plex Mono',monospace;background:#222420;color:#fff;padding:3px 5px;border-radius:3px")}>PREMIX</span>
              <span style={sx("overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{premixPoolRow.sku}</span>
            </span>
            <span style={sx("font:400 12px/1.3 'IBM Plex Sans',sans-serif;color:#64665c")}>{premixPoolRow.sub}</span>
          </Action>
          <Action onClick={premixPoolRow.replace} style={sx("flex:none;border:0;background:transparent;padding:4px 0;font:600 12px/1 'IBM Plex Sans',sans-serif;color:#2f5a3f")}>
            ⇄ Replace
          </Action>
        </div>
      )}

      {shownRows.map((row) => (
        <Action
          key={row.name}
          onClick={row.open}
          className={hv("pool")}
          style={sx("border:0;background:transparent;display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 8px;margin:0 -8px;border-radius:6px;font:400 14px/1.2 'IBM Plex Sans',sans-serif;color:#222420;text-align:left")}
        >
          <span style={sx(`text-decoration:${row.chip.deco};color:${row.nameColor}`)}>{row.name}</span>
          <span style={sx(`flex:none;font:500 12px/1 'IBM Plex Sans',sans-serif;color:${row.roleColor}`)}>{row.short}</span>
        </Action>
      ))}

      {hiddenRows > 0 && (
        <Action
          onClick={canExpand ? () => setExpanded((value) => !value) : undefined}
          style={sx("align-self:flex-start;border:0;background:transparent;padding:8px 0 0;font:600 14px/1 'IBM Plex Sans',sans-serif;color:#2f5a3f")}
        >
          {expanded ? "Show fewer" : `Show all ${totalRows} · ${hiddenRows} more available`}
        </Action>
      )}

      {!premixPoolRow && totalRows === 0 && (
        <span style={sx("font:400 13px/1.4 'IBM Plex Sans',sans-serif;color:#64665c")}>No ingredients yet.</span>
      )}
    </div>
  );
}

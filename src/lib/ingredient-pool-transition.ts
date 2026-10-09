/** Preserve farmer edits when switching in and out of a fixed manufacturer programme. */
export type EditableIngredientPool<Row extends { min: string; max: string; lockedPct: string }> = {
  mode: "automatic" | "selected";
  rows: Row[];
};

/**
 * Restore a saved editable pool unchanged. When Studio was initially opened
 * on a manufacturer-only programme there is no saved pool; keep its baseline
 * ingredient prices but remove the supplier's locked ratios while automatic
 * suggestions rebuild the target programme's normal starting pool.
 */
export function restoreIngredientPool<Row extends { min: string; max: string; lockedPct: string }>(
  original: EditableIngredientPool<Row> | null,
  manufacturerRows: Row[],
): EditableIngredientPool<Row> {
  if (original) return {
    mode: original.mode,
    rows: original.rows.map((row) => ({ ...row })),
  };
  return {
    mode: "automatic",
    rows: manufacturerRows.map((row) => ({
      ...row,
      min: "",
      max: "",
      lockedPct: "",
    })),
  };
}

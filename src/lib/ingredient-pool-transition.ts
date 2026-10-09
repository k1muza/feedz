/** Preserve farmer edits when switching in and out of a fixed manufacturer programme. */
export type EditableIngredientPool<Row extends { min: string; max: string; lockedPct: string }> = {
  mode: "automatic" | "selected";
  rows: Row[];
};

/**
 * Restore a saved editable pool unchanged. When Studio was initially opened
 * on a manufacturer-only programme there is no saved pool; preserve the
 * farmer's current ingredient prices and unlock supplier-specific ratios.
 * Re-enter automatic mode so the destination programme gets the full candidate
 * pool, while new suggestions reuse matching user-entered prices.
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

/** Merge a fresh programme-specific candidate pool with existing price edits.
 * Ingredients not suggested for the new phase are dropped; calcium, phosphate,
 * salt, amino acids and other new candidates obtain their planning defaults.
 */
export function mergeSuggestedIngredients<
  Row extends { ingredientId: string; price: string; min: string; max: string; lockedPct: string; key: number },
>(
  suggestedIds: readonly string[],
  current: readonly Row[],
  defaultPrice: (id: string) => string,
): Row[] {
  const byId = new Map(current.map((row) => [row.ingredientId, row]));
  return suggestedIds.map((ingredientId, index) => {
    const previous = byId.get(ingredientId);
    return {
      key: index,
      ingredientId,
      price: previous?.price ?? defaultPrice(ingredientId),
      min: previous?.min ?? "",
      max: previous?.max ?? "",
      lockedPct: previous?.lockedPct ?? "",
    } as Row;
  });
}

/**
 * How far a recipe's inclusions may add up away from 100% and still count as
 * a complete recipe: enough to absorb amounts shown or typed to two decimal
 * places (each within ±0.005, so ten retyped amounts stay within ±0.05,
 * e.g. 3 × 33.33 = 99.99), but small enough that a genuine shortfall or
 * excess is reported rather than accepted. One rule for Studio, the evaluate
 * and report APIs, the assessment and MCP.
 */
export const INCLUSION_TOTAL_TOLERANCE_PCT = 0.05;

type Inclusion = { ingredientId: string; inclusionPct: number };

const sumOf = (rows: readonly Inclusion[]) => rows.reduce((sum, row) => sum + row.inclusionPct, 0);

/** The total of a recipe's inclusions, in %. */
export const inclusionTotalOf = sumOf;

/** True when a total is a complete batch: 100% up to the input-rounding tolerance. */
export const isCompleteInclusionTotal = (total: number) =>
  Number.isFinite(total) && Math.abs(total - 100) <= INCLUSION_TOTAL_TOLERANCE_PCT;

/**
 * Rescales inclusions whose total is within the tolerance of 100% so they sum
 * to 100% exactly (to floating-point precision). A total outside the
 * tolerance is a real error and is rejected, never silently rescaled.
 */
export function normaliseInclusionTotal<T extends Inclusion>(rows: readonly T[]): T[] {
  const total = sumOf(rows);
  if (!isCompleteInclusionTotal(total)) {
    throw new Error(`Diet inclusions must sum to 100%; received ${Number.isFinite(total) ? +total.toFixed(4) : total}.`);
  }
  // Already 100% to floating-point precision: leave exact amounts untouched.
  if (Math.abs(total - 100) <= 1e-9) return rows.map((row) => ({ ...row }));
  return rows.map((row) => ({ ...row, inclusionPct: (row.inclusionPct * 100) / total }));
}

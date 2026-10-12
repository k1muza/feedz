/**
 * How far a recipe's inclusions may add up away from 100% and still count as
 * a complete recipe: enough to absorb amounts shown or typed to two decimal
 * places (e.g. 3 × 33.33 = 99.99), but small enough that a genuine
 * shortfall or excess is reported rather than accepted.
 */
export const INCLUSION_TOTAL_TOLERANCE_PCT = 0.05;

type Inclusion = { ingredientId: string; inclusionPct: number };

const sumOf = (rows: readonly Inclusion[]) => rows.reduce((sum, row) => sum + row.inclusionPct, 0);

/**
 * Rescales inclusions whose total is within the tolerance of 100% so they sum
 * to 100% exactly (to floating-point precision). A total outside the
 * tolerance is a real error and is rejected, never silently rescaled.
 */
export function normaliseInclusionTotal<T extends Inclusion>(rows: readonly T[]): T[] {
  const total = sumOf(rows);
  if (!Number.isFinite(total) || Math.abs(total - 100) > INCLUSION_TOTAL_TOLERANCE_PCT) {
    throw new Error(`Diet inclusions must sum to 100%; received ${Number.isFinite(total) ? +total.toFixed(4) : total}.`);
  }
  return rows.map((row) => ({ ...row, inclusionPct: (row.inclusionPct * 100) / total }));
}

/**
 * Rounds inclusions that sum to 100% to `decimals` places while keeping the
 * rounded total at exactly 100% (largest-remainder method), so a recipe can
 * be shown or edited in rounded amounts without drifting off 100%.
 */
export function roundInclusionsTo100<T extends Inclusion>(rows: readonly T[], decimals = 2): T[] {
  const scale = 10 ** decimals;
  const total = sumOf(rows);
  if (!(total > 0)) return rows.map((row) => ({ ...row }));
  const units = rows.map((row) => (Math.max(0, row.inclusionPct) * 100 * scale) / total);
  const floors = units.map(Math.floor);
  let spare = Math.round(100 * scale - floors.reduce((sum, unit) => sum + unit, 0));
  const order = units.map((_, i) => i).sort((a, b) => units[b] - floors[b] - (units[a] - floors[a]));
  for (const i of order) {
    if (spare <= 0) break;
    floors[i] += 1;
    spare -= 1;
  }
  return rows.map((row, i) => ({ ...row, inclusionPct: floors[i] / scale }));
}

/**
 * The numerical comparison rules shared by the optimizer, the canonical
 * assessment, Studio's manual check, saved versions, the APIs and MCP.
 * Browser-safe: no solver imports.
 *
 * Tolerances only absorb arithmetic error (binary floating point, GLPK's
 * feasibility tolerance, recomputing a total from a solution). They never
 * stand in for display rounding: a value that would round to its bound on
 * screen but lies outside these tolerances is a real violation.
 */

/**
 * Nutrient requirements (energy, protein, amino acids, minerals). GLPK
 * satisfies scaled rows to about 1e-7, and the assessment recomputes each
 * nutrient from the solution, so a binding row can land a few parts per
 * million off. 1e-5 relative covers that with margin; for SID lysine at
 * 0.891% it is 0.0000089 percentage points, far below any formulating
 * decision. The absolute floor covers bounds at or near zero.
 */
export const NUTRIENT_RELATIVE_TOLERANCE = 1e-5;
export const NUTRIENT_ABSOLUTE_TOLERANCE = 1e-7;

export function nutrientFeasibilityTolerance(bound: number): number {
  return Math.max(Math.abs(bound) * NUTRIENT_RELATIVE_TOLERANCE, NUTRIENT_ABSOLUTE_TOLERANCE);
}

/**
 * One ingredient's inclusion against its own minimum, maximum or fixed dose
 * (including a premix's manufacturer dose), in percentage points. These are
 * variable bounds that GLPK honours exactly and that people type exactly, so
 * only binary floating-point error is absorbed (0.1 + 0.2 = 0.30000000000000004).
 */
export const INCLUSION_TOLERANCE_PCT = 1e-6;

/**
 * A family or constraint-group ceiling: the members' combined inclusion is an
 * LP row, so it carries the same relative tolerance as a nutrient row.
 */
export function aggregateTolerancePct(maxPct: number): number {
  return Math.max(Math.abs(maxPct) * NUTRIENT_RELATIVE_TOLERANCE, INCLUSION_TOLERANCE_PCT);
}

export type BoundRelation = "min" | "max" | "equal";

/**
 * How far `actual` lies on the failing side of `bound`, before any tolerance:
 * positive is a violation (a shortfall below a minimum, an excess above a
 * maximum, or any difference from a fixed value), zero or negative is not.
 */
export function boundViolation(relation: BoundRelation, actual: number, bound: number): number {
  if (relation === "min") return bound - actual;
  if (relation === "max") return actual - bound;
  return Math.abs(actual - bound);
}

/** The one boundary rule: a bound is met unless it is violated by more than `tolerance`. */
export function withinBound(relation: BoundRelation, actual: number, bound: number, tolerance: number): boolean {
  return boundViolation(relation, actual, bound) <= tolerance;
}

const MAX_DISPLAY_DP = 8;

/** The fewest decimals (at least `minDp`, at most `maxDp`) that write `value` without rounding it. */
export function exactDp(value: number, minDp = 0, maxDp = 4): number {
  for (let dp = minDp; dp < maxDp; dp++) {
    if (Math.abs(+value.toFixed(dp) - value) <= Math.abs(value) * 1e-12) return dp;
  }
  return maxDp;
}

/**
 * Decimals at which `actual` and `bound` are written differently, starting
 * at `dp`. A value that fails its bound must never be shown as equal to it.
 */
export function distinguishingDp(actual: number, bound: number, dp: number): number {
  let d = dp;
  while (d < MAX_DISPLAY_DP && actual.toFixed(d) === bound.toFixed(d)) d++;
  return d;
}

/**
 * Decimals for showing a requirement and its recipe value side by side: the
 * bound as published (0.891, not 0.89), and, when the bound is not met,
 * enough digits to show the recipe value differs from it.
 */
export function requirementDisplayDp(actual: number, bound: number, baseDp: number, met: boolean): number {
  const dp = exactDp(bound, baseDp);
  return met ? dp : distinguishingDp(actual, bound, dp);
}

/** A shortfall or excess written to two significant figures and at least `minDp` decimals (0.0024, 0.00013, 12). */
export function gapDp(gap: number, minDp = 0): number {
  const magnitude = Math.abs(gap);
  if (!(magnitude > 0)) return minDp;
  // The nudge keeps 3.2001 − 3.2 (0.0000999…) at the order of magnitude of 0.0001.
  return Math.min(MAX_DISPLAY_DP, Math.max(minDp, 1 - Math.floor(Math.log10(magnitude) + 1e-9)));
}

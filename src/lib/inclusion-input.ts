/**
 * Native attributes for every ingredient inclusion % input (manual amounts,
 * minimums, maximums, fixed amounts and reusable-list rules).
 *
 * `step="any"`: optimised and saved recipes carry full-precision
 * percentages (63.85, 2.23, 0.15065…), and a fixed step such as 0.1 makes the
 * browser mark them invalid ("The two nearest valid values are 63.8 and
 * 63.9"). The 0–100 range matches `isValidInclusionPct`, which the
 * application applies again, so native and application validation agree.
 */
export const INCLUSION_INPUT_PROPS = {
  type: "number",
  inputMode: "decimal",
  step: "any",
  min: 0,
  max: 100,
} as const;

/** An inclusion percentage the application accepts: a finite number from 0 to 100. */
export function isValidInclusionPct(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

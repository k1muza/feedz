/** Keep the editable quick-calculator starter mix at exactly 100% when the
 * selected animal's manufacturer premix dose changes. The cereal is balancing,
 * not a nutritional recommendation; the solver subsequently optimises it.
 */
export function initialFeedMix<T extends Record<string, number>>(
  base: T,
  cerealId: keyof T,
  premixPct: number,
): T {
  const current = Object.values(base).reduce((sum, pct) => sum + pct, 0);
  return {
    ...base,
    [cerealId]: Math.round(((base[cerealId] ?? 0) + 100 - current - premixPct) * 10000) / 10000,
  };
}

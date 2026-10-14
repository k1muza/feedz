import {
  UPPER_LIMIT_VITAMIN_IDS,
  formatUpperLimitValue,
  upperLimitSentence,
  upperLimitTitle,
  type FormulationAssessment,
  type PremixComparison,
  type UpperLimitCheck,
} from "@/lib/formulation-assessment-model";

/**
 * The Advisories tab's CFIA upper-limit content, built from the canonical
 * assessment and premix comparison so Studio, MCP and the PDFs say the same.
 *
 * Calm by design: an established exceedance is one red advisory card in the
 * Advisories tab and one count on the usual advisory indicator. It never
 * changes the headline or the recipe, and the premix is replaced only when
 * the farmer chooses Replace premix.
 */
export type UpperLimitAdvisoryVals = NonNullable<ReturnType<typeof upperLimitAdvisoryVals>["card"]>;

export function upperLimitAdvisoryVals(input: {
  assessment: FormulationAssessment | null;
  /** Null for a manual recipe, which has no premix re-runs. */
  comparison: PremixComparison | null;
  manual: boolean;
  premixSpecificationUrl: string;
  name: (ingredientId: string) => string;
  money: (value: number) => string;
  /** Set when the comparison describes least cost rather than the goal shown. */
  leastCostBasis: string;
  replacePremix: (premixId: string) => void;
  openCompare: () => void;
}) {
  const { assessment, comparison } = input;
  const upper = assessment?.upperLimits?.status === "assessed" ? assessment.upperLimits : null;
  if (!upper) return { card: null, advisoryCount: 0, suggestedForVitamins: null as string | null };

  const exceeded = upper.rows.filter((row) => row.status === "exceeds");
  const vitaminExceeded = exceeded.filter((row) => UPPER_LIMIT_VITAMIN_IDS.includes(row.id));
  const mineralExceeded = exceeded.filter((row) => !UPPER_LIMIT_VITAMIN_IDS.includes(row.id));
  const advice = comparison?.vitaminAdvice ?? null;
  const rec = advice?.recommendation ?? null;
  const recOption = rec ? comparison?.options.find((option) => option.premixId === rec.premixId) ?? null : null;

  const joinWords = (words: string[]) => (words.length < 2 ? words[0] ?? "" : words.slice(0, -1).join(", ") + " and " + words[words.length - 1]);
  const contributors = (row: UpperLimitCheck) => row.contributions.length
    ? "From " + joinWords(row.contributions.slice(0, 3).map((c) => input.name(c.ingredientId) + " " + formatUpperLimitValue(c.value, row.unit))) + (row.contributions.length > 3 ? " and " + (row.contributions.length - 3) + " more" : "") + "."
    : "";
  const item = (row: UpperLimitCheck) => ({ key: row.id, title: upperLimitTitle(row), text: upperLimitSentence(row), contributors: contributors(row) });
  const bare = (value: number, unit: string) => formatUpperLimitValue(value, unit).replace(" " + unit, "").replace(/%$/, "");

  const rank = { exceeds: 0, not_documented: 1, within: 2 } as const;
  const rows = upper.rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => rank[a.row.status] - rank[b.row.status] || a.index - b.index)
    .map(({ row }) => ({
      key: row.id,
      name: row.label + ", " + row.unit,
      recipe: row.status === "not_documented" && row.actual === 0 ? "—" : bare(row.actual, row.unit),
      max: bare(row.max, row.unit),
      status: row.status,
      text: row.status === "exceeds"
        ? "Above the reference maximum"
        : row.status === "within"
          ? "Within the reference maximum"
          : "Not on the data sheet of " + joinWords(row.undocumentedPremixIds.map(input.name)),
    }));

  const action = !vitaminExceeded.length ? null : advice ? {
    text: advice.message,
    resolved: rec?.resolved ?? false,
    status: rec ? (rec.resolved ? "Resolved in the re-run" : "Reduced, still above the reference maximum") : "",
    rows: rec ? [
      ...rec.changes.map((change) => ({
        label: change.label,
        value: (change.beforeStatus === "not_documented" ? "not documented" : formatUpperLimitValue(change.before, change.unit)) + " → " + (change.afterStatus === "not_documented" ? "not documented" : formatUpperLimitValue(change.after, change.unit)) + " · max " + formatUpperLimitValue(change.max, change.unit),
        tone: change.afterStatus === "exceeds" ? "bad" : vitaminExceeded.some((row) => row.id === change.id) && change.afterStatus === "within" ? "good" : "plain",
      })),
      {
        label: "Cost",
        value: rec.costPerTonne === null
          ? "No recipe"
          : rec.costDeltaPerTonne === null
            ? input.money(rec.costPerTonne) + (rec.costExcludesPremix ? " excl. premix · no premix price" : "")
            : (rec.costDeltaPerTonne >= 0 ? "+" : "−") + input.money(Math.abs(rec.costDeltaPerTonne)) + "/t → " + input.money(rec.costPerTonne),
        tone: rec.costDeltaPerTonne === null ? "warn" : "plain",
      },
      { label: "Hard requirements", value: rec.requirementsMet + " of " + rec.requirementsTotal + " met", tone: "plain" },
      ...(rec.otherExceedanceLabels.length ? [{ label: "Other reference maximums", value: joinWords(rec.otherExceedanceLabels) + " above", tone: "bad" }] : []),
      { label: "Vitamin data", value: recOption?.vitaminSource ? recOption.vitaminSource.basis + " · " + recOption.vitaminSource.verificationStatus : "—", tone: "plain" },
    ] : [],
    basis: input.leastCostBasis,
    replace: rec ? () => input.replacePremix(rec.premixId) : null,
    compare: comparison && comparison.options.length > 1 ? input.openCompare : null,
    url: input.premixSpecificationUrl,
  } : {
    text: input.manual
      ? "Return to the optimised recipe to compare compatible premixes for this phase."
      : "Verify the vitamin specifications of the selected premix with its manufacturer.",
    resolved: false,
    status: "",
    rows: [],
    basis: "",
    replace: null,
    compare: null,
    url: input.premixSpecificationUrl,
  };

  const within = rows.filter((row) => row.status === "within").length;
  const notDocumented = rows.filter((row) => row.status === "not_documented").length;
  return {
    card: {
      category: upper.category.label,
      source: upper.source,
      mapping: upper.mapping.explanation,
      basis: upper.basis,
      counts: [exceeded.length ? exceeded.length + " above" : "", within + " within", notDocumented ? notDocumented + " not documented" : ""].filter(Boolean).join(" · "),
      rows,
      vitamins: vitaminExceeded.length ? { items: vitaminExceeded.map(item), action } : null,
      minerals: mineralExceeded.map(item),
      notAssessed: upper.notAssessed.length
        ? joinWords(upper.notAssessed.map((label, i) => (i ? label.toLowerCase() : label))) + (upper.notAssessed.length === 1 ? " is" : " are") + " not modelled by FeedSport, so " + (upper.notAssessed.length === 1 ? "it isn't" : "they aren't") + " assessed."
        : "",
    },
    // One advisory for the vitamins (they share one premix suggestion), one per mineral.
    advisoryCount: (vitaminExceeded.length ? 1 : 0) + mineralExceeded.length,
    /** The premix the CFIA card already suggests, so the generic premix card doesn't repeat it. */
    suggestedForVitamins: rec?.premixId ?? null,
  };
}

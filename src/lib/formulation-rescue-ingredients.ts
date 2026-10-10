import type { FormulationAssessment, NutrientAssessment } from "./formulation-assessment-model";

type RescueCatalogueIngredient = {
  id: string;
  name: string;
  category: string;
  price?: object | null;
  /** Per-species values for each optimiser requirement, keyed by requirement id. */
  requirementValues?: Partial<Record<"swine" | "broiler", Record<string, number>>>;
  premix?: {
    contributions: readonly {
      nutrient: string;
      finishedFeedContribution: number;
    }[];
  };
};

export interface FormulationRescueIngredientCandidate {
  id: string;
  name: string;
  category: string;
  reason: string;
}


const normalizedNutrientName = (value: string) => value
  .toLowerCase()
  .replace(/^supplemented\s+/, "")
  .replace(/^total\s+/, "")
  .replace(/\([^)]*\)/g, "")
  .replace(/\s+/g, " ")
  .trim();

function premixContribution(
  ingredient: RescueCatalogueIngredient,
  check: NutrientAssessment,
) {
  const wanted = normalizedNutrientName(check.label);
  return ingredient.premix?.contributions.find(
    (row) => normalizedNutrientName(row.nutrient) === wanted,
  )?.finishedFeedContribution;
}

/**
 * Ranks actual catalogue records that could address an unresolved nutrient
 * check. Eligibility and current-pool filtering stay with Studio because they
 * depend on the selected programme and its manufacturer rules.
 */
export function formulationRescueIngredientCandidates(
  assessment: FormulationAssessment,
  eligibleIngredients: readonly RescueCatalogueIngredient[],
  species: "swine" | "broiler",
  limit = 6,
): FormulationRescueIngredientCandidate[] {
  const unresolved = assessment.nutrientChecks.filter((check) => check.status !== "met");
  const ranked = eligibleIngredients.flatMap((ingredient) => {
    const helps: { label: string; strength: number }[] = [];
    for (const check of unresolved) {
      const basal = check.categoryId !== "vitamins" && check.categoryId !== "trace-minerals";
      if (basal) {
        if (check.status !== "below_target") continue;
        const value = ingredient.requirementValues?.[species]?.[check.nutrientId];
        if (value != null && value > 0) {
          helps.push({
            label: check.label,
            strength: Math.min(20, value / Math.max(check.requiredMin ?? 1, 0.000001)),
          });
        }
        continue;
      }

      const contribution = premixContribution(ingredient, check);
      if (contribution == null || contribution <= 0) continue;
      if (check.status === "above_limit" && check.allowedMax != null && contribution > check.allowedMax) continue;
      helps.push({
        label: check.label,
        strength: check.status === "below_target"
          ? Math.min(20, contribution / Math.max(check.requiredMin ?? 1, 0.000001))
          : 1,
      });
    }
    if (!helps.length) return [];
    return [{
      ingredient,
      helps,
      score: helps.length * 100 + helps.reduce((total, item) => total + item.strength, 0) + (ingredient.price ? 0.1 : 0),
    }];
  });

  return ranked
    .sort((a, b) => b.score - a.score || a.ingredient.name.localeCompare(b.ingredient.name))
    .slice(0, Math.max(0, limit))
    .map(({ ingredient, helps }) => ({
      id: ingredient.id,
      name: ingredient.name,
      category: ingredient.category,
      reason: `May help with ${helps.map((item) => item.label).join(", ")}; add it, then reformulate to verify the result.`,
    }));
}

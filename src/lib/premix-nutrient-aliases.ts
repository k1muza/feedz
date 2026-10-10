/**
 * Supplier label synonyms for micronutrients. This resolves names only.
 *
 * A nutrient being listed on a label is not a usable concentration:
 * chemical form, activity, quantity, units and the declaration basis must
 * still be established before it can be credited to a feed formulation.
 */
export const PREMIX_NUTRIENT_ALIASES = {
  pantothenicAcidMgKg: [
    "pantothenic acid", "vitamin b5", "vit b5", "calcium pantothenate", "d-calcium pantothenate",
  ],
  folicAcidMgKg: ["folic acid", "folate", "folacin", "vitamin b9", "vit b9", "vt b9"],
  biotinMgKg: ["biotin", "vitamin h", "vit h", "vt h", "d biotin", "vitamin b7", "vit b7"],
  totalCholineMgKg: [
    "choline", "choline chloride", "vitamin b4", "vit b4", "vt b4",
    "vit b4 chloride", "vitamin b4 chloride", "vt b4 chloride",
  ],
} as const;

export type PremixNutrientAliasKey = keyof typeof PREMIX_NUTRIENT_ALIASES;

const normalize = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");

const COMPLEX_LABEL_PREFIXES: Record<string, PremixNutrientAliasKey> = {
  "vit h d biotin": "biotinMgKg",
  "vt h d biotin": "biotinMgKg",
  "vit b4 choline": "totalCholineMgKg",
  "vt b4 choline": "totalCholineMgKg",
  "vit b4 chloride": "totalCholineMgKg",
  "vt b4 chloride": "totalCholineMgKg",
};

/** Resolve supplier terminology to a canonical nutrient field, never to a numeric value. */
export function resolvePremixNutrientAlias(sourceName: string): PremixNutrientAliasKey | null {
  const name = normalize(sourceName);
  if (COMPLEX_LABEL_PREFIXES[name]) return COMPLEX_LABEL_PREFIXES[name];
  for (const [key, aliases] of Object.entries(PREMIX_NUTRIENT_ALIASES)) {
    if ((aliases as readonly string[]).some((alias) => normalize(alias) === name)) {
      return key as PremixNutrientAliasKey;
    }
  }
  return null;
}

const ASSESSMENT_IDS: Partial<Record<string, PremixNutrientAliasKey>> = {
  "supplement-pantothenic-acid": "pantothenicAcidMgKg",
  "supplement-folic-acid": "folicAcidMgKg",
  "supplement-biotin": "biotinMgKg",
  "supplement-choline": "totalCholineMgKg",
};

export function premixNutrientKeyForAssessment(nutrientId: string): PremixNutrientAliasKey | null {
  return ASSESSMENT_IDS[nutrientId] ?? null;
}

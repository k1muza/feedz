import { FEED_NUTRIENTS, type FeedNutrient, type NutrientGuide } from "@/lib/feed-nutrients";
import type { CatalogueIngredient } from "@/lib/studio-catalogue";
import type { StudioPhase, StudioProgramme, StudioProgrammeData } from "@/lib/studio-programmes";

import { fmt } from "./engine";

// Nutrient reference data for /studio/nutrients and /studio/nutrients/[id],
// from design/FeedSport Nutrients.html. The nutrients themselves (names,
// units, reference text, optimiser link) come from FEED_NUTRIENTS; this file
// shows the ones with reference text and reads their values.
// Values are read the way the optimiser reads them (each ingredient analysed
// as a 100% diet), so synthetic amino acids and minerals count; fibre isn't
// optimised and comes from the catalogue profile.

export type Species = "swine" | "broiler";

export type NutrientRef = FeedNutrient & {
  unit: "%" | "kcal/kg";
  /** Lower-case name for sentences: "cheapest way to buy lysine". */
  noun: string;
  guide: NutrientGuide;
};

// Every nutrient with reference text, in FEED_NUTRIENTS order. Each needs a
// value the catalogue carries: an optimiser constraint, or crude fibre.
export const NUTRIENTS: NutrientRef[] = FEED_NUTRIENTS.flatMap((nutrient) => {
  const unit = nutrient.units[0];
  if (!nutrient.guide) return [];
  if ((unit !== "%" && unit !== "kcal/kg") || (!nutrient.constraintId && nutrient.id !== "crude-fibre")) throw new Error(`Nutrient page ${nutrient.id} needs a % or kcal/kg unit and a value source`);
  return [{ ...nutrient, unit, noun: nutrient.guide.noun, guide: nutrient.guide }];
});

export const NUTRIENT_GROUPS = [...new Set(NUTRIENTS.map((n) => n.group))];

export const nutrientById = (id: string | null | undefined) => NUTRIENTS.find((n) => n.id === id) ?? null;

export const CATEGORY_ORDER = ["Cereal", "Oil and fat", "Protein meal", "By-product", "Other", "Amino acid", "Mineral", "Premix"];
export const CATEGORY_COLOR: Record<string, string> = {
  Cereal: "#d39a35",
  "Oil and fat": "#b5762a",
  "Protein meal": "#2f5a3f",
  "By-product": "#a08a5c",
  Other: "#9c9a90",
  "Amino acid": "#7da35f",
  Mineral: "#6c7a86",
  Premix: "#8c6a7e",
};
export const categoryColor = (category: string) => CATEGORY_COLOR[category] ?? "#9c9a90";
export const categoryRank = (category: string) => {
  const i = CATEGORY_ORDER.indexOf(category);
  return i < 0 ? CATEGORY_ORDER.length : i;
};

/**
 * Ingredients with a per-kg nutrient profile. Commercial premixes are left
 * out: they supply nutrients only at the manufacturer's dose.
 */
export const referenceIngredients = (catalogue: CatalogueIngredient[]) => catalogue.filter((g) => !g.premix);

/**
 * As-fed content of one nutrient: null where the data is missing (unknown, not
 * zero), 0 where the ingredient has none.
 */
export function nutrientContent(g: CatalogueIngredient, n: NutrientRef, species: Species): number | null {
  if (n.id === "crude-fibre") {
    // Feedstuffs should carry a fibre value; oils, minerals and synthetics have none.
    return g.nutrients.cf ?? (g.expected.length > 1 ? null : 0);
  }
  const values = g.requirementValues[species];
  // Not in this species' nutrient library at all, or not a nutrient the optimiser measures.
  if (!values || !n.constraintId) return null;
  if (g.requirementMissing[species]?.includes(n.constraintId)) return null;
  return values[n.constraintId] ?? 0;
}

/** What 1 Mcal (energy) or 1 kg of the nutrient costs bought through this ingredient, in $. */
export function nutrientCost(g: CatalogueIngredient, n: NutrientRef, content: number | null): number | null {
  if (!(content != null && content > 0) || !g.price) return null;
  return n.unit === "%" ? g.price.usdPerTonne / (10 * content) : g.price.usdPerTonne / content;
}

export const requirementIndex = (data: StudioProgrammeData, nutrientId: string) => data.requirementFields.findIndex((f) => f.nutrientId === nutrientId);

/** The phase's published requirement for this nutrient, or null where it sets none. */
export function phaseRequirement(data: StudioProgrammeData, phase: StudioPhase, n: NutrientRef): number | null {
  const i = requirementIndex(data, n.id);
  return i < 0 ? null : phase.requirements[i] ?? null;
}

export const programmeSets = (data: StudioProgrammeData, p: StudioProgramme, n: NutrientRef) => p.phases.some((ph) => phaseRequirement(data, ph, n) != null);

/** The ingredient's Table 1.01 maximum for the phase's column, if it has one. */
export function phaseInclusionLimit(data: StudioProgrammeData, phase: StudioPhase, ingredientId: string): number | null {
  if (!phase.limitsKey) return null;
  return data.limits[phase.limitsKey]?.find((l) => l.id === ingredientId)?.maxPct ?? null;
}

/** "Grower: 26–47 kg" → Grower / 26–47 kg; labels without a colon keep the weight range underneath. */
export function phaseParts(phase: StudioPhase) {
  const i = phase.label.indexOf(": ");
  return i < 0 ? { name: phase.label, sub: phase.weightRange } : { name: phase.label.slice(0, i), sub: phase.label.slice(i + 2) };
}

export function fmtContent(n: NutrientRef, v: number | null) {
  if (v == null) return "—";
  if (v === 0) return "0";
  if (n.unit !== "%") return fmt(v, 0);
  return fmt(v, v >= 10 ? 1 : 2);
}

export const fmtWithUnit = (n: NutrientRef, v: number) => fmtContent(n, v) + (n.unit === "%" ? "%" : " kcal/kg");

export const fmtCost = (c: number) => "$" + fmt(c, c >= 100 ? 0 : c >= 10 ? 1 : c >= 1 ? 2 : 3);

/** Unit a nutrient's cost is quoted in. */
export const costUnit = (n: NutrientRef) => (n.unit === "%" ? "kg " + n.noun : "Mcal");

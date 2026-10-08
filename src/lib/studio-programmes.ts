import "server-only";

import { FEED_PROGRAMMES } from "@/lib/feed-programmes";
import { BRAZILIAN_INCLUSION_SOURCE, brazilianInclusionColumn, phaseInclusionRecommendation } from "@/lib/ingredient-inclusion-limits";
import { INGREDIENT_LIBRARY } from "@/lib/ingredient-nutrients";
import type { NutritionPhase, NutritionPhaseClass } from "@/lib/nutrition";

// Feeding programmes for the formulation studio (/studio/programmes): the
// loaded FeedSport programmes, each phase's published requirements, and the
// Table 1.01 ingredient limits for the phase's column. Limits depend only on
// the column, so they are stored once per column rather than per phase.

export interface StudioRequirementField {
  name: string;
  /** Broiler tables name this nutrient differently. */
  broilerName?: string;
  unit: string;
  /** Energy is published as a target; everything else as a minimum. */
  kind: "minimum" | "target";
}

export interface StudioPhase {
  id: string;
  label: string;
  weightRange: string;
  sourceTable: string;
  sourcePage: number;
  /** Key into StudioProgrammeData.limits; null when Table 1.01 has no column (boars). */
  limitsKey: string | null;
  columnLabel: string | null;
  /** One value per entry in StudioProgrammeData.requirementFields; null where the phase publishes none. */
  requirements: (number | null)[];
  /** Ingredient maxima the programme itself publishes, on top of Table 1.01. */
  programmeLimits: { name: string; maxPct: number }[];
}

export interface StudioProgramme {
  id: string;
  name: string;
  description: string;
  species: "swine" | "broiler";
  source: string;
  span: string;
  phases: StudioPhase[];
}

export interface StudioIngredientLimit {
  /** Id in the ingredient library. */
  id: string;
  name: string;
  maxPct: number;
  practicalPct?: number;
}

export interface StudioProgrammeData {
  /** Shared by every phase, so the 94 phases carry only their numbers. */
  requirementFields: StudioRequirementField[];
  programmes: StudioProgramme[];
  limits: Record<string, StudioIngredientLimit[]>;
  limitsSource: string;
}

const GROWING: NutritionPhaseClass[] = ["pre-starter", "starter", "grower", "finisher"];

const REQUIREMENTS: (StudioRequirementField & { pick: (phase: NutritionPhase) => number | undefined })[] = [
  { name: "Metabolizable energy", unit: "kcal/kg", kind: "target", pick: (p) => p.requirements.metabolizableEnergyKcalKg },
  { name: "Net energy", unit: "kcal/kg", kind: "target", pick: (p) => p.requirements.netEnergyKcalKg },
  { name: "Crude protein", unit: "%", kind: "minimum", pick: (p) => p.requirements.crudeProteinPct },
  { name: "Digestible protein", unit: "%", kind: "minimum", pick: (p) => p.requirements.digestibleProteinPct },
  { name: "SID lysine", unit: "%", kind: "minimum", pick: (p) => p.requirements.sidAminoAcidsPct.lysine },
  { name: "SID methionine + cysteine", unit: "%", kind: "minimum", pick: (p) => p.requirements.sidAminoAcidsPct.methionineCysteine },
  { name: "SID threonine", unit: "%", kind: "minimum", pick: (p) => p.requirements.sidAminoAcidsPct.threonine },
  { name: "SID tryptophan", unit: "%", kind: "minimum", pick: (p) => p.requirements.sidAminoAcidsPct.tryptophan },
  { name: "SID valine", unit: "%", kind: "minimum", pick: (p) => p.requirements.sidAminoAcidsPct.valine },
  { name: "SID isoleucine", unit: "%", kind: "minimum", pick: (p) => p.requirements.sidAminoAcidsPct.isoleucine },
  { name: "SID leucine", unit: "%", kind: "minimum", pick: (p) => p.requirements.sidAminoAcidsPct.leucine },
  { name: "SID histidine", unit: "%", kind: "minimum", pick: (p) => p.requirements.sidAminoAcidsPct.histidine },
  { name: "SID phenylalanine + tyrosine", unit: "%", kind: "minimum", pick: (p) => p.requirements.sidAminoAcidsPct.phenylalanineTyrosine },
  { name: "Calcium", unit: "%", kind: "minimum", pick: (p) => p.requirements.minerals.calciumPct },
  { name: "Standardized digestible phosphorus", broilerName: "Digestible phosphorus", unit: "%", kind: "minimum", pick: (p) => p.requirements.minerals.sttdPhosphorusPct },
  { name: "Available phosphorus", unit: "%", kind: "minimum", pick: (p) => p.requirements.minerals.availablePhosphorusPct },
  { name: "Potassium", unit: "%", kind: "minimum", pick: (p) => p.requirements.potassiumPct },
  { name: "Sodium", unit: "%", kind: "minimum", pick: (p) => p.requirements.minerals.sodiumPct },
  { name: "Chlorine", unit: "%", kind: "minimum", pick: (p) => p.requirements.minerals.chloridePct },
  { name: "Linoleic acid", unit: "%", kind: "minimum", pick: (p) => p.requirements.linoleicAcidPct },
];

function programmeLimitsOf(phase: NutritionPhase) {
  const practical = phase.requirements.practical;
  return [
    ...(practical.soybeanMealMaxPct !== undefined ? [{ name: "Soybean meal", maxPct: practical.soybeanMealMaxPct }] : []),
    ...(practical.lLysineHclMaxPct !== undefined ? [{ name: "L-Lysine HCl", maxPct: practical.lLysineHclMaxPct }] : []),
  ];
}

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// Short source labels for list cards: "Brazilian Tables 2024", "PIC". The full
// publication titles are too long to repeat on every programme.
function sourceLabel(source: string, version: string): string {
  if (/Brazilian Tables/i.test(source)) {
    const year = version.match(/\b(\d{4})\b/)?.[1];
    return "Brazilian Tables" + (year ? " " + year : "");
  }
  return source.split(" — ")[0];
}

export function getStudioProgrammes(): StudioProgrammeData {
  const limits: Record<string, StudioIngredientLimit[]> = {};
  const limitsFor = (phase: NutritionPhase) => {
    const column = brazilianInclusionColumn(phase);
    if (!column) return null;
    const key = phase.species + ":" + column;
    limits[key] ??= INGREDIENT_LIBRARY.ingredients
      .flatMap((ingredient) => {
        const rec = phaseInclusionRecommendation(ingredient.id, phase);
        return rec ? [{ id: ingredient.id, name: ingredient.name, maxPct: rec.maxPct, ...(rec.practicalPct !== undefined ? { practicalPct: rec.practicalPct } : {}) }] : [];
      })
      // Tightest limits first: those are the ones that shape a recipe.
      .sort((a, b) => a.maxPct - b.maxPct || a.name.localeCompare(b.name));
    return key;
  };

  const programmes = FEED_PROGRAMMES.filter((programme) => programme.status === "loaded").map((programme): StudioProgramme => {
    const growing = programme.phases.every((phase) => GROWING.includes(phase.phaseClass));
    const min = Math.min(...programme.phases.map((phase) => phase.sourceMinWeightKg));
    const max = Math.max(...programme.phases.map((phase) => phase.sourceMaxWeightKg));
    return {
      id: programme.id,
      name: programme.name,
      description: programme.description,
      species: programme.species === "broiler" ? "broiler" : "swine",
      source: programme.sourceProgramme ? sourceLabel(programme.sourceProgramme.source, programme.sourceProgramme.sourceVersion) : "FeedSport",
      span: growing ? `${min}–${max} kg` : "",
      phases: programme.phases.map((phase) => {
        const limitsKey = limitsFor(phase);
        const column = brazilianInclusionColumn(phase);
        return {
          id: phase.id,
          label: capitalise(phase.label),
          weightRange: phase.sourceWeightRange,
          sourceTable: phase.sourceTable,
          sourcePage: phase.sourcePage,
          limitsKey,
          columnLabel: column ? (phase.species === "broiler" ? "broiler " + column : column) : null,
          requirements: REQUIREMENTS.map((field) => field.pick(phase) ?? null),
          programmeLimits: programmeLimitsOf(phase),
        };
      }),
    };
  });

  return {
    requirementFields: REQUIREMENTS.map(({ name, broilerName, unit, kind }) => ({ name, ...(broilerName ? { broilerName } : {}), unit, kind })),
    programmes,
    limits,
    limitsSource: BRAZILIAN_INCLUSION_SOURCE,
  };
}

import {
  BRAZILIAN_2024_BROILER_HIGH_HOT_NUTRITION,
  BRAZILIAN_2024_BROILER_HIGH_NUTRITION,
  BRAZILIAN_2024_BROILER_STANDARD_NUTRITION,
  BRAZILIAN_2024_GESTATION_NUTRITION,
  BRAZILIAN_2024_HIGH_BARROW_HOT_NUTRITION,
  BRAZILIAN_2024_HIGH_BARROW_NUTRITION,
  BRAZILIAN_2024_HIGH_ENTIRE_MALE_HOT_NUTRITION,
  BRAZILIAN_2024_HIGH_GILT_HOT_NUTRITION,
  BRAZILIAN_2024_HIGH_GILT_NUTRITION,
  BRAZILIAN_2024_HIGH_GROWTH_NUTRITION,
  BRAZILIAN_2024_HIGH_MIXED_SEX_HOT_NUTRITION,
  BRAZILIAN_2024_LACTATION_25C_NUTRITION,
  BRAZILIAN_2024_LACTATION_NUTRITION,
  BRAZILIAN_2024_STANDARD_BARROW_NUTRITION,
  BRAZILIAN_2024_STANDARD_ENTIRE_MALE_NUTRITION,
  BRAZILIAN_2024_STANDARD_GILT_NUTRITION,
  BRAZILIAN_2024_STANDARD_GROWTH_NUTRITION,
  PIC_MATURE_BOAR_NUTRITION,
  type NutritionPhase,
  type NutritionProgramme,
  type NutritionSpecies,
} from "./nutrition";

export type FeedProgrammeStatus = "loaded" | "not_loaded";

export type FeedProgrammeDefinition = {
  id: string;
  name: string;
  description: string;
  status: FeedProgrammeStatus;
  species: NutritionSpecies;
  sourceProgramme?: NutritionProgramme;
  phases: readonly NutritionPhase[];
};

function isNurseryPhase(phase: NutritionPhase): boolean {
  return phase.phaseClass === "pre-starter" || phase.phaseClass === "starter";
}

function isGrowFinishPhase(phase: NutritionPhase): boolean {
  return phase.phaseClass === "grower" || phase.phaseClass === "finisher";
}

const DEFAULT_PROGRAMME = BRAZILIAN_2024_STANDARD_GROWTH_NUTRITION;
const HIGH_PERFORMANCE_PROGRAMME = BRAZILIAN_2024_HIGH_GROWTH_NUTRITION;

const PROGRAMME_DEFINITIONS: readonly Omit<FeedProgrammeDefinition, "species">[] = [
  {
    id: "nursery-pig",
    name: "Nursery Pig",
    description:
      "Brazilian Tables 2024 pre-starter and starter requirements for high-genetic-potential pigs.",
    status: "loaded",
    sourceProgramme: DEFAULT_PROGRAMME,
    phases: DEFAULT_PROGRAMME.phases.filter(isNurseryPhase),
  },
  {
    id: "grow-finish-pig",
    name: "Grow-Finish Pig",
    description:
      "Brazilian Tables 2024 standard-performance mixed-sex grower and finisher requirements.",
    status: "loaded",
    sourceProgramme: DEFAULT_PROGRAMME,
    phases: DEFAULT_PROGRAMME.phases.filter(isGrowFinishPhase),
  },
  {
    id: "developing-gilt",
    name: "Developing Gilt",
    description:
      "Brazilian Tables 2024 standard-performance gilt requirements from Table 5.38.",
    status: "loaded",
    sourceProgramme: BRAZILIAN_2024_STANDARD_GILT_NUTRITION,
    phases: BRAZILIAN_2024_STANDARD_GILT_NUTRITION.phases,
  },
  {
    id: "growing-barrows-standard",
    name: "Growing Barrows — Standard Performance",
    description:
      "Brazilian Tables 2024 standard-performance barrow requirements from Table 5.35.",
    status: "loaded",
    sourceProgramme: BRAZILIAN_2024_STANDARD_BARROW_NUTRITION,
    phases: BRAZILIAN_2024_STANDARD_BARROW_NUTRITION.phases,
  },
  {
    id: "growing-entire-immunocastrated-males-standard",
    name: "Entire / Immunocastrated Males — Standard Performance",
    description:
      "Brazilian Tables 2024 standard-performance entire and immunocastrated male requirements from Table 5.39.",
    status: "loaded",
    sourceProgramme: BRAZILIAN_2024_STANDARD_ENTIRE_MALE_NUTRITION,
    phases: BRAZILIAN_2024_STANDARD_ENTIRE_MALE_NUTRITION.phases,
  },
  {
    id: "mature-boar",
    name: "Mature Boar — PIC",
    description:
      "PIC mature-boar nutrient specifications, using PIC energy-relative SID amino-acid and phosphorus targets with Brazilian Tables ingredient composition.",
    status: "loaded",
    sourceProgramme: PIC_MATURE_BOAR_NUTRITION,
    phases: PIC_MATURE_BOAR_NUTRITION.phases,
  },
  {
    id: "gestating-gilt-sow",
    name: "Gestating Gilt & Sow",
    description:
      "Brazilian Tables 2024 breeder requirements by parity and gestation period from Table 6.08.",
    status: "loaded",
    sourceProgramme: BRAZILIAN_2024_GESTATION_NUTRITION,
    phases: BRAZILIAN_2024_GESTATION_NUTRITION.phases,
  },
  {
    id: "lactating-gilt-sow",
    name: "Lactating Gilt & Sow",
    description:
      "Brazilian Tables 2024 lactation requirements by parity and litter-weight gain from Table 6.15.",
    status: "loaded",
    sourceProgramme: BRAZILIAN_2024_LACTATION_NUTRITION,
    phases: BRAZILIAN_2024_LACTATION_NUTRITION.phases,
  },
  {
    id: "lactating-gilt-sow-25c",
    name: "Lactating Gilt & Sow — 25 °C",
    description:
      "Brazilian Tables 2024 lactation requirements adjusted for an average temperature of 25 °C from Table 6.16.",
    status: "loaded",
    sourceProgramme: BRAZILIAN_2024_LACTATION_25C_NUTRITION,
    phases: BRAZILIAN_2024_LACTATION_25C_NUTRITION.phases,
  },
  {
    id: "nursery-pig-high-performance",
    name: "Nursery Pig — High Performance",
    description:
      "Brazilian Tables 2024 pre-starter and starter requirements paired with the high-performance mixed-sex programme.",
    status: "loaded",
    sourceProgramme: HIGH_PERFORMANCE_PROGRAMME,
    phases: HIGH_PERFORMANCE_PROGRAMME.phases.filter(isNurseryPhase),
  },
  {
    id: "grow-finish-pig-high-performance",
    name: "Grow-Finish Pig — High Performance",
    description:
      "Brazilian Tables 2024 high-performance mixed-sex grower and finisher requirements.",
    status: "loaded",
    sourceProgramme: HIGH_PERFORMANCE_PROGRAMME,
    phases: HIGH_PERFORMANCE_PROGRAMME.phases.filter(isGrowFinishPhase),
  },
  {
    id: "developing-gilt-high-performance",
    name: "Developing Gilt — High Performance",
    description:
      "Brazilian Tables 2024 high-performance gilt requirements from Table 5.36.",
    status: "loaded",
    sourceProgramme: BRAZILIAN_2024_HIGH_GILT_NUTRITION,
    phases: BRAZILIAN_2024_HIGH_GILT_NUTRITION.phases,
  },
  {
    id: "growing-barrows-high-performance",
    name: "Growing Barrows — High Performance",
    description:
      "Brazilian Tables 2024 high-performance barrow requirements from Table 5.33.",
    status: "loaded",
    sourceProgramme: BRAZILIAN_2024_HIGH_BARROW_NUTRITION,
    phases: BRAZILIAN_2024_HIGH_BARROW_NUTRITION.phases,
  },
  {
    id: "growing-barrows-high-performance-hot",
    name: "Growing Barrows — High Performance (+5 °C)",
    description:
      "Brazilian Tables 2024 high-performance barrow requirements at 5 °C above thermoneutral from Table 5.34.",
    status: "loaded",
    sourceProgramme: BRAZILIAN_2024_HIGH_BARROW_HOT_NUTRITION,
    phases: BRAZILIAN_2024_HIGH_BARROW_HOT_NUTRITION.phases,
  },
  {
    id: "developing-gilt-high-performance-hot",
    name: "Developing Gilt — High Performance (+5 °C)",
    description:
      "Brazilian Tables 2024 high-performance gilt requirements at 5 °C above thermoneutral from Table 5.37.",
    status: "loaded",
    sourceProgramme: BRAZILIAN_2024_HIGH_GILT_HOT_NUTRITION,
    phases: BRAZILIAN_2024_HIGH_GILT_HOT_NUTRITION.phases,
  },
  {
    id: "growing-entire-immunocastrated-males-high-performance-hot",
    name: "Entire / Immunocastrated Males — High Performance (+5 °C)",
    description:
      "Brazilian Tables 2024 high-performance entire and immunocastrated male requirements at 5 °C above thermoneutral from Table 5.40.",
    status: "loaded",
    sourceProgramme: BRAZILIAN_2024_HIGH_ENTIRE_MALE_HOT_NUTRITION,
    phases: BRAZILIAN_2024_HIGH_ENTIRE_MALE_HOT_NUTRITION.phases,
  },
  {
    id: "grow-finish-pig-high-performance-hot",
    name: "Grow-Finish Pig — High Performance (+5 °C)",
    description:
      "Brazilian Tables 2024 high-performance mixed-sex grower and finisher requirements at 5 °C above thermoneutral from Table 5.42.",
    status: "loaded",
    sourceProgramme: BRAZILIAN_2024_HIGH_MIXED_SEX_HOT_NUTRITION,
    phases: BRAZILIAN_2024_HIGH_MIXED_SEX_HOT_NUTRITION.phases,
  },
  {
    id: "broiler-standard",
    name: "Broiler — Standard Performance",
    description:
      "Brazilian Tables 2024 standard-performance as-hatched broiler requirements from Table 2.30, pre-starter to 49 days.",
    status: "loaded",
    sourceProgramme: BRAZILIAN_2024_BROILER_STANDARD_NUTRITION,
    phases: BRAZILIAN_2024_BROILER_STANDARD_NUTRITION.phases,
  },
  {
    id: "broiler-high-performance",
    name: "Broiler — High Performance",
    description:
      "Brazilian Tables 2024 high-performance as-hatched broiler requirements from Table 2.28, pre-starter to 49 days.",
    status: "loaded",
    sourceProgramme: BRAZILIAN_2024_BROILER_HIGH_NUTRITION,
    phases: BRAZILIAN_2024_BROILER_HIGH_NUTRITION.phases,
  },
  {
    id: "broiler-high-performance-hot",
    name: "Broiler — High Performance (26 °C)",
    description:
      "Brazilian Tables 2024 high-performance as-hatched broiler requirements at an average 26 °C (21–31 °C) from Table 2.29, days 17–49.",
    status: "loaded",
    sourceProgramme: BRAZILIAN_2024_BROILER_HIGH_HOT_NUTRITION,
    phases: BRAZILIAN_2024_BROILER_HIGH_HOT_NUTRITION.phases,
  },
];

export const FEED_PROGRAMMES: readonly FeedProgrammeDefinition[] = PROGRAMME_DEFINITIONS.map(
  (programme) => ({ ...programme, species: programme.sourceProgramme?.species ?? "swine" }),
);

export function feedProgrammeById(id: string): FeedProgrammeDefinition | undefined {
  return FEED_PROGRAMMES.find((programme) => programme.id === id);
}

export function feedProgrammePhaseById(
  programmeId: string,
  phaseId: string,
): NutritionPhase | undefined {
  return feedProgrammeById(programmeId)?.phases.find((phase) => phase.id === phaseId);
}

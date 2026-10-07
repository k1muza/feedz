import {
  BRAZILIAN_2024_BREEDER_SWINE,
  BRAZILIAN_2024_GROWING_SWINE,
  BRAZILIAN_2024_SOURCE,
  BRAZILIAN_2024_SWINE_SUPPLEMENTATION,
} from "./brazilian-nutrition";
import {
  BRAZILIAN_2024_BROILER_HIGH_PERFORMANCE,
  BRAZILIAN_2024_BROILER_HIGH_PERFORMANCE_HOT,
  BRAZILIAN_2024_BROILER_STANDARD_PERFORMANCE,
} from "./brazilian-poultry";
import { PIC_MATURE_BOAR, PIC_MATURE_BOAR_SOURCE } from "./pic-nutrition";

export type NutritionSpecies = "swine" | "broiler";
export type NutritionGrowthStage = "weaner" | "grower" | "finisher";
export type NutritionVariant = "default";
export type GrowingPerformance = "standard" | "high";
export type NutritionPerformance = GrowingPerformance | "breeder";
export type GrowingPhaseClass = "pre-starter" | "starter" | "grower" | "finisher";
export type NutritionPhaseClass = GrowingPhaseClass | "gestation" | "lactation" | "boar";
export type Range = { min: number; max: number };

export type AminoAcidRequirements = {
  methionineCysteineToLysPct: number;
  threonineToLysPct: number;
  tryptophanToLysPct: number;
  valineToLysPct: number;
  isoleucineToLysPct: number;
  leucineToLysPct: number;
  histidineToLysPct: number;
  phenylalanineTyrosineToLysPct: number;
};

export type SidAminoAcidConcentrations = {
  lysine: number;
  methionineCysteine: number;
  threonine: number;
  tryptophan: number;
  valine: number;
  isoleucine: number;
  leucine: number;
  histidine: number;
  phenylalanineTyrosine: number;
};

export type TraceMinerals = {
  zincPpm: number;
  ironPpm: number;
  manganesePpm: number;
  copperPpm: number;
  iodinePpm: number;
  seleniumPpm: number;
};

export type Vitamins = {
  vitaminAIuKg: number;
  vitaminDIuKg: number;
  vitaminEIuKg: number;
  vitaminKMgKg: number;
  vitaminB1MgKg: number;
  riboflavinMgKg: number;
  vitaminB6MgKg: number;
  vitaminB12McgKg: number;
  pantothenicAcidMgKg: number;
  niacinMgKg: number;
  folicAcidMgKg: number;
  biotinMgKg: number;
  totalCholineMgKg: number;
};

export type TraceMineralSupplementation = {
  zincPpm: number;
  ironPpm: number;
  manganesePpm: number;
  copperPpm: number;
  iodinePpm?: number;
  seleniumPpm: number;
};

export type NutritionSupplementationTargets = {
  sourceTables: readonly string[];
  sourcePages: readonly number[];
  vitamins: Vitamins;
  traceMinerals: {
    inorganic: TraceMineralSupplementation;
    organic: TraceMineralSupplementation;
  };
};

export type MineralRequirements = {
  sodiumPct: number;
  chloridePct?: number;
  calciumPct?: number;
  /** Brazilian Tables call this standardized digestible phosphorus (Dig. P). */
  sttdPhosphorusPct?: number;
  availablePhosphorusPct?: number;
};

export type PracticalDietConstraints = {
  soybeanMealMaxPct?: number;
  sidLysineToCrudeProteinMaxPct?: number;
  highlyDigestibleProteinPct?: Range;
  highlyDigestibleCarbohydratePct?: number;
  lLysineHclMaxPct?: number;
  neutralDetergentFibreMinPct?: number;
  calciumToTotalPhosphorusMinRatio?: number;
};

export type EnergyRelativeNutritionRequirements = {
  sidLysineGPerMcal?: Partial<Record<"ME" | "NE", number>>;
  sttdPhosphorusGPerMcal?: Partial<Record<"ME" | "NE", number>>;
  availablePhosphorusGPerMcal?: Partial<Record<"ME" | "NE", number>>;
};

export type NutritionRequirements = {
  netEnergyKcalKg: number;
  metabolizableEnergyKcalKg: number;
  sidLysinePct: number;
  sidAminoAcidsPct: SidAminoAcidConcentrations;
  aminoAcids: AminoAcidRequirements;
  crudeProteinPct?: number;
  digestibleProteinPct?: number;
  potassiumPct?: number;
  linoleicAcidPct?: number;
  minerals: MineralRequirements;
  /**
   * Chapter 7 of the Brazilian Tables publishes suggested supplementation,
   * not nutritional requirements. Keep these optional until those tables are
   * represented as supplementation guidance rather than requirement minima.
   */
  traceMinerals?: TraceMinerals;
  vitamins?: Vitamins;
  practical: PracticalDietConstraints;
  /**
   * Some external programmes publish nutrients relative to dietary energy
   * rather than as fixed diet concentrations. Brazilian Tables phases leave
   * this undefined because they publish concentrations directly.
   */
  energyRelative?: EnergyRelativeNutritionRequirements;
};

export type NutritionPhase = {
  id: string;
  label: string;
  variant: NutritionVariant;
  species: NutritionSpecies;
  phaseClass: NutritionPhaseClass;
  ageMinDays?: number;
  ageMaxDays?: number;
  periodLabel?: string;
  parity?: string;
  litterWeightGainKgDay?: number;
  femaleWeightLossKgDay?: number;
  dailyFeedIntakeKg?: number;
  dailyMetabolizableEnergyKcal?: number;
  sourceTable: string;
  sourcePage: number;
  sourceMinWeightKg: number;
  sourceMaxWeightKg: number;
  /** Display label for the source population/body-weight basis. */
  sourceWeightRange: string;
  lookupMinWeightKg: number;
  lookupMaxWeightKg: number;
  supplementation?: NutritionSupplementationTargets;
  requirements: NutritionRequirements;
};

export type NutritionProgramme = {
  id: string;
  name: string;
  source: string;
  sourceVersion: string;
  sourceSections: readonly string[];
  species: NutritionSpecies;
  performance: NutritionPerformance;
  phases: readonly NutritionPhase[];
};

type BrazilianProgramme = (typeof BRAZILIAN_2024_GROWING_SWINE.programmes)[number];
type BrazilianPhase = BrazilianProgramme["phases"][number];
type BrazilianBreederPhase =
  | (typeof BRAZILIAN_2024_BREEDER_SWINE.gestation.phases)[number]
  | (typeof BRAZILIAN_2024_BREEDER_SWINE.lactation.phases)[number]
  | (typeof BRAZILIAN_2024_BREEDER_SWINE.lactation25C.phases)[number];

const PRESTARTER_PROGRAMME_ID = "prestarter-high-genetic-potential";
const HIGH_PERFORMANCE_PROGRAMME_ID = "high-performance-mixed-sex";
const STANDARD_PERFORMANCE_PROGRAMME_ID = "standard-performance-mixed-sex";
const HIGH_PERFORMANCE_GILT_PROGRAMME_ID = "high-performance-gilts";
const STANDARD_PERFORMANCE_GILT_PROGRAMME_ID = "standard-performance-gilts";
const HIGH_PERFORMANCE_BARROW_PROGRAMME_ID = "high-performance-barrows";
const HIGH_PERFORMANCE_BARROW_HOT_PROGRAMME_ID = "high-performance-barrows-hot-5c";
const STANDARD_PERFORMANCE_BARROW_PROGRAMME_ID = "standard-performance-barrows";
const HIGH_PERFORMANCE_GILT_HOT_PROGRAMME_ID = "high-performance-gilts-hot-5c";
const STANDARD_PERFORMANCE_ENTIRE_MALE_PROGRAMME_ID =
  "standard-performance-entire-immunocastrated-males";
const HIGH_PERFORMANCE_ENTIRE_MALE_HOT_PROGRAMME_ID =
  "high-performance-entire-immunocastrated-males-hot-5c";
const HIGH_PERFORMANCE_MIXED_SEX_HOT_PROGRAMME_ID = "high-performance-mixed-sex-hot-5c";

function programmeById(id: string): BrazilianProgramme {
  const programme = BRAZILIAN_2024_GROWING_SWINE.programmes.find(
    (candidate) => candidate.id === id,
  );
  if (!programme) throw new Error(`Brazilian 2024 programme not found: ${id}.`);
  return programme;
}

function phaseRatioKey(
  phase: BrazilianPhase["phase"],
): keyof typeof BRAZILIAN_2024_GROWING_SWINE.aminoAcidRatios.phases {
  switch (phase) {
    case "pre-starter":
      return "preStarter";
    case "starter":
      return "starter";
    case "grower":
      return "grower";
    case "finisher":
      return "finisher";
  }
}

function requireBoundary(value: number | undefined, label: string): number {
  if (value === undefined) {
    throw new Error(`Brazilian 2024 phase is missing ${label}.`);
  }
  return value;
}

function growingSupplementationForPhase(
  phase: BrazilianPhase,
): NutritionSupplementationTargets | undefined {
  const ageMin = phase.ageDays.min;
  const ageMax = phase.ageDays.max;
  if (ageMin === undefined || ageMax === undefined) return undefined;

  const guidance = BRAZILIAN_2024_SWINE_SUPPLEMENTATION.growing.phases.find(
    (candidate) =>
      candidate.ageDays.min === ageMin && candidate.ageDays.max === ageMax,
  );
  if (!guidance) return undefined;

  const source = BRAZILIAN_2024_SWINE_SUPPLEMENTATION.growing;
  return {
    sourceTables: [source.vitaminSourceTable, source.traceMineralSourceTable],
    sourcePages: [source.vitaminPrintedPage, source.traceMineralPrintedPage],
    vitamins: guidance.vitamins,
    traceMinerals: {
      inorganic: guidance.inorganic,
      organic: guidance.organic,
    },
  };
}

function breederSupplementation(): NutritionSupplementationTargets {
  const guidance = BRAZILIAN_2024_SWINE_SUPPLEMENTATION.breeders;
  return {
    sourceTables: [guidance.sourceTable],
    sourcePages: [guidance.printedPage],
    vitamins: guidance.vitamins,
    traceMinerals: guidance.traceMinerals,
  };
}

function normalizeBrazilianPhase(
  sourceProgramme: BrazilianProgramme,
  phase: BrazilianPhase,
  lookupMinWeightKg: number,
  lookupMaxWeightKg: number,
): NutritionPhase {
  const sourceMinWeightKg = requireBoundary(phase.weightKg.min, "minimum liveweight");
  const sourceMaxWeightKg = requireBoundary(phase.weightKg.max, "maximum liveweight");
  const ratios =
    BRAZILIAN_2024_GROWING_SWINE.aminoAcidRatios.phases[phaseRatioKey(phase.phase)].sid;
  const sid = phase.sidAminoAcidsPct;
  const nutrients = phase.nutrientsPct;

  return {
    id: `br2024-${sourceProgramme.sourceTable.replace(".", "-")}-${phase.id}`,
    label: `${phase.phase.replace("-", " ")}: ${sourceMinWeightKg}–${sourceMaxWeightKg} kg`,
    variant: "default",
    species: "swine",
    phaseClass: phase.phase,
    ageMinDays: phase.ageDays.min,
    ageMaxDays: phase.ageDays.max,
    periodLabel:
      phase.ageDays.min !== undefined && phase.ageDays.max !== undefined
        ? `Age ${phase.ageDays.min}–${phase.ageDays.max} days`
        : undefined,
    sourceTable: sourceProgramme.sourceTable,
    sourcePage: sourceProgramme.printedPage,
    sourceMinWeightKg,
    sourceMaxWeightKg,
    sourceWeightRange: `${sourceMinWeightKg}–${sourceMaxWeightKg} kg`,
    lookupMinWeightKg,
    lookupMaxWeightKg,
    supplementation: growingSupplementationForPhase(phase),
    requirements: {
      metabolizableEnergyKcalKg: phase.diet.metabolizableEnergyKcalKg,
      netEnergyKcalKg: phase.diet.netEnergyKcalKg,
      sidLysinePct: sid.lysine,
      sidAminoAcidsPct: {
        lysine: sid.lysine,
        methionineCysteine: sid.methionineCysteine,
        threonine: sid.threonine,
        tryptophan: sid.tryptophan,
        valine: sid.valine,
        isoleucine: sid.isoleucine,
        leucine: sid.leucine,
        histidine: sid.histidine,
        phenylalanineTyrosine: sid.phenylalanineTyrosine,
      },
      aminoAcids: {
        methionineCysteineToLysPct: ratios.methionineCysteine,
        threonineToLysPct: ratios.threonine,
        tryptophanToLysPct: ratios.tryptophan,
        valineToLysPct: ratios.valine,
        isoleucineToLysPct: ratios.isoleucine,
        leucineToLysPct: ratios.leucine,
        histidineToLysPct: ratios.histidine,
        phenylalanineTyrosineToLysPct: ratios.phenylalanineTyrosine,
      },
      crudeProteinPct: nutrients.crudeProtein,
      digestibleProteinPct: nutrients.digestibleProtein,
      potassiumPct: nutrients.potassium,
      linoleicAcidPct: nutrients.linoleicAcid,
      minerals: {
        calciumPct: nutrients.calcium,
        availablePhosphorusPct: nutrients.availablePhosphorus,
        sttdPhosphorusPct: nutrients.digestiblePhosphorus,
        sodiumPct: nutrients.sodium,
        chloridePct: nutrients.chloride,
      },
      practical: {},
    },
  };
}

function normalizeGrowingSourcePhases(
  sourcePhases: readonly BrazilianPhase[],
  sourceProgrammeFor: (index: number) => BrazilianProgramme,
): NutritionPhase[] {
  return sourcePhases.map((phase, index) => {
    const sourceMin = requireBoundary(phase.weightKg.min, "minimum liveweight");
    const sourceMax = requireBoundary(phase.weightKg.max, "maximum liveweight");
    const previous = sourcePhases[index - 1];
    const next = sourcePhases[index + 1];

    const lookupMin =
      index === 0
        ? sourceMin
        : Math.max(
            requireBoundary(previous!.weightKg.max, "previous maximum liveweight"),
            sourceMin,
          );
    const lookupMax =
      next === undefined
        ? sourceMax
        : Math.max(
            sourceMax,
            requireBoundary(next.weightKg.min, "next minimum liveweight"),
          );

    return normalizeBrazilianPhase(sourceProgrammeFor(index), phase, lookupMin, lookupMax);
  });
}

function buildGrowingProgramme(
  performance: GrowingPerformance,
  growthProgrammeId: string,
): NutritionProgramme {
  const prestarter = programmeById(PRESTARTER_PROGRAMME_ID);
  const growth = programmeById(growthProgrammeId);
  const sourcePhases = [...prestarter.phases, ...growth.phases];

  const phases = normalizeGrowingSourcePhases(
    sourcePhases,
    (index) => (index < prestarter.phases.length ? prestarter : growth),
  );

  // Preserve the original operational behaviour below the first published
  // pre-starter liveweight: the first lookup phase starts at 0 kg.
  phases[0] = { ...phases[0], lookupMinWeightKg: 0 };

  return {
    id: `brazilian-2024-growing-swine-${performance}-performance-mixed-sex`,
    name: `Brazilian Tables 2024 — ${performance === "high" ? "High" : "Standard"} performance mixed-sex pigs`,
    source: BRAZILIAN_2024_SOURCE.title,
    sourceVersion: `5th edition (${BRAZILIAN_2024_SOURCE.year})`,
    sourceSections: [
      "Chapter 5 — Nutritional Requirements of Growing Swine",
      `Table ${prestarter.sourceTable}`,
      `Table ${growth.sourceTable}`,
      `Table ${BRAZILIAN_2024_GROWING_SWINE.aminoAcidRatios.sourceTable}`,
    ],
    species: "swine",
    performance,
    phases,
  };
}

function buildStandaloneGrowingProgramme(
  id: string,
  name: string,
  performance: GrowingPerformance,
  sourceProgrammeId: string,
): NutritionProgramme {
  const sourceProgramme = programmeById(sourceProgrammeId);
  return {
    id,
    name,
    source: BRAZILIAN_2024_SOURCE.title,
    sourceVersion: `5th edition (${BRAZILIAN_2024_SOURCE.year})`,
    sourceSections: [
      "Chapter 5 — Nutritional Requirements of Growing Swine",
      `Table ${sourceProgramme.sourceTable}`,
      `Table ${BRAZILIAN_2024_GROWING_SWINE.aminoAcidRatios.sourceTable}`,
    ],
    species: "swine",
    performance,
    phases: normalizeGrowingSourcePhases(
      sourceProgramme.phases,
      () => sourceProgramme,
    ),
  };
}

function buildGiltProgramme(
  performance: GrowingPerformance,
  sourceProgrammeId: string,
): NutritionProgramme {
  const sourceProgramme = programmeById(sourceProgrammeId);
  const phases = normalizeGrowingSourcePhases(
    sourceProgramme.phases,
    () => sourceProgramme,
  );

  return {
    id: `brazilian-2024-growing-gilts-${performance}-performance`,
    name: `Brazilian Tables 2024 — ${performance === "high" ? "High" : "Standard"} performance gilts`,
    source: BRAZILIAN_2024_SOURCE.title,
    sourceVersion: `5th edition (${BRAZILIAN_2024_SOURCE.year})`,
    sourceSections: [
      "Chapter 5 — Nutritional Requirements of Growing Swine",
      `Table ${sourceProgramme.sourceTable}`,
      `Table ${BRAZILIAN_2024_GROWING_SWINE.aminoAcidRatios.sourceTable}`,
    ],
    species: "swine",
    performance,
    phases,
  };
}

function breederRatios(
  phase: BrazilianBreederPhase,
): (typeof BRAZILIAN_2024_BREEDER_SWINE.lactation.aminoAcidRatios.sid) {
  if (phase.stage === "lactation") {
    return BRAZILIAN_2024_BREEDER_SWINE.lactation.aminoAcidRatios.sid;
  }
  const gestationDays = phase.gestationDays;
  if (!gestationDays?.max) {
    throw new Error(`Gestation phase ${phase.id} is missing its day range.`);
  }
  return gestationDays.max <= 85
    ? BRAZILIAN_2024_BREEDER_SWINE.gestation.aminoAcidRatios.phases.early.sid
    : BRAZILIAN_2024_BREEDER_SWINE.gestation.aminoAcidRatios.phases.late.sid;
}

function normalizeBreederPhase(
  sourceTable: string,
  phase: BrazilianBreederPhase,
): NutritionPhase {
  const sid = phase.sidAminoAcidsPct;
  const nutrients = phase.nutrientsPct;
  const ratios = breederRatios(phase);
  const isGestation = phase.stage === "gestation";
  const bodyWeightKg = isGestation
    ? phase.averageBodyWeightKg
    : phase.femaleWeightPostpartumKg;

  if (bodyWeightKg === undefined) {
    throw new Error(`Breeder phase ${phase.id} is missing its body-weight basis.`);
  }

  const label = isGestation
    ? `${phase.parity} · gestation days ${phase.gestationDays?.min}–${phase.gestationDays?.max}`
    : `${phase.parity} · litter gain ${phase.litterWeightGainKgDay} kg/day`;

  return {
    id: `br2024-${sourceTable.replace(".", "-")}-${phase.id}`,
    label,
    variant: "default",
    species: "swine",
    phaseClass: phase.stage,
    periodLabel: isGestation
      ? `Gestation days ${phase.gestationDays?.min}–${phase.gestationDays?.max}`
      : `Litter weight gain ${phase.litterWeightGainKgDay} kg/day`,
    parity: phase.parity,
    litterWeightGainKgDay: phase.litterWeightGainKgDay,
    femaleWeightLossKgDay: phase.femaleWeightLossKgDay,
    dailyFeedIntakeKg: phase.daily.feedIntakeKgDay,
    dailyMetabolizableEnergyKcal: phase.daily.metabolizableEnergyKcal,
    sourceTable,
    sourcePage: phase.sourcePage,
    sourceMinWeightKg: bodyWeightKg,
    sourceMaxWeightKg: bodyWeightKg,
    sourceWeightRange: isGestation
      ? `${bodyWeightKg} kg average body weight`
      : `${bodyWeightKg} kg postpartum body weight`,
    lookupMinWeightKg: bodyWeightKg,
    lookupMaxWeightKg: bodyWeightKg,
    supplementation: breederSupplementation(),
    requirements: {
      metabolizableEnergyKcalKg: phase.diet.metabolizableEnergyKcalKg,
      netEnergyKcalKg: phase.diet.netEnergyKcalKg,
      sidLysinePct: sid.lysine,
      sidAminoAcidsPct: {
        lysine: sid.lysine,
        methionineCysteine: sid.methionineCysteine,
        threonine: sid.threonine,
        tryptophan: sid.tryptophan,
        valine: sid.valine,
        isoleucine: sid.isoleucine,
        leucine: sid.leucine,
        histidine: sid.histidine,
        phenylalanineTyrosine: sid.phenylalanineTyrosine,
      },
      aminoAcids: {
        methionineCysteineToLysPct: ratios.methionineCysteine,
        threonineToLysPct: ratios.threonine,
        tryptophanToLysPct: ratios.tryptophan,
        valineToLysPct: ratios.valine,
        isoleucineToLysPct: ratios.isoleucine,
        leucineToLysPct: ratios.leucine,
        histidineToLysPct: ratios.histidine,
        phenylalanineTyrosineToLysPct: ratios.phenylalanineTyrosine,
      },
      crudeProteinPct: nutrients.crudeProtein,
      digestibleProteinPct: nutrients.digestibleProtein,
      potassiumPct: nutrients.potassium,
      minerals: {
        calciumPct: nutrients.calcium,
        availablePhosphorusPct: nutrients.availablePhosphorus,
        sttdPhosphorusPct: nutrients.digestiblePhosphorus,
        sodiumPct: nutrients.sodium,
        chloridePct: nutrients.chloride,
      },
      practical: {},
    },
  };
}

function buildBreederProgramme(stage: "gestation" | "lactation"): NutritionProgramme {
  const source =
    stage === "gestation"
      ? BRAZILIAN_2024_BREEDER_SWINE.gestation
      : BRAZILIAN_2024_BREEDER_SWINE.lactation;
  const ratioTable =
    stage === "gestation"
      ? BRAZILIAN_2024_BREEDER_SWINE.gestation.aminoAcidRatios.sourceTable
      : BRAZILIAN_2024_BREEDER_SWINE.lactation.aminoAcidRatios.sourceTable;

  return {
    id: `brazilian-2024-breeder-${stage}`,
    name:
      stage === "gestation"
        ? "Brazilian Tables 2024 — Gestating gilts and sows"
        : "Brazilian Tables 2024 — Lactating gilts and sows",
    source: BRAZILIAN_2024_SOURCE.title,
    sourceVersion: `5th edition (${BRAZILIAN_2024_SOURCE.year})`,
    sourceSections: [
      "Chapter 6 — Nutritional Requirements of Swine Breeders",
      `Table ${source.sourceTable}`,
      `Table ${ratioTable}`,
    ],
    species: "swine",
    performance: "breeder",
    phases: source.phases.map((phase) => normalizeBreederPhase(source.sourceTable, phase)),
  };
}

export const BRAZILIAN_2024_STANDARD_GROWTH_NUTRITION = buildGrowingProgramme(
  "standard",
  STANDARD_PERFORMANCE_PROGRAMME_ID,
);

export const BRAZILIAN_2024_HIGH_GROWTH_NUTRITION = buildGrowingProgramme(
  "high",
  HIGH_PERFORMANCE_PROGRAMME_ID,
);

export const BRAZILIAN_2024_STANDARD_GILT_NUTRITION = buildGiltProgramme(
  "standard",
  STANDARD_PERFORMANCE_GILT_PROGRAMME_ID,
);

export const BRAZILIAN_2024_HIGH_GILT_NUTRITION = buildGiltProgramme(
  "high",
  HIGH_PERFORMANCE_GILT_PROGRAMME_ID,
);

export const BRAZILIAN_2024_HIGH_BARROW_NUTRITION =
  buildStandaloneGrowingProgramme(
    "brazilian-2024-growing-barrows-high-performance",
    "Brazilian Tables 2024 — High performance barrows",
    "high",
    HIGH_PERFORMANCE_BARROW_PROGRAMME_ID,
  );

export const BRAZILIAN_2024_STANDARD_BARROW_NUTRITION =
  buildStandaloneGrowingProgramme(
    "brazilian-2024-growing-barrows-standard-performance",
    "Brazilian Tables 2024 — Standard performance barrows",
    "standard",
    STANDARD_PERFORMANCE_BARROW_PROGRAMME_ID,
  );

export const BRAZILIAN_2024_HIGH_BARROW_HOT_NUTRITION =
  buildStandaloneGrowingProgramme(
    "brazilian-2024-growing-barrows-high-performance-hot-5c",
    "Brazilian Tables 2024 — High performance barrows (+5 °C)",
    "high",
    HIGH_PERFORMANCE_BARROW_HOT_PROGRAMME_ID,
  );

export const BRAZILIAN_2024_HIGH_GILT_HOT_NUTRITION =
  buildStandaloneGrowingProgramme(
    "brazilian-2024-growing-gilts-high-performance-hot-5c",
    "Brazilian Tables 2024 — High performance gilts (+5 °C)",
    "high",
    HIGH_PERFORMANCE_GILT_HOT_PROGRAMME_ID,
  );

export const BRAZILIAN_2024_STANDARD_ENTIRE_MALE_NUTRITION =
  buildStandaloneGrowingProgramme(
    "brazilian-2024-growing-entire-immunocastrated-males-standard-performance",
    "Brazilian Tables 2024 — Standard performance entire/immunocastrated males",
    "standard",
    STANDARD_PERFORMANCE_ENTIRE_MALE_PROGRAMME_ID,
  );

export const BRAZILIAN_2024_HIGH_ENTIRE_MALE_HOT_NUTRITION =
  buildStandaloneGrowingProgramme(
    "brazilian-2024-growing-entire-immunocastrated-males-high-performance-hot-5c",
    "Brazilian Tables 2024 — High performance entire/immunocastrated males (+5 °C)",
    "high",
    HIGH_PERFORMANCE_ENTIRE_MALE_HOT_PROGRAMME_ID,
  );

export const BRAZILIAN_2024_HIGH_MIXED_SEX_HOT_NUTRITION =
  buildStandaloneGrowingProgramme(
    "brazilian-2024-growing-mixed-sex-high-performance-hot-5c",
    "Brazilian Tables 2024 — High performance mixed-sex pigs (+5 °C)",
    "high",
    HIGH_PERFORMANCE_MIXED_SEX_HOT_PROGRAMME_ID,
  );


function pctFromGPerMcal(gPerMcal: number, kcalKg: number): number {
  return (gPerMcal * kcalKg) / 10000;
}

function buildPicMatureBoarProgramme(): NutritionProgramme {
  const source = PIC_MATURE_BOAR;
  const lysinePct = pctFromGPerMcal(
    source.sidLysineGPerMcal.ME,
    source.dietEnergy.metabolizableKcalKg,
  );
  const ratios = source.aminoAcidRatiosToLysPct;
  const aminoPct = (ratio: number) => lysinePct * (ratio / 100);
  const sttdPhosphorusPct = pctFromGPerMcal(
    source.phosphorusGPerMcal.sttd.ME,
    source.dietEnergy.metabolizableKcalKg,
  );
  const availablePhosphorusPct = pctFromGPerMcal(
    source.phosphorusGPerMcal.available.ME,
    source.dietEnergy.metabolizableKcalKg,
  );

  const phase: NutritionPhase = {
    id: "pic-mature-boar",
    label: "Mature boar",
    variant: "default",
    species: "swine",
    phaseClass: "boar",
    periodLabel:
      "Production boar; adjust daily feed allowance for body weight, body condition and temperature",
    sourceTable: source.sourceTable,
    sourcePage: source.sourcePage,
    sourceMinWeightKg: source.sourceWeightKg.min,
    sourceMaxWeightKg: source.sourceWeightKg.max,
    sourceWeightRange: `${source.sourceWeightKg.min}–${source.sourceWeightKg.max} kg reference feeding range`,
    lookupMinWeightKg: source.sourceWeightKg.min,
    lookupMaxWeightKg: source.sourceWeightKg.max,
    supplementation: {
      sourceTables: ["PIC M-1/M-2"],
      sourcePages: [71, 72],
      vitamins: source.supplementation.vitamins,
      traceMinerals: {
        inorganic: {
          zincPpm: source.supplementation.traceMineralsPpm.zinc,
          ironPpm: source.supplementation.traceMineralsPpm.iron,
          manganesePpm: source.supplementation.traceMineralsPpm.manganese,
          copperPpm: source.supplementation.traceMineralsPpm.copper,
          iodinePpm: source.supplementation.traceMineralsPpm.iodine,
          seleniumPpm: source.supplementation.traceMineralsPpm.selenium,
        },
        organic: {
          zincPpm: source.supplementation.traceMineralsPpm.zinc,
          ironPpm: source.supplementation.traceMineralsPpm.iron,
          manganesePpm: source.supplementation.traceMineralsPpm.manganese,
          copperPpm: source.supplementation.traceMineralsPpm.copper,
          iodinePpm: source.supplementation.traceMineralsPpm.iodine,
          seleniumPpm: source.supplementation.traceMineralsPpm.selenium,
        },
      },
    },
    requirements: {
      metabolizableEnergyKcalKg: source.dietEnergy.metabolizableKcalKg,
      netEnergyKcalKg: source.dietEnergy.netKcalKg,
      sidLysinePct: lysinePct,
      sidAminoAcidsPct: {
        lysine: lysinePct,
        methionineCysteine: aminoPct(ratios.methionineCysteine),
        threonine: aminoPct(ratios.threonine),
        tryptophan: aminoPct(ratios.tryptophan),
        valine: aminoPct(ratios.valine),
        isoleucine: aminoPct(ratios.isoleucine),
        leucine: aminoPct(ratios.leucine),
        histidine: aminoPct(ratios.histidine),
        phenylalanineTyrosine: aminoPct(ratios.phenylalanineTyrosine),
      },
      aminoAcids: {
        methionineCysteineToLysPct: ratios.methionineCysteine,
        threonineToLysPct: ratios.threonine,
        tryptophanToLysPct: ratios.tryptophan,
        valineToLysPct: ratios.valine,
        isoleucineToLysPct: ratios.isoleucine,
        leucineToLysPct: ratios.leucine,
        histidineToLysPct: ratios.histidine,
        phenylalanineTyrosineToLysPct: ratios.phenylalanineTyrosine,
      },
      linoleicAcidPct: source.recommendedSpecifications.linoleicAcidPct,
      minerals: {
        sttdPhosphorusPct,
        availablePhosphorusPct,
        sodiumPct: source.minerals.sodiumPct,
        chloridePct: source.minerals.chloridePct,
      },
      practical: {
        lLysineHclMaxPct: source.recommendedSpecifications.lLysineHclMaxPct,
        neutralDetergentFibreMinPct:
          source.recommendedSpecifications.neutralDetergentFibreMinPct,
        calciumToTotalPhosphorusMinRatio:
          source.minerals.analyzedCalciumToPhosphorusRatio,
      },
      energyRelative: {
        sidLysineGPerMcal: source.sidLysineGPerMcal,
        sttdPhosphorusGPerMcal: source.phosphorusGPerMcal.sttd,
        availablePhosphorusGPerMcal: source.phosphorusGPerMcal.available,
      },
    },
  };

  return {
    id: "pic-mature-boar",
    name: source.name,
    source: `${PIC_MATURE_BOAR_SOURCE.publisher} — ${PIC_MATURE_BOAR_SOURCE.title}`,
    sourceVersion: PIC_MATURE_BOAR_SOURCE.version,
    sourceSections: PIC_MATURE_BOAR_SOURCE.sections,
    species: "swine",
    performance: "breeder",
    phases: [phase],
  };
}

export const PIC_MATURE_BOAR_NUTRITION = buildPicMatureBoarProgramme();

export const BRAZILIAN_2024_GESTATION_NUTRITION = buildBreederProgramme("gestation");
export const BRAZILIAN_2024_LACTATION_NUTRITION = buildBreederProgramme("lactation");

export const BRAZILIAN_2024_LACTATION_25C_NUTRITION: NutritionProgramme = {
  id: "brazilian-2024-breeder-lactation-25c",
  name: "Brazilian Tables 2024 — Lactating gilts and sows (25 °C)",
  source: BRAZILIAN_2024_SOURCE.title,
  sourceVersion: `5th edition (${BRAZILIAN_2024_SOURCE.year})`,
  sourceSections: [
    "Chapter 6 — Nutritional Requirements of Swine Breeders",
    `Table ${BRAZILIAN_2024_BREEDER_SWINE.lactation25C.sourceTable}`,
    `Table ${BRAZILIAN_2024_BREEDER_SWINE.lactation25C.aminoAcidRatios.sourceTable}`,
  ],
  species: "swine",
  performance: "breeder",
  phases: BRAZILIAN_2024_BREEDER_SWINE.lactation25C.phases.map((phase) =>
    normalizeBreederPhase(BRAZILIAN_2024_BREEDER_SWINE.lactation25C.sourceTable, phase),
  ),
};

type BroilerProgramme = typeof BRAZILIAN_2024_BROILER_STANDARD_PERFORMANCE;
type BroilerPhase = BroilerProgramme["phases"][number];

function ratioToLysinePct(value: number, lysine: number): number {
  return Math.round((value / lysine) * 1000) / 10;
}

function normalizeBroilerPhase(
  programme: BroilerProgramme,
  phase: BroilerPhase,
  lookupMinWeightKg: number,
  lookupMaxWeightKg: number,
): NutritionPhase {
  const { min: sourceMinWeightKg, max: sourceMaxWeightKg } = phase.weightKg;
  const { min: ageMinDays, max: ageMaxDays } = phase.ageDays;
  const sid = phase.sidAminoAcidsPct;
  const nutrients = phase.nutrientsPct;
  const suffix = phase.id.slice(programme.id.length + 1);

  return {
    id: `br2024-${programme.sourceTable.replace(".", "-")}-${suffix}`,
    label: `${phase.phase.replace("-", " ")}: days ${ageMinDays}–${ageMaxDays} (${sourceMinWeightKg}–${sourceMaxWeightKg} kg)`,
    variant: "default",
    species: "broiler",
    phaseClass: phase.phase,
    ageMinDays,
    ageMaxDays,
    periodLabel: `Age ${ageMinDays}–${ageMaxDays} days`,
    dailyFeedIntakeKg: phase.intakeGDay / 1000,
    dailyMetabolizableEnergyKcal: phase.dailyRequirements.metabolizableEnergyKcalDay,
    sourceTable: programme.sourceTable,
    sourcePage: programme.printedPage,
    sourceMinWeightKg,
    sourceMaxWeightKg,
    sourceWeightRange: `${sourceMinWeightKg}–${sourceMaxWeightKg} kg`,
    lookupMinWeightKg,
    lookupMaxWeightKg,
    requirements: {
      metabolizableEnergyKcalKg: phase.diet.metabolizableEnergyKcalKg,
      netEnergyKcalKg: phase.diet.netEnergyKcalKg,
      sidLysinePct: sid.lysine,
      sidAminoAcidsPct: {
        lysine: sid.lysine,
        methionineCysteine: sid.methionineCysteine,
        threonine: sid.threonine,
        tryptophan: sid.tryptophan,
        valine: sid.valine,
        isoleucine: sid.isoleucine,
        leucine: sid.leucine,
        histidine: sid.histidine,
        phenylalanineTyrosine: sid.phenylalanineTyrosine,
      },
      // The broiler tables publish concentrations, not ratios; derive the
      // ideal-protein ratios for display.
      aminoAcids: {
        methionineCysteineToLysPct: ratioToLysinePct(sid.methionineCysteine, sid.lysine),
        threonineToLysPct: ratioToLysinePct(sid.threonine, sid.lysine),
        tryptophanToLysPct: ratioToLysinePct(sid.tryptophan, sid.lysine),
        valineToLysPct: ratioToLysinePct(sid.valine, sid.lysine),
        isoleucineToLysPct: ratioToLysinePct(sid.isoleucine, sid.lysine),
        leucineToLysPct: ratioToLysinePct(sid.leucine, sid.lysine),
        histidineToLysPct: ratioToLysinePct(sid.histidine, sid.lysine),
        phenylalanineTyrosineToLysPct: ratioToLysinePct(sid.phenylalanineTyrosine, sid.lysine),
      },
      crudeProteinPct: phase.crudeProteinPct,
      digestibleProteinPct: phase.digestibleProteinPct,
      potassiumPct: nutrients.potassium,
      linoleicAcidPct: nutrients.linoleicAcid,
      minerals: {
        calciumPct: nutrients.calcium,
        availablePhosphorusPct: nutrients.availablePhosphorus,
        // The published poultry digestible-phosphorus requirement is not
        // enforced: Table 1.10 inorganic phosphates carry no poultry
        // digestible-P value, so every diet using them would be incomplete.
        // Available phosphorus is published for those sources and is used.
        sodiumPct: nutrients.sodium,
        chloridePct: nutrients.chloride,
      },
      practical: {},
    },
  };
}

function buildBroilerProgramme(
  source: BroilerProgramme,
  name: string,
): NutritionProgramme {
  const phases = source.phases.map((phase, index) => {
    const previous = source.phases[index - 1];
    const next = source.phases[index + 1];
    const lookupMin =
      previous === undefined
        ? 0
        : Math.max(previous.weightKg.max, phase.weightKg.min);
    const lookupMax =
      next === undefined
        ? phase.weightKg.max
        : Math.max(phase.weightKg.max, next.weightKg.min);
    return normalizeBroilerPhase(source, phase, lookupMin, lookupMax);
  });

  return {
    id: source.id,
    name,
    source: BRAZILIAN_2024_SOURCE.title,
    sourceVersion: `5th edition (${BRAZILIAN_2024_SOURCE.year})`,
    sourceSections: [`Chapter ${source.chapter} — Broilers`, `Table ${source.sourceTable}`],
    species: "broiler",
    performance: source.population.performance,
    phases,
  };
}

export const BRAZILIAN_2024_BROILER_STANDARD_NUTRITION = buildBroilerProgramme(
  BRAZILIAN_2024_BROILER_STANDARD_PERFORMANCE,
  "Brazilian Tables 2024 — Standard performance broilers (as-hatched)",
);

export const BRAZILIAN_2024_BROILER_HIGH_NUTRITION = buildBroilerProgramme(
  BRAZILIAN_2024_BROILER_HIGH_PERFORMANCE,
  "Brazilian Tables 2024 — High performance broilers (as-hatched)",
);

export const BRAZILIAN_2024_BROILER_HIGH_HOT_NUTRITION = buildBroilerProgramme(
  BRAZILIAN_2024_BROILER_HIGH_PERFORMANCE_HOT,
  "Brazilian Tables 2024 — High performance broilers (as-hatched, 26 °C)",
);

/**
 * Until PigFlow exposes a project-level performance-programme selector, the
 * standard-performance mixed-sex table is the default. Callers can pass the
 * high-performance programme explicitly.
 */
export const DEFAULT_GROWTH_NUTRITION_PROGRAMME =
  BRAZILIAN_2024_STANDARD_GROWTH_NUTRITION;

export function nutritionPhasesAtSourceWeight(
  weightKg: number,
  programme: NutritionProgramme = DEFAULT_GROWTH_NUTRITION_PROGRAMME,
): readonly NutritionPhase[] {
  assertWeight(weightKg);
  return programme.phases.filter(
    ({ sourceMinWeightKg, sourceMaxWeightKg }) =>
      weightKg >= sourceMinWeightKg && weightKg <= sourceMaxWeightKg,
  );
}

export function nutritionPhaseAtWeight(
  weightKg: number,
  programme: NutritionProgramme = DEFAULT_GROWTH_NUTRITION_PROGRAMME,
): NutritionPhase {
  assertWeight(weightKg);
  const phase = programme.phases.find(
    ({ lookupMinWeightKg, lookupMaxWeightKg }, index) =>
      weightKg >= lookupMinWeightKg &&
      (weightKg < lookupMaxWeightKg ||
        (index === programme.phases.length - 1 && weightKg <= lookupMaxWeightKg)),
  );
  if (!phase) {
    throw new Error(
      `No Brazilian 2024 nutrition phase covers ${weightKg} kg in ${programme.id}.`,
    );
  }
  return phase;
}

export function nutritionPhaseForVariant(
  weightKg: number,
  variant: NutritionVariant,
  programme: NutritionProgramme = DEFAULT_GROWTH_NUTRITION_PROGRAMME,
): NutritionPhase {
  if (variant !== "default") {
    throw new Error(`Unsupported nutrition variant: ${variant}.`);
  }
  return nutritionPhaseAtWeight(weightKg, programme);
}

export type GrowthStageNutrition = {
  growthStage: NutritionGrowthStage;
  weightKg: number;
  programmeId: string;
  phase: NutritionPhase;
};

export function nutritionForGrowthStage(
  growthStage: NutritionGrowthStage,
  weightKg: number,
  programme: NutritionProgramme = DEFAULT_GROWTH_NUTRITION_PROGRAMME,
): GrowthStageNutrition {
  return {
    growthStage,
    weightKg,
    programmeId: programme.id,
    phase: nutritionPhaseAtWeight(weightKg, programme),
  };
}

function assertWeight(weightKg: number): void {
  if (!Number.isFinite(weightKg) || weightKg < 0) {
    throw new Error("Nutrition lookup requires a non-negative finite liveweight.");
  }
}

import { z } from "zod";

import broilerHighPerformanceJson from "@/data/nutrition/brazilian-2024/programmes/broilers/high-performance-as-hatched.json";
import broilerHotHighPerformanceJson from "@/data/nutrition/brazilian-2024/programmes/broilers/high-performance-as-hatched-hot-26c.json";
import broilerStandardPerformanceJson from "@/data/nutrition/brazilian-2024/programmes/broilers/standard-performance-as-hatched.json";

import { requireSourceAnomaly } from "./brazilian-source";
import {
  INGREDIENT_LIBRARY_SOURCE,
  ingredientLibraryForSpecies,
  type IngredientNutrientRecord,
  type IngredientNutritionProfile,
  type IngredientSourceRecord,
} from "./ingredient-nutrients";
import { assertUniqueIds } from "./nutrition-validation";

const percentSchema = z.number().min(0).max(100);
const positiveNumberSchema = z.number().positive();

const closedRangeSchema = z
  .object({
    min: z.number(),
    max: z.number(),
  })
  .strict()
  .refine((value) => value.min <= value.max, {
    message: "Range min must not exceed max.",
  });

/**
 * Broiler age bands are printed with a shared boundary (for example 0-8, 8-17).
 * FeedSport treats non-final phases as half-open intervals: [min, max), so a
 * shared boundary day belongs only to the following phase. The final phase
 * additionally includes its published max day so the programme covers its
 * complete published age range.
 */
const halfOpenAgeRangeSchema = z
  .object({
    min: z.number(),
    max: z.number(),
  })
  .strict()
  .refine((value) => value.min < value.max, {
    message: "Age range min must be less than max.",
  });

const broilerAminoAcidsSchema = z
  .object({
    lysine: percentSchema,
    methionine: percentSchema,
    methionineCysteine: percentSchema,
    threonine: percentSchema,
    tryptophan: percentSchema,
    arginine: percentSchema,
    glycineSerine: percentSchema,
    valine: percentSchema,
    isoleucine: percentSchema,
    leucine: percentSchema,
    histidine: percentSchema,
    phenylalanine: percentSchema,
    phenylalanineTyrosine: percentSchema,
  })
  .strict();

const broilerPhaseSchema = z
  .object({
    id: z.string(),
    phase: z.enum(["pre-starter", "starter", "grower", "finisher"]),
    ageDays: halfOpenAgeRangeSchema,
    weightKg: closedRangeSchema,
    averageWeightKg: positiveNumberSchema,
    gainGDay: positiveNumberSchema,
    intakeGDay: positiveNumberSchema,
    dailyRequirements: z
      .object({
        sidLysineGDay: positiveNumberSchema,
        availablePhosphorusGDay: positiveNumberSchema,
        digestiblePhosphorusGDay: positiveNumberSchema,
        metabolizableEnergyKcalDay: positiveNumberSchema,
      })
      .strict(),
    diet: z
      .object({
        metabolizableEnergyKcalKg: positiveNumberSchema,
        netEnergyKcalKg: positiveNumberSchema,
      })
      .strict(),
    nutrientsPct: z
      .object({
        calcium: percentSchema,
        availablePhosphorus: percentSchema,
        digestiblePhosphorus: percentSchema,
        potassium: percentSchema,
        sodium: percentSchema,
        chloride: percentSchema,
        linoleicAcid: percentSchema,
      })
      .strict(),
    digestibleProteinPct: percentSchema,
    sidAminoAcidsPct: broilerAminoAcidsSchema,
    crudeProteinPct: percentSchema,
    totalAminoAcidsPct: broilerAminoAcidsSchema,
    sourceAnomalyIds: z.array(z.string()).optional(),
  })
  .strict();

const broilerProgrammeSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string(),
    sourceId: z.literal("brazilian-tables-2024"),
    chapter: z.literal(2),
    species: z.literal("broiler"),
    sourceTable: z.enum(["2.28", "2.29", "2.30"]),
    printedPage: z.number().int().positive(),
    population: z
      .object({
        performance: z.enum(["high", "standard"]),
        sex: z.literal("as-hatched"),
        temperature: z.enum(["thermoneutral", "hot"]),
        averageTemperatureC: z.number().optional(),
        temperatureRangeC: closedRangeSchema.optional(),
      })
      .strict(),
    phases: z.array(broilerPhaseSchema),
    sourceAnomalyIds: z.array(z.string()).optional(),
  })
  .strict()
  .superRefine((programme, context) => {
    const { temperature, averageTemperatureC, temperatureRangeC } = programme.population;

    if (temperature === "hot") {
      if (averageTemperatureC === undefined || temperatureRangeC === undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["population", "temperature"],
          message: "Hot-climate programmes require averageTemperatureC and temperatureRangeC.",
        });
      } else if (
        averageTemperatureC < temperatureRangeC.min ||
        averageTemperatureC > temperatureRangeC.max
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["population", "averageTemperatureC"],
          message: "Average temperature must fall within temperatureRangeC.",
        });
      }
    } else if (averageTemperatureC !== undefined || temperatureRangeC !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["population", "temperature"],
        message: "Thermoneutral programmes must not define hot-climate temperature fields.",
      });
    }
  });

const POULTRY_LIBRARY = ingredientLibraryForSpecies("poultry");

const POULTRY_AMINO_ACID_KEYS = new Set([
  "crudeProtein",
  "lysine",
  "methionine",
  "methionineCysteine",
  "threonine",
  "tryptophan",
  "arginine",
  "glycineSerine",
  "valine",
  "isoleucine",
  "leucine",
  "histidine",
  "phenylalanine",
  "phenylalanineTyrosine",
  "alanine",
  "cysteine",
  "tyrosine",
  "glycine",
  "serine",
  "proline",
]);

function validateAnomalyReferencesForIngredient(
  ingredient: IngredientSourceRecord,
  profile: IngredientNutritionProfile,
): void {
  for (const id of profile.sourceAnomalyIds ?? []) {
    const anomaly = requireSourceAnomaly(id);
    const appliesToIngredient =
      (anomaly.target.kind === "poultry-ingredient-nutrient" ||
        anomaly.target.kind === "poultry-ingredient-nutrient-group") &&
      anomaly.target.ingredientId === ingredient.id;

    if (anomaly.table !== "1.01" || !appliesToIngredient) {
      throw new Error(
        `Source anomaly "${id}" does not apply to poultry ingredient "${ingredient.id}".`,
      );
    }
  }
}

function hasAminoAcidAnomaly(
  ingredientId: string,
  nutrient: string,
  ids: readonly string[] | undefined,
): boolean {
  return (ids ?? []).some((id) => {
    const anomaly = requireSourceAnomaly(id);
    if (anomaly.table !== "1.01") return false;

    if (
      anomaly.target.kind === "poultry-ingredient-nutrient" &&
      anomaly.target.ingredientId === ingredientId &&
      anomaly.target.nutrient === nutrient &&
      anomaly.target.check === "amino-acid-digestibility"
    ) {
      return true;
    }

    return (
      anomaly.target.kind === "poultry-ingredient-nutrient-group" &&
      anomaly.target.ingredientId === ingredientId &&
      anomaly.target.nutrients.includes(nutrient) &&
      anomaly.target.check === "published-repeated-digestibility-coefficients"
    );
  });
}

function validatePoultryIngredientRelations(ingredient: IngredientSourceRecord): void {
  const profile = ingredient.nutrition.poultry;
  if (!profile) return;

  validateAnomalyReferencesForIngredient(ingredient, profile);

  const minerals = profile.macroMinerals;
  if (
    minerals.phosphorusDigestibilityPct !== undefined &&
    minerals.digestiblePhosphorusPct !== undefined
  ) {
    const totalPhosphorus = minerals.totalPhosphorusPct;
    if (!totalPhosphorus) {
      throw new Error(
        `Total phosphorus is missing for poultry ingredient "${ingredient.id}".`,
      );
    }
    const calculated = (minerals.digestiblePhosphorusPct / totalPhosphorus) * 100;
    if (Math.abs(calculated - minerals.phosphorusDigestibilityPct) > 5) {
      throw new Error(
        `Poultry phosphorus digestibility for ${ingredient.id} is inconsistent: ` +
          `stored ${minerals.phosphorusDigestibilityPct}%, calculated about ${calculated.toFixed(1)}%.`,
      );
    }
  }

  const sidValues = profile.aminoAcids.sidPct;
  const digestibilityValues = profile.aminoAcids.sidDigestibilityPct;
  const sidKeys = Object.keys(sidValues);
  const digestibilityKeys = Object.keys(digestibilityValues);

  for (const key of [...sidKeys, ...digestibilityKeys]) {
    if (!POULTRY_AMINO_ACID_KEYS.has(key)) {
      throw new Error(`Unknown poultry amino-acid key "${key}" for "${ingredient.id}".`);
    }
  }

  if (
    sidKeys.length !== digestibilityKeys.length ||
    sidKeys.some((key) => digestibilityValues[key] === undefined)
  ) {
    throw new Error(
      `Poultry SID values and digestibility coefficients must have identical nutrient keys for "${ingredient.id}".`,
    );
  }

  for (const nutrient of sidKeys) {
    const sidValue = sidValues[nutrient];
    const digestibility = digestibilityValues[nutrient];
    const totalValue =
      nutrient === "crudeProtein"
        ? profile.composition.crudeProteinPct
        : profile.aminoAcids.totalPct[nutrient];

    if (totalValue === undefined) {
      throw new Error(
        `Total ${nutrient} is missing for poultry ingredient "${ingredient.id}".`,
      );
    }

    const calculated = (sidValue / totalValue) * 100;
    if (
      Math.abs(calculated - digestibility) > 6 &&
      !hasAminoAcidAnomaly(ingredient.id, nutrient, profile.sourceAnomalyIds)
    ) {
      throw new Error(
        `Poultry ${nutrient} digestibility for ${ingredient.id} is inconsistent: ` +
          `stored ${digestibility}%, calculated about ${calculated.toFixed(1)}%.`,
      );
    }
  }
}

function validateProgrammeAnomalyReferences(
  programme: z.infer<typeof broilerProgrammeSchema>,
): void {
  for (const id of programme.sourceAnomalyIds ?? []) {
    const anomaly = requireSourceAnomaly(id);
    if (
      anomaly.table !== programme.sourceTable ||
      anomaly.target.kind !== "broiler-programme" ||
      anomaly.target.programmeId !== programme.id
    ) {
      throw new Error(
        `Source anomaly "${id}" does not apply to broiler programme "${programme.id}".`,
      );
    }
  }

  for (const phase of programme.phases) {
    for (const id of phase.sourceAnomalyIds ?? []) {
      const anomaly = requireSourceAnomaly(id);
      if (
        anomaly.table !== programme.sourceTable ||
        anomaly.target.kind !== "broiler-phase" ||
        anomaly.target.programmeId !== programme.id ||
        anomaly.target.phaseId !== phase.id
      ) {
        throw new Error(
          `Source anomaly "${id}" does not apply to broiler phase "${phase.id}".`,
        );
      }
    }
  }
}

function hasWeightBandAnomaly(
  programme: z.infer<typeof broilerProgrammeSchema>,
  phase: z.infer<typeof broilerPhaseSchema>,
): boolean {
  return (phase.sourceAnomalyIds ?? []).some((id) => {
    const anomaly = requireSourceAnomaly(id);
    return (
      anomaly.table === programme.sourceTable &&
      anomaly.target.kind === "broiler-phase" &&
      anomaly.target.programmeId === programme.id &&
      anomaly.target.phaseId === phase.id &&
      anomaly.target.check === "average-weight-within-band"
    );
  });
}

function validateProgrammePhases(
  programme: z.infer<typeof broilerProgrammeSchema>,
): void {
  assertUniqueIds(programme.phases, `Brazilian 2024 broiler programme ${programme.id}`);

  for (let index = 0; index < programme.phases.length; index += 1) {
    const phase = programme.phases[index];

    if (!phase.id.startsWith(`${programme.id}:`)) {
      throw new Error(
        `Broiler phase ID "${phase.id}" must be qualified by programme "${programme.id}".`,
      );
    }

    const outsideWeightBand =
      phase.averageWeightKg < phase.weightKg.min || phase.averageWeightKg > phase.weightKg.max;
    if (outsideWeightBand && !hasWeightBandAnomaly(programme, phase)) {
      throw new Error(
        `Average weight for broiler phase "${phase.id}" falls outside its published weight band.`,
      );
    }

    if (index > 0) {
      const previous = programme.phases[index - 1];
      if (previous.ageDays.max !== phase.ageDays.min) {
        throw new Error(
          `Broiler programme "${programme.id}" has an age gap or overlap between "${previous.id}" and "${phase.id}".`,
        );
      }
      if (previous.ageDays.min >= phase.ageDays.min) {
        throw new Error(
          `Broiler programme "${programme.id}" phases are not in chronological order.`,
        );
      }
    }
  }
}

export type BroilerPhaseClass = "pre-starter" | "starter" | "grower" | "finisher";
export type BroilerInclusionLimitClass = "starter" | "grower";

export const BROILER_INCLUSION_LIMIT_CLASS: Record<
  BroilerPhaseClass,
  BroilerInclusionLimitClass
> = {
  "pre-starter": "starter",
  starter: "starter",
  grower: "grower",
  finisher: "grower",
};

export function broilerInclusionLimitClassForPhase(
  phase: BroilerPhaseClass,
): BroilerInclusionLimitClass {
  return BROILER_INCLUSION_LIMIT_CLASS[phase];
}

export type PoultryFormulationEnergy = {
  kcalKg: number;
  basis: "metabolizable";
};

/**
 * Return energy only when Table 1.01 publishes poultry metabolizable energy.
 * Standardized ME remains in the species profile but is never substituted.
 */
export function poultryFormulationEnergy(
  ingredient: IngredientNutrientRecord,
): PoultryFormulationEnergy | null {
  if (ingredient.species !== "poultry") {
    throw new Error(
      `poultryFormulationEnergy requires a poultry ingredient record, received "${ingredient.species}".`,
    );
  }

  const metabolizable = ingredient.energy.metabolizableKcalKg;
  if (metabolizable === undefined) return null;
  return { kcalKg: metabolizable, basis: "metabolizable" };
}

export function findBroilerPhaseByAge(
  programme: z.infer<typeof broilerProgrammeSchema>,
  ageDays: number,
): z.infer<typeof broilerPhaseSchema> | undefined {
  const lastIndex = programme.phases.length - 1;

  return programme.phases.find((phase, index) => {
    const includesStart = ageDays >= phase.ageDays.min;
    const beforeEnd = ageDays < phase.ageDays.max;
    const isFinalPublishedDay = index === lastIndex && ageDays === phase.ageDays.max;
    return includesStart && (beforeEnd || isFinalPublishedDay);
  });
}

export const BRAZILIAN_2024_POULTRY_INGREDIENT_LIBRARY = POULTRY_LIBRARY;

export const BRAZILIAN_2024_BROILER_HIGH_PERFORMANCE =
  broilerProgrammeSchema.parse(broilerHighPerformanceJson);
export const BRAZILIAN_2024_BROILER_HIGH_PERFORMANCE_HOT =
  broilerProgrammeSchema.parse(broilerHotHighPerformanceJson);
export const BRAZILIAN_2024_BROILER_STANDARD_PERFORMANCE =
  broilerProgrammeSchema.parse(broilerStandardPerformanceJson);

export const BRAZILIAN_2024_BROILER_PROGRAMMES = [
  BRAZILIAN_2024_BROILER_HIGH_PERFORMANCE,
  BRAZILIAN_2024_BROILER_HIGH_PERFORMANCE_HOT,
  BRAZILIAN_2024_BROILER_STANDARD_PERFORMANCE,
] as const;

assertUniqueIds(
  INGREDIENT_LIBRARY_SOURCE.ingredients,
  "FeedSport ingredient library",
);
for (const ingredient of INGREDIENT_LIBRARY_SOURCE.ingredients) {
  validatePoultryIngredientRelations(ingredient);
}

assertUniqueIds(BRAZILIAN_2024_BROILER_PROGRAMMES, "Brazilian 2024 broiler programmes");
for (const programme of BRAZILIAN_2024_BROILER_PROGRAMMES) {
  validateProgrammeAnomalyReferences(programme);
  validateProgrammePhases(programme);
}

assertUniqueIds(
  BRAZILIAN_2024_BROILER_PROGRAMMES.flatMap((programme) => programme.phases),
  "Brazilian 2024 broiler phases across programmes",
);

import { z } from "zod";

import poultryCoreFeedstuffsJson from "@/data/nutrition/brazilian-2024/ingredients/poultry/core-feedstuffs.json";
import broilerHighPerformanceJson from "@/data/nutrition/brazilian-2024/programmes/broilers/high-performance-as-hatched.json";
import broilerHotHighPerformanceJson from "@/data/nutrition/brazilian-2024/programmes/broilers/high-performance-as-hatched-hot-26c.json";
import broilerStandardPerformanceJson from "@/data/nutrition/brazilian-2024/programmes/broilers/standard-performance-as-hatched.json";

import { BRAZILIAN_2024_CORE_FEEDSTUFFS } from "./brazilian-nutrition";
import { assertKnownSourceAnomalyIds } from "./brazilian-source";

const percentSchema = z.number().min(0).max(100);
const positiveNumberSchema = z.number().positive();

const inclusionRecommendationSchema = z
  .object({
    practical: percentSchema,
    max: percentSchema,
  })
  .strict()
  .refine((value) => value.practical <= value.max, {
    message: "Practical inclusion must not exceed the maximum inclusion.",
  });

const poultryFeedstuffSchema = z
  .object({
    id: z.string(),
    sourceAnomalyIds: z.array(z.string()).optional(),
    phosphorus: z
      .object({
        digestibilityPct: percentSchema.optional(),
        standardizedDigestiblePct: percentSchema.optional(),
      })
      .strict()
      .refine(
        (value) =>
          value.digestibilityPct !== undefined || value.standardizedDigestiblePct !== undefined,
        { message: "Poultry phosphorus must contain a species-specific value." },
      )
      .optional(),
    aminoAcids: z
      .object({
        sidPoultryPct: z.record(z.string(), percentSchema),
        sidPoultryDigestibilityPct: z.record(z.string(), percentSchema),
      })
      .strict()
      .optional(),
    recommendedInclusionPct: z
      .object({
        broilers: z
          .object({
            starter: inclusionRecommendationSchema.optional(),
            grower: inclusionRecommendationSchema.optional(),
          })
          .strict(),
      })
      .strict()
      .optional(),
    poultryEnergyKcalKg: z
      .object({
        metabolizable: positiveNumberSchema.optional(),
        standardizedMetabolizable: positiveNumberSchema.optional(),
        net: positiveNumberSchema.optional(),
      })
      .strict(),
  })
  .strict();

const poultryCoreFeedstuffsSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.literal("brazilian-2024-poultry-core-feedstuffs"),
    sourceId: z.literal("brazilian-tables-2024"),
    sourceTable: z.literal("1.01"),
    species: z.literal("poultry"),
    basis: z.literal("as-fed"),
    model: z.literal("species-overlay"),
    notes: z.array(z.string()),
    ingredients: z.array(poultryFeedstuffSchema),
  })
  .strict();

const closedRangeSchema = z
  .object({
    min: z.number(),
    max: z.number(),
  })
  .strict()
  .refine((value) => value.min <= value.max, {
    message: "Range min must not exceed max.",
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
    ageDays: closedRangeSchema,
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
  .strict()
  .superRefine((phase, context) => {
    const outsidePublishedBand =
      phase.averageWeightKg < phase.weightKg.min || phase.averageWeightKg > phase.weightKg.max;
    if (outsidePublishedBand && !phase.sourceAnomalyIds?.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["averageWeightKg"],
        message:
          "Average weight outside the published weight band requires a source anomaly reference.",
      });
    }
  });

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

function assertUniqueIds(values: readonly { id: string }[], label: string): void {
  const ids = values.map((value) => value.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error(`Duplicate IDs in ${label}.`);
  }
}

const canonicalById = new Map(
  BRAZILIAN_2024_CORE_FEEDSTUFFS.ingredients.map((ingredient) => [ingredient.id, ingredient]),
);

function requireCanonicalIngredient(id: string) {
  const ingredient = canonicalById.get(id);
  if (!ingredient) {
    throw new Error(`Poultry ingredient "${id}" has no canonical Brazilian Table 1.01 record.`);
  }
  return ingredient;
}

function hasSourceAnomaly(ids: readonly string[] | undefined): boolean {
  return Boolean(ids?.length);
}

function validatePoultryIngredientRelations(
  ingredient: z.infer<typeof poultryFeedstuffSchema>,
): void {
  const canonical = requireCanonicalIngredient(ingredient.id);
  assertKnownSourceAnomalyIds(ingredient.sourceAnomalyIds, `poultry ingredient ${ingredient.id}`);

  const p = ingredient.phosphorus;
  const totalPhosphorus = canonical.macroMineralsPct.totalPhosphorus;
  if (
    p?.digestibilityPct !== undefined &&
    p.standardizedDigestiblePct !== undefined &&
    totalPhosphorus
  ) {
    const calculated = (p.standardizedDigestiblePct / totalPhosphorus) * 100;
    if (Math.abs(calculated - p.digestibilityPct) > 5 && !hasSourceAnomaly(ingredient.sourceAnomalyIds)) {
      throw new Error(
        `Poultry phosphorus digestibility for ${ingredient.id} is inconsistent: ` +
          `stored ${p.digestibilityPct}%, calculated about ${calculated.toFixed(1)}%.`,
      );
    }
  }

  if (!ingredient.aminoAcids) return;

  const totalAminoAcids = canonical.aminoAcids.totalPct;
  for (const [nutrient, sidValue] of Object.entries(ingredient.aminoAcids.sidPoultryPct)) {
    const digestibility = ingredient.aminoAcids.sidPoultryDigestibilityPct[nutrient];
    const totalValue =
      nutrient === "crudeProtein"
        ? canonical.compositionPct.crudeProtein
        : totalAminoAcids[nutrient];

    if (digestibility === undefined || !totalValue) continue;

    const calculated = (sidValue / totalValue) * 100;
    if (
      Math.abs(calculated - digestibility) > 6 &&
      !hasSourceAnomaly(ingredient.sourceAnomalyIds)
    ) {
      throw new Error(
        `Poultry ${nutrient} digestibility for ${ingredient.id} is inconsistent: ` +
          `stored ${digestibility}%, calculated about ${calculated.toFixed(1)}%.`,
      );
    }
  }
}

export const BRAZILIAN_2024_POULTRY_CORE_FEEDSTUFFS =
  poultryCoreFeedstuffsSchema.parse(poultryCoreFeedstuffsJson);

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
  BRAZILIAN_2024_POULTRY_CORE_FEEDSTUFFS.ingredients,
  "Brazilian 2024 poultry feedstuffs",
);
for (const ingredient of BRAZILIAN_2024_POULTRY_CORE_FEEDSTUFFS.ingredients) {
  validatePoultryIngredientRelations(ingredient);
}

assertUniqueIds(BRAZILIAN_2024_BROILER_PROGRAMMES, "Brazilian 2024 broiler programmes");
for (const programme of BRAZILIAN_2024_BROILER_PROGRAMMES) {
  assertKnownSourceAnomalyIds(
    programme.sourceAnomalyIds,
    `Brazilian 2024 broiler programme ${programme.id}`,
  );
  assertUniqueIds(programme.phases, `Brazilian 2024 broiler programme ${programme.id}`);
  for (const phase of programme.phases) {
    assertKnownSourceAnomalyIds(
      phase.sourceAnomalyIds,
      `Brazilian 2024 broiler phase ${programme.id}/${phase.id}`,
    );
  }
}

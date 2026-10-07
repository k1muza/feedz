import { z } from "zod";

import coreFeedstuffsJson from "@/data/nutrition/brazilian-2024/ingredients/core-feedstuffs.json";

import { assertUniqueIds } from "./nutrition-validation";

const inclusionRecommendationSchema = z
  .object({
    practical: z.number().min(0).max(100),
    max: z.number().min(0).max(100),
  })
  .strict()
  .refine((value) => value.practical <= value.max, {
    message: "Practical inclusion must not exceed the maximum inclusion.",
  });

const coreFeedstuffSchema = z.object({
  id: z.string(),
  name: z.string(),
  pigflowIngredientId: z.string().optional(),
  mappingConfidence: z.enum(["high", "unmapped"]),
  sourcePage: z.number(),
  notes: z.array(z.string()).optional(),
  digestibleProteinSwinePct: z.number().optional(),
  compositionPct: z.record(z.string(), z.number()),
  swineEnergyKcalKg: z.object({
    digestible: z.number(),
    metabolizable: z.number(),
    net: z.number(),
  }),
  sowEnergyKcalKg: z.object({
    digestible: z.number(),
    metabolizable: z.number(),
    net: z.number(),
  }),
  macroMineralsPct: z.record(z.string(), z.number()),
  traceMineralsMgKg: z.record(z.string(), z.number()),
  aminoAcids: z.object({
    totalPct: z.record(z.string(), z.number()),
    sidSwinePct: z.record(z.string(), z.number()),
    sidSwineDigestibilityPct: z.record(z.string(), z.number()),
  }),
  recommendedInclusionPct: z
    .object({
      growingPigs: z
        .object({
          starter: inclusionRecommendationSchema,
          grower: inclusionRecommendationSchema,
          finisher: inclusionRecommendationSchema,
        })
        .partial()
        .strict()
        .optional(),
      sows: z
        .object({
          gestation: inclusionRecommendationSchema,
          lactation: inclusionRecommendationSchema,
        })
        .partial()
        .strict()
        .optional(),
    })
    .strict()
    .optional(),
});

const coreFeedstuffsSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.literal("brazilian-2024-core-feedstuffs"),
  sourceId: z.literal("brazilian-tables-2024"),
  sourceTable: z.literal("1.01"),
  basis: z.literal("as-fed"),
  mappingPolicy: z.string(),
  ingredients: z.array(coreFeedstuffSchema),
});

export const BRAZILIAN_2024_CORE_FEEDSTUFFS = coreFeedstuffsSchema.parse(coreFeedstuffsJson);

assertUniqueIds(BRAZILIAN_2024_CORE_FEEDSTUFFS.ingredients, "Brazilian 2024 feedstuffs");

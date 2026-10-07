import { z } from "zod";

import sourceJson from "@/data/nutrition/brazilian-2024/source.json";
import growingSwineJson from "@/data/nutrition/brazilian-2024/programmes/growing-swine.json";
import breederSwineJson from "@/data/nutrition/brazilian-2024/programmes/breeder-swine.json";
import swineSupplementationJson from "@/data/nutrition/brazilian-2024/programmes/swine-supplementation.json";
import coreFeedstuffsJson from "@/data/nutrition/brazilian-2024/ingredients/core-feedstuffs.json";
import crystallineAminoAcidsJson from "@/data/nutrition/brazilian-2024/supplements/crystalline-amino-acids.json";
import mineralSourcesJson from "@/data/nutrition/brazilian-2024/supplements/mineral-sources.json";

const rangeSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
});

const vitaminSupplementationSchema = z.object({
  vitaminAIuKg: z.number(),
  vitaminDIuKg: z.number(),
  vitaminEIuKg: z.number(),
  vitaminKMgKg: z.number(),
  vitaminB1MgKg: z.number(),
  riboflavinMgKg: z.number(),
  vitaminB6MgKg: z.number(),
  vitaminB12McgKg: z.number(),
  pantothenicAcidMgKg: z.number(),
  niacinMgKg: z.number(),
  folicAcidMgKg: z.number(),
  biotinMgKg: z.number(),
  totalCholineMgKg: z.number(),
});

const traceMineralSupplementationSchema = z.object({
  copperPpm: z.number(),
  ironPpm: z.number(),
  manganesePpm: z.number(),
  seleniumPpm: z.number(),
  zincPpm: z.number(),
  iodinePpm: z.number().optional(),
});

const swineSupplementationSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.literal("brazilian-2024-swine-supplementation"),
  sourceId: z.literal("brazilian-tables-2024"),
  growing: z.object({
    vitaminSourceTable: z.literal("7.05"),
    traceMineralSourceTable: z.literal("7.06"),
    vitaminPrintedPage: z.literal(473),
    traceMineralPrintedPage: z.literal(474),
    phases: z.array(
      z.object({
        ageDays: rangeSchema,
        weightKg: rangeSchema,
        vitamins: vitaminSupplementationSchema,
        inorganic: traceMineralSupplementationSchema,
        organic: traceMineralSupplementationSchema,
      }),
    ),
  }),
  breeders: z.object({
    sourceTable: z.literal("7.07"),
    printedPage: z.literal(475),
    vitamins: vitaminSupplementationSchema,
    traceMinerals: z.object({
      inorganic: traceMineralSupplementationSchema,
      organic: traceMineralSupplementationSchema,
    }),
  }),
  notes: z.array(z.string()),
});


const sourceSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.literal("brazilian-tables-2024"),
  title: z.string(),
  edition: z.literal(5),
  year: z.literal(2024),
  language: z.string(),
  isbn: z.string(),
  publisher: z.string(),
  editors: z.array(z.string()),
  coverage: z.record(z.string(), z.string()),
  extraction: z.object({
    status: z.enum(["in_progress", "complete"]),
    policy: z.array(z.string()),
    completedTables: z.array(z.string()),
    nextTables: z.array(z.string()),
  }),
});

const aaRatioSchema = z.object({
  lysine: z.number(),
  methionine: z.number(),
  methionineCysteine: z.number(),
  threonine: z.number(),
  tryptophan: z.number(),
  arginine: z.number(),
  valine: z.number(),
  isoleucine: z.number(),
  leucine: z.number(),
  histidine: z.number(),
  phenylalanine: z.number(),
  phenylalanineTyrosine: z.number(),
});

const sidAminoAcidsSchema = z.object({
  lysine: z.number(),
  methionine: z.number(),
  methionineCysteine: z.number(),
  threonine: z.number(),
  tryptophan: z.number(),
  arginine: z.number(),
  valine: z.number(),
  isoleucine: z.number(),
  leucine: z.number(),
  histidine: z.number(),
  phenylalanine: z.number(),
  phenylalanineTyrosine: z.number(),
});

const growingPhaseSchema = z.object({
  id: z.string(),
  phase: z.enum(["pre-starter", "starter", "grower", "finisher"]),
  ageDays: rangeSchema,
  weightKg: rangeSchema,
  averageWeightKg: z.number().optional(),
  gainKgDay: z.number().optional(),
  feedIntakeKgDay: z.number().optional(),
  dailyRequirements: z
    .object({
      sidLysineG: z.number(),
      digestiblePhosphorusG: z.number(),
      availablePhosphorusG: z.number(),
      metabolizableEnergyKcal: z.number(),
    })
    .optional(),
  diet: z.object({
    metabolizableEnergyKcalKg: z.number(),
    netEnergyKcalKg: z.number(),
  }),
  nutrientsPct: z.object({
    calcium: z.number(),
    availablePhosphorus: z.number(),
    digestiblePhosphorus: z.number(),
    potassium: z.number(),
    sodium: z.number(),
    chloride: z.number(),
    linoleicAcid: z.number(),
    digestibleProtein: z.number(),
    crudeProtein: z.number(),
  }),
  sidAminoAcidsPct: sidAminoAcidsSchema,
});

const growingSwineSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.literal("brazilian-2024-growing-swine"),
  sourceId: z.literal("brazilian-tables-2024"),
  chapter: z.literal(5),
  title: z.string(),
  aminoAcidRatios: z.object({
    sourceTable: z.literal("5.30"),
    printedPage: z.number(),
    basis: z.string(),
    phases: z.record(
      z.string(),
      z.object({
        ageDays: rangeSchema,
        sid: aaRatioSchema,
        total: aaRatioSchema,
      }),
    ),
  }),
  programmes: z.array(
    z.object({
      id: z.string(),
      sourceTable: z.string(),
      printedPage: z.number(),
      population: z.object({
        geneticPotential: z.string(),
        sexes: z.array(z.string()),
        performance: z.string(),
        environment: z.string().optional(),
      }),
      phases: z.array(growingPhaseSchema),
      notes: z.array(z.string()).optional(),
    }),
  ),
});

const breederPhaseSchema = z.object({
  id: z.string(),
  stage: z.enum(["gestation", "lactation"]),
  sourcePage: z.number(),
  parity: z.string(),
  gestationDays: rangeSchema.optional(),
  litterWeightGainKgDay: z.number().optional(),
  averageBodyWeightKg: z.number().optional(),
  femaleWeightPostpartumKg: z.number().optional(),
  maternalWeightGainKgDay: z.number().optional(),
  reproductiveWeightGainKgDay: z.number().optional(),
  femaleWeightLossKgDay: z.number().optional(),
  diet: z.object({
    metabolizableEnergyKcalKg: z.number(),
    netEnergyKcalKg: z.number(),
  }),
  daily: z.object({
    metabolizableEnergyKcal: z.number(),
    feedIntakeKgDay: z.number(),
  }),
  nutrientsPct: z.object({
    calcium: z.number(),
    availablePhosphorus: z.number(),
    digestiblePhosphorus: z.number(),
    potassium: z.number(),
    sodium: z.number(),
    chloride: z.number(),
    digestibleProtein: z.number(),
    crudeProtein: z.number(),
  }),
  sidAminoAcidsPct: sidAminoAcidsSchema,
});

const breederSwineSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.literal("brazilian-2024-breeder-swine"),
  sourceId: z.literal("brazilian-tables-2024"),
  chapter: z.literal(6),
  title: z.string(),
  gestation: z.object({
    sourceTable: z.literal("6.08"),
    printedPages: z.array(z.number()),
    aminoAcidRatios: z.object({
      sourceTable: z.literal("6.04"),
      printedPage: z.number(),
      basis: z.string(),
      phases: z.object({
        early: z.object({ gestationDays: rangeSchema, sid: aaRatioSchema }),
        late: z.object({ gestationDays: rangeSchema, sid: aaRatioSchema }),
      }),
    }),
    phases: z.array(breederPhaseSchema),
  }),
  lactation: z.object({
    sourceTable: z.literal("6.15"),
    printedPages: z.array(z.number()),
    aminoAcidRatios: z.object({
      sourceTable: z.literal("6.11"),
      printedPage: z.number(),
      basis: z.string(),
      sid: aaRatioSchema,
    }),
    phases: z.array(breederPhaseSchema),
  }),
  lactation25C: z.object({
    sourceTable: z.literal("6.16"),
    printedPages: z.array(z.number()),
    averageTemperatureC: z.literal(25),
    aminoAcidRatios: z.object({
      sourceTable: z.literal("6.11"),
      printedPage: z.number(),
      basis: z.string(),
      sid: aaRatioSchema,
    }),
    phases: z.array(breederPhaseSchema),
  }),
});

/**
 * Table 1.01 suggested inclusion: `practical` is the usual level (advisory),
 * `max` the published ceiling FeedSport enforces.
 */
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

const crystallineAminoAcidsSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.literal("brazilian-2024-crystalline-amino-acids-swine"),
  sourceId: z.literal("brazilian-tables-2024"),
  sourceTable: z.literal("1.09"),
  printedPage: z.number(),
  basis: z.literal("dry-matter"),
  notes: z.array(z.string()),
  ingredients: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      pigflowIngredientId: z.string().optional(),
      mappingNote: z.string().optional(),
      nitrogenPct: z.number(),
      crudeProteinEquivalentPct: z.number(),
      standardizedDigestibilityPct: z.number(),
      digestibleProteinEquivalentPct: z.number().optional(),
      energyKcalKg: z.object({
        gross: z.number(),
        digestible: z.number(),
        standardizedMetabolizable: z.number(),
        net: z.number(),
      }),
    }),
  ),
});

const mineralSourcesSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.literal("brazilian-2024-inorganic-mineral-sources"),
  sourceId: z.literal("brazilian-tables-2024"),
  sourceTable: z.literal("1.10"),
  printedPage: z.number(),
  basis: z.literal("as-fed"),
  ingredients: z.array(
    z
      .object({
        id: z.string(),
        name: z.string(),
        pigflowIngredientId: z.string().optional(),
        mappingNote: z.string().optional(),
      })
      .catchall(z.number().or(z.string())),
  ),
});

function assertUniqueIds(values: readonly { id: string }[], label: string): void {
  const ids = values.map((value) => value.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error(`Duplicate IDs in ${label}.`);
  }
}

export const BRAZILIAN_2024_SOURCE = sourceSchema.parse(sourceJson);
export const BRAZILIAN_2024_SWINE_SUPPLEMENTATION =
  swineSupplementationSchema.parse(swineSupplementationJson);
export const BRAZILIAN_2024_GROWING_SWINE = growingSwineSchema.parse(growingSwineJson);
export const BRAZILIAN_2024_BREEDER_SWINE = breederSwineSchema.parse(breederSwineJson);
export const BRAZILIAN_2024_CORE_FEEDSTUFFS = coreFeedstuffsSchema.parse(coreFeedstuffsJson);
export const BRAZILIAN_2024_CRYSTALLINE_AMINO_ACIDS =
  crystallineAminoAcidsSchema.parse(crystallineAminoAcidsJson);
export const BRAZILIAN_2024_MINERAL_SOURCES = mineralSourcesSchema.parse(mineralSourcesJson);

assertUniqueIds(BRAZILIAN_2024_GROWING_SWINE.programmes, "Brazilian 2024 programmes");
assertUniqueIds(BRAZILIAN_2024_BREEDER_SWINE.gestation.phases, "Brazilian 2024 gestation phases");
assertUniqueIds(BRAZILIAN_2024_BREEDER_SWINE.lactation.phases, "Brazilian 2024 lactation phases");
assertUniqueIds(
  BRAZILIAN_2024_BREEDER_SWINE.lactation25C.phases,
  "Brazilian 2024 25C lactation phases",
);
for (const programme of BRAZILIAN_2024_GROWING_SWINE.programmes) {
  assertUniqueIds(programme.phases, `Brazilian 2024 programme ${programme.id}`);
}
assertUniqueIds(BRAZILIAN_2024_CORE_FEEDSTUFFS.ingredients, "Brazilian 2024 feedstuffs");
assertUniqueIds(
  BRAZILIAN_2024_CRYSTALLINE_AMINO_ACIDS.ingredients,
  "Brazilian 2024 crystalline amino acids",
);
assertUniqueIds(BRAZILIAN_2024_MINERAL_SOURCES.ingredients, "Brazilian 2024 mineral sources");

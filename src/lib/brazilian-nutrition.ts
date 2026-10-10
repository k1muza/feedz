import { z } from "zod";

import { BRAZILIAN_2024_SOURCE } from "./brazilian-source";
import { assertUniqueIds } from "./nutrition-validation";

import growingSwineJson from "@/data/nutrition/sources/brazilian-tables-2024/programmes/swine/growing.json";
import breederSwineJson from "@/data/nutrition/sources/brazilian-tables-2024/programmes/swine/breeders.json";
import swineSupplementationJson from "@/data/nutrition/sources/brazilian-tables-2024/programmes/swine/supplementation.json";
import broilerSupplementationJson from "@/data/nutrition/sources/brazilian-tables-2024/programmes/poultry/broilers/supplementation.json";

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

const broilerSupplementationSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.literal("brazilian-2024-broiler-supplementation"),
  sourceId: z.literal("brazilian-tables-2024"),
  broilers: z.object({
    vitaminSourceTable: z.literal("7.01"),
    traceMineralSourceTable: z.literal("7.03"),
    vitaminPrintedPage: z.literal(469),
    traceMineralPrintedPage: z.literal(471),
    /** Source basis for the per-kg-feed levels; kept so transcription can be cross-checked. */
    perKgGain: z.object({
      vitamins: vitaminSupplementationSchema,
      inorganic: traceMineralSupplementationSchema,
      organic: traceMineralSupplementationSchema,
    }),
    phases: z.array(
      z.object({
        ageDays: rangeSchema,
        weightKg: rangeSchema,
        weightGainGDay: z.number(),
        feedIntakeGDay: z.number(),
        ratio: z.number(),
        vitamins: vitaminSupplementationSchema,
        inorganic: traceMineralSupplementationSchema,
        organic: traceMineralSupplementationSchema,
      }),
    ),
  }),
  notes: z.array(z.string()),
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

export { BRAZILIAN_2024_SOURCE };

export const BRAZILIAN_2024_SWINE_SUPPLEMENTATION =
  swineSupplementationSchema.parse(swineSupplementationJson);
export const BRAZILIAN_2024_BROILER_SUPPLEMENTATION =
  broilerSupplementationSchema.parse(broilerSupplementationJson);
export const BRAZILIAN_2024_GROWING_SWINE = growingSwineSchema.parse(growingSwineJson);
export const BRAZILIAN_2024_BREEDER_SWINE = breederSwineSchema.parse(breederSwineJson);

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

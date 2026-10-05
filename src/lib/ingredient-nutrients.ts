import { z } from "zod";

import ingredientLibraryJson from "@/data/nutrition/ingredients/ingredient-library.json";

const nutrientSourceSchema = z.object({
  publisher: z.string(),
  title: z.string(),
  year: z.number().int().optional(),
  url: z.string().url(),
  basis: z.string().optional(),
  priority: z.enum(["primary", "fallback", "supplier"]).optional(),
  note: z.string().optional(),
});

const ingredientSchema = z.object({
  id: z.string(),
  name: z.string(),
  aliases: z.array(z.string()).default([]),
  category: z.enum([
    "cereal",
    "protein_meal",
    "byproduct",
    "oil_fat",
    "mineral",
    "amino_acid",
    "vitamin_mineral_premix",
    "other",
  ]),
  composition: z.object({
    dryMatterPct: z.number().optional(),
    crudeProteinPct: z.number().optional(),
    /** Swine standardized ileal digestible crude-protein concentration. */
    digestibleProteinPct: z.number().optional(),
    crudeFatPct: z.number().optional(),
    crudeFibrePct: z.number().optional(),
    ashPct: z.number().optional(),
    starchPct: z.number().optional(),
    sugarPct: z.number().optional(),
    neutralDetergentFibrePct: z.number().optional(),
    acidDetergentFibrePct: z.number().optional(),
    linoleicAcidPct: z.number().optional(),
  }),
  energy: z.object({
    digestibleKcalKg: z.number().optional(),
    metabolizableKcalKg: z.number().optional(),
    standardizedMetabolizableKcalKg: z.number().optional(),
    netKcalKg: z.number().optional(),
  }),
  aminoAcids: z
    .object({
      /** Concentration printed by the source, on the library basis. */
      totalPct: z.record(z.string(), z.number()).default({}),
      /** NRC Table 17-1 standardized ileal digestibility coefficient. */
      sidDigestibilityPct: z.record(z.string(), z.number()).default({}),
      /** Explicit SID concentration for crystalline sources when appropriate. */
      sidPct: z.record(z.string(), z.number()).default({}),
    })
    .default({ totalPct: {}, sidDigestibilityPct: {}, sidPct: {} }),
  macroMinerals: z
    .object({
      calciumPct: z.number().optional(),
      totalPhosphorusPct: z.number().optional(),
      availablePhosphorusPct: z.number().optional(),
      /** NRC source coefficient; use sttdPhosphorusPctOf() for concentration. */
      sttdPhosphorusDigestibilityPct: z.number().optional(),
      /** Explicit concentration for sources that publish one directly. */
      sttdPhosphorusPct: z.number().optional(),
      sodiumPct: z.number().optional(),
      chloridePct: z.number().optional(),
      potassiumPct: z.number().optional(),
      magnesiumPct: z.number().optional(),
    })
    .default({}),
  traceMineralsPpm: z.record(z.string(), z.number()).default({}),
  vitamins: z
    .object({
      vitaminAIuKg: z.number().optional(),
      vitaminDIuKg: z.number().optional(),
      vitaminEIuKg: z.number().optional(),
      vitaminKMgKg: z.number().optional(),
      vitaminB1MgKg: z.number().optional(),
      riboflavinMgKg: z.number().optional(),
      vitaminB6MgKg: z.number().optional(),
      vitaminB12McgKg: z.number().optional(),
      pantothenicAcidMgKg: z.number().optional(),
      niacinMgKg: z.number().optional(),
      folicAcidMgKg: z.number().optional(),
      biotinMgKg: z.number().optional(),
      totalCholineMgKg: z.number().optional(),
    })
    .default({}),
  constraints: z
    .object({
      minInclusionPct: z.number().optional(),
      maxInclusionPct: z.number().optional(),
      notes: z.array(z.string()).default([]),
    })
    .default({ notes: [] }),
  provenance: z
    .object({
      sourceIngredientName: z.string().optional(),
      sourcePage: z.number().optional(),
      sourceTable: z.string().optional(),
      source: nutrientSourceSchema.optional(),
      /**
       * Per-value provenance for fields supplemented from a different source.
       * Keys use stable nutrient paths such as "energy.metabolizableKcalKg"
       * or "aminoAcids.sidPct.lysine".
       */
      nutrientSources: z.record(z.string(), nutrientSourceSchema).default({}),
      notes: z.array(z.string()).default([]),
    })
    .default({ nutrientSources: {}, notes: [] }),
});

const ingredientLibrarySchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  name: z.string(),
  basis: z.object({
    nutrientComposition: z.enum(["as-fed", "dry-matter"]),
    energy: z.string(),
    aminoAcids: z.string(),
    macroMinerals: z.string(),
    traceMinerals: z.string(),
  }),
  source: z.object({
    publisher: z.string(),
    title: z.string(),
    edition: z.string(),
    year: z.number().int(),
    chapter: z.string(),
    doi: z.string(),
    url: z.string().url(),
    companionModel: z
      .object({
        title: z.string(),
        url: z.string().url(),
      })
      .optional(),
  }),
  notes: z.array(z.string()).default([]),
  ingredients: z.array(ingredientSchema),
});

export type NutrientValueSource = z.infer<typeof nutrientSourceSchema>;
export type IngredientNutrientRecord = z.infer<typeof ingredientSchema>;
export type IngredientLibrary = z.infer<typeof ingredientLibrarySchema>;

export function loadIngredientLibrary(input: unknown): IngredientLibrary {
  return ingredientLibrarySchema.parse(input);
}

export const INGREDIENT_LIBRARY = loadIngredientLibrary(ingredientLibraryJson);

export type CustomPremixProfile = {
  id: string;
  name: string;
  vitamins: Partial<IngredientNutrientRecord["vitamins"]>;
  traceMineralsPpm: Partial<IngredientNutrientRecord["traceMineralsPpm"]>;
};

export function ingredientLibraryWithCustomPremixes(
  premixes: readonly CustomPremixProfile[],
  library: IngredientLibrary = INGREDIENT_LIBRARY,
): IngredientLibrary {
  if (premixes.length === 0) return library;

  const existingIds = new Set(library.ingredients.map((ingredient) => ingredient.id));
  for (const premix of premixes) {
    if (existingIds.has(premix.id)) {
      throw new Error(`Custom premix ID already exists: ${premix.id}.`);
    }
    existingIds.add(premix.id);
  }

  return loadIngredientLibrary({
    ...library,
    ingredients: [
      ...library.ingredients,
      ...premixes.map((premix) => ({
        id: premix.id,
        name: premix.name,
        aliases: [],
        category: "vitamin_mineral_premix",
        composition: {},
        energy: {},
        aminoAcids: {
          totalPct: {},
          sidDigestibilityPct: {},
          sidPct: {},
        },
        macroMinerals: {},
        traceMineralsPpm: premix.traceMineralsPpm,
        vitamins: premix.vitamins,
        constraints: {
          notes: ["User-entered commercial premix profile."],
        },
        provenance: {
          nutrientSources: {},
          notes: [
            "User-entered commercial premix profile. Guaranteed label values should be used rather than inferred nutrient values.",
          ],
        },
      })),
    ],
  });
}



/**
 * Standardized ileal digestible concentration for one amino acid.
 *
 * Prefer an explicit SID concentration when the source publishes one. Otherwise
 * derive it from the published total concentration and SID coefficient.
 */
export function sidAminoAcidPct(
  ingredient: IngredientNutrientRecord,
  aminoAcid: string,
): number | undefined {
  const explicit = ingredient.aminoAcids.sidPct[aminoAcid];
  if (explicit !== undefined) return explicit;

  const total = ingredient.aminoAcids.totalPct[aminoAcid];
  const digestibility = ingredient.aminoAcids.sidDigestibilityPct[aminoAcid];
  if (total === undefined || digestibility === undefined) return undefined;
  return total * (digestibility / 100);
}

/** Standardized digestible phosphorus concentration, explicit or derived from total P. */
export function sttdPhosphorusPctOf(
  ingredient: IngredientNutrientRecord,
): number | undefined {
  if (ingredient.macroMinerals.sttdPhosphorusPct !== undefined) {
    return ingredient.macroMinerals.sttdPhosphorusPct;
  }
  const total = ingredient.macroMinerals.totalPhosphorusPct;
  if (total === 0) return 0;

  const digestibility = ingredient.macroMinerals.sttdPhosphorusDigestibilityPct;
  if (total === undefined || digestibility === undefined) return undefined;
  return total * (digestibility / 100);
}


export function nutrientValueSource(
  ingredient: IngredientNutrientRecord,
  nutrientPath: string,
): NutrientValueSource | undefined {
  return ingredient.provenance.nutrientSources[nutrientPath];
}

import { z } from "zod";

import ingredientLibraryJson from "@/data/nutrition/ingredients/ingredient-library.json";

import { assertUniqueIds } from "./nutrition-validation";

const nutrientSourceSchema = z.object({
  publisher: z.string(),
  title: z.string(),
  year: z.number().int().optional(),
  url: z.string().url(),
  basis: z.string().optional(),
  priority: z.enum(["primary", "fallback", "supplier"]).optional(),
  note: z.string().optional(),
});

const compositionSchema = z.object({
  dryMatterPct: z.number().optional(),
  crudeProteinPct: z.number().optional(),
  digestibleProteinPct: z.number().optional(),
  crudeFatPct: z.number().optional(),
  crudeFibrePct: z.number().optional(),
  ashPct: z.number().optional(),
  starchPct: z.number().optional(),
  sugarPct: z.number().optional(),
  neutralDetergentFibrePct: z.number().optional(),
  acidDetergentFibrePct: z.number().optional(),
  linoleicAcidPct: z.number().optional(),
});

const energySchema = z.object({
  digestibleKcalKg: z.number().optional(),
  metabolizableKcalKg: z.number().optional(),
  standardizedMetabolizableKcalKg: z.number().optional(),
  netKcalKg: z.number().optional(),
});

const aminoAcidsSchema = z
  .object({
    totalPct: z.record(z.string(), z.number()).default({}),
    sidDigestibilityPct: z.record(z.string(), z.number()).default({}),
    sidPct: z.record(z.string(), z.number()).default({}),
  })
  .default({ totalPct: {}, sidDigestibilityPct: {}, sidPct: {} });

const macroMineralsSchema = z
  .object({
    calciumPct: z.number().optional(),
    totalPhosphorusPct: z.number().optional(),
    availablePhosphorusPct: z.number().optional(),
    /** Swine standardized total tract digestibility coefficient. */
    sttdPhosphorusDigestibilityPct: z.number().optional(),
    /** Swine standardized total tract digestible phosphorus concentration. */
    sttdPhosphorusPct: z.number().optional(),
    /** Poultry phosphorus digestibility coefficient. */
    phosphorusDigestibilityPct: z.number().optional(),
    /** Poultry standardized digestible phosphorus concentration. */
    digestiblePhosphorusPct: z.number().optional(),
    sodiumPct: z.number().optional(),
    chloridePct: z.number().optional(),
    potassiumPct: z.number().optional(),
    magnesiumPct: z.number().optional(),
  })
  .default({});

const vitaminsSchema = z
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
  .default({});

const constraintsSchema = z
  .object({
    minInclusionPct: z.number().optional(),
    maxInclusionPct: z.number().optional(),
    notes: z.array(z.string()).default([]),
  })
  .default({ notes: [] });

/** Table 1.01 `practical` is advisory; `max` is the published hard ceiling. */
const inclusionRecommendationSchema = z
  .object({
    practical: z.number().min(0).max(100),
    max: z.number().min(0).max(100),
  })
  .strict()
  .refine((value) => value.practical <= value.max, {
    message: "Practical inclusion must not exceed the maximum inclusion.",
  });

const recommendedInclusionSchema = z
  .object({
    growingPigs: z
      .object({
        starter: inclusionRecommendationSchema.optional(),
        grower: inclusionRecommendationSchema.optional(),
        finisher: inclusionRecommendationSchema.optional(),
      })
      .strict()
      .optional(),
    sows: z
      .object({
        gestation: inclusionRecommendationSchema.optional(),
        lactation: inclusionRecommendationSchema.optional(),
      })
      .strict()
      .optional(),
    broilers: z
      .object({
        starter: inclusionRecommendationSchema.optional(),
        grower: inclusionRecommendationSchema.optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .optional();

const nutritionProfileSchema = z
  .object({
    composition: compositionSchema,
    energy: energySchema,
    aminoAcids: aminoAcidsSchema,
    macroMinerals: macroMineralsSchema,
    traceMineralsPpm: z.record(z.string(), z.number()).default({}),
    vitamins: vitaminsSchema,
    constraints: constraintsSchema,
    recommendedInclusionPct: recommendedInclusionSchema,
    sourceAnomalyIds: z.array(z.string()).optional(),
  })
  .strict();

const ingredientSourceSchema = z
  .object({
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
    nutrition: z
      .object({
        swine: nutritionProfileSchema.optional(),
        poultry: nutritionProfileSchema.optional(),
      })
      .strict()
      .refine((nutrition) => nutrition.swine !== undefined || nutrition.poultry !== undefined, {
        message: "Ingredient must define at least one species nutrition profile.",
      }),
    provenance: z
      .object({
        sourceIngredientName: z.string().optional(),
        sourcePage: z.number().optional(),
        sourceTable: z.string().optional(),
        source: nutrientSourceSchema.optional(),
        nutrientSources: z.record(z.string(), nutrientSourceSchema).default({}),
        notes: z.array(z.string()).default([]),
      })
      .default({ nutrientSources: {}, notes: [] }),
  })
  .strict();

const ingredientLibrarySourceSchema = z
  .object({
    schemaVersion: z.literal(2),
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
    ingredients: z.array(ingredientSourceSchema),
  })
  .strict();

export type NutrientValueSource = z.infer<typeof nutrientSourceSchema>;
export type IngredientSpecies = "swine" | "poultry";
export type IngredientNutritionProfile = z.infer<typeof nutritionProfileSchema>;
export type IngredientSourceRecord = z.infer<typeof ingredientSourceSchema>;
export type IngredientLibrarySource = z.infer<typeof ingredientLibrarySourceSchema>;

export type IngredientNutrientRecord = Omit<IngredientSourceRecord, "nutrition"> &
  IngredientNutritionProfile & {
    nutrition: IngredientSourceRecord["nutrition"];
    species: IngredientSpecies;
  };

export type IngredientLibrary = Omit<IngredientLibrarySource, "ingredients"> & {
  ingredients: IngredientNutrientRecord[];
  species: IngredientSpecies;
};

export function loadIngredientLibrarySource(input: unknown): IngredientLibrarySource {
  const library = ingredientLibrarySourceSchema.parse(input);
  assertUniqueIds(library.ingredients, "FeedSport ingredient library");
  return library;
}

export const INGREDIENT_LIBRARY_SOURCE = loadIngredientLibrarySource(ingredientLibraryJson);

function materializeIngredient(
  ingredient: IngredientSourceRecord,
  species: IngredientSpecies,
): IngredientNutrientRecord | undefined {
  const profile = ingredient.nutrition[species];
  if (!profile) return undefined;

  return {
    id: ingredient.id,
    name: ingredient.name,
    aliases: ingredient.aliases,
    category: ingredient.category,
    provenance: ingredient.provenance,
    nutrition: ingredient.nutrition,
    species,
    ...profile,
  };
}

export function ingredientLibraryForSpecies(
  species: IngredientSpecies,
  source: IngredientLibrarySource = INGREDIENT_LIBRARY_SOURCE,
): IngredientLibrary {
  return {
    ...source,
    species,
    ingredients: source.ingredients.flatMap((ingredient) => {
      const resolved = materializeIngredient(ingredient, species);
      return resolved ? [resolved] : [];
    }),
  };
}

/**
 * Backward-compatible default for the current formulation engine.
 * Swine remains the default until callers explicitly select a species.
 */
export const INGREDIENT_LIBRARY = ingredientLibraryForSpecies("swine");

export function loadIngredientLibrary(input: unknown): IngredientLibrary {
  return ingredientLibraryForSpecies("swine", loadIngredientLibrarySource(input));
}

export function ingredientNutritionProfile(
  ingredient: IngredientSourceRecord | IngredientNutrientRecord,
  species: IngredientSpecies,
): IngredientNutritionProfile | undefined {
  return ingredient.nutrition[species];
}

export type CustomPremixProfile = {
  id: string;
  name: string;
  vitamins: Partial<IngredientNutrientRecord["vitamins"]>;
  traceMineralsPpm: Record<string, number>;
};

export function ingredientLibraryWithCustomPremixes(
  premixes: readonly CustomPremixProfile[],
  library: IngredientLibrary = INGREDIENT_LIBRARY,
): IngredientLibrary {
  if (premixes.length === 0) return library;

  const existingIds = new Set(library.ingredients.map((ingredient) => ingredient.id));
  const added = premixes.map((premix): IngredientNutrientRecord => {
    if (existingIds.has(premix.id)) {
      throw new Error(`Custom premix ID already exists: ${premix.id}.`);
    }
    existingIds.add(premix.id);

    const profile = nutritionProfileSchema.parse({
      composition: {},
      energy: {},
      aminoAcids: { totalPct: {}, sidDigestibilityPct: {}, sidPct: {} },
      macroMinerals: {},
      traceMineralsPpm: premix.traceMineralsPpm,
      vitamins: premix.vitamins,
      constraints: { notes: ["User-entered commercial premix profile."] },
    });

    return {
      id: premix.id,
      name: premix.name,
      aliases: [],
      category: "vitamin_mineral_premix",
      provenance: {
        nutrientSources: {},
        notes: [
          "User-entered commercial premix profile. Guaranteed label values should be used rather than inferred nutrient values.",
        ],
      },
      nutrition: library.species === "swine" ? { swine: profile } : { poultry: profile },
      species: library.species,
      ...profile,
    };
  });

  return {
    ...library,
    ingredients: [...library.ingredients, ...added],
  };
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

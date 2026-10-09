import { z } from "zod";

import ingredientLibraryJson from "@/data/nutrition/ingredients/ingredient-library.json";

import type { NutritionPhase } from "./nutrition";
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
    practical: z.number().min(0).max(100).optional(),
    max: z.number().min(0).max(100),
  })
  .strict()
  .refine(
    (value) => value.practical === undefined || value.practical <= value.max,
    {
      message: "Practical inclusion must not exceed the maximum inclusion.",
    },
  );

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
        /** Distinguishes a published reference from an unverified supplier or user profile. */
        verificationStatus: z.enum(["published_reference", "manufacturer_unverified", "manufacturer_verified", "user_supplied_unverified"]).optional(),
        profileBasis: z.enum(["as-fed", "dry-matter"]).optional(),
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
  librarySource: IngredientLibrarySource = INGREDIENT_LIBRARY_SOURCE,
): IngredientNutrientRecord | undefined {
  const profile = ingredient.nutrition[species];
  if (!profile) return undefined;

  return {
    id: ingredient.id,
    name: ingredient.name,
    aliases: ingredient.aliases,
    category: ingredient.category,
    provenance: {
      ...ingredient.provenance,
      // The canonical library-level Brazilian Tables source applies unless
      // an individual ingredient or nutrient declares a more specific source.
      source: ingredient.provenance.source ?? {
        publisher: librarySource.source.publisher,
        title: librarySource.source.title,
        year: librarySource.source.year,
        url: librarySource.source.url,
        basis: librarySource.basis.nutrientComposition,
        priority: "primary" as const,
      },
      profileBasis: ingredient.provenance.profileBasis ?? "as-fed",
      verificationStatus: ingredient.provenance.verificationStatus ?? "published_reference",
    },
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
      const resolved = materializeIngredient(ingredient, species, source);
      return resolved ? [resolved] : [];
    }),
  };
}

/**
 * Backward-compatible default for the current formulation engine.
 * Swine remains the default until callers explicitly select a species.
 */
export const INGREDIENT_LIBRARY = ingredientLibraryForSpecies("swine");

export const POULTRY_INGREDIENT_LIBRARY = ingredientLibraryForSpecies("poultry");

/** The species-specific nutrient values a phase must be formulated against. */
export function ingredientLibraryForPhase(
  phase: Pick<NutritionPhase, "species">,
): IngredientLibrary {
  return phase.species === "broiler" ? POULTRY_INGREDIENT_LIBRARY : INGREDIENT_LIBRARY;
}

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
  /** Exact as-fed AA analysis: total is NOT a substitute for SID. */
  aminoAcids?: {
    totalPct?: Record<string, number>;
    sidPct?: Record<string, number>;
  };
  /** Optional origin of user-provided analytical values; does not imply verification. */
  source?: NutrientValueSource;
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
      aminoAcids: { totalPct: premix.aminoAcids?.totalPct ?? {}, sidDigestibilityPct: {}, sidPct: premix.aminoAcids?.sidPct ?? {} },
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
        ...(premix.source ? { source: nutrientSourceSchema.parse(premix.source) } : {}),
        verificationStatus: "user_supplied_unverified",
        profileBasis: "as-fed",
        notes: [
          "User-provided nutrient values; original datasheet not supplied or independently verified. Never treat this as a published nutrient profile.",
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
 * Commercial premixes are identified by a real manufacturer SKU. Until a
 * verified analysis is supplied they contribute no claimed micronutrient
 * concentrations; the placeholder matrix exists only to include a fixed
 * product in the solver's ingredient list. Do not generate it at call sites.
 */
export function ingredientLibraryWithCommercialPremixes(
  premixes: readonly import("./commercial-premixes").CommercialPremix[],
  library: IngredientLibrary,
): IngredientLibrary {
  if (premixes.length === 0) return library;
  const result = ingredientLibraryWithCustomPremixes(
    premixes.map(({ id, name, verifiedAsFedAminoAcids }) => ({
      id, name, vitamins: {}, traceMineralsPpm: {},
      ...(verifiedAsFedAminoAcids ? { aminoAcids: {
        totalPct: verifiedAsFedAminoAcids.totalPct ?? {},
        sidPct: verifiedAsFedAminoAcids.sidPct ?? {},
      } } : {}),
    })),
    library,
  );
  const ids = new Set(premixes.map((product) => product.id));
  return {
    ...result,
    ingredients: result.ingredients.map((record) => {
      if (!ids.has(record.id)) return record;
      const product = premixes.find((p) => p.id === record.id)!;
      return {
        ...record,
        provenance: {
          ...record.provenance,
          source: {
            publisher: product.manufacturer,
            title: product.name + " — manufacturer product specification",
            url: product.specificationUrl,
            priority: "supplier",
            basis: "as-fed",
            note: "Supplier marketing/guarantee material, not a verified batch COA or complete as-fed nutrient profile.",
          },
          verificationStatus: product.verificationStatus === "unverified" ? "manufacturer_unverified" : "manufacturer_verified",
          profileBasis: "as-fed",
          nutrientSources: {
            ...record.provenance.nutrientSources,
            ...Object.fromEntries(
              Object.keys(product.verifiedAsFedAminoAcids?.totalPct ?? {}).map((name) => [
                `aminoAcids.totalPct.${name}`,
                {
                  publisher: product.manufacturer,
                  title: product.verifiedAsFedAminoAcids?.reference ?? "Manufacturer amino-acid specification",
                  url: product.verifiedAsFedAminoAcids?.sourceUrl ?? product.specificationUrl,
                  priority: "supplier" as const, basis: "as-fed",
                },
              ]),
            ),
            ...Object.fromEntries(
              Object.keys(product.verifiedAsFedAminoAcids?.sidPct ?? {}).map((name) => [
                `aminoAcids.sidPct.${name}`,
                {
                  publisher: product.manufacturer,
                  title: product.verifiedAsFedAminoAcids?.reference ?? "Manufacturer SID specification",
                  url: product.verifiedAsFedAminoAcids?.sourceUrl ?? product.specificationUrl,
                  priority: "supplier" as const, basis: "as-fed",
                },
              ]),
            ),
          },
          notes: [
            "Real manufacturer SKU; vitamin/trace-mineral sufficiency remains unverified.",
            ...(product.verifiedAsFedAminoAcids ? [
              `Exact manufacturer as-fed amino-acid values only: ${product.verifiedAsFedAminoAcids.reference}. Total and SID are separate; incomplete fields are not inferred.`,
            ] : ["No verified digestible amino-acid matrix. Manufacturer minimum total-AA label guarantees are not SID values."]),
            `Manufacturer: ${product.manufacturer}; model: ${product.sku}; reference: ${product.specificationUrl}`,
          ],
        },
        constraints: {
          ...record.constraints,
          notes: [`Commercial premix inclusion fixed at ${product.inclusionPct}%. Verification: unverified.`],
        },
      };
    }),
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

/**
 * Standardized digestible phosphorus concentration, explicit or derived from
 * total P. Poultry records use the poultry digestible-phosphorus values.
 */
export function sttdPhosphorusPctOf(
  ingredient: IngredientNutrientRecord,
): number | undefined {
  if (ingredient.species === "poultry") {
    const minerals = ingredient.macroMinerals;
    if (minerals.digestiblePhosphorusPct !== undefined) return minerals.digestiblePhosphorusPct;
    return minerals.totalPhosphorusPct === 0 ? 0 : undefined;
  }
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
  return ingredient.provenance.nutrientSources[nutrientPath] ?? ingredient.provenance.source;
}
/** Profile-level source and status always materialized for canonical ingredients.
 * User-entered profiles are explicitly flagged as lacking a citable source. */
export function ingredientProfileAttribution(ingredient: IngredientNutrientRecord) {
  const source = ingredient.provenance.source;
  return {
    source: source ? {
      publisher: source.publisher,
      title: source.title,
      year: source.year ?? null,
      url: source.url,
      basis: source.basis ?? ingredient.provenance.profileBasis ?? "as-fed",
    } : null,
    sourcePage: ingredient.provenance.sourcePage ?? null,
    sourceTable: ingredient.provenance.sourceTable ?? null,
    verificationStatus: ingredient.provenance.verificationStatus ?? "published_reference",
    species: ingredient.species,
    nutrientSources: ingredient.provenance.nutrientSources,
    notes: ingredient.provenance.notes,
  };
}

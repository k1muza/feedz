import { NextResponse } from "next/server";

export const runtime = "nodejs";
import { z } from "zod";

import { formulateLeastCostDiet } from "@/lib/feed-optimizer";
import { feedProgrammePhaseById } from "@/lib/feed-programmes";
import {
  ingredientLibraryForPhase,
  ingredientLibraryWithCustomPremixes,
} from "@/lib/ingredient-nutrients";
import { assertManufacturerRecipe, commercialPremixById, commercialPremixCompatibleWithProgramme } from "@/lib/commercial-premixes";
import { PUBLIC_PREMIX_ID } from "@/lib/public-feed-premix";
import { buildManufacturerRecipeReport } from "@/lib/manufacturer-recipe";

const optionalNutrient = z.number().finite().nonnegative().optional();

const requestSchema = z.object({
  programmeId: z.string().min(1),
  phaseId: z.string().min(1),
  energySystem: z.enum(["ME", "NE"]).default("ME"),
  includeSupplementationTargets: z.boolean().default(false),
  traceMineralBasis: z.enum(["inorganic", "organic"]).default("inorganic"),
  customPremixes: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      vitamins: z.object({
        vitaminAIuKg: optionalNutrient,
        vitaminDIuKg: optionalNutrient,
        vitaminEIuKg: optionalNutrient,
        vitaminKMgKg: optionalNutrient,
        vitaminB1MgKg: optionalNutrient,
        riboflavinMgKg: optionalNutrient,
        vitaminB6MgKg: optionalNutrient,
        vitaminB12McgKg: optionalNutrient,
        pantothenicAcidMgKg: optionalNutrient,
        niacinMgKg: optionalNutrient,
        folicAcidMgKg: optionalNutrient,
        biotinMgKg: optionalNutrient,
        totalCholineMgKg: optionalNutrient,
      }).default({}),
      traceMineralsPpm: z.object({
        zinc: optionalNutrient,
        iron: optionalNutrient,
        manganese: optionalNutrient,
        copper: optionalNutrient,
        iodine: optionalNutrient,
        selenium: optionalNutrient,
      }).default({}),
    }),
  ).default([]),
  ingredients: z.array(
    z.object({
      ingredientId: z.string().min(1),
      pricePerKg: z.number().finite().nonnegative(),
      minInclusionPct: z.number().finite().min(0).max(100).optional(),
      maxInclusionPct: z.number().finite().min(0).max(100).optional(),
    }),
  ).min(1),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      {
        status: "error",
        message: "Invalid formulation request.",
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  const {
    programmeId,
    phaseId,
    energySystem,
    includeSupplementationTargets,
    traceMineralBasis,
    customPremixes,
    ingredients,
  } = parsed.data;
  const phase = feedProgrammePhaseById(programmeId, phaseId);
  if (!phase) {
    return NextResponse.json(
      {
        status: "error",
        message: `Unknown requirement phase ${phaseId} for programme ${programmeId}.`,
      },
      { status: 404 },
    );
  }

  try {
    if (ingredients.some((ingredient) => ingredient.ingredientId === PUBLIC_PREMIX_ID)) {
      throw new Error("The theoretical FeedSport premix has been retired. Select a real manufacturer product.");
    }
    const selectedCommercial = ingredients.flatMap((ingredient) => {
      const premix = commercialPremixById(ingredient.ingredientId);
      if (!premix) return [];
      if (!commercialPremixCompatibleWithProgramme(premix, programmeId)) {
        throw new Error(`${premix.name} is not assigned to this animal stage.`);
      }
      if (Math.abs((ingredient.minInclusionPct ?? -1) - premix.inclusionPct) > 1e-6 ||
          Math.abs((ingredient.maxInclusionPct ?? -1) - premix.inclusionPct) > 1e-6) {
        throw new Error(`${premix.name} must be included at its published ${premix.inclusionKgPerTonne} kg/t; changing its dose is not supported.`);
      }
      return [premix];
    });
    if (selectedCommercial.length > 1) throw new Error("Select only one commercial premix for a formulation.");
    // CJ S174 is not an unrestricted component: enforce the manufacturer's
    // EXACT formula on the server, even if the UI is bypassed.
    for (const premix of selectedCommercial) assertManufacturerRecipe(premix, ingredients);
    if (programmeId === "mature-boar" && selectedCommercial.length === 0) {
      // Preserve existing basal-only planning, but never imply a complete diet.
    }
    if (customPremixes.some((premix) => premix.id === PUBLIC_PREMIX_ID || commercialPremixById(premix.id))) {
      throw new Error("Do not override manufacturer products with user-supplied nutrient profiles.");
    }
    // An unverified product is present as an inclusion-only ingredient. No
    // synthetic nutrient values are generated from the programme targets.
    const premixes = [
      ...customPremixes,
      ...selectedCommercial.map((premix) => ({
        id: premix.id, name: premix.name, vitamins: {}, traceMineralsPpm: {},
      })),
    ];
    const library = ingredientLibraryWithCustomPremixes(
      premixes,
      ingredientLibraryForPhase(phase),
    );
    const manufacturer = selectedCommercial.find((p) => p.formulationCompatibility === "manufacturer_recipe_only");
    if (manufacturer?.manufacturerRecipe) {
      const report = buildManufacturerRecipeReport(
        manufacturer, phase, energySystem, library,
        new Map(ingredients.map((row) => [row.ingredientId, row.pricePerKg])),
      );
      return NextResponse.json({
        ...report,
        manufacturer: manufacturer.manufacturer,
        productId: manufacturer.id,
        premixVerification: "unverified",
      });
    }

    const result = await formulateLeastCostDiet(
      phase,
      energySystem,
      ingredients,
      library,
      {
        includeSupplementationTargets: selectedCommercial.length > 0
          ? false
          : includeSupplementationTargets,
        traceMineralBasis,
      },
    );

    return NextResponse.json({
      ...result,
      premixVerification: selectedCommercial.length > 0 ? "unverified" : "not_applicable",
      ...(selectedCommercial.length > 0 ? {
        premixWarning: "Commercial premix is unverified. Vitamin and trace-mineral requirements have NOT been checked; this is not a validated complete feed.",
      } : {}),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 400 },
    );
  }
}

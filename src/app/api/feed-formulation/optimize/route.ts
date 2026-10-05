import { NextResponse } from "next/server";

export const runtime = "nodejs";
import { z } from "zod";

import { formulateLeastCostDiet } from "@/lib/feed-optimizer";
import { feedProgrammePhaseById } from "@/lib/feed-programmes";
import {
  INGREDIENT_LIBRARY,
  ingredientLibraryWithCustomPremixes,
} from "@/lib/ingredient-nutrients";

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
    const library = ingredientLibraryWithCustomPremixes(
      customPremixes,
      INGREDIENT_LIBRARY,
    );
    const result = await formulateLeastCostDiet(
      phase,
      energySystem,
      ingredients,
      library,
      {
        includeSupplementationTargets,
        traceMineralBasis,
      },
    );

    return NextResponse.json(result);
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

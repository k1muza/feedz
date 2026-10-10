import { NextResponse } from "next/server";

export const runtime = "nodejs";
import { z } from "zod";

import { ingredientDefaultPricePerKg } from "@/lib/feed-ingredient-prices";
import { commercialPremixById } from "@/lib/commercial-premixes";
import { ingredientLibraryForPhase, ingredientLibraryWithCommercialPremixes, ingredientLibraryWithCustomPremixes } from "@/lib/ingredient-nutrients";
import { getIngredientPrices } from "@/lib/ingredient-prices";
import {
  suggestFormulationAdditions,
  suggestFormulationIngredients,
  type FormulationIngredientOption,
} from "@/lib/feed-optimizer";
import { feedProgrammePhaseById } from "@/lib/feed-programmes";

const requestSchema = z.object({
  programmeId: z.string().min(1),
  phaseId: z.string().min(1),
  energySystem: z.enum(["ME", "NE"]).default("ME"),
  currentIngredients: z
    .array(
      z.object({
        ingredientId: z.string().min(1),
        pricePerKg: z.number().finite().nonnegative().optional(),
        minInclusionPct: z.number().finite().min(0).max(100).optional(),
        maxInclusionPct: z.number().finite().min(0).max(100).optional(),
      }),
    )
    .optional(),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      {
        status: "error",
        message: "Invalid ingredient suggestion request.",
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  const { programmeId, phaseId, energySystem, currentIngredients } = parsed.data;
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

  const prices = await getIngredientPrices();
  const planningPrice = (ingredientId: string) =>
    ingredientDefaultPricePerKg(ingredientId, prices);
  if (currentIngredients) {
    const options: FormulationIngredientOption[] = currentIngredients.flatMap(
      (ingredient) => {
        const pricePerKg =
          ingredient.pricePerKg ??
          (commercialPremixById(ingredient.ingredientId)
            ? 0
            : planningPrice(ingredient.ingredientId));
        return pricePerKg === undefined ? [] : [{ ...ingredient, pricePerKg }];
      },
    );
    const missingPriceIngredientIds = currentIngredients
      .filter(
        (ingredient) =>
          ingredient.pricePerKg === undefined &&
          !commercialPremixById(ingredient.ingredientId) &&
          planningPrice(ingredient.ingredientId) === undefined,
      )
      .map((ingredient) => ingredient.ingredientId);
    if (missingPriceIngredientIds.length) {
      return NextResponse.json({
        status: "blocked",
        ingredientIds: [],
        missingPriceIngredientIds,
        message:
          "Set a price for every current ingredient before checking which additions make the list feasible.",
      });
    }
    // Studio pools carry a commercial premix, which lives outside the phase
    // library; add the selected ones so they resolve like in /optimize.
    const premixes = options.flatMap((option) => {
      const premix = commercialPremixById(option.ingredientId);
      return premix ? [premix] : [];
    });
    const result = await suggestFormulationAdditions(
      phase,
      energySystem,
      options,
      ingredientLibraryWithCommercialPremixes(premixes, ingredientLibraryForPhase(phase)),
      planningPrice,
    );
    return NextResponse.json(result);
  }
  const result = await suggestFormulationIngredients(
    phase,
    energySystem,
    ingredientLibraryForPhase(phase),
    planningPrice,
  );
  return NextResponse.json(result);
}

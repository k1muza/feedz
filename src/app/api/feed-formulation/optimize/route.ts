import { NextResponse } from "next/server";

export const runtime = "nodejs";
import { z } from "zod";

import { ingredientDefaultPricePerKg } from "@/lib/feed-ingredient-prices";
import { feedProgrammePhaseById } from "@/lib/feed-programmes";
import {
  ingredientLibraryForPhase,
  ingredientLibraryWithCustomPremixes,
} from "@/lib/ingredient-nutrients";
import { assertManufacturerRecipe, commercialPremixById, commercialPremixCompatibleWithProgramme, premixAnalysisForIds } from "@/lib/commercial-premixes";
import { buildManufacturerRecipeReport } from "@/lib/manufacturer-recipe";
import { formulateAndAssess } from "@/lib/formulation-assessment";
import { INCLUSION_TOLERANCE_PCT } from "@/lib/numerical-tolerance";

const optionalNutrient = z.number().finite().nonnegative().optional();

const requestSchema = z.object({
  programmeId: z.string().min(1),
  phaseId: z.string().min(1),
  energySystem: z.enum(["ME", "NE"]).default("ME"),
  /** Ingredients sent with a placeholder price of 0 because no quotation exists. */
  unpricedIngredientIds: z.array(z.string().min(1)).default([]),
  customPremixes: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      source: z.object({
        publisher: z.string().min(1),
        title: z.string().min(1),
        year: z.number().int().optional(),
        url: z.string().url(),
        basis: z.string().optional(),
        priority: z.enum(["primary", "fallback", "supplier"]).optional(),
        note: z.string().optional(),
      }).optional(),
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
      macroMinerals: z.object({
        calciumPct: optionalNutrient,
        totalPhosphorusPct: optionalNutrient,
        sttdPhosphorusPct: optionalNutrient,
        sodiumPct: optionalNutrient,
        chloridePct: optionalNutrient,
      }).optional(),
      aminoAcids: z.object({
        totalPct: z.record(z.string(), z.number().finite().nonnegative()).optional(),
        sidPct: z.record(z.string(), z.number().finite().nonnegative()).optional(),
      }).optional(),
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
    unpricedIngredientIds,
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
    const selectedCommercial = ingredients.flatMap((ingredient) => {
      const premix = commercialPremixById(ingredient.ingredientId);
      if (!premix) return [];
      if (!commercialPremixCompatibleWithProgramme(premix, programmeId, phaseId)) {
        throw new Error(`${premix.name} is not assigned to this animal stage.`);
      }
      if (Math.abs((ingredient.minInclusionPct ?? -1) - premix.inclusionPct) > INCLUSION_TOLERANCE_PCT ||
          Math.abs((ingredient.maxInclusionPct ?? -1) - premix.inclusionPct) > INCLUSION_TOLERANCE_PCT) {
        throw new Error(`${premix.name} must be included at its published ${premix.inclusionKgPerTonne} kg/t; changing its dose is not supported.`);
      }
      return [premix];
    });
    if (selectedCommercial.length > 1) throw new Error("Select only one premix for a formulation.");
    // CJ S174 is not an unrestricted component: enforce the manufacturer's
    // EXACT formula on the server, even if the UI is bypassed.
    for (const premix of selectedCommercial) assertManufacturerRecipe(premix, ingredients);
    if (customPremixes.some((premix) => commercialPremixById(premix.id))) {
      throw new Error("Do not override built-in premix references with user-supplied nutrient profiles.");
    }
    // A user-entered analysis is an ingredient like any other; it may not
    // overwrite a manufacturer-identified product.
    const library = ingredientLibraryWithCustomPremixes(customPremixes, ingredientLibraryForPhase(phase));
    const manufacturer = selectedCommercial.find((p) => p.formulationCompatibility === "manufacturer_recipe_only");
    if (manufacturer?.manufacturerRecipe) {
      const report = buildManufacturerRecipeReport(
        manufacturer, phase, energySystem, library,
        new Map(ingredients.map((row) => [row.ingredientId, row.pricePerKg])),
      );
      return NextResponse.json({ ...report, assessment: report.assessment });
    }

    const { result, assessment, alternatives, premixComparison, premixEffect } = await formulateAndAssess({
      phase,
      energySystem,
      programmeId,
      options: ingredients,
      library,
      unpricedIngredientIds,
      priceForPremix: ingredientDefaultPricePerKg,
      onDiscardedAlternative: (alternative, errors) => console.warn("Discarded inconsistent optional formulation alternative", { alternative, programmeId, phaseId, errors }),
    });

    // Still reject a primary solution that genuinely violates its hard LP
    // constraints. Include measured values and the exact allowed tolerance in
    // the response to make solver/nutrient-data discrepancies actionable.
    if (assessment?.consistencyErrors.length) {
      return NextResponse.json({
        status: "error",
        message: `Engine consistency error: ${assessment.consistencyErrors.join(" ")}`,
        assessment,
      }, { status: 500 });
    }
    return NextResponse.json({
      ...result,
      ...(alternatives ? { alternatives } : {}),
      ...(assessment ? { assessment } : {}),
      premixComparison,
      premixEffect,
      premix_analysis: premixAnalysisForIds(ingredients.map((row) => row.ingredientId)),
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

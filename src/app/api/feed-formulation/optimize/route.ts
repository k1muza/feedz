import { NextResponse } from "next/server";

export const runtime = "nodejs";
import { z } from "zod";

import { formulateLeastCostDiet } from "@/lib/feed-optimizer";
import { feedProgrammePhaseById } from "@/lib/feed-programmes";
import {
  ingredientLibraryForPhase,
  ingredientLibraryWithCustomPremixes,
  ingredientLibraryWithCommercialPremixes,
} from "@/lib/ingredient-nutrients";
import { assertManufacturerRecipe, commercialPremixById, commercialPremixCompatibleWithProgramme, premixAnalysisForIds } from "@/lib/commercial-premixes";
import {
  researchPremixById,
  researchPremixCompatibleWithPhase,
  researchPremixNutrientProfile,
} from "@/lib/research-premixes";
import { PUBLIC_PREMIX_ID } from "@/lib/public-feed-premix";
import { buildManufacturerRecipeReport } from "@/lib/manufacturer-recipe";
import {
  buildFormulationAssessment,
  buildInfeasibleFormulationAssessment,
} from "@/lib/formulation-assessment";

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
    const selectedResearch = ingredients.flatMap((ingredient) => {
      const premix = researchPremixById(ingredient.ingredientId);
      if (!premix) return [];
      if (!researchPremixCompatibleWithPhase(premix, programmeId, phaseId)) {
        throw new Error(`${premix.name} is not assigned to this animal phase.`);
      }
      if (Math.abs((ingredient.minInclusionPct ?? -1) - premix.inclusionPct) > 1e-6 ||
          Math.abs((ingredient.maxInclusionPct ?? -1) - premix.inclusionPct) > 1e-6) {
        throw new Error(`${premix.name} must be included at its published study dose of ${premix.inclusionKgPerTonne} kg/t.`);
      }
      return [premix];
    });
    if (selectedCommercial.length + selectedResearch.length > 1) throw new Error("Select only one premix for a formulation.");
    // CJ S174 is not an unrestricted component: enforce the manufacturer's
    // EXACT formula on the server, even if the UI is bypassed.
    for (const premix of selectedCommercial) assertManufacturerRecipe(premix, ingredients);
    if (customPremixes.some((premix) => premix.id === PUBLIC_PREMIX_ID || commercialPremixById(premix.id) || researchPremixById(premix.id))) {
      throw new Error("Do not override built-in premix references with user-supplied nutrient profiles.");
    }
    // User-provided analyses remain separate from manufacturer-identified
    // products, whose nutrients are not credited against requirements.
    const library = ingredientLibraryWithCommercialPremixes(
      selectedCommercial,
      ingredientLibraryWithCustomPremixes(
        [...customPremixes, ...selectedResearch.map(researchPremixNutrientProfile)],
        ingredientLibraryForPhase(phase),
      ),
    );
    const manufacturer = selectedCommercial.find((p) => p.formulationCompatibility === "manufacturer_recipe_only");
    if (manufacturer?.manufacturerRecipe) {
      const report = buildManufacturerRecipeReport(
        manufacturer, phase, energySystem, library,
        new Map(ingredients.map((row) => [row.ingredientId, row.pricePerKg])),
      );
      return NextResponse.json({ ...report, assessment: report.validation });
    }

    const result = await formulateLeastCostDiet(
      phase,
      energySystem,
      ingredients,
      library,
      {
        // Strict callers may require micronutrient supplementation in the LP.
        // Missing premix values then return `missing-data`; they are never
        // silently treated as zero or disabled merely because a premix exists.
        includeSupplementationTargets,
        traceMineralBasis,
      },
    );

    const assessment = result.status === "optimal"
      ? buildFormulationAssessment(
          phase,
          energySystem,
          result.solution.formula,
          library,
          undefined,
          {
            optimizerFeasible: true,
            enforcedSettings: { includeSupplementationTargets, traceMineralBasis },
            checkOptimizerConsistency: true,
          },
        )
      : result.status === "infeasible"
        ? buildInfeasibleFormulationAssessment(result.message, result.diagnostics)
        : undefined;
    const alternatives = result.status === "optimal"
      ? result.alternatives.map((alternative) => ({
          ...alternative,
          assessment: buildFormulationAssessment(
            phase,
            energySystem,
            alternative.solution.formula,
            library,
            undefined,
            {
              optimizerFeasible: true,
              enforcedSettings: { includeSupplementationTargets, traceMineralBasis },
              checkOptimizerConsistency: true,
            },
          ),
        }))
      : undefined;
    const consistencyErrors = [
      ...(assessment?.consistencyErrors ?? []),
      ...(alternatives?.flatMap((alternative) => alternative.assessment.consistencyErrors) ?? []),
    ];
    if (consistencyErrors.length) {
      return NextResponse.json({
        status: "error",
        message: `Engine consistency error: ${consistencyErrors.join(" ")}`,
        assessment,
      }, { status: 500 });
    }
    return NextResponse.json({
      ...result,
      ...(alternatives ? { alternatives } : {}),
      ...(assessment ? { assessment } : {}),
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

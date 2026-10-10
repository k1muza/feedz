import { NextResponse } from "next/server";
import { z } from "zod";

import { evaluateFormulation } from "@/lib/feed-optimizer";
import { feedProgrammePhaseById } from "@/lib/feed-programmes";
import { commercialPremixById } from "@/lib/commercial-premixes";
import { ingredientLibraryForPhase, ingredientLibraryWithCommercialPremixes, ingredientLibraryWithCustomPremixes } from "@/lib/ingredient-nutrients";
import { researchPremixById, researchPremixCompatibleWithPhase, researchPremixNutrientProfile } from "@/lib/research-premixes";
import { buildFormulationAssessment } from "@/lib/formulation-assessment";

export const runtime = "nodejs";

// Checks a recipe someone typed in (the studio's manual mode) against a
// phase's requirements, with the same constraints the optimiser enforces.

const requestSchema = z.object({
  programmeId: z.string().min(1),
  phaseId: z.string().min(1),
  energySystem: z.enum(["ME", "NE"]).default("ME"),
  ingredients: z
    .array(
      z.object({
        ingredientId: z.string().min(1),
        inclusionPct: z.number().finite().min(0).max(100),
      }),
    )
    .max(200),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "error", message: "Invalid evaluation request.", issues: parsed.error.issues }, { status: 400 });
  }

  const { programmeId, phaseId, energySystem, ingredients } = parsed.data;
  const phase = feedProgrammePhaseById(programmeId, phaseId);
  if (!phase) {
    return NextResponse.json({ status: "error", message: `Unknown requirement phase ${phaseId} for programme ${programmeId}.` }, { status: 404 });
  }

  try {
    const premixes = ingredients.flatMap((row) => {
      const premix = commercialPremixById(row.ingredientId);
      return premix ? [premix] : [];
    });
    const researchPremixes = ingredients.flatMap((row) => {
      const premix = researchPremixById(row.ingredientId);
      if (!premix) return [];
      if (!researchPremixCompatibleWithPhase(premix, programmeId, phaseId)) {
        throw new Error(`${premix.name} is not assigned to this animal phase.`);
      }
      if (Math.abs(row.inclusionPct - premix.inclusionPct) > 1e-6) {
        throw new Error(`${premix.name} must be included at its published study dose of ${premix.inclusionKgPerTonne} kg/t.`);
      }
      return [premix];
    });
    if (premixes.length + researchPremixes.length > 1) throw new Error("Select only one premix for a formulation.");
    const library = ingredientLibraryWithCommercialPremixes(
      premixes,
      ingredientLibraryWithCustomPremixes(
        researchPremixes.map(researchPremixNutrientProfile),
        ingredientLibraryForPhase(phase),
      ),
    );
    const formula = { ingredients };
    const evaluation = evaluateFormulation(
      phase,
      energySystem,
      formula,
      library,
      { includeSupplementationTargets: true, traceMineralBasis: "inorganic" },
    );
    return NextResponse.json({
      status: "evaluated",
      nutrientProfile: evaluation.nutrientProfile,
      incompleteRequirements: evaluation.incompleteRequirements,
      assessment: buildFormulationAssessment(phase, energySystem, formula, library, evaluation),
    });
  } catch (error) {
    return NextResponse.json({ status: "error", message: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}

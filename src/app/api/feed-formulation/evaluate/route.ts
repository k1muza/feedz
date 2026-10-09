import { NextResponse } from "next/server";
import { z } from "zod";

import { evaluateFormulation } from "@/lib/feed-optimizer";
import { feedProgrammePhaseById } from "@/lib/feed-programmes";
import { commercialPremixById } from "@/lib/commercial-premixes";
import { ingredientLibraryForPhase, ingredientLibraryWithCommercialPremixes } from "@/lib/ingredient-nutrients";
import { buildCompleteFeedValidation } from "@/lib/complete-feed-validation";

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
    const library = ingredientLibraryWithCommercialPremixes(premixes, ingredientLibraryForPhase(phase));
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
      validation: buildCompleteFeedValidation(phase, energySystem, formula, library, evaluation),
    });
  } catch (error) {
    return NextResponse.json({ status: "error", message: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}

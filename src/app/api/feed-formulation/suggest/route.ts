import { NextResponse } from "next/server";
import { z } from "zod";

import { suggestFormulationIngredients } from "@/lib/feed-optimizer";
import { feedProgrammePhaseById } from "@/lib/feed-programmes";

const requestSchema = z.object({
  programmeId: z.string().min(1),
  phaseId: z.string().min(1),
  energySystem: z.enum(["ME", "NE"]).default("ME"),
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

  const { programmeId, phaseId, energySystem } = parsed.data;
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

  const result = await suggestFormulationIngredients(phase, energySystem);
  return NextResponse.json(result);
}

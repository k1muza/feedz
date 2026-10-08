import { NextResponse } from "next/server";
import { z } from "zod";

import {
  buildStudioFormulationPdf,
  studioFormulationPdfFilename,
} from "@/components/formulation-studio/studio-formulation-pdf";

export const runtime = "nodejs";

const requestSchema = z.object({
  documentName: z.string().min(1).max(160),
  programmeName: z.string().min(1).max(200),
  phaseLabel: z.string().min(1).max(200),
  weightRange: z.string().max(100),
  source: z.string().max(240),
  goalLabel: z.string().min(1).max(100),
  goalDescription: z.string().max(500),
  mode: z.enum(["Optimised", "Manual"]),
  batchKg: z.number().finite().positive(),
  costPerTonne: z.number().finite().nonnegative(),
  leastCostPerTonne: z.number().finite().nonnegative().optional(),
  preparedFor: z.string().max(240).optional(),
  ingredients: z.array(
    z.object({
      name: z.string().min(1).max(240),
      setting: z.string().max(120),
      inclusionPct: z.number().finite().min(0).max(100),
      pricePerTonne: z.number().finite().nonnegative().nullable(),
    }),
  ).min(1).max(100),
  nutrients: z.array(
    z.object({
      name: z.string().min(1).max(240),
      unit: z.string().max(40),
      value: z.number().finite(),
      min: z.number().finite().nullable(),
      max: z.number().finite().nullable(),
      status: z.enum(["met", "below", "above"]),
      limiting: z.boolean(),
    }),
  ).max(100),
  advisories: z.array(z.string().max(1_000)).max(100),
  notes: z.array(z.string().max(1_000)).max(100),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      {
        status: "error",
        message: "Invalid Studio PDF request.",
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  try {
    const bytes = await buildStudioFormulationPdf({
      ...parsed.data,
      generatedAt: new Date(),
    });
    const filename = studioFormulationPdfFilename(parsed.data.documentName);
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not generate the Studio PDF.",
      },
      { status: 500 },
    );
  }
}

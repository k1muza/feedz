import { NextResponse } from "next/server";
import { z } from "zod";

import {
  buildStudioFormulationPdf,
  studioFormulationPdfFilename,
} from "@/components/formulation-studio/studio-formulation-pdf";

export const runtime = "nodejs";

const nutrientAssessmentSchema = z.object({
  nutrientId: z.string(),
  label: z.string(),
  categoryId: z.enum(["energy-protein-amino-acids", "major-minerals", "vitamins", "trace-minerals"]),
  status: z.enum(["met", "below_target", "above_limit", "unknown"]),
  actual: z.number().finite().optional(),
  requiredMin: z.number().finite().optional(),
  allowedMax: z.number().finite().optional(),
  unit: z.string(),
  reason: z.string(),
  missingIngredientIds: z.array(z.string()),
  enforcedByOptimizer: z.boolean(),
  targetSource: z.string(),
});

const assessmentSchema = z.object({
  schemaVersion: z.literal(1),
  optimizerFeasible: z.boolean(),
  verdict: z.enum(["verified", "needs_verification", "infeasible"]),
  nutrientChecks: z.array(nutrientAssessmentSchema),
  categories: z.array(z.object({
    id: z.enum(["energy-protein-amino-acids", "major-minerals", "vitamins", "trace-minerals"]),
    label: z.string(),
    status: z.enum(["met", "unmet", "unknown", "not_assessed"]),
    checked: z.number().int().nonnegative(),
    required: z.number().int().nonnegative(),
    unmetNutrientIds: z.array(z.string()),
    unknownNutrientIds: z.array(z.string()),
    note: z.string(),
  })),
  consistencyErrors: z.array(z.string()),
  summary: z.string(),
  guidance: z.string(),
  validationScope: z.string(),
});

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
  assessment: assessmentSchema,
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

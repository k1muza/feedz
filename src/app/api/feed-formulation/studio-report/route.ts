import { NextResponse } from "next/server";
import { z } from "zod";

import {
  buildStudioFormulationPdf,
  studioFormulationPdfFilename,
} from "@/components/formulation-studio/studio-formulation-pdf";

export const runtime = "nodejs";

const dataStatusSchema = z.enum(["published", "assumed_zero", "missing"]);
const idList = z.array(z.string().max(200)).max(200);

const requirementSchema = z.object({
  id: z.string(),
  label: z.string(),
  unit: z.string(),
  relation: z.enum(["min", "max", "equal"]),
  bound: z.number().finite(),
  actual: z.number().finite(),
  status: z.enum(["met", "not_met"]),
  limiting: z.boolean(),
  data: dataStatusSchema,
  missingIngredientIds: idList,
  assumedZeroIngredientIds: idList,
  totalOnlyIngredientIds: idList,
  contributions: z.array(z.object({ ingredientId: z.string(), value: z.number().finite() })).max(200),
  enforcedByOptimizer: z.boolean(),
});

const supplementationRowSchema = z.object({
  id: z.string(),
  label: z.string(),
  unit: z.string(),
  group: z.enum(["vitamin", "trace_mineral"]),
  recommended: z.number().finite(),
  actual: z.number().finite(),
  pctOfRecommendation: z.number().finite().nullable(),
  status: z.enum(["at_recommendation", "below_recommendation", "no_data"]),
  data: dataStatusSchema,
  undocumentedIngredientIds: idList,
});

/** Schema-2 FormulationAssessment (see isFormulationAssessment). */
const assessmentSchema = z.object({
  schemaVersion: z.literal(2),
  optimizerFeasible: z.boolean(),
  verdict: z.enum(["meets_requirements", "fails_requirements", "infeasible"]),
  requirements: z.array(requirementSchema).max(200),
  supplementation: z.object({
    source: z.string(),
    traceMineralBasis: z.literal("inorganic"),
    rows: z.array(supplementationRowSchema).max(100),
  }).nullable(),
  documentationGaps: z.array(z.object({
    ingredientId: z.string(),
    nutrientId: z.string(),
    label: z.string(),
    reason: z.enum(["total_only", "not_documented"]),
  })).max(200),
  consistencyErrors: z.array(z.string()),
  headline: z.string(),
  summary: z.string(),
  scope: z.string(),
});

/** A saved version's schema-1 assessment: rendered with the legacy note, never re-scored. */
const legacyAssessmentSchema = z.object({ schemaVersion: z.literal(1) }).passthrough();

const premixComparisonSchema = z.object({
  currentPremixId: z.string().nullable(),
  options: z.array(z.object({
    premixId: z.string(),
    name: z.string(),
    inclusionPct: z.number().finite(),
    inclusionKgPerTonne: z.number().finite(),
    current: z.boolean(),
    status: z.enum(["optimal", "infeasible", "missing-data", "error"]),
    message: z.string().optional(),
    costPerTonne: z.number().finite().nullable(),
    costExcludesPremix: z.boolean(),
    requirementsMet: z.number().int().nonnegative(),
    requirementsTotal: z.number().int().nonnegative(),
    recipe: z.array(z.object({ ingredientId: z.string(), inclusionPct: z.number().finite() })).max(100),
    documentationGapLabels: z.array(z.string()).max(200),
    supplementationAt: z.number().int().nonnegative(),
    supplementationTotal: z.number().int().nonnegative(),
  })).max(50),
  suggestedPremixId: z.string().nullable(),
  reasons: z.array(z.string().max(1_000)).max(20),
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
  assessment: z.union([assessmentSchema, legacyAssessmentSchema]),
  premixComparison: premixComparisonSchema.nullable().optional(),
  premixId: z.string().max(200).nullable().optional(),
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

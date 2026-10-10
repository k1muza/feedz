import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  assertManufacturerRecipe,
  commercialPremixById,
  commercialPremixCompatibleWithProgramme,
} from '@/lib/commercial-premixes';
import { buildFormulationAssessment } from '@/lib/formulation-assessment';
import { ingredientDefaultPricePerKg } from '@/lib/feed-ingredient-prices';
import { evaluateFormulation } from '@/lib/feed-optimizer';
import { getIngredientPrices } from '@/lib/ingredient-prices';
import { feedProgrammeById, feedProgrammePhaseById } from '@/lib/feed-programmes';
import { ingredientLibraryForPhase, ingredientLibraryWithCommercialPremixes } from '@/lib/ingredient-nutrients';
import { PUBLIC_PREMIX_ID } from '@/lib/public-feed-premix';
import { renderPublicFormulationPdf } from '@/lib/public-formulation-pdf';

export const runtime = 'nodejs';

const priorities = {
  'least-cost': {
    label: 'Lowest cost',
    description: 'Minimizes total ingredient cost using the current planning-price set.',
  },
  simple: {
    label: 'Simpler recipe',
    description: 'Uses fewer ingredients while remaining within 3% of the least-cost formula.',
  },
  'low-soy': {
    label: 'Lower soy',
    description: 'Minimizes soybean-meal inclusion while remaining within the engine cost ceiling.',
  },
  'low-import': {
    label: 'Lower imports',
    description: 'Prefers local inputs and penalizes regional and global imports.',
  },
} as const;

const requestSchema = z.object({
  programmeId: z.string().min(1),
  phaseId: z.string().min(1),
  priority: z.enum(['least-cost', 'simple', 'low-soy', 'low-import']),
  premixId: z.string().min(1),
  premixPricePerKg: z.number().finite().nonnegative().optional(),
  costIncreasePct: z.number().finite().min(0).max(100).default(0),
  formula: z.object({
    ingredients: z.array(z.object({
      ingredientId: z.string().min(1),
      inclusionPct: z.number().finite().min(0).max(100),
    })).min(1).max(60),
  }),
});

function filenamePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72);
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { status: 'error', message: 'Invalid formulation report request.', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { programmeId, phaseId, formula, premixId, premixPricePerKg, costIncreasePct } = parsed.data;

  const programme = feedProgrammeById(programmeId);
  const phase = feedProgrammePhaseById(programmeId, phaseId);
  if (!programme || !phase) {
    return NextResponse.json(
      { status: 'error', message: 'The selected formulation programme or phase no longer exists.' },
      { status: 404 },
    );
  }

  try {
    const total = formula.ingredients.reduce((sum, ingredient) => sum + ingredient.inclusionPct, 0);
    if (Math.abs(total - 100) > 0.02) throw new Error('The downloaded formulation must total 100%.');
    if (formula.ingredients.some((ingredient) => ingredient.ingredientId === PUBLIC_PREMIX_ID)) {
      throw new Error('The theoretical FeedSport premix has been retired. Select a real manufacturer product.');
    }

    // Only a real manufacturer product, at its published dose, may appear in a report.
    const premix = commercialPremixById(premixId);
    if (!premix) throw new Error('Select a commercial premix before downloading the formula.');
    if (!commercialPremixCompatibleWithProgramme(premix, programmeId)) {
      throw new Error(`${premix.name} is not assigned to this animal stage.`);
    }
    const otherPremixes = formula.ingredients.filter((row) => row.ingredientId !== premix.id && commercialPremixById(row.ingredientId));
    if (otherPremixes.length) throw new Error('Select only one commercial premix for a formulation.');
    const premixRow = formula.ingredients.find((row) => row.ingredientId === premix.id);
    if (!premixRow || Math.abs(premixRow.inclusionPct - premix.inclusionPct) > 0.01) {
      throw new Error(`${premix.name} must be included at its published ${premix.inclusionKgPerTonne} kg/t.`);
    }
    assertManufacturerRecipe(
      premix,
      formula.ingredients.map((row) => ({ ingredientId: row.ingredientId, minInclusionPct: row.inclusionPct, maxInclusionPct: row.inclusionPct })),
    );

    const library = ingredientLibraryWithCommercialPremixes([premix], ingredientLibraryForPhase(phase));
    const evaluation = evaluateFormulation(
      phase,
      'ME',
      formula,
      library,
      { includeSupplementationTargets: true, traceMineralBasis: 'inorganic' },
    );
    const assessment = buildFormulationAssessment(phase, 'ME', formula, library, evaluation);
    const ingredientPrices = await getIngredientPrices();
    // An unpriced ingredient makes the total unknown; it is never costed as zero.
    let costPerKg: number | null = 0;
    for (const ingredient of formula.ingredients) {
      const pricePerKg = ingredient.ingredientId === premix.id && premixPricePerKg !== undefined
        ? premixPricePerKg
        : ingredientDefaultPricePerKg(ingredient.ingredientId, ingredientPrices);
      if (pricePerKg === undefined) {
        costPerKg = null;
        break;
      }
      costPerKg += ingredient.inclusionPct / 100 * pricePerKg;
    }

    const bytes = await renderPublicFormulationPdf({
      programme,
      phase,
      priority: { id: parsed.data.priority, ...priorities[parsed.data.priority] },
      formula,
      premix,
      premixPricePerKg,
      manufacturerRecipe: Boolean(premix.manufacturerRecipe),
      nutrientProfile: evaluation.nutrientProfile,
      assessment,
      costPerKg,
      costIncreasePct,
      ingredientPrices,
    });
    const filename = `feedsport-${filenamePart(phase.label)}-formulation.pdf`;

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `inline; filename="${filename}"`,
        'cache-control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Could not generate the formulation report.',
      },
      { status: 400 },
    );
  }
}

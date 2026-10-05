import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ingredientDefaultPricePerKg } from '@/lib/feed-ingredient-prices';
import { evaluateFormulation } from '@/lib/feed-optimizer';
import { feedProgrammeById, feedProgrammePhaseById } from '@/lib/feed-programmes';
import { INGREDIENT_LIBRARY, ingredientLibraryWithCustomPremixes } from '@/lib/ingredient-nutrients';
import { PUBLIC_PREMIX_ID, publicPremixProfileForPhase } from '@/lib/public-feed-premix';
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
  let body: unknown;
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    body = await request.json();
  } else {
    const payload = (await request.formData()).get('payload');
    try {
      body = typeof payload === 'string' ? JSON.parse(payload) : null;
    } catch {
      body = null;
    }
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { status: 'error', message: 'Invalid formulation report request.', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const programme = feedProgrammeById(parsed.data.programmeId);
  const phase = feedProgrammePhaseById(parsed.data.programmeId, parsed.data.phaseId);
  if (!programme || !phase) {
    return NextResponse.json(
      { status: 'error', message: 'The selected formulation programme or phase no longer exists.' },
      { status: 404 },
    );
  }

  try {
    const priority = priorities[parsed.data.priority];
    const total = parsed.data.formula.ingredients.reduce((sum, ingredient) => sum + ingredient.inclusionPct, 0);
    if (Math.abs(total - 100) > 0.02) {
      return NextResponse.json(
        { status: 'error', message: 'The downloaded formulation must total 100%.' },
        { status: 400 },
      );
    }

    const library = ingredientLibraryWithCustomPremixes(
      [publicPremixProfileForPhase(phase)],
      INGREDIENT_LIBRARY,
    );
    const evaluation = evaluateFormulation(
      phase,
      'ME',
      parsed.data.formula,
      library,
      { includeSupplementationTargets: true, traceMineralBasis: 'inorganic' },
    );
    const costPerKg = parsed.data.formula.ingredients.reduce((sum, ingredient) => {
      const pricePerKg = ingredient.ingredientId === PUBLIC_PREMIX_ID
        ? 0
        : ingredientDefaultPricePerKg(ingredient.ingredientId);
      if (pricePerKg === undefined) {
        throw new Error(`No planning price is available for ${ingredient.ingredientId}.`);
      }
      return sum + ingredient.inclusionPct / 100 * pricePerKg;
    }, 0);
    const bytes = await renderPublicFormulationPdf({
      programme,
      phase,
      priority: { id: parsed.data.priority, ...priority },
      formula: parsed.data.formula,
      nutrientProfile: evaluation.nutrientProfile,
      costPerKg,
      costIncreasePct: 0,
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
      { status: 500 },
    );
  }
}

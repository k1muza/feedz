import { NextResponse } from 'next/server';

import { getFeedProduct } from '@/data/feedProductNutrition';
import { renderSpecSheet } from '@/lib/spec-sheet-pdf';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getFeedProduct(id);
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  const bytes = await renderSpecSheet(product);
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="feedsport-${product.id}-spec-sheet.pdf"`,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

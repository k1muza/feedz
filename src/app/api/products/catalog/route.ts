import { NextResponse } from 'next/server';

import { renderCatalogPdf } from '@/lib/catalog-pdf';
import { getPublishedProducts } from '@/lib/products';
import { getAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  // The catalogue carries prices, which the public site does not show.
  if (!(await getAdminClient())) return NextResponse.json({ error: 'Not authorised' }, { status: 401 });

  const category = new URL(request.url).searchParams.get('category') || undefined;
  const products = (await getPublishedProducts()).filter((product) => !category || product.category === category);
  if (products.length === 0) return NextResponse.json({ error: 'No published products to include' }, { status: 404 });

  const bytes = await renderCatalogPdf(products, { categoryName: category });
  const slug = category ? `-${category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}` : '';
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="feedsport-catalogue${slug}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

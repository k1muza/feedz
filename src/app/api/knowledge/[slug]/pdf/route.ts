import { NextResponse } from 'next/server';

import { renderArticlePdf } from '@/lib/article-pdf';
import { getPublishedArticle } from '@/lib/content';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getPublishedArticle(slug);
  if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

  const bytes = await renderArticlePdf(article);
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="feedsport-${article.slug}.pdf"`,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

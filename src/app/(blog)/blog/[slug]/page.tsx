import { permanentRedirect } from 'next/navigation';
import { getPublishedArticle } from '@/lib/content';

export default async function LegacyArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  permanentRedirect((await getPublishedArticle(slug)) ? `/knowledge/${slug}` : '/knowledge');
}

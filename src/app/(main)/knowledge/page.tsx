import type { Metadata } from 'next';
import KnowledgeClient from './KnowledgeClient';
import { feedProductCatalog } from '@/data/feedProducts';
import { knowledgeTopics } from '@/data/knowledgeArticles';
import { getPublishedArticles } from '@/lib/content';
import { absoluteUrl, breadcrumbJsonLd, createPageMetadata, serializeJsonLd, siteConfig } from '@/lib/seo';

export const metadata: Metadata = {
  ...createPageMetadata({
    title: 'Livestock Feed & Nutrition Guides',
    description: 'Practical guides on pig, poultry and cattle nutrition, feed ingredients, feed formulation and on-farm mixing, written by the FeedSport nutrition team in Zimbabwe.',
    path: '/knowledge',
  }),
  alternates: { canonical: '/knowledge', types: { 'application/rss+xml': '/knowledge/feed.xml' } },
};

export const revalidate = 3600;

export default async function KnowledgePage() {
  const knowledgeArticles = await getPublishedArticles();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${absoluteUrl('/knowledge')}#page`,
        name: 'FeedSport Knowledge Centre',
        url: absoluteUrl('/knowledge'),
        publisher: { '@id': `${siteConfig.url}/#organization` },
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: knowledgeArticles.map((article, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: article.title,
            url: absoluteUrl(`/knowledge/${article.slug}`),
          })),
        },
      },
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Knowledge Centre', path: '/knowledge' },
      ]),
    ],
  };

  const articles = knowledgeArticles.map(({ slug, title, description, topic, image, ingredients }) => ({
    slug, title, description, topic, image,
    products: ingredients.flatMap((id) => feedProductCatalog.filter((product) => product.id === id).map(({ id, name }) => ({ id, name }))),
  }));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <KnowledgeClient articles={articles} topics={knowledgeTopics} />
    </>
  );
}

import { Metadata } from 'next';
import ProductsClient from './ProductsClient';
import { feedProducts } from '@/data/feedProductNutrition';
import { absoluteUrl, createPageMetadata, serializeJsonLd } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Animal Feed Ingredients in Zimbabwe',
  description: 'Compare livestock feed ingredients available in Zimbabwe: soybean meal, sorghum, wheat bran, sunflower meal, fish meal, amino acids, minerals and premixes. Specifications, packaging and minimum orders.',
  path: '/products',
});

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; animal?: string; category?: string }> }) {
  const query = await searchParams;
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'FeedSport feed ingredients',
    itemListElement: feedProducts.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: product.name,
      url: absoluteUrl(`/products/${product.id}`),
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemListJsonLd) }} />
      <ProductsClient products={feedProducts} initialQuery={query.q || ''} initialAnimal={query.animal || 'all'} initialCategory={query.category || 'All'} />
    </>
  );
}

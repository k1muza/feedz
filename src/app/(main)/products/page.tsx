import { Metadata } from 'next';
import ProductsClient from './ProductsClient';
import { absoluteUrl, createPageMetadata, serializeJsonLd } from '@/lib/seo';
import { getPublishedProductCategories, getPublishedProducts } from '@/lib/products';

export const metadata: Metadata = createPageMetadata({
  title: 'Animal Feed Ingredients in Zimbabwe',
  description: 'Compare livestock feed ingredients available in Zimbabwe: soybean meal, sorghum, wheat bran, sunflower meal, fish meal, amino acids, minerals and premixes. Specifications, packaging and minimum orders.',
  path: '/products',
});

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; animal?: string; category?: string }> }) {
  const [query, products, categories] = await Promise.all([
    searchParams,
    getPublishedProducts(),
    getPublishedProductCategories(),
  ]);
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'FeedSport feed ingredients',
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: product.name,
      url: absoluteUrl(`/products/${product.id}`),
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemListJsonLd) }} />
      <ProductsClient products={products} categories={categories} initialQuery={query.q || ''} initialAnimal={query.animal || 'all'} initialCategory={query.category || 'All'} />
    </>
  );
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import FeedProductCard from '@/components/products/FeedProductCard';
import { feedProducts, productCategories } from '@/data/feedProducts';
import { absoluteUrl, breadcrumbJsonLd, createPageMetadata, serializeJsonLd } from '@/lib/seo';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = productCategories.find((item) => item.slug === slug);
  if (!category) return { title: 'Category not found', robots: { index: false } };

  return createPageMetadata({
    title: `${category.name}: Feed Ingredients`,
    description: `Compare ${category.name.toLowerCase()} supplied by FeedSport, including nutrient specifications, packaging and minimum order quantities.`,
    path: `/products/categories/${category.slug}`,
  });
}

export function generateStaticParams() {
  return productCategories.map(({ slug }) => ({ slug }));
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = productCategories.find((item) => item.slug === slug);
  if (!category) notFound();
  const products = feedProducts.filter((product) => product.categorySlug === slug);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Feed ingredients', path: '/products' },
        { name: category.name, path: `/products/categories/${category.slug}` },
      ]),
      {
        '@type': 'ItemList',
        name: category.name,
        itemListElement: products.map((product, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: product.name,
          url: absoluteUrl(`/products/${product.id}`),
        })),
      },
    ],
  };

  return (
    <main className="fs-page bg-[#f3f0e8] text-[#191b18] [container-type:inline-size]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <nav aria-label="Breadcrumb" className="mb-5 flex gap-2 text-[13px] text-[#4f524b]"><Link href="/products" className="text-[#4f524b]">Products</Link><span>/</span><span>{category.name}</span></nav>
      <p className="fs-label mb-2.5 text-[#4f524b]">Product category</p>
      <h1 className="fs-page-title capitalize">{category.name}</h1>
      <p className="mb-7 mt-4 max-w-[680px] text-[17px] leading-[1.5] text-[#3d403a]">Compare current specifications, packaging and minimum order quantities for every ingredient in this category.</p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,270px),1fr))] gap-4">{products.map((product) => <FeedProductCard key={product.id} product={product} />)}</div>
    </main>
  );
}

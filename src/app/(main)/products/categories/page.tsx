import type { Metadata } from 'next';
import Link from 'next/link';
import DesignPlaceholder from '@/components/common/DesignPlaceholder';
import { categoryImages } from '@/data/unsplashImages';
import { productCategories } from '@/data/feedProducts';
import { feedProducts } from '@/data/feedProductNutrition';
import { absoluteUrl, createPageMetadata, serializeJsonLd } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Feed Ingredient Categories',
  description: 'Browse FeedSport ingredients by nutritional role, including protein feeds, energy feeds, minerals, amino acids and premixes.',
  path: '/products/categories',
});

export default function CategoriesPage() {
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Feed ingredient categories',
    itemListElement: productCategories.map((category, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: category.name,
      url: absoluteUrl(`/products/categories/${category.slug}`),
    })),
  };

  return (
    <main className="fs-page bg-[#f3f0e8] text-[#191b18] [container-type:inline-size]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemListJsonLd) }} />
      <p className="fs-label mb-2.5 text-[#4f524b]">Products</p>
      <h1 className="fs-page-title">Browse by category</h1>
      <p className="mb-7 mt-4 max-w-[680px] text-[17px] leading-[1.5] text-[#3d403a]">Find ingredients by their nutritional role in a feed formulation.</p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,200px),1fr))] gap-3">{productCategories.map((category) => { const products = feedProducts.filter((product) => product.categorySlug === category.slug); return <Link key={category.slug} href={`/products/categories/${category.slug}`} className="fs-card flex flex-col text-[#191b18] no-underline"><DesignPlaceholder label={category.imageLabel} image={categoryImages[category.slug]} sizes="(min-width: 1024px) 17vw, (min-width: 640px) 33vw, 100vw" className="aspect-video rounded-none" /><span className="flex flex-col gap-1 px-3.5 pb-4 pt-3.5"><span className="flex items-baseline justify-between gap-2"><b className="text-[17px]">{category.name}</b><span className="fs-mono text-[12px] text-[#4f524b]">{products.length}</span></span><span className="text-[13px] leading-[1.4] text-[#4f524b]">{products.map((product) => product.name).slice(0, 3).join(', ')}</span></span></Link>; })}</div>
    </main>
  );
}

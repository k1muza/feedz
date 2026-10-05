import { notFound } from 'next/navigation';
import Link from 'next/link';
import FeedProductCard from '@/components/products/FeedProductCard';
import { feedProducts, productCategories } from '@/data/feedProducts';

export function generateStaticParams() {
  return productCategories.map(({ slug }) => ({ slug }));
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = productCategories.find((item) => item.slug === slug);
  if (!category) notFound();
  const products = feedProducts.filter((product) => product.categorySlug === slug);

  return (
    <main className="fs-page bg-[#f3f0e8] text-[#191b18] [container-type:inline-size]">
      <nav aria-label="Breadcrumb" className="mb-5 flex gap-2 text-[13px] text-[#4f524b]"><Link href="/products" className="text-[#4f524b]">Products</Link><span>/</span><span>{category.name}</span></nav>
      <p className="fs-label mb-2.5 text-[#4f524b]">Product category</p>
      <h1 className="fs-page-title capitalize">{category.name}</h1>
      <p className="mb-7 mt-4 max-w-[680px] text-[17px] leading-[1.5] text-[#3d403a]">Compare current specifications, packaging and minimum order quantities for every ingredient in this category.</p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,270px),1fr))] gap-4">{products.map((product) => <FeedProductCard key={product.id} product={product} />)}</div>
    </main>
  );
}

import Link from 'next/link';
import DesignPlaceholder from '@/components/common/DesignPlaceholder';
import { feedProducts, productCategories } from '@/data/feedProducts';

export default function CategoriesPage() {
  return (
    <main className="fs-page bg-[#f3f0e8] text-[#191b18] [container-type:inline-size]">
      <p className="fs-label mb-2.5 text-[#4f524b]">Products</p>
      <h1 className="fs-page-title">Browse by category</h1>
      <p className="mb-7 mt-4 max-w-[680px] text-[17px] leading-[1.5] text-[#3d403a]">Find ingredients by their nutritional role in a feed formulation.</p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,200px),1fr))] gap-3">{productCategories.map((category) => { const products = feedProducts.filter((product) => product.categorySlug === category.slug); return <Link key={category.slug} href={`/products/categories/${category.slug}`} className="fs-card flex flex-col text-[#191b18] no-underline"><DesignPlaceholder label={category.imageLabel} className="aspect-video rounded-none" /><span className="flex flex-col gap-1 px-3.5 pb-4 pt-3.5"><span className="flex items-baseline justify-between gap-2"><b className="text-[17px]">{category.name}</b><span className="fs-mono text-[12px] text-[#4f524b]">{products.length}</span></span><span className="text-[13px] leading-[1.4] text-[#4f524b]">{products.map((product) => product.name).slice(0, 3).join(', ')}</span></span></Link>; })}</div>
    </main>
  );
}

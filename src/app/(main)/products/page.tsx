import SecondaryHero from '@/components/common/SecondaryHero';
import CategoryFilter from '@/components/products/CategoryFilter';
import IngredientCard from '@/components/products/IngredientCard';
import { getAllProducts } from '@/app/actions';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'All Feed Ingredients & Additives',
  description: 'Browse our complete catalog of premium-quality raw materials, including protein feeds, energy sources, minerals, and specialized additives for animal nutrition formulations.',
  alternates: {
    canonical: '/products',
  },
};

export default async function ProductsPage() {
  const products = await getAllProducts();
  return (
    <>
      <SecondaryHero
        title="Feed Ingredients & Additives"
        subtitle="Premium-quality raw materials for animal nutrition formulations"
      />
      <main className="container mx-auto px-4 py-12">
        {/* Category Filter */}
        <CategoryFilter />

        {/* Products Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12 max-w-7xl mx-auto" aria-labelledby="products-heading">
          <h2 id="products-heading" className="sr-only">Product List</h2>
          {products.map((product) => (
            <IngredientCard key={product.id} product={product} />
          ))}
        </section>
      </main>
    </>
  );
}

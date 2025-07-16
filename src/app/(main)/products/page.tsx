
'use client';

import { useState, useEffect } from 'react';
import SecondaryHero from '@/components/common/SecondaryHero';
import IngredientCard from '@/components/products/IngredientCard';
import { getAllProducts } from '@/app/actions';
import { Product } from '@/types';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const allProducts = await getAllProducts();
      setProducts(allProducts);
      setFilteredProducts(allProducts);

      const uniqueCategories = Array.from(
        new Set(allProducts.map(p => p.ingredient?.category).filter(Boolean) as string[])
      );
      setCategories(uniqueCategories);
      setLoading(false);
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (activeCategory === 'all') {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(products.filter(p => p.ingredient?.category === activeCategory));
    }
  }, [activeCategory, products]);

  return (
    <>
      <SecondaryHero
        title="Feed Ingredients & Additives"
        subtitle="Premium-quality raw materials for animal nutrition formulations"
      />
      <main className="container mx-auto px-4 py-12">
        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-12 max-w-7xl mx-auto">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 text-sm md:text-base md:px-6 rounded-full transition-colors duration-200 capitalize font-medium ${
              activeCategory === 'all'
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 text-sm md:text-base md:px-6 rounded-full transition-colors duration-200 capitalize font-medium ${
                activeCategory === category
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.replace('-', ' ')}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {loading ? (
           <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
            <span className="ml-2 text-lg text-gray-600">Loading Products...</span>
          </div>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12 max-w-7xl mx-auto" aria-labelledby="products-heading">
            <h2 id="products-heading" className="sr-only">Product List</h2>
            <AnimatePresence>
              {filteredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  <IngredientCard product={product} />
                </motion.div>
              ))}
            </AnimatePresence>
          </section>
        )}
      </main>
    </>
  );
}

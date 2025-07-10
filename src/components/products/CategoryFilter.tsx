'use client';


import { getNutrients } from '@/data/nutrients';
import { useState } from 'react';

// TODO: Simplify this, categories are simple strings
export default function CategoryFilter() {
  const [activeCategory, setActiveCategory] = useState<string | null | undefined>('all');

  // Get unique categories
  const categories = Array.from(
    new Set(getNutrients().map((nutrient) => nutrient.category))
  ).map((category) => ({ id: category, name: category }));

  return (
    <div className="flex flex-wrap justify-center gap-4 mb-8  max-w-7xl mx-auto">
      <button
        onClick={() => setActiveCategory('all')}
        className={`px-6 py-2 rounded-full ${
          activeCategory === 'all'
            ? 'bg-green-600 text-white'
            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
        }`}
      >
        All Ingredients
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => setActiveCategory(category.id)}
          className={`px-6 py-2 rounded-full ${
            activeCategory === category.id
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}

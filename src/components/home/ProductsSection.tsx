'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FaInfoCircle } from 'react-icons/fa';

import { getFeaturedProducts } from '@/data/products';
import { Composition } from '@/types';

export default function ProductsSection() {
  const products = getFeaturedProducts();
  
  return (
    <section className="py-16 bg-white" id="products">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-block bg-green-50 text-green-600 px-4 py-2 rounded-full text-sm font-semibold mb-3">
            PREMIUM INGREDIENTS
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Scientifically Formulated Feed Ingredients
          </h2>
          <p className="text-lg text-gray-600">
            Optimize animal nutrition with our high-quality raw materials and additives
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300"
            >
              <div className="relative h-48 bg-gray-50">
                <Image
                  src={product.images[0]}
                  alt={product.ingredient?.name || 'Product'}
                  fill
                  className="object-contain p-4"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                />
                {product.certifications.length > 0 && (
                  <div className="absolute top-2 right-2 flex gap-1">
                    {product.certifications.map((cert) => (
                      <span
                        key={cert}
                        className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full"
                        title={cert}
                      >
                        {cert}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-gray-900">{product.ingredient?.name}</h3>
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                    {product.ingredient?.category?.split('-').join(' ')}
                  </span>
                </div>

                <p className="text-gray-600 mb-4 line-clamp-3">
                  {product.ingredient?.description}</p>

                <div className="mb-4">
                  <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-1">
                    <FaInfoCircle className="text-green-500" />
                    <span>Key Specs</span>
                  </h4>
                  <ul className="space-y-1 text-sm">
                    {product.ingredient?.compositions.slice(0, 4).map((composition: Composition, index: number) => (
                      <li key={index} className="flex justify-between">
                        <span className="text-gray-500 capitalize">{composition.nutrient?.name}:</span>
                        <span className="font-medium">{composition.value}{composition.nutrient?.unit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between mt-6">
                  <div>
                    <p className="text-xs text-gray-500">MOQ</p>
                    <p className="font-medium">{product.moq} {product.moq > 1 ? 'tons' : 'ton'}</p>
                  </div>
                  <Link
                    href={`/products/${product.id}`}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            href="/products"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
          >
            Browse All Ingredients
            <svg className="ml-3 -mr-1 w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

import { Product } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import { FaCheck } from 'react-icons/fa';


export default function ProductCard({ product }: { product: Product }) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow duration-300">
      {/* Product Image */}
      <div className="relative h-48 bg-gray-50">
        <Image
          src={product.images[0]}
          alt={product.ingredient?.name || 'Product Image'}
          fill
          className="object-contain p-4"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        {/* Certification badges */}
        {product.certifications && product.certifications.length > 0 && (
          <div className="absolute top-2 right-2">
            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
              {product.certifications[0]}
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900">
            <Link href={`/products/${product.id}`} className="hover:text-green-600">
              {product.ingredient?.name}
            </Link>
          </h3>
          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded capitalize">
            {product.ingredient?.category?.replace('-', ' ')}
          </span>
        </div>

        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.ingredient?.description}</p>

        {/* Price */}
        <div className="mb-4">
          <span className="text-lg font-bold text-gray-900">
            ${product.price.toLocaleString()}/ton
          </span>
          {product.moq && (
            <span className="text-xs text-gray-500 block">MOQ: {product.moq} tons</span>
          )}
        </div>

        {/* Quick specs (example) */}
        <ul className="space-y-1 text-sm text-gray-600 mb-4">
          <li className="flex items-center">
            <FaCheck className="text-green-500 mr-1 text-xs" />
            <span>High protein content</span>
          </li>
          <li className="flex items-center">
            <FaCheck className="text-green-500 mr-1 text-xs" />
            <span>Non-GMO</span>
          </li>
        </ul>

        {/* View Button */}
        <Link
          href={`/products/${product.id}`}
          className="block w-full text-center bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}

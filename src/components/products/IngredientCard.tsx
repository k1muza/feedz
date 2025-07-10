
import { Product } from '@/types';
import Image from 'next/image';
import Link from 'next/link';

export default function IngredientCard({ product }: { product: Product }) {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow">
      <div className="h-48 relative bg-gray-50">
        <Image
          src={product.images[0]}
          alt={product.ingredient?.name || 'Product Image'}
          fill
          className="object-contain p-4"
        />
      </div>

      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{product.ingredient?.name}</h3>
        <p className="text-gray-600 mb-4 line-clamp-2">{product.ingredient?.description}</p>

        <div className="mb-4">
          <h4 className="font-semibold text-gray-800 mb-2">Applications:</h4>
          <div className="flex flex-wrap gap-2">
            {product.ingredient?.applications?.map((app) => (
              <span key={app} className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full">
                {app}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-500">Packaging</p>
            <p className="font-medium">{product.packaging}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">MOQ</p>
            <p className="font-medium">{product.moq} {product.price > 1000 ? 'tons' : 'kg'}</p>
          </div>
        </div>

        <Link
          href={`/products/${product.id}`}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg">
          View Spec Sheet
        </Link>
      </div>
    </div>
  );
}

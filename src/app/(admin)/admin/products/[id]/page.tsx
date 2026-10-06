
'use client';

import { getProductById } from '@/app/actions';
import { notFound, useParams } from 'next/navigation';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { formatKg, packLabel } from '@/lib/product-units';
import { ArrowLeft, Edit } from 'lucide-react';
import { Product } from '@/types';
import { useEffect, useState } from 'react';
import { NutrientCompositionManager } from '@/components/admin/NutrientCompositionManager';

export default function ProductViewPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);

  const fetchProduct = async () => {
    const data = await getProductById(params.id);
    if (!data) {
      notFound();
    }
    setProduct(data);
  };

  useEffect(() => {
    fetchProduct();
  }, [params.id]);

  if (!product) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/products" className="flex items-center gap-2 text-ash-400 hover:text-ash-100">
            <ArrowLeft className="w-4 h-4" />
            Back to Products
        </Link>
        <Link href={`/admin/products/${product.id}/edit`}>
            <button className="px-4 py-2 bg-harvest-600 hover:bg-harvest-500 text-ash-950 rounded-lg flex items-center space-x-2 transition-colors">
              <Edit className="w-4 h-4" />
              <span>Edit Product</span>
            </button>
        </Link>
      </div>
      <div className="bg-ash-800/50 border border-ash-700 rounded-lg p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
                <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-ash-700">
                    <Image
                        src={product.images[0]}
                        alt={product.ingredient?.name || 'Product Image'}
                        fill
                        className="object-cover"
                    />
                </div>
                 <div className="grid grid-cols-4 gap-2 mt-2">
                    {product.images.map((img, idx) => (
                        <div key={idx} className="relative aspect-square w-full overflow-hidden rounded-md bg-ash-700">
                            <Image src={img} alt={`thumb-${idx}`} fill className="object-cover"/>
                        </div>
                    ))}
                </div>
            </div>
            <div className="lg:col-span-2 space-y-6">
                <div>
                    <span className="text-sm text-harvest-400 font-medium uppercase tracking-wider">{product.ingredient?.category?.replace('-', ' ')}</span>
                    <h1 className="text-3xl font-bold text-ash-100 mt-1">{product.ingredient?.name}</h1>
                    <p className="text-ash-400 mt-2">{product.ingredient?.description}</p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-ash-800 p-4 rounded-lg">
                        <p className="text-ash-500">Price</p>
                        <p className="font-semibold text-ash-100 text-lg">${product.price.toLocaleString()} / {packLabel(product.packSizeKg)}</p>
                    </div>
                     <div className="bg-ash-800 p-4 rounded-lg">
                        <p className="text-ash-500">Stock</p>
                        <p className="font-semibold text-ash-100 text-lg">{product.stock} tons</p>
                    </div>
                     <div className="bg-ash-800 p-4 rounded-lg">
                        <p className="text-ash-500">Minimum Order</p>
                        <p className="font-semibold text-ash-100 text-lg">{formatKg(product.moqKg)}</p>
                    </div>
                </div>

                <div>
                    <h3 className="text-md font-semibold text-ash-100 mb-2">Key Benefits</h3>
                    <ul className="list-disc list-inside text-ash-400 space-y-1">
                        {product.ingredient?.key_benefits?.map(benefit => <li key={benefit}>{benefit}</li>)}
                    </ul>
                </div>

                <div>
                    <h3 className="text-md font-semibold text-ash-100 mb-2">Certifications</h3>
                     <div className="flex flex-wrap gap-2">
                        {product.certifications?.map(cert => (
                            <Badge key={cert} variant="secondary" className="bg-ash-700 text-ash-300 border-ash-600">{cert}</Badge>
                        ))}
                    </div>
                </div>

                 <div>
                    <h3 className="text-md font-semibold text-ash-100 mb-2">Technical Specifications</h3>
                    <div className="border border-ash-700 rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-ash-700">
                            <tbody className="divide-y divide-ash-700">
                                {product.ingredient?.compositions?.map(comp => (
                                    <tr key={comp.nutrientId} className="hover:bg-ash-700/50">
                                        <td className="px-4 py-2 text-sm font-medium text-ash-300">{comp.nutrient?.name}</td>
                                        <td className="px-4 py-2 text-sm text-ash-400">{comp.value}{comp.nutrient?.unit}</td>
                                    </tr>
                                ))}
                                {(!product.ingredient?.compositions || product.ingredient.compositions.length === 0) && (
                                    <tr>
                                        <td colSpan={2} className="px-4 py-4 text-center text-sm text-ash-500">No technical specifications available.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
      </div>
      
      {product.ingredientId && product.ingredient && (
          <NutrientCompositionManager 
            ingredientId={product.ingredientId}
            initialCompositions={product.ingredient.compositions}
            onCompositionChange={fetchProduct} // Re-fetch product data on change
          />
      )}
    </div>
  );
}

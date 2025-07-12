'use client';

import { getProductById } from '@/app/actions';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowLeft, Edit } from 'lucide-react';
import { Product } from '@/types';
import { useEffect, useState } from 'react';

export default function ProductViewPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    async function fetchProduct() {
      const data = await getProductById(params.id);
      if (!data) {
        notFound();
      }
      setProduct(data);
    }
    fetchProduct();
  }, [params.id]);

  if (!product) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/products" className="flex items-center gap-2 text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
            Back to Products
        </Link>
        <Link href={`/admin/products/${product.id}/edit`}>
            <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center space-x-2 transition-colors">
              <Edit className="w-4 h-4" />
              <span>Edit Product</span>
            </button>
        </Link>
      </div>
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
                <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-700">
                    <Image
                        src={product.images[0]}
                        alt={product.ingredient?.name || 'Product Image'}
                        fill
                        className="object-cover"
                    />
                </div>
                 <div className="grid grid-cols-4 gap-2 mt-2">
                    {product.images.map((img, idx) => (
                        <div key={idx} className="relative aspect-square w-full overflow-hidden rounded-md bg-gray-700">
                            <Image src={img} alt={`thumb-${idx}`} fill className="object-cover"/>
                        </div>
                    ))}
                </div>
            </div>
            <div className="lg:col-span-2 space-y-6">
                <div>
                    <span className="text-sm text-indigo-400 font-medium uppercase tracking-wider">{product.ingredient?.category?.replace('-', ' ')}</span>
                    <h1 className="text-3xl font-bold text-white mt-1">{product.ingredient?.name}</h1>
                    <p className="text-gray-400 mt-2">{product.ingredient?.description}</p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-gray-800 p-4 rounded-lg">
                        <p className="text-gray-500">Price</p>
                        <p className="font-semibold text-white text-lg">${product.price.toLocaleString()}/ton</p>
                    </div>
                     <div className="bg-gray-800 p-4 rounded-lg">
                        <p className="text-gray-500">Stock</p>
                        <p className="font-semibold text-white text-lg">{product.stock} tons</p>
                    </div>
                     <div className="bg-gray-800 p-4 rounded-lg">
                        <p className="text-gray-500">Minimum Order</p>
                        <p className="font-semibold text-white text-lg">{product.moq} tons</p>
                    </div>
                </div>

                <div>
                    <h3 className="text-md font-semibold text-white mb-2">Key Benefits</h3>
                    <ul className="list-disc list-inside text-gray-400 space-y-1">
                        {product.ingredient?.key_benefits?.map(benefit => <li key={benefit}>{benefit}</li>)}
                    </ul>
                </div>

                <div>
                    <h3 className="text-md font-semibold text-white mb-2">Certifications</h3>
                     <div className="flex flex-wrap gap-2">
                        {product.certifications?.map(cert => (
                            <Badge key={cert} variant="secondary" className="bg-gray-700 text-gray-300 border-gray-600">{cert}</Badge>
                        ))}
                    </div>
                </div>

                 <div>
                    <h3 className="text-md font-semibold text-white mb-2">Technical Specifications</h3>
                    <div className="border border-gray-700 rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-700">
                            <tbody className="divide-y divide-gray-700">
                                {product.ingredient?.compositions?.slice(0, 5).map(comp => (
                                    <tr key={comp.nutrient?.id} className="hover:bg-gray-700/50">
                                        <td className="px-4 py-2 text-sm font-medium text-gray-300">{comp.nutrient?.name}</td>
                                        <td className="px-4 py-2 text-sm text-gray-400">{comp.value}{comp.nutrient?.unit}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

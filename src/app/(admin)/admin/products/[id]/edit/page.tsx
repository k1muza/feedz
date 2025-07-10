'use client';

import { ProductForm } from '@/components/admin/ProductForm';
import { getProductById } from '@/data/products';
import { notFound } from 'next/navigation';

export default function EditProductPage({ params }: { params: { id: string } }) {
  const product = getProductById(params.id);

  if (!product) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Edit Product</h1>
      <ProductForm product={product} />
    </div>
  );
}

'use client';

import { ProductForm } from '@/components/admin/ProductForm';

export default function CreateProductPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Add New Product</h1>
      <ProductForm />
    </div>
  );
}

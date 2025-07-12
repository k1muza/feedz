'use client';

import { ProductForm } from '@/components/admin/ProductForm';
import { getProductById } from '@/app/actions';
import { notFound } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Product } from '@/types';

export default function EditProductPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProduct() {
      const fetchedProduct = await getProductById(params.id);
      if (!fetchedProduct) {
        notFound();
      }
      setProduct(fetchedProduct);
      setLoading(false);
    }
    fetchProduct();
  }, [params.id]);

  if (loading) {
    return <div>Loading product...</div>;
  }

  return (
    <div>
      {product && <ProductForm product={product} />}
    </div>
  );
}

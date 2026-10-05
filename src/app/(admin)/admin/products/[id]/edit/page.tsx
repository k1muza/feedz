'use client';

import { ProductForm } from '@/components/admin/ProductForm';
import { getProductById } from '@/app/actions';
import { notFound, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Product } from '@/types';

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProduct = async () => {
    const fetchedProduct = await getProductById(params.id);
    if (!fetchedProduct) {
      notFound();
    }
    setProduct(fetchedProduct);
    setLoading(false);
  };
  
  useEffect(() => {
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

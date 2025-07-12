import { getAllProducts } from '@/app/actions';
import { ProductsManagement } from '@/components/admin/ProductsManagement';
import { Product } from '@/types';

export default async function ProductsPage() {
  const products: Product[] = await getAllProducts();
  return (
    <div className="container mx-auto px-4">
      <ProductsManagement initialProducts={products} />
    </div>
  );
}

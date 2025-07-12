import { getAllProducts } from '@/app/actions';
import { StockManagement } from '@/components/admin/StockManagement';
import { Product } from '@/types';


export default async function StockPage() {
  const products: Product[] = await getAllProducts();
  return (
    <div className="container mx-auto px-4">
      <StockManagement initialProducts={products} />
    </div>
  );
}

import { getAllProducts } from '@/app/actions';
import ProductCard from './ProductCard';

async function getRelatedProducts(category: string, excludeId: string) {
  const products = await getAllProducts();
  return products.filter(
    product => product.ingredient?.category === category && product.id !== excludeId
  ).slice(0, 4);
}

export default async function RelatedProducts({ 
  currentProductId, 
  category 
}: { 
  currentProductId: string, 
  category: string | undefined
}) {

  if (!category) return null;
  
  const relatedProducts = await getRelatedProducts(category, currentProductId);

  if (relatedProducts.length === 0) return null;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-8">Related Products</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {relatedProducts.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

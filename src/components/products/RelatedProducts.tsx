import { feedProducts } from '@/data/feedProductNutrition';
import FeedProductCard from './FeedProductCard';

export default function RelatedProducts({ 
  currentProductId, 
  category 
}: { 
  currentProductId: string, 
  category: string | undefined
}) {

  if (!category) return null;
  
  const relatedProducts = feedProducts.filter(
    (product) => (product.category === category || product.categorySlug === category) && product.id !== currentProductId
  ).slice(0, 4);

  if (relatedProducts.length === 0) return null;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-8">Related Products</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {relatedProducts.map(product => (
          <FeedProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}


import { getAllProducts } from '@/app/actions';
import HomeClient from '@/components/home/HomeClient';

export default async function HomePage() {
  const allProducts = await getAllProducts();
  
  // Use featured products if available, otherwise fallback to the 3 most recent products
  let featuredProducts = allProducts.filter(p => p.featured);
  if (featuredProducts.length === 0) {
    featuredProducts = allProducts.slice(0, 3);
  }

  return (
    <HomeClient featuredProducts={featuredProducts} />
  );
}

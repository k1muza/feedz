
import { getAllProducts } from '@/app/actions';
import HomeClient from '@/components/home/HomeClient';

export default async function HomePage() {
  const allProducts = await getAllProducts();
  const featuredProducts = allProducts.filter(p => p.featured);

  return (
    <HomeClient featuredProducts={featuredProducts} />
  );
}

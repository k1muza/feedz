import { MetadataRoute } from 'next';
import { productCategories } from '@/data/feedProducts';
import { feedProducts } from '@/data/feedProductNutrition';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://feedsport.co.zw';

  // Static pages
  const staticRoutes = [
    '/',
    '/about',
    '/products',
    '/products/categories',
    '/formulations',
    '/knowledge',
    '/team',
    '/contact',
    '/policies',
    '/terms-of-service',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    changeFrequency: route === '/' ? 'daily' : 'monthly' as 'daily' | 'monthly',
    priority: route === '/' ? 1 : 0.8,
  }));

  // Dynamic product pages
  const productRoutes = feedProducts.map((product) => ({
    url: `${baseUrl}/products/${product.id}`,
    changeFrequency: 'weekly' as 'weekly',
    priority: 0.9,
  }));
  
  // Dynamic category pages
  const categoryRoutes = productCategories.map((category) => ({
    url: `${baseUrl}/products/categories/${category.slug}`,
    changeFrequency: 'weekly' as 'weekly',
    priority: 0.7
  }));
  return [...staticRoutes, ...productRoutes, ...categoryRoutes];
}

import { MetadataRoute } from 'next';
import { feedProducts, productCategories } from '@/data/feedProducts';

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
    '/contact',
    '/policies',
    '/terms-of-service',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '/' ? 'daily' : 'monthly' as 'daily' | 'monthly',
    priority: route === '/' ? 1 : 0.8,
  }));

  // Dynamic product pages
  const productRoutes = feedProducts.map((product) => ({
    url: `${baseUrl}/products/${product.id}`,
    lastModified: new Date(), // In a real app, this would be the product's last updated date
    changeFrequency: 'weekly' as 'weekly',
    priority: 0.9,
  }));
  
  // Dynamic category pages
  const categoryRoutes = productCategories.map((category) => ({
    url: `${baseUrl}/products/categories/${category.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as 'weekly',
    priority: 0.7
  }));
  return [...staticRoutes, ...productRoutes, ...categoryRoutes];
}

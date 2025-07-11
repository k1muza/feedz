import { MetadataRoute } from 'next';
import { getProducts } from '@/data/products';
import { getAllBlogPosts } from '@/app/actions';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://feedsport.co.zw';

  // Static pages
  const staticRoutes = [
    '/',
    '/about',
    '/products',
    '/products/categories',
    '/formulations',
    '/blog',
    '/contact',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '/' ? 'daily' : 'monthly' as 'daily' | 'monthly',
    priority: route === '/' ? 1 : 0.8,
  }));

  // Dynamic product pages
  const products = getProducts();
  const productRoutes = products.map((product) => ({
    url: `${baseUrl}/products/${product.id}`,
    lastModified: new Date(), // In a real app, this would be the product's last updated date
    changeFrequency: 'weekly' as 'weekly',
    priority: 0.9,
  }));
  
  // Dynamic category pages
  const categories = [...new Set(products.map(p => p.ingredient?.category).filter(Boolean))];
  const categoryRoutes = categories.map((category) => ({
    url: `${baseUrl}/products/categories/${category}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as 'weekly',
    priority: 0.7
  }));


  // Dynamic blog post pages
  const blogPosts = await getAllBlogPosts();
  const blogRoutes = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'yearly' as 'yearly', // Assuming blogs aren't updated frequently
    priority: 0.7,
  }));


  return [...staticRoutes, ...productRoutes, ...categoryRoutes, ...blogRoutes];
}

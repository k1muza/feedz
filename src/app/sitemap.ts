import { MetadataRoute } from 'next';
import { productCategories } from '@/data/feedProducts';
import { feedProducts } from '@/data/feedProductNutrition';
import { getPublishedArticles } from '@/lib/content';
import { absoluteUrl } from '@/lib/seo';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const knowledgeArticles = await getPublishedArticles();
  const latestArticle = knowledgeArticles.map((article) => article.updated).sort().at(-1);

  const staticRoutes: MetadataRoute.Sitemap = [
    { path: '/', changeFrequency: 'weekly', priority: 1 },
    { path: '/products', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/knowledge', changeFrequency: 'weekly', priority: 0.8, lastModified: latestArticle },
    { path: '/formulations', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/products/categories', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/about', changeFrequency: 'yearly', priority: 0.6 },
    { path: '/contact', changeFrequency: 'yearly', priority: 0.6 },
    { path: '/team', changeFrequency: 'yearly', priority: 0.4 },
    { path: '/policies', changeFrequency: 'yearly', priority: 0.2 },
    { path: '/terms-of-service', changeFrequency: 'yearly', priority: 0.2 },
  ].map(({ path, ...entry }) => ({ url: absoluteUrl(path), ...entry } as MetadataRoute.Sitemap[number]));

  const productRoutes: MetadataRoute.Sitemap = feedProducts.map((product) => ({
    url: absoluteUrl(`/products/${product.id}`),
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  const categoryRoutes: MetadataRoute.Sitemap = productCategories.map((category) => ({
    url: absoluteUrl(`/products/categories/${category.slug}`),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const articleRoutes: MetadataRoute.Sitemap = knowledgeArticles.map((article) => ({
    url: absoluteUrl(`/knowledge/${article.slug}`),
    lastModified: article.updated,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...staticRoutes, ...productRoutes, ...categoryRoutes, ...articleRoutes];
}

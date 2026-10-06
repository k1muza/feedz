
import HomeClient from '@/components/home/HomeClient';
import { getPublishedArticles } from '@/lib/content';
import { getPublishedProducts } from '@/lib/products';
import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Animal Feed Ingredients Supplier in Zimbabwe | FeedSport',
  absoluteTitle: true,
  description: 'Buy soybean meal, sorghum, wheat bran, sunflower meal, lysine, DCP, limestone and premixes in Harare. Published specifications, practical nutrition support and free feed formulation tools for Zimbabwean farmers.',
  path: '/',
});

export const revalidate = 3600;

const FEATURED_PRODUCT_IDS = ['soybean-meal', 'sorghum', 'wheat-bran', 'lysine'];

export default async function HomePage() {
  const [allArticles, products] = await Promise.all([getPublishedArticles(), getPublishedProducts()]);
  const articles = allArticles.slice(0, 3).map(({ slug, title, topic, image }) => ({ slug, title, topic, image }));
  // Same product objects as the catalogue and specification pages, so the numbers always agree.
  const featuredProducts = FEATURED_PRODUCT_IDS.flatMap((id) => products.find((product) => product.id === id) ?? []);
  const categoryCounts: Record<string, number> = {};
  for (const product of products) categoryCounts[product.categorySlug] = (categoryCounts[product.categorySlug] ?? 0) + 1;
  return <HomeClient articles={articles} featuredProducts={featuredProducts} categoryCounts={categoryCounts} />;
}

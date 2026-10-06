
import HomeClient from '@/components/home/HomeClient';
import { getPublishedArticles } from '@/lib/content';
import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Animal Feed Ingredients Supplier in Zimbabwe | FeedSport',
  absoluteTitle: true,
  description: 'Buy soybean meal, sorghum, wheat bran, sunflower meal, lysine, DCP, limestone and premixes in Harare. Published specifications, practical nutrition support and free feed formulation tools for Zimbabwean farmers.',
  path: '/',
});

export const revalidate = 3600;

export default async function HomePage() {
  const articles = (await getPublishedArticles()).slice(0, 3).map(({ slug, title, topic, image }) => ({ slug, title, topic, image }));
  return <HomeClient articles={articles} />;
}

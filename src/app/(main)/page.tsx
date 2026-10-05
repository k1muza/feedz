
import HomeClient from '@/components/home/HomeClient';
import { createPageMetadata, siteConfig } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Feed Ingredients & Animal Nutrition in Zimbabwe',
  description: siteConfig.description,
  path: '/',
});

export default function HomePage() {
  return <HomeClient />;
}

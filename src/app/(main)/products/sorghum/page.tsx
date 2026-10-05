import { Metadata } from 'next';
import ProductPage from '../[id]/page';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Sorghum Specifications & Nutrition',
  description: 'Compare sorghum feed nutrient specifications, packaging, availability and minimum order information from FeedSport Zimbabwe.',
  path: '/products/sorghum',
});

export default function SorghumPage() {
  return ProductPage({ params: Promise.resolve({ id: 'sorghum' }) });
}

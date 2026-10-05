import { Metadata } from 'next';
import ProductsClient from './ProductsClient';

export const metadata: Metadata = {
  title: 'Feed ingredients',
  description: 'Browse FeedSport feed ingredients by category, animal and availability.',
};

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; animal?: string; category?: string }> }) {
  const query = await searchParams;
  return <ProductsClient initialQuery={query.q || ''} initialAnimal={query.animal || 'all'} initialCategory={query.category || 'All'} />;
}

import FormulationsClient from './FormulationsClient';
import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Livestock Feed Formulation Tool',
  description: 'Check pig, poultry and cattle feed ingredient inclusion rates against practical nutrient targets with FeedSport’s formulation tool.',
  path: '/formulations',
});

export default function FormulationsPage() {
  return <FormulationsClient />;
}

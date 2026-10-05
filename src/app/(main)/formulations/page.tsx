import type { Metadata } from 'next';

import FormulationsClient from './FormulationsClient';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Pig Feed Nutrient Calculator',
  description: 'Check pig feed ingredient inclusion rates against source-backed Brazilian Tables 2024 nutrient requirements.',
  path: '/formulations',
});

export default function FormulationsPage() {
  return <FormulationsClient />;
}

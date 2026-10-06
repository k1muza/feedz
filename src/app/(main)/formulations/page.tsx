import type { Metadata } from 'next';

import FormulationsClient from './FormulationsClient';
import { getIngredientPrices } from '@/lib/ingredient-prices';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Free Pig Feed Formulation Calculator',
  description: 'Free online pig feed calculator. Check ingredient inclusion rates for energy, lysine, calcium and phosphorus against Brazilian Tables 2024 nutrient requirements for each growth stage.',
  path: '/formulations',
});

export const revalidate = 3600;

export default async function FormulationsPage() {
  return <FormulationsClient ingredientPrices={await getIngredientPrices()} />;
}

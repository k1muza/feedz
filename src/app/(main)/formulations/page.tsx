import type { Metadata } from 'next';
import FormulationsClient from './FormulationsClient';
import { getIngredientPackSizes } from '@/lib/ingredient-pack-sizes';
import { getIngredientPrices } from '@/lib/ingredient-prices';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Free Feed Formulation Calculator — FeedSport',
  description: 'Build and compare animal feed mixes by stage using real named premixes, published inclusion rates, Brazilian Tables/PIC requirements and transparent nutrient verification.',
  path: '/formulations',
});

export const revalidate = 3600;

/** Public lead-generation calculator. The authenticated, full-featured workspace
 * remains at /studio, not /dashboard. */
export default async function FormulationsPage() {
  const [ingredientPrices, ingredientPackSizes] = await Promise.all([
    getIngredientPrices(),
    getIngredientPackSizes(),
  ]);
  return <FormulationsClient ingredientPrices={ingredientPrices} ingredientPackSizes={ingredientPackSizes} />;
}

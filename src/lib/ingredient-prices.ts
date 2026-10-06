import 'server-only';

import { cache } from 'react';

import { mergeIngredientPrices, type IngredientDefaultPrice } from '@/lib/feed-ingredient-prices';
import { pricePerTonne } from '@/lib/product-units';
import { absoluteUrl } from '@/lib/seo';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createPublicClient } from '@/lib/supabase/server';

type ProductPriceRow = {
  id: string;
  nutrition_ingredient_id: string;
  name: string;
  price: number | string;
  pack_size_kg: number | string;
  currency: string;
  updated_at: string;
};

/**
 * Planning prices for formulation: FeedSport's published product prices from
 * the database where a product is priced, otherwise the hard-coded defaults.
 */
export const getIngredientPrices = cache(async (): Promise<IngredientDefaultPrice[]> => {
  if (!isSupabaseConfigured) return mergeIngredientPrices([]);

  const { data, error } = await createPublicClient()
    .from('products')
    .select('id, nutrition_ingredient_id, name, price, pack_size_kg, currency, updated_at')
    .eq('active', true)
    .gt('price', 0)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Failed to load product prices, using planning defaults:', error.message);
    return mergeIngredientPrices([]);
  }

  const seen = new Set<string>();
  const overrides = (data as ProductPriceRow[]).flatMap((row): IngredientDefaultPrice[] => {
    // Planning prices are in USD; when several products share an ingredient, the most recently updated wins.
    if (row.currency !== 'USD' || seen.has(row.nutrition_ingredient_id)) return [];
    seen.add(row.nutrition_ingredient_id);
    return [{
      ingredientId: row.nutrition_ingredient_id,
      usdPerTonne: pricePerTonne(Number(row.price), Number(row.pack_size_kg)),
      market: 'Harare',
      asOf: row.updated_at.slice(0, 10),
      sourceScope: 'harare',
      sourceLabel: `FeedSport International — ${row.name}`,
      sourceUrl: absoluteUrl(`/products/${row.id}`),
    }];
  });
  return mergeIngredientPrices(overrides);
});

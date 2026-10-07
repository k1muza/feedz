import 'server-only';

import { cache } from 'react';

import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createPublicClient } from '@/lib/supabase/server';

export type IngredientPackSize = {
  ingredientId: string;
  packSizeKg: number;
};

type ProductPackRow = {
  nutrition_ingredient_id: string;
  pack_size_kg: number | string;
};

/**
 * The smallest quantity FeedSport sells of each formulation ingredient, from
 * the active products in the database. When several products share an
 * ingredient, the most recently updated wins (matching getIngredientPrices).
 */
export const getIngredientPackSizes = cache(async (): Promise<IngredientPackSize[]> => {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await createPublicClient()
    .from('products')
    .select('nutrition_ingredient_id, pack_size_kg')
    .eq('active', true)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Failed to load product pack sizes:', error.message);
    return [];
  }

  const seen = new Set<string>();
  return (data as ProductPackRow[]).flatMap((row): IngredientPackSize[] => {
    if (seen.has(row.nutrition_ingredient_id)) return [];
    seen.add(row.nutrition_ingredient_id);
    return [{ ingredientId: row.nutrition_ingredient_id, packSizeKg: Number(row.pack_size_kg) }];
  });
});

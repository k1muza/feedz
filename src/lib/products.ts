import 'server-only';

import { cache } from 'react';
import { productCategories as fallbackCategories, resolveFeedProductId, type FeedProductCatalogItem } from '@/data/feedProducts';
import { enrichProduct, feedProducts as fallbackProducts } from '@/data/feedProductNutrition';
import type { FeedProduct } from '@/data/feedProducts';
import type { ProductCategory } from '@/types';
import { formatKg } from '@/lib/product-units';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createPublicClient } from '@/lib/supabase/server';

type CategoryRelation = { name: string; slug: string };

type PublicProductRow = {
  id: string;
  nutrition_ingredient_id: string;
  name: string;
  description: string;
  status: FeedProduct['status'];
  animals: string[] | null;
  grade_fallback: string;
  packaging: string;
  price: number | string;
  currency: string;
  pack_size_kg: number | string;
  stock: number | string;
  moq_kg: number | string;
  certifications: string[] | null;
  images: string[] | null;
  shipping: string | null;
  image_label: string;
  origin: string;
  product_categories: CategoryRelation | CategoryRelation[];
};

function relationValue(value: PublicProductRow['product_categories']) {
  return Array.isArray(value) ? value[0] : value;
}

function rowToCatalogItem(row: PublicProductRow): FeedProductCatalogItem {
  const category = relationValue(row.product_categories);
  if (!category) throw new Error(`Product ${row.id} has no category relationship.`);

  return {
    id: row.id,
    nutritionIngredientId: row.nutrition_ingredient_id,
    name: row.name,
    gradeFallback: row.grade_fallback,
    category: category.name,
    categorySlug: category.slug,
    status: row.status,
    moq: formatKg(Number(row.moq_kg)),
    packaging: row.packaging,
    imageLabel: row.image_label || row.name,
    animals: row.animals ?? [],
    description: row.description,
    origin: row.origin,
    certifications: (row.certifications ?? []).join(', ') || 'Supplier dependent',
  };
}

/** Public catalogue rows from Supabase, enriched with technical values from JSON. */
export const getPublishedProducts = cache(async (): Promise<FeedProduct[]> => {
  if (!isSupabaseConfigured) return fallbackProducts;

  const { data, error } = await createPublicClient()
    .from('products')
    .select('id, nutrition_ingredient_id, name, description, status, animals, grade_fallback, packaging, price, currency, pack_size_kg, stock, moq_kg, certifications, images, shipping, image_label, origin, product_categories!inner(name, slug)')
    .eq('active', true)
    .order('name');

  if (error) {
    console.error('Failed to load products, using built-in catalogue:', error.message);
    return fallbackProducts;
  }

  return (data as unknown as PublicProductRow[]).flatMap((row) => {
    try {
      return [{
        ...enrichProduct(rowToCatalogItem(row)),
        price: Number(row.price),
        currency: row.currency,
        packSizeKg: Number(row.pack_size_kg),
        moqKg: Number(row.moq_kg),
        stock: Number(row.stock),
        images: row.images ?? [],
        shipping: row.shipping || undefined,
      }];
    } catch (error) {
      console.error(`Skipping invalid catalogue product ${row.id}:`, error);
      return [];
    }
  });
});

export async function getPublishedProduct(id: string) {
  const resolvedId = resolveFeedProductId(id);
  return (await getPublishedProducts()).find((product) => product.id === resolvedId);
}

export const getPublishedProductCategories = cache(async (): Promise<ProductCategory[]> => {
  if (!isSupabaseConfigured) return fallbackCategories;

  const { data, error } = await createPublicClient()
    .from('product_categories')
    .select('id, name, slug, image_label')
    .order('name');

  if (error) {
    console.error('Failed to load product categories, using built-in categories:', error.message);
    return fallbackCategories;
  }

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    imageLabel: row.image_label,
  }));
});

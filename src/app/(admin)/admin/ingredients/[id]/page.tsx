import { notFound } from 'next/navigation';
import { IngredientDetail } from '@/components/ingredient-detail';
import { INGREDIENT_LIBRARY } from '@/lib/ingredient-nutrients';

export function generateStaticParams() {
  return INGREDIENT_LIBRARY.ingredients.map((ingredient) => ({ id: ingredient.id }));
}

export default async function AdminIngredientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!INGREDIENT_LIBRARY.ingredients.some((ingredient) => ingredient.id === id)) notFound();

  return (
    <IngredientDetail
      ingredientId={id}
      backHref="/admin/ingredients"
      backLabel="Admin ingredient library"
    />
  );
}

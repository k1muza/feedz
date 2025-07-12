import { getAllIngredients } from '@/app/actions';
import { IngredientsManagement } from '@/components/admin/IngredientsManagement';
import { Ingredient } from '@/types';

export default async function IngredientsPage() {
  const ingredients: Ingredient[] = await getAllIngredients();
  return (
    <div className="container mx-auto px-4">
      <IngredientsManagement initialIngredients={ingredients} />
    </div>
  );
}

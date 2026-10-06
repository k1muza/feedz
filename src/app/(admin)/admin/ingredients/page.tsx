import { Database } from 'lucide-react';
import { IngredientNutrientBrowser } from '@/components/ingredient-nutrient-browser';
import { INGREDIENT_LIBRARY } from '@/lib/ingredient-nutrients';

export default function IngredientsPage() {
  return (
    <div className="container mx-auto space-y-6 px-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Database className="h-6 w-6 text-harvest-500" />
          <h1 className="text-2xl font-bold text-ash-100">Ingredient library</h1>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-ash-400">
          {INGREDIENT_LIBRARY.ingredients.length} read-only technical ingredients loaded from the
          checked-in Brazilian Tables JSON files. Manage pricing, stock and catalogue categories
          under Products.
        </p>
      </div>

      <IngredientNutrientBrowser detailBasePath="/admin/ingredients" />
    </div>
  );
}

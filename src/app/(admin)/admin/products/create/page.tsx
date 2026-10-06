import { getNutritionIngredientOptions, getProductCategories } from '@/app/actions';
import { ProductForm } from '@/components/admin/ProductForm';

export default async function CreateProductPage() {
  const [categories, nutritionIngredients] = await Promise.all([
    getProductCategories(),
    getNutritionIngredientOptions(),
  ]);
  return (
    <div>
      <ProductForm categories={categories} nutritionIngredients={nutritionIngredients} />
    </div>
  );
}

import { getNutritionIngredientOptions, getProductById, getProductCategories } from '@/app/actions';
import { ProductForm } from '@/components/admin/ProductForm';
import { notFound } from 'next/navigation';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories, nutritionIngredients] = await Promise.all([
    getProductById(id),
    getProductCategories(),
    getNutritionIngredientOptions(),
  ]);
  if (!product) notFound();

  return (
    <div>
      <ProductForm product={product} categories={categories} nutritionIngredients={nutritionIngredients} />
    </div>
  );
}

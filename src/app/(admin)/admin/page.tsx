import { DashboardClient } from '@/components/admin/DashboardClient';
import { getIngredients } from '@/data/ingredients';
import { getNutrients } from '@/data/nutrients';
import { getAnimals } from '@/data/animals';
import type { Ingredient, Nutrient } from '@/types';
import type { Animal } from '@/types/animals';


export default async function Dashboard() {
  // Fetch data on the server
  const ingredients: Ingredient[] = getIngredients();
  const nutrients: Nutrient[] = getNutrients();
  const animals: Animal[] = getAnimals();

  return (
    <>
      <DashboardClient ingredients={ingredients} nutrients={nutrients} animals={animals} />
    </>
  );
}

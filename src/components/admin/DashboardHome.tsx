import { getNutrients } from '@/data/nutrients';
import { getAnimals } from '@/data/animals';
import { DashboardClient } from './DashboardClient';
import type { Ingredient, Nutrient } from '@/types';
import type { Animal } from '@/types/animals';

export async function DashboardHome() {
  // Fetch data on the server
  const ingredients: Ingredient[] = [];
  const nutrients: Nutrient[] = getNutrients();
  const animals: Animal[] = getAnimals();

  return (
    <DashboardClient ingredients={ingredients} nutrients={nutrients} animals={animals} />
  );
}

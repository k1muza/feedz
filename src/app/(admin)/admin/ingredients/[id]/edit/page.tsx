'use client';

import { IngredientForm } from '@/components/admin/IngredientForm';
import { NutrientCompositionManager } from '@/components/admin/NutrientCompositionManager';
import { getIngredientById } from '@/app/actions';
import { notFound } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Ingredient } from '@/types';

export default function EditIngredientPage({ params }: { params: { id: string } }) {
  const [ingredient, setIngredient] = useState<Ingredient | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchIngredient = async () => {
    setLoading(true);
    const fetchedIngredient = await getIngredientById(params.id);
    if (!fetchedIngredient) {
      notFound();
    }
    setIngredient(fetchedIngredient);
    setLoading(false);
  };
  
  useEffect(() => {
    fetchIngredient();
  }, [params.id]);

  if (loading) {
    return <div>Loading ingredient...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-6">Edit Ingredient</h1>
        {ingredient && <IngredientForm ingredient={ingredient} />}
      </div>
      
      {ingredient && (
          <NutrientCompositionManager 
            ingredientId={ingredient.id}
            initialCompositions={ingredient.compositions || []}
            onCompositionChange={fetchIngredient} // Re-fetch ingredient data on change
          />
      )}
    </div>
  );
}

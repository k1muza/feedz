'use client';

import { IngredientForm } from '@/components/admin/IngredientForm';

export default function CreateIngredientPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Create New Ingredient</h1>
      <IngredientForm />
    </div>
  );
}

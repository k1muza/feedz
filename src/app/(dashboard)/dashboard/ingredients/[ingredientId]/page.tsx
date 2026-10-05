"use client";

import { useParams } from "next/navigation";

import { IngredientDetail } from "@/components/ingredient-detail";

export default function IngredientPage() {
  const params = useParams<{ ingredientId: string }>();
  return <IngredientDetail ingredientId={params.ingredientId} />;
}

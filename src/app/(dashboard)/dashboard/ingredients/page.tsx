import { IngredientNutrientBrowser } from "@/components/ingredient-nutrient-browser";

export default function IngredientCatalogPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Ingredients</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">
          Brazilian Tables 2024 feed ingredient composition used by the formulation engine.
        </p>
      </div>
      <IngredientNutrientBrowser />
    </div>
  );
}

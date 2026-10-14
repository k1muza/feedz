import type { Metadata } from "next";

import { catalogueIngredientName } from "@/lib/studio-catalogue";

type Props = { params: Promise<{ ingredientId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const name = catalogueIngredientName(decodeURIComponent((await params).ingredientId));
  return {
    title: name ? name + " · Ingredient catalogue" : "Ingredient catalogue",
    description: name ? "Nutrient profile, default price and inclusion limits for " + name + "." : "FeedSport nutrient profiles and default prices.",
  };
}

// Rendered by the studio in the layout; this route only sets the URL and title.
export default function Page() {
  return null;
}

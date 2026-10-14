import type { Metadata } from "next";

import { NUTRIENTS, nutrientById } from "@/components/formulation-studio/nutrient-data";

type Props = { params: Promise<{ nutrientId: string }> };

export function generateStaticParams() {
  return NUTRIENTS.map((n) => ({ nutrientId: n.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const nutrient = nutrientById((await params).nutrientId);
  return {
    title: nutrient ? nutrient.name + " · Nutrient data" : "Nutrient data",
    description: nutrient ? nutrient.guide.summary : "The nutrients FeedSport balances and which ingredients supply them.",
  };
}

// Rendered by the studio in the layout; this route only sets the URL and title.
export default function Page() {
  return null;
}

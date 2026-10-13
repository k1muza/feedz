import { StudioLanding, type LandingFeatured } from "@/components/formulation-studio/landing";
import { phaseOf } from "@/components/formulation-studio/engine";
import { getFeaturedFormulations } from "@/lib/featured-formulations";
import { createPageMetadata } from "@/lib/seo";
import { getStudioCatalogue } from "@/lib/studio-catalogue";
import { getStudioProgrammes } from "@/lib/studio-programmes";

export const metadata = createPageMetadata({
  title: "FeedSport Studio | Least-cost feed formulation for pigs and poultry",
  absoluteTitle: true,
  description: "Formulate pig and poultry feed from the ingredients you actually have. Choose the animal and stage, enter your prices, and get a least-cost recipe that meets every hard requirement. Free with a FeedSport account.",
  path: "/studio-tour",
  keywords: ["feed formulation software", "least-cost feed formulation", "pig feed formulation", "poultry feed formulation", "feed formulation Zimbabwe", "FeedSport Studio"],
  // 1200×630 JPEG: the size WhatsApp and Facebook render as a large preview without cropping.
  image: { url: "/images/studio/studio-tour-og.jpg", alt: "FeedSport Studio feed formulation workspace", width: 1200, height: 630, type: "image/jpeg" },
});

export const revalidate = 3600;

const CATEGORY_ORDER = ["Cereal", "Protein meal", "By-product", "Oil and fat", "Other", "Mineral", "Amino acid", "Premix"];

// The public introduction to the studio. Featured formulations are the same
// published rows as the studio's Home screen, summarised from their stored
// settings rather than re-formulated, so the page stays static.
export default async function StudioTourPage() {
  const [featured, catalogue] = await Promise.all([getFeaturedFormulations(), getStudioCatalogue()]);
  const programmes = getStudioProgrammes();
  const byId = new Map(catalogue.map((ingredient) => [ingredient.id, ingredient]));
  const cards: LandingFeatured[] = featured.slice(0, 3).map((f) => {
    const { programme, phase } = phaseOf(programmes, f.snap.programmeId, f.snap.phaseId);
    // Bulk feedstuffs first, so the summary reads "Maize, soybean meal…" rather than leading with additives.
    const used = Object.entries(f.snap.pool)
      .flatMap(([id, entry]) => (entry.role === "excluded" ? [] : byId.get(id) ?? []))
      .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category))
      .map((ingredient) => ingredient.name);
    return {
      id: f.id,
      prog: programme.name + " · " + phase.label,
      name: f.name,
      desc: f.desc,
      ings: used.length + " ingredients · " + used.slice(0, 4).join(" · ") + (used.length > 4 ? " +" + (used.length - 4) : ""),
      author: f.author,
      role: [f.role, f.place].filter(Boolean).join(" · "),
    };
  });
  return <StudioLanding featured={cards} />;
}

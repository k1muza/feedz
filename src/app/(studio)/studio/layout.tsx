import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import { studioMono, studioSans } from "@/components/formulation-studio/fonts";
import { FormulationStudio } from "@/components/formulation-studio/studio";
import { getFeaturedFormulations } from "@/lib/featured-formulations";
import { getStudioCatalogue } from "@/lib/studio-catalogue";
import { getStudioNutrients } from "@/lib/studio-nutrients";
import { getStudioProgrammes } from "@/lib/studio-programmes";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// The studio lives in the layout so its state (an unsaved draft, an open
// result) survives moving between /studio routes. The pages below only give
// each screen its URL and title; the studio reads the URL to pick the screen.
// The ingredient catalogue, nutrient data and feeding programmes are real,
// built here on the server.
export default async function StudioLayout({ children }: { children: ReactNode }) {
  const [catalogue, featured] = await Promise.all([getStudioCatalogue(), getFeaturedFormulations()]);
  return (
    <div className={`${studioSans.variable} ${studioMono.variable}`}>
      <Suspense>
        <FormulationStudio catalogue={catalogue} nutrients={getStudioNutrients()} programmes={getStudioProgrammes()} featured={featured} />
      </Suspense>
      {children}
    </div>
  );
}

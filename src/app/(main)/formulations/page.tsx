'use client';
import AboutSection from "@/components/home/AboutSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import FeedFormulationsStrip from "@/components/home/FormulationStripe";
import HeroSection from "@/components/home/HeroSection";

export default function FormulationsPage() {
  return (
    <main>
      <HeroSection />
      <FeedFormulationsStrip />
      <AboutSection />
    </main>
  );
}

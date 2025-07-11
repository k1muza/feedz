'use client';
import AboutSection from "@/components/home/AboutSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import FeedFormulationsStrip from "@/components/home/FormulationStripe";
import HeroSection from "@/components/home/HeroSection";
import ProductsSection from "@/components/home/ProductsSection";

export default function Home() {
  return (
    <main>
      <HeroSection />
      <FeedFormulationsStrip />
      <AboutSection />
      <ProductsSection />
    </main>
  );
}

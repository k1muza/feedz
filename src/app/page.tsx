import { RecommendationForm } from '@/components/recommendation-form';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-16">
      <section className="grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-headline tracking-tighter text-primary-foreground/90">
            Intelligent Nutrition,
            <br />
            <span className="text-primary">Simplified.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl">
            Welcome to Feedz. Harness the power of AI to create optimal feed
            formulas. Get instant, data-driven recommendations for any animal
            and nutritional goal.
          </p>
        </div>
        <div className="relative h-64 md:h-96 rounded-2xl overflow-hidden shadow-2xl">
          <Image
            src="https://placehold.co/600x400.png"
            alt="Animal feed ingredients"
            data-ai-hint="farm livestock"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      </section>

      <section className="mt-16 md:mt-24">
        <div className="max-w-4xl mx-auto">
          <RecommendationForm />
        </div>
      </section>
    </div>
  );
}

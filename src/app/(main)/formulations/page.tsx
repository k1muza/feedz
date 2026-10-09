import type { Metadata } from 'next';
import Link from 'next/link';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Feed Formulation — FeedSport Studio',
  description: 'Formulate feed with identifiable commercial premixes and transparent nutrient verification in FeedSport Studio.',
  path: '/formulations',
});

/**
 * Retired public calculator generated a hypothetical 1% premix that exactly
 * matched every programme's vitamin targets. It cannot safely claim complete
 * feed verification. Direct farmers to Studio's product-backed workflow.
 */
export default function FormulationsPage() {
  return (
    <main className="fs-page">
      <div className="mx-auto max-w-3xl space-y-5 py-12">
        <p className="fs-label">FeedSport formulation</p>
        <h1 className="fs-page-title">Formulate with a real premix</h1>
        <p>
          We have retired the old theoretical 10 kg/t premix. FeedSport Studio
          now uses named commercial products and their published addition rates.
          Supplier concentrations and full feed micronutrient coverage remain
          unverified until supported by a confirmed manufacturer specification.
        </p>
        <p>
          You can still plan basal feed ingredients in Studio, but do not treat
          a result as complete feed until its commercial premix has been verified
          and the recipe reviewed by a qualified animal nutritionist.
        </p>
        <Link href="/dashboard" className="inline-flex rounded-md bg-ink px-5 py-3 font-semibold text-white">
          Open FeedSport Studio
        </Link>
      </div>
    </main>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import DesignPlaceholder from '@/components/common/DesignPlaceholder';
import { siteImages } from '@/data/unsplashImages';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'About Us: Feed Ingredients and Nutrition Support in Harare',
  description: 'FeedSport combines dependable feed ingredients with practical animal nutrition support for farmers and feed manufacturers in Zimbabwe.',
  path: '/about',
});

const values = [
  { name: 'Useful science', copy: 'Nutrient data and formulation guidance should help a farmer make a better decision, not decorate a brochure.' },
  { name: 'Clear specifications', copy: 'We state what an ingredient contains, how it is supplied and the minimum quantity before you ask for a price.' },
  { name: 'Practical support', copy: 'Our role continues after the sale, from choosing an ingredient to checking how it fits into a complete feed.' },
];

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-[1100px] bg-[#f3f0e8] px-[clamp(20px,4cqi,40px)] pb-[clamp(56px,7cqi,96px)] pt-[clamp(24px,4cqi,48px)] [container-type:inline-size]">
      <p className="fs-mono mb-2.5 mt-0 text-[12px] uppercase tracking-[.08em] text-[#4f524b]">About FeedSport</p>
      <h1 className="fs-page-title mb-5">A feed store with a nutritionist behind the counter</h1>
      <p className="mb-10 mt-0 max-w-[760px] text-[19px] leading-[1.55] text-[#3d403a]">FeedSport supplies feed ingredients and practical nutrition support to livestock producers and feed manufacturers in Zimbabwe. The catalogue, its specifications and the formulation tools are the heart of what we do.</p>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-x-10 gap-y-5 border-t-2 border-[#191b18] py-7">
        <h2 className="m-0 text-[24px] font-bold">What we are here to do</h2>
        <div className="flex flex-col gap-4 text-[16px] leading-[1.55] text-[#3d403a]"><p className="m-0">Better animal performance begins with knowing what is in the feed. We make reliable ingredients easier to compare, source and use correctly.</p><p className="m-0">Farmers can begin with an animal and stage. Feed manufacturers can begin with a specification. Both should reach the same clear product data and a team that can help when the answer is not obvious.</p></div>
      </section>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-x-10 gap-y-5 border-t-2 border-[#191b18] py-7">
        <div><h2 className="m-0 text-[24px] font-bold">How we work</h2><p className="mb-0 mt-2 text-[15px] leading-[1.5] text-[#4f524b]">Straightforward principles for every product and recommendation.</p></div>
        <div className="grid gap-2.5">{values.map((value, index) => <article key={value.name} className="grid gap-1.5 rounded-[6px] border border-[#d9d4c7] bg-[#fbfaf6] px-4 py-3.5"><div className="flex items-baseline justify-between gap-2"><h3 className="m-0 text-[17px] font-bold">{value.name}</h3><span className="fs-mono text-[12px] text-[#1d3a2a]">0{index + 1}</span></div><p className="m-0 text-[14px] leading-[1.5] text-[#4f524b]">{value.copy}</p></article>)}</div>
      </section>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-x-10 gap-y-5 border-t-2 border-[#191b18] py-7">
        <div><h2 className="m-0 text-[24px] font-bold">People behind the feed</h2><p className="mb-0 mt-2 text-[16px] leading-[1.55] text-[#3d403a]">Product knowledge, formulation support and delivery coordination sit together, so a technical question does not get lost between departments.</p><Link href="/team" className="mt-5 inline-flex h-[42px] items-center rounded-[4px] border-[1.5px] border-[#191b18] px-4 text-[14px] font-semibold text-[#191b18] no-underline">Meet the team →</Link></div>
        <DesignPlaceholder label="team at work: loading, mixing, sampling" image={siteImages.warehouse} sizes="(min-width: 1024px) 50vw, 100vw" className="aspect-[3/2] rounded-[6px]"/>
      </section>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-x-10 gap-y-5 border-t-2 border-[#191b18] py-7">
        <h2 className="m-0 text-[24px] font-bold">What customers can expect</h2>
        <ul className="m-0 flex list-disc flex-col gap-2.5 pl-5 text-[16px] leading-[1.55] text-[#3d403a]"><li>Published nutrient profiles and packaging information.</li><li>Minimum order and availability made visible early.</li><li>Ingredient guidance by animal and production stage.</li><li>A formulation check before committing to a full order.</li><li>Direct access to the team for sourcing and technical questions.</li></ul>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-[6px] bg-[#1d3a2a] px-6 py-[22px] text-white"><div className="flex flex-col gap-1"><span className="text-[18px] font-bold">Tell us what you are feeding.</span><span className="text-[15px] text-[#dfe6dc]">We’ll help you identify the ingredients and information you need.</span></div><Link href="/contact" className="inline-flex h-[46px] items-center rounded-[4px] bg-[#fbfaf6] px-[18px] text-[15px] font-semibold text-[#1d3a2a] no-underline">Talk to FeedSport</Link></section>
    </main>
  );
}

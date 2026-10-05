'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import DesignPlaceholder from '@/components/common/DesignPlaceholder';

type DisplayProduct = {
  id: string;
  name: string;
  category: string;
  grade: string;
  description: string;
  stock: number;
  moq: string;
  specs: { label: string; value: string; unit: string }[];
};

const fallbackProducts: DisplayProduct[] = [
  { id: 'soybean-meal', name: 'Soybean meal', category: 'Protein feeds', grade: 'Hi-Pro, 46% CP', description: 'Solvent-extracted soybean meal, the main protein source in most pig and poultry diets.', stock: 18, moq: '1 tonne', specs: [{ label: 'Protein', value: '46', unit: '%' }, { label: 'ME poultry', value: '2,450', unit: 'kcal/kg' }, { label: 'Fibre', value: '6.0', unit: '%' }] },
  { id: 'sorghum', name: 'Sorghum', category: 'Energy feeds', grade: 'Whole or hammer-milled', description: 'A versatile energy grain for pig, poultry and cattle diets. Supplied whole or milled.', stock: 24, moq: '5 tonnes', specs: [{ label: 'Protein', value: '10.5', unit: '%' }, { label: 'ME poultry', value: '3,250', unit: 'kcal/kg' }, { label: 'Fat', value: '3.2', unit: '%' }] },
  { id: 'wheat-bran', name: 'Wheat bran', category: 'Fibre products', grade: 'Coarse', description: 'Milling by-product with moderate protein and high fibre. Common in sow, ruminant and layer rations.', stock: 5, moq: '1 tonne', specs: [{ label: 'Protein', value: '15.5', unit: '%' }, { label: 'Fibre', value: '10.0', unit: '%' }, { label: 'ME poultry', value: '1,300', unit: 'kcal/kg' }] },
  { id: 'lysine', name: 'L-Lysine HCl', category: 'Amino acids', grade: 'Feed grade, 98.5%', description: 'Synthetic lysine to meet amino acid targets with less soybean meal.', stock: 12, moq: '25 kg', specs: [{ label: 'Lysine', value: '78.8', unit: '%' }, { label: 'Purity', value: '98.5', unit: '%' }] },
];

const categories = [
  { name: 'Protein feeds', slug: 'protein-feeds', count: 3, imageLabel: 'soybean / fish meal', examples: 'Soybean meal, fish meal, sunflower meal' },
  { name: 'Energy feeds', slug: 'energy-feeds', count: 1, imageLabel: 'sorghum', examples: 'Sorghum and energy concentrates' },
  { name: 'Fibre products', slug: 'fiber-products', count: 1, imageLabel: 'wheat bran', examples: 'Wheat bran and high-fibre ingredients' },
  { name: 'Minerals', slug: 'minerals', count: 2, imageLabel: 'DCP / limestone', examples: 'DCP, limestone and bone meal' },
  { name: 'Amino acids', slug: 'amino-acids', count: 2, imageLabel: 'lysine granules', examples: 'Lysine, methionine and threonine' },
  { name: 'Premixes & additives', slug: 'premixes-additives', count: 1, imageLabel: 'premix bags', examples: 'Species and stage-specific premixes' },
];

const animals = [
  { id: 'pigs', name: 'Pigs', stages: ['Piglets', 'Growers', 'Finishers', 'Sows', 'Boars'], imageLabel: 'pigs — grower pen at feeding time', ingredients: ['Sorghum', 'Soybean meal', 'Wheat bran', 'Fish meal', 'L-Lysine HCl'] },
  { id: 'poultry', name: 'Poultry', stages: ['Broilers', 'Layers', 'Breeders'], imageLabel: 'poultry — broiler house or layer flock', ingredients: ['Sorghum', 'Soybean meal', 'Fish meal', 'Dicalcium phosphate', 'L-Lysine HCl'] },
  { id: 'cattle', name: 'Cattle', stages: ['Beef', 'Dairy'], imageLabel: 'cattle — feedlot or dairy herd', ingredients: ['Sorghum', 'Sunflower meal', 'Wheat bran', 'Feed limestone', 'Dicalcium phosphate'] },
  { id: 'other', name: 'Other livestock', stages: ['Goats & sheep', 'Rabbits'], imageLabel: 'goats and sheep — on farm', ingredients: ['Wheat bran', 'Sunflower meal', 'Sorghum', 'Feed limestone'] },
];

const knowledge = [
  { topic: 'Pig nutrition', title: 'Feeding growers: protein, energy and lysine in practice', imageLabel: 'pigs at the trough' },
  { topic: 'Feed ingredients', title: 'How to read a feed ingredient specification', imageLabel: 'spec sheet on a bag' },
  { topic: 'Feed formulation', title: 'Using wheat bran in sow diets', imageLabel: 'wheat bran in hand' },
];

export default function HomeClient() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeAnimal, setActiveAnimal] = useState(animals[0]);
  const products = fallbackProducts;

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    router.push(query.trim() ? `/products?q=${encodeURIComponent(query.trim())}` : '/products');
  };

  return (
    <main className="overflow-hidden bg-[#f3f0e8] text-[#191b18] [container-type:inline-size]">
      <section className="fs-frame pb-0 pt-[clamp(28px,5cqi,64px)]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,460px),1fr))] gap-[clamp(28px,4cqi,56px)]">
          <div className="flex flex-col justify-between gap-10">
            <div className="flex flex-col gap-6">
              <p className="fs-mono m-0 text-[12px] uppercase tracking-[.08em] text-[#4f524b]">Feed ingredients · Animal nutrition · Formulation</p>
              <h1 className="m-0 text-balance text-[clamp(44px,6.6cqi,96px)] font-bold leading-[.96] tracking-[-.035em]">Better feed starts with better ingredients.</h1>
              <p className="m-0 max-w-[520px] text-pretty text-[clamp(17px,1.5cqi,20px)] leading-[1.5] text-[#3d403a]">Quality feed ingredients and practical nutrition solutions for livestock producers and feed manufacturers.</p>
              <div className="flex flex-wrap gap-3">
                <Link href="/products" className="fs-button-primary inline-flex items-center gap-2.5 no-underline">Browse ingredients <span>→</span></Link>
                <Link href="#animals" className="fs-button-secondary inline-flex items-center no-underline">Find a feed solution</Link>
              </div>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] border-t border-[#191b18]">
              {[['Farmers', 'Start with your animal →', '#animals'], ['Feed manufacturers', 'Compare specs and MOQ →', '/products'], ['Nutritionists', 'Check a formulation →', '/formulations']].map(([label, copy, href]) => (
                <Link key={label} href={href} className="flex flex-col gap-1.5 px-0 pb-1 pt-4 text-[#191b18] no-underline">
                  <span className="fs-label text-[#4f524b]">{label}</span><span className="pr-4 text-[15px] font-semibold leading-[1.35]">{copy}</span>
                </Link>
              ))}
            </div>
          </div>

          <DesignPlaceholder label="hero photograph — feed ingredients at the store: bagged soybean meal, open sorghum, wheat bran" labelPosition="top" strong className="min-h-[clamp(420px,46cqi,620px)] rounded-[8px]">
            <div className="absolute bottom-[clamp(14px,2.4cqi,28px)] left-[clamp(14px,2.4cqi,28px)] right-[clamp(14px,2.4cqi,28px)] max-w-[380px] overflow-hidden rounded-[6px] bg-[#fbfaf6] shadow-[0_16px_48px_rgb(25_27_24/.2)]">
              <div className="flex items-center justify-between border-b border-[#d9d4c7] px-4 py-3"><span className="fs-label text-[#4f524b]">Protein feeds</span><span className="inline-flex items-center gap-1.5 text-[12px] font-semibold"><i className="h-[7px] w-[7px] rounded-full bg-[#2e7d4f]" />In stock</span></div>
              <div className="px-4 pb-3 pt-3.5"><div className="text-[22px] font-bold">Soybean meal</div><div className="mt-0.5 text-[13px] text-[#4f524b]">Hi-Pro, 46% CP · 50 kg bags or bulk</div></div>
              <div className="grid grid-cols-3 border-t border-[#d9d4c7]">
                {[['Protein', '46', '%'], ['ME', '2,450', 'kcal'], ['MOQ', '1', 't']].map(([label, value, unit], index) => <div key={label} className={`px-4 py-2.5 ${index < 2 ? 'border-r border-[#d9d4c7]' : ''}`}><div className="fs-label text-[10px] text-[#4f524b]">{label}</div><div className="text-[22px] font-semibold tabular-nums">{value}<span className="ml-0.5 text-[11px] font-normal text-[#4f524b]">{unit}</span></div></div>)}
              </div>
              <Link href="/products/soybean-meal" className="flex w-full justify-between bg-[#1d3a2a] px-4 py-[13px] text-[14px] font-semibold text-white no-underline">View full specification <span>→</span></Link>
            </div>
          </DesignPlaceholder>
        </div>
      </section>

      <section className="fs-frame mt-[clamp(24px,3.5cqi,40px)]">
        <form onSubmit={submitSearch} className="grid gap-[18px] rounded-[8px] bg-[#1d3a2a] p-[clamp(22px,3.6cqi,44px)] text-white">
          <label htmlFor="home-search" className="text-[clamp(26px,2.8cqi,40px)] font-bold leading-[1.05] tracking-[-.02em]">What ingredient are you looking for?</label>
          <div className="flex gap-2 rounded-[6px] bg-[#fbfaf6] p-1.5"><input id="home-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by ingredient, nutrient or animal" className="h-[52px] min-w-0 flex-1 border-0 bg-transparent px-3.5 text-[18px] text-[#191b18] outline-none" /><button className="fs-button-amber h-[52px] px-[clamp(16px,2cqi,28px)]">Search</button></div>
          <div className="flex flex-wrap items-center gap-2"><span className="mr-1 text-[14px] text-[#c9d4c8]">Try</span>{['Wheat bran', 'Soybean meal', 'Sorghum', 'Lysine', 'Premix'].map((term) => <button type="button" key={term} onClick={() => { setQuery(term); router.push(`/products?q=${encodeURIComponent(term)}`); }} className="h-[34px] rounded-full border border-white/40 bg-transparent px-3.5 text-[14px] text-white hover:bg-white/10">{term}</button>)}</div>
        </form>
      </section>

      <section className="fs-frame fs-section">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><h2 className="fs-h2">Browse by category</h2><Link href="/products" className="border-b-[1.5px] border-[#191b18] pb-0.5 font-semibold text-[#191b18] no-underline">All ingredients →</Link></div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,200px),1fr))] gap-3">
          {categories.map((category) => <Link key={category.name} href={`/products/categories/${category.slug}`} className="fs-card flex flex-col text-[#191b18] no-underline"><DesignPlaceholder label={category.imageLabel} className="block aspect-video rounded-none"/><span className="flex flex-col gap-1 px-3.5 pb-4 pt-3.5"><span className="flex items-baseline justify-between gap-2"><b className="text-[17px]">{category.name}</b><span className="fs-mono text-[12px] text-[#4f524b]">{category.count}</span></span><span className="text-[13px] leading-[1.4] text-[#4f524b]">{category.examples}</span></span></Link>)}
        </div>
      </section>

      <section id="animals" className="mt-[clamp(56px,7cqi,96px)] scroll-mt-20 border-y border-[#d9d4c7] bg-[#fbfaf6]">
        <div className="fs-frame grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-[clamp(28px,4cqi,56px)] py-[clamp(48px,6cqi,80px)]">
          <div className="flex flex-col gap-5"><h2 className="fs-h2">Start with your animal</h2><p className="m-0 max-w-[420px] text-[17px] leading-[1.5] text-[#3d403a]">Not sure which ingredients you need? Choose the animal and stage, and we’ll show you what usually goes into the feed.</p><div className="flex flex-col border-t border-[#191b18]">{animals.map((animal) => <button key={animal.id} onClick={() => setActiveAnimal(animal)} aria-pressed={activeAnimal.id === animal.id} className={`flex min-h-[60px] items-center justify-between border-x-0 border-b border-t-0 border-[#d9d4c7] px-4 text-left text-[22px] font-bold ${activeAnimal.id === animal.id ? 'bg-[#1d3a2a] text-white' : 'bg-transparent text-[#191b18]'}`}><span>{animal.name}</span><span className="fs-mono text-[12px] font-medium">{animal.stages.length} stages</span></button>)}</div></div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] content-start gap-5"><DesignPlaceholder label={activeAnimal.imageLabel} className="min-h-[280px] rounded-[6px]"/><div className="flex flex-col gap-[18px]"><div className="flex flex-col gap-2.5"><span className="fs-label text-[#4f524b]">Stage</span><div className="flex flex-wrap gap-1.5">{activeAnimal.stages.map((stage) => <Link href={`/products?animal=${activeAnimal.id}`} key={stage} className="inline-flex h-9 items-center rounded-full border border-[#d9d4c7] bg-[#f3f0e8] px-3.5 text-[14px] font-medium text-[#191b18] no-underline hover:border-[#1d3a2a]">{stage}</Link>)}</div></div><div className="flex flex-col"><span className="fs-label border-b border-[#d9d4c7] pb-2 text-[#4f524b]">Commonly used in {activeAnimal.name.toLowerCase()} feed</span>{activeAnimal.ingredients.map((ingredient) => <Link href={`/search?q=${encodeURIComponent(ingredient)}`} key={ingredient} className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[#d9d4c7] text-[15px] font-semibold text-[#191b18] no-underline"><span>{ingredient}</span><span className="text-[#4f524b]">→</span></Link>)}</div><a href="https://wa.me/263774684534" className="text-[15px] font-semibold text-[#1d3a2a] no-underline">Not sure? Ask FeedSport about your {activeAnimal.name.toLowerCase()} feed →</a></div></div>
        </div>
      </section>

      <section className="fs-frame fs-section">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div className="flex flex-col gap-2"><h2 className="fs-h2">Available now</h2><p className="m-0 text-[16px] text-[#4f524b]">Key specs and minimum order on every card.</p></div><Link href="/products" className="border-b-[1.5px] border-[#191b18] pb-0.5 font-semibold text-[#191b18] no-underline">See all ingredients →</Link></div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,270px),1fr))] gap-4">{products.map((product) => <article key={product.id} className="fs-card flex h-full flex-col"><Link href={`/products/${product.id}`} className="relative block aspect-[16/10]"><DesignPlaceholder label={`${product.name.toLowerCase()} — macro, top-down`} className="h-full w-full rounded-none"/><span className="absolute left-3 top-3 inline-flex h-6 items-center gap-1.5 rounded-[3px] bg-[#fbfaf6] px-[9px] text-[12px] font-semibold text-[#191b18]"><i className={`h-[7px] w-[7px] rounded-full ${product.stock > 5 ? 'bg-[#2e7d4f]' : 'bg-[#b7791f]'}`} />{product.stock > 5 ? 'In stock' : 'Limited'}</span></Link><div className="flex flex-col gap-1 px-4 pt-4"><span className="fs-label text-[#4f524b]">{product.category}</span><h3 className="m-0 text-[19px] font-bold leading-[1.2] tracking-[-.01em]">{product.name}</h3><span className="text-[13px] text-[#4f524b]">{product.grade}</span></div><p className="mx-4 mb-0 mt-2.5 text-[14px] leading-[1.45] text-[#4f524b]">{product.description}</p><dl className="mx-4 mb-0 mt-3.5 grid auto-cols-fr grid-flow-col gap-3 border-y border-[#d9d4c7]">{product.specs.map((spec) => <div key={spec.label} className="min-w-0 py-2.5"><dt className="fs-label truncate text-[10px] text-[#4f524b]">{spec.label}</dt><dd className="m-0 mt-0.5 text-[20px] font-semibold leading-[1.1] tabular-nums">{spec.value}<span className="ml-1 text-[11px] font-medium text-[#4f524b]">{spec.unit}</span></dd></div>)}</dl><div className="mt-auto flex items-center justify-between gap-3 px-4 pb-4 pt-3.5"><div className="flex flex-col gap-0.5"><span className="fs-label text-[10px] text-[#4f524b]">MOQ</span><span className="text-[14px] font-semibold">{product.moq}</span></div><div className="flex gap-2"><Link href={`/products/${product.id}`} className="inline-flex h-[38px] items-center rounded-[4px] border-[1.5px] border-[#191b18] px-3.5 text-[14px] font-semibold text-[#191b18] no-underline">Specs</Link><a href={`https://wa.me/263774684534?text=${encodeURIComponent(`Please quote ${product.name}`)}`} className="inline-flex h-[38px] items-center rounded-[4px] bg-[#d99a2b] px-3.5 text-[14px] font-semibold text-[#191b18] no-underline">Quote</a></div></div></article>)}</div>
      </section>

      <section className="fs-frame fs-section">
        <h2 className="fs-h2 max-w-[760px]">From ingredient to finished feed</h2><p className="mb-8 mt-2 max-w-[560px] text-[17px] leading-[1.5] text-[#3d403a]">We sell the ingredients, and we help you put them together properly.</p>
        <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,230px),1fr))] border-t-2 border-[#191b18] p-0">{[
          ['01', 'Ingredients', 'Raw materials with published nutrient profiles, so you know what you’re buying.', '/products', 'Browse ingredients →'],
          ['02', 'Nutrient requirements', 'Targets for protein, energy, amino acids and minerals by animal and stage.', '#animals', 'Choose your animal →'],
          ['03', 'Formulation', 'Balance inclusion rates against those targets and see where a diet falls short.', '/formulations', 'Try the formulator →'],
          ['04', 'Feed', 'Order the ingredients for your formula, delivered to your farm or mill.', 'https://wa.me/263774684534', 'Request a quote →'],
        ].map(([number, title, copy, href, action]) => <li key={number} className="flex flex-col gap-2.5 pb-6 pr-5 pt-5"><span className="fs-mono text-[13px] font-semibold text-[#1d3a2a]">{number}</span><h3 className="m-0 text-[22px] font-bold">{title}</h3><p className="m-0 text-[15px] leading-[1.5] text-[#4f524b]">{copy}</p><Link href={href} className="mt-1 text-[14px] font-semibold text-[#191b18] no-underline">{action}</Link></li>)}</ol>
      </section>

      <section className="mt-[clamp(56px,7cqi,96px)] bg-[#1d3a2a] text-white"><div className="fs-frame grid grid-cols-[repeat(auto-fit,minmax(min(100%,400px),1fr))] items-center gap-[clamp(32px,5cqi,72px)] py-[clamp(48px,6cqi,88px)]"><div className="flex flex-col gap-5"><span className="fs-mono text-[12px] uppercase tracking-[.08em] text-[#c9d4c8]">Formulation</span><h2 className="m-0 text-[clamp(36px,4.6cqi,68px)] font-bold leading-[.98] tracking-[-.03em]">Know what goes into your feed.</h2><p className="m-0 max-w-[460px] text-[18px] leading-[1.5] text-[#dfe6dc]">Build or evaluate feed formulations against nutritional requirements.</p><div><Link href="/formulations" className="inline-flex h-[54px] items-center rounded-[4px] bg-[#fbfaf6] px-[26px] text-[16px] font-semibold text-[#1d3a2a] no-underline">Explore formulation →</Link></div></div><div className="rounded-[8px] bg-[#fbfaf6] p-[clamp(18px,2.4cqi,28px)] text-[#191b18] shadow-[0_24px_60px_rgb(0_0_0/.25)]"><div className="flex items-baseline justify-between gap-3 border-b border-[#d9d4c7] pb-3"><b className="text-[17px]">Pig grower diet</b><span className="fs-mono text-[12px] text-[#4f524b]">4 of 6 within target</span></div><div className="my-4 flex h-7 overflow-hidden rounded-[3px]"><i className="w-[70%] bg-[#d99a2b]"/><i className="w-[20%] bg-[#1d3a2a]"/><i className="w-[6%] bg-[#8a9a6b]"/><i className="w-[4%] bg-[#bdb7a9]"/></div>{[['Crude protein', '16.7', '%', 'Within'], ['ME pigs', '3,254', 'kcal/kg', 'Within'], ['Lysine', '0.94', '%', 'Below'], ['Calcium', '0.68', '%', 'Within']].map(([label, value, unit, status]) => <div key={label} className="grid gap-2 border-b border-[#e6e1d5] py-3"><div className="flex items-baseline justify-between gap-3"><b className="text-[14px]">{label}</b><span className="flex items-baseline gap-2.5"><span className="text-[18px] font-semibold tabular-nums">{value}<small className="ml-1 text-[12px] font-normal text-[#4f524b]">{unit}</small></span><span className={`min-w-14 rounded-[3px] px-2 py-[3px] text-center text-[12px] font-bold ${status === 'Below' ? 'bg-[#f6e0d9] text-[#8f3420]' : 'bg-[#e3eadf] text-[#1f5c38]'}`}>{status}</span></span></div><div className="relative h-1.5 rounded-[3px] bg-[#e7e2d6]"><i className="absolute inset-y-0 left-[38%] w-[32%] rounded-sm bg-[#b9cdb5]"/><i className={`absolute -bottom-1 -top-1 w-1 rounded-sm ${status === 'Below' ? 'left-[29%] bg-[#b5452c]' : 'left-[54%] bg-[#2e7d4f]'}`}/></div></div>)}<p className="fs-mono mb-0 mt-3 text-[11px] text-[#4f524b]">Illustrative targets · sample nutrient data</p></div></div></section>

      <section className="fs-frame fs-section pb-[clamp(56px,7cqi,96px)]"><div className="mb-6 flex items-end justify-between gap-4"><h2 className="fs-h2">Knowledge Centre</h2><Link href="/knowledge" className="border-b-[1.5px] border-[#191b18] pb-0.5 font-semibold text-[#191b18] no-underline">All articles →</Link></div><div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-4">{knowledge.map((article) => <Link href="/knowledge" key={article.title} className="flex flex-col gap-3.5 text-[#191b18] no-underline"><DesignPlaceholder label={article.imageLabel} className="aspect-[3/2] rounded-[6px]"/><span className="fs-label font-semibold text-[#1d3a2a]">{article.topic}</span><h3 className="m-0 text-[21px] font-bold leading-[1.2]">{article.title}</h3></Link>)}</div></section>
    </main>
  );
}

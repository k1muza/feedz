'use client';

import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import Link from 'next/link';
import FeedProductCard from '@/components/products/FeedProductCard';
import { productCategories, type FeedProduct, type ProductStatus } from '@/data/feedProducts';

const chip = (active: boolean) => `inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[14px] font-medium ${active ? 'border-[#1d3a2a] bg-[#1d3a2a] text-white' : 'border-[#d9d4c7] bg-[#fbfaf6] text-[#191b18]'}`;
const smallChip = (active: boolean) => `${chip(active)} h-8 text-[13px]`;
const statuses: Array<'all' | ProductStatus> = ['all', 'In stock', 'Limited', 'On request'];

export default function ProductsClient({ products, initialQuery, initialAnimal, initialCategory }: { products: FeedProduct[]; initialQuery: string; initialAnimal: string; initialCategory: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(productCategories.some((item) => item.name === initialCategory) ? initialCategory : 'All');
  const [animal, setAnimal] = useState(initialAnimal);
  const [status, setStatus] = useState<'all' | ProductStatus>('all');
  const [view, setView] = useState<'grid' | 'table'>('grid');

  const results = useMemo(() => products.filter((product) => {
    const term = query.trim().toLowerCase();
    const matchesQuery = !term || `${product.name} ${product.category} ${product.grade} ${product.description} ${product.specs.map((item) => item.label).join(' ')} ${product.animals.join(' ')}`.toLowerCase().includes(term);
    return matchesQuery && (category === 'All' || product.category === category) && (animal === 'all' || product.animals.includes(animal)) && (status === 'all' || product.status === status);
  }), [products, query, category, animal, status]);

  const clearFilters = () => { setQuery(''); setCategory('All'); setAnimal('all'); setStatus('all'); };

  return (
    <main className="fs-page bg-[#f3f0e8] text-[#191b18] [container-type:inline-size]">
      <p className="fs-label mb-2.5 text-[#4f524b]">Products</p>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-5">
        <h1 className="fs-page-title">Feed ingredients</h1>
        <label className="relative min-w-[min(100%,280px)] flex-[0_1_460px]"><span className="sr-only">Search ingredients</span><Search className="absolute left-[15px] top-[17px] h-[18px] w-[18px]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ingredients, e.g. lysine" className="h-[52px] w-full rounded-[4px] border-[1.5px] border-[#191b18] bg-[#fbfaf6] pl-11 pr-11 text-[16px] text-[#191b18] outline-none" />{query && <button onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-1.5 top-1.5 grid h-10 w-10 place-items-center border-0 bg-transparent text-[#4f524b]"><X className="h-5 w-5" /></button>}</label>
      </div>

      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setCategory('All')} className={chip(category === 'All')}>All <span className="fs-mono text-[11px] opacity-75">{products.length}</span></button>
        {productCategories.map((item) => <button key={item.slug} onClick={() => setCategory(item.name)} className={chip(category === item.name)}>{item.name} <span className="fs-mono text-[11px] opacity-75">{products.filter((product) => product.category === item.name).length}</span></button>)}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-3 border-y border-[#d9d4c7] py-3">
        <div className="flex flex-wrap items-center gap-1.5"><span className="fs-label mr-1 text-[#4f524b]">Animal</span>{[['all', 'All'], ['pigs', 'Pigs'], ['poultry', 'Poultry'], ['cattle', 'Cattle'], ['other', 'Other']].map(([id, label]) => <button key={id} onClick={() => setAnimal(id)} className={smallChip(animal === id)}>{label}</button>)}</div>
        <div className="flex flex-wrap items-center gap-1.5"><span className="fs-label mr-1 text-[#4f524b]">Availability</span>{statuses.map((id) => <button key={id} onClick={() => setStatus(id)} className={smallChip(status === id)}>{id === 'all' ? 'Any' : id}</button>)}</div>
        <span className="flex-1" />
        <span className="text-[14px] text-[#4f524b]">{results.length} ingredient{results.length === 1 ? '' : 's'}</span>
        <div className="hidden gap-0.5 rounded-[4px] bg-[#e7e2d6] p-0.5 min-[1080px]:flex"><button onClick={() => setView('grid')} className={`h-8 rounded-[3px] border-0 px-3 text-[13px] font-semibold ${view === 'grid' ? 'bg-[#fbfaf6]' : 'bg-transparent'}`}>Cards</button><button onClick={() => setView('table')} className={`h-8 rounded-[3px] border-0 px-3 text-[13px] font-semibold ${view === 'table' ? 'bg-[#fbfaf6]' : 'bg-transparent'}`}>Compare</button></div>
      </div>

      {results.length === 0 ? <div className="flex flex-col items-start gap-3 rounded-[6px] border border-[#d9d4c7] bg-[#fbfaf6] p-[clamp(24px,4cqi,48px)]"><h2 className="m-0 text-[26px] font-bold">Nothing matches “{query}” yet</h2><p className="m-0 max-w-[520px] text-[16px] leading-[1.5] text-[#3d403a]">We may still be able to source it. Tell us what you need and how much.</p><div className="flex flex-wrap gap-2.5"><a href="https://wa.me/263774684534" className="fs-button-amber inline-flex h-12 items-center px-5 text-[15px] no-underline">Ask us to source it</a><button onClick={clearFilters} className="fs-button-secondary h-12 px-5 text-[15px]">Clear filters</button></div></div> : view === 'grid' ? <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,270px),1fr))] gap-4">{results.map((product) => <FeedProductCard key={product.id} product={product} />)}</div> : <div className="hidden overflow-x-auto rounded-[6px] border border-[#d9d4c7] bg-[#fbfaf6] min-[1080px]:block"><table className="w-full min-w-[860px] border-collapse text-[14px]"><thead><tr className="fs-label text-left text-[#4f524b]"><th className="px-4 py-3.5 font-medium">Ingredient</th><th className="px-4 py-3.5 font-medium">Category</th><th className="px-4 py-3.5 font-medium">Key specification</th><th className="px-4 py-3.5 font-medium">MOQ</th><th className="px-4 py-3.5 font-medium">Pack</th><th className="px-4 py-3.5 font-medium">Availability</th><th /></tr></thead><tbody>{results.map((product) => <tr key={product.id} className="border-t border-[#e6e1d5]"><td className="px-4 py-3"><Link href={`/products/${product.id}`} className="flex flex-col gap-0.5 text-[#191b18] no-underline"><b className="text-[15px]">{product.name}</b><span className="text-[12px] text-[#4f524b]">{product.grade}</span></Link></td><td className="px-4 py-3 text-[#3d403a]">{product.category}</td><td className="px-4 py-3"><div className="flex gap-[18px]">{product.specs.slice(0, 2).map((spec) => <span key={spec.label} className="flex flex-col"><small className="fs-label text-[10px] text-[#4f524b]">{spec.label}</small><b>{spec.value} {spec.unit}</b></span>)}</div></td><td className="px-4 py-3 font-semibold">{product.moq}</td><td className="px-4 py-3 text-[#3d403a]">{product.packaging}</td><td className="px-4 py-3 font-semibold">{product.status}</td><td className="px-4 py-3 text-right"><a href={`https://wa.me/263774684534?text=${encodeURIComponent(`Please quote ${product.name}`)}`} className="inline-flex h-9 items-center rounded-[4px] bg-[#d99a2b] px-3.5 font-semibold text-[#191b18] no-underline">Quote</a></td></tr>)}</tbody></table></div>}

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-[6px] bg-[#e3eadf] p-6"><div className="flex flex-col gap-1"><b className="text-[18px]">Can’t find an ingredient?</b><span className="text-[15px] text-[#3d403a]">Ask FeedSport, or send us the spec you need and we’ll check supply.</span></div><div className="flex flex-wrap gap-2.5"><a href="tel:+263774684534" className="fs-button-primary inline-flex h-[46px] items-center px-[18px] text-[15px] no-underline">Ask FeedSport</a><a href="https://wa.me/263774684534" className="fs-button-amber inline-flex h-[46px] items-center px-[18px] text-[15px] no-underline">Request a quote</a></div></div>
    </main>
  );
}

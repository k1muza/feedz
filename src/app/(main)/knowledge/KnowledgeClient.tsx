'use client';

import { useState } from 'react';
import Link from 'next/link';
import DesignPlaceholder from '@/components/common/DesignPlaceholder';

const topics = ['All', 'Pig nutrition', 'Poultry nutrition', 'Cattle nutrition', 'Feed ingredients', 'Feed formulation', 'Farm economics', 'Feed manufacturing'];
const articles = [
  { topic: 'Pig nutrition', title: 'Feeding growers: protein, energy and lysine in practice', excerpt: 'How to tell if a grower diet is short on energy, and what to change first.', image: 'pigs at the trough', ingredients: ['Sorghum', 'Soybean meal', 'L-Lysine HCl'] },
  { topic: 'Feed ingredients', title: 'How to read a feed ingredient specification', excerpt: 'As-fed or dry matter, typical or batch, and why the basis matters when you compare suppliers.', image: 'spec sheet on a bag', ingredients: ['Soybean meal', 'Sunflower meal'] },
  { topic: 'Feed formulation', title: 'Using wheat bran in sow diets', excerpt: 'Where bran fits, where it doesn’t, and how much is usually included.', image: 'wheat bran in hand', ingredients: ['Wheat bran'] },
  { topic: 'Poultry nutrition', title: 'Calcium and phosphorus for laying hens', excerpt: 'Limestone particle size, DCP and shell quality.', image: 'layer flock', ingredients: ['Feed limestone', 'Dicalcium phosphate'] },
  { topic: 'Farm economics', title: 'Working out the cost of feed per kilogram of gain', excerpt: 'A simple method using your own feed and weight records.', image: 'farmer with records', ingredients: ['Sorghum'] },
  { topic: 'Feed manufacturing', title: 'Mixing on farm: getting an even mix', excerpt: 'Order of addition, mixing time and small-inclusion ingredients.', image: 'on-farm mixer', ingredients: ['Vitamin & mineral premix'] },
  { topic: 'Cattle nutrition', title: 'Sunflower meal for dairy cows', excerpt: 'Replacing part of the soybean meal without losing milk.', image: 'dairy cows feeding', ingredients: ['Sunflower meal', 'Soybean meal'] },
];

export default function KnowledgeClient() {
  const [topic, setTopic] = useState('All');
  const visible = topic === 'All' ? articles : articles.filter((article) => article.topic === topic);
  const [lead, ...rest] = visible;

  return (
    <main className="fs-page bg-[#f3f0e8] [container-type:inline-size]">
      <p className="fs-mono mb-2.5 mt-0 text-[12px] uppercase tracking-[.08em] text-[#4f524b]">Knowledge Centre</p>
      <h1 className="fs-page-title mb-3">Practical feed and nutrition guides</h1>
      <p className="mb-6 mt-0 max-w-[600px] text-[17px] leading-[1.5] text-[#3d403a]">Written for farmers and feed mixers. Each guide links to the ingredients it mentions.</p>
      <div className="mb-7 flex gap-1.5 overflow-x-auto pb-1">{topics.map((item) => <button key={item} onClick={() => setTopic(item)} className={`inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[14px] font-medium ${topic === item ? 'border-[#1d3a2a] bg-[#1d3a2a] text-white' : 'border-[#d9d4c7] bg-[#fbfaf6] text-[#191b18]'}`}>{item}</button>)}</div>

      {lead ? <>
        <article className="mb-9 grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-center gap-[clamp(20px,3cqi,40px)] border-b border-[#d9d4c7] pb-9">
          <DesignPlaceholder label={lead.image} strong className="aspect-[16/10] rounded-[6px]"/>
          <div className="flex flex-col gap-3.5"><span className="fs-mono text-[12px] font-semibold uppercase tracking-[.08em] text-[#1d3a2a]">{lead.topic}</span><h2 className="m-0 text-balance text-[clamp(28px,3.2cqi,46px)] font-bold leading-[1.05] tracking-[-.02em]">{lead.title}</h2><p className="m-0 text-[17px] leading-[1.55] text-[#3d403a]">{lead.excerpt}</p><div className="flex flex-wrap items-center gap-1.5"><span className="mr-1 text-[13px] text-[#4f524b]">Ingredients mentioned</span>{lead.ingredients.map((ingredient) => <Link key={ingredient} href={`/search?q=${encodeURIComponent(ingredient)}`} className="inline-flex h-[30px] items-center rounded-full border border-[#d9d4c7] bg-[#fbfaf6] px-3 text-[13px] font-semibold text-[#191b18] no-underline">{ingredient}</Link>)}</div></div>
        </article>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-x-4 gap-y-7">{rest.map((article) => <article key={article.title} className="flex flex-col gap-3"><DesignPlaceholder label={article.image} className="aspect-[3/2] rounded-[6px]"/><span className="fs-label font-semibold text-[#1d3a2a]">{article.topic}</span><h2 className="m-0 text-pretty text-[21px] font-bold leading-[1.2]">{article.title}</h2><p className="m-0 text-[15px] leading-[1.5] text-[#4f524b]">{article.excerpt}</p></article>)}</div>
      </> : <div className="rounded-[6px] border border-[#d9d4c7] bg-[#fbfaf6] p-[clamp(24px,4cqi,48px)]"><h2 className="m-0 text-[24px] font-bold">No guides in this topic yet.</h2></div>}
      <p className="fs-mono mb-0 mt-8 text-[11px] text-[#4f524b]">Article titles are placeholders. Content comes from the existing CMS-managed blog, grouped by topic.</p>
    </main>
  );
}

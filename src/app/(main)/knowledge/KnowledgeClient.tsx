'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DesignPlaceholder from '@/components/common/DesignPlaceholder';
import NewsletterSignup from '@/components/blog/NewsletterSignup';
import type { KnowledgeArticle } from '@/data/knowledgeArticles';

type ArticleCard = Pick<KnowledgeArticle, 'slug' | 'title' | 'description' | 'topic' | 'image'> & { products: { id: string; name: string }[] };

export default function KnowledgeClient({ articles, topics }: { articles: ArticleCard[]; topics: string[] }) {
  // Server HTML always lists every guide; a ?topic= link narrows it after hydration.
  const [topic, setTopic] = useState('All');
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('topic');
    if (requested && topics.includes(requested)) setTopic(requested);
  }, [topics]);
  const visible = topic === 'All' ? articles : articles.filter((article) => article.topic === topic);
  const [lead, ...rest] = visible;

  const selectTopic = (item: string) => {
    setTopic(item);
    const url = item === 'All' ? '/knowledge' : `/knowledge?topic=${encodeURIComponent(item)}`;
    window.history.replaceState(null, '', url);
  };

  return (
    <main className="fs-page bg-[#f3f0e8] [container-type:inline-size]">
      <p className="fs-mono mb-2.5 mt-0 text-[12px] uppercase tracking-[.08em] text-[#4f524b]">Knowledge Centre</p>
      <h1 className="fs-page-title mb-3">Practical feed and nutrition guides</h1>
      <p className="mb-6 mt-0 max-w-[600px] text-[17px] leading-[1.5] text-[#3d403a]">Written for farmers and feed mixers in Zimbabwe. Each guide links to the ingredients it mentions.</p>
      <div className="mb-7 flex gap-1.5 overflow-x-auto pb-1">{['All', ...topics].map((item) => <button key={item} onClick={() => selectTopic(item)} aria-pressed={topic === item} className={`inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[14px] font-medium ${topic === item ? 'border-[#1d3a2a] bg-[#1d3a2a] text-white' : 'border-[#d9d4c7] bg-[#fbfaf6] text-[#191b18]'}`}>{item}</button>)}</div>

      {lead ? <>
        <article className="mb-9 grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-center gap-[clamp(20px,3cqi,40px)] border-b border-[#d9d4c7] pb-9">
          <Link href={`/knowledge/${lead.slug}`} tabIndex={-1} aria-hidden="true"><DesignPlaceholder label={lead.image.alt} image={lead.image} sizes="(min-width: 1024px) 50vw, 100vw" priority strong className="aspect-[16/10] rounded-[6px]"/></Link>
          <div className="flex flex-col gap-3.5"><span className="fs-mono text-[12px] font-semibold uppercase tracking-[.08em] text-[#1d3a2a]">{lead.topic}</span><h2 className="m-0 text-balance text-[clamp(28px,3.2cqi,46px)] font-bold leading-[1.05] tracking-[-.02em]"><Link href={`/knowledge/${lead.slug}`} className="text-[#191b18] no-underline hover:underline">{lead.title}</Link></h2><p className="m-0 text-[17px] leading-[1.55] text-[#3d403a]">{lead.description}</p><div className="flex flex-wrap items-center gap-1.5"><span className="mr-1 text-[13px] text-[#4f524b]">Ingredients mentioned</span>{lead.products.map((product) => <Link key={product.id} href={`/products/${product.id}`} className="inline-flex h-[30px] items-center rounded-full border border-[#d9d4c7] bg-[#fbfaf6] px-3 text-[13px] font-semibold text-[#191b18] no-underline">{product.name}</Link>)}</div><div><Link href={`/knowledge/${lead.slug}`} className="border-b-[1.5px] border-[#191b18] pb-0.5 font-semibold text-[#191b18] no-underline">Read the guide →</Link></div></div>
        </article>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-x-4 gap-y-7">{rest.map((article) => <article key={article.slug}><Link href={`/knowledge/${article.slug}`} className="flex flex-col gap-3 text-[#191b18] no-underline"><DesignPlaceholder label={article.image.alt} image={article.image} sizes="(min-width: 1024px) 33vw, 100vw" className="aspect-[3/2] rounded-[6px]"/><span className="fs-label font-semibold text-[#1d3a2a]">{article.topic}</span><h2 className="m-0 text-pretty text-[21px] font-bold leading-[1.2]">{article.title}</h2><p className="m-0 text-[15px] leading-[1.5] text-[#4f524b]">{article.description}</p></Link></article>)}</div>
      </> : <div className="rounded-[6px] border border-[#d9d4c7] bg-[#fbfaf6] p-[clamp(24px,4cqi,48px)]"><h2 className="m-0 text-[24px] font-bold">No guides in this topic yet.</h2></div>}
      <NewsletterSignup className="mt-12" />
    </main>
  );
}

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DesignPlaceholder from '@/components/common/DesignPlaceholder';
import NewsletterSignup from '@/components/blog/NewsletterSignup';
import { getFeedProduct } from '@/data/feedProductNutrition';
import { articleAuthor, articleHeadings, headingId, readingMinutes, relatedArticles } from '@/data/knowledgeArticles';
import { getPublishedArticles } from '@/lib/content';
import { absoluteUrl, breadcrumbJsonLd, createPageMetadata, serializeJsonLd, siteConfig } from '@/lib/seo';

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getPublishedArticles()).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = (await getPublishedArticles()).find((item) => item.slug === slug);
  if (!article) return { title: 'Article not found', robots: { index: false } };

  return createPageMetadata({
    title: article.seoTitle || article.title,
    description: article.description,
    path: `/knowledge/${article.slug}`,
    keywords: article.keywords,
    image: article.image.src.startsWith('https://images.unsplash.com/') ? { url: `${article.image.src}?w=1200&h=630&fit=crop&q=80`, width: 1200, height: 630, alt: article.image.alt } : { url: article.image.src, alt: article.image.alt },
    article: {
      publishedTime: article.published,
      modifiedTime: article.updated,
      authors: [articleAuthor],
      section: article.topic,
      tags: article.keywords,
    },
  });
}

const formatDate = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

const textOf = (node: ReactNode): string => {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (node && typeof node === 'object' && 'props' in node) return textOf((node as { props: { children?: ReactNode } }).props.children);
  return '';
};

const markdownComponents: Components = {
  h2: ({ children }) => <h2 id={headingId(textOf(children))} className="mb-3 mt-10 scroll-mt-24 text-[clamp(24px,2.4cqi,30px)] font-bold leading-[1.15] tracking-[-.015em]">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-2 mt-7 text-[20px] font-bold">{children}</h3>,
  p: ({ children }) => <p className="my-4 text-[17px] leading-[1.65] text-[#2c2e29]">{children}</p>,
  ul: ({ children }) => <ul className="my-4 flex list-disc flex-col gap-2 pl-6 text-[17px] leading-[1.6] text-[#2c2e29]">{children}</ul>,
  ol: ({ children }) => <ol className="my-4 flex list-decimal flex-col gap-2 pl-6 text-[17px] leading-[1.6] text-[#2c2e29]">{children}</ol>,
  strong: ({ children }) => <strong className="font-semibold text-[#191b18]">{children}</strong>,
  blockquote: ({ children }) => <blockquote className="fs-mono my-5 rounded-[4px] border-l-[3px] border-[#d99a2b] bg-[#fbfaf6] px-4 py-1 text-[14px] [&_p]:text-[14px]">{children}</blockquote>,
  table: ({ children }) => <div className="my-6 overflow-x-auto rounded-[6px] border border-[#d9d4c7] bg-[#fbfaf6]"><table className="w-full border-collapse text-left text-[15px]">{children}</table></div>,
  th: ({ children }) => <th className="border-b-2 border-[#191b18] px-3.5 py-2.5 text-[13px] font-semibold text-[#4f524b]">{children}</th>,
  td: ({ children }) => <td className="border-b border-[#e6e1d5] px-3.5 py-2.5 align-top tabular-nums">{children}</td>,
  a: ({ href = '', children }) => href.startsWith('/')
    ? <Link href={href} className="font-semibold text-[#1d3a2a] underline decoration-[#b9cdb5] underline-offset-[3px]">{children}</Link>
    : <a href={href} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#1d3a2a] underline underline-offset-[3px]">{children}</a>,
};

export default async function KnowledgeArticlePage({ params }: Props) {
  const { slug } = await params;
  const articles = await getPublishedArticles();
  const article = articles.find((item) => item.slug === slug);
  if (!article) notFound();

  const url = absoluteUrl(`/knowledge/${article.slug}`);
  const headings = articleHeadings(article);
  const products = article.ingredients.map(getFeedProduct).filter((product) => product !== undefined);
  const related = relatedArticles(articles, article);
  const minutes = readingMinutes(article);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${url}#article`,
        headline: article.title,
        description: article.description,
        image: [article.image.src],
        datePublished: article.published,
        dateModified: article.updated,
        articleSection: article.topic,
        keywords: article.keywords.join(', '),
        wordCount: article.body.split(/\s+/).length,
        inLanguage: 'en-ZW',
        mainEntityOfPage: url,
        author: { '@type': 'Organization', name: articleAuthor, url: absoluteUrl('/team') },
        publisher: { '@id': `${siteConfig.url}/#organization` },
        about: products.map((product) => ({ '@type': 'Thing', name: product.name, url: absoluteUrl(`/products/${product.id}`) })),
      },
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Knowledge Centre', path: '/knowledge' },
        { name: article.title, path: `/knowledge/${article.slug}` },
      ]),
    ],
  };

  return (
    <main className="fs-page bg-[#f3f0e8] text-[#191b18] [container-type:inline-size]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap gap-2 text-[13px] text-[#4f524b]"><Link href="/knowledge" className="text-[#4f524b] underline underline-offset-[3px]">Knowledge Centre</Link><span>/</span><Link href={`/knowledge?topic=${encodeURIComponent(article.topic)}`} className="text-[#4f524b] underline underline-offset-[3px]">{article.topic}</Link></nav>

      <article>
        <header className="max-w-[860px]">
          <p className="fs-mono mb-3 mt-0 text-[12px] font-semibold uppercase tracking-[.08em] text-[#1d3a2a]">{article.topic}</p>
          <h1 className="m-0 text-balance text-[clamp(34px,4.6cqi,60px)] font-bold leading-[1.02] tracking-[-.03em]">{article.title}</h1>
          <p className="mb-5 mt-4 max-w-[720px] text-pretty text-[19px] leading-[1.5] text-[#3d403a]">{article.description}</p>
          <p className="fs-mono m-0 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#4f524b]"><span>By {articleAuthor}</span><span>Published <time dateTime={article.published}>{formatDate(article.published)}</time></span>{article.updated !== article.published && <span>Updated <time dateTime={article.updated}>{formatDate(article.updated)}</time></span>}<span>{minutes} min read</span></p>
        </header>

        <DesignPlaceholder label={article.image.alt} image={article.image} sizes="(min-width: 1320px) 1240px, 100vw" priority strong className="mt-7 aspect-[21/9] min-h-[220px] rounded-[6px]" />

        <div className="mt-[clamp(28px,4cqi,48px)] grid grid-cols-1 gap-[clamp(28px,4cqi,56px)] min-[960px]:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 max-w-[720px]">
            <section aria-label="Key points" className="rounded-[6px] border border-[#d9d4c7] bg-[#fbfaf6] px-5 py-4">
              <h2 className="fs-label m-0 text-[#4f524b]">Key points</h2>
              <ul className="mb-0 mt-3 flex list-disc flex-col gap-2 pl-5 text-[16px] leading-[1.5]">{article.keyPoints.map((point) => <li key={point}>{point}</li>)}</ul>
            </section>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{article.body}</ReactMarkdown>
            <p className="mt-10 border-t border-[#d9d4c7] pt-5 text-[14px] leading-[1.55] text-[#4f524b]">Figures in this guide are typical values and general ranges. Confirm targets for your animals, genetics and ingredients, and check batch specifications before formulating.</p>
          </div>

          <aside className="flex flex-col gap-6 min-[960px]:sticky min-[960px]:top-24 min-[960px]:self-start">
            {headings.length > 0 && <nav aria-label="On this page" className="border-t-2 border-[#191b18] pt-3"><p className="fs-label mb-2 mt-0 text-[#4f524b]">On this page</p><ol className="m-0 flex list-none flex-col gap-1.5 p-0 text-[14px]">{headings.map((heading) => <li key={heading.id}><a href={`#${heading.id}`} className="text-[#191b18] no-underline hover:underline">{heading.text}</a></li>)}</ol></nav>}
            {products.length > 0 && <section className="border-t-2 border-[#191b18] pt-3"><h2 className="fs-label mb-2 mt-0 text-[#4f524b]">Ingredients in this guide</h2><ul className="m-0 flex list-none flex-col p-0">{products.map((product) => <li key={product.id}><Link href={`/products/${product.id}`} className="flex items-baseline justify-between gap-2 border-b border-[#e6e1d5] py-2.5 text-[15px] font-semibold text-[#191b18] no-underline"><span>{product.name}</span><span className="fs-mono text-[11px] font-medium text-[#4f524b]">{product.status}</span></Link></li>)}</ul></section>}
            <section className="rounded-[6px] bg-[#1d3a2a] p-5 text-white"><h2 className="m-0 text-[18px] font-bold">Need a diet checked?</h2><p className="mb-4 mt-2 text-[14px] leading-[1.5] text-[#dfe6dc]">Send us your ingredients and targets. Our nutrition team will review the formulation with you.</p><a href={`https://wa.me/263774684534?text=${encodeURIComponent(`Hi FeedSport, I read "${article.title}" and would like help with my feed.`)}`} className="inline-flex h-[44px] items-center rounded-[4px] bg-[#fbfaf6] px-4 text-[14px] font-semibold text-[#1d3a2a] no-underline">WhatsApp the team</a></section>
          </aside>
        </div>
      </article>

      {related.length > 0 && <section className="mt-[clamp(48px,6cqi,80px)] border-t border-[#d9d4c7] pt-8"><h2 className="mb-5 mt-0 text-[clamp(24px,2.6cqi,34px)] font-bold tracking-[-.02em]">Related guides</h2><div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-x-4 gap-y-7">{related.map((item) => <Link key={item.slug} href={`/knowledge/${item.slug}`} className="flex flex-col gap-3 text-[#191b18] no-underline"><DesignPlaceholder label={item.image.alt} image={item.image} sizes="(min-width: 1024px) 33vw, 100vw" className="aspect-[3/2] rounded-[6px]" /><span className="fs-label font-semibold text-[#1d3a2a]">{item.topic}</span><h3 className="m-0 text-pretty text-[21px] font-bold leading-[1.2]">{item.title}</h3></Link>)}</div></section>}
      <NewsletterSignup className="mt-[clamp(40px,5cqi,64px)]" />
    </main>
  );
}

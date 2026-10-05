import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import DesignPlaceholder from '@/components/common/DesignPlaceholder';
import FeedProductCard from '@/components/products/FeedProductCard';
import ProductSpecification from '@/components/products/ProductSpecification';
import { animalNames } from '@/data/feedProducts';
import { feedProducts, getFeedProduct } from '@/data/feedProductNutrition';
import { absoluteUrl, breadcrumbJsonLd, createPageMetadata, serializeJsonLd } from '@/lib/seo';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = getFeedProduct(id);
  if (!product) return { title: 'Product not found', robots: { index: false } };
  return createPageMetadata({
    title: `${product.name} Specifications & Nutrition`,
    description: `${product.description} View typical specifications, packaging, availability and minimum order information from FeedSport.`,
    path: `/products/${product.id}`,
  });
}

export function generateStaticParams() {
  return feedProducts.map((product) => ({ id: product.id }));
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = getFeedProduct(id);
  if (!product) notFound();

  const related = feedProducts.filter((item) => item.id !== product.id && (item.category === product.category || item.animals.some((animal) => product.animals.includes(animal)))).slice(0, 4);
  const quoteText = encodeURIComponent(`Please quote ${product.name} — minimum order ${product.moq}`);
  const certificateText = encodeURIComponent(`Please send me the latest certificate of analysis for ${product.name}.`);
  const statusColour = product.status === 'In stock' ? 'bg-[#2e7d4f]' : product.status === 'Limited' ? 'bg-[#b7791f]' : 'bg-[#6b6f66]';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        '@id': `${absoluteUrl(`/products/${product.id}`)}#product`,
        name: product.name,
        description: product.description,
        sku: product.id,
        category: product.category,
        url: absoluteUrl(`/products/${product.id}`),
        additionalProperty: product.specs.map((spec) => ({
          '@type': 'PropertyValue',
          name: spec.label,
          value: `${spec.value} ${spec.unit}`.trim(),
        })),
      },
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Feed ingredients', path: '/products' },
        { name: product.category, path: `/products/categories/${product.categorySlug}` },
        { name: product.name, path: `/products/${product.id}` },
      ]),
    ],
  };

  return (
    <main className="mx-auto max-w-[1320px] bg-[#f3f0e8] px-[clamp(20px,4cqi,40px)] pb-[clamp(56px,7cqi,96px)] pt-[clamp(20px,3cqi,36px)] text-[#191b18] [container-type:inline-size]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap gap-2 text-[13px] text-[#4f524b]"><Link href="/products" className="text-[#4f524b] underline underline-offset-[3px]">Products</Link><span>/</span><Link href={`/products/categories/${product.categorySlug}`} className="text-[#4f524b] underline underline-offset-[3px]">{product.category}</Link><span>/</span><b className="text-[#191b18]">{product.name}</b></nav>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] items-stretch gap-[clamp(24px,4cqi,56px)]">
        <div className="flex min-h-[300px] flex-col gap-2.5">
          <DesignPlaceholder strong label={`product photo — ${product.imageLabel}`} className="min-h-[300px] flex-1 rounded-[6px] [&_.fs-placeholder__label]:bottom-[14px] [&_.fs-placeholder__label]:left-4 [&_.fs-placeholder__label]:text-[12px] [&_.fs-placeholder__label]:text-[#5d5e56]" />
        </div>

        <div className="flex flex-col gap-[22px]">
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-2.5"><span className="fs-label text-[#4f524b]">{product.category}</span><span className="inline-flex items-center gap-1.5 rounded-[3px] border border-[#d9d4c7] bg-[#fbfaf6] px-2.5 py-1 text-[13px] font-semibold"><i className={`h-[7px] w-[7px] rounded-full ${statusColour}`} />{product.status}</span></div>
            <h1 className="m-0 text-[clamp(38px,4.8cqi,66px)] font-bold leading-[.98] tracking-[-.03em]">{product.name}</h1>
            <span className="text-[17px] text-[#3d403a]">{product.grade}</span>
            <p className="m-0 mt-1 max-w-[560px] text-pretty text-[17px] leading-[1.55] text-[#3d403a]">{product.description}</p>
          </div>

          <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] border-b border-t-2 border-b-[#d9d4c7] border-t-[#191b18]">{product.specs.map((spec) => <div key={spec.label} className="flex flex-col gap-1 py-3.5 pr-3.5"><dt className="fs-label text-[#4f524b]">{spec.label}</dt><dd className="m-0 text-[34px] font-semibold leading-none tracking-[-.01em] tabular-nums">{spec.value}<span className="ml-1 text-[14px] font-medium text-[#4f524b]">{spec.unit}</span></dd></div>)}</dl>

          <div className="overflow-hidden rounded-[6px] border border-[#d9d4c7] bg-[#fbfaf6]">
            <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))]">{[['Minimum order', product.moq], ['Packaging', product.packaging], ['Origin / supplier', product.origin], ['Certifications', product.certifications]].map(([label, value], index) => <div key={label} className="flex flex-col gap-0.5 border-b border-[#e6e1d5] px-[18px] py-3.5"><dt className="text-[12px] text-[#4f524b]">{label}</dt><dd className={`m-0 ${index > 1 ? 'fs-mono text-[13px] text-[#7a5414]' : 'text-[17px] font-bold'}`}>{value}</dd></div>)}</dl>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-2.5 px-[18px] py-4"><a href={`https://wa.me/263774684534?text=${quoteText}`} className="fs-button-amber inline-flex h-[52px] items-center justify-center text-[16px] no-underline">Request a quote</a><a href={`https://wa.me/263774684534?text=${encodeURIComponent(`Is ${product.name} available, and what is the lead time?`)}`} className="fs-button-secondary inline-flex h-[52px] items-center justify-center text-[16px] no-underline">Ask about availability</a></div>
            <div className="flex flex-wrap gap-[18px] px-[18px] pb-4 text-[14px] font-semibold"><a href="tel:+263774684534" className="text-[#1d3a2a] no-underline">Ask FeedSport a question →</a><a href="https://wa.me/263774684534" className="text-[#1d3a2a] no-underline">WhatsApp us <span className="fs-mono font-medium text-[#4f524b]">+263 77 468 4534</span></a></div>
          </div>
        </div>
      </div>

      <ProductSpecification product={product} comparisonProducts={feedProducts} certificateUrl={`https://wa.me/263774684534?text=${certificateText}`} />

      <section className="mt-10 flex flex-wrap items-center gap-2.5 border-y border-[#d9d4c7] py-[18px]"><span className="fs-label mr-2 text-[#4f524b]">Used in feed for</span>{product.animals.map((animal) => <Link key={animal} href={`/products?animal=${animal}`} className="inline-flex h-[34px] items-center rounded-full bg-[#e3eadf] px-3.5 text-[14px] font-semibold text-[#1d3a2a] no-underline">{animalNames[animal]}</Link>)}<span className="flex-1" /><Link href="/formulations" className="text-[15px] font-semibold text-[#1d3a2a] no-underline">Use in a formulation →</Link></section>

      {related.length > 0 && <section className="mt-[clamp(48px,6cqi,72px)]"><h2 className="mb-5 mt-0 text-[clamp(26px,2.6cqi,36px)] font-bold tracking-[-.02em]">Related ingredients</h2><div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,270px),1fr))] gap-4">{related.map((item) => <FeedProductCard key={item.id} product={item} showDescription={false} />)}</div></section>}
    </main>
  );
}

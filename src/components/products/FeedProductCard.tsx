import Link from 'next/link';
import DesignPlaceholder from '@/components/common/DesignPlaceholder';
import { FeedProduct } from '@/data/feedProducts';

const statusColour = { 'In stock': 'bg-[#2e7d4f]', Limited: 'bg-[#b7791f]', 'On request': 'bg-[#6b6f66]' };

export default function FeedProductCard({ product, showDescription = true }: { product: FeedProduct; showDescription?: boolean }) {
  return (
    <article className="fs-card flex h-full flex-col">
      <Link href={`/products/${product.id}`} aria-label={`View ${product.name}`} className="relative block aspect-[16/10] text-[#191b18] no-underline">
        <DesignPlaceholder label={product.imageLabel} className="h-full w-full rounded-none" />
        <span className="absolute left-3 top-3 inline-flex h-6 items-center gap-1.5 rounded-[3px] bg-[#fbfaf6] px-[9px] text-[12px] font-semibold"><i className={`h-[7px] w-[7px] rounded-full ${statusColour[product.status]}`} />{product.status}</span>
      </Link>
      <div className="flex flex-col gap-1 px-4 pt-4"><span className="fs-label text-[#4f524b]">{product.category}</span><h3 className="m-0 text-[19px] font-bold leading-[1.2] tracking-[-.01em]">{product.name}</h3><span className="text-[13px] text-[#4f524b]">{product.grade}</span></div>
      {showDescription && <p className="mx-4 mb-0 mt-2.5 text-pretty text-[14px] leading-[1.45] text-[#4f524b]">{product.description}</p>}
      <dl className="mx-4 mb-0 mt-3.5 grid auto-cols-fr grid-flow-col gap-3 border-y border-[#d9d4c7]">{product.specs.map((spec) => <div key={spec.label} className="min-w-0 py-2.5"><dt className="fs-label truncate text-[10px] text-[#4f524b]">{spec.label}</dt><dd className="m-0 mt-0.5 text-[20px] font-semibold leading-[1.1] tabular-nums">{spec.value}<span className="ml-1 text-[12px] font-medium text-[#4f524b]">{spec.unit}</span></dd></div>)}</dl>
      <div className="mt-auto flex items-center justify-between gap-3 px-4 pb-4 pt-3.5"><div className="flex flex-col gap-0.5"><span className="fs-label text-[10px] text-[#4f524b]">MOQ</span><span className="text-[14px] font-semibold">{product.moq}</span></div><div className="flex gap-2"><Link href={`/products/${product.id}`} className="inline-flex h-[38px] items-center rounded-[4px] border-[1.5px] border-[#191b18] px-3.5 text-[14px] font-semibold text-[#191b18] no-underline">Specs</Link><a href={`https://wa.me/263774684534?text=${encodeURIComponent(`Please quote ${product.name}`)}`} className="inline-flex h-[38px] items-center rounded-[4px] bg-[#d99a2b] px-3.5 text-[14px] font-semibold text-[#191b18] no-underline">Quote</a></div></div>
    </article>
  );
}

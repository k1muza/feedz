import Link from 'next/link';
import NavBar from '@/components/common/NavBar';
import Footer from '@/components/common/Footer';
import DesignPlaceholder from '@/components/common/DesignPlaceholder';
import { productCategories } from '@/data/feedProducts';

export default function NotFound() {
  return (
    <>
      <NavBar />
      <main className="fs-page grid min-h-[68vh] grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))] items-center gap-[clamp(28px,5cqi,64px)] bg-[#f3f0e8] text-[#191b18] [container-type:inline-size]">
        <div><p className="fs-label mb-3 text-[#4f524b]">404 · Page not found</p><h1 className="fs-page-title">This page has moved.</h1><p className="my-5 max-w-[520px] text-[17px] leading-[1.55] text-[#3d403a]">Browse the ingredient catalogue or return to the FeedSport homepage.</p><div className="flex flex-wrap gap-3"><Link href="/products" className="fs-button-primary inline-flex items-center no-underline">Browse ingredients</Link><Link href="/" className="fs-button-secondary inline-flex items-center no-underline">Return home</Link></div></div>
        <DesignPlaceholder strong label="feed ingredients — product store" className="min-h-[340px] rounded-[8px]" />
      </main>
      <Footer productCategories={productCategories} />
    </>
  );
}

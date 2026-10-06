import Link from 'next/link';
import { siteConfig } from '@/lib/seo';
type FooterCategory = { id: string; name: string; slug: string };

const fallbackCategories = [
  { id: 'protein-feeds', name: 'Protein feeds', slug: 'protein-feeds' },
  { id: 'energy-feeds', name: 'Energy feeds', slug: 'energy-feeds' },
  { id: 'fiber-products', name: 'Fibre products', slug: 'fiber-products' },
  { id: 'minerals', name: 'Minerals', slug: 'minerals' },
  { id: 'amino-acids', name: 'Amino acids', slug: 'amino-acids' },
  { id: 'premixes', name: 'Premixes & additives', slug: 'premixes-additives' },
];

export default function Footer({ productCategories }: { productCategories: FooterCategory[] }) {
  const categories = productCategories.length ? productCategories.slice(0, 6) : fallbackCategories;

  return (
    <footer className="bg-[#191b18] text-[#e9e6dd]">
      <div className="mx-auto max-w-[1320px] px-[clamp(20px,4cqi,40px)] pb-7 pt-[clamp(48px,6cqi,72px)]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-8">
          <div className="flex flex-col gap-3.5">
            <Link href="/" className="flex items-center gap-2.5 text-white no-underline"><span className="h-3.5 w-3.5 rotate-45 rounded-[2px] bg-[#d99a2b]"/><span className="text-[22px] font-extrabold">FeedSport</span></Link>
            <p className="m-0 text-[14px] leading-[1.55] text-[#b9b6ab]">Feed ingredients and animal nutrition, Zimbabwe.</p>
            <form className="mt-1.5 flex flex-col gap-2" action="/">
              <label className="text-[13px] font-semibold">Price and availability updates</label>
              <div className="flex gap-1.5"><input type="email" aria-label="Email" placeholder="Email" className="h-11 min-w-0 flex-1 rounded-[4px] border border-[#45473f] bg-[#2b2d29] px-3 text-[14px] text-white"/><button className="h-11 rounded-[4px] border-0 bg-[#e9e6dd] px-3.5 font-semibold text-[#191b18]">Subscribe</button></div>
            </form>
          </div>
          <nav className="flex flex-col gap-2.5 text-[15px]" aria-label="Product categories"><span className="fs-label mb-1 text-[#8f8c82]">Products</span>{categories.map((category) => <Link key={category.id} href={`/products/categories/${category.slug}`} className="capitalize text-[#e9e6dd] no-underline hover:text-white">{category.name}</Link>)}</nav>
          <nav className="flex flex-col gap-2.5 text-[15px]" aria-label="Nutrition links"><span className="fs-label mb-1 text-[#8f8c82]">Nutrition</span><Link href="/products?animal=pigs" className="text-[#e9e6dd] no-underline">Pig feed ingredients</Link><Link href="/products?animal=poultry" className="text-[#e9e6dd] no-underline">Poultry feed ingredients</Link><Link href="/products?animal=cattle" className="text-[#e9e6dd] no-underline">Cattle feed ingredients</Link><Link href="/formulations" className="text-[#e9e6dd] no-underline">Formulation</Link><Link href="/knowledge" className="text-[#e9e6dd] no-underline">Knowledge Centre</Link></nav>
          <nav className="flex flex-col gap-2.5 text-[15px]" aria-label="Company links"><span className="fs-label mb-1 text-[#8f8c82]">Company</span><Link href="/about" className="text-[#e9e6dd] no-underline">About</Link><Link href="/team" className="text-[#e9e6dd] no-underline">Team</Link><Link href="/contact" className="text-[#e9e6dd] no-underline">Contact</Link></nav>
          <div className="flex flex-col gap-2.5 text-[15px]"><span className="fs-label mb-1 text-[#8f8c82]">Contact</span><a href="tel:+263774684534" className="text-[#e9e6dd] no-underline">Phone <span className="fs-mono text-[13px] text-[#d9b36b]">+263 77 468 4534</span></a><a href="https://wa.me/263774684534" className="text-[#e9e6dd] no-underline">WhatsApp <span className="fs-mono text-[13px] text-[#d9b36b]">+263 77 468 4534</span></a><a href="mailto:sales@feedsport.co.zw" className="text-[#e9e6dd] no-underline">Email <span className="fs-mono text-[13px] text-[#d9b36b]">sales@feedsport.co.zw</span></a><span className="fs-mono text-[13px] leading-5 text-[#d9b36b]">{siteConfig.addressLines.join(', ')}</span></div>
        </div>
        <div className="mt-12 flex flex-wrap justify-between gap-3 border-t border-[#34362f] pt-5 text-[13px] text-[#8f8c82]"><span>© {new Date().getFullYear()} FeedSport</span><span className="flex gap-[18px]"><Link href="/policies" className="text-[#8f8c82] no-underline">Privacy</Link><Link href="/terms-of-service" className="text-[#8f8c82] no-underline">Terms</Link><Link href="/sitemap.xml" className="text-[#8f8c82] no-underline">Sitemap</Link></span></div>
      </div>
      <div className="h-[72px] min-[1080px]:hidden" aria-hidden="true" />
    </footer>
  );
}

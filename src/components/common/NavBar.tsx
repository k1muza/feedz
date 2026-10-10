'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

const links = [
  { href: '/products', label: 'Products' },
  { href: '/#animals', label: 'Nutrition solutions' },
  { href: '/formulations', label: 'Formulation' },
  { href: '/knowledge', label: 'Knowledge' },
  { href: '/about', label: 'About' },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [query, setQuery] = useState('');
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMenuOpen(false);
    setMobileSearchOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (mobileSearchOpen) mobileSearchInputRef.current?.focus();
  }, [mobileSearchOpen]);
  useEffect(() => {
    if (!quoteOpen) return;
    const close = (event: KeyboardEvent) => event.key === 'Escape' && setQuoteOpen(false);
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [quoteOpen]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    setMobileSearchOpen(false);
    router.push(`/products?q=${encodeURIComponent(query.trim())}`);
  };

  const active = (href: string) => {
    const route = href.split('#')[0];
    return route !== '/' && pathname.startsWith(route);
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#d9d4c7] bg-[#f3f0e8]/95 backdrop-blur-[10px]">
        <div className="mx-auto flex h-[60px] max-w-[1320px] items-center gap-2 px-4 min-[1080px]:h-[72px] min-[1080px]:gap-7 min-[1080px]:px-10">
          <Link href="/" aria-label="FeedSport home" className="flex shrink-0 items-center gap-[9px] text-[#191b18] no-underline min-[1080px]:gap-[10px]">
            <span className="h-[14px] w-[14px] rotate-45 rounded-[2px] bg-[#d99a2b] min-[1080px]:h-[15px] min-[1080px]:w-[15px]" />
            <span className="text-[20px] font-extrabold tracking-[-.02em] min-[1080px]:text-[22px]">FeedSport</span>
          </Link>

          <nav className="hidden items-center gap-1 min-[1080px]:flex" aria-label="Main navigation">
            {links.map((link) => (
              <Link key={link.label} href={link.href} className={`flex h-10 items-center whitespace-nowrap px-3 text-[15px] text-[#191b18] no-underline ${active(link.href) ? 'font-bold shadow-[inset_0_-2px_0_#191b18]' : 'font-medium'}`}>
                {link.label}
              </Link>
            ))}
          </nav>

          <span className="flex-1" />
          <form onSubmit={submitSearch} className="relative hidden w-[clamp(200px,20cqi,280px)] min-[1080px]:block">
            <Search aria-hidden className="absolute left-[13px] top-[13px] h-4 w-4 text-[#4f524b]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search ingredients" placeholder="Search ingredients" className="h-[42px] w-full rounded-[4px] border border-[#d9d4c7] bg-[#fbfaf6] py-0 pl-[38px] pr-[14px] text-[14px] text-[#191b18] outline-none focus:border-[#1d3a2a]" />
          </form>
          <button onClick={() => setQuoteOpen(true)} className="hidden h-[42px] whitespace-nowrap rounded-[4px] border-0 bg-[#d99a2b] px-[18px] text-[15px] font-semibold text-[#191b18] hover:bg-[#c88a1e] sm:block">Get a quote</button>
          <button
            type="button"
            onClick={() => { setMenuOpen(false); setMobileSearchOpen((open) => !open); }}
            aria-label={mobileSearchOpen ? 'Close ingredient search' : 'Search ingredients'}
            aria-expanded={mobileSearchOpen}
            aria-controls="mobile-ingredient-search"
            className="grid h-11 w-11 shrink-0 place-items-center border-0 bg-transparent text-[#191b18] min-[1080px]:hidden"
          >
            {mobileSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </button>
          <button onClick={() => { setMobileSearchOpen(false); setMenuOpen((value) => !value); }} className="h-11 rounded-[4px] border-0 bg-[#191b18] px-[14px] text-[14px] font-semibold text-[#f3f0e8] min-[1080px]:hidden">{menuOpen ? 'Close' : 'Menu'}</button>
        </div>

        {mobileSearchOpen && (
          <form
            id="mobile-ingredient-search"
            role="search"
            onSubmit={submitSearch}
            className="flex items-center gap-2 border-t border-[#d9d4c7] bg-[#f3f0e8] px-4 py-3 min-[1080px]:hidden"
          >
            <input
              ref={mobileSearchInputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search feed ingredients"
              placeholder="Search feed ingredients"
              className="h-11 min-w-0 flex-1 rounded-[4px] border border-[#bdb7a9] bg-[#fbfaf6] px-3 text-[16px] text-[#191b18] outline-none focus:border-[#1d3a2a]"
            />
            <button type="submit" disabled={!query.trim()} className="h-11 rounded-[4px] border-0 bg-[#d99a2b] px-4 text-[15px] font-semibold text-[#191b18] disabled:opacity-50">Search</button>
          </form>
        )}

        {menuOpen && (
          <nav className="border-t border-[#d9d4c7] bg-[#f3f0e8] px-4 pb-5 pt-2 min-[1080px]:hidden" aria-label="Mobile navigation">
            {links.map((link) => (
              <Link key={link.label} href={link.href} className="flex min-h-[52px] items-center justify-between border-b border-[#d9d4c7] text-[20px] font-semibold text-[#191b18] no-underline">{link.label}<span className="text-[#4f524b]">→</span></Link>
            ))}
            <button onClick={() => { setMenuOpen(false); setQuoteOpen(true); }} className="mt-4 h-[52px] w-full rounded-[4px] border-0 bg-[#d99a2b] text-[16px] font-semibold text-[#191b18]">Request a quote</button>
          </nav>
        )}
      </header>

      {quoteOpen && (
        <div className="fixed inset-0 z-[60] bg-[#191b18]/45" onMouseDown={(event) => event.target === event.currentTarget && setQuoteOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Request a quote" className="absolute bottom-0 right-0 flex max-h-[92vh] w-full flex-col overflow-auto rounded-t-[14px] bg-[#fbfaf6] p-6 shadow-2xl sm:bottom-0 sm:top-0 sm:max-h-none sm:w-[440px] sm:rounded-none sm:p-8">
            <div className="flex items-start justify-between gap-4 border-b border-[#d9d4c7] pb-5">
              <div><p className="fs-label mb-2 text-[#4f524b]">Sales enquiry</p><h2 className="m-0 text-[30px] font-bold tracking-[-.02em]">Request a quote</h2></div>
              <button onClick={() => setQuoteOpen(false)} aria-label="Close quote form" className="grid h-10 w-10 place-items-center border-0 bg-transparent"><X /></button>
            </div>
            <p className="my-5 text-[15px] leading-6 text-[#4f524b]">Tell us what you need and we’ll confirm price, stock and delivery.</p>
            <form action="https://wa.me/263774684534" className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Ingredient<input name="text" placeholder="e.g. Soybean meal" className="h-[50px] rounded-[4px] border border-[#bdb7a9] bg-[#fbfaf6] px-3 text-[15px]" /></label>
              <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Quantity (tonnes)<input inputMode="decimal" placeholder="e.g. 5" className="h-[50px] rounded-[4px] border border-[#bdb7a9] bg-[#fbfaf6] px-3 text-[15px]" /></label>
              <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Delivery location<input placeholder="Town or farm" className="h-[50px] rounded-[4px] border border-[#bdb7a9] bg-[#fbfaf6] px-3 text-[15px]" /></label>
              <button type="submit" className="mt-1 h-[54px] rounded-[4px] border-0 bg-[#d99a2b] text-[16px] font-semibold text-[#191b18] hover:bg-[#c88a1e]">Continue on WhatsApp</button>
            </form>
            <p className="fs-mono mt-5 text-[11px] leading-5 text-[#4f524b]">Minimum orders vary by ingredient. Call +263 77 468 4534 if your request is urgent.</p>
          </div>
        </div>
      )}
    </>
  );
}

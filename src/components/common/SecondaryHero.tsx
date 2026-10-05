import Link from 'next/link';
import { ReactNode } from 'react';

interface SecondaryHeroProps {
  title: string | ReactNode;
  subtitle?: string | ReactNode;
  badge?: string;
  ctaText?: string;
  ctaLink?: string;
  minimal?: boolean;
}

export default function SecondaryHero({ title, subtitle, badge, ctaText, ctaLink, minimal = false }: SecondaryHeroProps) {
  return (
    <section className="border-b border-[#d9d4c7] bg-[#f3f0e8] text-[#191b18] [container-type:inline-size]">
      <div className={`mx-auto max-w-[1320px] px-[clamp(20px,4cqi,40px)] ${minimal ? 'py-8' : 'py-[clamp(44px,6cqi,76px)]'}`}>
        <div className="max-w-[900px]">
          {badge && <p className="fs-label mb-3 mt-0 text-[#4f524b]">{badge}</p>}
          <h1 className={`m-0 text-balance font-bold leading-[.98] tracking-[-.03em] ${minimal ? 'text-[clamp(30px,3.5cqi,46px)]' : 'text-[clamp(44px,5.6cqi,76px)]'}`}>{title}</h1>
          {subtitle && <p className={`mb-0 max-w-[680px] leading-[1.5] text-[#3d403a] ${minimal ? 'mt-3 text-[15px]' : 'mt-5 text-[clamp(17px,1.5cqi,20px)]'}`}>{subtitle}</p>}
          {ctaText && ctaLink && <Link href={ctaLink} className="fs-button-primary mt-7 inline-flex items-center gap-2.5 no-underline">{ctaText}<span>→</span></Link>}
        </div>
      </div>
    </section>
  );
}

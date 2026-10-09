import Link from 'next/link';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

export type LegalSection = {
  id: string;
  title: string;
  content: string;
  lastUpdated?: string;
  effectiveDate?: string;
};

type LegalDocumentProps = {
  eyebrow: string;
  title: string;
  intro: string;
  lastUpdated?: string;
  sections: LegalSection[];
  emptyMessage?: string;
};

export const formatLegalDate = (date: string) =>
  new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

// Section titles are the h2s, so markdown headings step down a level.
const markdownComponents: Components = {
  h1: ({ children }) => <h3 className="mb-2 mt-7 text-[19px] font-bold first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mb-2 mt-7 text-[19px] font-bold first:mt-0">{children}</h3>,
  h3: ({ children }) => <h4 className="mb-2 mt-5 text-[16px] font-bold first:mt-0">{children}</h4>,
  p: ({ children }) => <p className="my-3 text-[16px] leading-[1.65] text-[#2c2e29] first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-3 flex list-disc flex-col gap-2 pl-5 text-[16px] leading-[1.6] text-[#2c2e29]">{children}</ul>,
  ol: ({ children }) => <ol className="my-3 flex list-decimal flex-col gap-2 pl-5 text-[16px] leading-[1.6] text-[#2c2e29]">{children}</ol>,
  strong: ({ children }) => <strong className="font-semibold text-[#191b18]">{children}</strong>,
  blockquote: ({ children }) => <blockquote className="my-5 rounded-[4px] border-l-[3px] border-[#d99a2b] bg-[#fbfaf6] px-4 py-3 [&_p]:my-0">{children}</blockquote>,
  table: ({ children }) => <div className="my-5 overflow-x-auto rounded-[6px] border border-[#d9d4c7] bg-[#fbfaf6]"><table className="w-full border-collapse text-left text-[15px]">{children}</table></div>,
  th: ({ children }) => <th className="border-b-2 border-[#191b18] px-3.5 py-2.5 text-[13px] font-semibold text-[#4f524b]">{children}</th>,
  td: ({ children }) => <td className="border-b border-[#e6e1d5] px-3.5 py-2.5 align-top">{children}</td>,
  hr: () => <hr className="my-6 border-[#d9d4c7]" />,
  a: ({ href = '', children }) => href.startsWith('/')
    ? <Link href={href} className="font-semibold text-[#1d3a2a] underline decoration-[#b9cdb5] underline-offset-[3px]">{children}</Link>
    : <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined} className="font-semibold text-[#1d3a2a] underline underline-offset-[3px]">{children}</a>,
};

export default function LegalDocument({ eyebrow, title, intro, lastUpdated, sections, emptyMessage }: LegalDocumentProps) {
  return (
    <main className="mx-auto w-full max-w-[1100px] bg-[#f3f0e8] px-[clamp(20px,4cqi,40px)] pb-[clamp(56px,7cqi,96px)] pt-[clamp(24px,4cqi,48px)] text-[#191b18] [container-type:inline-size]">
      <p className="fs-mono mb-2.5 mt-0 text-[12px] uppercase tracking-[.08em] text-[#4f524b]">{eyebrow}</p>
      <h1 className="fs-page-title mb-5">{title}</h1>
      <p className="mb-4 mt-0 max-w-[760px] text-[19px] leading-[1.55] text-[#3d403a]">{intro}</p>
      {lastUpdated && <p className="fs-mono m-0 text-[12px] text-[#4f524b]">Last updated <time dateTime={lastUpdated}>{formatLegalDate(lastUpdated)}</time></p>}

      {sections.length > 1 && (
        <nav aria-label="On this page" className="mt-8 rounded-[6px] border border-[#d9d4c7] bg-[#fbfaf6] px-5 py-4">
          <h2 className="fs-label m-0 text-[#4f524b]">On this page</h2>
          <ol className="mb-0 mt-3 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] gap-x-6 gap-y-2 p-0 text-[15px]">
            {sections.map((section, index) => <li key={section.id} className="flex gap-2.5"><span className="fs-mono text-[12px] leading-[22px] text-[#1d3a2a]">{String(index + 1).padStart(2, '0')}</span><a href={`#${section.id}`} className="text-[#191b18] underline decoration-[#d9d4c7] underline-offset-[3px]">{section.title}</a></li>)}
          </ol>
        </nav>
      )}

      <div className="mt-10">
        {sections.length === 0 ? (
          <section className="border-t-2 border-[#191b18] py-7">
            <h2 className="m-0 text-[24px] font-bold">Nothing published yet</h2>
            <p className="mb-0 mt-2 max-w-[620px] text-[16px] leading-[1.55] text-[#3d403a]">{emptyMessage}</p>
          </section>
        ) : sections.map((section, index) => (
          <section key={section.id} id={section.id} className="grid scroll-mt-24 gap-x-10 gap-y-4 border-t-2 border-[#191b18] py-7 min-[860px]:grid-cols-[260px_minmax(0,1fr)]">
            <div>
              <span className="fs-mono text-[12px] text-[#1d3a2a]">{String(index + 1).padStart(2, '0')}</span>
              <h2 className="mb-0 mt-1 text-[24px] font-bold leading-[1.15]">{section.title}</h2>
              {(section.lastUpdated || section.effectiveDate) && (
                <p className="fs-mono mb-0 mt-3 flex flex-col gap-1 text-[12px] text-[#4f524b]">
                  {section.effectiveDate && <span>Effective <time dateTime={section.effectiveDate}>{formatLegalDate(section.effectiveDate)}</time></span>}
                  {section.lastUpdated && section.lastUpdated !== section.effectiveDate && <span>Updated <time dateTime={section.lastUpdated}>{formatLegalDate(section.lastUpdated)}</time></span>}
                </p>
              )}
            </div>
            <div className="min-w-0 max-w-[720px]">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{section.content}</ReactMarkdown>
            </div>
          </section>
        ))}
      </div>

      <section className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-[6px] bg-[#1d3a2a] px-6 py-[22px] text-white">
        <div className="flex flex-col gap-1"><span className="text-[18px] font-bold">Questions about anything on this page?</span><span className="text-[15px] text-[#dfe6dc]">Email <a href="mailto:sales@feedsport.co.zw" className="text-white underline underline-offset-[3px]">sales@feedsport.co.zw</a> or get in touch with the team.</span></div>
        <Link href="/contact" className="inline-flex h-[46px] items-center rounded-[4px] bg-[#fbfaf6] px-[18px] text-[15px] font-semibold text-[#1d3a2a] no-underline">Contact FeedSport</Link>
      </section>
    </main>
  );
}

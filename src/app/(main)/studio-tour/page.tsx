import Link from "next/link";
import { ArrowDownRight, ArrowRight, CheckCircle2, ClipboardList, Scale, SlidersHorizontal, TriangleAlert } from "lucide-react";

import StudioTourPlayer from "@/components/studio-tour/StudioTourPlayer";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "FeedSport Studio — See How Feed Formulation Works",
  description: "Watch a real FeedSport Studio walkthrough: choose an animal and stage, select ingredients and a premix, optimise a feed recipe, and review nutrients, costs and advisories.",
  path: "/studio-tour",
});

const steps = [
  {
    number: "01",
    icon: ClipboardList,
    title: "Choose what you're feeding",
    description: "Select pigs or poultry and the production stage. Studio uses the corresponding feeding programme and nutrient targets.",
  },
  {
    number: "02",
    icon: SlidersHorizontal,
    title: "Use the ingredients you have",
    description: "Choose raw materials and a compatible premix. Set your batch size, ingredient limits, local prices and formulation goal.",
  },
  {
    number: "03",
    icon: Scale,
    title: "Review before you mix",
    description: "Get a proposed recipe, see its costs and nutrient checks, and investigate advisories or missing data before relying on it.",
  },
];

export default function StudioTourPage() {
  return (
    <main className="overflow-hidden bg-[#f3f0e8] text-[#191b18]">
      <section className="border-b border-[#d9d4c7] bg-[#1d3a2a] text-[#faf8f3]">
        <div className="fs-frame grid gap-8 pb-[clamp(52px,7vw,96px)] pt-[clamp(54px,7vw,100px)] lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)] lg:items-end">
          <div>
            <p className="mb-5 font-mono text-[12px] font-semibold uppercase tracking-[.12em] text-[#e3aa45]">
              FeedSport Studio · Product tour
            </p>
            <h1 className="m-0 max-w-[850px] text-balance text-[clamp(45px,6.8vw,92px)] font-bold leading-[.99] tracking-[-.045em]">
              See how better feed comes together.
            </h1>
          </div>
          <div className="flex flex-col gap-6">
            <p className="m-0 max-w-[420px] text-[clamp(17px,1.6vw,21px)] leading-[1.55] text-[#dbe5db]">
              From choosing ingredients to reviewing a balanced recipe. Watch how FeedSport Studio works, step by step.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/studio"
                className="inline-flex min-h-[52px] items-center gap-3 rounded-[5px] bg-[#e3aa45] px-6 text-[15px] font-semibold text-[#222420] no-underline transition hover:bg-[#edbd70]"
              >
                Open Studio <ArrowRight size={18} aria-hidden />
              </Link>
              <Link
                href="#walkthrough"
                className="inline-flex min-h-[52px] items-center gap-3 rounded-[5px] border border-white/40 px-6 text-[15px] font-semibold text-white no-underline transition hover:bg-white/10"
              >
                Watch the walkthrough <ArrowDownRight size={18} aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="fs-frame py-[clamp(40px,6vw,80px)]">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 font-mono text-[12px] uppercase tracking-[.1em] text-[#2f5a3f]">A real Studio session</p>
            <h2 className="m-0 max-w-[700px] text-[clamp(30px,4vw,54px)] font-bold leading-[1.08] tracking-[-.03em]">
              One feed formulation, six screens.
            </h2>
          </div>
          <p className="m-0 max-w-[360px] text-[14px] leading-6 text-[#4f524b]">
            The walkthrough plays automatically. Pause it, or select any step to explore it at your own pace.
          </p>
        </div>
        <StudioTourPlayer />
      </section>

      <section className="border-y border-[#d9d4c7] bg-[#fbfaf6]">
        <div className="fs-frame py-[clamp(56px,7vw,96px)]">
          <div className="mb-8 max-w-[680px]">
            <p className="mb-3 font-mono text-[12px] uppercase tracking-[.1em] text-[#2f5a3f]">How it works</p>
            <h2 className="m-0 text-[clamp(32px,4.5vw,62px)] font-bold leading-[1.05] tracking-[-.035em]">
              From your ingredients to a practical starting point.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map(({ number, icon: Icon, title, description }) => (
              <article key={number} className="flex flex-col gap-5 rounded-[8px] border border-[#d9d4c7] bg-white p-[clamp(20px,3vw,32px)]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[13px] font-semibold text-[#2f5a3f]">{number}</span>
                  <Icon className="h-7 w-7 text-[#2f5a3f]" strokeWidth={1.6} aria-hidden />
                </div>
                <h3 className="m-0 text-[23px] font-bold leading-[1.15] tracking-[-.02em]">{title}</h3>
                <p className="m-0 text-[15px] leading-7 text-[#4f524b]">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="fs-frame grid gap-8 py-[clamp(56px,7vw,96px)] lg:grid-cols-[minmax(0,1fr)_minmax(320px,.85fr)] lg:gap-16">
        <div>
          <p className="mb-3 font-mono text-[12px] uppercase tracking-[.1em] text-[#2f5a3f]">The useful detail</p>
          <h2 className="m-0 max-w-[650px] text-[clamp(34px,4.5vw,62px)] font-bold leading-[1.05] tracking-[-.035em]">
            A formula is only as good as the data behind it.
          </h2>
          <p className="mt-6 max-w-[610px] text-[17px] leading-8 text-[#4f524b]">
            Studio does more than combine ingredients. It checks nutritional requirements, tracks what the ingredient data can support and identifies areas that need attention.
          </p>
        </div>
        <div className="self-start overflow-hidden rounded-[10px] border border-[#d9d4c7] bg-[#fbfaf6]">
          <div className="flex gap-3 border-b border-[#d9d4c7] p-5">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#2f5a3f]" aria-hidden />
            <div>
              <h3 className="m-0 text-[17px] font-bold">Evaluate nutrient requirements</h3>
              <p className="mb-0 mt-1 text-[14px] leading-6 text-[#4f524b]">See which hard constraints the optimiser meets and inspect the underlying analysis.</p>
            </div>
          </div>
          <div className="flex gap-3 border-b border-[#d9d4c7] p-5">
            <Scale className="mt-0.5 h-5 w-5 shrink-0 text-[#2f5a3f]" aria-hidden />
            <div>
              <h3 className="m-0 text-[17px] font-bold">Compare cost and ingredient choices</h3>
              <p className="mb-0 mt-1 text-[14px] leading-6 text-[#4f524b]">See the recipe quantities, assess alternatives and replace planning prices with your own.</p>
            </div>
          </div>
          <div className="flex gap-3 p-5">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#af7720]" aria-hidden />
            <div>
              <h3 className="m-0 text-[17px] font-bold">Don't hide the limitations</h3>
              <p className="mb-0 mt-1 text-[14px] leading-6 text-[#4f524b]">
                In this demonstration, the premix price is missing and some vitamin documentation is incomplete. Studio flags both, rather than claiming a fully verified final diet.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#222420] text-white">
        <div className="fs-frame flex flex-col gap-7 py-[clamp(56px,7vw,88px)] md:flex-row md:items-end md:justify-between">
          <div className="max-w-[650px]">
            <p className="mb-3 font-mono text-[12px] uppercase tracking-[.1em] text-[#e3aa45]">Your next formulation starts here</p>
            <h2 className="m-0 text-[clamp(34px,4.5vw,62px)] font-bold leading-[1.05] tracking-[-.035em]">
              Ready to formulate your own feed?
            </h2>
            <p className="mb-0 mt-5 text-[16px] leading-7 text-[#d0cdc3]">
              Create a free Studio account, start with your animal and ingredients, and explore the result.
            </p>
          </div>
          <Link
            href="/studio"
            className="inline-flex min-h-[54px] shrink-0 items-center justify-center gap-3 self-start rounded-[5px] bg-[#e3aa45] px-7 text-[16px] font-bold text-[#222420] no-underline transition hover:bg-[#edbd70]"
          >
            Open FeedSport Studio <ArrowRight size={20} aria-hidden />
          </Link>
        </div>
      </section>
    </main>
  );
}

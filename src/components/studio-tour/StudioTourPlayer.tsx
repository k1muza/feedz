"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, MousePointer2, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const DEMO_STEPS = [
  {
    eyebrow: "01 / Choose an animal",
    title: "Pick the right feeding programme",
    description: "Choose pigs or poultry, then select a feeding stage. Studio loads the corresponding published nutritional requirements.",
    image: "/images/studio-tour/01-animal-stage.jpg",
    alt: "FeedSport Studio animal and stage selection showing Grow-Finish Pig and a 26–47 kg grower stage",
    cursor: { x: 39, y: 43 },
  },
  {
    eyebrow: "02 / Choose ingredients",
    title: "Work with the ingredients you can source",
    description: "Select your available ingredients, including a compatible premix. Use FeedSport's suggestion list or your own saved stock list.",
    image: "/images/studio-tour/02-ingredient-pool.jpg",
    alt: "FeedSport Studio ingredient selection with a premix, cereals, protein meals and ingredient limits",
    cursor: { x: 28, y: 48 },
  },
  {
    eyebrow: "03 / Set preferences",
    title: "Choose your batch and optimisation goal",
    description: "Choose a batch size and decide whether to prioritise least cost, fewer ingredients, less soybean meal or fewer imports.",
    image: "/images/studio-tour/03-batch-goal.jpg",
    alt: "FeedSport Studio showing batch size and formulation goal choices",
    cursor: { x: 32, y: 34 },
  },
  {
    eyebrow: "04 / Get your recipe",
    title: "See ingredient quantities and costs",
    description: "Run the optimiser to see the proposed ingredient mix, hard-requirement assessment and cost breakdown.",
    image: "/images/studio-tour/04-recipe.jpg",
    alt: "FeedSport Studio formulation workspace displaying a grower pig recipe and partial cost breakdown",
    cursor: { x: 33, y: 56 },
  },
  {
    eyebrow: "05 / Check the nutrition",
    title: "Review the nutrient analysis",
    description: "Check the formula against nutritional requirements and inspect which values are supported by available ingredient data.",
    image: "/images/studio-tour/05-nutrient-analysis.jpg",
    alt: "FeedSport Studio displaying the nutrient analysis tab for the grower pig formulation",
    cursor: { x: 39, y: 56 },
  },
  {
    eyebrow: "06 / Review the advisories",
    title: "See what still needs attention",
    description: "Inspect advisories about ingredient data, premix documentation and pricing before using a formula in practice.",
    image: "/images/studio-tour/06-advisories.jpg",
    alt: "FeedSport Studio advisory tab explaining incomplete premix documentation and an alternative premix",
    cursor: { x: 45, y: 56 },
  },
] as const;

const STEP_MS = 5200;

export default function StudioTourPlayer() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [inView, setInView] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const step = DEMO_STEPS[active];

  useEffect(() => {
    const node = playerRef.current;
    if (!node || !("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.2,
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reducedMotion) setPlaying(false);
  }, [reducedMotion]);

  useEffect(() => {
    if (!playing || !inView) return;
    const timer = window.setInterval(() => {
      setActive((index) => (index + 1) % DEMO_STEPS.length);
    }, STEP_MS);
    return () => window.clearInterval(timer);
  }, [inView, playing, reducedMotion]);

  function goTo(index: number) {
    setActive((index + DEMO_STEPS.length) % DEMO_STEPS.length);
    setPlaying(false);
  }

  return (
    <div ref={playerRef} id="walkthrough" className="scroll-mt-24">
      <div className="overflow-hidden rounded-[12px] border border-[#d9d4c7] bg-[#222420] shadow-[0_26px_70px_rgba(25,27,24,.18)]">
        <div className="flex h-10 items-center gap-2 border-b border-white/15 bg-[#272a27] px-4 text-white/70">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ba6b64]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#dba74c]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#719a79]" />
          <span className="mx-auto max-w-[55%] truncate rounded-md bg-white/10 px-4 py-1 text-[11px] text-white/70 sm:text-xs">
            feedsport.co.zw/studio
          </span>
          <span className="hidden text-[11px] font-semibold uppercase tracking-wide text-white/50 sm:inline">
            Captured UI
          </span>
        </div>
        <div className="relative aspect-[1908/832] w-full overflow-hidden bg-[#faf8f3]" aria-live="off">
          <AnimatePresence mode="sync" initial={false}>
            <motion.div
              key={step.image}
              className="absolute inset-0"
              initial={reducedMotion ? false : { opacity: 0, scale: 1.008 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.42 }}
            >
              <Image
                src={step.image}
                alt={step.alt}
                fill
                priority={active === 0}
                sizes="(min-width: 1280px) 1100px, 100vw"
                className="object-contain"
              />
            </motion.div>
          </AnimatePresence>
          {!reducedMotion && (
            <motion.div
              className="pointer-events-none absolute z-10"
              style={{ marginLeft: "-3px", marginTop: "-3px" }}
              initial={false}
              animate={{ left: step.cursor.x + "%", top: step.cursor.y + "%" }}
              transition={{ duration: 0.85, ease: [0.2, 0.7, 0.2, 1] }}
              aria-hidden="true"
            >
              <motion.span
                key={active}
                className="absolute left-0 top-0 block h-9 w-9 rounded-full border-[3px] border-[#e3aa45] bg-[#e3aa45]/20"
                initial={{ opacity: 0, scale: 0.2 }}
                animate={{ opacity: [0, 0.85, 0], scale: [0.2, 1, 1.8] }}
                transition={{ duration: 0.95, delay: 0.95 }}
              />
              <MousePointer2 className="relative h-7 w-7 fill-white stroke-[#222420] stroke-[2.5] drop-shadow-md" />
            </motion.div>
          )}
          <div className="absolute bottom-2 left-2 rounded bg-[#222420]/85 px-2 py-1 text-[10px] font-semibold text-white sm:bottom-4 sm:left-4 sm:px-3 sm:py-2 sm:text-xs">
            Demonstration · {active + 1} of {DEMO_STEPS.length}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 bg-[#222420] px-3 py-3 text-white sm:px-5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Previous demonstration screen"
              onClick={() => goTo(active - 1)}
              className="grid h-10 w-10 place-items-center rounded-md border border-white/20 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e3aa45]"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next demonstration screen"
              onClick={() => goTo(active + 1)}
              className="grid h-10 w-10 place-items-center rounded-md border border-white/20 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e3aa45]"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label={playing ? "Pause walkthrough" : "Play walkthrough"}
              onClick={() => setPlaying((value) => !value)}
              className="ml-1 grid h-10 w-10 place-items-center rounded-md border border-white/20 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e3aa45]"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              type="button"
              aria-label="Replay walkthrough from the beginning"
              onClick={() => { setActive(0); setPlaying(!reducedMotion); }}
              className="grid h-10 w-10 place-items-center rounded-md border border-white/20 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e3aa45]"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-3"><a href={step.image} target="_blank" rel="noopener noreferrer" className="text-[11px] font-medium text-[#d0cdc3] underline underline-offset-2 hover:text-white">Enlarge screen ↗</a><span className="font-mono text-xs text-[#d0cdc3]">{String(active + 1).padStart(2, "0")} / 06</span></div>
        </div>
      </div>

      <div className="grid gap-6 border-b border-[#d9d4c7] py-6 md:grid-cols-[minmax(0,1fr)_minmax(240px,0.7fr)] md:items-start">
        <div aria-live="polite" aria-atomic="true">
          <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-widest text-[#2f5a3f]">{step.eyebrow}</p>
          <h3 className="mb-2 text-[clamp(24px,3vw,36px)] font-bold leading-tight tracking-[-.025em]">{step.title}</h3>
          <p className="m-0 max-w-[620px] text-[15px] leading-7 text-[#4f524b]">{step.description}</p>
        </div>
        <div className="grid grid-cols-6 gap-1.5 pt-2" aria-label="Walkthrough screens">
          {DEMO_STEPS.map((item, index) => (
            <button
              key={item.image}
              type="button"
              aria-label={"Show screen " + (index + 1) + ": " + item.title}
              aria-current={active === index ? "step" : undefined}
              title={item.title}
              onClick={() => goTo(index)}
              className="group flex min-h-11 flex-col items-center justify-center gap-2"
            >
              <span className={"block h-1.5 w-full rounded-full transition-colors " + (index === active ? "bg-[#2f5a3f]" : "bg-[#d9d4c7] group-hover:bg-[#9aab97]")} />
              <span className={"font-mono text-[11px] " + (index === active ? "font-bold text-[#1d3a2a]" : "text-[#777970]")}>{String(index + 1).padStart(2, "0")}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="mt-3 text-[12px] leading-5 text-[#64665c]">
        Captured from a real FeedSport Studio session. The cursor animation replays the illustrated journey; this is not a live formulation.
        FeedSport planning prices are indicative, and the illustrated result excludes the unpriced premix and flags incomplete manufacturer documentation.
      </p>
    </div>
  );
}

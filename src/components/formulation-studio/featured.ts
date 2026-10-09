import type { Pool, Snapshot } from "./engine";

// Featured formulations on the studio's Home screen: starting points written
// by FeedSport's nutritionists. Each one is formulated live against the
// current programmes and planning prices, so a recipe that stops meeting its
// stage drops off Home rather than showing stale numbers. Opening one copies
// its settings into a new, unsaved formulation.

export interface FeaturedFormulation {
  id: string;
  name: string;
  desc: string;
  author: string;
  role: string;
  place: string;
  snap: Snapshot;
}

const A = (max?: number) => ({ role: "available" as const, ...(max != null ? { max } : {}) });
const MINERALS: Pool = { "limestone-ground": A(), "dicalcium-phosphate": A(), "sodium-chloride": A() };
const TEAM = { author: "FeedSport Nutrition Team", role: "FeedSport nutritionist", place: "Harare" };

export const FEATURED: FeaturedFormulation[] = [
  {
    id: "pig-grower-maize-soya-lysine",
    name: "Pig grower on maize and soya, with lysine",
    desc: "A standard least-cost grower. Adding L-lysine lets it use less soybean meal than a plain maize–soya mix.",
    ...TEAM,
    snap: {
      programmeId: "grow-finish-pig",
      phaseId: "br2024-5-43-63-91d-26-47kg",
      goal: "least_cost",
      batch: 100,
      pool: { "corn-yellow-dent": A(), "soybean-meal-solvent-extracted": A(), "wheat-bran": A(10), "soybean-degummed-oil": A(), "l-lysine-hcl": A(), "l-threonine": A(), "dl-methionine": A(), "l-tryptophan": A(), ...MINERALS },
    },
  },
  {
    id: "pig-finisher-sorghum",
    name: "Sorghum finisher for maize-short seasons",
    desc: "Swaps maize for sorghum entirely. Built for when local maize is expensive or hard to find.",
    ...TEAM,
    snap: {
      programmeId: "grow-finish-pig",
      phaseId: "br2024-5-43-119-147d-74-103kg",
      goal: "least_cost",
      batch: 1000,
      pool: { "sorghum-grain": A(), "soybean-meal-solvent-extracted": A(), "wheat-bran": A(), "soybean-degummed-oil": A(), "l-lysine-hcl": A(), "l-threonine": A(), "dl-methionine": A(), ...MINERALS },
    },
  },
  {
    id: "broiler-starter-maize-soya",
    name: "Broiler starter, maize–soya with synthetic amino acids",
    desc: "High-protein starter for days 8–17. Full-fat soya and soybean oil lift energy; synthetic amino acids keep soybean meal in check.",
    ...TEAM,
    snap: {
      programmeId: "broiler-standard",
      phaseId: "br2024-2-30-8-17d-0.24-0.68kg",
      goal: "least_cost",
      batch: 1000,
      pool: { "corn-yellow-dent": A(), "soybean-meal-solvent-extracted": A(), "soybean-full-fat-extruded": A(), "soybean-degummed-oil": A(), "dl-methionine": A(), "l-lysine-hcl": A(0.5), "l-threonine": A(0.3), "l-valine": A(), "l-isoleucine": A(), ...MINERALS },
    },
  },
  {
    id: "sow-lactation-full-fat-soya",
    name: "Lactating sow, high energy with full-fat soya",
    desc: "For sows losing condition in lactation. Extruded full-fat soya brings energy and protein in one ingredient.",
    ...TEAM,
    snap: {
      programmeId: "lactating-gilt-sow",
      phaseId: "br2024-6-15-po3plus-2.82kg-lwg",
      goal: "least_cost",
      batch: 1000,
      pool: { "corn-yellow-dent": A(), "soybean-meal-solvent-extracted": A(), "soybean-full-fat-extruded": A(), "soybean-degummed-oil": A(), "l-lysine-hcl": A(), "l-threonine": A(), "dl-methionine": A(), "l-tryptophan": A(), "l-valine": A(), "l-isoleucine": A(), ...MINERALS },
    },
  },
  {
    id: "sow-gestation-hand-mix",
    name: "Simple gestation diet for hand mixing",
    desc: "Kept short on purpose: bran-heavy, few ingredients and easy to mix by hand on the farm.",
    ...TEAM,
    snap: {
      programmeId: "gestating-gilt-sow",
      phaseId: "br2024-6-08-po3plus-0-85d",
      goal: "simpler",
      batch: 100,
      pool: { "corn-yellow-dent": A(), "soybean-meal-solvent-extracted": A(), "wheat-bran": A(), "soybean-degummed-oil": A(), ...MINERALS },
    },
  },
];

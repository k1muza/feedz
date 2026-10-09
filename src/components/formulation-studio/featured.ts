import type { Snapshot } from "./engine";

// Featured formulations on the studio's Home screen: starting points published
// by FeedSport's nutritionists, stored in public.featured_formulations and
// authored through the advisor MCP endpoint. Each one is formulated live
// against the current programmes and planning prices, so a recipe that stops
// meeting its stage drops off Home rather than showing stale numbers. Opening
// one copies its settings into a new, unsaved formulation.

export interface FeaturedFormulation {
  id: string;
  name: string;
  desc: string;
  author: string;
  role: string;
  place: string;
  snap: Snapshot;
}

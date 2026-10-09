import "server-only";

import { cache } from "react";

import type { Snapshot } from "@/components/formulation-studio/engine";
import type { FeaturedFormulation } from "@/components/formulation-studio/featured";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/server";

type FeaturedRow = {
  id: string;
  name: string;
  description: string;
  author: string;
  author_role: string;
  place: string;
  snapshot: Snapshot;
};

/** Published featured formulations in display order; none when the database is unavailable. */
export const getFeaturedFormulations = cache(async (): Promise<FeaturedFormulation[]> => {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await createPublicClient()
    .from("featured_formulations")
    .select("id, name, description, author, author_role, place, snapshot")
    .eq("published", true)
    .order("sort_order")
    .order("created_at");
  if (error) {
    console.error("Failed to load featured formulations:", error.message);
    return [];
  }
  return (data as FeaturedRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    desc: row.description,
    author: row.author,
    role: row.author_role,
    place: row.place,
    snap: row.snapshot,
  }));
});

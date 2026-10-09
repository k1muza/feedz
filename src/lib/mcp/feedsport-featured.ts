/**
 * Featured formulations — the starting points on the studio's Home screen —
 * authored by FeedSport's nutritionist (or Claude on their behalf) through the
 * advisor MCP endpoint. Nothing is saved unless FeedSport formulates it to a
 * valid recipe at planning prices, which is how the Studio will show it.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { GoalKey, Pool, PoolEntry, Snapshot } from "@/components/formulation-studio/engine";
import { INGREDIENT_LIBRARY } from "@/lib/ingredient-nutrients";

import {
  FeedSportInputError,
  formulate,
  libraryName,
  resolvePhase,
  resolveRequestedIngredient,
  type FeedSportServiceContext,
  type FormulationObjective,
} from "./feedsport-service";
import { snapshotProgrammeId, snapshotToolInputs } from "./feedsport-formulations";

// ---------------------------------------------------------------------------
// Storage

export interface StoredFeatured {
  id: string;
  name: string;
  description: string;
  author: string;
  authorRole: string;
  place: string;
  snapshot: Snapshot;
  published: boolean;
  sortOrder: number;
  updatedAt?: string;
}

export interface FeaturedStore {
  /** Published and unpublished, in display order. */
  list(): Promise<StoredFeatured[]>;
  get(id: string): Promise<StoredFeatured | null>;
  upsert(featured: StoredFeatured): Promise<StoredFeatured>;
}

type FeaturedRow = {
  id: string;
  name: string;
  description: string;
  author: string;
  author_role: string;
  place: string;
  snapshot: Snapshot;
  published: boolean;
  sort_order: number;
  updated_at: string;
};

const COLUMNS = "id, name, description, author, author_role, place, snapshot, published, sort_order, updated_at";

const fromRow = (row: FeaturedRow): StoredFeatured => ({
  id: row.id,
  name: row.name,
  description: row.description,
  author: row.author,
  authorRole: row.author_role,
  place: row.place,
  snapshot: row.snapshot,
  published: row.published,
  sortOrder: row.sort_order,
  updatedAt: row.updated_at,
});

function check<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

/** Reads and writes public.featured_formulations; supabase must use the secret key. */
export function createSupabaseFeaturedStore(supabase: SupabaseClient): FeaturedStore {
  return {
    async list() {
      const rows = check(await supabase.from("featured_formulations").select(COLUMNS).order("sort_order").order("created_at")) as FeaturedRow[];
      return rows.map(fromRow);
    },
    async get(id) {
      const row = check(await supabase.from("featured_formulations").select(COLUMNS).eq("id", id).maybeSingle()) as FeaturedRow | null;
      return row ? fromRow(row) : null;
    },
    async upsert(f) {
      const row = check(
        await supabase
          .from("featured_formulations")
          .upsert({
            id: f.id,
            name: f.name,
            description: f.description,
            author: f.author,
            author_role: f.authorRole,
            place: f.place,
            snapshot: f.snapshot,
            published: f.published,
            sort_order: f.sortOrder,
          })
          .select(COLUMNS)
          .single(),
      ) as FeaturedRow;
      return fromRow(row);
    },
  };
}

// ---------------------------------------------------------------------------
// Tools

const OBJECTIVE_GOAL: Record<FormulationObjective, GoalKey> = {
  least_cost: "least_cost",
  simple: "simpler",
  low_soy: "less_sbm",
  low_import: "local",
};
const GOAL_OBJECTIVE = Object.fromEntries(Object.entries(OBJECTIVE_GOAL).map(([objective, goal]) => [goal, objective])) as Record<GoalKey, FormulationObjective>;

const DEFAULT_AUTHOR = { author: "FeedSport Nutrition Team", authorRole: "FeedSport nutritionist", place: "Harare" };
const DEFAULT_SORT_ORDER = 100;

export type FeaturedIngredientInput = {
  ingredient: string;
  role?: "available" | "required" | "fixed";
  min_percent?: number;
  max_percent?: number;
  fixed_percent?: number;
};

export type SaveFeaturedInput = {
  id: string;
  name: string;
  description: string;
  programme_id: string;
  objective?: FormulationObjective;
  batch_kg?: number;
  ingredients: FeaturedIngredientInput[];
  author?: string;
  author_role?: string;
  place?: string;
  published?: boolean;
  sort_order?: number;
  dry_run?: boolean;
};

const ingredientName = (id: string) => libraryName(id, INGREDIENT_LIBRARY);

/** The studio snapshot for a featured formulation. Prices are left out: the Studio uses planning prices. */
export function featuredSnapshot(input: Pick<SaveFeaturedInput, "programme_id" | "objective" | "batch_kg" | "ingredients">): Snapshot {
  const { programme, phase } = resolvePhase(input.programme_id);
  const pool: Pool = {};
  for (const item of input.ingredients) {
    const id = resolveRequestedIngredient(item.ingredient, INGREDIENT_LIBRARY);
    if (pool[id]) throw new FeedSportInputError(`${ingredientName(id)} is listed more than once.`);
    const role = item.role ?? (item.fixed_percent !== undefined ? "fixed" : item.min_percent !== undefined ? "required" : "available");
    const entry: PoolEntry = { role };
    if (role === "fixed") {
      if (item.fixed_percent === undefined) throw new FeedSportInputError(`${ingredientName(id)} is fixed but has no fixed_percent.`);
      entry.fixed = item.fixed_percent;
    } else {
      if (role === "required") {
        if (item.min_percent === undefined) throw new FeedSportInputError(`${ingredientName(id)} is required but has no min_percent.`);
        entry.min = item.min_percent;
      }
      if (item.max_percent !== undefined) entry.max = item.max_percent;
    }
    pool[id] = entry;
  }
  return {
    programmeId: programme.id,
    phaseId: phase.id,
    pool,
    goal: OBJECTIVE_GOAL[input.objective ?? "least_cost"],
    batch: input.batch_kg ?? 1000,
  };
}

function describeFeatured(f: StoredFeatured) {
  let programme: string | undefined;
  try {
    const resolved = resolvePhase(snapshotProgrammeId(f.snapshot));
    programme = `${resolved.programme.name} — ${resolved.phase.label}`;
  } catch {
    programme = undefined;
  }
  return {
    id: f.id,
    name: f.name,
    description: f.description,
    author: f.author,
    author_role: f.authorRole,
    place: f.place,
    published: f.published,
    sort_order: f.sortOrder,
    ...(f.updatedAt ? { updated_at: f.updatedAt } : {}),
    programme_id: snapshotProgrammeId(f.snapshot),
    ...(programme ? { programme } : {}),
    objective: GOAL_OBJECTIVE[f.snapshot.goal] ?? "least_cost",
    batch_kg: f.snapshot.batch,
    ingredients: Object.entries(f.snapshot.pool).map(([id, entry]) => ({
      ingredient: id,
      name: ingredientName(id),
      role: entry.role,
      ...(entry.min != null && entry.min !== "" ? { min_percent: Number(entry.min) } : {}),
      ...(entry.max != null && entry.max !== "" ? { max_percent: Number(entry.max) } : {}),
      ...(entry.fixed != null && entry.fixed !== "" ? { fixed_percent: Number(entry.fixed) } : {}),
    })),
    tool_inputs: snapshotToolInputs(f.snapshot),
  };
}

export async function listFeaturedTool(store: FeaturedStore) {
  const all = await store.list();
  return {
    note: "Home shows, for each species filter, the first three published formulations (lowest sort_order) that FeedSport can formulate to a valid recipe today.",
    featured: all.map(describeFeatured),
  };
}

/** Formulates the snapshot as the Studio will and summarises what its Home card will show. */
async function checkFeatured(snapshot: Snapshot, context: FeedSportServiceContext) {
  const result = await formulate(snapshotToolInputs(snapshot), context);
  if (result.status !== "optimal") return { valid: false as const, result };
  const objective = GOAL_OBJECTIVE[snapshot.goal];
  // One requirement per nutrient, as the Studio counts them (a minimum and maximum make one).
  const passes = new Map<string, boolean>();
  for (const row of result.requirement_comparison) passes.set(row.nutrient, (passes.get(row.nutrient) ?? true) && row.passes);
  const met = [...passes.values()].filter(Boolean).length;
  return {
    valid: true as const,
    card: {
      cost_per_tonne: result.cost_per_tonne,
      currency: result.currency,
      requirements_met: `${met} of ${passes.size}`,
      above_practical_inclusion: result.above_practical_inclusion ?? [],
      objective_applied: result.objective_applied,
      ...(result.objective_applied !== objective
        ? { warning: `No distinct "${objective}" recipe exists within the cost tolerance, so the Studio will show least cost.` }
        : {}),
      recipe: result.ingredients,
      unused_ingredients: result.unused_ingredients,
      nutritional_validation: result.nutritional_validation,
    },
  };
}

export async function saveFeaturedTool(input: SaveFeaturedInput, store: FeaturedStore, context: () => Promise<FeedSportServiceContext>) {
  const snapshot = featuredSnapshot(input);
  const checked = await checkFeatured(snapshot, await context());
  if (!checked.valid) {
    return {
      status: "rejected",
      saved: false,
      message: "FeedSport cannot formulate this to a valid recipe at planning prices, so it would never appear on Home. Fix the ingredient pool or limits and try again.",
      formulation: checked.result,
    };
  }
  const existing = await store.get(input.id);
  const featured: StoredFeatured = {
    id: input.id,
    name: input.name.trim(),
    description: input.description.trim(),
    author: input.author?.trim() || existing?.author || DEFAULT_AUTHOR.author,
    authorRole: input.author_role?.trim() || existing?.authorRole || DEFAULT_AUTHOR.authorRole,
    place: input.place?.trim() || existing?.place || DEFAULT_AUTHOR.place,
    snapshot,
    published: input.published ?? existing?.published ?? true,
    sortOrder: input.sort_order ?? existing?.sortOrder ?? DEFAULT_SORT_ORDER,
  };
  if (input.dry_run) {
    return { status: "preview", saved: false, replaces_existing: !!existing, featured: describeFeatured(featured), card: checked.card };
  }
  const saved = await store.upsert(featured);
  return { status: existing ? "updated" : "created", saved: true, featured: describeFeatured(saved), card: checked.card };
}

export async function setFeaturedPublishedTool(input: { id: string; published: boolean }, store: FeaturedStore) {
  const existing = await store.get(input.id);
  if (!existing) throw new FeedSportInputError(`No featured formulation "${input.id}". Call list_featured_formulations to see ids.`);
  const saved = await store.upsert({ ...existing, published: input.published });
  return { status: input.published ? "published" : "unpublished", featured: describeFeatured(saved) };
}

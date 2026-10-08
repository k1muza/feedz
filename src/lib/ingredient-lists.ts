import { createClient } from "@/lib/supabase/client";

// A signed-in user's ingredient lists ("My ingredients"), read and written from
// the browser. Row-level security limits every query to the user's own lists;
// see supabase/migrations/20261008000000_ingredient_lists.sql.

export type IngredientRole = "available" | "required" | "fixed" | "excluded";

export interface IngredientListItem {
  /** Id in the checked-in ingredient library. */
  ingredientId: string;
  role: IngredientRole;
  /** USD per tonne; null uses the FeedSport planning price. */
  price: number | null;
  priceUpdatedAt: string | null;
  minPct: number | null;
  maxPct: number | null;
  fixedPct: number | null;
  addedAt: string;
}

export type IngredientListItemRule = Pick<IngredientListItem, "role" | "minPct" | "maxPct" | "fixedPct">;

export type IngredientListItemRuleInput =
  | { role: "available"; maxPct?: number | null }
  | { role: "required"; minPct: number; maxPct?: number | null }
  | { role: "fixed"; fixedPct: number }
  | { role: "excluded" };

export interface IngredientList {
  id: string;
  label: string;
  /** The user's default list: shown first and used to start formulations. One per user. */
  isDefault: boolean;
  createdAt: string;
  items: IngredientListItem[];
}

interface ItemRow {
  ingredient_id: string;
  role: IngredientRole;
  price_usd_per_tonne: number | string | null;
  price_updated_at: string | null;
  min_pct: number | string | null;
  max_pct: number | string | null;
  fixed_pct: number | string | null;
  added_at: string;
}

interface ListRow {
  id: string;
  label: string;
  is_default: boolean;
  created_at: string;
  ingredient_list_items?: ItemRow[];
}

const ITEM_COLUMNS = "ingredient_id, role, price_usd_per_tonne, price_updated_at, min_pct, max_pct, fixed_pct, added_at";

// numeric columns arrive as strings from PostgREST.
const num = (value: number | string | null) => (value == null ? null : Number(value));

/** Canonical database patch: fields from a previous role never leak into the next one. */
export function ingredientRuleUpdate(rule: IngredientListItemRuleInput) {
  return {
    role: rule.role,
    min_pct: rule.role === "required" ? rule.minPct : null,
    max_pct: rule.role === "available" || rule.role === "required" ? rule.maxPct ?? null : null,
    fixed_pct: rule.role === "fixed" ? rule.fixedPct : null,
  };
}

const toItem = (row: ItemRow): IngredientListItem => ({
  ingredientId: row.ingredient_id,
  role: row.role,
  price: num(row.price_usd_per_tonne),
  priceUpdatedAt: row.price_updated_at,
  minPct: num(row.min_pct),
  maxPct: num(row.max_pct),
  fixedPct: num(row.fixed_pct),
  addedAt: row.added_at,
});

const toList = (row: ListRow): IngredientList => ({
  id: row.id,
  label: row.label,
  isDefault: row.is_default,
  createdAt: row.created_at,
  items: (row.ingredient_list_items ?? []).map(toItem).sort((a, b) => a.addedAt.localeCompare(b.addedAt)),
});

function check<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export async function fetchIngredientLists(): Promise<IngredientList[]> {
  const rows = check(
    await createClient()
      .from("ingredient_lists")
      .select(`id, label, is_default, created_at, ingredient_list_items (${ITEM_COLUMNS})`)
      .order("is_default", { ascending: false })
      .order("created_at"),
  );
  return (rows as ListRow[]).map(toList);
}

export async function createIngredientList(label: string, isDefault = false): Promise<IngredientList> {
  const row = check(await createClient().from("ingredient_lists").insert({ label, is_default: isDefault }).select("id, label, is_default, created_at").single());
  return toList(row as ListRow);
}

/** Makes this list the user's default (and clears the old one) in one step. */
export async function setDefaultIngredientList(id: string): Promise<void> {
  check(await createClient().rpc("set_default_ingredient_list", { p_list_id: id }));
}

/**
 * Gives a new user their starter list, filled with these ingredients and set
 * as default. The database does this at most once per user, and never for
 * someone who already has lists; returns the new list id, or null.
 */
export async function createStarterIngredientList(label: string, ingredientIds: string[]): Promise<string | null> {
  return check(await createClient().rpc("create_starter_ingredient_list", { p_label: label, p_ingredient_ids: ingredientIds })) as string | null;
}

export async function renameIngredientList(id: string, label: string): Promise<void> {
  check(await createClient().from("ingredient_lists").update({ label }).eq("id", id));
}

export async function deleteIngredientList(id: string): Promise<void> {
  check(await createClient().from("ingredient_lists").delete().eq("id", id));
}

export async function addIngredientListItem(listId: string, ingredientId: string): Promise<IngredientListItem> {
  const row = check(
    await createClient().from("ingredient_list_items").insert({ list_id: listId, ingredient_id: ingredientId }).select(ITEM_COLUMNS).single(),
  );
  return toItem(row as ItemRow);
}

/** Sets or clears (null) the user's price; the database stamps the price date. */
export async function setIngredientListItemPrice(listId: string, ingredientId: string, price: number | null): Promise<IngredientListItem> {
  const row = check(
    await createClient()
      .from("ingredient_list_items")
      .update({ price_usd_per_tonne: price })
      .eq("list_id", listId)
      .eq("ingredient_id", ingredientId)
      .select(ITEM_COLUMNS)
      .single(),
  );
  return toItem(row as ItemRow);
}

/** Persists the reusable role and inclusion rule for one list ingredient. */
export async function setIngredientListItemRule(listId: string, ingredientId: string, rule: IngredientListItemRuleInput): Promise<IngredientListItem> {
  const row = check(
    await createClient()
      .from("ingredient_list_items")
      .update(ingredientRuleUpdate(rule))
      .eq("list_id", listId)
      .eq("ingredient_id", ingredientId)
      .select(ITEM_COLUMNS)
      .single(),
  );
  return toItem(row as ItemRow);
}

export async function removeIngredientListItem(listId: string, ingredientId: string): Promise<void> {
  check(await createClient().from("ingredient_list_items").delete().eq("list_id", listId).eq("ingredient_id", ingredientId));
}

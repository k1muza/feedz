import { createClient } from "@/lib/supabase/client";

// A signed-in user's saved formulations, read and written from the browser.
// Row-level security limits every query to the user's own formulations; see
// supabase/migrations/20261008020000_formulations.sql. Snapshots and summaries
// are stored as JSON and typed by the caller.

export interface FormulationVersionRow<Snap, Sum> {
  version: number;
  createdAt: string;
  snapshot: Snap;
  summary: Sum;
}

export interface FormulationRow<Snap, Sum> {
  id: string;
  name: string;
  updatedAt: string;
  versions: FormulationVersionRow<Snap, Sum>[];
}

interface Row {
  id: string;
  name: string;
  updated_at: string;
  formulation_versions: { version: number; created_at: string; snapshot: unknown; summary: unknown }[] | null;
}

function check<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

/** Newest first; each formulation's versions oldest first. */
export async function fetchFormulations<Snap, Sum>(): Promise<FormulationRow<Snap, Sum>[]> {
  const rows = check(
    await createClient()
      .from("formulations")
      .select("id, name, updated_at, formulation_versions (version, created_at, snapshot, summary)")
      .order("updated_at", { ascending: false }),
  ) as Row[];
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    updatedAt: row.updated_at,
    versions: (row.formulation_versions ?? [])
      .map((v) => ({ version: v.version, createdAt: v.created_at, snapshot: v.snapshot as Snap, summary: v.summary as Sum }))
      .sort((a, b) => a.version - b.version),
  }));
}

/** Adds a version, creating the formulation when id is null. */
export async function saveFormulationVersion<Snap, Sum>(id: string | null, name: string, snapshot: Snap, summary: Sum) {
  const rows = check(
    await createClient().rpc("save_formulation_version", { p_formulation_id: id, p_name: name, p_snapshot: snapshot, p_summary: summary }),
  ) as { formulation_id: string; version: number; created_at: string }[];
  const row = rows[0];
  return { id: row.formulation_id, version: row.version, createdAt: row.created_at };
}

/**
 * Deletes a formulation with all its versions and advice (they cascade).
 * Row-level security silently skips rows the user doesn't own, so a delete
 * that matched nothing is reported as an error rather than a success.
 */
export async function deleteFormulation(id: string): Promise<void> {
  const rows = check(await createClient().from("formulations").delete().eq("id", id).select("id")) as { id: string }[];
  if (!rows.length) throw new Error("Formulation not found");
}

export interface FormulationAdviceRow<Snap> {
  id: string;
  formulationId: string;
  version: number | null;
  author: string;
  body: string;
  suggestedSnapshot: Snap | null;
  createdAt: string;
  readAt: string | null;
}

/**
 * Advice the nutritionist left on the user's formulations, newest first.
 * Returns nothing rather than failing, so formulations still load if advice
 * is unavailable.
 */
export async function fetchFormulationAdvice<Snap>(): Promise<FormulationAdviceRow<Snap>[]> {
  const { data, error } = await createClient()
    .from("formulation_advice")
    .select("id, formulation_id, version, author, body, suggested_snapshot, created_at, read_at")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Failed to load formulation advice:", error.message);
    return [];
  }
  return (data as { id: string; formulation_id: string; version: number | null; author: string; body: string; suggested_snapshot: unknown; created_at: string; read_at: string | null }[]).map((row) => ({
    id: row.id,
    formulationId: row.formulation_id,
    version: row.version,
    author: row.author,
    body: row.body,
    suggestedSnapshot: row.suggested_snapshot as Snap | null,
    createdAt: row.created_at,
    readAt: row.read_at,
  }));
}

/** Marks advice notes read; row-level security limits it to the user's own formulations. */
export async function markFormulationAdviceRead(ids: string[]): Promise<void> {
  if (!ids.length) return;
  check(await createClient().from("formulation_advice").update({ read_at: new Date().toISOString() }).in("id", ids).is("read_at", null));
}

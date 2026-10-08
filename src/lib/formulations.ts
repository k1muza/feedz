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

/**
 * Saved Studio formulations for the advising nutritionist: every user's
 * formulations and versions, read-only, plus advice notes the nutritionist
 * leaves on them. Advice is the only thing this module writes.
 *
 * Storage sits behind FormulationStore so the tool logic can be tested without
 * a database; createSupabaseFormulationStore reads with the secret key, which
 * bypasses row-level security, so the MCP route only hands a store to the
 * server for requests carrying the advisor token.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { GoalKey, PoolEntry, Role, Snapshot, Summary } from "@/components/formulation-studio/engine";
import { INGREDIENT_LIBRARY } from "@/lib/ingredient-nutrients";
import { PUBLIC_PREMIX_ID } from "@/lib/public-feed-premix";

import {
  FeedSportInputError,
  formulate,
  libraryName,
  resolvePhase,
  resolveRequestedIngredient,
  round,
  type FeedSportServiceContext,
  type FormulateInput,
  type FormulationObjective,
  type IngredientConstraintInput,
} from "./feedsport-service";

// ---------------------------------------------------------------------------
// Storage

export interface StoredUser {
  id: string;
  email: string;
  name?: string;
  organisation?: string;
  role?: string;
  createdAt: string;
  lastSignInAt?: string;
}

export interface StoredVersion {
  version: number;
  createdAt: string;
  snapshot: Snapshot;
  summary: Summary;
}

export interface StoredAdvice {
  id: string;
  formulationId: string;
  version: number | null;
  author: string;
  body: string;
  suggestedSnapshot: Snapshot | null;
  createdAt: string;
}

export interface StoredFormulation {
  id: string;
  ownerId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  /** Oldest first. */
  versions: StoredVersion[];
  /** Newest first. */
  advice: StoredAdvice[];
}

export type NewAdvice = Omit<StoredAdvice, "id" | "createdAt">;

export interface FormulationStore {
  listUsers(): Promise<StoredUser[]>;
  /** Every formulation, newest first. */
  listFormulations(): Promise<StoredFormulation[]>;
  getFormulation(id: string): Promise<StoredFormulation | null>;
  addAdvice(advice: NewAdvice): Promise<StoredAdvice>;
}

type FormulationRow = {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  formulation_versions: { version: number; created_at: string; snapshot: Snapshot; summary: Summary }[] | null;
  formulation_advice: AdviceRow[] | null;
};

type AdviceRow = {
  id: string;
  formulation_id: string;
  version: number | null;
  author: string;
  body: string;
  suggested_snapshot: Snapshot | null;
  created_at: string;
};

const FORMULATION_COLUMNS =
  "id, owner_id, name, created_at, updated_at, formulation_versions (version, created_at, snapshot, summary), formulation_advice (id, formulation_id, version, author, body, suggested_snapshot, created_at)";

function adviceFromRow(row: AdviceRow): StoredAdvice {
  return {
    id: row.id,
    formulationId: row.formulation_id,
    version: row.version,
    author: row.author,
    body: row.body,
    suggestedSnapshot: row.suggested_snapshot,
    createdAt: row.created_at,
  };
}

function formulationFromRow(row: FormulationRow): StoredFormulation {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    versions: (row.formulation_versions ?? [])
      .map((v) => ({ version: v.version, createdAt: v.created_at, snapshot: v.snapshot, summary: v.summary }))
      .sort((a, b) => a.version - b.version),
    advice: (row.formulation_advice ?? []).map(adviceFromRow).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

function check<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);

/** Reads every user's rows; supabase must use the secret key. */
export function createSupabaseFormulationStore(supabase: SupabaseClient): FormulationStore {
  return {
    async listUsers() {
      const users: StoredUser[] = [];
      for (let page = 1; ; page++) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw new Error(error.message);
        for (const user of data.users) {
          const meta = user.user_metadata ?? {};
          users.push({
            id: user.id,
            email: user.email ?? "",
            name: text(meta.full_name) ?? text(meta.name),
            organisation: text(meta.organisation) ?? text(meta.org),
            role: text(meta.role),
            createdAt: user.created_at,
            lastSignInAt: user.last_sign_in_at ?? undefined,
          });
        }
        if (data.users.length < 1000) return users;
      }
    },
    async listFormulations() {
      const rows = check(
        await supabase.from("formulations").select(FORMULATION_COLUMNS).order("updated_at", { ascending: false }),
      ) as FormulationRow[];
      return rows.map(formulationFromRow);
    },
    async getFormulation(id) {
      const row = check(await supabase.from("formulations").select(FORMULATION_COLUMNS).eq("id", id).maybeSingle()) as FormulationRow | null;
      return row ? formulationFromRow(row) : null;
    },
    async addAdvice(advice) {
      const row = check(
        await supabase
          .from("formulation_advice")
          .insert({
            formulation_id: advice.formulationId,
            version: advice.version,
            author: advice.author,
            body: advice.body,
            suggested_snapshot: advice.suggestedSnapshot,
          })
          .select("id, formulation_id, version, author, body, suggested_snapshot, created_at")
          .single(),
      ) as AdviceRow;
      return adviceFromRow(row);
    },
  };
}

// ---------------------------------------------------------------------------
// Studio snapshot ↔ MCP tool inputs

const GOAL_OBJECTIVE: Record<GoalKey, FormulationObjective> = {
  least_cost: "least_cost",
  simpler: "simple",
  less_sbm: "low_soy",
  local: "low_import",
};
const OBJECTIVE_GOAL = Object.fromEntries(Object.entries(GOAL_OBJECTIVE).map(([goal, objective]) => [objective, goal])) as Record<
  FormulationObjective,
  GoalKey
>;

const num = (value: number | string | null | undefined) =>
  value == null || value === "" || !Number.isFinite(+value) ? undefined : +value;

/** The studio stores programme and phase separately; MCP tools take "programme:phase". */
export function snapshotProgrammeId(snapshot: Pick<Snapshot, "programmeId" | "phaseId">) {
  return `${snapshot.programmeId}:${snapshot.phaseId}`;
}

function programmeName(snapshot: Snapshot) {
  try {
    const { programme, phase } = resolvePhase(snapshotProgrammeId(snapshot));
    return `${programme.name} — ${phase.label}`;
  } catch {
    return undefined;
  }
}

const ingredientName = (id: string) => (INGREDIENT_LIBRARY.ingredients.some((i) => i.id === id) ? libraryName(id, INGREDIENT_LIBRARY) : id);

/**
 * The selected-mode formulate input that reproduces a studio snapshot. The
 * same programme_id, ingredients and constraints work for the diagnostics
 * tools. Studio always formulates on metabolizable energy.
 */
export function snapshotToolInputs(snapshot: Snapshot): Required<Omit<FormulateInput, "constraints">> & { constraints: Record<string, IngredientConstraintInput> } {
  const ingredients: string[] = [];
  const constraints: Record<string, IngredientConstraintInput> = {};
  for (const [id, entry] of Object.entries(snapshot.pool)) {
    if (entry.role === "excluded") continue;
    ingredients.push(id);
    const constraint: IngredientConstraintInput = {};
    const price = num(entry.price);
    if (price !== undefined) constraint.price_per_tonne = price;
    // The FeedSport premix is fixed by the engine and refuses request limits.
    if (id !== PUBLIC_PREMIX_ID) {
      if (entry.role === "fixed") {
        const fixed = num(entry.fixed) ?? 0;
        constraint.min_percent = fixed;
        constraint.max_percent = fixed;
      } else {
        const min = entry.role === "required" ? num(entry.min) : undefined;
        const max = num(entry.max);
        if (min) constraint.min_percent = min;
        if (max !== undefined) constraint.max_percent = max;
      }
    }
    if (Object.keys(constraint).length) constraints[id] = constraint;
  }
  return {
    programme_id: snapshotProgrammeId(snapshot),
    energy_system: "ME",
    ingredient_mode: "selected",
    ingredients,
    constraints,
    objective: GOAL_OBJECTIVE[snapshot.goal] ?? "least_cost",
  };
}

function describePool(snapshot: Snapshot) {
  return Object.entries(snapshot.pool).map(([id, entry]) => ({
    ingredient: id,
    name: ingredientName(id),
    role: entry.role,
    ...(num(entry.price) !== undefined ? { price_per_tonne: num(entry.price) } : { price_per_tonne: "FeedSport planning price" }),
    ...(entry.role === "required" && num(entry.min) ? { min_percent: num(entry.min) } : {}),
    ...(entry.role !== "fixed" && num(entry.max) !== undefined ? { max_percent: num(entry.max) } : {}),
    ...(entry.role === "fixed" ? { fixed_percent: num(entry.fixed) ?? 0 } : {}),
  }));
}

function describeSummary(summary: Summary) {
  return {
    status: summary.status,
    ...(summary.costT != null ? { cost_per_tonne: round(summary.costT, 2) } : {}),
    ...(summary.recipe
      ? { recipe: summary.recipe.map((line) => ({ ingredient: line.id, name: ingredientName(line.id), percentage: round(line.pct, 3) })) }
      : {}),
    ...(summary.req != null ? { requirements_met: `${summary.met ?? 0} of ${summary.req}` } : {}),
    ...(summary.adv ? { advisories: summary.adv } : {}),
  };
}

function describeAdvice(advice: StoredAdvice) {
  return {
    id: advice.id,
    version: advice.version,
    author: advice.author,
    advice: advice.body,
    created_at: advice.createdAt,
    ...(advice.suggestedSnapshot ? { suggested_tool_inputs: snapshotToolInputs(advice.suggestedSnapshot) } : {}),
  };
}

function describeOwner(user: StoredUser | undefined, ownerId: string): { id: string; email?: string; name?: string; organisation?: string } {
  return user
    ? { id: user.id, email: user.email, ...(user.name ? { name: user.name } : {}), ...(user.organisation ? { organisation: user.organisation } : {}) }
    : { id: ownerId };
}

// ---------------------------------------------------------------------------
// Tools

function matchesUser(user: StoredUser, query: string) {
  const q = query.trim().toLowerCase();
  return user.id === query.trim() || [user.email, user.name, user.organisation].some((value) => value?.toLowerCase().includes(q));
}

export async function listUsersTool(input: { query?: string }, store: FormulationStore) {
  const [users, formulations] = await Promise.all([store.listUsers(), store.listFormulations()]);
  const matched = input.query ? users.filter((user) => matchesUser(user, input.query!)) : users;
  return {
    users: matched.map((user) => {
      const own = formulations.filter((f) => f.ownerId === user.id);
      return {
        ...describeOwner(user, user.id),
        ...(user.role ? { role: user.role } : {}),
        signed_up: user.createdAt,
        ...(user.lastSignInAt ? { last_sign_in: user.lastSignInAt } : {}),
        formulation_count: own.length,
        ...(own[0] ? { last_saved: own[0].updatedAt } : {}),
      };
    }),
  };
}

export type ListFormulationsInput = {
  user?: string;
  query?: string;
  programme_id?: string;
  limit?: number;
};

export async function listSavedFormulationsTool(input: ListFormulationsInput, store: FormulationStore) {
  const [users, formulations] = await Promise.all([store.listUsers(), store.listFormulations()]);
  const usersById = new Map(users.map((user) => [user.id, user]));
  let owners: Set<string> | null = null;
  if (input.user) {
    owners = new Set(users.filter((user) => matchesUser(user, input.user!)).map((user) => user.id));
    if (!owners.size) throw new FeedSportInputError(`No user matches "${input.user}". Call list_users to see who has signed up.`);
  }
  const q = input.query?.trim().toLowerCase();
  const programme = input.programme_id?.trim();
  const rows = formulations
    .filter((f) => f.versions.length > 0)
    .filter((f) => !owners || owners.has(f.ownerId))
    .filter((f) => !q || f.name.toLowerCase().includes(q))
    .filter((f) => {
      if (!programme) return true;
      const id = snapshotProgrammeId(f.versions[f.versions.length - 1].snapshot);
      return id === programme || id.startsWith(`${programme}:`);
    });
  const limit = input.limit ?? 50;
  return {
    total: rows.length,
    formulations: rows.slice(0, limit).map((f) => {
      const latest = f.versions[f.versions.length - 1];
      return {
        id: f.id,
        name: f.name,
        owner: describeOwner(usersById.get(f.ownerId), f.ownerId),
        updated_at: f.updatedAt,
        latest_version: latest.version,
        programme_id: snapshotProgrammeId(latest.snapshot),
        programme: programmeName(latest.snapshot),
        status: latest.summary.status,
        ...(latest.summary.costT != null ? { cost_per_tonne: round(latest.summary.costT, 2) } : {}),
        advice_count: f.advice.length,
      };
    }),
  };
}

async function requireFormulation(id: string, store: FormulationStore) {
  const formulation = await store.getFormulation(id);
  if (!formulation || !formulation.versions.length) {
    throw new FeedSportInputError(`No saved formulation "${id}". Call list_saved_formulations to find formulation ids.`);
  }
  return formulation;
}

function pickVersion(formulation: StoredFormulation, version?: number) {
  if (version === undefined) return formulation.versions[formulation.versions.length - 1];
  const found = formulation.versions.find((v) => v.version === version);
  if (!found) {
    throw new FeedSportInputError(
      `"${formulation.name}" has no version ${version}. Versions: ${formulation.versions.map((v) => v.version).join(", ")}.`,
    );
  }
  return found;
}

export async function getSavedFormulationTool(input: { formulation_id: string; version?: number }, store: FormulationStore) {
  const formulation = await requireFormulation(input.formulation_id, store);
  const chosen = pickVersion(formulation, input.version);
  const owner = (await store.listUsers()).find((user) => user.id === formulation.ownerId);
  const { snapshot } = chosen;
  return {
    id: formulation.id,
    name: formulation.name,
    owner: describeOwner(owner, formulation.ownerId),
    created_at: formulation.createdAt,
    updated_at: formulation.updatedAt,
    versions: formulation.versions.map((v) => ({
      version: v.version,
      saved_at: v.createdAt,
      status: v.summary.status,
      ...(v.summary.costT != null ? { cost_per_tonne: round(v.summary.costT, 2) } : {}),
    })),
    version: {
      version: chosen.version,
      saved_at: chosen.createdAt,
      programme_id: snapshotProgrammeId(snapshot),
      programme: programmeName(snapshot),
      goal: snapshot.goal,
      batch_kg: snapshot.batch,
      ingredient_pool: describePool(snapshot),
      saved_result: describeSummary(chosen.summary),
    },
    tool_inputs: snapshotToolInputs(snapshot),
    ...(chosen.summary.recipe?.length
      ? {
          analyse_formulation_input: {
            programme_id: snapshotProgrammeId(snapshot),
            energy_system: "ME",
            recipe: chosen.summary.recipe.map((line) => ({ ingredient: line.id, percentage: round(line.pct, 4) })),
          },
        }
      : {}),
    advice: formulation.advice.map(describeAdvice),
  };
}

export type SuggestionChange = {
  ingredient: string;
  remove?: boolean;
  role?: Exclude<Role, "excluded"> | "excluded";
  price_per_tonne?: number | null;
  min_percent?: number | null;
  max_percent?: number | null;
  fixed_percent?: number | null;
};

export type SuggestionInput = {
  programme_id?: string;
  objective?: FormulationObjective;
  batch_kg?: number;
  changes?: SuggestionChange[];
};

/** Applies a nutritionist's changes to a saved snapshot, producing the snapshot the user can open. */
export function applySuggestion(base: Snapshot, suggestion: SuggestionInput): Snapshot {
  const next: Snapshot = { ...base, pool: Object.fromEntries(Object.entries(base.pool).map(([id, entry]) => [id, { ...entry }])) };
  if (suggestion.programme_id) {
    const { programme, phase } = resolvePhase(suggestion.programme_id);
    next.programmeId = programme.id;
    next.phaseId = phase.id;
  }
  if (suggestion.objective) next.goal = OBJECTIVE_GOAL[suggestion.objective];
  if (suggestion.batch_kg) next.batch = suggestion.batch_kg;
  for (const change of suggestion.changes ?? []) {
    const id = next.pool[change.ingredient] ? change.ingredient : resolveRequestedIngredient(change.ingredient, INGREDIENT_LIBRARY);
    if (change.remove) {
      delete next.pool[id];
      continue;
    }
    const entry: PoolEntry = next.pool[id] ?? { role: "available" };
    if (change.role) entry.role = change.role;
    if (change.price_per_tonne !== undefined) entry.price = change.price_per_tonne;
    if (change.min_percent !== undefined) entry.min = change.min_percent;
    if (change.max_percent !== undefined) entry.max = change.max_percent;
    if (change.fixed_percent !== undefined) {
      entry.fixed = change.fixed_percent;
      if (!change.role && change.fixed_percent != null) entry.role = "fixed";
    }
    if (entry.role === "required" && num(entry.min) === undefined) {
      throw new FeedSportInputError(`${ingredientName(id)} is required but has no min_percent.`);
    }
    if (entry.role === "fixed" && num(entry.fixed) === undefined) {
      throw new FeedSportInputError(`${ingredientName(id)} is fixed but has no fixed_percent.`);
    }
    next.pool[id] = entry;
  }
  return next;
}

export type AddAdviceInput = {
  formulation_id: string;
  version?: number;
  author: string;
  advice: string;
  suggestion?: SuggestionInput;
  dry_run?: boolean;
};

export async function addFormulationAdviceTool(input: AddAdviceInput, store: FormulationStore, context: () => Promise<FeedSportServiceContext>) {
  const formulation = await requireFormulation(input.formulation_id, store);
  const base = pickVersion(formulation, input.version);
  const suggestedSnapshot = input.suggestion ? applySuggestion(base.snapshot, input.suggestion) : null;

  // Formulate the suggestion so the nutritionist sees what the user will get.
  let suggestionCheck: Record<string, unknown> | undefined;
  if (suggestedSnapshot) {
    const result = await formulate(snapshotToolInputs(suggestedSnapshot), await context());
    suggestionCheck =
      result.status === "optimal"
        ? {
            status: result.status,
            cost_per_tonne: result.cost_per_tonne,
            ...(base.summary.costT != null ? { saved_cost_per_tonne: round(base.summary.costT, 2) } : {}),
            recipe: result.ingredients,
            nutritional_validation: result.nutritional_validation,
          }
        : { ...result };
  }

  const advice: NewAdvice = {
    formulationId: formulation.id,
    version: input.version ?? base.version,
    author: input.author.trim(),
    body: input.advice.trim(),
    suggestedSnapshot,
  };
  if (input.dry_run) {
    return { status: "preview", saved: false, formulation: formulation.name, version: advice.version, ...(suggestedSnapshot ? { suggested_tool_inputs: snapshotToolInputs(suggestedSnapshot), suggestion_check: suggestionCheck } : {}) };
  }
  const saved = await store.addAdvice(advice);
  return {
    status: "saved",
    saved: true,
    formulation: formulation.name,
    advice: describeAdvice(saved),
    ...(suggestionCheck ? { suggestion_check: suggestionCheck } : {}),
    note: "The user sees this note on the formulation in FeedSport Studio" + (suggestedSnapshot ? " and can open the suggested revision there." : "."),
  };
}

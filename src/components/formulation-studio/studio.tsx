"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type FormEvent, type KeyboardEvent, type RefObject } from "react";

import { saveContactInquiry } from "@/app/actions";
import { useAuth } from "@/context/AuthContext";
import type { IngredientList, IngredientListItemRuleInput } from "@/lib/ingredient-lists";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured, supabaseKey, supabaseUrl } from "@/lib/supabase/config";
import type { CatalogueIngredient, CatalogueNutrientId } from "@/lib/studio-catalogue";
import type { StudioNutrientData } from "@/lib/studio-nutrients";
import type { StudioProgrammeData } from "@/lib/studio-programmes";
import { poolWithProgrammePremix } from "@/lib/studio-commercial-premix";

import {
  evaluateManual,
  fmt,
  formulate,
  fsLimit,
  guideline,
  phaseOf,
  poolEntryFromListItem,
  priceOf,
  type EngineContext,
  type FormulateResult,
  type GoalKey,
  type ManualCheck,
  type NutrientResult,
  type OptimalResult,
  type Pool,
  type PoolEntry,
  type Role,
  type SavedDoc,
  type Snapshot,
  type Summary,
} from "./engine";
import type { FeaturedFormulation } from "./featured";
import { useFormulations } from "./use-formulations";
import { MAX_LIST_LABEL, useMyLists, type MyLists } from "./use-my-lists";
import { StudioView } from "./views";

// FeedSport formulation studio, built from design/FeedSport Prototype.html.
// useStudio() holds the screen state and derives everything the views render.
// Formulation runs on FeedSport's engine (see engine.ts) against the real
// programmes and ingredient catalogue; ingredient lists and saved formulations
// are stored per user in Supabase.

// Sign-in is Supabase: email and password or Google. The prototype kept its
// pretend account under this key, and its sample data under the others; all
// are cleared on load.
const LEGACY_KEYS = ["fs-studio-auth-v1", "fs-studio-saved-v1", "fs-studio-sets-v1"];

const GOALS: Record<GoalKey, { label: string; desc: string }> = {
  least_cost: { label: "Least cost", desc: "Cheapest recipe that meets every requirement and limit." },
  simpler: { label: "Simpler recipe", desc: "Fewest ingredients while staying within 3% of least cost. Usually costs a little more." },
  less_sbm: { label: "Less soybean meal", desc: "Least soybean meal while staying within 3% of least cost. Usually costs a little more." },
  local: { label: "Fewer imports", desc: "Prefers locally available ingredients over imports while staying within 3% of least cost." },
};
const ROLE: Record<Role, string> = { available: "Available", required: "Required", fixed: "Fixed", excluded: "Excluded" };
const CHIP: Record<Role, { bg: string; fg: string; bd: string; deco: string }> = {
  available: { bg: "#eef3ee", fg: "#1f3e2b", bd: "#eef3ee", deco: "none" },
  required: { bg: "#2f5a3f", fg: "#ffffff", bd: "#2f5a3f", deco: "none" },
  fixed: { bg: "#222420", fg: "#faf8f3", bd: "#222420", deco: "none" },
  excluded: { bg: "#ffffff", fg: "#64665c", bd: "#b9b6ab", deco: "line-through" },
};
export interface StatusMark {
  label: string;
  color: string;
  bg: string;
  r: string;
  rot: string;
}
const ST: Record<"met" | "below" | "above" | "adv" | "none", StatusMark> = {
  met: { label: "Met", color: "#2b6a42", bg: "#2f7a4a", r: "50%", rot: "0deg" },
  below: { label: "Below min", color: "#a63d2a", bg: "#b2412e", r: "0", rot: "0deg" },
  above: { label: "Above max", color: "#a63d2a", bg: "#b2412e", r: "0", rot: "0deg" },
  adv: { label: "Advisory", color: "#8a5f18", bg: "#c98a1e", r: "0", rot: "45deg" },
  none: { label: "Not formulated", color: "#64665c", bg: "#d0cdc3", r: "50%", rot: "0deg" },
};

type Screen = "home" | "setup" | "workspace" | "list" | "compare" | "ingredients" | "programmes" | "nutrients" | "catalogue" | AuthScreen;
type AuthScreen = "signin" | "signup" | "forgot" | "reset";
/** Screens drawn in the full-page auth layout, without the sidebar. */
const isAuthScreen = (screen: Screen): screen is AuthScreen => screen === "signin" || screen === "signup" || screen === "forgot" || screen === "reset";
/** Screens for visitors who aren't signed in. "reset" is the opposite: it needs the session a reset link creates. */
const isSignedOutScreen = (screen: Screen) => screen === "signin" || screen === "signup" || screen === "forgot";

type Role3 = "farmer" | "nutritionist" | "manufacturer";
const ROLES: [Role3, string, string][] = [
  ["farmer", "Farmer", "I mix feed for my own animals"],
  ["nutritionist", "Nutritionist", "I formulate for clients or a company"],
  ["manufacturer", "Feed manufacturer", "I produce feed at a mill"],
];
interface Account {
  id: string;
  name: string;
  email: string;
  role: Role3;
  org?: string;
}

type SessionUser = NonNullable<ReturnType<typeof useAuth>["user"]>;
const accountFromSession = (user: SessionUser): Account => {
  const email = user.email ?? "";
  const role = ROLES.find((r) => r[0] === user.role)?.[0] ?? "farmer";
  return { id: user.uid, name: user.displayName || email.split("@")[0].replace(/[._]/g, " ") || "FeedSport user", email, role, ...(user.org ? { org: user.org } : {}) };
};
const sameAccount = (a: Account | null, b: Account | null) => JSON.stringify(a) === JSON.stringify(b);

// Supabase's messages are written for developers; these are for farmers.
function authMessage(error: { message: string; code?: string }): string {
  const m = error.message.toLowerCase();
  if (error.code === "invalid_credentials" || m.includes("invalid login credentials")) return "That email and password don’t match. Check them or reset your password.";
  if (error.code === "email_not_confirmed" || m.includes("email not confirmed")) return "Confirm your email first. Open the link we sent you, then sign in.";
  if (error.code === "user_already_exists" || m.includes("already registered")) return "An account with this email already exists. Sign in instead.";
  if (error.code === "same_password") return "Choose a password you haven’t used before.";
  if (error.code === "weak_password" || m.includes("password")) return error.message;
  if (error.code === "over_email_send_rate_limit" || m.includes("rate limit") || m.includes("security purposes")) return "Too many emails sent just now. Wait a minute and try again.";
  if (m.includes("fetch")) return "Couldn’t reach the sign-in service. Check your connection and try again.";
  return error.message;
}

// "TENDAI MOYO", "tendai moyo" -> "Tendai Moyo"; hyphens and apostrophes start
// a new capital too ("anne-marie o'brien" -> "Anne-Marie O'Brien").
const titleCase = (name: string) =>
  name
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/(^|[\s\-'’])(\p{L})/gu, (_, before: string, letter: string) => before + letter.toUpperCase());

const GOOGLE_ERROR = "Google sign-in didn’t finish. Try again, or use your email and password.";
// /auth/callback sends ?error=link when a Google return or an emailed link fails.
const LINK_ERROR = "That sign-in didn’t finish. Links work once, on the device that asked for them, and expire after a while. Try again.";
interface AuthForm {
  email: string;
  password: string;
  name: string;
  org: string;
  role: Role3;
}
type Tab = "recipe" | "nutrients" | "why" | "history";
type InputEvent = ChangeEvent<HTMLInputElement | HTMLSelectElement>;
type KeyEvent = KeyboardEvent<HTMLInputElement>;
type Species = "swine" | "broiler";

interface Draft {
  id: string;
  /** Present when editing a reusable "My ingredients" rule instead of a formulation pool entry. */
  listId?: string;
  listRole?: Role;
  min: string;
  max: string;
  price: string;
  unit: "t" | "kg";
}
interface RunEntry {
  t: Date;
  status: FormulateResult["status"];
  cost?: number;
  goal: GoalKey;
  n: number;
}
interface Suggestion {
  /** programmeId|phaseId the suggestion is for. */
  key: string;
  status: "loading" | "ready" | "error";
  ids: string[];
}

interface CompletionSuggestion {
  /** Programme, phase and exact active pool this check belongs to. */
  key: string;
  status: "loading" | "ready" | "complete" | "blocked" | "error";
  ids: string[];
  projectedInclusionPct: Record<string, number>;
  setAsideIds: string[];
  message?: string;
}

interface State {
  w: number;
  screen: Screen;
  step: number;
  species: Species;
  programmeId: string;
  phaseId: string;
  /** Guided setup's ingredient source: one of your lists, FeedSport's suggestion, or none yet. */
  setKey: "list" | "system" | "none";
  /** Which of your lists the guided setup uses. */
  setupListId: string | null;
  pool: Pool;
  goal: GoalKey;
  batch: number;
  batchMode: string;
  customBatch: string;
  unit: "t" | "kg";
  docName: string;
  docId: string | null;
  /** A formulation link opened before saved formulations finished loading. */
  pendingDoc: string | null;
  pendingCmp: string[] | null;
  result: FormulateResult | null;
  runSig: string | null;
  runSnap: Snapshot | null;
  running: boolean;
  /** Bumped to start a run; a finished run only lands if no newer one started. */
  runToken: number;
  tab: Tab;
  drawer: Draft | null;
  advisoriesOpen: boolean;
  addOpen: boolean;
  addQ: string;
  /** Catalogue ids ticked in the add-ingredient picker, in the order ticked. */
  addPick: string[];
  mode: "optimised" | "manual";
  manual: Record<string, string>;
  manualCheck: (ManualCheck & { sig: string }) | null;
  rulesOpen: boolean;
  history: RunEntry[];
  sel: string[];
  cmp: string[] | null;
  toast: string | null;
  dismissed: Record<string, boolean>;
  savedSig: string | null;
  saving: boolean;
  exporting: boolean;
  suggestion: Suggestion | null;
  /** Search box on the guided setup's ingredient step. */
  ingQ: string;
  completionSuggestion: CompletionSuggestion | null;
  catQ: string;
  catSel: string | null;
  catPage: number;
  catPageSize: number;
  /** Programme shown on /studio/programmes; null shows the default one. */
  progSel: string | null;
  /** Phase within it; null is the first phase. */
  progPhase: string | null;
  progAllLimits: boolean;
  addTarget: "pool" | "set";
  auth: Account | null;
  /** Studio URL to return to after signing in. */
  authNext: string | null;
  af: AuthForm;
  aShow: boolean;
  aErr: Partial<Record<keyof AuthForm | "form", string>>;
  aBusy: boolean;
  /** Waiting to hand over to Google. */
  aGoogleBusy: boolean;
  /** A link was emailed: show "Check your email" for a reset or a sign-up confirmation. */
  aSent: "reset" | "confirm" | null;
  /** List shown on /studio/ingredients/<id>; null shows the default (first). */
  myListSel: string | null;
  /** Name being typed while renaming the current list; null when not renaming. */
  listRename: string | null;
  /** Name being typed for a new list; null when not creating one. */
  listCreate: string | null;
  /** Top bar search: query, results open, highlighted result. */
  sq: string;
  sOpen: boolean;
  sIdx: number;
  /** Account menu open. */
  uOpen: boolean;
  /** Notifications (advice from FeedSport) menu open. */
  nOpen: boolean;
  featFilter: "all" | Species;
  /** "Talk to a nutritionist" request. */
  cOpen: boolean;
  cTopic: ContactTopic;
  cPhone: string;
  cMsg: string;
  cAttach: boolean;
  cBusy: boolean;
  cSent: boolean;
  cErr: string;
}

type ContactTopic = "review" | "infeasible" | "ingredients" | "other";
const CONTACT_TOPICS: [ContactTopic, string][] = [
  ["review", "Review my formulation"],
  ["infeasible", "I can’t get a valid recipe"],
  ["ingredients", "Advice on ingredients or prices"],
  ["other", "Something else"],
];
const SITE_PHONE = "263774684534";

export interface StudioProps {
  /** Real ingredient catalogue, loaded on the server. */
  catalogue: CatalogueIngredient[];
  /** Real nutrient reference data, built on the server. */
  nutrients: StudioNutrientData;
  /** Real feeding programmes, built on the server. */
  programmes: StudioProgrammeData;
  /** Published featured formulations, loaded on the server. */
  featured: FeaturedFormulation[];
  showSolverDetails?: boolean;
}

// ---- ingredient catalogue ----
export const CAT_PAGE_SIZES = [10, 25, 50];
const CAT_DEFAULT_PAGE_SIZE = CAT_PAGE_SIZES[0];
const CAT_NUTRIENTS: { id: CatalogueNutrientId; name: string; short: string; unit: string; dp: number }[] = [
  { id: "mePig", name: "ME, pig", short: "ME pig", unit: "kcal/kg", dp: 0 },
  { id: "mePoultry", name: "ME, poultry", short: "ME poultry", unit: "kcal/kg", dp: 0 },
  { id: "cp", name: "Crude protein", short: "Crude protein", unit: "%", dp: 1 },
  { id: "lys", name: "SID lysine", short: "SID lysine", unit: "%", dp: 2 },
  { id: "mc", name: "SID Met+Cys", short: "SID Met+Cys", unit: "%", dp: 2 },
  { id: "thr", name: "SID threonine", short: "SID threonine", unit: "%", dp: 2 },
  { id: "ca", name: "Calcium", short: "Calcium", unit: "%", dp: 2 },
  { id: "ap", name: "Available phosphorus", short: "Avail. phosphorus", unit: "%", dp: 2 },
  { id: "na", name: "Sodium", short: "Sodium", unit: "%", dp: 2 },
  { id: "cf", name: "Crude fibre", short: "Crude fibre", unit: "%", dp: 1 },
];
// Requirement ids the catalogue carries a value for, to explain an ingredient's place in a recipe.
const REQUIREMENT_CATALOGUE_VALUE: Record<string, (species: Species) => CatalogueNutrientId> = {
  "energy-me": (species) => (species === "broiler" ? "mePoultry" : "mePig"),
  "crude-protein": () => "cp",
  "sid-lysine": () => "lys",
  "sid-met-cys": () => "mc",
  "sid-threonine": () => "thr",
  calcium: () => "ca",
  "available-phosphorus": () => "ap",
  sodium: () => "na",
};

const currentList = (S: State, my: MyLists) => my.lists.find((l) => l.id === S.myListSel) ?? my.lists[0] ?? null;

function catalogueMatches(catalogue: CatalogueIngredient[], q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return catalogue;
  return catalogue.filter((g) => [g.name, g.id, g.category, ...g.aliases].join(" ").toLowerCase().includes(needle));
}

const catPageCount = (catalogue: CatalogueIngredient[], S: Pick<State, "catQ" | "catPageSize">) => Math.max(1, Math.ceil(catalogueMatches(catalogue, S.catQ).length / S.catPageSize));

// ---- routes ----
// Every screen has a URL under /studio. State stays the source of truth while
// the studio is mounted; the URL follows it, and back/forward or a direct
// visit maps the URL back onto state via enterRoute().

const BASE = "/studio";
const SIMPLE_ROUTES: [Screen, string][] = [
  ["home", ""],
  ["setup", "/new"],
  ["list", "/formulations"],
  ["nutrients", "/nutrients"],
  ["catalogue", "/catalogue"],
  ["signup", "/signup"],
  ["forgot", "/forgot-password"],
  ["reset", "/reset-password"],
];
const AUTH_PATHS = [BASE + "/login", BASE + "/signup", BASE + "/forgot-password", BASE + "/reset-password"];

// Only same-studio paths are followed after sign-in, never another site.
// Sign-in can also be on behalf of the OAuth consent page, which lives outside the studio.
const OAUTH_CONSENT = "/oauth/consent?";
const safeNext = (next: string | null) => (next && (next.startsWith(BASE) || next.startsWith(OAUTH_CONSENT)) && !next.startsWith("//") ? next : null);

interface Route {
  screen: Screen;
  docId?: string;
  cmp?: string[];
  cat?: { q: string; page: number; size: number };
  prog?: { id: string | null; phase: string | null };
  listId?: string | null;
  next?: string | null;
  /** Set when an OAuth sign-in bounced back with an error. */
  error?: string | null;
}

function urlFor(S: State) {
  if (S.screen === "workspace") {
    const id = S.docId ?? S.pendingDoc;
    return BASE + (id ? "/formulations/" + encodeURIComponent(id) : "/workspace");
  }
  if (S.screen === "compare") {
    const cmp = S.cmp ?? S.pendingCmp;
    return BASE + "/formulations/compare" + (cmp ? "?" + new URLSearchParams({ a: cmp[0], b: cmp[1] }) : "");
  }
  if (S.screen === "catalogue") {
    // Defaults stay out of the URL: /studio/catalogue is page 1, 10 per page, no search.
    const params = new URLSearchParams();
    if (S.catQ) params.set("q", S.catQ);
    if (S.catPage > 1) params.set("page", String(S.catPage));
    if (S.catPageSize !== CAT_DEFAULT_PAGE_SIZE) params.set("per", String(S.catPageSize));
    const query = params.toString();
    return BASE + "/catalogue" + (query ? "?" + query : "");
  }
  if (S.screen === "signin") return BASE + "/login" + (S.authNext ? "?" + new URLSearchParams({ next: S.authNext }) : "");
  if (S.screen === "ingredients") return BASE + "/ingredients" + (S.myListSel ? "/" + encodeURIComponent(S.myListSel) : "");
  if (S.screen === "programmes") return BASE + "/programmes" + (S.progSel ? "/" + encodeURIComponent(S.progSel) + (S.progPhase ? "/phases/" + encodeURIComponent(S.progPhase) : "") : "");
  return BASE + SIMPLE_ROUTES.find(([k]) => k === S.screen)![1];
}

function parseRoute(pathname: string, params: URLSearchParams): Route | null {
  if (pathname !== BASE && !pathname.startsWith(BASE + "/")) return null;
  const rest = pathname.slice(BASE.length).replace(/\/$/, "");
  if (rest === "/catalogue") {
    const page = Math.floor(Number(params.get("page")));
    const size = Number(params.get("per"));
    return { screen: "catalogue", cat: { q: params.get("q") || "", page: page >= 1 ? page : 1, size: CAT_PAGE_SIZES.includes(size) ? size : CAT_DEFAULT_PAGE_SIZE } };
  }
  const list = rest.match(/^\/ingredients(?:\/([^/]+))?$/);
  if (list) return { screen: "ingredients", listId: list[1] ? decodeURIComponent(list[1]) : null };
  const prog = rest.match(/^\/programmes(?:\/([^/]+)(?:\/phases\/([^/]+))?)?$/);
  if (prog) return { screen: "programmes", prog: { id: prog[1] ? decodeURIComponent(prog[1]) : null, phase: prog[2] ? decodeURIComponent(prog[2]) : null } };
  if (rest === "/login") return { screen: "signin", next: safeNext(params.get("next")), error: params.get("error") };
  const simple = SIMPLE_ROUTES.find(([, path]) => path === rest);
  if (simple) return { screen: simple[0] };
  if (rest === "/workspace") return { screen: "workspace" };
  if (rest === "/formulations/compare") return { screen: "compare", cmp: [params.get("a") || "", params.get("b") || ""] };
  const doc = rest.match(/^\/formulations\/([^/]+)$/);
  if (doc) return { screen: "workspace", docId: decodeURIComponent(doc[1]) };
  return null;
}

const DEFAULT_PROGRAMME = "grow-finish-pig";

function defaultProgramme(programmes: StudioProgrammeData) {
  const programme = programmes.programmes.find((p) => p.id === DEFAULT_PROGRAMME) ?? programmes.programmes[0];
  return { programmeId: programme.id, phaseId: programme.phases[0].id, species: programme.species, pool: poolWithProgrammePremix({}, programme.id) };
}

/** A list's ingredients and settings, copied into a formulation. Later edits to the list don't reach it. */
function poolFromList(list: IngredientList | null): Pool {
  const pool: Pool = {};
  for (const item of list?.items ?? []) pool[item.ingredientId] = poolEntryFromListItem(item);
  return pool;
}

const RESET_RESULT: Partial<State> = { result: null, runSig: null, runSnap: null, history: [], mode: "optimised", manual: {}, manualCheck: null, tab: "recipe", dismissed: {}, savedSig: null, drawer: null, advisoriesOpen: false };

function freshDoc(programmeId: string, phaseId: string, species: Species, pool: Pool, docName: string): Partial<State> {
  return { ...RESET_RESULT, programmeId, phaseId, species, pool: poolWithProgrammePremix(pool, programmeId), goal: "least_cost", batch: 100, batchMode: "100", customBatch: "", docName, docId: null, pendingDoc: null };
}

function versionState(doc: SavedDoc, programmes: StudioProgrammeData, v?: number): Partial<State> {
  const ver = doc.versions.find((x) => x.v === v) || doc.versions[doc.versions.length - 1];
  const s = clone(ver.snap);
  const { programme, phase } = phaseOf(programmes, s.programmeId, s.phaseId);
  const batch = s.batch || 100;
  return { ...RESET_RESULT, screen: "workspace", species: programme.species, programmeId: programme.id, phaseId: phase.id, pool: s.pool, goal: s.goal, batch, batchMode: [50, 100, 1000].includes(batch) ? String(batch) : "custom", customBatch: String(batch), docName: doc.name, docId: doc.id, pendingDoc: null, toast: "Reopened v" + ver.v + " · result reproduced from its stored settings" };
}

const guidedStart = (s: State, programmes: StudioProgrammeData): Partial<State> => {
  const { programme, phase } = phaseOf(programmes, s.programmeId, s.phaseId);
  return { ...freshDoc(programme.id, phase.id, programme.species, {}, phase.label), screen: "setup", step: 1, setKey: "none", setupListId: null, ingQ: "" };
};

// What entering a route does to the current state. `run` asks for a
// formulation run; `redirect` replaces a URL that points at nothing.
const AUTH_RESET: Partial<State> = { aErr: {}, aBusy: false, aGoogleBusy: false, aSent: null, drawer: null, advisoriesOpen: false, addOpen: false, rulesOpen: false };

interface RouteContext {
  programmes: StudioProgrammeData;
  /** Saved formulations, or null while they load. */
  docs: SavedDoc[] | null;
}

function enterRoute(s: State, route: Route | null, ctx: RouteContext, url: string): { patch: Partial<State>; run?: boolean; redirect?: string } {
  if (!route) return { patch: {}, redirect: BASE };
  // Everything but the signed-out screens needs an account; come back here afterwards.
  if (!s.auth && route.screen === "reset")
    return { patch: { ...AUTH_RESET, screen: "forgot", aErr: { form: "That reset link has expired or was already used. Ask for a new one below." } } };
  if (!s.auth && !isSignedOutScreen(route.screen)) return { patch: { ...AUTH_RESET, screen: "signin", authNext: url === BASE ? null : url } };
  if (s.auth && isSignedOutScreen(route.screen)) return { patch: {}, redirect: BASE };
  const valid = (key: string) => {
    const [id, v] = key.split(":");
    return !!ctx.docs?.find((d) => d.id === id)?.versions.some((x) => x.v === +v);
  };
  switch (route.screen) {
    case "setup":
      return { patch: s.screen === "setup" ? {} : guidedStart(s, ctx.programmes) };
    case "compare":
      if (!route.cmp || route.cmp.some((k) => !k)) return { patch: {}, redirect: BASE + "/formulations" };
      // Saved formulations are still loading: show the screen and check once they arrive.
      if (!ctx.docs) return { patch: { screen: "compare", cmp: null, pendingCmp: route.cmp, drawer: null } };
      return route.cmp.every(valid) ? { patch: { screen: "compare", cmp: route.cmp, pendingCmp: null, sel: route.cmp, drawer: null } } : { patch: {}, redirect: BASE + "/formulations" };
    case "workspace": {
      if (!route.docId || route.docId === s.docId) return { patch: { screen: "workspace", pendingDoc: null } };
      if (!ctx.docs) return { patch: { ...RESET_RESULT, screen: "workspace", docId: null, pendingDoc: route.docId } };
      const doc = ctx.docs.find((d) => d.id === route.docId);
      return doc ? { patch: versionState(doc, ctx.programmes), run: true } : { patch: { pendingDoc: null }, redirect: BASE + "/formulations" };
    }
    case "programmes": {
      const { id, phase } = route.prog!;
      const programme = id ? ctx.programmes.programmes.find((p) => p.id === id) : null;
      if (id && !programme) return { patch: {}, redirect: BASE + "/programmes" };
      const index = programme && phase ? programme.phases.findIndex((ph) => ph.id === phase) : 0;
      if (index < 0) return { patch: {}, redirect: BASE + "/programmes/" + encodeURIComponent(id!) };
      // The first phase is the programme's own URL, without /phases/….
      const progPhase = index > 0 ? phase : null;
      const same = s.progSel === id && s.progPhase === progPhase;
      return { patch: { screen: "programmes", drawer: null, progSel: id, progPhase, ...(same ? {} : { progAllLimits: false }) } };
    }
    case "signin":
      return { patch: { ...AUTH_RESET, screen: "signin", authNext: route.next ?? null, ...(route.error ? { aErr: { form: route.error === "google" ? GOOGLE_ERROR : LINK_ERROR } } : {}) } };
    case "signup":
    case "forgot":
    case "reset":
      return { patch: { ...AUTH_RESET, screen: route.screen } };
    case "ingredients":
      return { patch: { screen: "ingredients", drawer: null, myListSel: route.listId ?? null, listRename: null } };
    case "catalogue":
      return { patch: { screen: "catalogue", drawer: null, catQ: route.cat!.q, catPage: route.cat!.page, catPageSize: route.cat!.size } };
    default:
      return { patch: { screen: route.screen, drawer: null } };
  }
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const day = 864e5;

const sigOf = (S: State) => JSON.stringify({ programmeId: S.programmeId, phaseId: S.phaseId, pool: S.pool, goal: S.goal });
const snapOf = (S: State): Snapshot => clone({ programmeId: S.programmeId, phaseId: S.phaseId, pool: S.pool, goal: S.goal, batch: S.batch });

/** Typed-in amounts for manual mode, with cost and total worked out here and nutrients from the engine. */
function manualRecipe(S: State, catalogue: Map<string, CatalogueIngredient>) {
  const pct: Record<string, number> = {};
  Object.keys(S.manual).forEach((id) => {
    const v = +S.manual[id];
    if (Number.isFinite(v) && v !== 0) pct[id] = v;
  });
  const cost = Object.keys(pct).reduce((t, id) => t + (pct[id] / 100) * (priceOf(id, S.pool, catalogue) ?? 0), 0);
  return { pct, cost, recipe: Object.keys(pct).map((id) => ({ id, pct: pct[id] })), total: Object.values(pct).reduce((t, v) => t + v, 0), sig: JSON.stringify(pct) };
}
type ManualView = ReturnType<typeof manualRecipe> & {
  nutrients: NutrientResult[];
  incompleteRequirements: ManualCheck["incompleteRequirements"];
  advisories: ManualCheck["advisories"];
  recipeValidity: ManualCheck["recipeValidity"] | null;
  nutrientAdequacy: ManualCheck["nutrientAdequacy"];
  checking: boolean;
};

function summarise(r: FormulateResult, manual: ManualView | null): Summary {
  if (manual) return { status: "manual", costT: manual.cost, recipe: manual.recipe, met: manual.nutrients.filter((n) => n.status === "met").length, req: manual.nutrients.length + manual.incompleteRequirements.length, adv: manual.advisories.length, fail: manual.nutrients.filter((n) => n.status !== "met").length, unknown: manual.incompleteRequirements.length };
  if (r.status !== "optimal") return { status: r.status };
  return { status: "optimal", costT: r.costT, recipe: r.recipe.map((x) => ({ id: x.id, pct: x.pct })), met: r.nutrients.filter((n) => n.status === "met").length, req: r.nutrients.length, adv: r.advisories.length, fail: 0 };
}

function programmeLabel(programmes: StudioProgrammeData, snap: Pick<Snapshot, "programmeId" | "phaseId">) {
  const { programme, phase } = phaseOf(programmes, snap.programmeId, snap.phaseId);
  return programme.name + " · " + phase.label;
}

function diff(a: Snapshot, b: Snapshot, ctx: EngineContext) {
  const out: string[] = [];
  const name = (id: string) => ctx.catalogue.get(id)?.name ?? id;
  if (a.programmeId !== b.programmeId || a.phaseId !== b.phaseId) out.push("Programme: " + programmeLabel(ctx.programmes, a) + " → " + programmeLabel(ctx.programmes, b));
  if (a.goal !== b.goal) out.push("Goal: " + GOALS[a.goal].label + " → " + GOALS[b.goal].label);
  [...new Set([...Object.keys(a.pool), ...Object.keys(b.pool)])].forEach((id) => {
    const x = a.pool[id],
      y = b.pool[id],
      n = name(id);
    if (!x) return void out.push("Added " + n);
    if (!y) return void out.push("Removed " + n);
    if (x.role !== y.role) out.push(n + ": " + ROLE[x.role] + " → " + ROLE[y.role] + (y.role === "fixed" ? " at " + y.fixed + "%" : ""));
    else if (y.role === "fixed" && String(x.fixed) !== String(y.fixed)) out.push(n + " fixed " + x.fixed + "% → " + y.fixed + "%");
    const px = priceOf(id, a.pool, ctx.catalogue),
      py = priceOf(id, b.pool, ctx.catalogue);
    if (px !== py) out.push(n + " price " + money(px, 0) + " → " + money(py, 0) + " / t");
    if ((x.max ?? "") + "" !== (y.max ?? "") + "") out.push(n + " maximum " + (x.max ? x.max + "%" : "none") + " → " + (y.max ? y.max + "%" : "none"));
    if (y.role === "required" && (x.min ?? "") + "" !== (y.min ?? "") + "") out.push(n + " minimum " + (x.min || 0) + "% → " + (y.min || 0) + "%");
  });
  return out;
}

const money = (v: number | null | undefined, dp = 2) => (v == null || isNaN(v) ? "—" : "$" + fmt(v, dp));
const nutVal = (n: { unit: string; dp: number }, v: number) => (n.unit === "%" ? fmt(v, n.dp) + "%" : fmt(v, n.dp) + " " + n.unit);
const roleShort = (e: PoolEntry) => (e.role === "fixed" ? "Fixed " + e.fixed + "%" : e.role === "required" ? "Min " + e.min + "%" + (e.max ? " · max " + e.max + "%" : "") : e.role === "excluded" ? "Excluded" : e.max ? "Max " + e.max + "%" : "Available");

function stOfSum(s: Summary | undefined): StatusMark {
  if (!s) return ST.none;
  if (s.status === "optimal") return s.adv ? { ...ST.adv, label: "Valid · " + s.adv + " advisory" } : { ...ST.met, label: "Meets all" };
  if (s.status === "manual") return s.fail ? { ...ST.below, label: "Manual · " + s.fail + " failing" + (s.unknown ? " · " + s.unknown + " unknown" : "") } : s.unknown ? { ...ST.adv, label: "Manual · " + s.unknown + " unknown" } : { ...ST.met, label: "Manual · meets all" };
  if (s.status === "infeasible") return { ...ST.below, label: "No valid recipe" };
  return { ...ST.below, label: "Can't formulate" };
}

function draftErr(d: Draft, fs: number) {
  const m = d.min === "" ? null : +d.min,
    mx = d.max === "" ? null : +d.max;
  if (d.listRole === "excluded") return null;
  if (d.listRole === "required" && !(m != null && m > 0)) return "A required ingredient needs a minimum above 0%.";
  if (d.listRole === "fixed" && !(m != null && m > 0)) return "A fixed ingredient needs an inclusion above 0%.";
  if (m != null && m < 0) return "Minimum can’t be negative.";
  if (m != null && m > fs) return "Minimum is above the FeedSport limit of " + fs + "% for this stage.";
  if (mx != null && mx <= 0) return "Maximum must be above 0%. Use Remove to keep it out.";
  if (mx != null && m != null && mx < m) return "Maximum is below the minimum.";
  if (mx != null && mx > fs) return "Above the FeedSport limit of " + fs + "%. Leave blank to use the limit.";
  if (d.price !== "" && !(+d.price > 0)) return "Price must be above 0.";
  return null;
}

const INITIAL: State = {
  w: 1400, screen: "home", step: 1, species: "swine", programmeId: DEFAULT_PROGRAMME, phaseId: "", setKey: "none", setupListId: null, pool: {}, goal: "least_cost", batch: 100, batchMode: "100", customBatch: "", unit: "t", docName: "Untitled formulation", docId: null, pendingDoc: null, pendingCmp: null, result: null, runSig: null, runSnap: null, running: false, runToken: 0, tab: "recipe", drawer: null, advisoriesOpen: false, addOpen: false, addQ: "", addPick: [], mode: "optimised", manual: {}, manualCheck: null, rulesOpen: false, history: [], sel: [], cmp: null, toast: null, dismissed: {}, savedSig: null, saving: false, exporting: false, suggestion: null, completionSuggestion: null, ingQ: "", catQ: "", catSel: null, catPage: 1, catPageSize: CAT_DEFAULT_PAGE_SIZE, progSel: null, progPhase: null, progAllLimits: false, addTarget: "pool", auth: null, authNext: null, af: { email: "", password: "", name: "", org: "", role: "farmer" }, aShow: false, aErr: {}, aBusy: false, aGoogleBusy: false, aSent: null, myListSel: null, listRename: null, listCreate: null, sq: "", sOpen: false, sIdx: 0, uOpen: false, nOpen: false, featFilter: "all", cOpen: false, cTopic: "review", cPhone: "", cMsg: "", cAttach: true, cBusy: false, cSent: false, cErr: "",
};

const spinnerStyle = (track: string, head: string): CSSProperties => ({ width: 16, height: 16, borderRadius: "50%", border: "2px solid " + track, borderTopColor: head, display: "inline-block", animation: "fsspin .8s linear infinite", flex: "none" });

function useStudio({ catalogue, nutrients, programmes, featured: featuredList, showSolverDetails = false }: StudioProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const currentUrl = pathname + (query ? "?" + query : "");
  const [S, setS] = useState<State>(() => ({ ...INITIAL, ...defaultProgramme(programmes) }));
  const [ready, setReady] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const update = useCallback((patch: Partial<State> | ((s: State) => Partial<State>)) => setS((s) => ({ ...s, ...(typeof patch === "function" ? patch(s) : patch) })), []);

  const catalogueById = useMemo(() => new Map(catalogue.map((g) => [g.id, g])), [catalogue]);
  const engine: EngineContext = useMemo(() => ({ catalogue: catalogueById, programmes }), [catalogueById, programmes]);

  // After entering a route, swap the address for the canonical one: a redirect
  // for links to nothing, or a cleaned-up URL when parameters were invalid.
  const settleUrl = (from: State, entry: ReturnType<typeof enterRoute>, url: string) => {
    const target = entry.redirect ?? urlFor({ ...from, ...entry.patch });
    if (target !== url) router.replace(target);
  };

  // Starting a run only bumps the token; the effect below solves whatever the
  // state is once that render lands, so a run always sees the latest settings.
  const run = useCallback(() => update((s) => ({ running: true, runToken: s.runToken + 1, drawer: null, advisoriesOpen: false, rulesOpen: false })), [update]);
  useEffect(() => {
    if (!S.running) return;
    const token = S.runToken;
    const snap = snapOf(S);
    const sig = sigOf(S);
    let current = true;
    void formulate(snap, engine).then((r) => {
      if (!current) return;
      const h: RunEntry = { t: new Date(), status: r.status, cost: r.status === "optimal" ? r.costT : undefined, goal: snap.goal, n: r.status === "optimal" ? r.recipe.length : 0 };
      update((s) => (s.runToken !== token ? {} : { running: false, result: r, runSig: sig, runSnap: snap, history: [h, ...s.history].slice(0, 12), mode: "optimised", manual: {}, manualCheck: null, dismissed: {} }));
    });
    return () => {
      current = false;
    };
    // Only a new run token starts a solve.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [S.runToken]);

  const flash = useCallback((msg: string) => update({ toast: msg }), [update]);

  // The Supabase session loads from its cookie on mount; the studio waits for
  // it so a signed-in visitor isn't bounced to sign-in.
  const { user: sessionUser, loading: sessionLoading } = useAuth();
  const started = useRef(false);
  const formulations = useFormulations(S.auth?.id ?? null);
  const docs = formulations.status === "ready" ? formulations.docs : null;

  useEffect(() => {
    if (sessionLoading || started.current) return;
    started.current = true;
    const onResize = () => update({ w: window.innerWidth });
    window.addEventListener("resize", onResize);
    onResize();
    try {
      LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
    } catch {
      // Nothing stored to clear.
    }
    const auth = sessionUser ? accountFromSession(sessionUser) : null;
    const url = window.location.pathname + window.location.search;
    // Land straight on the screen the URL names, so a direct visit never flashes Home.
    const base = { ...S, auth };
    const entry = enterRoute(base, parseRoute(window.location.pathname, new URLSearchParams(window.location.search)), { programmes, docs: null }, url);
    update({ auth, ...entry.patch });
    setReady(true);
    if (entry.run) run();
    settleUrl(base, entry, url);
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(toastTimer.current);
    };
    // Runs once, when the session is known; later URL changes are handled by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLoading]);

  // The Supabase session is the account. Signing in (here or in another tab)
  // continues to the page that asked for it; signing out or the session
  // ending returns to sign-in; profile changes are picked up.
  useEffect(() => {
    if (!ready) return;
    const account = sessionUser ? accountFromSession(sessionUser) : null;
    if (account && !S.auth) signedIn(account);
    else if (!account && S.auth) update({ ...AUTH_RESET, auth: null, screen: "signin", authNext: null });
    else if (!sameAccount(account, S.auth)) update({ auth: account });
    // Only a session change should move the account.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, sessionUser]);

  const myLists = useMyLists(S.auth?.id ?? null, flash);

  // A list link that isn't (or is no longer) one of yours shows your first list.
  const unknownList = S.screen === "ingredients" && !!S.myListSel && myLists.status === "ready" && !myLists.lists.some((l) => l.id === S.myListSel);
  useEffect(() => {
    if (!unknownList) return;
    replaceNext.current = true;
    update({ myListSel: null });
  }, [unknownList, update]);

  // A formulation or comparison link opened before saved formulations loaded.
  useEffect(() => {
    if (!docs || (!S.pendingDoc && !S.pendingCmp)) return;
    const route: Route = S.pendingDoc ? { screen: "workspace", docId: S.pendingDoc } : { screen: "compare", cmp: S.pendingCmp! };
    const entry = enterRoute({ ...S, docId: null }, route, { programmes, docs }, currentUrl);
    replaceNext.current = true;
    update({ ...entry.patch, pendingDoc: null, pendingCmp: null });
    if (entry.run) run();
    if (entry.redirect) router.replace(entry.redirect);
    // Only the formulations arriving should resolve a pending link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs]);

  // URL -> state, for back/forward and links into the studio.
  const targetUrl = urlFor(S);
  useEffect(() => {
    if (!ready || targetUrl === currentUrl) return;
    const entry = enterRoute(S, parseRoute(pathname, new URLSearchParams(query)), { programmes, docs }, currentUrl);
    update(entry.patch);
    if (entry.run) run();
    settleUrl(S, entry, currentUrl);
    // Only a URL change should map the URL onto state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, currentUrl]);

  // State -> URL, after in-app navigation. Saving a draft replaces its
  // /studio/workspace entry rather than adding one.
  const lastTarget = useRef<string | null>(null);
  const replaceNext = useRef(false);
  useEffect(() => {
    if (!ready) return;
    const first = lastTarget.current == null;
    if (lastTarget.current === targetUrl) return;
    lastTarget.current = targetUrl;
    if (first || targetUrl === currentUrl) return;
    if (replaceNext.current) router.replace(targetUrl);
    else router.push(targetUrl);
    replaceNext.current = false;
    // Only a state change should move the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, targetUrl]);

  // A catalogue page past the end (say ?page=99, or after a narrower search)
  // snaps to the last page, replacing the URL rather than adding history.
  const lastCatPage = catPageCount(catalogue, S);
  useEffect(() => {
    if (!ready || S.screen !== "catalogue" || S.catPage <= lastCatPage) return;
    replaceNext.current = true;
    update({ catPage: lastCatPage });
  }, [ready, S.screen, S.catPage, lastCatPage, update]);

  // Toasts clear themselves after a few seconds.
  useEffect(() => {
    if (!S.toast) return;
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => update({ toast: null }), 3200);
  }, [S.toast, update]);

  // "/" or Ctrl/Cmd+K jumps to the top bar search from anywhere; Escape closes the account menu.
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") || (e.key === "/" && !typing)) {
        if (!searchRef.current) return;
        e.preventDefault();
        searchRef.current.focus();
        update({ sOpen: true, uOpen: false, nOpen: false });
      } else if (e.key === "Escape") update((s) => (s.uOpen || s.nOpen ? { uOpen: false, nOpen: false } : {}));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [update]);

  // Featured formulations are formulated once, the first time Home is shown,
  // against the current programmes and planning prices.
  const [featured, setFeatured] = useState<Record<string, FormulateResult> | null>(null);
  const featuredStarted = useRef(false);
  useEffect(() => {
    if (!ready || !S.auth || S.screen !== "home" || featuredStarted.current) return;
    featuredStarted.current = true;
    void Promise.all(featuredList.map((f) => formulate(f.snap, engine))).then((results) => setFeatured(Object.fromEntries(featuredList.map((f, i) => [f.id, results[i]]))));
  }, [ready, S.auth, S.screen, engine, featuredList]);

  // Manual mode: the engine checks typed-in amounts a moment after typing stops.
  const manualSig = S.mode === "manual" ? manualRecipe(S, catalogueById).sig : "";
  useEffect(() => {
    if (S.mode !== "manual") return;
    const t = setTimeout(() => {
      const m = manualRecipe(S, catalogueById);
      evaluateManual(snapOf(S), m.pct, engine)
        .then((check) => update((s) => (s.mode === "manual" ? { manualCheck: { ...check, sig: m.sig } } : {})))
        .catch((error) => flash(error instanceof Error ? error.message : "Couldn’t check this recipe."));
    }, 400);
    return () => clearTimeout(t);
    // The typed amounts (manualSig) and the phase decide what to check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualSig, S.mode, S.phaseId]);

  // The ingredient step starts from your default list when you have one, and
  // from the FeedSport suggestion list otherwise. Only an unpicked source is
  // set, so moving between steps never overrides your own choice.
  const listsKnown = myLists.status === "ready" || myLists.status === "error";
  useEffect(() => {
    if (S.screen !== "setup" || S.step !== 2 || S.setKey !== "none" || !listsKnown) return;
    const list = myLists.lists[0] ?? null; // the default list comes first
    if (list) update({ setKey: "list", setupListId: list.id, pool: poolWithProgrammePremix(poolFromList(list), S.programmeId), ingQ: "" });
    else
      update((s) => {
        const ready = s.suggestion?.status === "ready" && s.suggestion.key === s.programmeId + "|" + s.phaseId ? s.suggestion.ids : [];
        return { setKey: "system", pool: poolWithProgrammePremix(Object.fromEntries(ready.map((id) => [id, { role: "available" as Role }])), s.programmeId), ingQ: "" };
      });
    // The step, the source still being unpicked and the lists arriving decide this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [S.screen, S.step, S.setKey, listsKnown]);

  // Guided setup's FeedSport suggestion list: the engine picks priced
  // ingredients with complete data that can meet the chosen stage.
  const suggestionKey = S.screen === "setup" ? S.programmeId + "|" + S.phaseId : null;
  useEffect(() => {
    if (!suggestionKey || S.suggestion?.key === suggestionKey) return;
    const [programmeId, phaseId] = suggestionKey.split("|");
    update({ suggestion: { key: suggestionKey, status: "loading", ids: [] } });
    fetch("/api/feed-formulation/suggest", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ programmeId, phaseId, energySystem: "ME" }) })
      .then((r) => r.json())
      .then((data: { status: string; ingredientIds?: string[] }) =>
        update((s) => {
          if (s.suggestion?.key !== suggestionKey) return {};
          const ids = data.status === "suggested" && data.ingredientIds ? data.ingredientIds.filter((id) => catalogueById.has(id)) : [];
          const suggestion: Suggestion = { key: suggestionKey, status: data.status === "suggested" ? "ready" : "error", ids };
          // Already showing the suggested list? Refresh it for the new stage.
          return s.setKey === "system" ? { suggestion, pool: poolWithProgrammePremix(Object.fromEntries(ids.map((id) => [id, { role: "available" as Role }])), s.programmeId) } : { suggestion };
        }),
      )
      .catch(() => update((s) => (s.suggestion?.key === suggestionKey ? { suggestion: { key: suggestionKey, status: "error", ids: [] } } : {})));
    // Only a new programme/phase in setup asks again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestionKey]);

  // Unlike the stage-wide suggested list above, this check starts with the
  // user's exact active pool (including their fixed/min/max settings). The API
  // solves a minimum-additions model, so every returned chip belongs to the
  // smallest catalogue set that makes this particular pool feasible.
  const completionIngredients = Object.keys(S.pool)
    .filter((id) => S.pool[id].role !== "excluded")
    .sort()
    .map((ingredientId) => {
      const entry = S.pool[ingredientId];
      const pricePerTonne = priceOf(ingredientId, S.pool, catalogueById);
      const fixed = entry.role === "fixed" ? Number(entry.fixed) : null;
      const minimum = entry.role === "required" ? Number(entry.min) : null;
      const maximum = entry.max != null && entry.max !== "" ? Number(entry.max) : null;
      return {
        ingredientId,
        ...(pricePerTonne != null ? { pricePerKg: pricePerTonne / 1000 } : {}),
        ...(fixed != null && Number.isFinite(fixed)
          ? { minInclusionPct: fixed, maxInclusionPct: fixed }
          : minimum != null && Number.isFinite(minimum)
            ? { minInclusionPct: minimum }
            : {}),
        ...(fixed == null && maximum != null && Number.isFinite(maximum)
          ? { maxInclusionPct: maximum }
          : {}),
      };
    });
  const completionKey =
    S.screen === "setup" &&
    S.step === 2 &&
    S.setKey !== "system" &&
    completionIngredients.length
      ? S.programmeId + "|" + S.phaseId + "|" + JSON.stringify(completionIngredients)
      : null;
  useEffect(() => {
    if (!completionKey) return;
    const controller = new AbortController();
    update({
      completionSuggestion: {
        key: completionKey,
        status: "loading",
        ids: [],
        projectedInclusionPct: {},
        setAsideIds: [],
      },
    });
    fetch("/api/feed-formulation/suggest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        programmeId: S.programmeId,
        phaseId: S.phaseId,
        energySystem: "ME",
        currentIngredients: completionIngredients,
      }),
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then(
        (data: {
          status: string;
          ingredientIds?: string[];
          projectedInclusionPct?: Record<string, number>;
          setAsideIngredientIds?: string[];
          message?: string;
        }) =>
          update((state) => {
            if (state.completionSuggestion?.key !== completionKey) return {};
            const ids = (data.ingredientIds ?? []).filter(
              (id) => catalogueById.has(id) && !state.pool[id],
            );
            const status: CompletionSuggestion["status"] =
              data.status === "suggested"
                ? "ready"
                : data.status === "complete"
                  ? "complete"
                  : data.status === "blocked"
                    ? "blocked"
                    : "error";
            return {
              completionSuggestion: {
                key: completionKey,
                status,
                ids,
                projectedInclusionPct: data.projectedInclusionPct ?? {},
                setAsideIds: data.setAsideIngredientIds ?? [],
                message: data.message,
              },
            };
          }),
      )
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        update((state) =>
          state.completionSuggestion?.key === completionKey
            ? {
                completionSuggestion: {
                  key: completionKey,
                  status: "error",
                  ids: [],
                  projectedInclusionPct: {},
                  setAsideIds: [],
                  message:
                    error instanceof Error
                      ? error.message
                      : "Couldn’t check this ingredient list.",
                },
              }
            : {},
        );
      });
    return () => controller.abort();
    // completionKey serializes every input that changes this feasibility check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completionKey]);

  const { programme: P, phase: PH } = phaseOf(programmes, S.programmeId, S.phaseId);
  const fsMax = (id: string) => fsLimit(engine, PH, id);

  const openDrawer = (id: string) => {
    const e = S.pool[id] || { role: "available" };
    const p = e.price != null && e.price !== "" ? (S.unit === "t" ? +e.price : +e.price / 1000) : null;
    const isF = e.role === "fixed";
    update({ advisoriesOpen: false });
    update({ addOpen: false, drawer: { id, min: isF ? String(e.fixed) : e.role === "required" ? String(e.min ?? "") : "", max: isF ? String(e.fixed) : String(e.max ?? ""), price: p == null ? "" : String(+p.toFixed(4)), unit: S.unit } });
  };
  const applyDraft = (rerun: boolean) => {
    const d = S.drawer;
    const maxAllowed = d?.listId ? 100 : d ? fsMax(d.id) : 100;
    if (!d || draftErr(d, maxAllowed)) return;
    if (d.listId && d.listRole) {
      const mn = d.min === "" ? 0 : +d.min;
      const mx = d.max === "" ? null : +d.max;
      const rule: IngredientListItemRuleInput =
        d.listRole === "fixed"
          ? { role: "fixed", fixedPct: mn }
          : d.listRole === "required"
            ? { role: "required", minPct: mn, maxPct: mx }
            : d.listRole === "available"
              ? { role: "available", maxPct: mx }
              : { role: "excluded" };
      update({ drawer: null });
      void myLists.setRule(d.listId, d.id, rule).then((saved) => {
        if (saved) flash(ingredientName(d.id) + " rule saved to your reusable list");
      });
      return;
    }
    const price = d.price === "" ? undefined : d.unit === "t" ? +d.price : +d.price * 1000;
    const mn = d.min === "" ? 0 : +d.min,
      mx = d.max === "" ? null : +d.max;
    const e: PoolEntry = { role: "available" };
    if (mx != null && mn > 0 && Math.abs(mx - mn) < 1e-9) {
      e.role = "fixed";
      e.fixed = mn;
    } else {
      e.role = mn > 0 ? "required" : "available";
      if (mn > 0) e.min = mn;
      if (mx != null) e.max = mx;
    }
    if (price != null) e.price = Math.round(price * 100) / 100;
    update({ pool: { ...S.pool, [d.id]: e }, drawer: null });
    if (rerun && S.screen === "workspace") run();
  };
  const removeDraft = () => {
    const d = S.drawer;
    if (!d) return;
    if (d.listId) {
      void myLists.removeItem(d.listId, d.id);
      update({ drawer: null });
      flash(ingredientName(d.id) + " removed from this reusable list");
      return;
    }
    update((state) => {
      const pool = { ...state.pool };
      delete pool[d.id];
      return { pool, drawer: null };
    });
    flash(ingredientName(d.id) + " removed from this formulation");
  };
  const ingredientName = (id: string) => catalogueById.get(id)?.name ?? id;
  const addIng = (id: string) => {
    update({ pool: { ...S.pool, [id]: { role: "available" } } });
    flash(ingredientName(id) + " added as Available");
  };
  const toggleAddPick = (id: string) => update((state) => ({ addPick: state.addPick.includes(id) ? state.addPick.filter((x) => x !== id) : [...state.addPick, id] }));
  const addPicked = () => {
    const ids = S.addPick;
    if (!ids.length) return;
    const what = ids.length === 1 ? ingredientName(ids[0]) : ids.length + " ingredients";
    if (S.addTarget === "set") {
      const list = currentList(S, myLists);
      if (!list) return;
      void (async () => {
        for (const id of ids) await myLists.addItem(list.id, id);
      })();
      update({ addOpen: false, addQ: "", addPick: [] });
      flash(what + " added to " + list.label);
      return;
    }
    update((state) => ({ pool: { ...state.pool, ...Object.fromEntries(ids.map((id) => [id, { role: "available" as Role }])) }, addOpen: false, addQ: "", addPick: [] }));
    flash(what + " added as Available");
  };
  const addCompletionIngredients = (ids: string[]) => {
    if (!ids.length) return;
    update((state) => ({
      pool: {
        ...state.pool,
        ...Object.fromEntries(
          ids
            .filter((id) => !state.pool[id])
            .map((id) => [id, { role: "available" as Role }]),
        ),
      },
    }));
    flash(
      ids.length === 1
        ? ingredientName(ids[0]) + " added as Available"
        : ids.length + " recommended ingredients added as Available",
    );
  };
  const openVersion = (docId: string, v: number) => {
    const doc = formulations.docs.find((d) => d.id === docId);
    if (!doc) return;
    update(versionState(doc, programmes, v));
    run();
  };
  /** Opens the version a note is about, with the advisories drawer showing it. */
  const openAdvice = (docId: string, adviceId: string) => {
    const doc = formulations.docs.find((d) => d.id === docId);
    const advice = doc?.advice.find((a) => a.id === adviceId);
    if (!doc || !advice) return;
    const v = doc.versions.some((x) => x.v === advice.v) ? advice.v! : doc.versions[doc.versions.length - 1].v;
    openVersion(docId, v);
    // After openVersion, whose run closes drawers.
    update({ advisoriesOpen: true });
    formulations.markAdviceRead(doc.advice.map((a) => a.id));
  };
  /** Opens a nutritionist's suggested revision as unsaved changes to its formulation. */
  const openSuggestion = (docId: string, adviceId: string) => {
    const doc = formulations.docs.find((d) => d.id === docId);
    const advice = doc?.advice.find((a) => a.id === adviceId);
    if (!doc || !advice?.suggestion) return;
    const base = doc.versions.find((x) => x.v === advice.v) || doc.versions[doc.versions.length - 1];
    update({ ...versionState({ ...doc, versions: [{ ...base, snap: advice.suggestion }] }, programmes), tab: "recipe", toast: "Opened " + advice.author + "’s suggestion · save to keep it as a new version" });
    run();
  };
  /** Opens the workspace with these ingredients for a programme phase; runs straight away when asked. */
  const openWorkspace = (pool: Pool, docName: string, at: { programmeId: string; phaseId: string } = { programmeId: S.programmeId, phaseId: S.phaseId }, runNow = false) => {
    const { programme, phase } = phaseOf(programmes, at.programmeId, at.phaseId);
    update({ ...freshDoc(programme.id, phase.id, programme.species, pool, docName), screen: "workspace" });
    if (runNow) run();
  };

  const stale = !!S.result && S.runSig !== sigOf(S);
  const manualView: ManualView | null =
    S.mode === "manual" && S.result?.status === "optimal"
      ? (() => {
          const m = manualRecipe(S, catalogueById);
          const check = S.manualCheck?.sig === m.sig ? S.manualCheck : null;
          return {
            ...m,
            nutrients: check?.nutrients ?? [],
            incompleteRequirements: check?.incompleteRequirements ?? [],
            advisories: check?.advisories ?? [],
            recipeValidity: check?.recipeValidity ?? null,
            nutrientAdequacy: check?.nutrientAdequacy ?? "not-checked",
            checking: !check,
          };
        })()
      : null;
  const save = async () => {
    if (stale || !S.result || S.running || S.saving) return;
    if (manualView && (manualView.checking || !manualView.recipeValidity?.valid)) return;
    const name = S.docName.trim() || "Untitled formulation";
    update({ saving: true });
    try {
      const saved = await formulations.save(S.docId, name, snapOf(S), summarise(S.result, manualView));
      if (!S.docId) replaceNext.current = true;
      update({ saving: false, docId: saved.id, docName: name, savedSig: sigOf(S) + S.mode + JSON.stringify(S.manual) });
      flash("Saved as v" + saved.version + " · programme, ingredients, prices, limits, goal and result stored");
    } catch (error) {
      console.error("Failed to save formulation:", error);
      update({ saving: false });
      flash("Couldn’t save the formulation. Check your connection and try again.");
    }
  };

  // Signing in lands on the page that asked for it (or Home), via the same
  // route entry a direct visit uses; the sign-in page itself leaves history.
  const signedIn = (auth: Account) => {
    const next = safeNext(S.authNext) ?? BASE;
    if (next.startsWith(OAUTH_CONSENT)) {
      window.location.assign(next);
      return;
    }
    const [path, search = ""] = next.split("?");
    const entry = enterRoute({ ...S, auth }, parseRoute(path, new URLSearchParams(search)), { programmes, docs: null }, next);
    replaceNext.current = true;
    update({ ...entry.patch, auth, aBusy: false, aErr: {}, authNext: null, af: { ...S.af, password: "" } });
    if (entry.run) run();
    if (entry.redirect) router.replace(entry.redirect);
    flash("Signed in as " + auth.email);
  };
  const signOut = () => {
    void createClient().auth.signOut();
    update({ ...AUTH_RESET, ...RESET_RESULT, auth: null, screen: "signin", authNext: null, pool: {}, docId: null, af: { ...S.af, password: "" } });
  };

  // Google sign-in leaves the site: Supabase sends the visitor to Google and
  // back to /auth/callback, which sets the session and returns to `next`.
  const signInWithGoogle = async () => {
    if (S.aBusy) return;
    const fail = (form: string) => update({ aBusy: false, aGoogleBusy: false, aErr: { form } });
    if (!isSupabaseConfigured) return fail("Google sign-in isn’t available right now. Use your email and password.");
    update({ aBusy: true, aGoogleBusy: true, aErr: {} });
    // Supabase answers a disabled provider with a bare JSON error page, so check first.
    try {
      const settings = await fetch(supabaseUrl + "/auth/v1/settings", { headers: { apikey: supabaseKey } }).then((r) => r.json());
      if (!settings?.external?.google) return fail("Google sign-in isn’t switched on for FeedSport yet. Use your email and password for now.");
    } catch {
      return fail("Couldn’t reach the sign-in service. Check your connection and try again.");
    }
    const next = safeNext(S.authNext) ?? BASE;
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/auth/callback?next=" + encodeURIComponent(next) },
    });
    // On success the browser is already on its way to Google.
    if (error) fail(GOOGLE_ERROR);
  };

  // ---- shell ----
  // Auth screens are full-page, without the sidebar; checking the path too
  // keeps the sidebar from flashing before the studio is ready.
  const onAuth = isAuthScreen(S.screen) || AUTH_PATHS.includes(pathname);
  const wide = S.w >= 1000 && !onAuth;
  const narrow = S.w < 1000 && !onAuth;
  const go = (screen: Screen) => () => update({ screen, drawer: null, advisoriesOpen: false });
  const nav = ready
    ? (
        [
          ["home", "Home", ""],
          ["list", "Formulations", formulations.status === "ready" ? String(formulations.docs.length) : ""],
          ["ingredients", "My ingredients", myLists.status === "ready" ? myLists.lists.length + (myLists.lists.length === 1 ? " list" : " lists") : ""],
        ] as [Screen, string, string][]
      ).map(([k, label, count]) => {
        const active = S.screen === k || (k === "list" && (S.screen === "workspace" || S.screen === "compare"));
        return { label, count, bg: active ? "#2b2d29" : "transparent", color: active ? "#faf8f3" : "#d0cdc3", shadow: active ? "inset 2px 0 0 #e3aa45" : "none", barShadow: active ? "inset 0 -2px 0 #e3aa45" : "none", go: go(k) };
      })
    : [];
  const refNav = ready
    ? (
        [
          ["programmes", "Feeding programmes"],
          ["nutrients", "Nutrient data"],
          ["catalogue", "Ingredient catalogue"],
        ] as [Screen, string][]
      ).map(([k, label]) => {
        const active = S.screen === k;
        return { label, count: "", bg: active ? "#2b2d29" : "transparent", color: active ? "#faf8f3" : "#b9b6ab", shadow: active ? "inset 2px 0 0 #e3aa45" : "none", barShadow: active ? "inset 0 -2px 0 #e3aa45" : "none", go: go(k) };
      })
    : [];
  const startGuided = () => update((s) => guidedStart(s, programmes));
  const user = S.auth;
  // WhatsApp opens with a message that names the formulation in front of you, if any.
  const inWs = S.screen === "workspace" && (S.result?.status === "optimal" || S.result?.status === "infeasible");
  const about = inWs ? " for “" + S.docName + "” (" + P.name + " · " + PH.label + ")" : "";
  const topic = CONTACT_TOPICS.find(([k]) => k === S.cTopic)![1].toLowerCase();
  const waMsg = S.cOpen
    ? "Hi FeedSport, I’d like a nutritionist’s help: " + topic + about + "." + (S.cMsg.trim() ? " " + S.cMsg.trim() : "")
    : "Hi FeedSport, I’d like to talk to a nutritionist" + (inWs ? " about my formulation" + about : "") + ".";
  const shell = {
    wide, narrow, nav, refNav, startGuided, goHome: go("home"), signOut,
    userName: user ? titleCase(user.name) : "",
    userInitials: user ? titleCase(user.name).split(" ").map((w) => w[0]).join("").slice(0, 2) : "",
    userRole: user ? (ROLES.find((r) => r[0] === user.role) ?? ROLES[0])[1] : "",
    waHref: "https://wa.me/" + SITE_PHONE + "?text=" + encodeURIComponent(waMsg),
  };
  if (!ready) return { ready: false as const, shell };

  // ---- shared ----
  const guides = PH.limitsKey ? programmes.limits[PH.limitsKey].filter((l) => l.practicalPct != null) : [];
  const nReq = PH.requirements.filter((v) => v != null).length;
  // Guidelines that apply to ingredients in this formulation, not the whole catalogue.
  const prog = { name: P.name + " · " + PH.label, source: P.source, nReq, nGuide: guides.filter((g) => S.pool[g.id] && S.pool[g.id].role !== "excluded").length };
  const poolIds = Object.keys(S.pool);
  const R = S.result;
  const setAside = new Set(R && (R.status === "optimal" || R.status === "infeasible") ? R.setAside : []);
  const isEligible = (id: string) => !setAside.has(id);
  const isUserPrice = (id: string) => !!S.pool[id] && S.pool[id].price != null && S.pool[id].price !== "";
  const priceTxt = (p: number | null) => (p == null ? "No price" : S.unit === "t" ? "$" + fmt(p, 0) + " / t" : "$" + fmt(p / 1000, 3) + " / kg");
  const activeCount = poolIds.filter((id) => S.pool[id].role !== "excluded" && isEligible(id)).length;
  const batchLabel = S.batch >= 1000 ? fmt(S.batch / 1000, S.batch % 1000 ? 2 : 0) + " t" : S.batch + " kg";
  const batchOpts = [
    ["50", "50 kg"],
    ["100", "100 kg"],
    ["1000", "1 t"],
    ["custom", "Custom"],
  ].map(([k, label]) => {
    const on = S.batchMode === k;
    return { label, ring: on ? "inset 0 0 0 1px #2f5a3f" : "none", bg: on ? "#eef3ee" : "#fff", tabBg: on ? "#fff" : "transparent", weight: on ? "600" : "400", pick: () => update({ batchMode: k, batch: k === "custom" ? +S.customBatch || S.batch : +k, customBatch: k === "custom" ? String(S.customBatch || S.batch) : S.customBatch }) };
  });
  const goalOpts = (Object.keys(GOALS) as GoalKey[]).map((k) => {
    const on = S.goal === k;
    return { label: GOALS[k].label, desc: GOALS[k].desc, ring: on ? "inset 0 0 0 1px #2f5a3f" : "none", bg: on ? "#eef3ee" : "#fff", radio: on ? "5px solid #2f5a3f" : "1.5px solid #8d8a80", weight: on ? "600" : "400", pick: () => update({ goal: k }) };
  });
  const programmeChoice = (programmeId: string) => {
    const programme = programmes.programmes.find((p) => p.id === programmeId) ?? P;
    return { programmeId: programme.id, phaseId: programme.phases[0].id,
      species: programme.species, pool: poolWithProgrammePremix(S.pool, programme.id) };
  };

  // ---- setup ----
  // Step 2 lists the chosen ingredients by category: tick what you have, set
  // your price inline, open Limits for min/max/fixed. Searching also offers
  // catalogue ingredients that aren't in the list yet.
  const iq = S.ingQ.trim().toLowerCase();
  const matchesQuery = (g: CatalogueIngredient | undefined, id: string) => !iq || [g?.name ?? id, g?.category ?? "", ...(g?.aliases ?? [])].join(" ").toLowerCase().includes(iq);
  const limitTxt = (e: PoolEntry) => {
    const r = e.role === "excluded" ? e.was ?? "available" : e.role;
    return r === "fixed" ? "Fixed " + e.fixed + "%" : r === "required" ? "Min " + e.min + "%" + (e.max ? ", max " + e.max + "%" : "") : e.max ? "Max " + e.max + "%" : "Any amount";
  };
  const ingRows = poolIds
    .filter((id) => matchesQuery(catalogueById.get(id), id))
    .map((id) => {
      const e = S.pool[id],
        g = catalogueById.get(id),
        on = e.role !== "excluded",
        user = isUserPrice(id);
      const planning = g?.price?.usdPerTonne ?? null;
      const incomplete = !!g && g.expected.some((n) => g.nutrients[n] == null);
      const noPrice = !user && planning == null;
      return {
        id, cat: g?.category ?? "Other", name: g?.name ?? id,
        check: on ? "✓" : "", cbBg: on ? "#2f5a3f" : "#fff", cbBd: on ? "#2f5a3f" : "#b9b6ab", cbLabel: (on ? "Untick " : "Tick ") + (g?.name ?? id), deco: on ? "none" : "line-through", opacity: on ? "1" : "0.55",
        hasNote: noPrice || incomplete,
        note: noPrice ? "No planning price — enter yours" : "Some nutrient data is missing — it may be set aside for this stage",
        noteColor: noPrice ? "#a63d2a" : "#8a5f18",
        price: user ? String(e.price) : "", pricePh: planning != null ? String(Math.round(planning)) : "Required", tag: user ? "YOURS" : planning != null ? "DEFAULT" : "", tagFg: user ? "#8a5f18" : "#8d8a80",
        onPrice: (ev: InputEvent) => {
          const value = ev.target.value;
          update((s) => {
            const cur = { ...s.pool[id] };
            if (value === "") delete cur.price;
            else cur.price = +value;
            return { pool: { ...s.pool, [id]: cur } };
          });
        },
        toggle: () =>
          update((s) => {
            const cur = { ...s.pool[id] };
            if (cur.role === "excluded") {
              cur.role = cur.was ?? "available";
              delete cur.was;
            } else {
              cur.was = cur.role;
              cur.role = "excluded";
            }
            return { pool: { ...s.pool, [id]: cur } };
          }),
        limits: limitTxt(e),
        open: () => openDrawer(id),
      };
    });
  // Catalogue categories in the order a feed is usually built.
  const CAT_ORDER = ["Cereal", "Protein meal", "By-product", "Oil and fat", "Mineral", "Amino acid", "Premix", "Other"];
  const ingGroups = [...CAT_ORDER, ...new Set(ingRows.map((r) => r.cat).filter((c) => !CAT_ORDER.includes(c)))].map((cat) => ({ cat, rows: ingRows.filter((r) => r.cat === cat) })).filter((g) => g.rows.length);
  const catMatches = iq
    ? catalogue
        .filter((g) => !S.pool[g.id] && matchesQuery(g, g.id))
        .slice(0, 12)
        .map((g) => ({ name: g.name, sub: g.category + " · " + (g.price ? "$" + fmt(g.price.usdPerTonne, 0) + "/t planning price" : "no planning price"), subColor: g.price ? "#64665c" : "#a63d2a", add: () => { addIng(g.id); update({ ingQ: "" }); } }))
    : [];
  const tickedN = poolIds.filter((id) => S.pool[id].role !== "excluded").length;
  const dataLine = { ...ST.met, text: poolIds.length ? "FeedSport checks each ingredient’s nutrient data when it formulates. Any missing a value this stage needs is set aside, not removed from your list." : "Pick a list or add ingredients." };
  const suggestionReady = S.suggestion?.status === "ready" && S.suggestion.key === S.programmeId + "|" + S.phaseId ? S.suggestion : null;
  const completion =
    completionKey && S.completionSuggestion?.key === completionKey
      ? S.completionSuggestion
      : null;
  const completionIds = completion?.status === "ready" ? completion.ids : [];
  const completionAlternativeIds =
    completion?.status === "complete"
      ? (suggestionReady?.ids ?? []).filter((id) => !S.pool[id]).slice(0, 6)
      : [];
  const completionItemIds = completion?.status === "complete" ? completionAlternativeIds : completionIds;
  const completionPanel = {
    show: !!completionKey,
    loading: !completion || completion.status === "loading",
    ready: completion?.status === "ready",
    complete: completion?.status === "complete",
    problem:
      completion?.status === "blocked" || completion?.status === "error",
    title:
      !completion || completion.status === "loading"
        ? "Checking what this list needs"
        : completion.status === "ready"
          ? "Feasibility suggestions — not a finished formulation"
          : completion.status === "complete"
            ? "This mix can now be optimised"
            : "This list needs attention first",
    body:
      !completion || completion.status === "loading"
        ? "Testing your ingredients against every hard nutrient requirement and stage limit…"
        : completion.status === "ready"
          ? "This is the smallest added set that produced a feasible test mix for " +
            PH.label +
            ". The shown percentages only prove feasibility; they are not cost-optimised or an operational recipe. Add the full set to make this pool feasible, then continue to choose the batch and optimisation goal. Adding here does not formulate automatically." +
            (completion.setAsideIds.length
              ? " " + completion.setAsideIds.length + " current ingredient" + (completion.setAsideIds.length === 1 ? " was" : "s were") + " set aside because required nutrient data is missing."
              : "")
          : completion.status === "complete"
            ? "FeedSport found a feasible test mix using these ingredients and limits. Continue to choose the batch and goal, then formulate to calculate the optimal recipe. The optional alternatives below give the optimiser more choices; adding one does not guarantee it will be used."
            : completion.message ?? "FeedSport couldn’t verify additions for this list.",
    itemsTitle: completion?.status === "complete" && completionAlternativeIds.length ? "Other optional alternatives" : "",
    items: completionItemIds.map((id) => ({
      name: ingredientName(id),
      modelPct:
        completion?.status !== "complete" && completion?.projectedInclusionPct[id] != null
          ? "test mix " + fmt(completion.projectedInclusionPct[id], completion.projectedInclusionPct[id] < 1 ? 2 : 1) + "%"
          : catalogueById.get(id)?.category ?? "catalogue ingredient",
      add: () => addCompletionIngredients([id]),
    })),
    hasItems: completionItemIds.length > 0,
    canAddAll: completionIds.length > 0,
    addAll: () => addCompletionIngredients(completionIds),
    actionLabel: completionIds.length === 1 ? "Add suggestion" : "Add full set",
  };
  const steps = ["Animal and stage", "Ingredients", "Batch and goal"].map((label, i) => {
    const n = i + 1,
      done = n < S.step,
      cur = n === S.step;
    return { label: n === 1 && done ? P.name + " · " + PH.label : label, mark: done ? "✓" : String(n), color: cur ? "#222420" : done ? "#2f5a3f" : "#64665c", bg: cur ? "#2f5a3f" : done ? "#dbe7dc" : "#fff", fg: cur ? "#fff" : "#2f5a3f", bd: cur ? "#2f5a3f" : done ? "#dbe7dc" : "#b9b6ab", go: () => n <= S.step && update({ step: n }) };
  });
  const speciesOpts = (
    [
      ["swine", "Pigs"],
      ["broiler", "Poultry"],
    ] as const
  ).map(([k, label]) => {
    const on = S.species === k;
    return {
      label,
      ring: on ? "inset 0 0 0 1px #2f5a3f" : "none",
      bg: on ? "#eef3ee" : "#fff",
      pick: () => {
        if (on) return;
        const first = programmes.programmes.find((p) => p.species === k && p.id === DEFAULT_PROGRAMME) ?? programmes.programmes.find((p) => p.species === k)!;
        update(programmeChoice(first.id));
      },
    };
  });
  const setupProgrammes = programmes.programmes.filter((p) => p.species === S.species).map((p) => ({ id: p.id, name: p.name }));
  const stageOpts = P.phases.map((ph) => {
    const on = ph.id === PH.id;
    return { label: ph.label, range: ph.label.includes(ph.weightRange) ? "Table " + ph.sourceTable : ph.weightRange, disabled: false, cursor: "pointer", bs: "solid", bd: "#d0cdc3", ring: on ? "inset 0 0 0 1px #2f5a3f" : "none", bg: on ? "#eef3ee" : "#fff", pick: () => update({ phaseId: ph.id }) };
  });
  const setupList = myLists.lists.find((l) => l.id === S.setupListId) ?? myLists.lists[0] ?? null;
  const setOpts = [
    {
      k: "list" as const,
      label: "My list",
      sub: setupList ? "Your list “" + setupList.label + "” with your prices. Only these are used." : myLists.status === "ready" ? "You don’t have a list yet. Make one under My ingredients." : "Loading your lists…",
      pool: () => poolWithProgrammePremix(poolFromList(setupList), S.programmeId),
    },
    {
      k: "system" as const,
      label: "FeedSport suggestion list",
      sub: suggestionReady ? suggestionReady.ids.length + " catalogue ingredients with complete data that can meet " + PH.label + ", at planning prices." : S.suggestion?.status === "error" ? "FeedSport couldn’t put a list together for this stage." : "Finding ingredients that can meet this stage…",
      pool: (): Pool => poolWithProgrammePremix(Object.fromEntries((suggestionReady?.ids ?? []).map((id) => [id, { role: "available" as Role }])), S.programmeId),
    },
  ].map((o) => {
    const on = S.setKey === o.k;
    return { label: o.label, sub: o.sub, segBg: on ? "#fff" : "transparent", segSh: on ? "0 1px 2px rgba(0,0,0,.1)" : "none", segW: on ? "600" : "500", pick: () => update({ setKey: o.k, pool: poolWithProgrammePremix(o.pool(), S.programmeId), ingQ: "", ...(o.k === "list" && setupList ? { setupListId: setupList.id } : {}) }) };
  });
  const setNote =
    S.setKey === "system"
      ? suggestionReady
        ? suggestionReady.ids.length + " catalogue ingredients with complete data that can meet " + PH.label + ", at planning prices. Untick anything you can’t get."
        : S.suggestion?.status === "error"
          ? "FeedSport couldn’t put a list together for this stage. Use your own list, or search the catalogue below."
          : "Finding ingredients that can meet this stage…"
      : S.setKey === "list"
        ? setupList
          ? "Your saved list with your prices:"
          : myLists.status === "ready"
            ? "You don’t have a list yet. Search the catalogue below, or make one under My ingredients."
            : "Loading your lists…"
        : "Loading your lists…";
  const stepNext = () => {
    if (S.step < 3) return update({ step: S.step + 1 });
    update({ screen: "workspace", docName: PH.label + " · " + (S.setKey === "system" ? "FeedSport suggested" : setupList?.label ?? "My ingredients"), tab: "recipe" });
    run();
  };
  const nextDisabled = S.step === 2 && poolIds.filter((id) => S.pool[id].role !== "excluded").length === 0;

  // ---- workspace ----
  const optimal = R && R.status === "optimal" ? R : null;
  const blockedLike = R?.status === "blocked" || R?.status === "error";
  const view = { none: !R && !S.running, blocked: blockedLike, infeasible: R?.status === "infeasible", optimal: !!optimal };
  const changes = stale ? diff(S.runSnap!, snapOf(S), engine) : [];
  const runState = S.running
    ? { label: "Formulating…", color: "#45473f", bg: "#c98a1e", r: "50%", btn: "Formulating…", btnBg: "#e2dfd6", btnFg: "#64665c" }
    : !R
      ? { label: "Not formulated yet", color: "#64665c", bg: "#d0cdc3", r: "50%", btn: "Formulate", btnBg: "#2f5a3f", btnFg: "#fff" }
      : stale
        ? { label: changes.length + " change" + (changes.length === 1 ? "" : "s") + " since last run", color: "#222420", bg: "#222420", r: "0", btn: "Re-formulate", btnBg: "#2f5a3f", btnFg: "#fff" }
        : { label: "Result is up to date", color: "#2b6a42", bg: "#2f7a4a", r: "50%", btn: "Re-formulate", btnBg: "#e2dfd6", btnFg: "#45473f" };
  const manualOff = !!manualView && !manualView.checking && !manualView.recipeValidity?.valid;
  const saveDisabled = !R || stale || S.running || S.saving || R.status === "blocked" || R.status === "error" || manualOff || !!manualView?.checking;
  const exportDisabled = !optimal || stale || S.running || S.exporting || manualOff || !!manualView?.checking;
  const exportPdf = async () => {
    if (exportDisabled || !optimal) return;
    const viewerWindow = window.open("", "_blank");
    if (!viewerWindow) {
      flash("Your browser blocked the PDF tab. Allow pop-ups and try again.");
      return;
    }
    viewerWindow.opener = null;
    viewerWindow.document.title = "Preparing formulation PDF…";
    viewerWindow.document.body.style.cssText = "margin:0;padding:32px;background:#f3f0e8;color:#3d403a;font:15px/1.5 sans-serif";
    viewerWindow.document.body.textContent = "Preparing your FeedSport formulation PDF…";
    update({ exporting: true });
    try {
      const recipe = manualView
        ? manualView.recipe
        : optimal.recipe.map((ingredient) => ({ id: ingredient.id, pct: ingredient.pct }));
      const nutrientRows = manualView?.nutrients ?? optimal.nutrients;
      const advisories = manualView?.advisories ?? optimal.advisories;
      const costPerTonne = manualView?.cost ?? optimal.costT;
      const runGoal = S.runSnap?.goal ?? S.goal;
      const payload = {
        documentName: S.docName.trim() || "Untitled formulation",
        programmeName: P.name,
        phaseLabel: PH.label,
        weightRange: PH.weightRange,
        source: P.source + " · Table " + PH.sourceTable,
        goalLabel: manualView ? "Manual recipe" : GOALS[runGoal].label,
        goalDescription: manualView
          ? "Amounts were entered by the user and checked against the selected programme."
          : GOALS[runGoal].desc,
        mode: manualView ? "Manual" : "Optimised",
        batchKg: S.batch,
        costPerTonne,
        ...(!manualView ? { leastCostPerTonne: optimal.leastCostT } : {}),
        preparedFor: user ? titleCase(user.name) + (user.org ? " · " + user.org : "") : undefined,
        ingredients: recipe.map((ingredient) => {
          const entry = S.pool[ingredient.id] ?? { role: "available" as Role };
          return {
            name: ingredientName(ingredient.id),
            setting: roleShort(entry),
            inclusionPct: ingredient.pct,
            pricePerTonne: priceOf(ingredient.id, S.pool, catalogueById),
          };
        }),
        nutrients: nutrientRows.map((nutrient) => ({
          name: nutrient.name,
          unit: nutrient.unit,
          value: nutrient.value,
          min: nutrient.min,
          max: nutrient.max,
          status: nutrient.status,
          limiting: nutrient.limiting,
        })),
        advisories: advisories.map((advisory) => advisory.text),
        notes: [
          ...optimal.warns.map((warning) => warning.title + ": " + warning.body),
          ...(manualView?.incompleteRequirements.map((requirement) =>
            "Nutritional adequacy unknown for " + requirement.label + ": missing data for " + requirement.missingIngredientIds.map(ingredientName).join(", ") + ".",
          ) ?? []),
        ],
      };
      const response = await fetch("/api/feed-formulation/studio-report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message ?? "Could not open the formulation PDF.");
      }
      const pdfUrl = URL.createObjectURL(await response.blob());
      viewerWindow.location.replace(pdfUrl);
      window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 10 * 60 * 1000);
    } catch (error) {
      console.error("Failed to export formulation PDF:", error);
      viewerWindow.close();
      flash(error instanceof Error ? error.message : "Couldn’t generate the PDF. Try again.");
    } finally {
      update({ exporting: false });
    }
  };
  const doc = formulations.docs.find((d) => d.id === S.docId);
  const saveState = S.saving
    ? { label: "SAVING…", color: "#64665c" }
    : !doc
      ? { label: "DRAFT · NOT SAVED", color: "#64665c" }
      : S.savedSig === sigOf(S) + S.mode + JSON.stringify(S.manual)
        ? { label: "SAVED · v" + doc.versions.length, color: "#2b6a42" }
        : { label: "v" + doc.versions.length + " · UNSAVED CHANGES", color: "#8a5f18" };
  const warns = (R ? R.warns.filter((w) => !w.soft || view.optimal) : []).map((w) => ({ title: w.title, body: w.body, bg: w.soft ? "#fff" : "#fdf6e8", bd: w.soft ? "#e2dfd6" : "#f0c97f", dot: w.soft ? "#b9b6ab" : "#c98a1e", r: w.soft ? "50%" : "0", rot: w.soft ? "0deg" : "45deg", fg: w.soft ? "#222420" : "#5c4012", hasEdit: !!w.id && !!S.pool[w.id], edit: () => w.id && openDrawer(w.id) }));
  const blockErrs =
    R?.status === "blocked"
      ? R.errs.map((e) => ({
          title: e.title,
          body: e.body,
          hasEdit: !!e.id || /minimums|maximums/.test(e.title) || !poolIds.length,
          editLabel: e.id ? "Edit " + ingredientName(e.id) : poolIds.length ? "Review ingredients" : "Add an ingredient",
          edit: () => (e.id ? openDrawer(e.id) : poolIds.length ? openDrawer(poolIds.find((id) => S.pool[id].role === "fixed" || S.pool[id].role === "required") || poolIds[0]) : update({ addOpen: true, addQ: "", addPick: [], addTarget: "pool" })),
        }))
      : R?.status === "error"
        ? [{ title: "FeedSport couldn’t formulate this", body: R.message, hasEdit: false, editLabel: "", edit: () => {} }]
        : [];
  const checklist = [
    { ok: true, text: "Programme: " + prog.name },
    { ok: activeCount > 0, text: activeCount ? activeCount + " ingredients to choose from" : "Add at least one ingredient" },
    { ok: true, text: "Goal: " + GOALS[S.goal].label + " · batch " + batchLabel },
  ].map((k) => ({ text: k.text, mark: k.ok ? "✓" : "", bg: k.ok ? "#dbe7dc" : "#fff", bd: k.ok ? "#dbe7dc" : "#b9b6ab" }));

  const inf =
    R?.status === "infeasible"
      ? (() => {
          const short = R.shortfalls.map((f) => {
            const ratio = f.kind === "min" ? f.best / f.req : f.req / f.best;
            const n2 = nutVal(f, f.best) === nutVal(f, f.req) ? { ...f, dp: f.dp + 1 } : f;
            return { name: f.name + (f.kind === "max" ? " (max)" : ""), best: nutVal(n2, f.best), req: nutVal(n2, f.req), w: Math.max(2, Math.min(100, ratio * 88)) + "%", m: "88%" };
          });
          const names = R.shortfalls.map((f) => f.name.replace("SID ", "").toLowerCase());
          return {
            title: R.shortfalls.length ? "These ingredients can’t meet " + (R.shortfalls.length === 1 ? "one requirement" : R.shortfalls.length + " requirements") : "No recipe meets every requirement at once",
            body: R.shortfalls.length ? "No mix of your " + R.activeCount + " usable ingredients reaches " + names.join(", ") + " within your limits." : "Each requirement can be met on its own, but not all together with these ingredients and limits.",
            short,
            hasShort: short.length > 0,
            hasConflict: false,
            conflict: "",
            possible: [] as string[],
            fixNote: "Requirements are never relaxed. Add an ingredient that supplies what’s short (an oil for energy, the matching synthetic amino acid, a phosphate or limestone for minerals), or loosen your own limits, then re-formulate.",
            fixes: [] as { label: string; detail: string; cost: string; ring: string; apply: () => void }[],
          };
        })()
      : null;

  const opt = optimal ? optimalVals(S, optimal, manualView, { poolIds, isEligible, isUserPrice, priceTxt, batchLabel, openDrawer, update, run, engine, showSolverDetails, adviceCount: doc?.advice.length ?? 0 }) : null;

  const tabs = (
    [
      ["recipe", "Recipe"],
      ["nutrients", "Nutrients"],
      ["why", "Why this recipe"],
      ["history", "History"],
    ] as [Tab, string][]
  ).map(([k, label]) => ({ label, bd: S.tab === k ? "#222420" : "transparent", color: S.tab === k ? "#222420" : "#64665c", go: () => update({ tab: k }) }));
  const why = optimal ? whyVals(S, optimal, { update, run, engine, phase: PH }) : { limiting: [], held: [], opps: [], misses: [], none: false };
  const runs = S.history.map((h) => ({ time: h.t.toTimeString().slice(0, 5), label: h.status === "optimal" ? GOALS[h.goal].label + " · " + h.n + " ingredients" : h.status === "infeasible" ? "No valid recipe" : "Couldn’t formulate", cost: h.status === "optimal" ? money(h.cost) + "/t" : "—" }));
  const docAdvice = doc
    ? doc.advice.map((a) => ({
        id: a.id,
        author: a.author,
        body: a.body,
        meta: new Date(a.date).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) + (a.v != null ? " · on v" + a.v : ""),
        hasSuggestion: !!a.suggestion,
        openSuggestion: () => openSuggestion(doc.id, a.id),
      }))
    : [];
  const docVersions = doc ? doc.versions.slice().reverse().map((v) => ({ v: v.v, date: new Date(v.date).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }), cost: v.sum.costT != null ? money(v.sum.costT) + "/t" : "—", open: () => openVersion(doc.id, v.v) })) : [];

  // ---- formulations list ----
  const listRows = formulations.docs.flatMap((d) =>
    d.versions
      .slice()
      .reverse()
      .map((v, i) => {
        const key = d.id + ":" + v.v;
        const on = S.sel.includes(key);
        return { name: i === 0 ? d.name : "↳ earlier version", indent: i === 0 ? "0" : "16px", nameColor: i === 0 ? "#222420" : "#64665c", prog: programmeLabel(programmes, v.snap), v: v.v, st: stOfSum(v.sum), cost: v.sum.costT != null ? money(v.sum.costT) : "—", date: new Date(v.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }), bg: on ? "#f4f8f4" : "#fff", check: on ? "✓" : "", cbBg: on ? "#2f5a3f" : "#fff", cbBd: on ? "#2f5a3f" : "#b9b6ab", toggle: () => update({ sel: on ? S.sel.filter((k) => k !== key) : [...S.sel, key].slice(-2) }), open: () => openVersion(d.id, v.v) };
      }),
  );
  const recent = formulations.docs.slice(0, 5).map((d) => {
    const v = d.versions[d.versions.length - 1];
    return { name: d.name, v: v.v, prog: programmeLabel(programmes, v.snap), st: stOfSum(v.sum), cost: v.sum.costT != null ? money(v.sum.costT) + "/t" : "—", open: () => openVersion(d.id, v.v) };
  });
  const cmp = S.screen === "compare" && S.cmp ? compareVals(formulations.docs, S.cmp, openVersion, engine) : null;

  // ---- drawer, add, rules ----
  const d = S.drawer ? drawerVals(S, S.drawer, optimal, { update, applyDraft, removeDraft, engine, phase: PH }) : null;
  const q = S.addQ.trim().toLowerCase();
  const addList = S.addTarget === "set" ? currentList(S, myLists) : null;
  const addResults = catalogue
    .filter((g) => (addList ? !addList.items.some((it) => it.ingredientId === g.id) : !S.pool[g.id]) && (!q || [g.name, g.category, ...g.aliases].join(" ").toLowerCase().includes(q)))
    .map((g) => ({ name: g.name, sub: g.category + " · " + (g.price ? "$" + fmt(g.price.usdPerTonne, 0) + "/t planning price" : "no planning price"), subColor: g.price ? "#64665c" : "#a63d2a", picked: S.addPick.includes(g.id), toggle: () => toggleAddPick(g.id) }));
  const rules = programmes.requirementFields.flatMap((f, i) => {
    const value = PH.requirements[i];
    if (value == null) return [];
    const name = P.species === "broiler" && f.broilerName ? f.broilerName : f.name;
    return [{ name: name + (f.unit === "%" ? ", %" : ", " + f.unit), pmin: fmt(value, f.unit === "%" ? 3 : 0).replace(/\.?0+$/, ""), pmax: "", editable: false, notEditable: true, ov: "", onOv: () => {}, type: f.kind === "target" ? "Hard · published target" : "Hard", bg: "#fff", minColor: "#222420", minDeco: "none" }];
  });
  const poolGuides = guides.filter((g) => S.pool[g.id]);
  const guideText = poolGuides.length ? poolGuides.map((g) => g.name + " up to " + g.practicalPct + "%").join(" · ") + ". Checked after solving; never used as constraints." : "None for the ingredients in this formulation.";

  const v = {
    ...shell,
    goList: () => update({ screen: "list", drawer: null, advisoriesOpen: false }),
    startBlank: () => openWorkspace({}, "Untitled formulation"),
    isHome: S.screen === "home", isSetup: S.screen === "setup", isWorkspace: S.screen === "workspace", isList: S.screen === "list", isCompare: S.screen === "compare",
    savedLoading: formulations.status === "loading" || formulations.status === "idle", savedError: formulations.status === "error", retrySaved: () => void formulations.reload(), pendingDoc: !!S.pendingDoc,
    recent, steps, step1: S.step === 1, step2: S.step === 2, step3: S.step === 3, speciesOpts, stageOpts, setOpts, setNote, ingGroups, ingQ: S.ingQ, onIngQ: (e: InputEvent) => update({ ingQ: e.target.value }), tickCount: tickedN + " of " + poolIds.length + " ticked", catMatches, hasCatMatches: catMatches.length > 0, ingNoMatch: !!iq && ingRows.length === 0, dataLine, completionPanel, batchOpts, batchCustom: S.batchMode === "custom", customBatch: S.customBatch,
    setupProgrammes, setupProgrammeId: P.id, onSetupProgramme: (e: InputEvent) => update(programmeChoice(e.target.value)),
    onCustomBatch: (e: InputEvent) => update({ customBatch: e.target.value, batch: +e.target.value > 0 ? +e.target.value : S.batch }),
    goalOpts, goalLabel: GOALS[S.goal].label, goalDesc: GOALS[S.goal].desc, batchLabel, prog, poolCount: String(poolIds.length),
    canBack: S.step > 1, stepBack: () => update({ step: S.step - 1 }), stepNext, nextDisabled, nextBg: nextDisabled ? "#b9b6ab" : "#2f5a3f", nextLabel: S.step === 3 ? "Formulate" : "Continue",
    skipToWorkspace: () => update({ screen: "workspace" }),
    docName: S.docName, onName: (e: InputEvent) => update({ docName: e.target.value }), saveState, save: () => void save(), saveDisabled, saveBg: saveDisabled ? "#b9b6ab" : "#2f5a3f", saveTitle: stale ? "Re-formulate first" : manualOff ? "Resolve the manual recipe validity issues" : "", manualOff, manualIssues: manualView?.recipeValidity?.issues ?? [],
    exportDisabled, exportColor: exportDisabled ? "#8d8a80" : "#222420", exportLabel: S.exporting ? "Opening PDF…" : "Export PDF", exportTitle: !optimal ? "Formulate a valid recipe first" : stale ? "Re-formulate first" : manualOff ? "Resolve the manual recipe validity issues" : "Open recipe and nutrient report as PDF", doExport: () => void exportPdf(),
    leftW: wide ? "300px" : "100%", programmeId: P.id, progList: programmes.programmes.map((p) => ({ id: p.id, name: p.name })),
    onProgramme: (e: InputEvent) => update(programmeChoice(e.target.value)),
    phaseList: P.phases.map((ph) => ({ id: ph.id, name: ph.label })), phaseId: PH.id, onPhase: (e: InputEvent) => update({ phaseId: e.target.value }),
    overrideText: PH.weightRange,
    openAdd: () => update({ addOpen: true, addQ: "", addPick: [], addTarget: "pool", advisoriesOpen: false }), closeAdd: () => update({ addOpen: false }), addOpen: S.addOpen, addQ: S.addQ, onAddQ: (e: InputEvent) => update({ addQ: e.target.value }), addResults, addEmpty: addResults.length === 0, addPickN: S.addPick.length, addPicked, clearAddPick: () => update({ addPick: [] }), addCta: S.addPick.length ? "Add " + S.addPick.length + " ingredient" + (S.addPick.length === 1 ? "" : "s") : "Add ingredients",
    poolRows: poolIds.map((id) => {
      const e = S.pool[id];
      return { name: ingredientName(id), short: isEligible(id) ? roleShort(e) : "Set aside", chip: CHIP[e.role], nameColor: e.role === "excluded" || !isEligible(id) ? "#8d8a80" : "#222420", roleColor: e.role === "fixed" ? "#222420" : e.role === "excluded" || !isEligible(id) ? "#8d8a80" : "#2f5a3f", open: () => openDrawer(id) };
    }),
    poolEmpty: poolIds.length === 0,
    settingsCount: String(poolIds.filter((id) => S.pool[id].role !== "available" || S.pool[id].max).length),
    openRules: () => update({ rulesOpen: true, advisoriesOpen: false }), closeRules: () => update({ rulesOpen: false }), rulesOpen: S.rulesOpen, rules, guideText, rulesEditable: false, resetOverrides: () => {}, rulesRun: () => { update({ rulesOpen: false }); run(); },
    runState, run, running: S.running, runningText: "Checking " + prog.nReq + " requirements against " + activeCount + " ingredients",
    spinner: <span style={spinnerStyle("#45473f", "#e3aa45")} />,
    spinnerDark: <span style={spinnerStyle("#e2dfd6", "#2f5a3f")} />,
    isStale: stale && !S.running, staleTitle: "You changed " + changes.length + " setting" + (changes.length === 1 ? "" : "s") + " since the last run", changes,
    undoChanges: () => { const s = S.runSnap!; const { programme } = phaseOf(programmes, s.programmeId, s.phaseId); update({ programmeId: s.programmeId, phaseId: s.phaseId, species: programme.species, pool: clone(s.pool), goal: s.goal }); },
    view, dimOpacity: S.running || stale ? "0.5" : "1", emptyTitle: activeCount ? "Ready to formulate" : "Before you can formulate", checklist, blockErrs, hasWarns: warns.length > 0 && !S.running, warns, inf,
    opt, showSolver: showSolverDetails, tabs, tabRecipe: S.tab === "recipe", tabNutrients: S.tab === "nutrients", tabWhy: S.tab === "why", tabHistory: S.tab === "history",
    advisoriesOpen: S.advisoriesOpen && (!!opt?.advisories.length || docAdvice.length > 0),
    advisoriesLabel: advisoryCount((opt?.advisories.length ?? 0) + docAdvice.length),
    openAdvisories: () => {
      update({ advisoriesOpen: true, drawer: null, addOpen: false, rulesOpen: false });
      if (doc) formulations.markAdviceRead(doc.advice.map((a) => a.id));
    },
    closeAdvisories: () => update({ advisoriesOpen: false }),
    modeOpts: (
      [
        ["optimised", "Optimised"],
        ["manual", "Manual"],
      ] as const
    ).map(([k, label]) => ({
      label,
      bg: S.mode === k ? (k === "manual" ? "#222420" : "#fff") : "transparent",
      fg: S.mode === k && k === "manual" ? "#faf8f3" : "#222420",
      pick: () => {
        if (k === S.mode || !optimal) return;
        if (k === "optimised") return update({ mode: "optimised", manual: {}, manualCheck: null });
        const m: Record<string, string> = {};
        poolIds.filter((id) => S.pool[id].role !== "excluded" && isEligible(id)).forEach((id) => { const r = optimal.recipe.find((x) => x.id === id); m[id] = r ? String(+r.pct.toFixed(2)) : "0"; });
        update({ mode: "manual", manual: m, manualCheck: null });
      },
    })),
    isManual: !!manualView, notManual: !manualView, optimiseFromHere: () => update({ mode: "optimised", manual: {}, manualCheck: null }), priceHead: S.unit === "t" ? "Price / t" : "Price / kg",
    nutTitle: "Nutrients vs. requirements", goNutrients: () => update({ tab: "nutrients" }),
    whyLoading: false, whyReady: !!optimal, why, runs, docVersions, noVersions: docVersions.length === 0, docAdvice, hasAdvice: docAdvice.length > 0,
    listRows, selText: S.sel.length + " of 2 selected", cmpDisabled: S.sel.length !== 2, cmpBg: S.sel.length === 2 ? "#e3aa45" : "#64665c", doCompare: () => S.sel.length === 2 && update({ screen: "compare", cmp: S.sel.slice() }), cmp,
    d, closeDrawer: () => update({ drawer: null }),
    hasToast: !!S.toast, toast: S.toast || "",
    ...topBarVals(S, {
      update, searchRef, startGuided, startBlank: () => openWorkspace({}, "Untitled formulation"), openVersion, openDrawer, openAdvice,
      markAllAdviceRead: () => formulations.markAdviceRead(formulations.docs.flatMap((d) => d.advice.map((a) => a.id))),
      docs: formulations.docs, catalogue, myLists, programmes, nutrients,
    }),
    ...featuredVals(S, featuredList, featured, { update, run, flash, programmes }),
    ...contactVals(S, {
      update, flash, user, inWs,
      describe: () => {
        // The formulation as you have it now, written out for the nutritionist.
        const lines = ["Formulation: “" + S.docName + "” · " + prog.name + " · " + GOALS[S.goal].label + " · batch " + batchLabel];
        if (optimal) {
          lines.push("Result: " + money(optimal.costT) + "/t · " + optimal.nutrients.filter((n) => n.status === "met").length + " of " + optimal.nutrients.length + " requirements met" + (optimal.advisories.length ? " · " + optimal.advisories.length + " advisory" : ""));
          optimal.recipe.forEach((x) => lines.push("- " + ingredientName(x.id) + ": " + fmt(x.pct, 2) + "% at " + money(priceOf(x.id, S.pool, catalogueById), 0) + "/t (" + roleShort(S.pool[x.id] ?? { role: "available" }) + ")"));
        } else if (R?.status === "infeasible") {
          lines.push("Result: no valid recipe" + (R.shortfalls.length ? " · short on " + R.shortfalls.map((f) => f.name).join(", ") : ""));
          poolIds.forEach((id) => lines.push("- " + ingredientName(id) + ": " + roleShort(S.pool[id]) + " at " + money(priceOf(id, S.pool, catalogueById), 0) + "/t"));
        }
        return lines.join("\n");
      },
      docSub: optimal ? prog.name + " · " + money(optimal.costT) + "/t · settings, prices and result included" : prog.name + " · no valid recipe · settings and diagnosis included",
    }),
    ...libraryVals(S, {
      update, flash, catalogue, nutrients, programmes, myLists, replaceUrl: () => (replaceNext.current = true),
      formulateWithList: (list: IngredientList) => openWorkspace(poolFromList(list), list.label),
      formulateProgramme: (programmeId: string, phaseId: string) => {
        const list = myLists.lists.find((l) => l.isDefault) ?? myLists.lists[0] ?? null;
        openWorkspace(poolFromList(list), (list ? list.label + " · " : "") + phaseOf(programmes, programmeId, phaseId).phase.label, { programmeId, phaseId }, !!list?.items.length);
      },
    }),
    auth: isAuthScreen(S.screen) ? authVals(S, { update, flash, signInWithGoogle, next: safeNext(S.authNext) ?? BASE, finishReset: () => update({ ...AUTH_RESET, screen: "home", af: { ...S.af, password: "" } }) }) : null,
    userSetPick: S.setKey === "list" && myLists.lists.length > 0, userSetList: myLists.lists.map((l) => ({ id: l.id, label: l.label })), userSetKey: setupList?.id ?? "",
    onUserSet: (e: InputEvent) => { const list = myLists.lists.find((l) => l.id === e.target.value) ?? null; update({ setupListId: list?.id ?? null, pool: poolFromList(list), ingQ: "" }); },
    manageLists: () => update({ screen: "ingredients", myListSel: setupList?.id ?? null }),
  };
  return { ready: true as const, shell, v };
}

type Update = (patch: Partial<State> | ((s: State) => Partial<State>)) => void;

const advisoryCount = (n: number) => n + " practical advisor" + (n === 1 ? "y" : "ies");

function optimalVals(
  S: State,
  R: OptimalResult,
  mc: ManualView | null,
  ctx: { poolIds: string[]; isEligible: (id: string) => boolean; isUserPrice: (id: string) => boolean; priceTxt: (p: number | null) => string; batchLabel: string; openDrawer: (id: string) => void; update: Update; run: () => void; engine: EngineContext; showSolverDetails: boolean; adviceCount: number },
) {
  const { update, run, engine } = ctx;
  const runSnap = S.runSnap!;
  const costT = mc ? mc.cost : R.costT;
  const baseRows = mc ? ctx.poolIds.filter((id) => S.pool[id].role !== "excluded" && ctx.isEligible(id)).map((id) => ({ id, pct: +S.manual[id] || 0 })) : R.recipe.map((r) => ({ id: r.id, pct: r.pct }));
  const advIds = new Set((mc ? mc.advisories : R.advisories).map((a) => a.id));
  const rows = baseRows.map((r) => {
    const e = S.pool[r.id] || { role: "available" };
    const p = priceOf(r.id, S.pool, engine.catalogue);
    const share = costT > 0 ? (((r.pct / 100) * (p || 0)) / costT) * 100 : 0;
    const rr = R.recipe.find((x) => x.id === r.id);
    const user = ctx.isUserPrice(r.id);
    return { name: engine.catalogue.get(r.id)?.name ?? r.id, setting: roleShort(e) + (rr && rr.atMax ? " · at limit" : ""), pctTxt: fmt(r.pct, r.pct < 1 ? 2 : 1) + "%", barW: Math.min(100, r.pct) + "%", barC: e.role === "fixed" ? "#222420" : "#2f5a3f", kg: fmt((r.pct / 100) * S.batch, S.batch >= 1000 ? 0 : r.pct * S.batch < 100 ? 2 : 1), price: ctx.priceTxt(p), tag: user ? "YOURS" : "DEFAULT", tagFg: user ? "#8a5f18" : "#8d8a80", shareTxt: fmt(share, 1) + "%", shareW: share + "%", adv: advIds.has(r.id), bg: advIds.has(r.id) ? "#fdf9ef" : "#fff", manual: S.manual[r.id] ?? "", onManual: (ev: InputEvent) => update((s) => ({ manual: { ...s.manual, [r.id]: ev.target.value } })), open: () => ctx.openDrawer(r.id) };
  });
  const tp = mc ? mc.total : 100;
  const off = !!mc && Math.abs(tp - 100) > 0.05;
  const total = { pct: fmt(tp, 1) + "%" + (off ? (tp > 100 ? " (+" : " (−") + fmt(Math.abs(tp - 100), 1) + ")" : ""), color: off ? "#a63d2a" : "#222420", kg: fmt((tp / 100) * S.batch, S.batch >= 1000 ? 0 : 1), cost: money(costT) };
  const nList = mc ? mc.nutrients : R.nutrients;
  const failN = nList.filter((n) => n.status !== "met").length;
  const adv = mc ? mc.advisories : R.advisories.filter((a) => !S.dismissed[a.id]);
  // The nutritionist's notes count as practical advisories; they share the drawer.
  const advTotal = adv.length + ctx.adviceCount;
  const advTxt = advisoryCount(advTotal);
  const recipeInvalid = !!mc && !mc.checking && !mc.recipeValidity?.valid;
  const recipeStatus = mc?.checking
    ? { label: "Checking recipe validity…", color: "#64665c", bg: "#d0cdc3", r: "50%" }
    : recipeInvalid
      ? { label: "Recipe invalid", color: "#a63d2a", bg: "#b2412e", r: "0" }
      : { label: "Recipe valid", color: "#2b6a42", bg: "#2f7a4a", r: "50%" };
  const nutrientStatus = mc?.checking || recipeInvalid
    ? { label: "Nutrition not checked", color: "#64665c", bg: "#d0cdc3", r: "50%" }
    : failN
      ? { label: failN + " of " + nList.length + " checked nutrient requirements not met" + (mc?.incompleteRequirements.length ? " · " + mc.incompleteRequirements.length + " unknown" : ""), color: "#a63d2a", bg: "#b2412e", r: "0" }
      : mc?.nutrientAdequacy === "unknown"
        ? { label: mc.incompleteRequirements.length + " nutrient requirement" + (mc.incompleteRequirements.length === 1 ? " is" : "s are") + " unknown · missing ingredient data", color: "#8a5f18", bg: "#c98a1e", r: "0" }
      : { label: "Meets all " + nList.length + " nutrient requirements", color: "#2b6a42", bg: "#2f7a4a", r: "50%" };
  const strip = {
    ...nutrientStatus,
    recipe: recipeStatus,
    hasAdv: advTotal > 0,
    adv: advTxt,
    goal: mc ? "Manual recipe" : GOALS[runSnap.goal].label + (runSnap.goal === "least_cost" || R.goalUnavailable ? "" : " · within 3%"),
    solver: mc ? "" : "FeedSport engine · " + R.nVars + " ingredients · " + R.nRows + " requirements · " + Math.round(R.ms) + " ms",
  };
  let goalCostNote = { show: false, text: "" };
  if (!mc && runSnap.goal !== "least_cost") {
    const dd = R.costT - R.leastCostT;
    goalCostNote = {
      show: true,
      text: R.goalUnavailable
        ? "There’s no distinct " + GOALS[runSnap.goal].label.toLowerCase() + " within 3% of least cost, so the least-cost recipe is shown."
        : dd > 0.005
          ? GOALS[runSnap.goal].label + " costs " + money(dd) + "/t more than least cost (" + money(R.leastCostT) + "/t)." + (R.dropped.length ? " Leaves out: " + R.dropped.map((x) => engine.catalogue.get(x)?.name ?? x).join(", ") + "." : "")
          : "No cost difference from least cost for this formulation.",
    };
  }
  const figures = [
    { label: "This batch · " + ctx.batchLabel, value: money((costT * S.batch) / 1000), bg: "#2f5a3f", fg: "#fff", sub: "#cfe0d2" },
    { label: "Per kg", value: money(costT / 1000, 3), bg: "#fff", fg: "#222420", sub: "#64665c" },
    { label: "Per 50 kg bag", value: money(costT / 20), bg: "#fff", fg: "#222420", sub: "#64665c" },
    { label: "Per tonne", value: money(costT), bg: "#fff", fg: "#222420", sub: "#64665c" },
  ];
  const nuts = nList.map((n) => {
    const base = n.status === "met" ? ST.met : ST[n.status];
    const hi = n.max != null ? n.max * 1.3 : n.min != null ? n.min * 1.5 : Math.max(n.value * 1.5, 1);
    const pos = (x: number) => Math.max(0, Math.min(100, (x / hi) * 100)) + "%";
    return {
      name: n.name, short: n.name, val: nutVal(n, n.value), st: n.limiting ? { ...base, label: base.label + " · limiting" } : base,
      reqTxt: (n.min != null ? "min " + nutVal(n, n.min) : "") + (n.max != null ? (n.min != null ? " · " : "") + "max " + nutVal(n, n.max) : ""),
      zl: n.min != null ? pos(n.min) : "0%", zw: (n.max != null ? ((n.max - (n.min || 0)) / hi) * 100 : 100 - ((n.min || 0) / hi) * 100) + "%", zbl: n.min != null ? "#2f5a3f" : "transparent", zbr: n.max != null ? "#2f5a3f" : "transparent", mk: pos(n.value), mkC: n.status !== "met" ? "#b2412e" : "#222420", trackBg: "#f3f0e8", flag: n.limiting ? "LIMITING" : "",
    };
  });
  const advisories = adv.map((a) => {
    const e = S.pool[a.id];
    const fixedOrReq = e?.role === "fixed" || (e?.role === "required" && Number(e.min) > a.guide);
    return { text: a.text, note: mc ? "This is a guideline, not a hard limit." : "This is a guideline, not a hard limit. The recipe is valid as it is.", actionable: !mc && !fixedOrReq, capLabel: "Limit to " + a.guide + "% and re-formulate", cap: () => { update((s) => ({ pool: { ...s.pool, [a.id]: { ...(s.pool[a.id] || { role: "available" }), max: a.guide } }, advisoriesOpen: false })); run(); }, keep: () => update((s) => ({ dismissed: { ...s.dismissed, [a.id]: true }, advisoriesOpen: adv.length > 1 })) };
  });
  const shownGoal = R.goalUnavailable ? "least_cost" : runSnap.goal;
  const strategies = R.strategies.map((g) => {
    const on = shownGoal === g.key;
    const dd = g.possible ? g.cost! - R.leastCostT : 0;
    return { label: g.label, badge: on ? "CURRENT" : "", cost: g.possible ? money(g.cost) : "Not possible", note: g.possible && g.key === "least_cost" ? g.count + " ingredients" : g.possible ? g.count + " ingredients · " + g.note : g.note, delta: g.possible && g.key !== "least_cost" ? (dd > 0.005 ? "+" + money(dd) + "/t · +" + fmt((dd / R.leastCostT) * 100, 1) + "%" : "same cost") : "", deltaColor: dd > 0.005 ? "#a63d2a" : "#64665c", disabled: !g.possible || on, cursor: g.possible && !on ? "pointer" : "default", bs: g.possible ? "solid" : "dashed", bd: on ? "#2f5a3f" : g.possible ? "#e2dfd6" : "#b9b6ab", ring: on ? "inset 0 0 0 1px #2f5a3f" : "none", bg: on ? "#eef3ee" : g.possible ? "#fff" : "#faf8f3", pick: () => { if (!g.possible || on) return; update({ goal: g.key }); run(); } };
  });
  const unusedText = R.unused.map((id) => engine.catalogue.get(id)?.name ?? id).join(", ");
  return { rows, total, figures, strip, nuts, advisories, strategies, unusedText, hasUnused: !mc && !!unusedText, goalCostNote };
}

/** "Why this recipe": what's at its limit, and the ingredients the recipe leaves out. */
function whyVals(S: State, R: OptimalResult, ctx: { update: Update; run: () => void; engine: EngineContext; phase: ReturnType<typeof phaseOf>["phase"] }) {
  const { engine } = ctx;
  const name = (id: string) => engine.catalogue.get(id)?.name ?? id;
  const limiting = R.nutrients
    .filter((n) => n.limiting)
    .map((n, i) => ({ rank: String(i + 1), name: n.name, min: n.min != null ? "min " + nutVal(n, n.min) : "max " + nutVal(n, n.max!), delta: "exactly at its " + (n.min != null && Math.abs(n.value - n.min) <= Math.abs(n.value - (n.max ?? Infinity)) ? "minimum" : "maximum") }));
  const held = R.recipe.flatMap((r) =>
    r.role === "fixed"
      ? [r.name + " is fixed by you at " + fmt(r.pct, 1) + "%. It costs " + money(((r.pct / 100) * (r.price || 0))) + " per tonne of feed."]
      : r.atMax
        ? [r.name + " is held at " + (r.hi === r.fsMax ? "the FeedSport limit" : "your maximum") + " of " + r.hi + "%. The recipe would use more if it could."]
        : [],
  );
  const opportunity = new Map(R.opportunities.map((o) => [o.id, o]));
  const unused = R.unused.map((id) => ({ id, o: opportunity.get(id) }));
  const opps = unused
    .filter((u) => u.o && u.o.points.some((p) => p.maxPct >= 0.05))
    .map(({ id, o }) => {
      const pts = o!.points.filter((p) => p.maxPct >= 0.05);
      const first = pts[0];
      return {
        name: name(id),
        text: "Not used at " + money(priceOf(id, S.pool, engine.catalogue), 0) + "/t. It could make up " + pts.map((p) => fmt(p.maxPct, p.maxPct < 1 ? 2 : 1) + "% for " + p.tolerancePct + "% more cost").join(", ") + ".",
        add: () => {
          // Ask the recipe to use the 1% amount, and re-formulate.
          const min = Math.floor(first.maxPct * 100) / 100;
          ctx.update((s) => ({ pool: { ...s.pool, [id]: { ...(s.pool[id] ?? { role: "available" }), role: "required", min } }, tab: "recipe" }));
          ctx.run();
        },
        addLabel: "Use " + fmt(Math.floor(first.maxPct * 100) / 100, 2) + "% and re-formulate",
      };
    });
  const misses = unused
    .filter((u) => !(u.o && u.o.points.some((p) => p.maxPct >= 0.05)))
    .map(({ id }) => ({ name: name(id), tag: "Not worthwhile", text: "At " + money(priceOf(id, S.pool, engine.catalogue), 0) + "/t it costs more than the nutrients it supplies are worth in this recipe, even with 3% more cost allowed." }));
  return { limiting, held, opps, misses, none: !unused.length };
}

function compareVals(saved: SavedDoc[], sel: string[], openVersion: (docId: string, v: number) => void, engine: EngineContext) {
  const get = (key: string) => {
    const [id, v] = key.split(":");
    const d = saved.find((x) => x.id === id);
    const ver = d?.versions.find((x) => x.v === +v);
    return d && ver ? { d, ver } : null;
  };
  const A = get(sel[0]),
    B = get(sel[1]);
  if (!A || !B) return null;
  const [a, b] = A.ver.date <= B.ver.date ? [A, B] : [B, A];
  const diffs = diff(a.ver.snap, b.ver.snap, engine);
  const pctIn = (x: typeof a, id: string) => x.ver.sum.recipe?.find((r) => r.id === id)?.pct || 0;
  const ids = [...new Set([...(a.ver.sum.recipe || []), ...(b.ver.sum.recipe || [])].map((r) => r.id))];
  const recipeRows = ids
    .sort((x, y) => pctIn(b, y) - pctIn(b, x))
    .map((id) => {
      const pa = pctIn(a, id),
        pb = pctIn(b, id),
        dd = pb - pa;
      return { label: engine.catalogue.get(id)?.name ?? id, a: pa ? fmt(pa, 1) + "%" : "—", b: pb ? fmt(pb, 1) + "%" : "—", d: Math.abs(dd) < 0.05 ? "no change" : (dd > 0 ? "+" : "−") + fmt(Math.abs(dd), 1), dc: "#45473f", hl: Math.abs(dd) >= 0.05 ? "#fdf6e8" : "transparent" };
    });
  const ca = a.ver.sum.costT,
    cb = b.ver.sum.costT,
    dc = cb != null && ca != null ? cb - ca : null;
  const costRows = (
    [
      ["Per tonne", 1],
      ["Per 50 kg bag", 20],
    ] as const
  ).map(([label, div]) => ({ label, a: ca != null ? money(ca / div) : "—", b: cb != null ? money(cb / div) : "—", d: dc == null ? "" : Math.abs(dc) < 0.005 ? "no change" : (dc > 0 ? "+" : "−") + money(Math.abs(dc) / div), dc: dc == null ? "#64665c" : dc > 0 ? "#a63d2a" : "#2b6a42", hl: "transparent" }));
  const sa = stOfSum(a.ver.sum),
    sb = stOfSum(b.ver.sum);
  const shortDate = (t: number) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const plain = (label: string, av = "", bv = "") => ({ label, a: av, b: bv, d: "", dc: "#45473f", hl: "transparent" });
  return {
    aName: a.d.name + " · v" + a.ver.v,
    bName: b.d.name + " · v" + b.ver.v,
    aSub: shortDate(a.ver.date) + " · " + sa.label,
    bSub: shortDate(b.ver.date) + " · " + sb.label,
    openB: () => openVersion(b.d.id, b.ver.v),
    groups: [
      { title: "Settings that differ", rows: diffs.map((t) => plain(t)), note: diffs.length ? "Everything else (programme, ingredients, roles, prices, goal) is the same unless listed." : "No differences in settings." },
      { title: "Recipe", rows: recipeRows, note: recipeRows.length ? "" : "Neither version has a valid recipe." },
      { title: "Cost", rows: costRows, note: "" },
      {
        title: "Nutrients",
        rows: [plain("Requirements", a.ver.sum.req ? a.ver.sum.met + " of " + a.ver.sum.req + " met" : sa.label, b.ver.sum.req ? b.ver.sum.met + " of " + b.ver.sum.req + " met" : sb.label), plain("Practical advisories", String(a.ver.sum.adv || 0), String(b.ver.sum.adv || 0))],
        note: "FeedSport doesn’t split a cost change between settings unless asked to re-run each change separately.",
      },
    ],
  };
}

function drawerVals(S: State, D: Draft, R: OptimalResult | null, ctx: { update: Update; applyDraft: (rerun: boolean) => void; removeDraft: () => void; engine: EngineContext; phase: ReturnType<typeof phaseOf>["phase"] }) {
  const { engine, phase } = ctx;
  const g = engine.catalogue.get(D.id);
  const isListRule = !!D.listId;
  const listRole = D.listRole ?? "available";
  const fs = isListRule ? 100 : fsLimit(engine, phase, D.id),
    guide = isListRule ? undefined : guideline(engine, phase, D.id);
  const inR = isListRule ? undefined : R?.recipe.find((r) => r.id === D.id);
  const err = draftErr(D, fs);
  const upd = (patch: Partial<Draft>) => ctx.update((s) => ({ drawer: s.drawer && { ...s.drawer, ...patch } }));
  const scale = isListRule ? 100 : Math.max(25, Math.min(100, (fs < 100 ? fs : 30) * 1.25));
  const px = (x: number) => Math.max(0, Math.min(100, (x / scale) * 100)) + "%";
  const userMax = D.max !== "" ? +D.max : null;
  const effLo = +D.min || 0;
  const effHi = isListRule && listRole === "fixed" ? effLo : userMax != null ? Math.min(userMax, fs) : Math.min(fs, scale);
  const lockHint = isListRule
    ? listRole === "fixed"
      ? "Every formulation started from this list will lock the ingredient at this percentage."
      : listRole === "required"
        ? "Every formulation started from this list must use at least this amount. Add a maximum if needed."
        : "The optimiser may use this ingredient up to your optional maximum."
    : +D.min > 0 && userMax != null && +D.min === userMax ? "Minimum equals maximum, so this ingredient is locked at " + D.min + "%." : +D.min > 0 ? "The recipe must contain at least " + D.min + "%. The optimiser picks the exact amount." : "The optimiser may use any amount up to the maximum. Set the same minimum and maximum to lock an amount.";
  const defP = g?.price?.usdPerTonne ?? null;
  const dispDef = defP == null ? null : D.unit === "t" ? defP : defP / 1000;
  const curPrice = D.price !== "" ? (D.unit === "t" ? +D.price : +D.price * 1000) : defP;
  const species: Species = S.species;
  let whyTitle = "",
    why = "";
  if (inR && R && g) {
    const parts = R.nutrients
      .filter((n) => n.limiting && n.value > 0 && REQUIREMENT_CATALOGUE_VALUE[n.id])
      .map((n) => ({ n, s: (((inR.pct / 100) * (g.nutrients[REQUIREMENT_CATALOGUE_VALUE[n.id](species)] || 0)) / n.value) * 100 }))
      .filter((x) => x.s >= 1)
      .sort((x, y) => y.s - x.s);
    whyTitle = "Why it’s in the recipe";
    why = (parts.length ? "Supplies " + parts.map((x) => fmt(x.s, 0) + "% of the " + x.n.name.toLowerCase()).join(", ") + (parts.length > 1 ? ", all limiting nutrients." : ", a limiting nutrient.") : "It mainly fills the mix cheaply.") + (inR.atMax ? " It is held at " + (inR.hi === fs ? "the FeedSport limit" : "your maximum") + "; the recipe would use more if it could." : inR.role === "fixed" ? " Its amount is fixed by you." : " It isn’t at any limit.");
  } else if (R && S.pool[D.id] && S.pool[D.id].role !== "excluded") {
    whyTitle = R.setAside.includes(D.id) ? "Why it was set aside" : "Why it isn’t used";
    why = R.setAside.includes(D.id) ? "The catalogue is missing a nutrient value this stage needs, so FeedSport can’t check what it would add." : "At this price it costs more than the nutrients it supplies are worth in this recipe. “Why this recipe” shows how much could enter for a little more cost.";
  }
  const meKey: CatalogueNutrientId = species === "broiler" ? "mePoultry" : "mePig";
  return {
    name: g?.name ?? D.id,
    sub: isListRule ? (g?.category ?? "Not in the catalogue") + " · reusable list rule" : (g?.category ?? "Not in the catalogue") + (inR ? " · in this recipe at " + fmt(inR.pct, inR.pct < 1 ? 2 : 1) + "%" : R ? " · not used in this recipe" : ""),
    hasRolePicker: isListRule,
    roleOptions: (["available", "required", "fixed", "excluded"] as Role[]).map((role) => ({
      label: ROLE[role],
      on: listRole === role,
      pick: () => upd({
        listRole: role,
        ...(role === "available" || role === "excluded" ? { min: "" } : {}),
        ...(role === "fixed" || role === "excluded" ? { max: "" } : {}),
      }),
    })),
    showLimits: !isListRule || listRole !== "excluded", limitsTitle: isListRule ? "Reusable inclusion rule" : "Inclusion limits · hard",
    showMin: !isListRule || listRole === "required" || listRole === "fixed", showMax: !isListRule || listRole === "available" || listRole === "required",
    minLabel: isListRule && listRole === "fixed" ? "Fixed %" : "Minimum %", maxLabel: "Maximum %", limitHint: lockHint,
    min: D.min, max: D.max, maxPh: fs < 100 ? "Limit " + fs : "No limit", onMin: (e: InputEvent) => upd({ min: e.target.value }), onMax: (e: InputEvent) => upd({ max: e.target.value }),
    zl: px(effLo), zw: Math.max(0, ((Math.min(effHi, scale) - effLo) / scale) * 100) + "%", fx: px(Math.min(fs, scale)), hasUserMax: userMax != null, ux: px(userMax || 0), userMaxTxt: (userMax || 0) + "%", hasGuide: guide != null, gx: px(guide || 0), guideTxt: (guide || 0) + "%", fsTxt: isListRule ? "Per-stage" : fs < 100 ? fs + "%" : "No", fsNote: isListRule ? "FeedSport limits are applied when you formulate" : "FeedSport limit for this stage — you can tighten it, not exceed it", inRecipe: !!inR, cx: px(inR ? inR.pct : 0), cur: inR ? fmt(inR.pct, 1) : "", scaleMax: fmt(scale, 0) + "%",
    showPrice: !isListRule, price: D.price, pricePh: dispDef == null ? "No planning price — enter yours" : String(+dispDef.toFixed(3)), unitWord: D.unit === "t" ? "tonne" : "kg", onPrice: (e: InputEvent) => upd({ price: e.target.value }),
    units: (
      [
        ["kg", "kg"],
        ["t", "t"],
      ] as const
    ).map(([k, label]) => ({ label, bg: D.unit === k ? "#fff" : "transparent", pick: () => D.unit !== k && upd({ unit: k, price: D.price === "" ? "" : String(+(k === "t" ? +D.price * 1000 : +D.price / 1000).toFixed(4)) }) })),
    tag: D.price !== "" ? "YOUR PRICE" : defP == null ? "NO PRICE" : "DEFAULT", tagBg: D.price !== "" ? "#faecd0" : defP == null ? "#f7e4df" : "#f3f0e8", tagFg: D.price !== "" ? "#5c4012" : defP == null ? "#7a2a1c" : "#45473f",
    priceConv: curPrice == null ? "Least cost needs a price" : "= $" + fmt(curPrice, 0) + "/t · $" + fmt(curPrice / 1000, 3) + "/kg",
    canReset: D.price !== "" && defP != null, resetLabel: defP == null ? "" : "Reset to $" + fmt(D.unit === "t" ? defP : defP / 1000, D.unit === "t" ? 0 : 3) + " planning price", resetPrice: () => upd({ price: "" }),
    hasWhy: !!why, whyTitle, why,
    profile: CAT_NUTRIENTS.filter((n) => n.id !== (species === "broiler" ? "mePig" : "mePoultry")).map((n) => {
      const x = g?.nutrients[n.id] ?? null;
      const missing = x == null && !!g?.expected.includes(n.id);
      return { name: n.id === meKey ? "Metabolisable energy (" + (species === "broiler" ? "poultry" : "pig") + ")" : n.name, val: x == null ? (missing ? "Missing" : "—") : n.unit === "%" ? fmt(x, n.dp) + "%" : fmt(x, n.dp) + " " + n.unit, color: missing ? "#a63d2a" : x == null ? "#64665c" : "#222420" };
    }),
    hasErr: !!err, err: err || "", applyBg: err ? "#b9b6ab" : "#2f5a3f",
    applyOnlyLabel: isListRule ? "Save reusable rule" : "Apply only", showApplyRun: !isListRule,
    footerNote: isListRule ? "New formulations copy this rule. Existing and saved formulations are unchanged." : "“Apply only” keeps the current recipe on screen and marks it out of date.",
    applyOnly: () => ctx.applyDraft(false), applyRun: () => ctx.applyDraft(true),
    removeLabel: isListRule ? "Remove from list" : "Remove",
    remove: ctx.removeDraft,
  };
}

function authVals(S: State, ctx: { update: Update; flash: (m: string) => void; signInWithGoogle: () => void; next: string; finishReset: () => void }) {
  const { update, flash } = ctx;
  const A = S.screen as AuthScreen,
    f = S.af,
    err = S.aErr;
  const set = (k: keyof AuthForm) => (e: InputEvent) => {
    const value = e.target.value;
    update((s) => ({ af: { ...s.af, [k]: value }, aErr: { ...s.aErr, [k]: "", form: "" } }));
  };
  const go = (screen: AuthScreen) => () => update({ screen, aErr: {}, aBusy: false, aSent: null });
  const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const newPasswordError = (pw: string) => (pw.length < 8 ? "Use at least 8 characters." : !/\d/.test(pw) || !/[a-z]/i.test(pw) ? "Include at least one letter and one number." : null);
  const validate = () => {
    const e: State["aErr"] = {};
    if (A !== "reset" && !emailOk(f.email)) e.email = f.email ? "Enter a valid email address." : "Enter your email address.";
    if (A === "signin" && !f.password) e.password = "Enter your password.";
    if (A === "signup" && !f.name.trim()) e.name = "Enter your name.";
    if (A === "signup" || A === "reset") {
      const pwErr = newPasswordError(f.password);
      if (pwErr) e.password = pwErr;
    }
    return e;
  };
  // Links in emails come back through /auth/callback, which sets the session.
  const callback = (next: string) => window.location.origin + "/auth/callback?next=" + encodeURIComponent(next);
  const sendReset = () => createClient().auth.resetPasswordForEmail(f.email.trim(), { redirectTo: callback(BASE + "/reset-password") });
  const sendConfirm = () => createClient().auth.resend({ type: "signup", email: f.email.trim(), options: { emailRedirectTo: callback(ctx.next) } });
  const fail = (error: { message: string; code?: string }) => update({ aBusy: false, aErr: { form: authMessage(error) } });

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (S.aBusy) return;
    const e = validate();
    if (Object.keys(e).length) return update({ aErr: e });
    if (!isSupabaseConfigured) return update({ aErr: { form: "Sign-in isn’t available right now. Try again later." } });
    update({ aBusy: true, aErr: {} });
    const auth = createClient().auth;
    if (A === "signin") {
      const { error } = await auth.signInWithPassword({ email: f.email.trim(), password: f.password });
      // On success the session change takes the visitor on (see useStudio).
      if (error) fail(error);
    } else if (A === "signup") {
      const { data, error } = await auth.signUp({
        email: f.email.trim(),
        password: f.password,
        options: { data: { full_name: titleCase(f.name), role: f.role, ...(f.org.trim() ? { org: f.org.trim() } : {}) }, emailRedirectTo: callback(ctx.next) },
      });
      if (error) fail(error);
      // No session yet means the email must be confirmed first.
      else if (!data.session) update({ aBusy: false, aSent: "confirm", af: { ...f, password: "" } });
    } else if (A === "forgot") {
      const { error } = await sendReset();
      if (error) fail(error);
      else update({ aBusy: false, aSent: "reset" });
    } else {
      const { error } = await auth.updateUser({ password: f.password });
      if (error) fail(error);
      else {
        flash("Password updated. You’re signed in.");
        ctx.finishReset();
      }
    }
  };
  const resend = async () => {
    const { error } = await (S.aSent === "confirm" ? sendConfirm() : sendReset());
    flash(error ? authMessage(error) : "Link sent again to " + f.email.trim());
  };
  const fld = (k: keyof AuthForm) => ({ val: f[k], on: set(k), err: err[k] || "", hasErr: !!err[k], bd: err[k] ? "#b2412e" : "#d0cdc3" });
  const titles: Record<AuthScreen | "sent-reset" | "sent-confirm", [string, string]> = {
    signin: ["Sign in", "Welcome back. Your formulations and ingredient lists are waiting."],
    signup: ["Create your account", "Free for farmers. Takes a minute."],
    forgot: ["Reset your password", "Enter the email you signed up with and we’ll send a reset link."],
    reset: ["Choose a new password", "Use at least 8 characters, with a letter and a number. You’ll stay signed in."],
    "sent-reset": ["Check your email", "If an account exists for " + (f.email.trim() || "that address") + ", a reset link is on its way. Open it on this device."],
    "sent-confirm": ["Confirm your email", "We sent a link to " + (f.email.trim() || "your email") + ". Open it on this device to finish creating your account."],
  };
  const [aTitle, aSub] = titles[S.aSent ? (`sent-${S.aSent}` as const) : A];
  const pw = f.password;
  const busyLabel: Record<AuthScreen, string> = { signin: "Signing in…", signup: "Creating account…", forgot: "Sending…", reset: "Saving…" };
  const label: Record<AuthScreen, string> = { signin: "Sign in", signup: "Create account", forgot: "Send reset link", reset: "Update password" };
  return {
    aSignin: A === "signin", aSignup: A === "signup", aForgot: A === "forgot" && !S.aSent, aReset: A === "reset", aSent: !!S.aSent, aForm: !S.aSent,
    aNeedsPass: A === "signin" || A === "signup" || A === "reset", aNeedsEmail: A !== "reset", aShowChecks: A === "signup" || A === "reset", aShowGoogle: A === "signin" || A === "signup",
    aTitle, aSub, aEmail: fld("email"), aPass: fld("password"), aName: fld("name"), aOrg: fld("org"),
    aPassType: S.aShow ? "text" : "password", aShowLabel: S.aShow ? "Hide" : "Show", aToggleShow: () => update({ aShow: !S.aShow }),
    aChecks: ([["8+ characters", pw.length >= 8], ["A letter", /[a-z]/i.test(pw)], ["A number", /\d/.test(pw)]] as const).map(([label, ok]) => ({ label, color: ok ? "#2b6a42" : "#64665c", mark: ok ? "✓" : "·" })),
    aFormErr: err.form || "", aHasFormErr: !!err.form,
    aRoles: ROLES.map(([k, label, sub]) => {
      const on = f.role === k;
      return { label, sub, ring: on ? "inset 0 0 0 1px #2f5a3f" : "none", bg: on ? "#eef3ee" : "#fff", radio: on ? "5px solid #2f5a3f" : "1.5px solid #8d8a80", pick: () => update((s) => ({ af: { ...s.af, role: k } })) };
    }),
    aSubmit: submit, aBusy: S.aBusy,
    aBtn: S.aBusy && !S.aGoogleBusy ? busyLabel[A] : label[A],
    aBtnBg: S.aBusy && !S.aGoogleBusy ? "#45473f" : "#2f5a3f",
    goSignin: go("signin"), goSignup: go("signup"), goForgot: go("forgot"),
    aGoogle: ctx.signInWithGoogle,
    aGoogleLabel: S.aGoogleBusy ? "Opening Google…" : "Continue with Google",
    aResend: resend,
  };
}

function libraryVals(
  S: State,
  ctx: {
    update: Update;
    flash: (m: string) => void;
    catalogue: CatalogueIngredient[];
    nutrients: StudioNutrientData;
    programmes: StudioProgrammeData;
    myLists: MyLists;
    replaceUrl: () => void;
    formulateWithList: (list: IngredientList) => void;
    formulateProgramme: (programmeId: string, phaseId: string) => void;
  },
) {
  const { update, flash, catalogue, myLists } = ctx;
  const byId = new Map(catalogue.map((g) => [g.id, g]));
  // My ingredients: the user's lists from the database.
  const lists = myLists.lists;
  const cur = currentList(S, myLists);
  const daysSince = (iso: string) => Math.floor((Date.now() - Date.parse(iso)) / day);
  const setList = lists.map((l) => {
    const old = l.items.filter((it) => it.price != null && it.priceUpdatedAt && daysSince(it.priceUpdatedAt) > 30).length;
    const on = l.id === cur?.id;
    return { badge: l.isDefault ? "DEFAULT" : "", label: l.label || "Untitled list", sub: l.items.length + " ingredient" + (l.items.length === 1 ? "" : "s") + " · " + l.items.filter((it) => it.price != null).length + " with your price", hasWarn: old > 0, warn: old + " price" + (old > 1 ? "s" : "") + " over 30 days old", ring: on ? "inset 0 0 0 1px #2f5a3f" : "none", bg: on ? "#eef3ee" : "#fff", pick: () => update({ myListSel: l.id, listRename: null }) };
  });
  const setRows = cur
    ? cur.items.map((it) => {
        const g = byId.get(it.ingredientId);
        const planning = g?.price?.usdPerTonne ?? null;
        const has = it.price != null;
        const age = it.priceUpdatedAt ? daysSince(it.priceUpdatedAt) : 0;
        const priceState = myLists.priceState(cur.id, it.ingredientId, it.price);
        return {
          id: it.ingredientId,
          name: g?.name ?? it.ingredientId,
          cat: g?.category ?? "No longer in the catalogue",
          def: planning != null ? "$" + fmt(planning, 0) : "None",
          rule: roleShort(poolEntryFromListItem(it)),
          editRule: () => update({
            drawer: {
              id: it.ingredientId,
              listId: cur.id,
              listRole: it.role,
              min: it.role === "fixed" ? String(it.fixedPct ?? "") : it.role === "required" ? String(it.minPct ?? "") : "",
              max: it.role === "available" || it.role === "required" ? String(it.maxPct ?? "") : "",
              price: "",
              unit: "t",
            },
          }),
          price: myLists.priceText(cur.id, it.ingredientId, it.price),
          onPrice: (e: InputEvent) => myLists.setPrice(cur.id, it.ingredientId, e.target.value),
          age: priceState?.label ?? (!has ? (planning != null ? "Uses default" : "Needs a price") : age === 0 ? "Updated today" : "Updated " + age + " day" + (age === 1 ? "" : "s") + " ago"),
          ageColor: priceState?.color ?? (has && age > 30 ? "#8a5f18" : !has && planning == null ? "#a63d2a" : "#64665c"),
          ageDot: priceState?.dot ?? (has && age > 30),
          remove: () => void myLists.removeItem(cur.id, it.ingredientId),
        };
      })
    : [];
  const createNamed = async () => {
    const name = (S.listCreate ?? "").trim();
    if (!name) return flash("Give the list a name first");
    const list = await myLists.createList(name);
    if (list) update({ myListSel: list.id, listCreate: null });
  };
  const saveRename = async () => {
    const name = (S.listRename ?? "").trim();
    if (!cur) return;
    if (!name) return flash("A list needs a name");
    update({ listRename: null });
    if (name !== cur.label) await myLists.renameList(cur.id, name);
  };
  const progs = ctx.programmes.programmes;
  const PP = progs.find((p) => p.id === S.progSel) ?? progs.find((p) => p.id === "grow-finish-pig") ?? progs[0];
  const phase = PP.phases.find((ph) => ph.id === S.progPhase) ?? PP.phases[0];
  const reqNum = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 3 });
  const progLimRows = [
    ...phase.programmeLimits.map((l) => ({ name: l.name, limit: "max " + l.maxPct + "%", guide: "programme limit", guideColor: "#8a5f18" })),
    ...(phase.limitsKey ? ctx.programmes.limits[phase.limitsKey] : []).map((l) => ({ name: l.name, limit: "max " + l.maxPct + "%", guide: l.practicalPct != null ? "up to " + l.practicalPct + "%" : "—", guideColor: l.practicalPct != null ? "#8a5f18" : "#8d8a80" })),
  ];
  const LIMITS_PREVIEW = 12;
  const catAll = catalogueMatches(catalogue, S.catQ);
  const catSel = S.catSel ? catalogue.find((g) => g.id === S.catSel) || null : null;
  const ps = S.catPageSize,
    pages = Math.max(1, Math.ceil(catAll.length / ps)),
    page = Math.min(Math.max(1, S.catPage), pages);
  const from = (page - 1) * ps,
    to = Math.min(catAll.length, from + ps);
  const goPage = (p: number) => () => p >= 1 && p <= pages && p !== page && update({ catPage: p });
  type PageBtn = { label: string; bg: string; fg: string; bd: string; go: () => void };
  const catVal = (n: (typeof CAT_NUTRIENTS)[number], x: number) => (n.unit === "%" ? fmt(x, n.dp) + "%" : fmt(x, n.dp) + " " + n.unit);
  const catD = catSel
    ? {
        name: catSel.name,
        sub: catSel.category + " · " + (catSel.price ? "planning price $" + fmt(catSel.price.usdPerTonne, 0) + " / t · " + catSel.price.market : "no planning price"),
        close: () => update({ catSel: null }),
        // Values the library doesn't publish read "Missing" only where this kind of ingredient should have one.
        profile: CAT_NUTRIENTS.map((n) => {
          const x = catSel.nutrients[n.id];
          const missing = x == null && catSel.expected.includes(n.id);
          return { name: n.name, val: x != null ? catVal(n, x) : missing ? "Missing" : "—", color: missing ? "#a63d2a" : x == null ? "#64665c" : "#222420" };
        }),
        limits: catSel.limits.map((l) => ({ name: l.stage, limit: "max " + l.maxPct + "%", guide: l.practicalPct != null ? "guideline " + l.practicalPct + "%" : "" })),
        noLimits: catSel.limits.length === 0,
        sets:
          myLists.status !== "ready"
            ? []
            : lists.length
              ? lists.map((l) => {
                  const inSet = l.items.some((it) => it.ingredientId === catSel.id);
                  return { label: (inSet ? "✓ In " : "+ Add to ") + (l.label || "Untitled list"), inSet, color: inSet ? "#64665c" : "#2f5a3f", bd: inSet ? "#e2dfd6" : "#2f5a3f", add: () => { if (inSet) return; void myLists.addItem(l.id, catSel.id); flash(catSel.name + " added to " + (l.label || "your list")); } };
                })
              : [{ label: "+ Add to a new list", inSet: false, color: "#2f5a3f", bd: "#2f5a3f", add: async () => { const l = await myLists.createList("My ingredients"); if (!l) return; await myLists.addItem(l.id, catSel.id); flash(catSel.name + " added to “My ingredients”"); } }],
      }
    : null;
  return {
    isIngredients: S.screen === "ingredients", isProgrammes: S.screen === "programmes", isNutrientsRef: S.screen === "nutrients", isCatalogue: S.screen === "catalogue",
    myStatus: myLists.status, myNoLists: myLists.status === "ready" && lists.length === 0, myRetry: () => void myLists.reload(),
    setList, setRows, setEmpty: setRows.length === 0, setName: cur ? cur.label || "Untitled list" : "", setNameMax: MAX_LIST_LABEL,
    setIsDefault: !!cur?.isDefault,
    // Naming a new list: the name is asked for before the list exists.
    newSet: () => update({ listCreate: "", listRename: null }),
    creating: S.listCreate !== null,
    createVal: S.listCreate ?? "",
    onCreateChange: (e: InputEvent) => update({ listCreate: e.target.value }),
    createSave: () => void createNamed(),
    createCancel: () => update({ listCreate: null }),
    onCreateKey: (e: KeyEvent) => {
      if (e.key === "Enter") void createNamed();
      if (e.key === "Escape") update({ listCreate: null });
    },
    // Renaming the list on screen.
    renaming: S.listRename !== null,
    renameVal: S.listRename ?? "",
    startRename: () => cur && update({ listRename: cur.label, listCreate: null }),
    onRenameChange: (e: InputEvent) => update({ listRename: e.target.value }),
    renameSave: () => void saveRename(),
    renameCancel: () => update({ listRename: null }),
    onRenameKey: (e: KeyEvent) => {
      if (e.key === "Enter") void saveRename();
      if (e.key === "Escape") update({ listRename: null });
    },
    makeDefault: () => {
      if (!cur || cur.isDefault) return;
      void myLists.setDefault(cur.id);
      flash("“" + cur.label + "” is now your default list");
    },
    deleteSet: () => {
      if (!cur) return;
      const name = cur.label || "this list";
      const others = lists.filter((l) => l.id !== cur.id);
      const handover = cur.isDefault && others.length ? " “" + others[0].label + "” will become your default." : "";
      // Lists are stored for good, so make sure before removing one.
      if (!window.confirm("Delete “" + name + "” and its " + cur.items.length + " ingredient" + (cur.items.length === 1 ? "" : "s") + "?" + handover)) return;
      void myLists.deleteList(cur.id);
      update({ myListSel: null, listRename: null });
      flash("Deleted “" + name + "”. Saved formulations keep their own copy.");
    },
    addToSet: () => update({ addOpen: true, addQ: "", addPick: [], addTarget: "set" }),
    formulateWithSet: () => cur && ctx.formulateWithList(cur),
    progGroups: (
      [
        ["swine", "Pigs"],
        ["broiler", "Poultry"],
      ] as const
    ).map(([sp, label]) => ({
      label,
      items: progs
        .filter((p) => p.species === sp)
        .map((p) => {
          const on = p.id === PP.id;
          return { name: p.name, range: p.span, meta: p.source + " · " + p.phases.length + " phase" + (p.phases.length === 1 ? "" : "s"), bg: on ? "#eef3ee" : "#fff", ring: on ? "inset 0 0 0 1px #2f5a3f" : "none", pick: () => update({ progSel: p.id, progPhase: null, progAllLimits: false }) };
        }),
    })),
    progD: { name: PP.name, sub: "Source: " + PP.source + " · " + PP.phases.length + " phase" + (PP.phases.length === 1 ? "" : "s") + " · as fed" },
    progPhases:
      PP.phases.length > 1
        ? PP.phases.map((ph, i) => {
            const on = ph.id === phase.id;
            return { name: ph.label, meta: ph.label.includes(ph.weightRange) ? "Table " + ph.sourceTable : ph.weightRange, bg: on ? "#eef3ee" : "#fff", ring: on ? "inset 0 0 0 1px #2f5a3f" : "none", pick: () => update({ progPhase: i === 0 ? null : ph.id, progAllLimits: false }) };
          })
        : [],
    progReq: ctx.programmes.requirementFields.flatMap((f, i) => {
      const value = phase.requirements[i];
      if (value == null) return [];
      return [{ name: PP.species === "broiler" && f.broilerName ? f.broilerName : f.name, unit: f.kind === "target" ? f.unit + " · target" : f.unit, min: f.unit === "%" ? reqNum(value) + "%" : reqNum(value), max: "—" }];
    }),
    progReqNote: "Table " + phase.sourceTable + ", page " + phase.sourcePage + " · " + phase.weightRange + ". Energy is a published target; every other value is a minimum.",
    progLim: S.progAllLimits ? progLimRows : progLimRows.slice(0, LIMITS_PREVIEW),
    progLimEmpty: progLimRows.length === 0,
    progLimMore: progLimRows.length > LIMITS_PREVIEW ? { label: S.progAllLimits ? "Show the tightest " + LIMITS_PREVIEW : "Show all " + progLimRows.length + " ingredients", toggle: () => update({ progAllLimits: !S.progAllLimits }) } : null,
    progLimNote: phase.columnLabel ? "Limits: " + ctx.programmes.limitsSource + ", " + phase.columnLabel + " column, tightest first." : "Table 1.01 publishes no column for this stage.",
    formulateProg: () => ctx.formulateProgramme(PP.id, phase.id),
    nutGroups: [...new Set(ctx.nutrients.nutrients.map((n) => n.group))].map((group) => ({
      label: group,
      items: ctx.nutrients.nutrients
        .filter((n) => n.group === group)
        .map((n) => {
          const { programmeCount, ingredientCount } = ctx.nutrients;
          const all = n.ingredientsWithValue === ingredientCount;
          return {
            name: n.name,
            unit: n.units.join(" · "),
            desc: n.description + " " + n.formulationRole,
            used: n.programmesRequiring ? "Required in " + n.programmesRequiring + " of " + programmeCount + " programmes" : "Not required by any programme",
            // Most ingredients carry no vitamin or trace-mineral data by design,
            // so partial coverage is reported plainly rather than as an error.
            miss: all ? "All " + ingredientCount + " ingredients have a value" : "Values for " + n.ingredientsWithValue + " of " + ingredientCount + " ingredients",
            missColor: all ? "#2b6a42" : "#64665c",
          };
        }),
    })),
    catQ: S.catQ,
    onCatQ: (e: InputEvent) => {
      ctx.replaceUrl(); // typing shouldn't add a history entry per keystroke
      update({ catQ: e.target.value, catPage: 1 });
    },
    catPager: {
      text: catAll.length ? "Showing " + (from + 1) + "–" + to + " of " + catAll.length : "0 results", prev: goPage(page - 1), next: goPage(page + 1), prevColor: page > 1 ? "#222420" : "#b9b6ab", nextColor: page < pages ? "#222420" : "#b9b6ab", prevDisabled: page <= 1, nextDisabled: page >= pages,
      pages: Array.from({ length: pages }, (_, i) => i + 1)
        .filter((p) => pages <= 7 || p === 1 || p === pages || Math.abs(p - page) <= 1)
        .reduce<PageBtn[]>((acc, p, i, arr) => {
          if (i && p - arr[i - 1] > 1) acc.push({ label: "…", bg: "transparent", fg: "#64665c", bd: "transparent", go: () => {} });
          acc.push({ label: String(p), bg: p === page ? "#222420" : "#fff", fg: p === page ? "#faf8f3" : "#222420", bd: p === page ? "#222420" : "#d0cdc3", go: goPage(p) });
          return acc;
        }, []),
      size: String(ps), onSize: (e: InputEvent) => update({ catPageSize: +e.target.value, catPage: 1 }),
    },
    catRows: catAll.slice(from, to).map((g) => {
      const missing = g.expected.some((id) => g.nutrients[id] == null);
      const on = g.id === S.catSel;
      const num = (x: number | null, dp: number, unit = "") => (x == null ? "—" : fmt(x, dp) + unit);
      return { id: g.id, name: g.name, cat: g.category, price: g.price ? "$" + fmt(g.price.usdPerTonne, 0) : "—", cp: num(g.nutrients.cp, 1, "%"), me: num(g.nutrients.mePig, 0), lys: num(g.nutrients.lys, 2, "%"), data: missing ? "Incomplete" : "Complete", dataColor: missing ? "#a63d2a" : "#2b6a42", dataDot: missing ? "#b2412e" : "#2f7a4a", dataR: missing ? "0" : "50%", bg: on ? "#f4f8f4" : "#fff", pick: () => update({ catSel: on ? null : g.id }) };
    }),
    catEmpty: catAll.length === 0,
    catD,
  };
}

const segOpt = (on: boolean) => ({ bg: on ? "#fff" : "transparent", sh: on ? "0 1px 2px rgba(0,0,0,.1)" : "none", w: on ? "600" : "500" });

// Top bar: search across actions, pages, saved formulations, the catalogue,
// your lists, programmes and nutrients; and the account menu.
type SearchIcon = "F" | "I" | "P" | "L" | "N" | "→" | "+";
const SEARCH_ICON: Record<SearchIcon, [string, string]> = { F: ["#eef3ee", "#1f3e2b"], I: ["#faecd0", "#5c4012"], P: ["#e8eef5", "#2a4560"], L: ["#f3f0e8", "#45473f"], N: ["#f3f0e8", "#45473f"], "→": ["#f3f0e8", "#45473f"], "+": ["#2f5a3f", "#ffffff"] };
const SEARCH_ORDER = ["Formulations", "Ingredients", "Programmes", "Ingredient lists", "Nutrients", "Pages", "Actions"];

function topBarVals(
  S: State,
  ctx: {
    update: Update;
    searchRef: RefObject<HTMLInputElement>;
    startGuided: () => void;
    startBlank: () => void;
    openVersion: (docId: string, v: number) => void;
    openDrawer: (id: string) => void;
    openAdvice: (docId: string, adviceId: string) => void;
    markAllAdviceRead: () => void;
    docs: SavedDoc[];
    catalogue: CatalogueIngredient[];
    myLists: MyLists;
    programmes: StudioProgrammeData;
    nutrients: StudioNutrientData;
  },
) {
  const { update, myLists, programmes } = ctx;
  const close = () => {
    update({ sOpen: false, sq: "", sIdx: 0, uOpen: false, nOpen: false });
    ctx.searchRef.current?.blur();
  };
  const nav = (patch: Partial<State>) => () => {
    close();
    update({ drawer: null, addOpen: false, rulesOpen: false, advisoriesOpen: false, ...patch });
  };
  const all: { group: string; icon: SearchIcon; label: string; sub: string; go: () => void; hay: string; lab: string }[] = [];
  const add = (group: string, icon: SearchIcon, label: string, sub: string, go: () => void, extra = "") => all.push({ group, icon, label, sub, go, hay: (label + " " + sub + " " + extra).toLowerCase(), lab: label.toLowerCase() });

  add("Actions", "+", "New formulation", "Guided: animal, ingredients, goal", () => { close(); ctx.startGuided(); }, "create start formulate");
  add("Actions", "+", "Open a blank workspace", "Skip the guide and set everything yourself", () => { close(); ctx.startBlank(); }, "advanced new");
  ([["home", "Home"], ["list", "Formulations"], ["ingredients", "My ingredients"], ["programmes", "Feeding programmes"], ["nutrients", "Nutrient data"], ["catalogue", "Ingredient catalogue"]] as [Screen, string][]).forEach(([screen, label]) =>
    add("Pages", "→", label, "Go to page", nav({ screen }), "page"),
  );
  ctx.docs.forEach((d) => {
    const v = d.versions[d.versions.length - 1];
    add("Formulations", "F", d.name, programmeLabel(programmes, v.snap) + " · v" + v.v + (v.sum.costT != null ? " · " + money(v.sum.costT) + "/t" : " · " + stOfSum(v.sum).label), () => { close(); ctx.openVersion(d.id, v.v); }, "recipe formulation");
  });
  const inWs = S.screen === "workspace";
  ctx.catalogue.forEach((g) => {
    const inLists = myLists.lists.filter((l) => l.items.some((it) => it.ingredientId === g.id)).map((l) => l.label);
    const here = inWs && !!S.pool[g.id];
    add("Ingredients", "I", g.name, (here ? "In this formulation · " : "") + g.category + " · " + (g.price ? "$" + fmt(g.price.usdPerTonne, 0) + "/t planning price" : "no planning price") + (inLists.length ? " · in " + inLists.join(", ") : ""),
      here ? () => { close(); ctx.openDrawer(g.id); } : nav({ screen: "catalogue", catSel: g.id, catQ: "", catPage: 1 }), "ingredient " + g.aliases.join(" "));
  });
  myLists.lists.forEach((l) => add("Ingredient lists", "L", l.label || "Untitled list", l.items.length + " ingredient" + (l.items.length === 1 ? "" : "s") + " · your prices", nav({ screen: "ingredients", myListSel: l.id, listRename: null }), "list my"));
  programmes.programmes.forEach((p) =>
    add("Programmes", "P", p.name, p.source + " · " + p.phases.length + " phase" + (p.phases.length === 1 ? "" : "s"), nav({ screen: "programmes", progSel: p.id, progPhase: null, progAllLimits: false }),
      (p.species === "swine" ? "pigs swine sow" : "poultry broiler chicken") + " programme stage " + p.phases.map((ph) => ph.label).join(" ")),
  );
  ctx.nutrients.nutrients.forEach((n) => add("Nutrients", "N", n.name, n.units.join(" · ") + " · nutrient reference", nav({ screen: "nutrients" }), n.shortName + " " + n.group + " nutrient"));

  const q = S.sq.trim().toLowerCase();
  const toks = q.split(/\s+/).filter(Boolean);
  let order: string[];
  let items: typeof all;
  if (!toks.length) {
    order = ["Actions", "Recent formulations", "Pages"];
    items = all.filter((i) => i.group === "Actions" || i.group === "Pages").concat(all.filter((i) => i.group === "Formulations").slice(0, 3).map((i) => ({ ...i, group: "Recent formulations" })));
  } else {
    order = SEARCH_ORDER;
    const score = (i: (typeof all)[number]) => (i.lab.startsWith(q) ? 0 : i.lab.includes(q) ? 1 : 2);
    const hits = all.filter((i) => toks.every((t) => i.hay.includes(t)));
    items = order.flatMap((g) => hits.filter((i) => i.group === g).sort((a, b) => score(a) - score(b)).slice(0, 5));
  }
  const flat = order.flatMap((g) => items.filter((i) => i.group === g));
  const idx = flat.length ? Math.min(S.sIdx, flat.length - 1) : -1;
  const sGroups = order
    .map((title) => ({
      title,
      items: flat
        .map((it, i) => ({ it, i }))
        .filter((x) => x.it.group === title)
        .map(({ it, i }) => ({ key: it.group + ":" + it.label + ":" + i, icon: it.icon, label: it.label, sub: it.sub, go: it.go, iconBg: SEARCH_ICON[it.icon][0], iconFg: SEARCH_ICON[it.icon][1], bg: i === idx ? "#eef3ee" : "transparent", enter: i === idx ? "1" : "0", hover: () => update((s) => (s.sIdx !== i ? { sIdx: i } : {})) })),
    }))
    .filter((g) => g.items.length);
  const onSKey = (e: KeyEvent) => {
    const n = flat.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (n) update({ sIdx: (idx + 1) % n, sOpen: true });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (n) update({ sIdx: (idx - 1 + n) % n, sOpen: true });
    } else if (e.key === "Enter") {
      e.preventDefault();
      flat[idx]?.go();
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  return {
    showTop: !!S.auth, searchRef: ctx.searchRef, sq: S.sq, sOpen: S.sOpen, sGroups, sEmpty: !!toks.length && !flat.length, sEmptyTitle: "No matches for “" + S.sq.trim() + "”",
    onSq: (e: InputEvent) => update({ sq: e.target.value, sOpen: true, sIdx: 0, uOpen: false, nOpen: false }),
    onSFocus: () => update((s) => (s.sOpen ? {} : { sOpen: true, uOpen: false, nOpen: false })),
    onSKey,
    sBd: S.sOpen ? "#2f5a3f" : "#d0cdc3", sBg: S.sOpen ? "#fff" : "#faf8f3", sRing: S.sOpen ? "0 0 0 3px #dbe7dc" : "none",
    uOpen: S.uOpen, toggleUser: () => update((s) => ({ uOpen: !s.uOpen, sOpen: false, nOpen: false })), uBtnBg: S.uOpen ? "#f3f0e8" : "transparent", uBtnBd: S.uOpen ? "#d0cdc3" : "transparent",
    userEmail: S.auth?.email ?? "", siteLabel: S.w >= 700 ? "Main site" : "Site",
    uUnits: ([["kg", "per kg"], ["t", "per tonne"]] as const).map(([k, label]) => ({ label, ...segOpt(S.unit === k), pick: () => update({ unit: k }) })),
    uItems: [
      { label: "Talk to a nutritionist", sub: "Reply in 1 day", go: () => update((s) => ({ uOpen: false, sOpen: false, cOpen: true, cSent: false, cErr: "", cTopic: s.screen === "workspace" && s.result?.status === "infeasible" ? "infeasible" : s.cTopic })) },
      { label: "My ingredient lists", sub: myLists.status === "ready" ? myLists.lists.length + (myLists.lists.length === 1 ? " list" : " lists") : "", go: nav({ screen: "ingredients" }) },
      { label: "Saved formulations", sub: String(ctx.docs.length), go: nav({ screen: "list" }) },
    ],
    anyMenu: S.sOpen || S.uOpen || S.nOpen, closeMenus: () => update({ sOpen: false, uOpen: false, nOpen: false }),
    ...notificationVals(S, ctx),
  };
}

// The bell: advice FeedSport's nutritionist left on the user's formulations, newest first.
const NOTIFICATION_LIMIT = 20;
function notificationVals(S: State, ctx: { update: Update; docs: SavedDoc[]; openAdvice: (docId: string, adviceId: string) => void; markAllAdviceRead: () => void }) {
  const all = ctx.docs.flatMap((d) => d.advice.map((a) => ({ d, a }))).sort((x, y) => y.a.date - x.a.date);
  const unread = all.filter((x) => !x.a.read).length;
  const excerpt = (body: string) => (body.length > 140 ? body.slice(0, 137).trimEnd() + "…" : body);
  return {
    nOpen: S.nOpen,
    nUnread: unread,
    nBadge: unread > 9 ? "9+" : String(unread),
    nLabel: unread ? unread + " unread " + (unread === 1 ? "advisory" : "advisories") : "Notifications",
    toggleNotifications: () => ctx.update((s) => ({ nOpen: !s.nOpen, uOpen: false, sOpen: false })),
    nItems: all.slice(0, NOTIFICATION_LIMIT).map(({ d, a }) => ({
      key: a.id,
      title: d.name,
      author: a.author,
      text: excerpt(a.body),
      date: new Date(a.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      unread: !a.read,
      go: () => {
        ctx.update({ nOpen: false });
        ctx.openAdvice(d.id, a.id);
      },
    })),
    nEmpty: all.length === 0,
    markAllRead: ctx.markAllAdviceRead,
  };
}

// Featured formulations on Home (see featured.ts). Only those that still meet
// their stage are shown; "Use as a starting point" opens an unsaved copy.
function featuredVals(S: State, list: FeaturedFormulation[], results: Record<string, FormulateResult> | null, ctx: { update: Update; run: () => void; flash: (m: string) => void; programmes: StudioProgrammeData }) {
  const F = S.featFilter;
  const featured = list.flatMap((f) => {
    const R = results?.[f.id];
    const { programme, phase } = phaseOf(ctx.programmes, f.snap.programmeId, f.snap.phaseId);
    if (R?.status !== "optimal" || (F !== "all" && programme.species !== F)) return [];
    const met = R.nutrients.filter((n) => n.status === "met").length;
    const names = R.recipe.map((x) => x.name);
    return [{
      id: f.id, prog: programme.name + " · " + phase.label, name: f.name, desc: f.desc, verified: true,
      ings: names.length + " ingredients · " + names.slice(0, 4).join(", ") + (names.length > 4 ? " +" + (names.length - 4) + " more" : ""),
      cost: money(R.costT, 0), met: met + " of " + R.nutrients.length + (R.advisories.length ? " · " + R.advisories.length + "◆" : ""), metColor: met === R.nutrients.length ? "#2b6a42" : "#a63d2a", goal: GOALS[f.snap.goal].label,
      author: f.author, initials: f.author.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase(), meta: f.role + " · " + f.place,
      use: () => {
        const s = clone(f.snap);
        const b = s.batch || 100;
        ctx.update({ ...freshDoc(programme.id, phase.id, programme.species, s.pool, f.name + " (copy)"), screen: "workspace", goal: s.goal, batch: b, batchMode: [50, 100, 1000].includes(b) ? String(b) : "custom", customBatch: String(b) });
        ctx.run();
        ctx.flash("Copied from " + f.author + ". It uses FeedSport planning prices — enter yours before mixing.");
      },
    }];
  });
  return {
    featured: featured.slice(0, 3), featLoading: !results, featEmpty: !!results && featured.length === 0,
    featFilters: ([["all", "All"], ["swine", "Pigs"], ["broiler", "Poultry"]] as const).map(([k, label]) => ({ label, ...segOpt(F === k), pick: () => ctx.update({ featFilter: k }) })),
  };
}

// "Talk to a nutritionist": the request lands in FeedSport's inquiries inbox,
// with the open formulation written out when you choose to attach it.
function contactVals(S: State, ctx: { update: Update; flash: (m: string) => void; user: Account | null; inWs: boolean; describe: () => string; docSub: string }) {
  const { update } = ctx;
  const attached = ctx.inWs && S.cAttach;
  const send = async () => {
    if (S.cBusy || !ctx.user) return;
    const digits = S.cPhone.replace(/\D/g, "");
    if (digits.length < 9) return update({ cErr: S.cPhone ? "Enter a full phone number, including the country code." : "Enter a phone or WhatsApp number so we can reach you." });
    const topic = CONTACT_TOPICS.find(([k]) => k === S.cTopic)![1];
    const message = ["Formulation studio · Talk to a nutritionist", "Topic: " + topic, S.cMsg.trim(), attached ? ctx.describe() : ""].filter(Boolean).join("\n\n").slice(0, 5000);
    update({ cBusy: true });
    try {
      const res = await saveContactInquiry({ name: titleCase(ctx.user.name), email: ctx.user.email, phone: S.cPhone.trim().slice(0, 40), message });
      if (!res.success) throw new Error(res.error);
      update({ cBusy: false, cSent: true });
    } catch (error) {
      console.error("Failed to send nutritionist request:", error);
      update({ cBusy: false });
      ctx.flash("Couldn’t send your request. Try again, or chat to us on WhatsApp.");
    }
  };
  return {
    closeContact: () => update({ cOpen: false, cBusy: false }),
    cOpen: S.cOpen, cSent: S.cSent,
    cTopics: CONTACT_TOPICS.map(([k, label]) => {
      const on = S.cTopic === k;
      return { key: k, label, ring: on ? "inset 0 0 0 1px #2f5a3f" : "none", bg: on ? "#eef3ee" : "#fff", radio: on ? "5px solid #2f5a3f" : "1.5px solid #8d8a80", pick: () => update({ cTopic: k }) };
    }),
    cCanAttach: ctx.inWs, cDocName: S.docName, cDocSub: ctx.docSub, cToggleAttach: () => update({ cAttach: !S.cAttach }), cAttachMark: S.cAttach ? "✓" : "", cAttachBg: S.cAttach ? "#2f5a3f" : "#fff", cAttachBd: S.cAttach ? "#2f5a3f" : "#b9b6ab",
    cPhone: S.cPhone, onCPhone: (e: InputEvent) => update({ cPhone: e.target.value, cErr: "" }), cPhoneErr: S.cErr, cPhoneBd: S.cErr ? "#b2412e" : "#d0cdc3",
    cMsg: S.cMsg, onCMsg: (e: ChangeEvent<HTMLTextAreaElement>) => update({ cMsg: e.target.value }),
    sendContact: () => void send(), cBusy: S.cBusy, cBtn: S.cBusy ? "Sending…" : "Send request", cBtnBg: S.cBusy ? "#45473f" : "#2f5a3f",
    cSentText: "A nutritionist will contact you on " + (S.cPhone.trim() || "your number") + " or at " + (ctx.user?.email || "your email") + " within one working day." + (attached ? " Your request includes “" + S.docName + "” as you have it now." : ""),
  };
}

export function FormulationStudio(props: StudioProps) {
  const studio = useStudio(props);
  return studio.ready ? <StudioView shell={studio.shell} v={studio.v} /> : <StudioView loading shell={studio.shell} />;
}

type Studio = ReturnType<typeof useStudio>;
export type ShellVals = Studio["shell"];
export type StudioVals = Extract<Studio, { ready: true }>["v"];

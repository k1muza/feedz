"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  addIngredientListItem,
  createIngredientList,
  createStarterIngredientList,
  deleteIngredientList,
  fetchIngredientLists,
  removeIngredientListItem,
  renameIngredientList,
  setDefaultIngredientList,
  setIngredientListItemPrice,
  type IngredientList,
  type IngredientListItem,
} from "@/lib/ingredient-lists";

// The signed-in user's ingredient lists for "My ingredients". Changes show at
// once; prices save after a short pause in typing, everything else straight
// away. If a save fails the lists reload from the database, so the screen
// never shows something that wasn't stored.

const SAVE_DELAY_MS = 600;
export const MAX_LIST_LABEL = 80;

interface QueuedWrite<T> {
  revision: number;
  write: () => Promise<T>;
  committed: (value: T) => void;
  failed: (error: unknown) => void;
}

/** Serializes debounced writes per key and only reconciles the latest edit. */
export class SerializedEditQueue<T> {
  private revisions = new Map<string, number>();
  private pending = new Map<string, QueuedWrite<T>>();
  private running = new Map<string, Promise<void>>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(private readonly delayMs: number) {}

  enqueue(key: string, write: () => Promise<T>, committed: (value: T) => void, failed: (error: unknown) => void) {
    const revision = (this.revisions.get(key) ?? 0) + 1;
    this.revisions.set(key, revision);
    this.pending.set(key, { revision, write, committed, failed });
    clearTimeout(this.timers.get(key));
    this.timers.set(key, setTimeout(() => this.drain(key), this.delayMs));
    return revision;
  }

  /** Supersedes both a pending value and any response already on the wire. */
  invalidate(key: string) {
    this.revisions.set(key, (this.revisions.get(key) ?? 0) + 1);
    clearTimeout(this.timers.get(key));
    this.timers.delete(key);
    this.pending.delete(key);
  }

  private drain(key: string) {
    clearTimeout(this.timers.get(key));
    this.timers.delete(key);
    if (this.running.has(key)) return;
    const edit = this.pending.get(key);
    if (!edit) return;
    this.pending.delete(key);
    const task = edit.write()
      .then((value) => {
        if (this.revisions.get(key) === edit.revision) edit.committed(value);
      })
      .catch((error: unknown) => {
        if (this.revisions.get(key) === edit.revision) edit.failed(error);
      })
      .finally(() => {
        this.running.delete(key);
        this.drain(key);
      });
    this.running.set(key, task);
  }

  async flush(match: (key: string) => boolean = () => true): Promise<void> {
    const keys = new Set([...this.pending.keys(), ...this.running.keys()].filter(match));
    keys.forEach((key) => this.drain(key));
    await Promise.all([...keys].map(async (key) => {
      while (this.running.has(key) || this.pending.has(key)) {
        this.drain(key);
        await this.running.get(key);
      }
    }));
  }
}

// What a new user starts with: common ingredients in Zimbabwean pig and
// poultry feed, all with FeedSport planning prices. With the oil and the
// synthetic amino acids it formulates 76 of the 94 loaded programme phases
// (nursery pre-starters need specialist proteins). The database creates it
// once per user (see create_starter_ingredient_list).
const STARTER_LIST = {
  label: "Farm stock",
  ingredientIds: [
    "corn-yellow-dent",
    "soybean-meal-solvent-extracted",
    "sunflower-meal-solvent-extracted",
    "wheat-bran",
    "limestone-ground",
    "dicalcium-phosphate",
    "sodium-chloride",
    "l-lysine-hcl",
    "dl-methionine",
    "soybean-degummed-oil",
    "l-threonine",
    "l-tryptophan",
    "l-valine",
    "l-isoleucine",
  ],
};

type Status = "idle" | "loading" | "ready" | "error";

// Default first, then oldest first: the order the database returns them in.
const ordered = (lists: IngredientList[]) => [...lists].sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.createdAt.localeCompare(b.createdAt));

export function useMyLists(userId: string | null, flash: (message: string) => void) {
  const [status, setStatus] = useState<Status>("idle");
  const [lists, setListsRaw] = useState<IngredientList[]>([]);
  const setLists = (update: (all: IngredientList[]) => IngredientList[]) => setListsRaw((all) => ordered(update(all)));
  // Raw text typed into price boxes, so "3" on the way to "320" isn't reformatted.
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const priceSaves = useRef<SerializedEditQueue<IngredientListItem> | null>(null);
  if (!priceSaves.current) priceSaves.current = new SerializedEditQueue(SAVE_DELAY_MS);

  const load = useCallback(async () => {
    if (!userId) return;
    setStatus("loading");
    try {
      let all = await fetchIngredientLists();
      // A first visit gets the starter list; the database makes sure that happens only once.
      if (all.length === 0 && (await createStarterIngredientList(STARTER_LIST.label, STARTER_LIST.ingredientIds))) all = await fetchIngredientLists();
      // Lists made before defaults existed: the oldest becomes the default.
      if (all.length && !all.some((l) => l.isDefault)) {
        await setDefaultIngredientList(all[0].id);
        all = all.map((l, i) => ({ ...l, isDefault: i === 0 }));
      }
      setListsRaw(ordered(all));
      setPriceDrafts({});
      setStatus("ready");
    } catch (error) {
      console.error("Failed to load ingredient lists:", error);
      setStatus("error");
    }
  }, [userId]);

  useEffect(() => {
    const saves = priceSaves.current!;
    const flush = () => void saves.flush();
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flushWhenHidden);
    if (userId) void load();
    else {
      setListsRaw([]);
      setStatus("idle");
    }
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flushWhenHidden);
      // React cleanup cannot await, but starting the serialized flush here
      // prevents a debounced edit from being silently discarded on teardown.
      flush();
    };
  }, [userId, load]);

  const failed = useCallback(
    (what: string) => (error: unknown) => {
      console.error(`Failed to ${what}:`, error);
      flash(`Couldn’t ${what}. Your lists have been reloaded.`);
      void load();
    },
    [flash, load],
  );

  const patchList = (id: string, patch: (list: IngredientList) => IngredientList) => setLists((all) => all.map((list) => (list.id === id ? patch(list) : list)));

  /** Creates a list; the first list a user has becomes their default. */
  const createList = async (label: string): Promise<IngredientList | null> => {
    try {
      const list = await createIngredientList(label.trim().slice(0, MAX_LIST_LABEL), !lists.some((l) => l.isDefault));
      setLists((all) => [...all, list]);
      return list;
    } catch (error) {
      failed("create the list")(error);
      return null;
    }
  };

  const renameList = async (id: string, label: string) => {
    const next = label.trim().slice(0, MAX_LIST_LABEL);
    if (!next) return;
    patchList(id, (list) => ({ ...list, label: next }));
    await renameIngredientList(id, next).catch(failed("rename the list"));
  };

  const setDefault = async (id: string) => {
    setLists((all) => all.map((list) => ({ ...list, isDefault: list.id === id })));
    await setDefaultIngredientList(id).catch(failed("change your default list"));
  };

  /** Deletes a list; if it was the default, the next list takes over. */
  const deleteList = async (id: string) => {
    await priceSaves.current!.flush((key) => key.startsWith(id + "|"));
    const wasDefault = lists.find((l) => l.id === id)?.isDefault;
    const next = lists.find((l) => l.id !== id);
    setLists((all) => all.filter((list) => list.id !== id).map((list) => (wasDefault && list.id === next?.id ? { ...list, isDefault: true } : list)));
    try {
      await deleteIngredientList(id);
      if (wasDefault && next) await setDefaultIngredientList(next.id);
    } catch (error) {
      failed("delete the list")(error);
    }
  };

  const addItem = async (listId: string, ingredientId: string) => {
    const list = lists.find((l) => l.id === listId);
    if (list?.items.some((item) => item.ingredientId === ingredientId)) return;
    try {
      const item = await addIngredientListItem(listId, ingredientId);
      patchList(listId, (l) => ({ ...l, items: [...l.items, item] }));
    } catch (error) {
      failed("add the ingredient")(error);
    }
  };

  const setPrice = (listId: string, ingredientId: string, text: string) => {
    const key = listId + "|" + ingredientId;
    setPriceDrafts((drafts) => ({ ...drafts, [key]: text }));
    const price = text.trim() === "" ? null : Number(text);
    // Wait for something storable: blank (use the planning price) or a positive number.
    if (price !== null && !(price > 0)) {
      priceSaves.current!.invalidate(key);
      return;
    }
    priceSaves.current!.enqueue(
      key,
      () => setIngredientListItemPrice(listId, ingredientId, price),
      (item) => {
        patchList(listId, (l) => ({ ...l, items: l.items.map((it) => (it.ingredientId === ingredientId ? item : it)) }));
        setPriceDrafts((drafts) => {
          const { [key]: _saved, ...rest } = drafts;
          return rest;
        });
      },
      failed("save the price"),
    );
  };

  const removeItem = async (listId: string, ingredientId: string) => {
    priceSaves.current!.invalidate(listId + "|" + ingredientId);
    patchList(listId, (l) => ({ ...l, items: l.items.filter((item) => item.ingredientId !== ingredientId) }));
    await removeIngredientListItem(listId, ingredientId).catch(failed("remove the ingredient"));
  };

  const priceText = (listId: string, ingredientId: string, price: number | null) => priceDrafts[listId + "|" + ingredientId] ?? (price == null ? "" : String(price));

  return { status, lists, reload: load, createList, renameList, setDefault, deleteList, addItem, setPrice, removeItem, priceText, flushPrices: () => priceSaves.current!.flush() };
}

export type MyLists = ReturnType<typeof useMyLists>;

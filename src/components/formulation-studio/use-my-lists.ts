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
} from "@/lib/ingredient-lists";

// The signed-in user's ingredient lists for "My ingredients". Changes show at
// once; prices save after a short pause in typing, everything else straight
// away. If a save fails the lists reload from the database, so the screen
// never shows something that wasn't stored.

const SAVE_DELAY_MS = 600;
export const MAX_LIST_LABEL = 80;

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
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

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
    const pending = timers.current;
    if (userId) void load();
    else {
      setListsRaw([]);
      setStatus("idle");
    }
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
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

  const later = (key: string, save: () => Promise<void>) => {
    clearTimeout(timers.current.get(key));
    timers.current.set(
      key,
      setTimeout(() => {
        timers.current.delete(key);
        void save();
      }, SAVE_DELAY_MS),
    );
  };

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
    if (price !== null && !(price > 0)) return;
    later("price:" + key, () =>
      setIngredientListItemPrice(listId, ingredientId, price)
        .then((item) => {
          patchList(listId, (l) => ({ ...l, items: l.items.map((it) => (it.ingredientId === ingredientId ? item : it)) }));
          setPriceDrafts((drafts) => {
            const { [key]: _saved, ...rest } = drafts;
            return rest;
          });
        })
        .catch(failed("save the price")),
    );
  };

  const removeItem = async (listId: string, ingredientId: string) => {
    patchList(listId, (l) => ({ ...l, items: l.items.filter((item) => item.ingredientId !== ingredientId) }));
    await removeIngredientListItem(listId, ingredientId).catch(failed("remove the ingredient"));
  };

  const priceText = (listId: string, ingredientId: string, price: number | null) => priceDrafts[listId + "|" + ingredientId] ?? (price == null ? "" : String(price));

  return { status, lists, reload: load, createList, renameList, setDefault, deleteList, addItem, setPrice, removeItem, priceText };
}

export type MyLists = ReturnType<typeof useMyLists>;

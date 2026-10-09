"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchFormulationAdvice, fetchFormulations, saveFormulationVersion } from "@/lib/formulations";

import type { SavedDoc, Snapshot, Summary } from "./engine";

// The signed-in user's saved formulations, as the studio's SavedDoc shape.

type Status = "idle" | "loading" | "ready" | "error";

export function useFormulations(userId: string | null) {
  const [status, setStatus] = useState<Status>("idle");
  const [docs, setDocs] = useState<SavedDoc[]>([]);

  const load = useCallback(async () => {
    if (!userId) return;
    setStatus("loading");
    try {
      const [rows, advice] = await Promise.all([fetchFormulations<Snapshot, Summary>(), fetchFormulationAdvice<Snapshot>()]);
      setDocs(
        rows.map((r) => ({
          id: r.id,
          name: r.name,
          versions: r.versions.map((v) => ({ v: v.version, date: Date.parse(v.createdAt), snap: v.snapshot, sum: v.summary })),
          advice: advice.filter((a) => a.formulationId === r.id).map((a) => ({ id: a.id, v: a.version, author: a.author, body: a.body, date: Date.parse(a.createdAt), suggestion: a.suggestedSnapshot })),
        })),
      );
      setStatus("ready");
    } catch (error) {
      console.error("Failed to load formulations:", error);
      setStatus("error");
    }
  }, [userId]);

  useEffect(() => {
    if (userId) void load();
    else {
      setDocs([]);
      setStatus("idle");
    }
  }, [userId, load]);

  /** Saves a new version (creating the formulation if id is null); returns its id and number. */
  const save = async (id: string | null, name: string, snap: Snapshot, sum: Summary) => {
    const saved = await saveFormulationVersion(id, name, snap, sum);
    setDocs((all) => {
      const existing = all.find((d) => d.id === saved.id);
      const doc: SavedDoc = { id: saved.id, name, versions: [...(existing?.versions ?? []), { v: saved.version, date: Date.parse(saved.createdAt), snap, sum }], advice: existing?.advice ?? [] };
      return [doc, ...all.filter((d) => d.id !== saved.id)];
    });
    return saved;
  };

  return { status, docs, reload: load, save };
}

export type Formulations = ReturnType<typeof useFormulations>;

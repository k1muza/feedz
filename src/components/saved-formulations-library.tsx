"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calculator, FilePenLine, LoaderCircle, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { editFeedFormulationHref, newFeedFormulationHref } from "@/lib/formulation-routes";
import {
  listSavedFeedFormulaSets,
  type SavedFeedFormulaSet,
} from "@/lib/saved-feed-formulations";

export function SavedFormulationsLibrary() {
  const [formulaSets, setFormulaSets] = useState<SavedFeedFormulaSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void listSavedFeedFormulaSets()
      .then((items) => {
        if (live) setFormulaSets(items);
      })
      .catch((reason: unknown) => {
        if (live) setError(reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Formulations</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">
            Open and update previously saved formula sets, or create a new least-cost formulation.
          </p>
        </div>
        <Button asChild>
          <Link href={newFeedFormulationHref()}>
            <Plus />
            New formulation
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex min-h-48 items-center justify-center rounded-xl border border-hairline bg-surface text-sm text-ink-muted">
          <LoaderCircle className="mr-2 size-4 animate-spin" />
          Loading saved formulations…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : formulaSets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-hairline bg-surface px-6 py-14 text-center">
          <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-raised text-ink-muted">
            <Calculator size={20} />
          </span>
          <h2 className="mt-4 text-base font-semibold text-ink">No saved formulations yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-ink-muted">
            Create a formulation, generate its recipes and save it to make it available here.
          </p>
          <Button asChild className="mt-5">
            <Link href={newFeedFormulationHref()}>
              <Plus />
              Create formulation
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {formulaSets.map((formulaSet) => (
            <FormulaSetCard key={formulaSet.id} formulaSet={formulaSet} />
          ))}
        </div>
      )}
    </div>
  );
}

function FormulaSetCard({ formulaSet }: { formulaSet: SavedFeedFormulaSet }) {
  const leastCost = formulaSet.recipes.find((recipe) => recipe.id === "least-cost");
  const savedDate = new Date(formulaSet.savedAt);

  return (
    <Card className="transition hover:border-ink-faint/40">
      <CardContent className="flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate font-semibold text-ink">{formulaSet.name}</h2>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-muted">
              {formulaSet.programmeName} · {formulaSet.phaseLabel}
            </p>
          </div>
          <Badge variant="secondary">{formulaSet.energySystem}</Badge>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-ink-faint">Batch weight</dt>
            <dd className="mt-1 font-medium text-ink">{formulaSet.targetBatchKg.toFixed(1)} kg</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-faint">Least cost</dt>
            <dd className="mt-1 font-medium text-ink">
              {leastCost ? `$${leastCost.costPerKg.toFixed(4)}/kg` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-faint">Recipes</dt>
            <dd className="mt-1 font-medium text-ink">{formulaSet.recipes.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-faint">Last saved</dt>
            <dd className="mt-1 font-medium text-ink">
              {Number.isNaN(savedDate.getTime()) ? "Unknown" : savedDate.toLocaleDateString()}
            </dd>
          </div>
        </dl>

        <Button asChild variant="outline" className="mt-5 w-full">
          <Link href={editFeedFormulationHref(formulaSet.id)}>
            <FilePenLine />
            Edit formulation
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

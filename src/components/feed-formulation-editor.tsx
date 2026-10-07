"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LoaderCircle } from "lucide-react";

import {
  FeedFormulationWorkbench,
  type IngredientOption,
  type ProgrammeOption,
} from "@/components/feed-formulation-workbench";
import { Badge } from "@/components/ui/badge";
import { feedFormulationHref } from "@/lib/formulation-routes";
import {
  getSavedFeedFormulaSet,
  type SavedFeedFormulaSet,
} from "@/lib/saved-feed-formulations";

export function FeedFormulationEditor({
  programmes,
  ingredients,
  formulationId,
}: {
  programmes: ProgrammeOption[];
  ingredients: IngredientOption[];
  formulationId?: string;
}) {
  const [savedFormulaSet, setSavedFormulaSet] = useState<SavedFeedFormulaSet | null>(null);
  const [loading, setLoading] = useState(Boolean(formulationId));
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!formulationId) return;
    let live = true;
    void getSavedFeedFormulaSet(formulationId).then((formulaSet) => {
      if (!live) return;
      setSavedFormulaSet(formulaSet);
      setMissing(!formulaSet);
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, [formulationId]);

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-ink-muted">
        <LoaderCircle className="mr-2 size-4 animate-spin" />
        Opening formulation…
      </div>
    );
  }

  if (missing) {
    return (
      <div className="rounded-xl border border-hairline bg-surface p-8 text-center">
        <h1 className="text-xl font-semibold text-ink">Formulation not found</h1>
        <p className="mt-2 text-sm text-ink-muted">
          This saved formulation is unavailable or has been removed.
        </p>
        <Link
          href={feedFormulationHref("formulations")}
          className="mt-5 inline-flex text-sm font-medium text-brand hover:underline"
        >
          Return to formulations
        </Link>
      </div>
    );
  }

  const editing = Boolean(savedFormulaSet);

  return (
    <div className="space-y-4">
      <Link
        href={feedFormulationHref("formulations")}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
      >
        <ArrowLeft size={14} />
        Formulations
      </Link>
      <FeedFormulationWorkbench
        key={savedFormulaSet?.id ?? "new"}
        programmes={programmes}
        ingredients={ingredients}
        initialFormulaSet={savedFormulaSet ?? undefined}
        header={
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              {editing ? savedFormulaSet?.name : "New formulation"}
            </h1>
            <Badge variant="secondary">GLPK least-cost solver</Badge>
          </div>
        }
        description={
          <p className="max-w-3xl text-sm leading-6 text-ink-muted">
            {editing
              ? "Review the saved setup, adjust inputs and regenerate before saving changes."
              : "Generate finished-feed diets from your available ingredients and current planning prices. FeedSport includes the required phase-specific vitamin-mineral premix and validates supplementation targets automatically."}
          </p>
        }
      />
    </div>
  );
}

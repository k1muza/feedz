import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CircleCheck,
  CircleDashed,
  FlaskConical,
  Layers3,
  Wheat,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { INGREDIENT_LIBRARY } from "@/lib/ingredient-nutrients";
import {
  BRAZILIAN_2024_HIGH_GROWTH_NUTRITION,
  BRAZILIAN_2024_STANDARD_GROWTH_NUTRITION,
} from "@/lib/nutrition";
import { FEED_PROGRAMMES } from "@/lib/feed-programmes";
import { feedFormulationHref } from "@/lib/formulation-routes";

export const metadata: Metadata = {
  title: "Feed Formulation",
  description: "Build least-cost livestock feed formulations from source-backed nutrient requirements and ingredient composition.",
  alternates: { canonical: "/dashboard" },
};

export default function FeedFormulationDashboard() {
  const loadedProgrammes = FEED_PROGRAMMES.filter(
    (programme) => programme.status === "loaded",
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Feed formulation</h1>
            <Badge variant="secondary">Brazilian Tables 2024 + PIC</Badge>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">
            Build feed decisions from source-backed ingredient composition and published nutrient
            requirements. Brazilian Tables 2024 remains the primary source, with PIC used for the
            mature-boar programme.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Ingredient library"
          value={INGREDIENT_LIBRARY.ingredients.length.toString()}
          detail="checked-in ingredients"
        />
        <SummaryCard
          label="Loaded programmes"
          value={loadedProgrammes.toString()}
          detail="Brazilian Tables and PIC programmes"
        />
        <SummaryCard
          label="Standard phases"
          value={BRAZILIAN_2024_STANDARD_GROWTH_NUTRITION.phases.length.toString()}
          detail="pre-starter through finisher"
        />
        <SummaryCard
          label="High-performance phases"
          value={BRAZILIAN_2024_HIGH_GROWTH_NUTRITION.phases.length.toString()}
          detail="pre-starter through finisher"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <WorkspaceLink
          href={feedFormulationHref("programmes")}
          icon={BookOpen}
          title="Programmes"
          description="Browse source-backed nutrient requirements by animal class, performance track and phase."
          action="Browse programmes"
        />
        <WorkspaceLink
          href={feedFormulationHref("formulations")}
          icon={Layers3}
          title="Formulations"
          description="Formulate diets and compare calculated nutrient profiles against a selected requirement phase."
          action="Open formulations"
        />
        <WorkspaceLink
          href={feedFormulationHref("ingredients")}
          icon={Wheat}
          title="Ingredients"
          description="Browse energy, protein, SID amino acids, minerals and source provenance ingredient by ingredient."
          action="Browse ingredients"
        />
        <WorkspaceLink
          href={feedFormulationHref("nutrients")}
          icon={FlaskConical}
          title="Nutrients"
          description="Browse the nutrient concepts used across programmes, ingredients and diet validation."
          action="Browse nutrients"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Formulation engine status</CardTitle>
          <CardDescription>
            What the standalone workspace can support from the requirement sources explicitly loaded into FeedSport.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <StatusRow
            ready
            label="Source-backed requirement catalogue"
            detail="Brazilian Tables 2024 supplies the growing and sow programmes, while PIC supplies the mature-boar programme."
          />
          <StatusRow
            ready
            label="Ingredient-weighted nutrient analysis"
            detail="Formulation profiles are calculated from ingredient records; missing ingredient values remain explicitly incomplete."
          />
          <StatusRow
            ready
            label="Diet validation"
            detail="Diet checks compare calculated profiles against the selected source-backed requirement phase."
          />
          <StatusRow
            ready
            label="Least-cost formulation solver"
            detail="GLPK solves modeled requirements from the selected programme as hard constraints, with a diagnostic pass when no exact diet is feasible."
          />
          <StatusRow
            label="Maximum-profit formulation"
            detail="Requires a supported marginal ADG/FCR response model; FeedSport will not infer one from the requirement tables."
          />
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</div>
        <div className="mt-2 text-3xl font-semibold tracking-tight text-ink">{value}</div>
        <div className="mt-1 text-sm text-ink-muted">{detail}</div>
      </CardContent>
    </Card>
  );
}

function WorkspaceLink({
  href,
  icon: Icon,
  title,
  description,
  action,
}: {
  href: string;
  icon: typeof Wheat;
  title: string;
  description: string;
  action: string;
}) {
  return (
    <Card className="transition hover:border-ink-faint/40">
      <CardHeader>
        <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-raised">
          <Icon size={18} strokeWidth={1.75} />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription className="leading-6">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Link href={href} className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline">
          {action}
          <ArrowRight size={14} />
        </Link>
      </CardContent>
    </Card>
  );
}

function StatusRow({
  ready = false,
  label,
  detail,
}: {
  ready?: boolean;
  label: string;
  detail: string;
}) {
  const Icon = ready ? CircleCheck : CircleDashed;
  return (
    <div className="flex gap-3 rounded-lg border border-hairline bg-raised/30 p-4">
      <Icon
        className={ready ? "mt-0.5 size-4 shrink-0 text-brand" : "mt-0.5 size-4 shrink-0 text-ink-faint"}
        strokeWidth={1.75}
      />
      <div>
        <div className="text-sm font-medium text-ink">{label}</div>
        <div className="mt-1 text-xs leading-5 text-ink-muted">{detail}</div>
      </div>
    </div>
  );
}



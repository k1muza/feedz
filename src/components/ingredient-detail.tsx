"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import {
  INGREDIENT_LIBRARY,
  sidAminoAcidPct,
  sttdPhosphorusPctOf,
  type IngredientNutrientRecord,
} from "@/lib/ingredient-nutrients";
import { feedFormulationHref } from "@/lib/formulation-routes";
import {
  ingredientDefaultPlanningPricePerTonne,
  ingredientDefaultPrice,
  ingredientImportPriceMultiplier,
} from "@/lib/feed-ingredient-prices";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function display(value: number | undefined, unit = ""): string {
  if (value === undefined) return "—";
  return `${Number(value.toFixed(4))}${unit ? ` ${unit}` : ""}`;
}

function ValueRows({ rows }: { rows: Array<[string, string]> }) {
  return (
    <Table>
      <TableBody>
        {rows.map(([label, value]) => (
          <TableRow key={label}>
            <TableCell className="text-sm text-ink-muted">{label}</TableCell>
            <TableCell className="text-right font-mono text-sm text-ink">{value}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function IngredientDetail({ ingredientId }: { ingredientId: string }) {
  const ingredient = INGREDIENT_LIBRARY.ingredients.find((row) => row.id === ingredientId);
  const defaultPrice = ingredientDefaultPrice(ingredientId);
  const planningPrice = ingredientDefaultPlanningPricePerTonne(ingredientId);
  const importMultiplier = defaultPrice
    ? ingredientImportPriceMultiplier(defaultPrice.sourceScope)
    : 1;
  const recordSource = ingredient?.provenance.source;
  const nutrientSources = ingredient
    ? Object.entries(ingredient.provenance.nutrientSources)
    : [];

  if (!ingredient) {
    return (
      <div className="space-y-4">
        <Link
          href={feedFormulationHref("ingredients")}
          className="inline-flex items-center gap-2 text-sm font-medium text-brand"
        >
          <ArrowLeft className="size-4" />
          Ingredient database
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Ingredient not found</CardTitle>
            <CardDescription>
              “{ingredientId}” is not present in the checked-in Brazilian Tables ingredient library.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={feedFormulationHref("ingredients")}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline"
        >
          <ArrowLeft className="size-4" />
          Ingredient database
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{ingredient.name}</h1>
          <Badge variant="secondary" className="capitalize">
            {ingredient.category.replaceAll("_", " ")}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-ink-muted">
          {ingredient.aliases.length > 0
            ? ingredient.aliases.join(" · ")
            : "Brazilian Tables feed ingredient"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Default market price</CardTitle>
          <CardDescription>
            Pricing is kept separate from Brazilian Tables nutrient composition and is only shown
            when FeedSport has a sourced market reference.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {defaultPrice ? (
            <div className="space-y-3">
              <div>
                <div className="text-3xl font-semibold tracking-tight text-ink">
                  US${planningPrice?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
                <div className="text-sm text-ink-muted">
                  planning default per tonne
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SourceFact label="Source price" value={`US${defaultPrice.usdPerTonne.toLocaleString()}/t`} />
                <SourceFact label="Market" value={defaultPrice.market} />
                <SourceFact label="Import multiplier" value={`×${importMultiplier.toFixed(2)}`} />
                <SourceFact label="Reference date" value={defaultPrice.asOf} />
              </div>
              {defaultPrice.note ? (
                <p className="text-xs leading-5 text-ink-muted">{defaultPrice.note}</p>
              ) : null}
              <a
                href={defaultPrice.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex text-sm font-medium text-brand underline underline-offset-4"
              >
                {defaultPrice.sourceLabel}
              </a>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-hairline px-4 py-5 text-sm text-ink-muted">
              No sourced default price has been loaded for this ingredient yet.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Composition & energy</CardTitle>
          </CardHeader>
          <CardContent>
            <ValueRows
              rows={[
                ["Dry matter", display(ingredient.composition.dryMatterPct, "%")],
                ["Crude protein", display(ingredient.composition.crudeProteinPct, "%")],
                ["Digestible protein (swine SID)", display(ingredient.composition.digestibleProteinPct, "%")],
                ["Crude fat", display(ingredient.composition.crudeFatPct, "%")],
                ["Linoleic acid", display(ingredient.composition.linoleicAcidPct, "%")],
                ["Crude fibre", display(ingredient.composition.crudeFibrePct, "%")],
                ["Ash", display(ingredient.composition.ashPct, "%")],
                ["Starch", display(ingredient.composition.starchPct, "%")],
                ["NDF", display(ingredient.composition.neutralDetergentFibrePct, "%")],
                ["ADF", display(ingredient.composition.acidDetergentFibrePct, "%")],
                ["DE", display(ingredient.energy.digestibleKcalKg, "kcal/kg")],
                ["ME", display(ingredient.energy.metabolizableKcalKg, "kcal/kg")],
                ["NE", display(ingredient.energy.netKcalKg, "kcal/kg")],
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Minerals</CardTitle>
          </CardHeader>
          <CardContent>
            <ValueRows
              rows={[
                ["Calcium", display(ingredient.macroMinerals.calciumPct, "%")],
                ["Total phosphorus", display(ingredient.macroMinerals.totalPhosphorusPct, "%")],
                [
                  "Digestible P coefficient",
                  display(ingredient.macroMinerals.sttdPhosphorusDigestibilityPct, "%"),
                ],
                [
                  "Standardized digestible phosphorus",
                  display(sttdPhosphorusPctOf(ingredient), "%"),
                ],
                ["Available phosphorus", display(ingredient.macroMinerals.availablePhosphorusPct, "%")],
                ["Sodium", display(ingredient.macroMinerals.sodiumPct, "%")],
                ["Chloride", display(ingredient.macroMinerals.chloridePct, "%")],
                ["Potassium", display(ingredient.macroMinerals.potassiumPct, "%")],
                ["Magnesium", display(ingredient.macroMinerals.magnesiumPct, "%")],
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <AminoAcids ingredient={ingredient} />

      {Object.keys(ingredient.traceMineralsPpm).length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Trace minerals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-hairline">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mineral</TableHead>
                    <TableHead className="text-right">ppm</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(ingredient.traceMineralsPpm).map(([name, value]) => (
                    <TableRow key={name}>
                      <TableCell className="capitalize text-ink-muted">{name}</TableCell>
                      <TableCell className="text-right font-mono">{display(value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nutrient-data provenance</CardTitle>
          <CardDescription>
            The source record is kept separate from any FeedSport-derived values and market pricing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-ink-muted">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SourceFact
              label="Source"
              value={recordSource?.title ?? INGREDIENT_LIBRARY.source.title}
            />
            <SourceFact
              label="Publisher"
              value={recordSource?.publisher ?? INGREDIENT_LIBRARY.source.publisher}
            />
            <SourceFact label="Table" value={ingredient.provenance.sourceTable ?? "—"} />
            <SourceFact
              label="Page"
              value={ingredient.provenance.sourcePage?.toString() ?? "—"}
            />
          </div>
          <p>
            <span className="font-medium text-ink">Source ingredient name:</span>{" "}
            {ingredient.provenance.sourceIngredientName ?? ingredient.name}
          </p>
          {[...ingredient.provenance.notes, ...ingredient.constraints.notes].map((note) => (
            <p key={note}>{note}</p>
          ))}

          {nutrientSources.length > 0 ? (
            <div className="space-y-2 pt-2">
              <div className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                Nutrient-specific fallback sources
              </div>
              <div className="overflow-x-auto rounded-lg border border-hairline">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nutrient field</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Priority</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nutrientSources.map(([path, source]) => (
                      <TableRow key={path}>
                        <TableCell className="font-mono text-xs">{path}</TableCell>
                        <TableCell>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-brand hover:underline"
                          >
                            {source.publisher}
                          </a>
                          {source.note ? (
                            <div className="mt-1 max-w-xl text-xs leading-5 text-ink-faint">
                              {source.note}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell className="capitalize text-ink-muted">
                          {source.priority ?? "primary"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}

          <a
            href={recordSource?.url ?? INGREDIENT_LIBRARY.source.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex font-medium text-brand underline underline-offset-4"
          >
            Open nutrient source
          </a>
        </CardContent>
      </Card>
    </div>
  );
}

function AminoAcids({ ingredient }: { ingredient: IngredientNutrientRecord }) {
  const names = Array.from(
    new Set([
      ...Object.keys(ingredient.aminoAcids.totalPct),
      ...Object.keys(ingredient.aminoAcids.sidPct),
    ]),
  );

  if (names.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Amino acids</CardTitle>
        <CardDescription>
          Brazilian Tables total, SID concentration and SID digestibility values are shown where
          the source publishes them. FeedSport derives SID only when a direct SID concentration is
          unavailable.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border border-hairline">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Amino acid</TableHead>
                <TableHead className="text-right">Total %</TableHead>
                <TableHead className="text-right">SID digestibility %</TableHead>
                <TableHead className="text-right">SID %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {names.map((name) => (
                <TableRow key={name}>
                  <TableCell className="capitalize text-ink-muted">{name}</TableCell>
                  <TableCell className="text-right font-mono">
                    {display(ingredient.aminoAcids.totalPct[name])}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {display(ingredient.aminoAcids.sidDigestibilityPct[name])}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {display(sidAminoAcidPct(ingredient, name))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function SourceFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-hairline bg-raised/40 p-3">
      <div className="text-[11px] uppercase tracking-wide text-ink-faint">{label}</div>
      <div className="mt-1 font-medium text-ink">{value}</div>
    </div>
  );
}

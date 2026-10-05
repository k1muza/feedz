"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

import { INGREDIENT_LIBRARY } from "@/lib/ingredient-nutrients";
import { ingredientDefaultPrice } from "@/lib/feed-ingredient-prices";
import { feedIngredientHref } from "@/lib/formulation-routes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const library = INGREDIENT_LIBRARY;
const PAGE_SIZE = 10;

function display(value: number | undefined, unit = ""): string {
  if (value === undefined) return "—";
  return `${Number(value.toFixed(3))}${unit ? ` ${unit}` : ""}`;
}

function sourceLabel(ingredient: (typeof library.ingredients)[number]): string {
  return ingredient.provenance.source?.year === 2024
    ? "Brazilian 2024"
    : ingredient.provenance.source?.publisher ?? library.source.publisher;
}

export function IngredientNutrientBrowser() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const ingredients = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return library.ingredients;

    return library.ingredients.filter((ingredient) => {
      const haystack = [
        ingredient.name,
        ingredient.id,
        ingredient.category,
        ...ingredient.aliases,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [query]);

  const pageCount = Math.max(1, Math.ceil(ingredients.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageIngredients = ingredients.slice(pageStart, pageStart + PAGE_SIZE);
  const firstResult = ingredients.length === 0 ? 0 : pageStart + 1;
  const lastResult = Math.min(pageStart + PAGE_SIZE, ingredients.length);

  const pages = useMemo(() => {
    if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);

    const candidates = new Set([
      1,
      pageCount,
      currentPage - 1,
      currentPage,
      currentPage + 1,
    ]);
    return [...candidates]
      .filter((candidate) => candidate >= 1 && candidate <= pageCount)
      .sort((a, b) => a - b);
  }, [currentPage, pageCount]);

  return (
    <Card>
      <CardHeader className="gap-3">
        <div>
          <CardTitle>Feed ingredient nutrient library</CardTitle>
          <CardDescription>
            Browse the canonical swine-feed ingredient set transcribed from the Brazilian Tables
            for Poultry and Swine, 5th Edition (2024).
          </CardDescription>
        </div>
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
          <Input
            aria-label="Search ingredients"
            placeholder="Search maize, soybean meal, limestone…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          <Badge variant="secondary">{library.ingredients.length} ingredients</Badge>
          <span>Brazilian Tables 2024 · Tables 1.01, 1.09 and 1.10</span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-hairline">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ingredient</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">CP</TableHead>
                <TableHead className="text-right">ME</TableHead>
                <TableHead className="text-right">NE</TableHead>
                <TableHead className="text-right">Default price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageIngredients.map((ingredient) => (
                <TableRow key={ingredient.id}>
                  <TableCell>
                    <Link
                      href={feedIngredientHref(ingredient.id)}
                      className="font-medium text-ink underline-offset-4 hover:underline"
                    >
                      {ingredient.name}
                    </Link>
                    {ingredient.aliases.length > 0 ? (
                      <div className="mt-1 text-xs text-ink-faint">
                        {ingredient.aliases.slice(0, 3).join(", ")}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{sourceLabel(ingredient)}</Badge>
                  </TableCell>
                  <TableCell className="capitalize text-ink-muted">
                    {ingredient.category.replaceAll("_", " ")}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {display(ingredient.composition.crudeProteinPct, "%")}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {display(ingredient.energy.metabolizableKcalKg, "kcal/kg")}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {display(ingredient.energy.netKcalKg, "kcal/kg")}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {ingredientDefaultPrice(ingredient.id)
                      ? `US$${ingredientDefaultPrice(ingredient.id)!.usdPerTonne.toLocaleString()}/t`
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {ingredients.length === 0 ? (
          <div className="rounded-lg border border-dashed border-hairline px-4 py-8 text-center text-sm text-ink-muted">
            No ingredients match “{query}”.
          </div>
        ) : (
          <div className="flex flex-col gap-3 border-t border-hairline pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-ink-muted">
              Showing {firstResult}–{lastResult} of {ingredients.length}
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <PaginationButton
                label="Previous"
                disabled={currentPage === 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                <ChevronLeft size={14} />
              </PaginationButton>

              {pages.map((pageNumber, index) => {
                const previous = pages[index - 1];
                return (
                  <span key={pageNumber} className="contents">
                    {previous !== undefined && pageNumber - previous > 1 ? (
                      <span className="px-1 text-xs text-ink-faint">…</span>
                    ) : null}
                    <button
                      type="button"
                      aria-current={pageNumber === currentPage ? "page" : undefined}
                      onClick={() => setPage(pageNumber)}
                      className={`min-w-8 rounded-md border px-2 py-1.5 text-xs transition ${
                        pageNumber === currentPage
                          ? "border-brand bg-brand-soft font-medium text-brand"
                          : "border-hairline text-ink-muted hover:bg-raised hover:text-ink"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  </span>
                );
              })}

              <PaginationButton
                label="Next"
                disabled={currentPage === pageCount}
                onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              >
                <ChevronRight size={14} />
              </PaginationButton>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PaginationButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-8 items-center justify-center rounded-md border border-hairline text-ink-muted transition hover:bg-raised hover:text-ink disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}

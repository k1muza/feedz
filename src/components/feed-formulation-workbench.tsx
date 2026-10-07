"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Calculator,
  ChevronDown,
  Download,
  Eye,
  FileSpreadsheet,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { downloadFile, XLSX_MIME } from "@/lib/download";
import {
  savedFeedFormulaResult,
  saveFeedFormulaSet,
  type SavedFeedFormulaSet,
} from "@/lib/saved-feed-formulations";
import { editFeedFormulationHref } from "@/lib/formulation-routes";
import {
  feedRecipeFormulaReportRows,
  feedRecipeReportFilename,
  type FeedRecipeReportInput,
} from "@/lib/feed-formulation-report";
import {
  ingredientDefaultPrice,
  ingredientDefaultPricePerKg,
  ingredientImportPriceMultiplier,
} from "@/lib/feed-ingredient-prices";
import type {
  FormulationIngredientOption,
  FormulationIngredientSuggestionResult,
  FormulationNutrientComparison,
  IngredientOpportunity,
  LeastCostFormulationResult,
} from "@/lib/feed-optimizer";

export type ProgrammeOption = {
  id: string;
  name: string;
  phases: {
    id: string;
    label: string;
    /** Phase-specific FeedSport max inclusion, where it differs from the static limit. */
    maxInclusionPct?: Record<string, number>;
    sourceTable: string;
    supplementationSourceTables?: readonly string[];
  }[];
};

export type IngredientOption = {
  id: string;
  name: string;
  category: string;
  minInclusionPct?: number;
  maxInclusionPct?: number;
};

type Row = {
  key: number;
  ingredientId: string;
  price: string;
  min: string;
  max: string;
};

const FIXED_PREMIX_ID = "fixed-commercial-premix";

type RecipeReportContext = {
  programmeName: string;
  phaseLabel: string;
  sourceTable?: string;
  energySystem: "ME" | "NE";
  targetBatchKg: number;
  ingredients: FeedRecipeReportInput["ingredients"];
};

type RecipeView = {
  id: string;
  label: string;
  description: string;
  solution: Extract<LeastCostFormulationResult, { status: "optimal" }>["solution"];
  nutrientProfile: readonly FormulationNutrientComparison[];
  costIncreasePct: number;
};

function recipeViews(
  result: Extract<LeastCostFormulationResult, { status: "optimal" }>,
): RecipeView[] {
  return [
    {
      id: "least-cost",
      label: "Least cost",
      description: "The minimum-cost formula for the prices entered above.",
      solution: result.solution,
      nutrientProfile: result.nutrientProfile,
      costIncreasePct: 0,
    },
    ...result.alternatives,
  ];
}

function defaultPriceInput(ingredientId: string): string {
  const price = ingredientDefaultPricePerKg(ingredientId);
  return price === undefined ? "" : price.toFixed(4);
}

export function FeedFormulationWorkbench({
  header,
  description,
  programmes,
  ingredients,
  initialFormulaSet,
}: {
  header: ReactNode;
  description: ReactNode;
  programmes: ProgrammeOption[];
  ingredients: IngredientOption[];
  initialFormulaSet?: SavedFeedFormulaSet;
}) {
  const router = useRouter();
  const firstProgramme = programmes[0];
  const initialProgramme =
    programmes.find((programme) => programme.id === initialFormulaSet?.programmeId) ??
    firstProgramme;
  const initialRows = initialFormulaSet?.setup?.rows ??
    initialFormulaSet?.ingredients.map((ingredient) => ({
      ingredientId: ingredient.ingredientId,
      price: String(ingredient.pricePerKg),
      min: "",
      max: "",
    })) ?? [];
  const initialResult = initialFormulaSet
    ? savedFeedFormulaResult(initialFormulaSet)
    : null;
  const [programmeId, setProgrammeId] = useState(initialProgramme?.id ?? "");
  const selectedProgramme = useMemo(
    () => programmes.find((programme) => programme.id === programmeId) ?? programmes[0],
    [programmeId, programmes],
  );
  const [phaseId, setPhaseId] = useState(
    initialProgramme?.phases.some((phase) => phase.id === initialFormulaSet?.phaseId)
      ? initialFormulaSet?.phaseId ?? ""
      : initialProgramme?.phases[0]?.id ?? "",
  );
  const selectedPhase = useMemo(
    () =>
      selectedProgramme?.phases.find((phase) => phase.id === phaseId) ??
      selectedProgramme?.phases[0],
    [selectedProgramme, phaseId],
  );
  const [energySystem, setEnergySystem] = useState<"ME" | "NE">(
    initialFormulaSet?.energySystem ?? "ME",
  );
  const [targetBatchWeight, setTargetBatchWeight] = useState(
    String(initialFormulaSet?.targetBatchKg ?? 1000),
  );
  const [useFixedPremix, setUseFixedPremix] = useState(
    initialFormulaSet?.setup?.useFixedPremix ?? false,
  );
  const [fixedPremixName, setFixedPremixName] = useState(
    initialFormulaSet?.setup?.fixedPremixName ?? "Commercial premix",
  );
  const [fixedPremixKgPerTonne, setFixedPremixKgPerTonne] = useState(
    initialFormulaSet?.setup?.fixedPremixKgPerTonne ?? "10",
  );
  const [fixedPremixPricePerKg, setFixedPremixPricePerKg] = useState(
    initialFormulaSet?.setup?.fixedPremixPricePerKg ?? "",
  );
  const [nextKey, setNextKey] = useState(100);
  const [addIngredientId, setAddIngredientId] = useState("");
  const [rows, setRows] = useState<Row[]>(
    initialRows.map((row, index) => ({ ...row, key: index })),
  );
  const [result, setResult] = useState<LeastCostFormulationResult | null>(
    initialResult,
  );
  const [running, setRunning] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(initialResult ? "recipes" : "setup");
  const [selectedRecipeId, setSelectedRecipeId] = useState(
    initialFormulaSet?.setup?.selectedRecipeId ?? "least-cost",
  );
  const [generationDialogOpen, setGenerationDialogOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [formulaSetName, setFormulaSetName] = useState("");
  const [savingFormulas, setSavingFormulas] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedResult, setSavedResult] = useState<LeastCostFormulationResult | null>(
    initialResult,
  );
  const [activeSavedId, setActiveSavedId] = useState(initialFormulaSet?.id);
  const requirementsWereEdited = useRef(false);

  const allIngredientOptions = useMemo<IngredientOption[]>(
    () => [
      ...ingredients,
      ...(useFixedPremix
        ? [{
            id: FIXED_PREMIX_ID,
            name: fixedPremixName.trim() || "Commercial premix",
            category: "vitamin_mineral_premix",
          }]
        : []),
    ],
    [ingredients, useFixedPremix, fixedPremixName],
  );

  const ingredientById = useMemo(
    () => new Map(allIngredientOptions.map((ingredient) => [ingredient.id, ingredient])),
    [allIngredientOptions],
  );

  const parsedTargetBatchKg = Number(targetBatchWeight);
  const displayBatchKg =
    Number.isFinite(parsedTargetBatchKg) && parsedTargetBatchKg > 0
      ? parsedTargetBatchKg
      : 1000;
  const parsedFixedPremixKgPerTonne = Number(fixedPremixKgPerTonne);
  const displayFixedPremixKgPerTonne =
    useFixedPremix &&
    Number.isFinite(parsedFixedPremixKgPerTonne) &&
    parsedFixedPremixKgPerTonne > 0 &&
    parsedFixedPremixKgPerTonne < 1000
      ? parsedFixedPremixKgPerTonne
      : 0;
  const fixedPremixBatchKg =
    (displayBatchKg * displayFixedPremixKgPerTonne) / 1000;
  const baseMixBatchKg = displayBatchKg - fixedPremixBatchKg;

  useEffect(() => {
    if (!result && activeTab !== "setup") {
      setActiveTab("setup");
    }
  }, [result, activeTab]);

  const availableToAdd = ingredients.filter(
    (ingredient) => !rows.some((row) => row.ingredientId === ingredient.id),
  );

  useEffect(() => {
    if (!programmeId || !phaseId) return;

    // A saved formulation already contains the exact ingredient setup and
    // generated recipe set that the user chose to save. Do not replace that
    // snapshot with a fresh suggestion just because the editor mounted (React
    // Strict Mode mounts effects twice in development). Suggestions only become
    // authoritative after the user explicitly changes a requirement input.
    if (initialFormulaSet && !requirementsWereEdited.current) return;

    const controller = new AbortController();
    setSuggesting(true);
    setSuggestionError(null);
    setResult(null);

    void (async () => {
      try {
        const response = await fetch("/api/feed-formulation/suggest", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            programmeId,
            phaseId,
            energySystem,
          }),
          signal: controller.signal,
        });
        const payload = (await response.json()) as
          | FormulationIngredientSuggestionResult
          | { status: "error"; message?: string };

        if (!response.ok) {
          throw new Error(
            "message" in payload && payload.message
              ? payload.message
              : "Ingredient suggestion request failed.",
          );
        }
        if (payload.status !== "suggested") {
          throw new Error(payload.message);
        }

        const suggestedIds = payload.ingredientIds.filter((ingredientId) =>
          ingredients.some((ingredient) => ingredient.id === ingredientId),
        );
        setRows(
          suggestedIds.map((ingredientId, index) => ({
            key: index,
            ingredientId,
            price: defaultPriceInput(ingredientId),
            min: "",
            max: "",
          })),
        );
      } catch (error) {
        if (controller.signal.aborted) return;
        setRows([]);
        setSuggestionError(error instanceof Error ? error.message : String(error));
      } finally {
        if (!controller.signal.aborted) {
          setSuggesting(false);
        }
      }
    })();

    return () => controller.abort();
  }, [programmeId, phaseId, energySystem, ingredients]);

  function changeProgramme(value: string) {
    requirementsWereEdited.current = true;
    const programme = programmes.find((candidate) => candidate.id === value);
    setProgrammeId(value);
    setPhaseId(programme?.phases[0]?.id ?? "");
    setResult(null);
  }

  function updateRow(key: number, field: keyof Omit<Row, "key">, value: string) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
    );
    setResult(null);
  }

  function addIngredient() {
    if (!addIngredientId) return;
    setRows((current) => [
      ...current,
      {
        key: nextKey,
        ingredientId: addIngredientId,
        price: defaultPriceInput(addIngredientId),
        min: "",
        max: "",
      },
    ]);
    setNextKey((value) => value + 1);
    setAddIngredientId("");
    setResult(null);
  }

  async function formulate(): Promise<boolean> {
    setRequestError(null);
    setResult(null);

    if (!programmeId || !phaseId) {
      setRequestError("Select a requirement programme and phase.");
      return false;
    }
    if (rows.length === 0) {
      setRequestError("Add at least one available ingredient.");
      return false;
    }
    const batchKg = Number(targetBatchWeight);
    if (!Number.isFinite(batchKg) || batchKg <= 0) {
      setRequestError("Target batch weight must be greater than 0 kg.");
      return false;
    }

    let requestIngredients: FormulationIngredientOption[];
    try {
      requestIngredients = rows.map((row) => {
        const pricePerKg = Number(row.price);
        if (!Number.isFinite(pricePerKg) || pricePerKg < 0 || row.price.trim() === "") {
          throw new Error(
            `Enter a valid price per kg for ${ingredientById.get(row.ingredientId)?.name ?? row.ingredientId}.`,
          );
        }
        const min = row.min.trim() === "" ? undefined : Number(row.min);
        const max = row.max.trim() === "" ? undefined : Number(row.max);
        if (min !== undefined && (!Number.isFinite(min) || min < 0 || min > 100)) {
          throw new Error("Minimum inclusion must be between 0% and 100%.");
        }
        if (max !== undefined && (!Number.isFinite(max) || max < 0 || max > 100)) {
          throw new Error("Maximum inclusion must be between 0% and 100%.");
        }
        return {
          ingredientId: row.ingredientId,
          pricePerKg,
          minInclusionPct: min,
          maxInclusionPct: max,
        };
      });

      if (useFixedPremix) {
        const name = fixedPremixName.trim();
        const inclusionKgPerTonne = Number(fixedPremixKgPerTonne);
        const pricePerKg = Number(fixedPremixPricePerKg);

        if (!name) {
          throw new Error("Enter a name for the fixed premix.");
        }
        if (
          !Number.isFinite(inclusionKgPerTonne) ||
          inclusionKgPerTonne <= 0 ||
          inclusionKgPerTonne >= 1000
        ) {
          throw new Error("Premix inclusion must be greater than 0 and less than 1000 kg/t.");
        }
        if (
          !Number.isFinite(pricePerKg) ||
          pricePerKg < 0 ||
          fixedPremixPricePerKg.trim() === ""
        ) {
          throw new Error("Enter a valid premix price per kg.");
        }

        const fixedInclusionPct = inclusionKgPerTonne / 10;
        requestIngredients.push({
          ingredientId: FIXED_PREMIX_ID,
          pricePerKg,
          minInclusionPct: fixedInclusionPct,
          maxInclusionPct: fixedInclusionPct,
        });
      }
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : String(error));
      return false;
    }

    setRunning(true);
    try {
      const response = await fetch("/api/feed-formulation/optimize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          programmeId,
          phaseId,
          energySystem,
          includeSupplementationTargets: false,
          customPremixes: useFixedPremix
            ? [{
                id: FIXED_PREMIX_ID,
                name: fixedPremixName.trim(),
                vitamins: {},
                traceMineralsPpm: {},
              }]
            : [],
          ingredients: requestIngredients,
        }),
      });
      const payload = (await response.json()) as LeastCostFormulationResult & {
        message?: string;
      };
      if (!response.ok) {
        throw new Error(payload.message ?? "Formulation request failed.");
      }
      setResult(payload);
      setSelectedRecipeId("least-cost");
      setActiveTab("recipes");
      return true;
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : String(error));
      return false;
    } finally {
      setRunning(false);
    }
  }

  const sidebarItems = [
    {
      id: "setup",
      label: "Setup",
      description: "Requirements, ingredients and mix",
      disabled: false,
    },
    {
      id: "recipes",
      label: "Recipes",
      description: "Least-cost and alternatives",
      disabled: !result,
    },
    {
      id: "opportunities",
      label: "Opportunities",
      description: "Ingredient substitutions and savings",
      disabled: result?.status !== "optimal",
    },
    {
      id: "nutrition",
      label: "Nutrition",
      description: "Requirement compliance",
      disabled: result?.status !== "optimal",
    },
  ] as const;

  const reportContext: RecipeReportContext = {
    programmeName: selectedProgramme?.name ?? programmeId,
    phaseLabel: selectedPhase?.label ?? phaseId,
    sourceTable: selectedPhase?.sourceTable,
    energySystem,
    targetBatchKg: displayBatchKg,
    ingredients: [
      ...rows.map((row) => ({
        ingredientId: row.ingredientId,
        name: ingredientById.get(row.ingredientId)?.name ?? row.ingredientId,
        pricePerKg: Number(row.price),
      })),
      ...(useFixedPremix
        ? [{
            ingredientId: FIXED_PREMIX_ID,
            name: fixedPremixName.trim() || "Commercial premix",
            pricePerKg: Number(fixedPremixPricePerKg),
          }]
        : []),
    ],
  };
  const recipes = result?.status === "optimal" ? recipeViews(result) : [];
  const selectedRecipe =
    recipes.find((recipe) => recipe.id === selectedRecipeId) ?? recipes[0];
  const formulaActionLabel = selectedRecipe ? "Regenerate formulas" : "Generate formulas";
  const formulasAreSaved = savedResult === result;

  async function saveFormulas() {
    const name = formulaSetName.trim();
    if (!name || recipes.length === 0 || result?.status !== "optimal") return;

    setSavingFormulas(true);
    setSaveError(null);
    try {
      const { formulaSet } = await saveFeedFormulaSet(
        {
          name,
          programmeId,
          programmeName: reportContext.programmeName,
          phaseId,
          phaseLabel: reportContext.phaseLabel,
          sourceTable: reportContext.sourceTable,
          energySystem,
          targetBatchKg: reportContext.targetBatchKg,
          ingredients: reportContext.ingredients,
          recipes: recipes.map((recipe) => ({
            id: recipe.id,
            label: recipe.label,
            description: recipe.description,
            formula: recipe.solution.formula,
            analysis: recipe.solution.analysis,
            nutrientProfile: recipe.nutrientProfile,
            costPerKg: recipe.solution.costPerKg,
            costIncreasePct: recipe.costIncreasePct,
          })),
          setup: {
            rows: rows.map(({ ingredientId, price, min, max }) => ({
              ingredientId,
              price,
              min,
              max,
            })),
            useFixedPremix,
            fixedPremixName,
            fixedPremixKgPerTonne,
            fixedPremixPricePerKg,
            selectedRecipeId,
          },
          result,
        },
        activeSavedId,
      );
      setActiveSavedId(formulaSet.id);
      setSavedResult(result);
      setSaveDialogOpen(false);
      router.replace(editFeedFormulationHref(formulaSet.id));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setSavingFormulas(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">{header}</div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              onClick={() => {
                setRequestError(null);
                setGenerationDialogOpen(true);
              }}
              disabled={running || rows.length === 0}
            >
              <Calculator size={15} />
              {formulaActionLabel}
            </Button>
            {selectedRecipe && result?.status === "optimal" ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFormulaSetName(
                      initialFormulaSet?.name ?? `${reportContext.phaseLabel} formulas`,
                    );
                    setSaveError(null);
                    setSaveDialogOpen(true);
                  }}
                >
                  <Save />
                  {formulasAreSaved ? "Saved" : "Save formulas"}
                </Button>
                <RecipeReportMenu recipes={recipes} context={reportContext} />
              </>
            ) : null}
          </div>
        </div>
        <div>{description}</div>
      </div>

      <Dialog
        open={generationDialogOpen}
        onOpenChange={(open) => {
          if (!running) setGenerationDialogOpen(open);
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-4xl overflow-y-auto p-0">
          <DialogHeader className="border-b border-hairline px-5 py-4 pr-14 sm:px-6">
            <DialogTitle>Finished mix</DialogTitle>
            <DialogDescription className="max-w-3xl leading-6">
              Set the final batch weight and optionally reserve a fixed commercial premix.
              FeedSport formulates the remaining basal mix so the complete finished feed still
              satisfies the Brazilian diet requirements after the premix is added.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-5 py-2 sm:px-6">
            <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-hairline bg-background px-3 py-2">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={useFixedPremix}
                onChange={(event) => {
                  setUseFixedPremix(event.target.checked);
                  setResult(null);
                  setRequestError(null);
                }}
              />
              <span className="text-sm font-medium text-ink">Add fixed premix</span>
            </label>

            <div className="max-w-xs">
              <Field label="Finished feed weight (kg)">
                <Input
                  type="number"
                  min="0.1"
                  step="1"
                  value={targetBatchWeight}
                  onChange={(event) => {
                    setTargetBatchWeight(event.target.value);
                    setResult(null);
                    setRequestError(null);
                  }}
                />
              </Field>
            </div>

            {useFixedPremix ? (
              <>
                <div className="border-t border-hairline pt-5">
                  <div className="mb-3">
                    <div className="text-sm font-medium text-ink">Premix details</div>
                    <div className="mt-0.5 text-xs leading-5 text-ink-muted">
                      The inclusion rate is applied to the finished feed weight.
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Premix name">
                      <Input
                        value={fixedPremixName}
                        onChange={(event) => {
                          setFixedPremixName(event.target.value);
                          setResult(null);
                          setRequestError(null);
                        }}
                        placeholder="Commercial premix"
                      />
                    </Field>

                    <Field label="Premix inclusion (kg / tonne)">
                      <Input
                        type="number"
                        min="0.001"
                        max="999.999"
                        step="0.1"
                        value={fixedPremixKgPerTonne}
                        onChange={(event) => {
                          setFixedPremixKgPerTonne(event.target.value);
                          setResult(null);
                          setRequestError(null);
                        }}
                      />
                    </Field>

                    <Field label="Premix price / kg">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={fixedPremixPricePerKg}
                        placeholder="0.00"
                        onChange={(event) => {
                          setFixedPremixPricePerKg(event.target.value);
                          setResult(null);
                          setRequestError(null);
                        }}
                      />
                    </Field>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-lg border border-hairline bg-background px-4 py-3 text-sm">
                    <div className="font-medium text-ink">Mix plan</div>
                    <div className="mt-1 leading-6 text-ink-muted">
                      <strong className="text-ink">{baseMixBatchKg.toFixed(2)} kg</strong> basal
                      feed{" + "}
                      <strong className="text-ink">{fixedPremixBatchKg.toFixed(2)} kg</strong>
                      premix{" = "}
                      <strong className="text-ink">{displayBatchKg.toFixed(2)} kg</strong> finished
                      feed.
                    </div>
                  </div>

                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs leading-5 text-ink-muted">
                    Mode 1 reserves the premix weight but does not credit it with energy, protein,
                    amino acids or macro minerals. Vitamin and trace-mineral coverage is not
                    verified from the premix label.
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-hairline bg-background px-4 py-3 text-sm text-ink-muted">
                FeedSport formulates the full {displayBatchKg.toFixed(2)} kg finished batch.
              </div>
            )}

            {requestError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {requestError}
              </div>
            ) : null}
          </div>

          <DialogFooter className="border-t border-hairline px-5 py-4 sm:px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setGenerationDialogOpen(false)}
              disabled={running}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                void formulate().then((generated) => {
                  if (generated) setGenerationDialogOpen(false);
                });
              }}
              disabled={running}
            >
              <Calculator size={15} />
              {running ? "Generating…" : formulaActionLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={saveDialogOpen}
        onOpenChange={(open) => {
          if (!savingFormulas) setSaveDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-hairline px-5 py-4 pr-14">
            <DialogTitle>{activeSavedId ? "Save changes" : "Save formulas"}</DialogTitle>
            <DialogDescription>
              Store the active recipe set in FeedSport so it remains available after this session.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-5 py-5">
            <Field label="Formula set name">
              <Input
                value={formulaSetName}
                autoFocus
                onChange={(event) => {
                  setFormulaSetName(event.target.value);
                  setSaveError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void saveFormulas();
                }}
              />
            </Field>
            <div className="rounded-lg border border-hairline bg-raised/30 px-3 py-2 text-xs leading-5 text-ink-muted">
              {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"} ·{" "}
              {reportContext.programmeName} · {reportContext.phaseLabel}
            </div>
            {saveError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {saveError}
              </div>
            ) : null}
          </div>
          <DialogFooter className="border-t border-hairline px-5 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSaveDialogOpen(false)}
              disabled={savingFormulas}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void saveFormulas()}
              disabled={savingFormulas || formulaSetName.trim().length === 0}
            >
              <Save />
              {savingFormulas ? "Saving…" : activeSavedId ? "Save changes" : "Save formulas"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
        <aside className="overflow-hidden rounded-xl border border-hairline bg-raised/20 lg:sticky lg:top-[74px]">
          <div className="border-b border-hairline px-4 py-4">
            <div className="text-sm font-semibold text-ink">Formulation</div>
            <div className="mt-1 text-xs leading-5 text-ink-muted">
              Build, review and refine this ration.
            </div>
          </div>
          <nav className="space-y-1 p-2" aria-label="Feed formulation sections">
            {sidebarItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={item.disabled}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    active
                      ? "border-hairline bg-background text-ink shadow-sm"
                      : item.disabled
                        ? "cursor-not-allowed border-transparent text-ink-faint opacity-45"
                        : "border-transparent text-ink-muted hover:bg-background/70 hover:text-ink"
                  }`}
                >
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-4">{item.description}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0">
        {activeTab === "setup" ? (
          <Card>
        <CardHeader>
          <CardTitle>Least-cost formulation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Programme">
              <select
                value={programmeId}
                onChange={(event) => changeProgramme(event.target.value)}
                className="h-9 w-full rounded-md border border-hairline bg-background px-3 text-sm text-ink"
              >
                {programmes.map((programme) => (
                  <option key={programme.id} value={programme.id}>
                    {programme.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Phase">
              <select
                value={phaseId}
                onChange={(event) => {
                  requirementsWereEdited.current = true;
                  setPhaseId(event.target.value);
                  setResult(null);
                }}
                className="h-9 w-full rounded-md border border-hairline bg-background px-3 text-sm text-ink"
              >
                {(selectedProgramme?.phases ?? []).map((phase) => (
                  <option key={phase.id} value={phase.id}>
                    {phase.label} · Table {phase.sourceTable}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Energy basis">
              <select
                value={energySystem}
                onChange={(event) => {
                  requirementsWereEdited.current = true;
                  setEnergySystem(event.target.value as "ME" | "NE");
                  setResult(null);
                }}
                className="h-9 w-full rounded-md border border-hairline bg-background px-3 text-sm text-ink"
              >
                <option value="ME">Metabolizable energy (ME)</option>
                <option value="NE">Net energy (NE)</option>
              </select>
            </Field>
          </div>

          {suggesting ? (
            <div className="rounded-lg border border-hairline bg-raised/30 px-4 py-3 text-sm text-ink-muted">
              Building the priced candidate pool for this requirement phase…
            </div>
          ) : null}

          <div className="min-w-0 max-w-full overflow-x-auto rounded-lg border border-hairline">
            <table className="w-full min-w-[640px] table-fixed text-sm">
              <colgroup>
                <col className="w-[34%]" />
                <col className="w-[30%]" />
                <col className="w-[15%]" />
                <col className="w-[15%]" />
                <col className="w-[6%]" />
              </colgroup>
              <thead className="bg-raised/70 text-left text-xs uppercase tracking-wide text-ink-faint">
                <tr>
                  <th className="px-3 py-2.5">Ingredient</th>
                  <th className="px-3 py-2.5">Price / kg</th>
                  <th className="px-3 py-2.5">Min %</th>
                  <th className="px-3 py-2.5">Max %</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const ingredient = ingredientById.get(row.ingredientId);
                  const defaultPrice = ingredientDefaultPrice(row.ingredientId);
                  const importMultiplier = defaultPrice
                    ? ingredientImportPriceMultiplier(defaultPrice.sourceScope)
                    : 1;
                  return (
                    <tr key={row.key} className="border-t border-hairline">
                      <td className="break-words px-3 py-2.5 align-top">
                        <div className="font-medium leading-5 text-ink">{ingredient?.name ?? row.ingredientId}</div>
                        <div className="mt-0.5 text-xs text-ink-faint">{ingredient?.category}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <Input
                          type="number"
                          min="0"
                          step="0.001"
                          value={row.price}
                          placeholder="0.000"
                          onChange={(event) => updateRow(row.key, "price", event.target.value)}
                        />
                        {defaultPrice ? (
                          <div
                            className="mt-1 text-[11px] leading-4 text-ink-faint"
                            title={defaultPrice.note}
                          >
                            Default: {defaultPrice.market}
                            {importMultiplier > 1 ? ` · ×${importMultiplier.toFixed(2)} import` : ""}
                            {" · "}
                            {defaultPrice.asOf}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={row.min}
                          placeholder={ingredient?.minInclusionPct?.toString() ?? "0"}
                          onChange={(event) => updateRow(row.key, "min", event.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={row.max}
                          placeholder={(
                            selectedPhase?.maxInclusionPct?.[row.ingredientId] ??
                            ingredient?.maxInclusionPct ??
                            100
                          ).toString()}
                          onChange={(event) => updateRow(row.key, "max", event.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove ${ingredient?.name ?? row.ingredientId}`}
                          onClick={() => {
                            setRows((current) => current.filter((candidate) => candidate.key !== row.key));
                            setResult(null);
                          }}
                        >
                          <Trash2 size={15} />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={addIngredientId}
              onChange={(event) => setAddIngredientId(event.target.value)}
              className="h-9 min-w-72 rounded-md border border-hairline bg-background px-3 text-sm text-ink"
            >
              <option value="">Add another ingredient…</option>
              {availableToAdd.map((ingredient) => (
                <option key={ingredient.id} value={ingredient.id}>
                  {ingredient.name}
                </option>
              ))}
            </select>
            <Button type="button" variant="outline" onClick={addIngredient} disabled={!addIngredientId}>
              <Plus size={15} />
              Add ingredient
            </Button>
          </div>

          {suggestionError ? (
            <div className="rounded-lg border border-hairline bg-raised/30 p-3 text-sm text-ink-muted">
              FeedSport could not build an automatic candidate pool: {suggestionError} You can still
              add ingredients manually.
            </div>
          ) : null}

          {requestError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {requestError}
            </div>
          ) : null}
        </CardContent>
          </Card>
        ) : null}

        {activeTab === "recipes" && result ? (
            <ResultPanel
              result={result}
              ingredientById={ingredientById}
              selectedRecipeId={selectedRecipeId}
              onSelectedRecipeChange={setSelectedRecipeId}
              batchWeightKg={displayBatchKg}
            />
          ) : null}

        {activeTab === "opportunities" && result?.status === "optimal" ? (
            <OpportunitiesPanel
              result={result}
              ingredientById={ingredientById}
              batchWeightKg={displayBatchKg}
            />
          ) : null}

        {activeTab === "nutrition" && result?.status === "optimal" ? (
            <NutritionPanel result={result} selectedRecipeId={selectedRecipeId} />
          ) : null}
      </div>
    </div>
    </div>
  );
}

function ResultPanel({
  result,
  ingredientById,
  selectedRecipeId,
  onSelectedRecipeChange,
  batchWeightKg,
}: {
  result: LeastCostFormulationResult;
  ingredientById: Map<string, IngredientOption>;
  selectedRecipeId: string;
  onSelectedRecipeChange: (recipeId: string) => void;
  batchWeightKg: number;
}) {

  if (result.status === "optimal") {
    const recipes = recipeViews(result);
    const selectedRecipe =
      recipes.find((recipe) => recipe.id === selectedRecipeId) ?? recipes[0];

    return (
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{selectedRecipe.label}</CardTitle>
            <Badge variant="secondary">Hard constraints satisfied</Badge>
          </div>
          <CardDescription>
            {selectedRecipe.description} Cost: {selectedRecipe.solution.costPerKg.toFixed(4)} per kg
            {" · "}
            {(selectedRecipe.solution.costPerKg * batchWeightKg).toFixed(2)} for{" "}
            {batchWeightKg.toFixed(1)} kg
            {selectedRecipe.costIncreasePct > 0
              ? ` · +${selectedRecipe.costIncreasePct.toFixed(2)}% vs least cost`
              : ""}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {recipes.length > 1 ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <div className="text-sm font-medium text-ink">Alternative formulations</div>
                  <div className="text-xs text-ink-muted">
                    Alternatives keep every hard nutrient constraint and stay within{" "}
                    {result.alternativeCostTolerancePct}% of the least-cost formula.
                  </div>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {recipes.map((recipe) => (
                  <button
                    key={recipe.id}
                    type="button"
                    onClick={() => onSelectedRecipeChange(recipe.id)}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      selectedRecipe.id === recipe.id
                        ? "border-brand bg-brand/5"
                        : "border-hairline bg-raised/30 hover:bg-raised/60"
                    }`}
                  >
                    <div className="font-medium text-ink">{recipe.label}</div>
                    <div className="mt-1 font-mono text-sm text-ink">
                      ${recipe.solution.costPerKg.toFixed(4)}/kg
                    </div>
                    <div className="mt-1 text-xs text-ink-muted">
                      {recipe.costIncreasePct === 0
                        ? "Baseline"
                        : `+${recipe.costIncreasePct.toFixed(2)}%`}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-hairline bg-raised/30 px-4 py-3 text-sm text-ink-muted">
              No materially different formulation was found within{" "}
              {result.alternativeCostTolerancePct}% of the optimum.
            </div>
          )}

          <FormulaTable
            rows={selectedRecipe.solution.formula.ingredients}
            ingredientById={ingredientById}
            batchWeightKg={batchWeightKg}
          />

          <Unsupported requirements={result.unsupportedRequirements} />
        </CardContent>
      </Card>
    );
  }

  if (result.status === "missing-data") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ingredient matrix is incomplete</CardTitle>
          <CardDescription>{result.message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {result.missingData.map((missing) => (
            <div key={missing.ingredientId} className="rounded-lg border border-hairline p-3 text-sm">
              <div className="font-medium text-ink">
                {ingredientById.get(missing.ingredientId)?.name ?? missing.ingredientId}
              </div>
              <div className="mt-1 text-xs leading-5 text-ink-muted">
                Missing: {missing.nutrientIds.join(", ")}
              </div>
            </div>
          ))}
          <Unsupported requirements={result.unsupportedRequirements} />
        </CardContent>
      </Card>
    );
  }

  if (result.status === "infeasible") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-600" />
            <CardTitle>No exact formulation</CardTitle>
          </div>
          <CardDescription>{result.message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {result.diagnostics.length > 0 ? (
            <div className="space-y-2">
              {result.diagnostics.map((diagnostic) => (
                <div key={diagnostic.constraintId} className="rounded-lg border border-hairline p-3 text-sm">
                  <div className="font-medium text-ink">{diagnostic.label}</div>
                  <div className="mt-1 text-xs text-ink-muted">
                    Actual {diagnostic.actual.toFixed(4)} {diagnostic.unit}; required{" "}
                    {diagnostic.relation === "min" ? "≥" : "≤"} {diagnostic.bound} {diagnostic.unit}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {result.bestEffort ? (
            <div>
              <div className="mb-2 text-sm font-medium text-ink">Closest diagnostic blend</div>
              <FormulaTable
                rows={result.bestEffort.formula.ingredients}
                ingredientById={ingredientById}
                batchWeightKg={batchWeightKg}
              />
            </div>
          ) : null}
          <Unsupported requirements={result.unsupportedRequirements} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Formulation error</CardTitle>
        <CardDescription>{result.message}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function recipeReportInput(
  recipe: RecipeView,
  context: RecipeReportContext,
): FeedRecipeReportInput {
  return {
    recipeLabel: recipe.label,
    recipeDescription: recipe.description,
    programmeName: context.programmeName,
    phaseLabel: context.phaseLabel,
    sourceTable: context.sourceTable,
    energySystem: context.energySystem,
    targetBatchKg: context.targetBatchKg,
    formula: recipe.solution.formula,
    nutrientProfile: recipe.nutrientProfile,
    ingredients: context.ingredients,
    costPerKg: recipe.solution.costPerKg,
    costIncreasePct: recipe.costIncreasePct,
    generatedAt: new Date(),
  };
}

function RecipeReportMenu({
  recipes,
  context,
}: {
  recipes: readonly RecipeView[];
  context: RecipeReportContext;
}) {
  const [recipeToView, setRecipeToView] = useState<RecipeView | null>(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <FileSpreadsheet />
            View report
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>Recipe reports</DropdownMenuLabel>
          {recipes.map((recipe) => (
            <DropdownMenuItem key={recipe.id} onSelect={() => setRecipeToView(recipe)}>
              <FileSpreadsheet />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{recipe.label}</div>
                <div className="mt-0.5 text-[11px] text-ink-faint">
                  ${recipe.solution.costPerKg.toFixed(4)}/kg
                  {recipe.costIncreasePct > 0
                    ? ` · +${recipe.costIncreasePct.toFixed(2)}% vs least cost`
                    : " · baseline"}
                </div>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <RecipeReportDialog
        recipe={recipeToView}
        context={context}
        onClose={() => setRecipeToView(null)}
      />
    </>
  );
}

function RecipeReportDialog({
  recipe,
  context,
  onClose,
}: {
  recipe: RecipeView | null;
  context: RecipeReportContext;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);

  if (!recipe) return null;

  const input = recipeReportInput(recipe, context);
  const rows = feedRecipeFormulaReportRows(input);

  async function downloadReport() {
    if (busy) return;
    setBusy(true);
    try {
      const { buildFeedRecipeReport } = await import("@/lib/feed-formulation-report");
      const output = await buildFeedRecipeReport({
        ...input,
        generatedAt: new Date(),
      });
      downloadFile(
        output,
        feedRecipeReportFilename({
          phaseLabel: input.phaseLabel,
          recipeLabel: input.recipeLabel,
        }),
        XLSX_MIME,
      );
    } catch (error) {
      console.error(error);
      window.alert("The recipe report could not be generated. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="flex h-[calc(100dvh-4rem)] max-h-[900px] max-w-[min(1000px,calc(100vw-2rem))] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-hairline px-5 py-4 pr-14">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle>{recipe.label} · recipe report</DialogTitle>
              <DialogDescription className="mt-1">
                {context.programmeName} · {context.phaseLabel} · {context.energySystem}. This preview
                uses the same recipe, prices and nutritional profile as the Excel export.
              </DialogDescription>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => void downloadReport()}
              disabled={busy}
              className="shrink-0"
            >
              <Download />
              {busy ? "Preparing…" : "Download report"}
            </Button>
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-6 overflow-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <ReportFact label="Batch weight" value={`${context.targetBatchKg.toFixed(1)} kg`} />
            <ReportFact label="Cost / kg" value={`${recipe.solution.costPerKg.toFixed(4)}`} />
            <ReportFact
              label="Batch cost"
              value={`${(recipe.solution.costPerKg * context.targetBatchKg).toFixed(2)}`}
            />
            <ReportFact
              label="Cost / tonne"
              value={`${(recipe.solution.costPerKg * 1000).toFixed(2)}`}
            />
            <ReportFact label="Ingredients" value={String(rows.length)} />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-ink">Recipe composition</h3>
            <div className="overflow-x-auto rounded-lg border border-hairline">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-raised/70 text-left text-xs uppercase tracking-wide text-ink-faint">
                  <tr>
                    <th className="px-3 py-2.5">Ingredient</th>
                    <th className="px-3 py-2.5 text-right">Inclusion</th>
                    <th className="px-3 py-2.5 text-right">kg / batch</th>
                    <th className="px-3 py-2.5 text-right">kg / tonne</th>
                    <th className="px-3 py-2.5 text-right">Price / kg</th>
                    <th className="px-3 py-2.5 text-right">Cost / batch</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.ingredientId} className="border-t border-hairline">
                      <td className="px-3 py-2.5 text-ink">{row.name}</td>
                      <td className="px-3 py-2.5 text-right">{row.inclusionPct.toFixed(3)}%</td>
                      <td className="px-3 py-2.5 text-right">{row.kgForBatch.toFixed(1)}</td>
                      <td className="px-3 py-2.5 text-right">{row.kgPerTonne.toFixed(1)}</td>
                      <td className="px-3 py-2.5 text-right">${row.pricePerKg.toFixed(4)}</td>
                      <td className="px-3 py-2.5 text-right">
                        ${row.costForBatchContribution.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-hairline font-semibold text-ink">
                    <td className="px-3 py-2.5">Total</td>
                    <td className="px-3 py-2.5 text-right">
                      {rows.reduce((sum, row) => sum + row.inclusionPct, 0).toFixed(3)}%
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {rows.reduce((sum, row) => sum + row.kgForBatch, 0).toFixed(1)}
                    </td>
                    <td className="px-3 py-2.5 text-right">1000.0</td>
                    <td />
                    <td className="px-3 py-2.5 text-right">
                      ${rows
                        .reduce((sum, row) => sum + row.costForBatchContribution, 0)
                        .toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-ink">Nutritional compliance</h3>
            <NutrientProfileTable profile={recipe.nutrientProfile} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReportFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-hairline bg-raised/30 p-3">
      <div className="text-xs text-ink-faint">{label}</div>
      <div className="mt-1 font-mono text-base font-semibold text-ink">{value}</div>
    </div>
  );
}

function OpportunitiesPanel({
  result,
  ingredientById,
  batchWeightKg,
}: {
  result: Extract<LeastCostFormulationResult, { status: "optimal" }>;
  ingredientById: Map<string, IngredientOption>;
  batchWeightKg: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingredient opportunities</CardTitle>
        <CardDescription>
          Explore ingredients that are absent from the least-cost recipe and see how much can be
          introduced within the selected cost bands.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <IngredientOpportunitiesTable
          opportunities={result.ingredientOpportunities}
          tolerances={result.ingredientOpportunityCostTolerancesPct}
          ingredientById={ingredientById}
          batchWeightKg={batchWeightKg}
        />
      </CardContent>
    </Card>
  );
}

function NutritionPanel({
  result,
  selectedRecipeId,
}: {
  result: Extract<LeastCostFormulationResult, { status: "optimal" }>;
  selectedRecipeId: string;
}) {
  const selectedAlternative = result.alternatives.find(
    (alternative) => alternative.id === selectedRecipeId,
  );
  const recipeLabel =
    selectedRecipeId === "least-cost"
      ? "Least cost"
      : selectedAlternative?.label ?? "Least cost";
  const profile =
    selectedRecipeId === "least-cost"
      ? result.nutrientProfile
      : selectedAlternative?.nutrientProfile ?? result.nutrientProfile;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>{recipeLabel} · nutritional profile</CardTitle>
          <Badge variant="secondary">Hard constraints satisfied</Badge>
        </div>
        <CardDescription>
          Source-backed diet requirements and applicable supplementation targets versus the recipe
          currently selected in the Recipes tab.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <NutrientProfileTable profile={profile} />
      </CardContent>
    </Card>
  );
}

function formatNutrientValue(value: number, unit: string): string {
  if (unit === "kcal/kg") return value.toFixed(0);
  if (unit === "%") return value.toFixed(3);
  if (unit === "ppm") return value.toFixed(2);
  return value.toFixed(3);
}

function NutrientProfileTable({
  profile,
}: {
  profile: readonly FormulationNutrientComparison[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-hairline">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-raised/70 text-left text-xs uppercase tracking-wide text-ink-faint">
          <tr>
            <th className="px-3 py-2.5">Nutrient</th>
            <th className="px-3 py-2.5 text-right">Requirement / target</th>
            <th className="px-3 py-2.5 text-right">Actual</th>
            <th className="px-3 py-2.5 text-right">Margin</th>
            <th className="px-3 py-2.5 text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {profile.map((row) => (
            <tr key={row.id} className="border-t border-hairline">
              <td className="px-3 py-2.5 text-ink">{row.label}</td>
              <td className="px-3 py-2.5 text-right text-ink-muted">
                {row.relation === "min" ? "≥" : "≤"}{" "}
                {formatNutrientValue(row.requirement, row.unit)} {row.unit}
              </td>
              <td className="px-3 py-2.5 text-right font-medium text-ink">
                {formatNutrientValue(row.actual, row.unit)} {row.unit}
              </td>
              <td className="px-3 py-2.5 text-right text-ink-muted">
                {row.margin >= 0 ? "+" : ""}
                {formatNutrientValue(row.margin, row.unit)}
                {row.marginPct === null
                  ? ""
                  : ` (${row.marginPct >= 0 ? "+" : ""}${row.marginPct.toFixed(1)}%)`}
              </td>
              <td className="px-3 py-2.5 text-right">
                <Badge variant="secondary">
                  {row.binding ? "Binding" : "Satisfied"}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IngredientOpportunitiesTable({
  opportunities,
  tolerances,
  ingredientById,
  batchWeightKg,
}: {
  opportunities: readonly IngredientOpportunity[];
  tolerances: readonly number[];
  ingredientById: Map<string, IngredientOption>;
  batchWeightKg: number;
}) {
  if (opportunities.length === 0) return null;

  return (
    <div className="space-y-2">
      <div>
        <div className="text-sm font-medium text-ink">Ingredient opportunities</div>
        <div className="text-xs leading-5 text-ink-muted">
          Maximum inclusion of ingredients absent from the least-cost recipe while every hard
          nutrient requirement remains satisfied. Cost bands are measured against the least-cost
          formula.
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-hairline">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-raised/70 text-left text-xs uppercase tracking-wide text-ink-faint">
            <tr>
              <th className="px-3 py-2.5">Ingredient</th>
              {tolerances.map((tolerance) => (
                <th key={tolerance} className="px-3 py-2.5 text-right">
                  Max at +{tolerance}% cost
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {opportunities.map((opportunity) => (
              <tr key={opportunity.ingredientId} className="border-t border-hairline">
                <td className="px-3 py-2.5 text-ink">
                  {ingredientById.get(opportunity.ingredientId)?.name ??
                    opportunity.ingredientId}
                </td>
                {tolerances.map((tolerance) => {
                  const point = opportunity.points.find(
                    (candidate) => candidate.costTolerancePct === tolerance,
                  );
                  return (
                    <td
                      key={tolerance}
                      className="px-3 py-2.5 text-right font-medium text-ink"
                    >
                      {point ? (
                        <div className="flex flex-col items-end gap-1">
                          <span>{point.maxInclusionPct.toFixed(2)}%</span>
                          <OpportunityRecipeDialog
                            ingredientName={
                              ingredientById.get(opportunity.ingredientId)?.name ??
                              opportunity.ingredientId
                            }
                            point={point}
                            ingredientById={ingredientById}
                            batchWeightKg={batchWeightKg}
                          />
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OpportunityRecipeDialog({
  ingredientName,
  point,
  ingredientById,
  batchWeightKg,
}: {
  ingredientName: string;
  point: IngredientOpportunity["points"][number];
  ingredientById: Map<string, IngredientOption>;
  batchWeightKg: number;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="link" size="xs" className="h-auto px-0 py-0 text-xs">
          <Eye />
          View recipe
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-3xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle>
            {ingredientName} · +{point.costTolerancePct}% cost recipe
          </DialogTitle>
          <DialogDescription>
            This is the complete formulation that maximizes {ingredientName} while keeping every
            hard nutrient requirement satisfied and staying within {point.costTolerancePct}% of
            the least-cost formula. {ingredientName} reaches {point.maxInclusionPct.toFixed(2)}%.
            Resulting cost: {point.resultingCostPerKg.toFixed(4)} per kg.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-auto px-5 pb-5">
          <FormulaTable
            rows={point.recipe.formula.ingredients}
            ingredientById={ingredientById}
            batchWeightKg={batchWeightKg}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FormulaTable({
  rows,
  ingredientById,
  batchWeightKg,
}: {
  rows: readonly { ingredientId: string; inclusionPct: number }[];
  ingredientById: Map<string, IngredientOption>;
  batchWeightKg: number;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-hairline">
      <table className="w-full text-sm">
        <thead className="bg-raised/70 text-left text-xs uppercase tracking-wide text-ink-faint">
          <tr>
            <th className="px-3 py-2.5">Ingredient</th>
            <th className="px-3 py-2.5 text-right">Inclusion</th>
            <th className="px-3 py-2.5 text-right">kg / batch</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.ingredientId} className="border-t border-hairline">
              <td className="px-3 py-2.5 text-ink">
                {ingredientById.get(row.ingredientId)?.name ?? row.ingredientId}
              </td>
              <td className="px-3 py-2.5 text-right font-medium text-ink">
                {row.inclusionPct.toFixed(3)}%
              </td>
              <td className="px-3 py-2.5 text-right font-medium text-ink">
                {((row.inclusionPct / 100) * batchWeightKg).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-hairline font-semibold text-ink">
            <td className="px-3 py-2.5">Total</td>
            <td className="px-3 py-2.5 text-right">
              {rows.reduce((sum, row) => sum + row.inclusionPct, 0).toFixed(3)}%
            </td>
            <td className="px-3 py-2.5 text-right">{batchWeightKg.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function Unsupported({ requirements }: { requirements: readonly string[] }) {
  if (requirements.length === 0) return null;
  const supplementationUnavailable = requirements.includes(
    "vitamin-trace-mineral-supplementation",
  );
  const remaining = requirements.filter(
    (requirement) => requirement !== "vitamin-trace-mineral-supplementation",
  );

  return (
    <div className="space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-5 text-ink-muted">
      {supplementationUnavailable ? (
        <div>
          Brazilian Tables 2024 do not publish Chapter 7 vitamin and trace-mineral
          supplementation guidance for this exact phase, so FeedSport does not invent a target.
        </div>
      ) : null}
      {remaining.length > 0 ? (
        <div>
          The current ingredient matrix cannot yet hard-constrain: {remaining.join(", ")}. FeedSport
          reports these explicitly rather than inventing zero values.
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</span>
      {children}
    </label>
  );
}

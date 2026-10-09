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
import {
  buildFeedFormulationBasis,
  type FeedFormulationBasisSnapshot,
} from "@/lib/formulation-basis";
import { editFeedFormulationHref } from "@/lib/formulation-routes";
import {
  feedRecipeFormulaReportRows,
  feedRecipeReportFilename,
  type FeedRecipeReportInput,
} from "@/lib/feed-formulation-report";
import { PUBLIC_PREMIX_ID } from "@/lib/public-feed-premix";
import { commercialPremixById, commercialPremixForProgramme } from "@/lib/commercial-premixes";
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
    /** Published practical inclusion guidance; advisory rather than a hard constraint. */
    practicalInclusionPct?: Record<string, number>;
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
  defaultPricePerKg?: number;
  priceMarket?: string;
  priceAsOf?: string;
  priceSource?: string;
  importMultiplier?: number;
  availabilityMultiplier?: number;
};

type IngredientPoolMode = "automatic" | "selected";

type Row = {
  key: number;
  ingredientId: string;
  price: string;
  min: string;
  max: string;
  lockedPct: string;
};


type RecipeReportContext = {
  programmeName: string;
  phaseLabel: string;
  sourceTable?: string;
  energySystem: "ME" | "NE";
  targetBatchKg: number;
  ingredients: FeedRecipeReportInput["ingredients"];
  formulationBasis?: FeedFormulationBasisSnapshot;
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

function defaultPriceInput(
  ingredientId: string,
  ingredients: readonly IngredientOption[],
): string {
  const price = ingredients.find((ingredient) => ingredient.id === ingredientId)?.defaultPricePerKg;
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
  const initialRows: Omit<Row, "key">[] =
    initialFormulaSet?.setup?.rows.filter(
      (row) => row.ingredientId !== PUBLIC_PREMIX_ID && !commercialPremixById(row.ingredientId),
    ).map((row) => ({
      ingredientId: row.ingredientId,
      price: row.price,
      min: row.min,
      max: row.max,
      lockedPct: row.lockedPct ?? "",
    })) ??
    initialFormulaSet?.ingredients
      .filter((ingredient) => ingredient.ingredientId !== PUBLIC_PREMIX_ID && !commercialPremixById(ingredient.ingredientId))
      .map((ingredient) => ({
        ingredientId: ingredient.ingredientId,
        price: String(ingredient.pricePerKg),
        min: "",
        max: "",
        lockedPct: "",
      })) ??
    [];
  const initialPremix = commercialPremixForProgramme(initialProgramme?.id ?? "");
  const legacySavedPremix = Boolean(initialFormulaSet) && (
    initialFormulaSet!.ingredients.some((ingredient) => ingredient.ingredientId === PUBLIC_PREMIX_ID) ||
    (initialPremix
      ? initialFormulaSet!.setup?.fixedPremixName !== initialPremix.name
      : initialFormulaSet!.setup?.useFixedPremix === true)
  );
  // Old recipes were approved by a fictional premix: they must be regenerated.
  const initialResult = initialFormulaSet && !legacySavedPremix
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
  const [ingredientPoolMode, setIngredientPoolMode] = useState<IngredientPoolMode>(
    initialFormulaSet?.setup?.ingredientPoolMode ?? "automatic",
  );
  const [targetBatchWeight, setTargetBatchWeight] = useState(
    String(initialFormulaSet?.targetBatchKg ?? 1000),
  );
  const savedPremixPrice =
    initialFormulaSet?.setup?.fixedPremixName === commercialPremixForProgramme(initialProgramme?.id ?? "")?.name &&
    initialFormulaSet.setup.fixedPremixPricePerKg.trim() !== ""
      ? initialFormulaSet.setup.fixedPremixPricePerKg
      : undefined;
  const [fixedPremixPricePerKg, setFixedPremixPricePerKg] = useState(
    savedPremixPrice ?? "",
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
  const [formulationBasis, setFormulationBasis] = useState<FeedFormulationBasisSnapshot | undefined>(
    initialFormulaSet?.basis,
  );
  const [activeSavedId, setActiveSavedId] = useState(initialFormulaSet?.id);
  const requirementsWereEdited = useRef(false);

  const allIngredientOptions = useMemo<IngredientOption[]>(
    () => ingredients,
    [ingredients],
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
  const selectedPremix = commercialPremixForProgramme(programmeId);
  const previousPremixId = useRef(commercialPremixForProgramme(initialProgramme?.id ?? "")?.id);
  useEffect(() => {
    if (previousPremixId.current !== selectedPremix?.id) {
      previousPremixId.current = selectedPremix?.id;
      // A supplier quote for one SKU is never carried over to another.
      setFixedPremixPricePerKg("");
      setResult(null);
    }
  }, [selectedPremix?.id]);
  const displayFixedPremixKgPerTonne = selectedPremix?.inclusionKgPerTonne ?? 0;
  const fixedPremixBatchKg =
    (displayBatchKg * displayFixedPremixKgPerTonne) / 1000;
  const baseMixBatchKg = displayBatchKg - fixedPremixBatchKg;

  useEffect(() => {
    if (!result && activeTab !== "setup") {
      setActiveTab("setup");
    }
  }, [result, activeTab]);

  const availableToAdd = ingredients.filter(
    (ingredient) =>
      ingredient.id !== PUBLIC_PREMIX_ID && !commercialPremixById(ingredient.id) &&
      !rows.some((row) => row.ingredientId === ingredient.id),
  );

  useEffect(() => {
    if (!programmeId || !phaseId || ingredientPoolMode === "selected") return;

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

        const suggestedIds = payload.ingredientIds.filter(
          (ingredientId) =>
            ingredientId !== PUBLIC_PREMIX_ID && !commercialPremixById(ingredientId) &&
            ingredients.some((ingredient) => ingredient.id === ingredientId),
        );
        setRows(
          suggestedIds.map((ingredientId, index) => ({
            key: index,
            ingredientId,
            price: defaultPriceInput(ingredientId, ingredients),
            min: "",
            max: "",
            lockedPct: "",
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
  }, [programmeId, phaseId, energySystem, ingredients, ingredientPoolMode]);

  function changeIngredientPoolMode(value: IngredientPoolMode) {
    requirementsWereEdited.current = true;
    setIngredientPoolMode(value);
    setSuggestionError(null);
    setResult(null);
  }

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
        price: defaultPriceInput(addIngredientId, ingredients),
        min: "",
        max: "",
        lockedPct: "",
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
      requestIngredients = rows
        .filter((row) => row.ingredientId !== PUBLIC_PREMIX_ID && !commercialPremixById(row.ingredientId))
        .map((row) => {
        const pricePerKg = Number(row.price);
        if (!Number.isFinite(pricePerKg) || pricePerKg < 0 || row.price.trim() === "") {
          throw new Error(
            `Enter a valid price per kg for ${ingredientById.get(row.ingredientId)?.name ?? row.ingredientId}.`,
          );
        }
        const min = row.min.trim() === "" ? undefined : Number(row.min);
        const max = row.max.trim() === "" ? undefined : Number(row.max);
        const lockedPct = row.lockedPct.trim() === "" ? undefined : Number(row.lockedPct);
        if (min !== undefined && (!Number.isFinite(min) || min < 0 || min > 100)) {
          throw new Error("Minimum inclusion must be between 0% and 100%.");
        }
        if (max !== undefined && (!Number.isFinite(max) || max < 0 || max > 100)) {
          throw new Error("Maximum inclusion must be between 0% and 100%.");
        }
        if (min !== undefined && max !== undefined && min > max) {
          throw new Error("Minimum inclusion cannot exceed maximum inclusion.");
        }
        if (
          lockedPct !== undefined &&
          (!Number.isFinite(lockedPct) || lockedPct < 0 || lockedPct > 100)
        ) {
          throw new Error("Locked inclusion must be between 0% and 100%.");
        }
        return {
          ingredientId: row.ingredientId,
          pricePerKg,
          minInclusionPct: lockedPct ?? min,
          maxInclusionPct: lockedPct ?? max,
        };
      });

      // Mature boars have no supported combined vitamin-mineral premix SKU.
      // Allow basal-only nutrition planning, never silently substitute sow X913.
      if (selectedPremix) {
        const premixPricePerKg = Number(fixedPremixPricePerKg);
        if (
          !Number.isFinite(premixPricePerKg) ||
          premixPricePerKg < 0 ||
          fixedPremixPricePerKg.trim() === ""
        ) {
          throw new Error("Enter a supplier-quoted price per kg for the selected Sustar premix.");
        }
        requestIngredients.push({
          ingredientId: selectedPremix.id,
          pricePerKg: premixPricePerKg,
          minInclusionPct: selectedPremix.inclusionPct,
          maxInclusionPct: selectedPremix.inclusionPct,
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
          includeSupplementationTargets: false, // Unverified manufacturer spec: do not claim micronutrient coverage.
          customPremixes: [],
          ingredients: requestIngredients,
        }),
      });
      const payload = (await response.json()) as LeastCostFormulationResult & {
        message?: string;
      };
      if (!response.ok) {
        throw new Error(payload.message ?? "Formulation request failed.");
      }
      if (payload.status === "optimal") {
        const basisIngredients = requestIngredients.map((requestIngredient) => {
          const sourceRow = rows.find((row) => row.ingredientId === requestIngredient.ingredientId);
          const ingredient = ingredientById.get(requestIngredient.ingredientId);
          const lockedPct =
            sourceRow && sourceRow.lockedPct.trim() !== ""
              ? Number(sourceRow.lockedPct)
              : undefined;
          return {
            ingredientId: requestIngredient.ingredientId,
            name: ingredient?.name ?? requestIngredient.ingredientId,
            category: ingredient?.category,
            pricePerKg: requestIngredient.pricePerKg,
            requestMinInclusionPct: requestIngredient.minInclusionPct,
            requestMaxInclusionPct: requestIngredient.maxInclusionPct,
            lockedPct,
            defaultMinInclusionPct: ingredient?.minInclusionPct,
            defaultMaxInclusionPct: ingredient?.maxInclusionPct,
            phaseMaxInclusionPct:
              selectedPhase?.maxInclusionPct?.[requestIngredient.ingredientId],
            priceMarket: ingredient?.priceMarket,
            priceAsOf: ingredient?.priceAsOf,
            priceSource: ingredient?.priceSource,
            importMultiplier: ingredient?.importMultiplier,
            availabilityMultiplier: ingredient?.availabilityMultiplier,
          };
        });

        setFormulationBasis(
          buildFeedFormulationBasis({
            programmeId,
            programmeName: selectedProgramme?.name ?? programmeId,
            phaseId,
            phaseLabel: selectedPhase?.label ?? phaseId,
            sourceTable: selectedPhase?.sourceTable,
            energySystem,
            targetBatchKg: batchKg,
            ingredientPoolMode,
            solverObjective: "least-cost-with-alternatives",
            settings: {
              includeSupplementationTargets: false,
              traceMineralBasis: "inorganic",
            },
            ingredients: basisIngredients,
            ...(selectedPremix ? {
              fixedPremix: {
                id: selectedPremix.id,
                name: selectedPremix.name,
                inclusionKgPerTonne: selectedPremix.inclusionKgPerTonne,
                pricePerKg: Number(fixedPremixPricePerKg),
              },
            } : {}),
          }),
        );
      } else {
        setFormulationBasis(undefined);
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
    formulationBasis,
    ingredients: [
      ...rows.map((row) => {
        const ingredient = ingredientById.get(row.ingredientId);
        return {
          ingredientId: row.ingredientId,
          name: ingredient?.name ?? row.ingredientId,
          pricePerKg: Number(row.price),
          practicalInclusionPct:
            selectedPhase?.practicalInclusionPct?.[row.ingredientId],
          maxInclusionPct:
            selectedPhase?.maxInclusionPct?.[row.ingredientId] ??
            ingredient?.maxInclusionPct,
        };
      }),
      ...(selectedPremix ? [{
        ingredientId: selectedPremix.id,
        name: selectedPremix.name,
        pricePerKg: Number(fixedPremixPricePerKg),
        maxInclusionPct: selectedPremix.inclusionPct,
      }] : []),
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
          basis: formulationBasis ?? initialFormulaSet?.basis,
          setup: {
            rows: rows.map(({ ingredientId, price, min, max, lockedPct }) => ({
              ingredientId,
              price,
              min,
              max,
              lockedPct,
            })),
            ingredientPoolMode,
            useFixedPremix: Boolean(selectedPremix),
            fixedPremixName: selectedPremix?.name ?? "No verified commercial premix",
            fixedPremixKgPerTonne: String(selectedPremix?.inclusionKgPerTonne ?? 0),
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
              {selectedPremix
                ? "The specified Sustar premix is included at its published dose (not a universal 10 kg/t). Its micronutrient contribution is UNVERIFIED; enter a real supplier quote."
                : "No compatible commercial premix has been established for mature boars. You can plan the basal ingredients only; this is NOT complete feed and must not be manufactured or fed as a finished recipe."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-5 py-2 sm:px-6">
            <div className="grid gap-4 md:grid-cols-2">
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
              {selectedPremix ? <Field label={`Supplier price / kg — ${selectedPremix.sku} (USD)`}>
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
              </Field> : null}
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-lg border border-hairline bg-background px-4 py-3 text-sm">
                <div className="font-medium text-ink">Required supplementation</div>
                <div className="mt-1 leading-6 text-ink-muted">
                  {selectedPremix
                    ? `${selectedPremix.name} is included at ${selectedPremix.inclusionKgPerTonne} kg/t (UNVERIFIED).`
                    : "No commercially supported vitamin-mineral premix is assigned to this programme."}
                  {" "}Vitamin and trace-mineral supplementation is NOT checked.
                  This is not a complete feed formulation.
                </div>
              </div>

              <div className="rounded-lg border border-hairline bg-background px-4 py-3 text-sm">
                <div className="font-medium text-ink">Mix plan</div>
                <div className="mt-1 leading-6 text-ink-muted">
                  <strong className="text-ink">{baseMixBatchKg.toFixed(2)} kg</strong> basal feed
                  {selectedPremix ? (
                    <>{" + "}<strong className="text-ink">{fixedPremixBatchKg.toFixed(2)} kg</strong>
                      {" "}unverified premix</>
                  ) : null}
                  {" = "}<strong className="text-ink">{displayBatchKg.toFixed(2)} kg</strong>
                  {" "}{selectedPremix ? "planned mix" : "basal mix only"}.
                </div>
              </div>
            </div>

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

          <div className="rounded-lg border border-hairline bg-raised/20 p-3">
            <div className="text-sm font-medium text-ink">Ingredient pool</div>
            <div className="mt-1 text-xs leading-5 text-ink-muted">
              The solver can only use ingredients listed in the table below.
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-hairline bg-background px-3 py-2">
                <input
                  type="radio"
                  name="ingredient-pool-mode"
                  value="automatic"
                  checked={ingredientPoolMode === "automatic"}
                  onChange={() => changeIngredientPoolMode("automatic")}
                  className="mt-0.5 h-4 w-4"
                />
                <span>
                  <span className="block text-sm font-medium text-ink">Suggested pool</span>
                  <span className="block text-xs leading-5 text-ink-muted">
                    FeedSport refreshes a practical priced starting pool when requirements change.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-hairline bg-background px-3 py-2">
                <input
                  type="radio"
                  name="ingredient-pool-mode"
                  value="selected"
                  checked={ingredientPoolMode === "selected"}
                  onChange={() => changeIngredientPoolMode("selected")}
                  className="mt-0.5 h-4 w-4"
                />
                <span>
                  <span className="block text-sm font-medium text-ink">My ingredients</span>
                  <span className="block text-xs leading-5 text-ink-muted">
                    Keep this list when requirements change and formulate only from ingredients you can source.
                  </span>
                </span>
              </label>
            </div>
          </div>

          {suggesting ? (
            <div className="rounded-lg border border-hairline bg-raised/30 px-4 py-3 text-sm text-ink-muted">
              Building the priced candidate pool for this requirement phase…
            </div>
          ) : null}

          <div className="min-w-0 max-w-full overflow-x-auto rounded-lg border border-hairline">
            <table className="w-full min-w-[760px] table-fixed text-sm">
              <colgroup>
                <col className="w-[28%]" />
                <col className="w-[25%]" />
                <col className="w-[13%]" />
                <col className="w-[13%]" />
                <col className="w-[15%]" />
                <col className="w-[6%]" />
              </colgroup>
              <thead className="bg-raised/70 text-left text-xs uppercase tracking-wide text-ink-faint">
                <tr>
                  <th className="px-3 py-2.5">Ingredient</th>
                  <th className="px-3 py-2.5">Price / kg</th>
                  <th className="px-3 py-2.5">Min %</th>
                  <th className="px-3 py-2.5">Max %</th>
                  <th className="px-3 py-2.5">Lock %</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const ingredient = ingredientById.get(row.ingredientId);
                  const importMultiplier = ingredient?.importMultiplier ?? 1;
                  const availabilityMultiplier = ingredient?.availabilityMultiplier ?? 1;
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
                        {ingredient?.priceMarket ? (
                          <div
                            className="mt-1 text-[11px] leading-4 text-ink-faint"
                            title={ingredient.priceSource}
                          >
                            Default: {ingredient.priceMarket}
                            {importMultiplier > 1 ? ` · ×${importMultiplier.toFixed(2)} import` : ""}
                            {availabilityMultiplier > 1
                              ? ` · ×${availabilityMultiplier.toFixed(2)} availability`
                              : ""}
                            {ingredient.priceAsOf ? ` · ${ingredient.priceAsOf}` : ""}
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
                          disabled={row.lockedPct.trim() !== ""}
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
                          disabled={row.lockedPct.trim() !== ""}
                          placeholder={(
                            selectedPhase?.maxInclusionPct?.[row.ingredientId] ??
                            ingredient?.maxInclusionPct ??
                            100
                          ).toString()}
                          onChange={(event) => updateRow(row.key, "max", event.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={row.lockedPct}
                          placeholder="—"
                          title="Set an exact inclusion percentage. This overrides Min % and Max % for this ingredient."
                          onChange={(event) => updateRow(row.key, "lockedPct", event.target.value)}
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

          <div className="text-xs leading-5 text-ink-muted">
            Remove an ingredient to make it unavailable. Set <strong className="text-ink">Lock %</strong>{" "}
            to force an exact inclusion; otherwise Min % and Max % remain optional bounds.
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

          {legacySavedPremix ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-ink">
              This saved formulation used the retired hypothetical premix. Its previous nutrient verification has been withdrawn; enter a real premix price and generate a new recipe.
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
              formulationBasis={formulationBasis}
              reportContext={reportContext}
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
            <>
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm">
                Commercial premix UNVERIFIED. The displayed nutrients exclude vitamin and trace-mineral verification.
              </div>
              <NutritionPanel result={result} selectedRecipeId={selectedRecipeId} />
            </>
          ) : null}
      </div>
    </div>
    </div>
  );
}

function ResultPanel({
  result,
  ingredientById,
  formulationBasis,
  reportContext,
  selectedRecipeId,
  onSelectedRecipeChange,
  batchWeightKg,
}: {
  result: LeastCostFormulationResult;
  ingredientById: Map<string, IngredientOption>;
  formulationBasis?: FeedFormulationBasisSnapshot;
  reportContext: RecipeReportContext;
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
            <Badge variant="secondary">Basal constraints satisfied only</Badge>
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
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm leading-6 text-ink">
            <strong>{formulationBasis?.fixedPremix ? "Premix unverified:" : "Basal-only formulation:"}</strong>
            {formulationBasis?.fixedPremix
              ? " The selected Sustar product is included at its published dose, but vitamin and trace-mineral concentrations have not been verified against a supplier COA."
              : " No commercial premix was included. This recipe does not cover vitamin and trace-mineral supplementation."}
            {" "}Only basal nutrient constraints were checked. Do not manufacture or feed without qualified nutritionist review.
          </div>
          <FormulationBasisPanel basis={formulationBasis} />
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

          <PracticalAdvisories
            advisories={recipeReportInput(selectedRecipe, reportContext).practicalAdvisories ?? []}
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

function FormulationBasisPanel({
  basis,
}: {
  basis?: FeedFormulationBasisSnapshot;
}) {
  if (!basis) {
    return (
      <div className="rounded-lg border border-hairline bg-raised/30 px-4 py-3 text-sm text-ink-muted">
        This saved recipe predates formulation-basis snapshots. Regenerate it to record the exact
        solver inputs and run fingerprint.
      </div>
    );
  }

  const lockedCount = basis.ingredients.filter((ingredient) => ingredient.lockedPct !== undefined).length;
  const constrainedCount = basis.ingredients.filter(
    (ingredient) =>
      ingredient.requestMinInclusionPct !== undefined ||
      ingredient.requestMaxInclusionPct !== undefined,
  ).length;

  return (
    <div className="rounded-lg border border-hairline bg-raised/20">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
        <div>
          <div className="text-sm font-medium text-ink">Formulation basis</div>
          <div className="mt-1 text-xs leading-5 text-ink-muted">
            {basis.ingredientPoolMode === "selected" ? "My ingredients" : "Suggested pool"}
            {" · "}
            {basis.ingredients.length} ingredients
            {" · "}
            {basis.energySystem}
            {basis.sourceTable ? ` · Table ${basis.sourceTable}` : ""}
            {" · "}
            {lockedCount} locked
            {" · "}
            {constrainedCount} with request bounds
          </div>
        </div>
        <code className="rounded bg-background px-2 py-1 text-[11px] font-semibold text-ink">
          {basis.fingerprint}
        </code>
      </div>
      <details className="border-t border-hairline">
        <summary className="cursor-pointer px-4 py-2.5 text-xs font-medium text-ink">
          Show exact solver inputs
        </summary>
        <div className="overflow-x-auto border-t border-hairline">
          <table className="w-full min-w-[980px] text-xs">
            <thead className="bg-raised/60 text-left uppercase tracking-wide text-ink-faint">
              <tr>
                <th className="px-3 py-2">Ingredient</th>
                <th className="px-3 py-2">Price/kg</th>
                <th className="px-3 py-2">Price basis</th>
                <th className="px-3 py-2">Request min</th>
                <th className="px-3 py-2">Request max</th>
                <th className="px-3 py-2">Lock</th>
                <th className="px-3 py-2">FeedSport max</th>
              </tr>
            </thead>
            <tbody>
              {basis.ingredients.map((ingredient) => {
                const feedsportMax =
                  ingredient.phaseMaxInclusionPct ?? ingredient.defaultMaxInclusionPct;
                return (
                  <tr key={ingredient.ingredientId} className="border-t border-hairline">
                    <td className="px-3 py-2">
                      <div className="font-medium text-ink">{ingredient.name}</div>
                      <div className="text-[11px] text-ink-faint">{ingredient.ingredientId}</div>
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {ingredient.pricePerKg.toFixed(4)}
                    </td>
                    <td className="px-3 py-2 text-ink-muted">
                      <div>{ingredient.priceMarket ?? "Manual / saved price"}</div>
                      <div className="text-[11px] text-ink-faint">
                        {ingredient.importMultiplier && ingredient.importMultiplier > 1
                          ? `import ×${ingredient.importMultiplier.toFixed(2)}`
                          : "local/default"}
                        {ingredient.availabilityMultiplier &&
                        ingredient.availabilityMultiplier > 1
                          ? ` · availability ×${ingredient.availabilityMultiplier.toFixed(2)}`
                          : ""}
                        {ingredient.priceAsOf ? ` · ${ingredient.priceAsOf}` : ""}
                      </div>
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {ingredient.requestMinInclusionPct?.toFixed(3) ?? "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {ingredient.requestMaxInclusionPct?.toFixed(3) ?? "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {ingredient.lockedPct?.toFixed(3) ?? "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {feedsportMax?.toFixed(3) ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-hairline px-4 py-3 text-[11px] leading-5 text-ink-muted">
          Solver mode: least-cost baseline plus validated alternatives. Supplementation targets:{" "}
          {basis.settings.includeSupplementationTargets ? "on" : "off"}. Batch:{" "}
          {basis.targetBatchKg.toFixed(1)} kg. Generated{" "}
          {new Date(basis.generatedAt).toLocaleString()}.
        </div>
      </details>
    </div>
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
    practicalAdvisories: recipe.solution.formula.ingredients.flatMap((row) => {
      const metadata = context.ingredients.find(
        (ingredient) => ingredient.ingredientId === row.ingredientId,
      );
      const practical = metadata?.practicalInclusionPct;
      if (practical === undefined || row.inclusionPct <= practical + 1e-6) return [];
      return [{
        ingredientId: row.ingredientId,
        name: metadata?.name ?? row.ingredientId,
        inclusionPct: row.inclusionPct,
        practicalInclusionPct: practical,
        maxInclusionPct: metadata?.maxInclusionPct,
      }];
    }),
    formulationBasis: context.formulationBasis,
    generatedAt: new Date(),
  };
}

function PracticalAdvisories({
  advisories,
}: {
  advisories: NonNullable<FeedRecipeReportInput["practicalAdvisories"]>;
}) {
  if (advisories.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
        <AlertTriangle size={16} className="text-amber-600" />
        Above practical inclusion guidance
      </div>
      <div className="mt-1 text-xs leading-5 text-ink-muted">
        These levels remain within FeedSport&apos;s hard limits, but exceed the published practical
        guidance for this phase. Review ingredient quality, consistency and local experience before
        production.
      </div>
      <div className="mt-3 overflow-x-auto rounded-md border border-amber-500/20 bg-background">
        <table className="w-full min-w-[520px] text-xs">
          <thead className="text-left uppercase tracking-wide text-ink-faint">
            <tr>
              <th className="px-3 py-2">Ingredient</th>
              <th className="px-3 py-2 text-right">Recipe</th>
              <th className="px-3 py-2 text-right">Practical</th>
              <th className="px-3 py-2 text-right">Hard max</th>
            </tr>
          </thead>
          <tbody>
            {advisories.map((advisory) => (
              <tr key={advisory.ingredientId} className="border-t border-hairline">
                <td className="px-3 py-2 text-ink">{advisory.name}</td>
                <td className="px-3 py-2 text-right">{advisory.inclusionPct.toFixed(2)}%</td>
                <td className="px-3 py-2 text-right">{advisory.practicalInclusionPct.toFixed(2)}%</td>
                <td className="px-3 py-2 text-right">
                  {advisory.maxInclusionPct === undefined
                    ? "—"
                    : `${advisory.maxInclusionPct.toFixed(2)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
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

          <PracticalAdvisories advisories={input.practicalAdvisories ?? []} />

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

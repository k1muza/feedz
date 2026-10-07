
import type { DietFormula } from "./diet-formula";
import type { FormulationNutrientComparison } from "./feed-optimizer";
import type { FeedFormulationBasisSnapshot } from "./formulation-basis";
import {
  applyBase,
  COLORS,
  FONT,
  newWorkbook,
  PORTRAIT_PAGE,
  ruleRow,
  solidFill,
  styleSection,
  styleTableHeader,
  styleTitle,
  styleTotal,
  workbookBytes,
} from "./reports/sheet";

export type FeedRecipeReportIngredient = {
  ingredientId: string;
  name: string;
  pricePerKg: number;
};

export type FeedRecipeReportInput = {
  recipeLabel: string;
  recipeDescription: string;
  programmeName: string;
  phaseLabel: string;
  sourceTable?: string;
  energySystem: "ME" | "NE";
  targetBatchKg: number;
  formula: DietFormula;
  nutrientProfile: readonly FormulationNutrientComparison[];
  ingredients: readonly FeedRecipeReportIngredient[];
  costPerKg: number;
  costIncreasePct: number;
  formulationBasis?: FeedFormulationBasisSnapshot;
  generatedAt: Date;
};

export type FeedRecipeFormulaReportRow = {
  ingredientId: string;
  name: string;
  inclusionPct: number;
  kgForBatch: number;
  kgPerTonne: number;
  pricePerKg: number;
  costForBatchContribution: number;
  costPerTonneContribution: number;
};

export function feedRecipeFormulaReportRows(
  input: Pick<FeedRecipeReportInput, "formula" | "ingredients" | "targetBatchKg">,
): FeedRecipeFormulaReportRow[] {
  if (!Number.isFinite(input.targetBatchKg) || input.targetBatchKg <= 0) {
    throw new Error("Target batch weight must be greater than 0 kg.");
  }

  const ingredientById = new Map(
    input.ingredients.map((ingredient) => [ingredient.ingredientId, ingredient]),
  );

  return input.formula.ingredients.map((row) => {
    const ingredient = ingredientById.get(row.ingredientId);
    if (!ingredient) {
      throw new Error("Missing report ingredient metadata for " + row.ingredientId + ".");
    }
    const kgPerTonne = row.inclusionPct * 10;
    const kgForBatch = (row.inclusionPct / 100) * input.targetBatchKg;
    return {
      ingredientId: row.ingredientId,
      name: ingredient.name,
      inclusionPct: row.inclusionPct,
      kgForBatch,
      kgPerTonne,
      pricePerKg: ingredient.pricePerKg,
      costForBatchContribution: kgForBatch * ingredient.pricePerKg,
      costPerTonneContribution: kgPerTonne * ingredient.pricePerKg,
    };
  });
}

function safeFilenamePart(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "recipe";
}

export function feedRecipeReportFilename(input: {
  phaseLabel: string;
  recipeLabel: string;
}): string {
  return (
    "feedsport-" +
    safeFilenamePart(input.phaseLabel) +
    "-" +
    safeFilenamePart(input.recipeLabel) +
    "-recipe.xlsx"
  );
}

function addRecipeSheet(
  workbook: import("exceljs").Workbook,
  input: FeedRecipeReportInput,
) {
  const sheet = workbook.addWorksheet("Recipe", {
    properties: { tabColor: { argb: COLORS.blue } },
    views: [{ state: "frozen", ySplit: 14, showGridLines: false }],
    pageSetup: PORTRAIT_PAGE,
  });
  sheet.columns = [
    { width: 30 },
    { width: 14 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 21 },
    { width: 18 },
  ];

  const sourceSuffix = input.sourceTable ? " · source table " + input.sourceTable : "";
  styleTitle(
    sheet,
    input.recipeLabel + " feed recipe",
    input.programmeName +
      " · " +
      input.phaseLabel +
      " · " +
      input.energySystem +
      sourceSuffix +
      " · prepared " +
      input.generatedAt.toLocaleDateString("en-GB"),
    "G",
  );

  sheet.getRow(6).values = ["RECIPE OVERVIEW"];
  styleSection(sheet.getRow(6), 7);

  const facts: Array<[string, string | number, string, string | number]> = [
    ["Recipe", input.recipeLabel, "Cost / kg", input.costPerKg],
    ["Programme", input.programmeName, "Batch weight (kg)", input.targetBatchKg],
    ["Phase", input.phaseLabel, "Batch cost", input.costPerKg * input.targetBatchKg],
    ["Energy basis", input.energySystem, "Cost / tonne", input.costPerKg * 1000],
  ];
  facts.forEach(([leftLabel, leftValue, rightLabel, rightValue], index) => {
    const row = 7 + index;
    sheet.getCell(row, 1).value = leftLabel;
    sheet.getCell(row, 2).value = leftValue;
    sheet.getCell(row, 4).value = rightLabel;
    sheet.getCell(row, 5).value = rightValue;
    for (const column of [1, 4]) {
      sheet.getCell(row, column).fill = solidFill(COLORS.plane);
      sheet.getCell(row, column).font = {
        name: FONT,
        size: 10,
        color: { argb: COLORS.muted },
      };
    }
    for (const column of [2, 5]) {
      sheet.getCell(row, column).font = {
        name: FONT,
        size: 10,
        bold: true,
        color: { argb: COLORS.ink },
      };
    }
  });
  sheet.getCell(7, 5).numFmt = "$0.0000";
  sheet.getCell(8, 5).numFmt = "0.0";
  sheet.getCell(9, 5).numFmt = "$#,##0.00";
  sheet.getCell(10, 5).numFmt = "$#,##0.00";

  sheet.mergeCells("A12:G12");
  sheet.getCell("A12").value = input.recipeDescription;
  sheet.getCell("A12").alignment = { wrapText: true, vertical: "top" };
  sheet.getCell("A12").font = {
    name: FONT,
    size: 9,
    italic: true,
    color: { argb: COLORS.muted },
  };
  sheet.getRow(12).height = 30;

  const headerRow = 14;
  sheet.getRow(headerRow).values = [
    "Ingredient",
    "Inclusion %",
    "kg / batch",
    "kg / tonne",
    "Price / kg",
    "Cost contribution / batch",
    "Share of recipe cost",
  ];
  styleTableHeader(sheet.getRow(headerRow), 1, 7);

  const rows = feedRecipeFormulaReportRows(input);
  rows.forEach((row, index) => {
    const excelRow = headerRow + 1 + index;
    sheet.getRow(excelRow).values = [
      row.name,
      row.inclusionPct,
      row.kgForBatch,
      row.kgPerTonne,
      row.pricePerKg,
      row.costForBatchContribution,
      input.costPerKg > 0
        ? row.costForBatchContribution / (input.costPerKg * input.targetBatchKg)
        : 0,
    ];
    sheet.getCell(excelRow, 2).numFmt = "0.000";
    sheet.getCell(excelRow, 3).numFmt = "0.0";
    sheet.getCell(excelRow, 4).numFmt = "0.0";
    sheet.getCell(excelRow, 5).numFmt = "$0.0000";
    sheet.getCell(excelRow, 6).numFmt = "$#,##0.00";
    sheet.getCell(excelRow, 7).numFmt = "0.0%";
    ruleRow(sheet, excelRow, 7);
  });

  const totalRow = headerRow + 1 + rows.length;
  sheet.getRow(totalRow).values = [
    "TOTAL",
    rows.reduce((sum, row) => sum + row.inclusionPct, 0),
    rows.reduce((sum, row) => sum + row.kgForBatch, 0),
    rows.reduce((sum, row) => sum + row.kgPerTonne, 0),
    undefined,
    rows.reduce((sum, row) => sum + row.costForBatchContribution, 0),
    1,
  ];
  sheet.getCell(totalRow, 2).numFmt = "0.000";
  sheet.getCell(totalRow, 3).numFmt = "0.0";
  sheet.getCell(totalRow, 4).numFmt = "0.0";
  sheet.getCell(totalRow, 6).numFmt = "$#,##0.00";
  sheet.getCell(totalRow, 7).numFmt = "0.0%";
  styleTotal(sheet.getRow(totalRow), 7, true);

  const noteRow = totalRow + 3;
  sheet.mergeCells(noteRow, 1, noteRow + 1, 7);
  sheet.getCell(noteRow, 1).value =
    "Planning statement: ingredient prices are the values used when this recipe was formulated. Re-run the formulation when supplier quotations, ingredient analyses or nutritional requirements change. This report records a planning formulation; it is not a substitute for quality-control testing of actual feed ingredients.";
  sheet.getCell(noteRow, 1).alignment = { wrapText: true, vertical: "top" };
  sheet.getCell(noteRow, 1).font = {
    name: FONT,
    size: 9,
    italic: true,
    color: { argb: COLORS.muted },
  };
  sheet.getRow(noteRow).height = 28;

  applyBase(sheet);
  sheet.headerFooter.oddFooter = "&LFeedSport feed recipe&RPage &P of &N";
}

function addBasisSheet(
  workbook: import("exceljs").Workbook,
  input: FeedRecipeReportInput,
) {
  const basis = input.formulationBasis;
  if (!basis) return;

  const sheet = workbook.addWorksheet("Basis", {
    views: [{ state: "frozen", ySplit: 12, showGridLines: false }],
    pageSetup: PORTRAIT_PAGE,
  });
  sheet.columns = [
    { width: 31 },
    { width: 16 },
    { width: 15 },
    { width: 15 },
    { width: 13 },
    { width: 17 },
  ];

  styleTitle(
    sheet,
    "Formulation basis",
    basis.fingerprint + " · exact inputs used to generate this recipe set",
    "F",
  );

  sheet.getRow(6).values = ["RUN"];
  styleSection(sheet.getRow(6), 6);

  const facts: Array<[string, string | number, string, string | number]> = [
    ["Fingerprint", basis.fingerprint, "Ingredient pool", basis.ingredientPoolMode === "selected" ? "My ingredients" : "Suggested pool"],
    ["Programme", basis.programmeName, "Phase", basis.phaseLabel],
    ["Energy basis", basis.energySystem, "Batch weight (kg)", basis.targetBatchKg],
    ["Solver mode", "Least-cost + alternatives", "Source table", basis.sourceTable ?? "—"],
    ["Supplementation targets", basis.settings.includeSupplementationTargets ? "On" : "Off", "Generated", new Date(basis.generatedAt).toLocaleString("en-GB")],
  ];
  facts.forEach(([leftLabel, leftValue, rightLabel, rightValue], index) => {
    const row = 7 + index;
    sheet.getCell(row, 1).value = leftLabel;
    sheet.getCell(row, 2).value = leftValue;
    sheet.getCell(row, 4).value = rightLabel;
    sheet.getCell(row, 5).value = rightValue;
  });

  const headerRow = 13;
  sheet.getRow(headerRow).values = [
    "Ingredient",
    "Price / kg",
    "Request min %",
    "Request max %",
    "Lock %",
    "FeedSport max %",
  ];
  styleTableHeader(sheet.getRow(headerRow), 1, 6);

  basis.ingredients.forEach((ingredient, index) => {
    const row = headerRow + 1 + index;
    const feedsportMax =
      ingredient.phaseMaxInclusionPct ?? ingredient.defaultMaxInclusionPct;
    sheet.getRow(row).values = [
      ingredient.name,
      ingredient.pricePerKg,
      ingredient.requestMinInclusionPct,
      ingredient.requestMaxInclusionPct,
      ingredient.lockedPct,
      feedsportMax,
    ];
    for (const column of [2, 3, 4, 5, 6]) {
      sheet.getCell(row, column).numFmt = "0.0000";
    }
    ruleRow(sheet, row, 6);
  });

  const noteRow = headerRow + basis.ingredients.length + 3;
  sheet.mergeCells(noteRow, 1, noteRow + 1, 6);
  sheet.getCell(noteRow, 1).value =
    "The fingerprint changes when the recorded formulation inputs change. Displayed recipe percentages may be rounded, but FeedSport keeps the optimizer result at full precision for validation and saved formulations.";
  sheet.getCell(noteRow, 1).alignment = { wrapText: true, vertical: "top" };

  applyBase(sheet);
  sheet.headerFooter.oddFooter = "&LFeedSport formulation basis&RPage &P of &N";
}

function addNutritionSheet(
  workbook: import("exceljs").Workbook,
  input: FeedRecipeReportInput,
) {
  const sheet = workbook.addWorksheet("Nutrition", {
    properties: { tabColor: { argb: COLORS.green } },
    views: [{ state: "frozen", ySplit: 6, showGridLines: false }],
    pageSetup: PORTRAIT_PAGE,
  });
  sheet.columns = [
    { width: 33 },
    { width: 13 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 13 },
  ];

  styleTitle(
    sheet,
    input.recipeLabel + " nutritional profile",
    input.programmeName +
      " · " +
      input.phaseLabel +
      " · requirement or supplementation target versus calculated recipe concentration",
    "F",
  );

  sheet.getRow(6).values = [
    "Nutrient",
    "Rule",
    "Requirement / target",
    "Actual",
    "Margin",
    "Status",
  ];
  styleTableHeader(sheet.getRow(6), 1, 6);

  input.nutrientProfile.forEach((row, index) => {
    const excelRow = 7 + index;
    sheet.getRow(excelRow).values = [
      row.label,
      row.relation === "min" ? "≥" : "≤",
      row.requirement,
      row.actual,
      row.margin,
      row.binding ? "Binding" : "Satisfied",
    ];
    const decimals =
      row.unit === "kcal/kg" ? "0" : row.unit === "ppm" ? "0.00" : "0.000";
    for (const column of [3, 4, 5]) {
      sheet.getCell(excelRow, column).numFmt = decimals;
    }
    sheet.getCell(excelRow, 2).alignment = { horizontal: "center" };
    if (row.binding) {
      sheet.getCell(excelRow, 6).fill = solidFill(COLORS.paleGold);
      sheet.getCell(excelRow, 6).font = {
        name: FONT,
        size: 10,
        bold: true,
        color: { argb: COLORS.navy },
      };
    }
    ruleRow(sheet, excelRow, 6);
  });

  const unitsStart = 7 + input.nutrientProfile.length + 2;
  sheet.getRow(unitsStart).values = ["Units"];
  styleSection(sheet.getRow(unitsStart), 6);
  const units = [...new Set(input.nutrientProfile.map((row) => row.unit))];
  units.forEach((unit, index) => {
    const row = unitsStart + 1 + index;
    sheet.getCell(row, 1).value = unit;
    sheet.getCell(row, 2).value =
      unit === "%"
        ? "percentage of complete diet"
        : unit === "kcal/kg"
          ? "kilocalories per kilogram"
          : unit === "ppm"
            ? "parts per million"
            : unit;
  });

  applyBase(sheet);
  sheet.headerFooter.oddFooter = "&LFeedSport nutritional profile&RPage &P of &N";
}

export async function buildFeedRecipeReport(
  input: FeedRecipeReportInput,
): Promise<ArrayBuffer> {
  const workbook = await newWorkbook({
    title: input.recipeLabel + " feed recipe",
    subject: input.programmeName + " — " + input.phaseLabel,
    description:
      "FeedSport feed formulation recipe, ingredient economics and nutritional compliance report.",
    company: "FeedSport",
    created: input.generatedAt,
  });

  addRecipeSheet(workbook, input);
  addNutritionSheet(workbook, input);
  addBasisSheet(workbook, input);

  return workbookBytes(workbook);
}

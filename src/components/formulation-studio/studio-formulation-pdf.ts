import { readFile } from "node:fs/promises";
import path from "node:path";

import fontkit from "@pdf-lib/fontkit";
import {
  PDFDocument,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib";

import { siteConfig } from "@/lib/seo";
import { distinguishingDp } from "@/lib/numerical-tolerance";
import { documentationGapLine,
  DATA_STATUS_LABELS,
  UPPER_LIMIT_VITAMIN_IDS,
  formatUpperLimitValue,
  upperLimitSentence,
  upperLimitTitle,
  LEGACY_PREMIX_NOTE,
  PRE_POULTRY_DIGESTIBLE_PHOSPHORUS_NOTE,
  isFormulationAssessment,
  predatesPoultryDigestiblePhosphorus,
  requirementDisplay,
  type FormulationAssessment,
  type PremixComparison,
  type RequirementCheck,
  type SupplementationStatus,
  type UpperLimitCheck,
  type UpperLimitStatus,
} from "@/lib/formulation-assessment-model";
import { INGREDIENT_LIBRARY_SOURCE } from "@/lib/ingredient-nutrients";
import {
  commercialPremixById,
  premixNutrientContributions,
  type CommercialPremix,
} from "@/lib/commercial-premixes";

/** A schema-1 assessment from a saved version: shown with the legacy note, never re-scored. */
export type LegacyStudioAssessment = { schemaVersion: 1; [key: string]: unknown };

export interface StudioFormulationPdfInput {
  documentName: string;
  programmeName: string;
  phaseLabel: string;
  weightRange: string;
  source: string;
  goalLabel: string;
  goalDescription: string;
  mode: "Optimised" | "Manual";
  batchKg: number;
  costPerTonne: number;
  leastCostPerTonne?: number;
  preparedFor?: string;
  assessment: FormulationAssessment | LegacyStudioAssessment;
  /** Optional premix advisory from the optimize response (Replace, never Add). */
  premixComparison?: PremixComparison | null;
  /** The commercial premix in the recipe; detected from the assessment when omitted. */
  premixId?: string | null;
  ingredients: {
    name: string;
    setting: string;
    inclusionPct: number;
    pricePerTonne: number | null;
  }[];
  nutrients: {
    name: string;
    unit: string;
    value: number;
    min: number | null;
    max: number | null;
    status: "met" | "below" | "above";
    limiting: boolean;
  }[];
  advisories: string[];
  notes: string[];
  generatedAt?: Date;
}

const W = 595.28;
const H = 841.89;
const M = 42;
const CW = W - M * 2;
const BOTTOM = M + 49;

const hex = (value: string) =>
  rgb(
    Number.parseInt(value.slice(1, 3), 16) / 255,
    Number.parseInt(value.slice(3, 5), 16) / 255,
    Number.parseInt(value.slice(5, 7), 16) / 255,
  );

const C = {
  ink: hex("#191b18"),
  body: hex("#3d403a"),
  muted: hex("#6b6f66"),
  green: hex("#1d3a2a"),
  paleGreen: hex("#dfe6dc"),
  amber: hex("#d99a2b"),
  paleAmber: hex("#fdf6e8"),
  red: hex("#b4412f"),
  amberText: hex("#7a5414"),
  rule: hex("#d9d4c7"),
  pale: hex("#f3f0e8"),
  white: rgb(1, 1, 1),
};

const FONT_DIR = path.join(process.cwd(), "src/assets/fonts/pdf");
const FONT_FILES = {
  regular: "Archivo-Regular.ttf",
  semibold: "Archivo-SemiBold.ttf",
  bold: "Archivo-Bold.ttf",
  mono: "PlexMono-Regular.ttf",
  monoMedium: "PlexMono-Medium.ttf",
} as const;
type FontName = keyof typeof FONT_FILES;

let fontBytes: Promise<Record<FontName, Uint8Array>> | undefined;
function loadFontBytes() {
  fontBytes ??= Promise.all(
    Object.entries(FONT_FILES).map(async ([name, file]) => [
      name,
      await readFile(path.join(FONT_DIR, file)),
    ] as const),
  ).then(
    (entries) =>
      Object.fromEntries(entries) as unknown as Record<FontName, Uint8Array>,
  );
  return fontBytes;
}

const number = (value: number, dp = 2) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });

const money = (value: number, dp = 2) => `$${number(value, dp)}`;

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

const SUPPLEMENTATION_STATUS_LABELS: Record<SupplementationStatus, string> = {
  at_recommendation: "At recommendation",
  below_recommendation: "Below recommendation",
  no_data: "No data",
};

const UPPER_LIMIT_STATUS_LABELS: Record<UpperLimitStatus, string> = {
  exceeds: "Above the reference maximum",
  within: "Within the reference maximum",
  not_documented: "Not documented by the premix",
};

const ingredientName = (id: string) => INGREDIENT_LIBRARY_SOURCE.ingredients.find((ingredient) => ingredient.id === id)?.name ?? id;

/** "From Sustar GlyPro X912 56,000 IU/kg." The contributors to a CFIA value, largest first. */
export function upperLimitContributors(row: Pick<UpperLimitCheck, "contributions" | "unit">): string {
  if (!row.contributions.length) return "";
  const shown = row.contributions.slice(0, 3).map((c) => `${ingredientName(c.ingredientId)} ${formatUpperLimitValue(c.value, row.unit)}`);
  return `From ${shown.join(", ")}${row.contributions.length > 3 ? ` and ${row.contributions.length - 3} more` : ""}.`;
}

const compact = (value: number, maximumFractionDigits = 3) =>
  value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits });

/** Data tag: Published / Assumed 0 / Missing, plus "total only" when a TOTAL value is not counted toward SID. */
export function requirementDataTag(check: Pick<RequirementCheck, "data" | "totalOnlyIngredientIds" | "aggregate">) {
  // A combined ceiling's tag says where the ceiling comes from.
  if (check.aggregate) return check.aggregate.source.type === "published" ? "Published limit" : "FeedSport policy";
  return `${DATA_STATUS_LABELS[check.data]}${check.totalOnlyIngredientIds.length ? " · total only" : ""}`;
}

function premixInAssessment(assessment: FormulationAssessment, premixId?: string | null): CommercialPremix | undefined {
  if (premixId) return commercialPremixById(premixId);
  const ids = new Set<string>([
    ...assessment.documentationGaps.map((gap) => gap.ingredientId),
    ...assessment.requirements.flatMap((check) => [
      ...check.contributions.map((row) => row.ingredientId),
      ...check.assumedZeroIngredientIds,
      ...check.totalOnlyIngredientIds,
      ...check.missingIngredientIds,
    ]),
    ...(assessment.supplementation?.rows.flatMap((row) => row.undocumentedIngredientIds) ?? []),
  ]);
  for (const id of ids) {
    const premix = commercialPremixById(id);
    if (premix) return premix;
  }
  return undefined;
}

export function studioFormulationPdfFilename(documentName: string) {
  return `feedsport-${slug(documentName) || "formulation"}.pdf`;
}

export async function buildStudioFormulationPdf(
  input: StudioFormulationPdfInput,
): Promise<Uint8Array> {
  return (await renderStudioFormulationPdf(input)).bytes;
}

/** Renders the PDF and returns every drawn line of text alongside the bytes (used by tests). */
export async function renderStudioFormulationPdf(
  input: StudioFormulationPdfInput,
): Promise<{ bytes: Uint8Array; text: string[] }> {
  const drawnText: string[] = [];
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const bytes = await loadFontBytes();
  const fonts = Object.fromEntries(
    await Promise.all(
      Object.entries(bytes).map(async ([name, data]) => [
        name,
        await pdf.embedFont(data, { subset: true }),
      ] as const),
    ),
  ) as Record<FontName, PDFFont>;
  const regular = fonts.regular;
  const bold = fonts.bold;
  const mono = fonts.mono;

  pdf.setTitle(`${input.documentName} — Feed formulation`);
  pdf.setAuthor(siteConfig.name);
  pdf.setSubject(`${input.programmeName} · ${input.phaseLabel}`);
  pdf.setCreator(siteConfig.url);

  const generatedAt = input.generatedAt ?? new Date();
  const issued = generatedAt.toLocaleDateString("en-ZW", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Harare",
  });
  const generated = generatedAt.toLocaleString("en-ZW", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Harare",
  });
  const dateParts = Object.fromEntries(
    new Intl.DateTimeFormat("en", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "Africa/Harare",
    })
      .formatToParts(generatedAt)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const docRef = `FS-FORM-${slug(input.phaseLabel).toUpperCase().slice(0, 24)}-${dateParts.year}${dateParts.month}${dateParts.day}`;

  let page: PDFPage = pdf.addPage([W, H]);
  let y = 0;

  const width = (value: string, font: PDFFont, size: number) =>
    font.widthOfTextAtSize(value, size);
  const draw = (
    value: string,
    x: number,
    atY: number,
    size = 8,
    font: PDFFont = regular,
    color: RGB = C.ink,
  ) => {
    drawnText.push(value);
    page.drawText(value, { x, y: atY, size, font, color });
  };
  const drawRight = (
    value: string,
    right: number,
    atY: number,
    size = 8,
    font: PDFFont = regular,
    color: RGB = C.ink,
  ) => draw(value, right - width(value, font, size), atY, size, font, color);
  const line = (atY: number, color = C.rule, thickness = 0.5) =>
    page.drawLine({
      start: { x: M, y: atY },
      end: { x: W - M, y: atY },
      thickness,
      color,
    });
  const wrap = (value: string, font: PDFFont, size: number, maxWidth: number) => {
    const lines: string[] = [];
    let current = "";
    for (const word of value.split(/\s+/)) {
      const candidate = current ? `${current} ${word}` : word;
      if (!current || width(candidate, font, size) <= maxWidth) current = candidate;
      else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [""];
  };
  const fit = (value: string, font: PDFFont, size: number, maxWidth: number) => {
    if (width(value, font, size) <= maxWidth) return value;
    let clipped = value;
    while (clipped.length && width(`${clipped}...`, font, size) > maxWidth) {
      clipped = clipped.slice(0, -1);
    }
    return `${clipped}...`;
  };
  const pageHeader = (continuation = false, addPage = true) => {
    if (addPage) page = pdf.addPage([W, H]);
    if (continuation) {
      y = H - M;
      draw("FeedSport", M, y, 12, fonts.bold, C.green);
      drawRight("FORMULATION REPORT · CONTINUED", W - M, y, 7.5, fonts.monoMedium, C.muted);
      page.drawLine({ start: { x: M, y: y - 10 }, end: { x: W - M, y: y - 10 }, thickness: 1.25, color: C.ink });
      page.drawRectangle({ x: M, y: y - 12.5, width: 38, height: 2.5, color: C.amber });
      y -= 37;
      return;
    }
    const bandHeight = 92;
    page.drawRectangle({ x: 0, y: H - bandHeight, width: W, height: bandHeight, color: C.green });
    page.drawRectangle({ x: 0, y: H - bandHeight - 3, width: W, height: 3, color: C.amber });
    draw("FeedSport", M, H - 45, 22, fonts.bold, C.white);
    draw("INTERNATIONAL", M + 1, H - 60, 7.5, fonts.monoMedium, C.paleGreen);
    drawRight("FORMULATION REPORT", W - M, H - 37, 8, fonts.monoMedium, C.white);
    drawRight(`Doc. ${docRef}`, W - M, H - 52, 7, fonts.mono, C.paleGreen);
    drawRight(`Issued ${issued}`, W - M, H - 65, 7, fonts.mono, C.paleGreen);
    y = H - bandHeight - 34;
  };
  const ensure = (height: number) => {
    if (y - height >= BOTTOM) return;
    pageHeader(true);
  };
  const section = (title: string, aside = "") => {
    ensure(75);
    draw(title.toUpperCase(), M, y, 7.5, fonts.monoMedium, C.green);
    if (aside) drawRight(aside, W - M, y, 7, fonts.mono, C.muted);
    line(y - 8, C.ink, 0.9);
    y -= 25;
  };
  const paragraph = (value: string, color: RGB = C.body) => {
    const lines = wrap(value, regular, 8, CW);
    ensure(lines.length * 11 + 7);
    lines.forEach((part, index) => draw(part, M, y - index * 11, 8, regular, color));
    y -= lines.length * 11 + 7;
  };

  pageHeader(false, false);
  draw(fit(input.documentName || "Untitled formulation", bold, 21, CW), M, y, 21, bold);
  y -= 22;
  draw(fit(`${input.programmeName} - ${input.phaseLabel}`, regular, 9.5, CW - 180), M, y, 9.5, regular, C.body);
  drawRight(`Generated ${generated}`, W - M, y, 7, mono, C.muted);
  y -= 15;
  draw(`${input.weightRange} - ${input.source}`, M, y, 7.5, regular, C.muted);
  if (input.preparedFor) drawRight(`Prepared for ${input.preparedFor}`, W - M, y, 7.5, regular, C.muted);
  y -= 26;

  const assessment = isFormulationAssessment(input.assessment) ? input.assessment : null;
  const failedRequirements = assessment?.requirements.filter((check) => check.status === "not_met") ?? [];
  const hardFailure = !!assessment && (assessment.verdict !== "meets_requirements" || failedRequirements.length > 0);
  // A saved broiler result that never checked digestible phosphorus is not shown as a pass.
  const stalePhosphorus = !!assessment && predatesPoultryDigestiblePhosphorus(assessment);
  // Red only for a genuine hard failure; a legacy result is a neutral note.
  const assessmentColor = !assessment || (stalePhosphorus && !hardFailure) ? C.amberText : hardFailure ? C.red : C.green;
  const assessmentBg = !assessment || (stalePhosphorus && !hardFailure) ? C.paleAmber : hardFailure ? hex("#f6dcd8") : C.paleGreen;
  const assessmentTitle = assessment ? assessment.headline : "Premix data updated";
  const assessmentText = assessment
    ? [assessment.summary, stalePhosphorus ? PRE_POULTRY_DIGESTIBLE_PHOSPHORUS_NOTE : ""].filter(Boolean).join(" ")
    : LEGACY_PREMIX_NOTE;
  const assessmentLines = wrap(assessmentText, regular, 7.8, CW - 24);
  const assessmentHeight = 38 + assessmentLines.length * 10;
  page.drawRectangle({ x: M, y: y - assessmentHeight, width: CW, height: assessmentHeight, color: assessmentBg });
  page.drawRectangle({ x: M, y: y - assessmentHeight, width: 4, height: assessmentHeight, color: assessmentColor });
  draw(assessment ? "HARD REQUIREMENTS" : "SAVED RESULT", M + 13, y - 15, 6.6, fonts.monoMedium, assessmentColor);
  draw(fit(assessmentTitle, bold, 10.5, CW - 26), M + 13, y - 30, 10.5, bold, assessmentColor);
  assessmentLines.forEach((part, index) => draw(part, M + 13, y - 45 - index * 10, 7.8, regular, C.body));
  y -= assessmentHeight + 18;

  const tileGap = 7;
  const tileWidth = (CW - tileGap * 3) / 4;
  const batchCost = (input.costPerTonne * input.batchKg) / 1000;
  const tiles = [
    ["MODE", input.mode],
    ["GOAL", input.goalLabel],
    ["BATCH", `${number(input.batchKg, input.batchKg % 1 ? 1 : 0)} kg`],
    ["BATCH COST", money(batchCost)],
  ];
  tiles.forEach(([label, value], index) => {
    const x = M + index * (tileWidth + tileGap);
    page.drawRectangle({ x, y: y - 49, width: tileWidth, height: 49, color: C.pale });
    page.drawRectangle({ x, y: y - 49, width: 3, height: 49, color: C.green });
    draw(label, x + 10, y - 15, 6.3, mono, C.muted);
    const fitted = width(value, bold, 10.5) > tileWidth - 18 ? 8 : 10.5;
    draw(value, x + 10, y - 35, fitted, bold);
  });
  y -= 68;

  section("Recipe and batch sheet", `${money(input.costPerTonne)}/t`);
  const recipeColumns = [
    { label: "Ingredient", x: M, width: 186, align: "left" as const },
    { label: "Setting", x: M + 186, width: 80, align: "left" as const },
    { label: "%", x: M + 266, width: 48, align: "right" as const },
    { label: "Batch kg", x: M + 314, width: 65, align: "right" as const },
    { label: "USD/t", x: M + 379, width: 67, align: "right" as const },
    { label: "Batch cost", x: M + 446, width: CW - 446, align: "right" as const },
  ];
  const totalInclusion = input.ingredients.reduce(
    (sum, ingredient) => sum + ingredient.inclusionPct,
    0,
  );
  const recipeHeader = () => {
    page.drawRectangle({ x: M, y: y - 22, width: CW, height: 22, color: C.green });
    recipeColumns.forEach((column) => {
      if (column.align === "right") drawRight(column.label, column.x + column.width - 5, y - 14, 6.2, mono, C.white);
      else draw(column.label, column.x + 5, y - 14, 6.2, mono, C.white);
    });
    y -= 22;
  };
  recipeHeader();
  [...input.ingredients]
    .sort((a, b) => b.inclusionPct - a.inclusionPct)
    .forEach((ingredient, index) => {
      const nameLines = wrap(ingredient.name, bold, 7.5, recipeColumns[0].width - 10);
      const rowHeight = Math.max(22, nameLines.length * 9 + 8);
      if (y - rowHeight < BOTTOM) {
        pageHeader(true);
        section("Recipe and batch sheet", "continued");
        recipeHeader();
      }
      if (index % 2) page.drawRectangle({ x: M, y: y - rowHeight, width: CW, height: rowHeight, color: C.pale });
      nameLines.forEach((part, lineIndex) => draw(part, M + 5, y - 14 - lineIndex * 9, 7.5, bold));
      const kg = (ingredient.inclusionPct / 100) * input.batchKg;
      const contribution = ingredient.pricePerTonne == null
        ? null
        : (kg / 1000) * ingredient.pricePerTonne;
      const cells = [
        ingredient.setting,
        number(ingredient.inclusionPct, ingredient.inclusionPct < 1 ? 3 : 2),
        number(kg, kg < 10 ? 2 : 1),
        ingredient.pricePerTonne == null ? "-" : money(ingredient.pricePerTonne, 0),
        contribution == null ? "-" : money(contribution),
      ];
      draw(fit(cells[0], regular, 6.8, recipeColumns[1].width - 10), recipeColumns[1].x + 5, y - 14, 6.8, regular, C.body);
      cells.slice(1).forEach((cell, cellIndex) => {
        const column = recipeColumns[cellIndex + 2];
        drawRight(cell, column.x + column.width - 5, y - 14, 7, regular, C.body);
      });
      y -= rowHeight;
      line(y, C.rule, 0.35);
    });
  ensure(27);
  draw("TOTAL", M + 5, y - 15, 7.5, bold);
  drawRight(number(totalInclusion, 2), M + 314 - 5, y - 15, 7.5, bold);
  drawRight(number((totalInclusion / 100) * input.batchKg, 1), M + 379 - 5, y - 15, 7.5, bold);
  drawRight(money(batchCost), W - M - 5, y - 15, 7.5, bold);
  y -= 29;

  type Column = { label: string; width: number; align?: "left" | "right" };
  const table = (
    title: string,
    columns: Column[],
    rows: { cells: string[]; colors?: (RGB | undefined)[] }[],
  ) => {
    const header = () => {
      page.drawRectangle({ x: M, y: y - 22, width: CW, height: 22, color: C.green });
      let x = M;
      columns.forEach((column) => {
        if (column.align === "right") drawRight(column.label.toUpperCase(), x + column.width - 5, y - 14, 6.2, mono, C.white);
        else draw(column.label.toUpperCase(), x + 5, y - 14, 6.2, mono, C.white);
        x += column.width;
      });
      y -= 22;
    };
    ensure(44);
    header();
    rows.forEach((row, index) => {
      const wrapped = row.cells.map((cell, cellIndex) => wrap(cell, cellIndex === 0 ? bold : regular, 7, columns[cellIndex].width - 10));
      const rowHeight = Math.max(22, Math.max(...wrapped.map((lines) => lines.length)) * 9 + 10);
      if (y - rowHeight < BOTTOM) {
        pageHeader(true);
        section(title, "continued");
        header();
      }
      if (index % 2) page.drawRectangle({ x: M, y: y - rowHeight, width: CW, height: rowHeight, color: C.pale });
      let x = M;
      columns.forEach((column, cellIndex) => {
        const color = row.colors?.[cellIndex];
        const font = cellIndex === 0 || color ? bold : regular;
        wrapped[cellIndex].forEach((part, lineIndex) => {
          const atY = y - 14 - lineIndex * 9;
          if (column.align === "right") drawRight(part, x + column.width - 5, atY, 7, font, color ?? C.body);
          else draw(part, x + 5, atY, 7, font, color ?? C.body);
        });
        x += column.width;
      });
      y -= rowHeight;
      line(y, C.rule, 0.35);
    });
    y -= 18;
  };

  if (assessment) {
    const title = "Hard requirements";
    section(title, assessment.headline);
    assessment.consistencyErrors.forEach((error) => paragraph(`Engine consistency error: ${error}`, C.red));
    if (assessment.requirements.length) {
      table(
        title,
        [
          { label: "Requirement", width: 170 },
          { label: "Recipe", width: 80, align: "right" },
          { label: "Requirement", width: 96, align: "right" },
          { label: "Status", width: 60 },
          { label: "Data", width: CW - 406 },
        ],
        assessment.requirements.map((check) => ({
          cells: [
            `${check.label}${check.unit ? ` (${check.unit})` : ""}`,
            compact(check.actual, requirementDisplay(check, 3).dp),
            `${check.relation === "min" ? "min" : check.relation === "max" ? "max" : "="} ${compact(check.bound, requirementDisplay(check, 3).dp)}`,
            check.status === "met" ? (check.limiting ? "Met · limiting" : "Met") : "Not met",
            requirementDataTag(check),
          ],
          colors: [undefined, undefined, undefined, check.status === "met" ? C.green : C.red, undefined],
        })),
      );
    }
    const gaps = assessment.requirements.flatMap((check) => {
      const gap = requirementDisplay(check, 3).gap;
      return gap ? [`${check.label}: ${gap.text}`] : [];
    });
    if (gaps.length) paragraph(`Not met by: ${gaps.join("; ")}.`, C.red);
    paragraph("Data: Published = documented by the source; Assumed 0 = the premix does not document the value, so it is counted as 0 (a conservative assumption, not a documented value); Missing = no value is available; total only = a total value without a SID/digestible value, not counted toward SID.", C.muted);
    paragraph(assessment.scope, C.muted);
  } else {
    section("Nutrient results", "saved result, not re-scored");
    paragraph(LEGACY_PREMIX_NOTE, C.amberText);
    table(
      "Nutrient results",
      [
        { label: "Nutrient", width: 220 },
        { label: "Target", width: 120, align: "right" },
        { label: "Actual", width: 90, align: "right" },
        { label: "Status", width: CW - 430 },
      ],
      input.nutrients.map((nutrient) => {
        const dp = nutrient.unit === "%" ? 3 : 0;
        const target = [
          nutrient.min != null ? `min ${number(nutrient.min, dp)}` : "",
          nutrient.max != null ? `max ${number(nutrient.max, dp)}` : "",
        ].filter(Boolean).join(" / ");
        return {
          cells: [`${nutrient.name} (${nutrient.unit})`, target || "reported", number(nutrient.value, dp), nutrient.status === "met" ? "Met" : "Not met"],
          colors: [undefined, undefined, undefined, nutrient.status === "met" ? C.green : C.red],
        };
      }),
    );
  }

  const premix = assessment ? premixInAssessment(assessment, input.premixId) : undefined;
  if (premix) {
    const dose = assessment?.requirements.find((check) => check.id === "premix-dose")?.actual ?? premix.inclusionPct;
    const contributions = premixNutrientContributions(premix, dose);
    const title = "What the premix contributes";
    section(title, `${premix.sku} · ${compact(dose * 10, 2)} kg/t`);
    paragraph(`${premix.name} (${premix.manufacturer}) is an ordinary ingredient in this recipe: each documented nutrient${premix.source?.basis ? ` (${premix.source.basis})` : ""} is counted once alongside every other ingredient. Nutrients it does not document are counted as 0 (Assumed 0).`);
    if (contributions.length) {
      table(
        title,
        [
          { label: "Nutrient", width: 150 },
          { label: "Unit", width: 50 },
          { label: "Per kg premix", width: 85, align: "right" },
          { label: "Per kg feed", width: 85, align: "right" },
          { label: "Note", width: CW - 370 },
        ],
        contributions.map((row) => ({
          cells: [
            row.nutrient,
            row.unit,
            compact(row.premixConcentration, 3),
            compact(row.finishedFeedContribution, 4),
            row.countsTowardDigestible ? "Published" : "Published · total only, not counted toward SID",
          ],
        })),
      );
    } else {
      paragraph("The manufacturer has not published a composition for this premix, so none of its nutrients is credited.", C.amberText);
    }
  }

  const supplementationRows = assessment?.supplementation?.rows ?? [];
  const gapLine = assessment ? documentationGapLine(assessment) : null;
  const vitaminAdvice = input.premixComparison?.vitaminAdvice ?? null;
  const suggested = input.premixComparison?.suggestedPremixId
    ? input.premixComparison.options.find((option) => option.premixId === input.premixComparison!.suggestedPremixId)
    : undefined;
  // A CFIA vitamin replacement is written once, with the upper limits.
  const suggestedForVitamins = !!suggested && vitaminAdvice?.recommendation?.premixId === suggested.premixId;
  const upper = assessment?.upperLimits?.status === "assessed" ? assessment.upperLimits : null;
  if (gapLine || supplementationRows.length || suggested || upper || input.advisories.length || input.notes.length) {
    section("Advisories", "optional · never block the recipe");
    if (upper) {
      const exceeded = upper.rows.filter((row) => row.status === "exceeds");
      // Red only for an established exceedance; uncertainty is never red.
      exceeded.forEach((row) => paragraph(`${upperLimitTitle(row)}. ${upperLimitSentence(row)} ${upperLimitContributors(row)}`.trim(), C.red));
      if (exceeded.length) paragraph(`${upper.source}, ${upper.category.label}. ${upper.mapping.explanation} These are advisory reference maximums: they do not change whether the recipe meets its hard requirements.`, C.muted);
      const vitaminExceeded = exceeded.some((row) => UPPER_LIMIT_VITAMIN_IDS.includes(row.id));
      if (vitaminAdvice) {
        paragraph(`Suggested action: ${vitaminAdvice.message}`);
        const rec = vitaminAdvice.recommendation;
        if (rec) {
          const currentName = input.premixComparison?.options.find((option) => option.current)?.name ?? (vitaminAdvice.currentPremixId ? commercialPremixById(vitaminAdvice.currentPremixId)?.name ?? vitaminAdvice.currentPremixId : "No premix");
          table(
            "Premix replacement",
            [
              { label: "Vitamin", width: 110 },
              { label: "Current premix", width: 105, align: "right" },
              { label: "Suggested premix", width: 105, align: "right" },
              { label: "CFIA maximum", width: 95, align: "right" },
              { label: "After replacement", width: CW - 415 },
            ],
            rec.changes.map((change) => ({
              cells: [
                change.label,
                change.beforeStatus === "not_documented" ? "Not documented" : formatUpperLimitValue(change.before, change.unit),
                change.afterStatus === "not_documented" ? "Not documented" : formatUpperLimitValue(change.after, change.unit),
                formatUpperLimitValue(change.max, change.unit),
                UPPER_LIMIT_STATUS_LABELS[change.afterStatus],
              ],
              colors: [undefined, change.before > change.max ? C.red : undefined, change.afterStatus === "exceeds" ? C.red : undefined, undefined, change.afterStatus === "exceeds" ? C.red : undefined],
            })),
          );
          paragraph([
            `Current premix: ${currentName}. Suggested alternative: ${rec.name}, re-run at its manufacturer dose with the same ingredients, prices and limits.`,
            `Updated formulation cost: ${rec.costPerTonne === null ? "no recipe" : `${money(rec.costPerTonne)} per tonne${rec.costExcludesPremix ? " excluding the unpriced premix" : ""}`}${rec.costDeltaPerTonne === null ? "" : ` (${rec.costDeltaPerTonne >= 0 ? "+" : "-"}${money(Math.abs(rec.costDeltaPerTonne))} per tonne)`}.`,
            `Hard requirements: ${rec.requirementsMet} of ${rec.requirementsTotal} met.`,
            `Exceedance resolved: ${rec.resolved ? "yes" : "no, reduced but still above the reference maximum"}.`,
            rec.otherExceedanceLabels.length ? `The alternative's recipe is also above the reference maximum for ${rec.otherExceedanceLabels.join(", ")}.` : "",
            "The selected premix has not been replaced; this is a suggestion only.",
          ].filter(Boolean).join(" "));
        }
      } else if (vitaminExceeded) {
        paragraph("Suggested action: verify the vitamin specifications of the selected premix with its manufacturer.");
      }
      table(
        "Advisories",
        [
          { label: "CFIA reference", width: 130 },
          { label: "Recipe", width: 95, align: "right" },
          { label: "Maximum", width: 95, align: "right" },
          { label: "Comparison", width: CW - 320 },
        ],
        upper.rows.map((row) => ({
          cells: [
            row.label,
            row.status === "not_documented" && row.actual === 0 ? "-" : formatUpperLimitValue(row.actual, row.unit),
            formatUpperLimitValue(row.max, row.unit),
            `${UPPER_LIMIT_STATUS_LABELS[row.status]} · ${DATA_STATUS_LABELS[row.data]}`,
          ],
          colors: row.status === "exceeds" ? [C.red, C.red, undefined, C.red] : undefined,
        })),
      );
      paragraph(`Upper limits compared with ${upper.source}, ${upper.category.label} (${upper.mapping.basis}). ${upper.basis} Reference maximums, not requirements.${upper.notAssessed.length ? ` ${upper.notAssessed.map((label, i) => (i ? label.toLowerCase() : label)).join(", ")} ${upper.notAssessed.length === 1 ? "is" : "are"} not modelled by FeedSport and not assessed.` : ""}`, C.muted);
    }
    if (gapLine) paragraph(gapLine, C.amberText);
    if (suggested && input.premixComparison && !suggestedForVitamins) {
      const current = input.premixComparison.options.find((option) => option.current);
      const verb = current ? `Replace premix: ${current.name} with ${suggested.name}` : `Premix option: ${suggested.name}`;
      paragraph(`Premix advisory. ${verb}. Re-running the formulation with ${suggested.name} at its manufacturer dose ${input.premixComparison.reasons.join("; ")}.`, C.amberText);
    }
    if (supplementationRows.length) {
      paragraph(`Vitamin and trace-mineral supplementation compared with ${assessment!.supplementation!.source} (inorganic trace-mineral basis). These are recommendations, not requirements: they do not affect whether the recipe meets its hard requirements.`, C.amberText);
      table(
        "Advisories",
        [
          { label: "Nutrient", width: 130 },
          { label: "Supplemented", width: 85, align: "right" },
          { label: "Recommendation", width: 85, align: "right" },
          { label: "% of recommendation", width: 96, align: "right" },
          { label: "Advisory", width: CW - 396 },
        ],
        supplementationRows.map((row) => ({
          cells: [
            row.label,
            `${compact(row.actual, 2)} ${row.unit}`,
            `${compact(row.recommended, 2)} ${row.unit}`,
            row.pctOfRecommendation === null ? "-" : `${compact(row.pctOfRecommendation, Math.min(2, distinguishingDp(row.pctOfRecommendation, 100, 0)))}%`,
            `${SUPPLEMENTATION_STATUS_LABELS[row.status]} · ${DATA_STATUS_LABELS[row.data]}`,
          ],
          colors: [undefined, undefined, undefined, row.status === "at_recommendation" ? undefined : C.amberText, undefined],
        })),
      );
    }
    input.advisories.forEach((note) => paragraph(`Advisory: ${note}`));
    input.notes.forEach((note) => paragraph(note));
  }

  section("Formulation basis");
  paragraph(`Goal: ${input.goalLabel}. ${input.goalDescription}`);
  if (input.leastCostPerTonne != null && Math.abs(input.costPerTonne - input.leastCostPerTonne) > 0.005) {
    paragraph(`This recipe costs ${money(input.costPerTonne - input.leastCostPerTonne)} per tonne more than the least-cost result of ${money(input.leastCostPerTonne)} per tonne.`);
  }
  paragraph("Amounts, prices and nutrient results match the up-to-date result shown in the Formulation Studio at the time of export. Prices are planning inputs, not supplier quotations.");

  const pages = pdf.getPages();
  const address = `${siteConfig.address.streetAddress}, ${siteConfig.address.addressLocality}, Zimbabwe`;
  pages.forEach((currentPage, index) => {
    page = currentPage;
    draw("UNREVIEWED FORMULATION — Must be reviewed and approved by a qualified animal nutritionist before manufacture or feeding.", M, M + 29, 6.3, fonts.semibold, hex("#7a5414"));
    page.drawLine({ start: { x: M, y: M + 21 }, end: { x: W - M, y: M + 21 }, thickness: 0.75, color: C.rule });
    draw(`${siteConfig.name} · ${address}`, M, M + 9, 6.8, regular, C.muted);
    drawRight(docRef, W - M, M + 9, 6.8, mono, C.muted);
    drawRight(`Page ${index + 1} of ${pages.length}`, W - M, M - 2, 6.8, fonts.monoMedium, C.ink);
  });

  return { bytes: await pdf.save(), text: drawnText };
}

export { documentationGapLine };

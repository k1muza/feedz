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
import {
  FORMULATION_VERDICT_LABELS,
  micronutrientAssessmentGroups,
  nutrientAssessmentStatusLabel,
  type FormulationAssessment,
} from "@/lib/formulation-assessment-model";

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
  assessment: FormulationAssessment;
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

export function studioFormulationPdfFilename(documentName: string) {
  return `feedsport-${slug(documentName) || "formulation"}.pdf`;
}

export async function buildStudioFormulationPdf(
  input: StudioFormulationPdfInput,
): Promise<Uint8Array> {
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
  ) => page.drawText(value, { x, y: atY, size, font, color });
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
    ensure(30);
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

  const assessmentColor = input.assessment.verdict === "verified" ? C.green : input.assessment.verdict === "infeasible" ? C.red : hex("#7a5414");
  const assessmentBg = input.assessment.verdict === "verified" ? C.paleGreen : C.paleAmber;
  const assessmentText = `${input.assessment.summary} ${input.assessment.guidance}`;
  const assessmentLines = wrap(assessmentText, regular, 7.8, CW - 24);
  const assessmentHeight = 38 + assessmentLines.length * 10;
  page.drawRectangle({ x: M, y: y - assessmentHeight, width: CW, height: assessmentHeight, color: assessmentBg });
  page.drawRectangle({ x: M, y: y - assessmentHeight, width: 4, height: assessmentHeight, color: assessmentColor });
  draw("FORMULATION ASSESSMENT", M + 13, y - 15, 6.6, fonts.monoMedium, assessmentColor);
  draw(FORMULATION_VERDICT_LABELS[input.assessment.verdict], M + 13, y - 30, 10.5, bold, assessmentColor);
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

  section("Nutrient compliance", `${input.nutrients.filter((n) => n.status === "met").length}/${input.nutrients.length} met`);
  const nutrientHeader = () => {
    page.drawRectangle({ x: M, y: y - 22, width: CW, height: 22, color: C.green });
    draw("REQUIREMENT", M + 5, y - 14, 6.2, mono, C.white);
    drawRight("TARGET", M + 340, y - 14, 6.2, mono, C.white);
    drawRight("ACTUAL", M + 420, y - 14, 6.2, mono, C.white);
    drawRight("STATUS", W - M - 5, y - 14, 6.2, mono, C.white);
    y -= 22;
  };
  nutrientHeader();
  input.nutrients.forEach((nutrient, index) => {
    const rowHeight = 22;
    if (y - rowHeight < BOTTOM) {
      pageHeader(true);
      section("Nutrient compliance", "continued");
      nutrientHeader();
    }
    if (index % 2) page.drawRectangle({ x: M, y: y - rowHeight, width: CW, height: rowHeight, color: C.pale });
    const target = [
      nutrient.min != null ? `min ${number(nutrient.min, nutrient.unit === "%" ? 3 : 0)}` : "",
      nutrient.max != null ? `max ${number(nutrient.max, nutrient.unit === "%" ? 3 : 0)}` : "",
    ].filter(Boolean).join(" / ");
    draw(`${nutrient.name} (${nutrient.unit})`, M + 5, y - 14, 7.2, bold);
    drawRight(target || "reported", M + 340, y - 14, 7, regular, C.body);
    drawRight(number(nutrient.value, nutrient.unit === "%" ? 3 : 0), M + 420, y - 14, 7, regular, C.body);
    const status = nutrient.status === "met" ? (nutrient.limiting ? "MET - LIMITING" : "MET") : nutrient.status === "below" ? "BELOW MIN" : "ABOVE MAX";
    drawRight(status, W - M - 5, y - 14, 6.6, bold, nutrient.status === "met" ? C.green : C.red);
    y -= rowHeight;
    line(y, C.rule, 0.35);
  });
  y -= 18;

  micronutrientAssessmentGroups(input.assessment).forEach((group) => {
    const label = group.category?.label ?? (group.id === "vitamins" ? "Vitamins" : "Trace minerals");
    section(label, group.category ? `${group.category.checked}/${group.category.required} checked` : "not assessed");
    if (!group.checks.length) {
      paragraph(`No ${label.toLowerCase()} targets are loaded for this stage.`, C.muted);
      return;
    }
    const sources = [...new Set(group.checks.map((check) => check.targetSource))];
    sources.forEach((source) => paragraph(`Target source: ${source}`, C.muted));
    const micronutrientHeader = () => {
      page.drawRectangle({ x: M, y: y - 22, width: CW, height: 22, color: C.green });
      draw("NUTRIENT", M + 5, y - 14, 6.2, mono, C.white);
      drawRight("ACTUAL", M + 315, y - 14, 6.2, mono, C.white);
      drawRight("TARGET", M + 415, y - 14, 6.2, mono, C.white);
      drawRight("STATUS", W - M - 5, y - 14, 6.2, mono, C.white);
      y -= 22;
    };
    micronutrientHeader();
    group.checks.forEach((check, index) => {
      const rowHeight = 22;
      if (y - rowHeight < BOTTOM) {
        pageHeader(true);
        section(label, "continued");
        micronutrientHeader();
      }
      if (index % 2) page.drawRectangle({ x: M, y: y - rowHeight, width: CW, height: rowHeight, color: C.pale });
      const dp = check.unit === "%" ? 3 : Math.abs(check.actual ?? check.requiredMin ?? check.allowedMax ?? 0) >= 100 ? 0 : 2;
      const amount = (value: number | undefined) => value == null ? "Unknown" : `${number(value, dp)} ${check.unit}`;
      const target = check.requiredMin != null ? `min ${amount(check.requiredMin)}` : `max ${amount(check.allowedMax)}`;
      const status = nutrientAssessmentStatusLabel(check.status).toUpperCase();
      draw(fit(check.label, bold, 7.2, 185), M + 5, y - 14, 7.2, bold);
      drawRight(fit(amount(check.actual), regular, 7, 90), M + 315, y - 14, 7, regular, C.body);
      drawRight(fit(target, regular, 7, 94), M + 415, y - 14, 7, regular, C.body);
      drawRight(status, W - M - 5, y - 14, 6.4, bold, check.status === "met" ? C.green : check.status === "unknown" ? hex("#7a5414") : C.red);
      y -= rowHeight;
      line(y, C.rule, 0.35);
    });
    y -= 18;
  });

  section("Nutritional assessment", FORMULATION_VERDICT_LABELS[input.assessment.verdict]);
  const categoryStatus = (status: FormulationAssessment["categories"][number]["status"]) =>
    status === "met" ? "VERIFIED" : status === "unmet" ? "DOES NOT MEET" : status === "unknown" ? "CANNOT VERIFY" : "NOT ASSESSED";
  input.assessment.categories.forEach((category) => {
    ensure(32);
    draw(category.label, M + 5, y - 14, 7.5, bold);
    drawRight(categoryStatus(category.status), W - M - 5, y - 14, 6.8, bold, category.status === "met" ? C.green : category.status === "unmet" ? C.red : hex("#7a5414"));
    y -= 22;
    line(y, C.rule, 0.35);
  });
  y -= 8;
  const unresolved = input.assessment.nutrientChecks.filter((check) => check.status !== "met");
  unresolved.forEach((check) => paragraph(`${check.label} — ${check.status === "unknown" ? "Cannot verify" : check.status === "below_target" ? "Below target" : "Above limit"}. ${check.reason} Target source: ${check.targetSource}`, check.status === "unknown" ? hex("#7a5414") : C.red));

  if (input.advisories.length || input.notes.length) {
    section("Advisories and notes");
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

  return pdf.save();
}

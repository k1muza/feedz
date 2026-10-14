import { readFile } from 'node:fs/promises';
import path from 'node:path';

import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib';

import {
  ingredientDefaultPlanningPricePerTonne,
  ingredientDefaultPrice,
  type IngredientDefaultPrice,
} from '@/lib/feed-ingredient-prices';
import type { FormulationNutrientComparison } from '@/lib/feed-optimizer';
import type { FeedProgrammeDefinition } from '@/lib/feed-programmes';
import { premixNutrientContributions, type CommercialPremix } from '@/lib/commercial-premixes';
import { documentationGapLine,
  DATA_STATUS_LABELS,
  UPPER_LIMIT_VITAMIN_IDS,
  formatUpperLimitValue,
  requirementDisplay,
  upperLimitSentence,
  upperLimitTitle,
  type FormulationAssessment,
  type RequirementCheck,
  type SupplementationStatus,
} from '@/lib/formulation-assessment-model';
import {
  INGREDIENT_LIBRARY,
  ingredientLibraryForPhase,
} from '@/lib/ingredient-nutrients';
import type { NutritionPhase } from '@/lib/nutrition';
import { siteConfig } from '@/lib/seo';
import { distinguishingDp } from '@/lib/numerical-tolerance';

const W = 595.28;
const H = 841.89;
const M = 42;
const CW = W - M * 2;
const BOTTOM = M + 49;

const hex = (value: string) => rgb(
  Number.parseInt(value.slice(1, 3), 16) / 255,
  Number.parseInt(value.slice(3, 5), 16) / 255,
  Number.parseInt(value.slice(5, 7), 16) / 255,
);

const C = {
  ink: hex('#191b18'),
  body: hex('#3d403a'),
  muted: hex('#6b6f66'),
  green: hex('#1d3a2a'),
  greenTint: hex('#dfe6dc'),
  amber: hex('#d99a2b'),
  amberText: hex('#7a5414'),
  rule: hex('#d9d4c7'),
  hairline: hex('#ece8de'),
  paper: hex('#f3f0e8'),
  zebra: hex('#faf8f3'),
  success: hex('#2e7d4f'),
  red: hex('#a3261c'),
  redTint: hex('#f6dcd8'),
  white: rgb(1, 1, 1),
};

const FONT_DIR = path.join(process.cwd(), 'src/assets/fonts/pdf');
const FONT_FILES = {
  regular: 'Archivo-Regular.ttf',
  semibold: 'Archivo-SemiBold.ttf',
  bold: 'Archivo-Bold.ttf',
  mono: 'PlexMono-Regular.ttf',
  monoMedium: 'PlexMono-Medium.ttf',
} as const;
type FontName = keyof typeof FONT_FILES;

let fontBytes: Promise<Record<FontName, Uint8Array>> | undefined;
function loadFontBytes() {
  fontBytes ??= Promise.all(
    Object.entries(FONT_FILES).map(async ([name, file]) => [name, await readFile(path.join(FONT_DIR, file))] as const),
  ).then((entries) => Object.fromEntries(entries) as unknown as Record<FontName, Uint8Array>);
  return fontBytes;
}

export type PublicFormulationPdfInput = {
  programme: FeedProgrammeDefinition;
  phase: NutritionPhase;
  priority: {
    id: string;
    label: string;
    description: string;
  };
  formula: {
    ingredients: { ingredientId: string; inclusionPct: number }[];
  };
  /** The real manufacturer product in the formula, at its label dose. */
  premix: CommercialPremix;
  /** Supplier quotation entered by the user; falls back to the planning default. */
  premixPricePerKg?: number;
  /** True when the formula is the manufacturer's fixed recipe, not an optimised mix. */
  manufacturerRecipe: boolean;
  /** Retained for callers; the report renders `assessment.requirements` instead. */
  nutrientProfile: FormulationNutrientComparison[];
  assessment: FormulationAssessment;
  /** Null when an ingredient (usually the premix) has no price: never invent one. */
  costPerKg: number | null;
  costIncreasePct: number;
  generatedAt?: Date;
  /** Planning prices to show; defaults to the hard-coded planning prices. */
  ingredientPrices?: readonly IngredientDefaultPrice[];
};

type TableColumn = {
  label: string;
  width: number;
  align?: 'left' | 'right';
};

const SUPPLEMENTATION_STATUS_LABELS: Record<SupplementationStatus, string> = {
  at_recommendation: 'At recommendation',
  below_recommendation: 'Below recommendation',
  no_data: 'No data',
};

const relationLabel = (relation: RequirementCheck['relation']) =>
  relation === 'min' ? 'min' : relation === 'max' ? 'max' : '=';

/** Data tag: Published / Assumed 0 / Missing, plus "total only" when a TOTAL value is not counted toward SID. */
function dataTag(check: Pick<RequirementCheck, 'data' | 'totalOnlyIngredientIds'>) {
  return `${DATA_STATUS_LABELS[check.data]}${check.totalOnlyIngredientIds.length ? ' · total only' : ''}`;
}

function compactNumber(value: number, maximumFractionDigits = 3) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });
}

export async function renderPublicFormulationPdf(input: PublicFormulationPdfInput) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`${input.phase.label} — Detailed feed formulation`);
  pdf.setAuthor(siteConfig.name);
  pdf.setSubject(`${input.programme.name} · ${input.phase.sourceWeightRange}`);
  pdf.setCreator(siteConfig.url);

  const bytes = await loadFontBytes();
  const fonts = Object.fromEntries(
    await Promise.all(Object.entries(bytes).map(async ([name, data]) => [name, await pdf.embedFont(data, { subset: true })] as const)),
  ) as Record<FontName, PDFFont>;

  const generatedAt = input.generatedAt ?? new Date();
  const reportTimeZone = 'Africa/Harare';
  const issued = generatedAt.toLocaleDateString('en-ZW', { day: 'numeric', month: 'long', year: 'numeric', timeZone: reportTimeZone });
  const dateParts = Object.fromEntries(
    new Intl.DateTimeFormat('en', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: reportTimeZone })
      .formatToParts(generatedAt)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  const docRef = `FS-FORM-${input.phase.id.toUpperCase()}-${dateParts.year}${dateParts.month}${dateParts.day}`;
  const premix = input.premix;
  const premixContributions = premixNutrientContributions(premix);
  const ingredientLibrary = ingredientLibraryForPhase(input.phase);
  const planningPricePerTonne = (ingredientId: string) =>
    ingredientId === premix.id && input.premixPricePerKg !== undefined
      ? input.premixPricePerKg * 1000
      : ingredientDefaultPlanningPricePerTonne(ingredientId, input.ingredientPrices);
  const ingredientMap = new Map(ingredientLibrary.ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const totalInclusion = input.formula.ingredients.reduce((sum, ingredient) => sum + ingredient.inclusionPct, 0);
  // A missing price is never costed as zero: show a partial cost that names what it excludes.
  const unpricedNames = input.formula.ingredients
    .filter((item) => item.inclusionPct > 0 && planningPricePerTonne(item.ingredientId) === undefined)
    .map((item) => ingredientMap.get(item.ingredientId)?.name ?? item.ingredientId);
  const knownCostPerTonne = input.formula.ingredients.reduce((sum, item) => sum + item.inclusionPct / 100 * (planningPricePerTonne(item.ingredientId) ?? 0), 0);
  const costPerTonne = input.costPerKg !== null ? input.costPerKg * 1000 : knownCostPerTonne;
  const costPartial = input.costPerKg === null;
  const costLabel = `$${costPerTonne.toFixed(2)}/t${costPartial ? '*' : ''}`;
  const partialCostNote = costPartial
    ? `*Partial cost: excludes ${unpricedNames.join(', ') || 'an unpriced ingredient'}; enter a price for the full cost.`
    : null;

  let page: PDFPage = pdf.addPage([W, H]);
  let y = H;

  const width = (value: string, font: FontName, size: number) => fonts[font].widthOfTextAtSize(value, size);
  const text = (value: string, x: number, size: number, font: FontName = 'regular', color = C.ink, atY = y) => {
    page.drawText(value, { x, y: atY, size, font: fonts[font], color });
  };
  const textRight = (value: string, right: number, size: number, font: FontName = 'regular', color = C.ink, atY = y) => {
    text(value, right - width(value, font, size), size, font, color, atY);
  };
  const box = (x: number, top: number, boxWidth: number, height: number, color: RGB) => {
    page.drawRectangle({ x, y: top - height, width: boxWidth, height, color });
  };
  const line = (x1: number, x2: number, atY: number, thickness = 0.5, color = C.rule) => {
    page.drawLine({ start: { x: x1, y: atY }, end: { x: x2, y: atY }, thickness, color });
  };
  const wrap = (value: string, font: FontName, size: number, maxWidth: number) => {
    const lines: string[] = [];
    let current = '';
    for (const word of value.split(/\s+/)) {
      const candidate = current ? `${current} ${word}` : word;
      if (!current || width(candidate, font, size) <= maxWidth) current = candidate;
      else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [''];
  };
  const continuationHeader = () => {
    page = pdf.addPage([W, H]);
    y = H - M;
    text('FeedSport', M, 12, 'bold', C.green);
    textRight('DETAILED FEED FORMULATION', W - M, 7.5, 'monoMedium', C.muted);
    line(M, W - M, y - 10, 1.25, C.ink);
    box(M, y - 9.25, 38, 2.5, C.amber);
    y -= 37;
  };
  const ensureSpace = (needed: number) => {
    if (y - needed >= BOTTOM) return false;
    continuationHeader();
    return true;
  };
  const sectionHeading = (label: string, aside?: string) => {
    // Keep a heading with at least its first table row.
    ensureSpace(80);
    text(label.toUpperCase(), M, 7.5, 'monoMedium', C.green);
    if (aside) textRight(aside, W - M, 7, 'mono', C.muted);
    line(M, W - M, y - 7, 1, C.ink);
    y -= 23;
  };
  const paragraph = (value: string, size = 8.5, color = C.body) => {
    const lines = wrap(value, 'regular', size, CW);
    ensureSpace(lines.length * 12 + 8);
    for (const paragraphLine of lines) {
      text(paragraphLine, M, size, 'regular', color);
      y -= 12;
    }
    y -= 5;
  };
  const drawTable = (columns: TableColumn[], rows: string[][], options?: { fontSize?: number; repeatHeader?: boolean; statusColumn?: number; failedRows?: ReadonlySet<number> }) => {
    const fontSize = options?.fontSize ?? 8;
    const headerHeight = 25;
    const padding = 7;
    const drawHeader = () => {
      box(M, y, CW, headerHeight, C.green);
      let x = M;
      columns.forEach((column) => {
        const labelY = y - 16;
        if (column.align === 'right') textRight(column.label.toUpperCase(), x + column.width - padding, 6.5, 'monoMedium', C.white, labelY);
        else text(column.label.toUpperCase(), x + padding, 6.5, 'monoMedium', C.white, labelY);
        x += column.width;
      });
      y -= headerHeight;
    };
    ensureSpace(headerHeight + 22);
    drawHeader();
    rows.forEach((row, rowIndex) => {
      const wrapped = row.map((cell, index) => wrap(cell, index === 0 ? 'semibold' : 'regular', fontSize, columns[index].width - padding * 2));
      const rowHeight = Math.max(22, Math.max(...wrapped.map((lines) => lines.length)) * 10 + 10);
      if (ensureSpace(rowHeight + (options?.repeatHeader === false ? 0 : headerHeight))) {
        if (options?.repeatHeader !== false) drawHeader();
      }
      if (rowIndex % 2 === 1) box(M, y, CW, rowHeight, C.zebra);
      let x = M;
      columns.forEach((column, columnIndex) => {
        // Red is reserved for a genuine hard-requirement failure or an established CFIA exceedance.
        const failedCell = columnIndex === options?.statusColumn && !!options?.failedRows?.has(rowIndex);
        const font: FontName = columnIndex === 0 || failedCell ? 'semibold' : 'regular';
        const color = failedCell ? C.red : C.body;
        wrapped[columnIndex].forEach((cellLine, lineIndex) => {
          const baseline = y - 14 - lineIndex * 10;
          if (column.align === 'right') textRight(cellLine, x + column.width - padding, fontSize, font, color, baseline);
          else text(cellLine, x + padding, fontSize, font, color, baseline);
        });
        x += column.width;
      });
      line(M, W - M, y - rowHeight, 0.4, C.hairline);
      y -= rowHeight;
    });
    line(M, W - M, y, 0.9, C.ink);
    y -= 26;
  };

  // Masthead
  const bandHeight = 92;
  box(0, H, W, bandHeight, C.green);
  box(0, H - bandHeight, W, 3, C.amber);
  text('FeedSport', M, 22, 'bold', C.white, H - 45);
  text('INTERNATIONAL', M + 1, 7.5, 'monoMedium', C.greenTint, H - 60);
  textRight('DETAILED FEED FORMULATION', W - M, 8, 'monoMedium', C.white, H - 37);
  textRight(`Doc. ${docRef}`, W - M, 7, 'mono', C.greenTint, H - 52);
  textRight(`Issued ${issued}`, W - M, 7, 'mono', C.greenTint, H - 65);
  y = H - bandHeight - 34;

  text(input.programme.name.toUpperCase(), M, 8, 'monoMedium', C.amberText);
  y -= 29;
  for (const titleLine of wrap(input.phase.label, 'bold', 28, CW - 145)) {
    text(titleLine, M, 28, 'bold');
    y -= 31;
  }
  text(input.phase.sourceWeightRange, M, 11, 'regular', C.muted);
  const badge = input.assessment.headline;
  const badgeFailed = input.assessment.verdict !== 'meets_requirements';
  const badgeWidth = width(badge, 'semibold', 8) + 22;
  page.drawRectangle({ x: W - M - badgeWidth, y: y - 5, width: badgeWidth, height: 23, color: badgeFailed ? C.redTint : C.greenTint });
  textRight(badge, W - M - 11, 8, 'semibold', badgeFailed ? C.red : C.green, y + 2);
  y -= 35;

  const tiles = [
    ['Priority', input.manufacturerRecipe ? 'Manufacturer recipe' : input.priority.label],
    ['Planning cost', costLabel],
    ['Premix', `${premix.sku} · ${premix.inclusionKgPerTonne} kg/t`],
    ['Formula total', `${totalInclusion.toFixed(2)}%`],
  ];
  const tileGap = 7;
  const tileWidth = (CW - tileGap * 3) / 4;
  tiles.forEach(([label, value], index) => {
    const x = M + index * (tileWidth + tileGap);
    box(x, y, tileWidth, 52, C.paper);
    box(x, y, 2.5, 52, C.green);
    text(label.toUpperCase(), x + 11, 6.2, 'monoMedium', C.muted, y - 16);
    text(value, x + 11, 12, 'bold', C.ink, y - 37);
  });
  y -= 78;

  const reviewWarning = 'This computer-generated formula has not been reviewed by an animal nutritionist. It must be reviewed and approved by a qualified animal nutritionist before manufacture or feeding.';
  const warningLines = wrap(reviewWarning, 'regular', 8.2, CW - 30);
  const warningHeight = 29 + warningLines.length * 11;
  box(M, y, CW, warningHeight, C.paper);
  box(M, y, 4, warningHeight, C.amber);
  text('UNREVIEWED FORMULATION', M + 15, 7.2, 'monoMedium', C.amberText, y - 16);
  warningLines.forEach((warningLine, index) => text(warningLine, M + 15, 8.2, 'semibold', C.ink, y - 33 - index * 11));
  y -= warningHeight + 24;

  sectionHeading('Formula and batch sheet', '1,000 kg finished feed');
  const formulaRows = [...input.formula.ingredients]
    .sort((a, b) => b.inclusionPct - a.inclusionPct)
    .map((item) => {
      const ingredient = ingredientMap.get(item.ingredientId);
      const planningPrice = planningPricePerTonne(item.ingredientId);
      const kgPerTonne = item.inclusionPct * 10;
      const contribution = planningPrice === undefined ? undefined : kgPerTonne * planningPrice / 1000;
      return [
        ingredient?.name ?? item.ingredientId,
        item.inclusionPct.toFixed(item.inclusionPct < 1 ? 3 : 2),
        kgPerTonne.toFixed(2),
        planningPrice === undefined ? 'Not priced' : `$${planningPrice.toFixed(2)}`,
        contribution === undefined ? '—' : `$${contribution.toFixed(2)}`,
      ];
    });
  formulaRows.push(['TOTAL', totalInclusion.toFixed(2), '1,000.00', '', `$${costPerTonne.toFixed(2)}${costPartial ? '*' : ''}`]);
  drawTable(
    [
      { label: 'Ingredient', width: 204 },
      { label: 'Inclusion %', width: 72, align: 'right' },
      { label: 'kg / tonne', width: 72, align: 'right' },
      { label: 'Planning USD/t', width: 84, align: 'right' },
      { label: 'Cost USD/t', width: 79, align: 'right' },
    ],
    formulaRows,
  );
  if (partialCostNote) paragraph(partialCostNote, 7.6, C.amberText);

  const failedRequirements = input.assessment.requirements.filter((check) => check.status === 'not_met');
  sectionHeading('Hard requirements', input.assessment.headline);
  paragraph(input.assessment.summary, 8);
  if (input.assessment.consistencyErrors.length) {
    input.assessment.consistencyErrors.forEach((error) => paragraph(`Engine consistency error: ${error}`, 8, C.red));
  }
  if (input.assessment.requirements.length) {
    drawTable(
      [
        { label: 'Requirement', width: 170 },
        { label: 'Recipe', width: 78, align: 'right' },
        { label: 'Requirement', width: 98, align: 'right' },
        { label: 'Status', width: 60 },
        { label: 'Data', width: 105 },
      ],
      input.assessment.requirements.map((check) => [
        `${check.label}${check.unit ? ` (${check.unit})` : ''}`,
        compactNumber(check.actual, requirementDisplay(check, 3).dp),
        `${relationLabel(check.relation)} ${compactNumber(check.bound, requirementDisplay(check, 3).dp)}`,
        check.status === 'met' ? 'Met' : 'Not met',
        dataTag(check),
      ]),
      { fontSize: 7.4, statusColumn: 3, failedRows: new Set(input.assessment.requirements.flatMap((check, index) => check.status === 'not_met' ? [index] : [])) },
    );
  }
  paragraph(`${input.assessment.scope} Data: Published = documented by the source; Assumed 0 = the premix does not document the value, so it is counted as 0 (a conservative assumption, not a documented value); Missing = no value is available; total only = a total value without a SID/digestible value, not counted toward SID.`, 7.4, C.muted);
  if (failedRequirements.length) {
    paragraph(`Not met: ${failedRequirements.map((check) => `${check.label} (${requirementDisplay(check, 3).gap?.text})`).join(', ')}. Do not mix this recipe until every hard requirement is met.`, 8, C.red);
  }

  sectionHeading('Commercial premix', `${premix.inclusionPct}% inclusion · ${premix.inclusionKgPerTonne} kg/t`);
  drawTable(
    [
      { label: 'Field', width: 140 },
      { label: 'Detail', width: 371 },
    ],
    [
      ['Product', premix.name],
      ['Manufacturer · SKU', `${premix.manufacturer} · ${premix.sku}`],
      ['Application', premix.application],
      ['Dose', premix.inclusionInstructions],
      ['Nutrient data', premixContributions.length
        ? `${premixContributions.length} documented nutrient${premixContributions.length === 1 ? '' : 's'}${premix.source?.basis ? ` (${premix.source.basis})` : ''}, counted once alongside every other ingredient. Nutrients the premix does not document are counted as 0 (Assumed 0).`
        : 'No composition published. Every premix nutrient is counted as 0 (Assumed 0).'],
      ...(input.manufacturerRecipe ? [['Restriction', 'Fixed manufacturer recipe. No ingredient substitutions or ratio changes are permitted without a customised formula from the manufacturer.']] : []),
      ['Specification', premix.specificationUrl],
    ],
    { fontSize: 7.6, repeatHeader: false },
  );

  if (premixContributions.length) {
    sectionHeading('What the premix contributes', `per kg of finished feed at ${premix.inclusionKgPerTonne} kg/t`);
    drawTable(
      [
        { label: 'Nutrient', width: 150 },
        { label: 'Unit', width: 50 },
        { label: 'Per kg premix', width: 85, align: 'right' },
        { label: 'Per kg feed', width: 85, align: 'right' },
        { label: 'Note', width: 141 },
      ],
      premixContributions.map((row) => [
        row.nutrient,
        row.unit,
        compactNumber(row.premixConcentration, 3),
        compactNumber(row.finishedFeedContribution, 4),
        row.countsTowardDigestible ? 'Published' : 'Published · total only, not counted toward SID',
      ]),
      { fontSize: 7.4 },
    );
  } else {
    paragraph(`${premix.manufacturer} has not published a composition for this premix, so none of its nutrients is credited; each is counted as 0 and labelled as an assumption.`, 8, C.amberText);
  }

  const supplementationRows = input.assessment.supplementation?.rows ?? [];
  const gapLine = documentationGapLine(input.assessment);
  const upper = input.assessment.upperLimits?.status === 'assessed' ? input.assessment.upperLimits : null;
  if (gapLine || supplementationRows.length || upper) {
    sectionHeading('Advisories', 'optional · never block the recipe');
    if (upper) {
      const exceeded = upper.rows.filter((row) => row.status === 'exceeds');
      const nameOf = (id: string) => ingredientMap.get(id)?.name ?? id;
      // Red only for an established exceedance; missing data is never red.
      exceeded.forEach((row) => paragraph(
        `${upperLimitTitle(row)}. ${upperLimitSentence(row)}${row.contributions.length ? ` From ${row.contributions.slice(0, 3).map((c) => `${nameOf(c.ingredientId)} ${formatUpperLimitValue(c.value, row.unit)}`).join(', ')}.` : ''}`,
        8, C.red,
      ));
      if (exceeded.some((row) => UPPER_LIMIT_VITAMIN_IDS.includes(row.id))) {
        paragraph('Suggested action: verify the vitamin specifications of the selected premix with its manufacturer, or compare compatible premixes in FeedSport Studio, which re-runs each one with these ingredients and prices.', 8);
      }
      drawTable(
        [
          { label: 'CFIA reference', width: 130 },
          { label: 'Recipe', width: 95, align: 'right' },
          { label: 'Maximum', width: 95, align: 'right' },
          { label: 'Comparison', width: CW - 320 },
        ],
        upper.rows.map((row) => [
          row.label,
          row.status === 'not_documented' && row.actual === 0 ? '—' : formatUpperLimitValue(row.actual, row.unit),
          formatUpperLimitValue(row.max, row.unit),
          `${row.status === 'exceeds' ? 'Above the reference maximum' : row.status === 'within' ? 'Within the reference maximum' : 'Not documented by the premix'} · ${DATA_STATUS_LABELS[row.data]}`,
        ]),
        { fontSize: 7.2, statusColumn: 3, failedRows: new Set(upper.rows.flatMap((row, index) => (row.status === 'exceeds' ? [index] : []))) },
      );
      paragraph(`Upper limits compared with ${upper.source}, ${upper.category.label} (${upper.mapping.basis}). ${upper.mapping.explanation} ${upper.basis} Reference maximums, not requirements: they do not affect whether the recipe meets its hard requirements.${upper.notAssessed.length ? ` ${upper.notAssessed.map((label, i) => (i ? label.toLowerCase() : label)).join(', ')} ${upper.notAssessed.length === 1 ? 'is' : 'are'} not modelled by FeedSport and not assessed.` : ''}`, 7.4, C.muted);
    }
    if (gapLine) paragraph(gapLine, 8, C.amberText);
    if (supplementationRows.length) {
      paragraph(`Vitamin and trace-mineral supplementation compared with ${input.assessment.supplementation!.source} (inorganic trace-mineral basis). These are recommendations, not requirements: they do not affect whether the recipe meets its hard requirements.`, 8, C.amberText);
      drawTable(
        [
          { label: 'Nutrient', width: 130 },
          { label: 'Supplemented', width: 85, align: 'right' },
          { label: 'Recommendation', width: 85, align: 'right' },
          { label: '% of recommendation', width: 96, align: 'right' },
          { label: 'Advisory', width: 115 },
        ],
        supplementationRows.map((row) => [
          row.label,
          `${compactNumber(row.actual, 2)} ${row.unit}`,
          `${compactNumber(row.recommended, 2)} ${row.unit}`,
          row.pctOfRecommendation === null ? '—' : `${compactNumber(row.pctOfRecommendation, Math.min(2, distinguishingDp(row.pctOfRecommendation, 100, 0)))}%`,
          `${SUPPLEMENTATION_STATUS_LABELS[row.status]} · ${DATA_STATUS_LABELS[row.data]}`,
        ]),
        { fontSize: 7.2 },
      );
    }
  }

  sectionHeading('Planning prices and provenance');
  paragraph('Prices are planning assumptions, not supplier quotations. Regional and global references include the engine’s standard import multiplier where applicable; freight, duty, handling and supplier-specific terms may still differ.', 8);
  const priceRows = input.formula.ingredients
    .map((item) => {
      const ingredient = ingredientMap.get(item.ingredientId);
      const quoted = item.ingredientId === premix.id && input.premixPricePerKg !== undefined;
      const price = ingredientDefaultPrice(item.ingredientId, input.ingredientPrices);
      const planningPrice = planningPricePerTonne(item.ingredientId);
      return [
        ingredient?.name ?? item.ingredientId,
        planningPrice === undefined ? '—' : `$${planningPrice.toFixed(2)}`,
        quoted ? 'User-entered supplier quote' : price?.market ?? 'No market reference',
        quoted ? '—' : price?.asOf ?? '—',
        quoted ? 'Entered on the formulation page' : price?.sourceLabel ?? 'No source recorded',
      ];
    });
  drawTable(
    [
      { label: 'Ingredient', width: 128 },
      { label: 'USD/t', width: 60, align: 'right' },
      { label: 'Market', width: 100 },
      { label: 'As of', width: 65 },
      { label: 'Source', width: 158 },
    ],
    priceRows,
    { fontSize: 6.8 },
  );

  sectionHeading('Source basis and assumptions');
  const supplementationSources = input.phase.supplementation
    ? `Chapter 7 supplementation recommendations (advisory, not requirements): Brazilian Tables 2024 tables ${input.phase.supplementation.sourceTables.join(', ')}, printed pages ${input.phase.supplementation.sourcePages.join(', ')}.`
    : 'No separate vitamin/trace-mineral supplementation table is attached to this phase.';
  const premixSource = `Premix: ${premix.name} (${premix.manufacturer}, SKU ${premix.sku}) at the manufacturer-published ${premix.inclusionKgPerTonne} kg/t. ${premix.note ?? ''}`.trim();
  const methodology = [
    `Requirements: ${input.programme.description} Phase source: Table ${input.phase.sourceTable}, printed page ${input.phase.sourcePage}; source weight basis ${input.phase.sourceWeightRange}.`,
    supplementationSources,
    premixSource,
    `Ingredient nutrient matrix: ${INGREDIENT_LIBRARY.source.publisher}, ${INGREDIENT_LIBRARY.source.title}, ${INGREDIENT_LIBRARY.source.edition} (${INGREDIENT_LIBRARY.source.year}), ${INGREDIENT_LIBRARY.source.chapter}. DOI ${INGREDIENT_LIBRARY.source.doi}.`,
    input.manufacturerRecipe
      ? `Recipe: ${premix.manufacturer}'s published basal recipe for ${premix.sku}, reproduced exactly and not independently optimised.`
      : `Priority: ${input.priority.description}${input.costIncreasePct > 0 ? ` This formula is ${input.costIncreasePct.toFixed(2)}% above the least-cost solution.` : ''}`,
    'Nutrient calculations use the FeedSport engine ingredient matrix on an as-fed basis. ME is the selected energy system. SID denotes standardized ileal digestibility; available phosphorus and mineral constraints follow the programme model.',
    'Review status: this formula is computer-generated and has not been reviewed by an animal nutritionist. A qualified animal nutritionist must review and approve it before manufacture or feeding.',
    'Operational check: confirm current supplier prices, ingredient certificates of analysis, premix carrier and manufacturability before production. Re-formulate when ingredient quality, availability or price changes.',
  ];
  methodology.forEach((note, index) => {
    const lines = wrap(note, 'regular', 7.4, CW - 24);
    ensureSpace(lines.length * 10 + 6);
    text(`${index + 1}.`, M, 7.4, 'monoMedium', C.green);
    lines.forEach((noteLine, lineIndex) => text(noteLine, M + 24, 7.4, 'regular', C.body, y - lineIndex * 10));
    y -= lines.length * 10 + 6;
  });

  const pages = pdf.getPages();
  const address = `${siteConfig.address.streetAddress}, ${siteConfig.address.addressLocality}, Zimbabwe`;
  pages.forEach((current, index) => {
    page = current;
    text('UNREVIEWED FORMULATION — Must be reviewed and approved by a qualified animal nutritionist before manufacture or feeding.', M, 6.3, 'semibold', C.amberText, M + 29);
    line(M, W - M, M + 21, 0.75, C.rule);
    text(`${siteConfig.name} · ${address}`, M, 6.8, 'regular', C.muted, M + 9);
    textRight(docRef, W - M, 6.8, 'mono', C.muted, M + 9);
    textRight(`Page ${index + 1} of ${pages.length}`, W - M, 6.8, 'monoMedium', C.ink, M - 2);
  });

  return pdf.save();
}

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
import {
  INGREDIENT_LIBRARY,
  ingredientLibraryWithCustomPremixes,
} from '@/lib/ingredient-nutrients';
import type { NutritionPhase } from '@/lib/nutrition';
import {
  PUBLIC_PREMIX_INCLUSION_PCT,
  PUBLIC_PREMIX_KG_PER_TONNE,
  publicPremixProfileForPhase,
} from '@/lib/public-feed-premix';
import { siteConfig } from '@/lib/seo';

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
  nutrientProfile: FormulationNutrientComparison[];
  costPerKg: number;
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

const vitaminLabels: Record<string, [string, string]> = {
  vitaminAIuKg: ['Vitamin A', 'IU/kg'],
  vitaminDIuKg: ['Vitamin D', 'IU/kg'],
  vitaminEIuKg: ['Vitamin E', 'IU/kg'],
  vitaminKMgKg: ['Vitamin K', 'mg/kg'],
  vitaminB1MgKg: ['Vitamin B1', 'mg/kg'],
  riboflavinMgKg: ['Riboflavin (B2)', 'mg/kg'],
  vitaminB6MgKg: ['Vitamin B6', 'mg/kg'],
  vitaminB12McgKg: ['Vitamin B12', 'mcg/kg'],
  pantothenicAcidMgKg: ['Pantothenic acid', 'mg/kg'],
  niacinMgKg: ['Niacin', 'mg/kg'],
  folicAcidMgKg: ['Folic acid', 'mg/kg'],
  biotinMgKg: ['Biotin', 'mg/kg'],
  totalCholineMgKg: ['Total choline', 'mg/kg'],
};

const traceLabels: Record<string, string> = {
  zinc: 'Zinc',
  iron: 'Iron',
  manganese: 'Manganese',
  copper: 'Copper',
  iodine: 'Iodine',
  selenium: 'Selenium',
};

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
  const premix = publicPremixProfileForPhase(input.phase);
  const ingredientLibrary = ingredientLibraryWithCustomPremixes([premix], INGREDIENT_LIBRARY);
  const ingredientMap = new Map(ingredientLibrary.ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const totalInclusion = input.formula.ingredients.reduce((sum, ingredient) => sum + ingredient.inclusionPct, 0);
  const passed = input.nutrientProfile.filter((nutrient) => nutrient.margin >= -1e-6).length;
  const generalNutrientProfile = input.nutrientProfile.filter((nutrient) => !nutrient.id.startsWith('supplement-'));

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
    ensureSpace(35);
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
  const drawTable = (columns: TableColumn[], rows: string[][], options?: { fontSize?: number; repeatHeader?: boolean }) => {
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
        const font: FontName = columnIndex === 0 ? 'semibold' : 'regular';
        wrapped[columnIndex].forEach((cellLine, lineIndex) => {
          const baseline = y - 14 - lineIndex * 10;
          if (column.align === 'right') textRight(cellLine, x + column.width - padding, fontSize, font, C.body, baseline);
          else text(cellLine, x + padding, fontSize, font, C.body, baseline);
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
  const badge = `${passed}/${input.nutrientProfile.length} constraints met`;
  const badgeWidth = width(badge, 'semibold', 8) + 22;
  page.drawRectangle({ x: W - M - badgeWidth, y: y - 5, width: badgeWidth, height: 23, color: C.greenTint });
  textRight(badge, W - M - 11, 8, 'semibold', C.green, y + 2);
  y -= 35;

  const tiles = [
    ['Priority', input.priority.label],
    ['Planning cost', `$${(input.costPerKg * 1000).toFixed(2)}/t`],
    ['Premix', `${PUBLIC_PREMIX_KG_PER_TONNE} kg/t`],
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
      const planningPrice = ingredientDefaultPlanningPricePerTonne(item.ingredientId, input.ingredientPrices);
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
  formulaRows.push(['TOTAL', totalInclusion.toFixed(2), '1,000.00', '', `$${(input.costPerKg * 1000).toFixed(2)}`]);
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

  sectionHeading('Nutrient compliance', `${generalNutrientProfile.length} nutrient and practical constraints`);
  paragraph('The public screen shows six core checks. This table contains the remaining general nutrient and practical constraints used by the formulation engine. Vitamin and trace-mineral supplementation is presented separately below.', 8);
  drawTable(
    [
      { label: 'Requirement', width: 198 },
      { label: 'Rule', width: 41 },
      { label: 'Target', width: 74, align: 'right' },
      { label: 'Actual', width: 74, align: 'right' },
      { label: 'Margin', width: 66, align: 'right' },
      { label: 'Status', width: 58, align: 'right' },
    ],
    generalNutrientProfile.map((nutrient) => [
      `${nutrient.label} (${nutrient.unit})`,
      nutrient.relation === 'min' ? 'MIN' : 'MAX',
      compactNumber(nutrient.requirement),
      compactNumber(nutrient.actual),
      compactNumber(nutrient.margin),
      nutrient.margin >= -1e-6 ? (nutrient.binding ? 'Binding' : 'Meets') : 'Outside',
    ]),
    { fontSize: 7.4 },
  );

  sectionHeading('Vitamin premix specification', `${PUBLIC_PREMIX_INCLUSION_PCT}% inclusion · ${PUBLIC_PREMIX_KG_PER_TONNE} kg/t`);
  paragraph('This phase-specific vitamin-mineral premix is fixed at 1% of finished feed. Vitamin concentrations below are calculated so that 10 kg of premix per tonne supplies the published finished-feed supplementation level.', 8);
  const vitaminRows = Object.entries(premix.vitamins).flatMap(([key, premixValue]) => {
    if (premixValue === undefined) return [];
    const [label, unit] = vitaminLabels[key] ?? [key, ''];
    const finishedValue = input.phase.supplementation?.vitamins[key as keyof typeof input.phase.supplementation.vitamins];
    return [[label, unit, compactNumber(premixValue, 2), finishedValue === undefined ? '—' : compactNumber(finishedValue, 3)]];
  });
  drawTable(
    [
      { label: 'Vitamin', width: 214 },
      { label: 'Unit', width: 75 },
      { label: 'Premix concentration', width: 116, align: 'right' },
      { label: 'Finished-feed addition', width: 106, align: 'right' },
    ],
    vitaminRows,
    { fontSize: 7.7 },
  );

  sectionHeading('Trace-mineral premix specification', 'Inorganic basis');
  paragraph('Trace minerals are shown separately from vitamins. Premix concentrations provide the published inorganic trace-mineral addition when the premix is included at 10 kg per tonne.', 8);
  const traceTargets = input.phase.supplementation?.traceMinerals.inorganic;
  const traceRows = Object.entries(premix.traceMineralsPpm).flatMap(([key, premixValue]) => {
    if (premixValue === undefined) return [];
    const targetKey = `${key}Ppm` as keyof NonNullable<typeof traceTargets>;
    const finishedValue = traceTargets?.[targetKey];
    return [[traceLabels[key] ?? key, 'ppm', compactNumber(premixValue, 2), finishedValue === undefined ? '—' : compactNumber(finishedValue, 3)]];
  });
  drawTable(
    [
      { label: 'Trace mineral', width: 214 },
      { label: 'Unit', width: 75 },
      { label: 'Premix concentration', width: 116, align: 'right' },
      { label: 'Finished-feed addition', width: 106, align: 'right' },
    ],
    traceRows,
    { fontSize: 7.7 },
  );

  sectionHeading('Planning prices and provenance');
  paragraph('Prices are planning assumptions, not supplier quotations. Regional and global references include the engine’s standard import multiplier where applicable; freight, duty, handling and supplier-specific terms may still differ.', 8);
  const priceRows = input.formula.ingredients
    .map((item) => {
      const ingredient = ingredientMap.get(item.ingredientId);
      const price = ingredientDefaultPrice(item.ingredientId, input.ingredientPrices);
      const planningPrice = ingredientDefaultPlanningPricePerTonne(item.ingredientId, input.ingredientPrices);
      return [
        ingredient?.name ?? item.ingredientId,
        planningPrice === undefined ? '—' : `$${planningPrice.toFixed(2)}`,
        price?.market ?? 'No market reference',
        price?.asOf ?? '—',
        price?.sourceLabel ?? 'No source recorded',
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
    ? `Premix supplementation: Brazilian Tables 2024 tables ${input.phase.supplementation.sourceTables.join(', ')}, printed pages ${input.phase.supplementation.sourcePages.join(', ')}.`
    : 'No separate vitamin/trace-mineral supplementation table is attached to this phase.';
  const methodology = [
    `Requirements: ${input.programme.description} Phase source: Table ${input.phase.sourceTable}, printed page ${input.phase.sourcePage}; source weight basis ${input.phase.sourceWeightRange}.`,
    supplementationSources,
    `Ingredient nutrient matrix: ${INGREDIENT_LIBRARY.source.publisher}, ${INGREDIENT_LIBRARY.source.title}, ${INGREDIENT_LIBRARY.source.edition} (${INGREDIENT_LIBRARY.source.year}), ${INGREDIENT_LIBRARY.source.chapter}. DOI ${INGREDIENT_LIBRARY.source.doi}.`,
    `Priority: ${input.priority.description}${input.costIncreasePct > 0 ? ` This formula is ${input.costIncreasePct.toFixed(2)}% above the least-cost solution.` : ''}`,
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

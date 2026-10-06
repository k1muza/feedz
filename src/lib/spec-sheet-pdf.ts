import { readFile } from 'node:fs/promises';
import path from 'node:path';

import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib';

import type { FeedProduct, ProductSpec } from '@/data/feedProducts';
import { siteConfig } from '@/lib/seo';

const W = 595.28;
const H = 841.89;
const M = 44;
const CW = W - M * 2;
const BOTTOM = M + 54;

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
  greenTint: hex('#c9d4c8'),
  amber: hex('#d99a2b'),
  amberText: hex('#7a5414'),
  rule: hex('#d9d4c7'),
  hairline: hex('#ece8de'),
  paper: hex('#f3f0e8'),
  zebra: hex('#faf8f3'),
  band: hex('#e7e2d6'),
  white: rgb(1, 1, 1),
};

const statusColour: Record<FeedProduct['status'], RGB> = {
  'Readily available': hex('#2e7d4f'),
  Limited: hex('#b7791f'),
  'Available to order': hex('#6b6f66'),
};

const compositionColours: Record<string, RGB> = {
  Moisture: hex('#e7e2d6'),
  'Crude protein': hex('#1d3a2a'),
  'Crude fat': hex('#d99a2b'),
  'Crude fibre': hex('#8a9a6b'),
  Ash: hex('#9a948a'),
  NFE: hex('#c9bfa6'),
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

const numberValue = (value: string) => Number.parseFloat(value.replace(/,/g, ''));
const decimalPlaces = (value: string) => value.split('.')[1]?.length ?? 0;

function formatLike(value: number, source: ProductSpec) {
  if (!Number.isFinite(value)) return source.value;
  if (source.unit === 'kcal/kg') return Math.round(value).toLocaleString('en-US');
  return value.toFixed(decimalPlaces(source.value));
}

function findRow(product: FeedProduct, label: string) {
  return product.nutrientGroups?.flatMap((group) => group.rows).find((row) => row.label === label);
}

function proximateComposition(product: FeedProduct) {
  const proximate = product.nutrientGroups?.find((group) => group.title === 'Proximate');
  const dryMatter = numberValue(findRow(product, 'Dry matter')?.value ?? '');
  if (!proximate || !Number.isFinite(dryMatter)) return [];
  const rows = ['Crude protein', 'Crude fat', 'Crude fibre', 'Ash'].map((label) => ({
    label,
    value: numberValue(proximate.rows.find((row) => row.label === label)?.value ?? ''),
  }));
  if (rows.some(({ value }) => !Number.isFinite(value))) return [];
  const nfe = dryMatter - rows.reduce((total, row) => total + row.value, 0);
  return [{ label: 'Moisture', value: 100 - dryMatter }, ...rows, { label: 'NFE', value: nfe }]
    .filter((part) => part.value > 0.01)
    .map((part) => ({ ...part, colour: compositionColours[part.label] }));
}

export async function renderSpecSheet(product: FeedProduct) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`${product.name} — Product specification sheet`);
  pdf.setAuthor(siteConfig.name);
  pdf.setSubject(`${product.name} · ${product.grade}`);
  pdf.setCreator(siteConfig.url);

  const bytes = await loadFontBytes();
  const fonts = Object.fromEntries(
    await Promise.all(Object.entries(bytes).map(async ([name, data]) => [name, await pdf.embedFont(data, { subset: true })] as const)),
  ) as Record<FontName, PDFFont>;

  const issuedOn = new Date();
  const issued = issuedOn.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const docRef = `FS-SPEC-${product.id.toUpperCase()}`;
  const source = product.nutritionSource;

  let page: PDFPage = pdf.addPage([W, H]);
  let y = H;

  // --- drawing helpers -------------------------------------------------------
  const width = (value: string, font: FontName, size: number) => fonts[font].widthOfTextAtSize(value, size);
  const text = (value: string, x: number, size: number, font: FontName = 'regular', color = C.ink, atY = y) => {
    page.drawText(value, { x, y: atY, size, font: fonts[font], color });
  };
  const textRight = (value: string, right: number, size: number, font: FontName = 'regular', color = C.ink, atY = y) => {
    text(value, right - width(value, font, size), size, font, color, atY);
  };
  const box = (x: number, top: number, w: number, h: number, color: RGB) => {
    page.drawRectangle({ x, y: top - h, width: w, height: h, color });
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
    return lines;
  };
  const sectionHeading = (label: string, x: number, w: number, aside?: string) => {
    text(label.toUpperCase(), x, 7.5, 'monoMedium', C.green);
    if (aside) textRight(aside, x + w, 7, 'mono', C.muted);
    line(x, x + w, y - 6, 1, C.ink);
    y -= 20;
  };

  const continuationHeader = () => {
    page = pdf.addPage([W, H]);
    y = H - M;
    text('FeedSport', M, 12, 'bold', C.green);
    textRight(`${product.name} · Product specification`, W - M, 7.5, 'mono', C.muted);
    line(M, W - M, y - 9, 1.5, C.ink);
    box(M, y - 8.25, 36, 2.5, C.amber);
    y -= 36;
  };
  const ensureSpace = (needed: number) => {
    if (y - needed >= BOTTOM) return false;
    continuationHeader();
    return true;
  };

  // --- masthead --------------------------------------------------------------
  const bandHeight = 92;
  box(0, H, W, bandHeight, C.green);
  box(0, H - bandHeight, W, 3, C.amber);
  text('FeedSport', M, 22, 'bold', C.white, H - 46);
  text('INTERNATIONAL', M + 1, 7.5, 'monoMedium', C.greenTint, H - 61);
  textRight('PRODUCT SPECIFICATION SHEET', W - M, 8, 'monoMedium', C.white, H - 38);
  textRight(`Doc. ${docRef}`, W - M, 7.5, 'mono', C.greenTint, H - 53);
  textRight(`Issued ${issued}`, W - M, 7.5, 'mono', C.greenTint, H - 65);
  y = H - bandHeight - 38;

  // --- title block -----------------------------------------------------------
  text(product.category.toUpperCase(), M, 8, 'monoMedium', C.amberText);
  const statusWidth = width(product.status, 'semibold', 8.5) + 26;
  page.drawRectangle({ x: W - M - statusWidth, y: y - 7, width: statusWidth, height: 20, color: C.paper, borderColor: C.rule, borderWidth: 0.75 });
  page.drawCircle({ x: W - M - statusWidth + 10, y: y + 3, size: 3, color: statusColour[product.status] });
  text(product.status, W - M - statusWidth + 18, 8.5, 'semibold', C.ink, y);
  y -= 32;
  for (const titleLine of wrap(product.name, 'bold', 30, CW - statusWidth - 16)) {
    text(titleLine, M, 30, 'bold');
    y -= 32;
  }
  y += 6;
  text(product.grade, M, 12.5, 'regular', C.muted);
  y -= 22;
  for (const descriptionLine of wrap(product.description, 'regular', 10.5, 400)) {
    text(descriptionLine, M, 10.5, 'regular', C.body);
    y -= 15;
  }
  y -= 14;

  // --- key specification tiles ----------------------------------------------
  if (product.specs.length > 0) {
    const gap = 8;
    const tileWidth = (CW - gap * (product.specs.length - 1)) / product.specs.length;
    const tileHeight = 58;
    product.specs.forEach((spec, index) => {
      const x = M + index * (tileWidth + gap);
      box(x, y, tileWidth, tileHeight, C.paper);
      box(x, y, 2.5, tileHeight, C.green);
      text(spec.label.toUpperCase(), x + 14, 7, 'monoMedium', C.muted, y - 17);
      text(spec.value, x + 14, 22, 'bold', C.ink, y - 44);
      text(spec.unit, x + 14 + width(spec.value, 'bold', 22) + 4, 9, 'regular', C.muted, y - 44);
    });
    y -= tileHeight + 30;
  }

  // --- commercial information + proximate composition ------------------------
  const composition = proximateComposition(product);
  const details: [string, string][] = [
    ['Minimum order', product.moq],
    ['Packaging', product.packaging],
    ['Origin / supplier', product.origin],
    ['Certifications', product.certifications],
    ['Suitable for', product.animals.map((animal) => animal[0].toUpperCase() + animal.slice(1)).join(', ')],
  ];
  const columnGap = 28;
  const leftWidth = composition.length ? (CW - columnGap) / 2 : CW;
  const sectionTop = y;

  const detailRows = (items: [string, string][], x: number, w: number) => {
    for (const [label, value] of items) {
      text(label, x, 8.5, 'regular', C.muted);
      const valueLines = wrap(value, 'semibold', 9, w - 100);
      valueLines.forEach((valueLine, index) => text(valueLine, x + 100, 9, 'semibold', C.ink, y - index * 12));
      y -= (valueLines.length - 1) * 12 + 8;
      line(x, x + w, y, 0.5, C.hairline);
      y -= 13;
    }
  };
  sectionHeading('Commercial information', M, leftWidth);
  if (composition.length) detailRows(details, M, leftWidth);
  else {
    // No composition chart: split the details into two columns rather than one very wide list.
    const half = (CW - columnGap) / 2;
    const rowsTop = y;
    detailRows(details.slice(0, 3), M, half);
    const firstBottom = y;
    y = rowsTop;
    detailRows(details.slice(3), M + half + columnGap, half);
    y = Math.min(y, firstBottom);
  }
  const leftBottom = y;

  if (composition.length) {
    const x = M + leftWidth + columnGap;
    const w = leftWidth;
    y = sectionTop;
    sectionHeading('Proximate composition', x, w, 'As fed · % of sample');
    const barHeight = 18;
    let cursor = x;
    for (const part of composition) {
      const segment = (part.value / 100) * w;
      box(cursor, y + 4, segment, barHeight, part.colour);
      cursor += segment;
    }
    page.drawRectangle({ x, y: y + 4 - barHeight, width: w, height: barHeight, borderColor: C.rule, borderWidth: 0.5 });
    y -= barHeight + 10;
    const legendColumn = (w - 16) / 2;
    composition.forEach((part, index) => {
      const lx = x + (index % 2) * (legendColumn + 16);
      const ly = y - Math.floor(index / 2) * 17;
      box(lx, ly + 7.5, 7, 7, part.colour);
      text(part.label, lx + 12, 8.5, 'regular', C.body, ly);
      textRight(`${part.value.toFixed(1)}%`, lx + legendColumn, 8.5, 'semibold', C.ink, ly);
      line(lx, lx + legendColumn, ly - 5, 0.5, C.hairline);
    });
    y -= Math.ceil(composition.length / 2) * 17;
  }
  y = Math.min(y, leftBottom) - 18;

  // --- nutritional analysis table -------------------------------------------
  const dryMatter = numberValue(findRow(product, 'Dry matter')?.value ?? '');
  const sourceIsDryMatter = source?.basis.toLowerCase().includes('dry-matter') ?? false;
  const showBothBases = Number.isFinite(dryMatter) && dryMatter > 0;

  const columns = showBothBases
    ? { unit: M + 250, values: [{ label: 'As fed', right: M + 395 }, { label: 'Dry matter', right: W - M - 12 }] }
    : { unit: M + 330, values: [{ label: 'Value', right: W - M - 12 }] };

  const bases = (row: ProductSpec) => {
    const value = numberValue(row.value);
    if (!showBothBases) return [row.value];
    if (row.label === 'Dry matter') return [formatLike(dryMatter, row), formatLike(100, row)];
    if (!Number.isFinite(value)) return [row.value, row.value];
    return sourceIsDryMatter
      ? [formatLike(value * dryMatter / 100, row), row.value]
      : [row.value, formatLike(value * 100 / dryMatter, row)];
  };

  const tableHeader = () => {
    box(M, y, CW, 20, C.green);
    const baseline = y - 13.5;
    text('NUTRIENT', M + 10, 7, 'monoMedium', C.white, baseline);
    text('UNIT', columns.unit, 7, 'monoMedium', C.white, baseline);
    columns.values.forEach((column) => textRight(column.label.toUpperCase(), column.right, 7, 'monoMedium', C.white, baseline));
    y -= 20;
  };
  const groupHeader = (title: string) => {
    box(M, y, CW, 18, C.band);
    text(title.toUpperCase(), M + 10, 7.5, 'bold', C.green, y - 12.5);
    y -= 18;
  };

  ensureSpace(90);
  text('Typical nutritional analysis', M, 15, 'bold');
  textRight(source ? `Source basis: ${sourceIsDryMatter ? 'dry matter' : 'as fed'}` : 'Supplier specification', W - M, 7.5, 'mono', C.muted);
  y -= 14;

  if (!product.nutrientGroups) {
    y -= 6;
    for (const messageLine of wrap('Composition depends on the species and production stage specified. A supplier guaranteed analysis is required before this product can be used in a formulation — ask FeedSport for the analysis that matches your order.', 'regular', 10, CW)) {
      text(messageLine, M, 10, 'regular', C.body);
      y -= 15;
    }
    y -= 4;
    line(M, W - M, y, 1, C.ink);
  }

  const rowHeight = 16;
  if (product.nutrientGroups) tableHeader();
  const pageCapacity = H - M - 36 - 20 - BOTTOM;
  for (const group of product.nutrientGroups ?? []) {
    // Keep a group on one page when it fits on a fresh one; otherwise just avoid orphaning its header.
    const groupHeight = 18 + rowHeight * group.rows.length;
    if (ensureSpace(groupHeight <= pageCapacity ? groupHeight : 18 + rowHeight * 2)) tableHeader();
    groupHeader(group.title);
    group.rows.forEach((row, index) => {
      if (ensureSpace(rowHeight)) {
        tableHeader();
        groupHeader(`${group.title} (continued)`);
      }
      if (index % 2 === 1) box(M, y, CW, rowHeight, C.zebra);
      const baseline = y - 11;
      text(row.label, M + 10, 9, 'regular', C.body, baseline);
      text(row.unit, columns.unit, 8, 'mono', C.muted, baseline);
      bases(row).forEach((value, column) => textRight(value, columns.values[column].right, 9, column === 0 ? 'semibold' : 'regular', C.ink, baseline));
      line(M, W - M, y - rowHeight, 0.4, C.hairline);
      y -= rowHeight;
    });
  }
  if (product.nutrientGroups) line(M, W - M, y, 1, C.ink);
  y -= 26;

  // --- notes -----------------------------------------------------------------
  const printedText = [product.grade, ...product.specs.map((spec) => spec.label), ...(product.nutrientGroups ?? []).flatMap((group) => group.rows.map((row) => row.label))].join(' ');
  const abbreviations = Object.entries({
    CP: 'CP crude protein',
    ME: 'ME metabolisable energy',
    NDF: 'NDF neutral detergent fibre',
    ADF: 'ADF acid detergent fibre',
    STTD: 'STTD standardised total tract digestible',
  })
    .filter(([abbreviation]) => new RegExp(`\\b${abbreviation}\\b`).test(printedText))
    .map(([, definition]) => definition);
  if (composition.length) abbreviations.push('NFE nitrogen-free extract, calculated by difference');
  const notes = [
    source
      ? `Source. ${source.ingredientName}. ${source.title}, ${source.edition}th edition (${source.year}). ${source.publisher}. ${source.sourceTable}${source.sourcePage ? `, p. ${source.sourcePage}` : ''}.`
      : 'Source. Supplier-defined typical specification.',
    showBothBases ? `Basis. Dry-matter values are calculated from the published dry matter content (${formatLike(dryMatter, findRow(product, 'Dry matter')!)}%).` : '',
    abbreviations.length ? `Abbreviations. ${abbreviations.join(' · ')}.` : '',
  ].filter(Boolean);
  const noteLines = notes.map((note) => wrap(note, 'regular', 7.5, CW - 28));
  const paragraphHeight = (lines: string[]) => lines.length * 10.5 + 5;
  // Fill the remaining space on the page, splitting the notes panel between paragraphs if needed.
  let remaining = noteLines;
  while (remaining.length) {
    ensureSpace(33 + paragraphHeight(remaining[0]) + 12);
    let fitting = 0;
    let panelHeight = 41;
    while (fitting < remaining.length && y - (panelHeight + paragraphHeight(remaining[fitting])) >= BOTTOM) {
      panelHeight += paragraphHeight(remaining[fitting]);
      fitting += 1;
    }
    const chunk = remaining.slice(0, Math.max(fitting, 1));
    remaining = remaining.slice(chunk.length);
    box(M, y, CW, panelHeight, C.paper);
    y -= 18;
    text(remaining.length + chunk.length === noteLines.length ? 'NOTES' : 'NOTES (CONTINUED)', M + 14, 7, 'monoMedium', C.green);
    y -= 15;
    chunk.forEach((lines) => {
      lines.forEach((noteLine, index) => {
        if (index === 0) {
          const [lead, ...rest] = noteLine.split(/(?<=\.) /);
          text(lead, M + 14, 7.5, 'semibold', C.ink);
          text(rest.join(' '), M + 14 + width(`${lead} `, 'semibold', 7.5), 7.5, 'regular', C.body);
        } else {
          text(noteLine, M + 14, 7.5, 'regular', C.body);
        }
        y -= 10.5;
      });
      y -= 5;
    });
    y -= 12;
  }

  // --- footer on every page --------------------------------------------------
  const pages = pdf.getPages();
  const address = `${siteConfig.address.streetAddress}, ${siteConfig.address.addressLocality}, Zimbabwe`;
  const contact = `+263 77 468 4534  ·  ${siteConfig.email}  ·  ${siteConfig.url.replace('https://', '')}`;
  pages.forEach((current, index) => {
    page = current;
    text('Typical values; actual analysis may vary between batches and suppliers. Confirm against the current FeedSport certificate of analysis before use in formulation.', M, 6.5, 'regular', C.muted, M + 33);
    line(M, W - M, M + 24, 0.75, C.rule);
    text(`${siteConfig.name}  ·  ${address}`, M, 7, 'regular', C.muted, M + 11);
    text(contact, M, 7, 'regular', C.muted, M);
    textRight(docRef, W - M, 7, 'mono', C.muted, M + 11);
    textRight(`Page ${index + 1} of ${pages.length}`, W - M, 7, 'monoMedium', C.ink, M);
  });

  return pdf.save();
}

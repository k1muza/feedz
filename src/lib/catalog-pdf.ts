import { readFile } from 'node:fs/promises';
import path from 'node:path';

import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib';

import { animalNames, type FeedProduct } from '@/data/feedProducts';
import { formatKg, packLabel } from '@/lib/product-units';
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
  white: rgb(1, 1, 1),
};

const statusColour: Record<FeedProduct['status'], RGB> = {
  'In stock': hex('#2e7d4f'),
  'Readily available': hex('#5b8f6a'),
  Limited: hex('#b7791f'),
  'On request': hex('#6b6f66'),
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

const money = (currency: string, value: number) => `${currency} ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Price per pack as sold (e.g. USD 15.94 / 50 kg). When the MOQ is more than one pack,
 * also the value of the MOQ in whole packs (e.g. 20 × 50 kg → USD 318.80 / 1 tonne).
 */
function priceQuote(product: FeedProduct) {
  if (!product.price || product.price <= 0) return undefined;
  const currency = product.currency || 'USD';
  const packSizeKg = product.packSizeKg ?? 1000;
  const moqKg = product.moqKg ?? 0;
  const moqValue = moqKg > packSizeKg
    ? `${money(currency, Math.ceil(moqKg / packSizeKg) * product.price)} / ${formatKg(moqKg)}`
    : undefined;
  return { amount: money(currency, product.price), per: `/ ${packLabel(packSizeKg)}`, moqValue };
}

export type CatalogPdfOptions = {
  /** Shown in the masthead when the catalogue is limited to one category. */
  categoryName?: string;
};

export async function renderCatalogPdf(products: FeedProduct[], options: CatalogPdfOptions = {}) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const title = options.categoryName ? `${options.categoryName} — Product catalogue` : 'Product catalogue';
  pdf.setTitle(`${siteConfig.name} — ${title}`);
  pdf.setAuthor(siteConfig.name);
  pdf.setSubject(`${products.length} feed products`);
  pdf.setCreator(siteConfig.url);

  const bytes = await loadFontBytes();
  const fonts = Object.fromEntries(
    await Promise.all(Object.entries(bytes).map(async ([name, data]) => [name, await pdf.embedFont(data, { subset: true })] as const)),
  ) as Record<FontName, PDFFont>;

  const issuedOn = new Date();
  const edition = issuedOn.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const docRef = `FS-CAT-${issuedOn.getFullYear()}${String(issuedOn.getMonth() + 1).padStart(2, '0')}`;

  const categories = Array.from(
    products.reduce((groups, product) => groups.set(product.category, [...(groups.get(product.category) ?? []), product]), new Map<string, FeedProduct[]>()),
  ).sort(([a], [b]) => a.localeCompare(b));

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
    for (const word of value.split(/\s+/).filter(Boolean)) {
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

  const continuationHeader = () => {
    page = pdf.addPage([W, H]);
    y = H - M;
    text('FeedSport', M, 12, 'bold', C.green);
    textRight(title, W - M, 7.5, 'mono', C.muted);
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
  textRight('PRODUCT CATALOGUE', W - M, 8, 'monoMedium', C.white, H - 38);
  textRight(`Doc. ${docRef}`, W - M, 7.5, 'mono', C.greenTint, H - 53);
  textRight(`Edition ${edition}`, W - M, 7.5, 'mono', C.greenTint, H - 65);
  y = H - bandHeight - 38;

  // --- title block -----------------------------------------------------------
  text('FEED INGREDIENTS · HARARE, ZIMBABWE', M, 8, 'monoMedium', C.amberText);
  y -= 32;
  text(options.categoryName ?? 'Product catalogue', M, 30, 'bold');
  y -= 24;
  const intro = options.categoryName
    ? `${options.categoryName} supplied by ${siteConfig.name}, with typical nutritional values, order quantities and packaging.`
    : `Feed ingredients, amino acids, minerals and additives supplied by ${siteConfig.name} to farmers and feed manufacturers, with typical nutritional values, order quantities and packaging.`;
  for (const introLine of wrap(intro, 'regular', 10.5, 420)) {
    text(introLine, M, 10.5, 'regular', C.body);
    y -= 15;
  }
  y -= 20;

  // --- contents (page numbers are filled in once the sections are laid out) ---
  const contentsPage = page;
  text('CONTENTS', M, 7.5, 'monoMedium', C.green);
  line(M, W - M, y - 6, 1, C.ink);
  y -= 22;
  const contentsRows = categories.map(([name, items]) => {
    const rowY = y;
    text(name, M, 9.5, 'semibold', C.ink, rowY);
    text(`${items.length} ${items.length === 1 ? 'product' : 'products'}`, M + 220, 8.5, 'regular', C.muted, rowY);
    line(M, W - M, rowY - 6, 0.5, C.hairline);
    y -= 19;
    return { name, rowY, page: 0 };
  });
  y -= 18;

  // --- product cards ---------------------------------------------------------
  const leftWidth = CW * 0.6;
  const rightX = M + leftWidth + 24;
  const rightWidth = W - M - rightX;
  const detailLabelWidth = 62;

  const cardLayout = (product: FeedProduct) => {
    const description = wrap(product.description, 'regular', 9, leftWidth);
    const specs = product.specs.filter((spec) => spec.value && spec.value !== 'Supplier-defined');
    const details: [string, string[]][] = ([
      ['MOQ', product.moq],
      ['Packaging', product.packaging],
      ['MOQ value', priceQuote(product)?.moqValue ?? ''],
      ['Origin', product.origin],
      ['Suitable for', product.animals.map((animal) => animalNames[animal] ?? animal).join(', ')],
      ['Quality', product.certifications],
    ] as [string, string][])
      .filter(([, value]) => value)
      .map(([label, value]) => [label, wrap(value, 'semibold', 8.5, rightWidth - detailLabelWidth)]);
    // Mirrors the vertical steps taken in drawCard.
    const leftHeight = 14 + 30 + description.length * 13 + (specs.length ? 2 + 36 : 0);
    const rightHeight = 14 + 38 + details.reduce((total, [, lines]) => total + lines.length * 11 + 3, 0);
    return { description, specs, details, height: Math.max(leftHeight, rightHeight) + 24 };
  };

  const drawCard = (product: FeedProduct, layout: ReturnType<typeof cardLayout>) => {
    const top = y;
    box(M, top, 2.5, layout.height - 18, C.green);

    // Left: identity, description and key specifications.
    y = top - 14;
    text(product.name, M + 14, 14, 'bold');
    y -= 15;
    text(product.grade, M + 14, 9, 'regular', C.muted);
    y -= 15;
    for (const descriptionLine of layout.description) {
      text(descriptionLine, M + 14, 9, 'regular', C.body);
      y -= 13;
    }
    if (layout.specs.length) {
      y -= 2;
      const chipGap = 6;
      const chipWidth = (leftWidth - 14 - chipGap * 2) / 3;
      layout.specs.slice(0, 3).forEach((spec, index) => {
        const x = M + 14 + index * (chipWidth + chipGap);
        box(x, y, chipWidth, 36, C.paper);
        text(spec.label.toUpperCase(), x + 8, 6, 'monoMedium', C.muted, y - 11);
        text(spec.value, x + 8, 12, 'bold', C.ink, y - 28);
        text(spec.unit, x + 8 + width(spec.value, 'bold', 12) + 3, 7.5, 'regular', C.muted, y - 28);
      });
    }

    // Right: price, availability and commercial details.
    y = top - 14;
    const price = priceQuote(product);
    if (price) {
      text(price.amount, rightX, 14, 'bold');
      text(price.per, rightX + width(price.amount, 'bold', 14) + 4, 8.5, 'regular', C.muted);
    } else {
      text('Price on request', rightX, 11, 'semibold', C.ink);
    }
    page.drawCircle({ x: rightX + 3, y: y - 14, size: 3, color: statusColour[product.status] });
    text(product.status, rightX + 11, 8.5, 'semibold', C.body, y - 17);
    y -= 38;
    for (const [label, lines] of layout.details) {
      text(label, rightX, 7.5, 'regular', C.muted);
      lines.forEach((detailLine, index) => text(detailLine, rightX + detailLabelWidth, 8.5, 'semibold', C.ink, y - index * 11));
      y -= (lines.length - 1) * 11 + 5;
      line(rightX, W - M, y, 0.4, C.hairline);
      y -= 9;
    }

    y = top - layout.height;
    line(M, W - M, y + 9, 0.75, C.rule);
  };

  const categoryHeader = (name: string, count: number, continued = false) => {
    box(M, y, CW, 26, C.green);
    text(continued ? `${name} (continued)` : name, M + 12, 11, 'bold', C.white, y - 17);
    textRight(`${count} ${count === 1 ? 'PRODUCT' : 'PRODUCTS'}`, W - M - 12, 7, 'monoMedium', C.greenTint, y - 16);
    y -= 26 + 18;
  };

  categories.forEach(([name, items], categoryIndex) => {
    const layouts = items.map(cardLayout);
    ensureSpace(44 + layouts[0].height);
    contentsRows[categoryIndex].page = pdf.getPageIndices().length;
    categoryHeader(name, items.length);
    items.forEach((product, index) => {
      if (ensureSpace(layouts[index].height)) categoryHeader(name, items.length, true);
      drawCard(product, layouts[index]);
    });
    y -= 14;
  });

  // --- ordering notes --------------------------------------------------------
  const source = products.find((product) => product.nutritionSource)?.nutritionSource;
  const notes = [
    'Ordering. Request a quotation or place an order by phone or email; minimum order quantities apply per product. Delivery can be arranged around Harare.',
    'Prices. In US dollars per pack as sold, with the MOQ value (the price of the minimum order quantity) where it is more than one pack, excluding delivery. Prices shown are current indicative prices and may change without notice. Final price and availability are confirmed on quotation/proforma invoice.',
    `Specifications. Typical values${source ? ` from ${source.title.split(' — ')[0]}, ${source.edition}th edition (${source.year})` : ''}, or the supplier specification where no published analysis applies. A full specification sheet for each product is available at ${siteConfig.url.replace('https://', '')}/products.`,
  ];
  const noteLines = notes.map((note) => wrap(note, 'regular', 8, CW - 28));
  const panelHeight = 41 + noteLines.reduce((total, lines) => total + lines.length * 11.5 + 5, 0);
  ensureSpace(panelHeight + 12);
  box(M, y, CW, panelHeight, C.paper);
  y -= 18;
  text('ORDERING & NOTES', M + 14, 7, 'monoMedium', C.green);
  y -= 15;
  noteLines.forEach((lines) => {
    lines.forEach((noteLine, index) => {
      if (index === 0) {
        const [lead, ...rest] = noteLine.split(/(?<=\.) /);
        text(lead, M + 14, 8, 'semibold', C.ink);
        text(rest.join(' '), M + 14 + width(`${lead} `, 'semibold', 8), 8, 'regular', C.body);
      } else {
        text(noteLine, M + 14, 8, 'regular', C.body);
      }
      y -= 11.5;
    });
    y -= 5;
  });

  // --- contents page numbers -------------------------------------------------
  page = contentsPage;
  contentsRows.forEach((row) => textRight(`p. ${row.page}`, W - M, 8.5, 'monoMedium', C.ink, row.rowY));

  // --- footer on every page --------------------------------------------------
  const pages = pdf.getPages();
  const address = `${siteConfig.address.streetAddress}, ${siteConfig.address.addressLocality}, Zimbabwe`;
  const contact = `+263 77 468 4534  ·  ${siteConfig.email}  ·  ${siteConfig.url.replace('https://', '')}`;
  pages.forEach((current, index) => {
    page = current;
    text('Typical values; actual analysis may vary between batches and suppliers. Prices are indicative and confirmed at order.', M, 6.5, 'regular', C.muted, M + 33);
    line(M, W - M, M + 24, 0.75, C.rule);
    text(`${siteConfig.name}  ·  ${address}`, M, 7, 'regular', C.muted, M + 11);
    text(contact, M, 7, 'regular', C.muted, M);
    textRight(docRef, W - M, 7, 'mono', C.muted, M + 11);
    textRight(`Page ${index + 1} of ${pages.length}`, W - M, 7, 'monoMedium', C.ink, M);
  });

  return pdf.save();
}

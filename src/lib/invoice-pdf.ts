import { readFile } from 'node:fs/promises';
import path from 'node:path';

import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib';

import { siteConfig } from '@/lib/seo';
import type { Invoice } from '@/types';

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

const statusLabel: Record<Invoice['status'], string> = {
  draft: 'Proforma',
  sent: 'Awaiting payment',
  paid: 'Paid',
  void: 'Void',
};

const statusColour: Record<Invoice['status'], RGB> = {
  draft: hex('#6b6f66'),
  sent: hex('#b7791f'),
  paid: hex('#2e7d4f'),
  void: hex('#b4412f'),
};

const ISSUER = {
  name: 'FeedSport Enterprises',
  phone: '+263 77 468 4534',
  email: 'accounts@feedsport.co.zw',
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

const money = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const quantity = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 3 });

function toDate(value: Invoice['date']) {
  if (typeof value === 'string') return new Date(value);
  return new Date(value.seconds * 1000);
}
const longDate = (value: Invoice['date']) => {
  const date = toDate(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
};

// Draft invoices go out as proforma invoices: a quotation, not a demand for payment.
export const invoiceDocumentTitle = (invoice: Pick<Invoice, 'status'>) => (invoice.status === 'draft' ? 'Proforma invoice' : 'Invoice');

export async function renderInvoicePdf(invoice: Invoice) {
  const documentTitle = invoiceDocumentTitle(invoice);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`${documentTitle} ${invoice.invoiceNumber}`);
  pdf.setAuthor(ISSUER.name);
  pdf.setSubject(`${documentTitle} ${invoice.invoiceNumber} · ${invoice.client.name}`);
  pdf.setCreator(siteConfig.url);

  const bytes = await loadFontBytes();
  const fonts = Object.fromEntries(
    await Promise.all(Object.entries(bytes).map(async ([name, data]) => [name, await pdf.embedFont(data, { subset: true })] as const)),
  ) as Record<FontName, PDFFont>;

  const issued = longDate(invoice.date);
  const due = longDate(invoice.dueDate);
  const docRef = invoice.invoiceNumber;
  const subtotal = invoice.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const tax = subtotal * invoice.taxRate;
  const total = subtotal + tax;

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
    for (const paragraph of value.split(/\r?\n/)) {
      let current = '';
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const candidate = current ? `${current} ${word}` : word;
        if (!current || width(candidate, font, size) <= maxWidth) current = candidate;
        else {
          lines.push(current);
          current = word;
        }
      }
      if (current) lines.push(current);
    }
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
    textRight(`${documentTitle} ${invoice.invoiceNumber}`, W - M, 7.5, 'mono', C.muted);
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
  textRight(documentTitle.toUpperCase(), W - M, 8, 'monoMedium', C.white, H - 38);
  textRight(`No. ${docRef}`, W - M, 7.5, 'mono', C.greenTint, H - 53);
  textRight(`Issued ${issued}`, W - M, 7.5, 'mono', C.greenTint, H - 65);
  y = H - bandHeight - 48;

  // --- title block -----------------------------------------------------------
  const status = statusLabel[invoice.status];
  const statusWidth = width(status, 'semibold', 8.5) + 26;
  page.drawRectangle({ x: W - M - statusWidth, y, width: statusWidth, height: 20, color: C.paper, borderColor: C.rule, borderWidth: 0.75 });
  page.drawCircle({ x: W - M - statusWidth + 10, y: y + 10, size: 3, color: statusColour[invoice.status] });
  text(status, W - M - statusWidth + 18, 8.5, 'semibold', C.ink, y + 7);
  text(invoice.invoiceNumber, M, 30, 'bold');
  y -= 30;

  // --- key figure tiles ------------------------------------------------------
  const tiles: [string, string][] = [
    ['Issue date', issued],
    ['Due date', due],
    [invoice.status === 'paid' ? 'Amount paid' : 'Amount due', money(total)],
  ];
  const gap = 8;
  const tileWidth = (CW - gap * (tiles.length - 1)) / tiles.length;
  const tileHeight = 58;
  tiles.forEach(([label, value], index) => {
    const x = M + index * (tileWidth + gap);
    const emphasised = index === tiles.length - 1;
    box(x, y, tileWidth, tileHeight, C.paper);
    box(x, y, 2.5, tileHeight, emphasised ? C.amber : C.green);
    text(label.toUpperCase(), x + 14, 7, 'monoMedium', C.muted, y - 17);
    text(value, x + 14, emphasised ? 20 : 14, 'bold', C.ink, y - 43);
  });
  y -= tileHeight + 26;

  // --- billed to + from ------------------------------------------------------
  const columnGap = 28;
  const half = (CW - columnGap) / 2;
  const detailRows = (items: [string, string][], x: number, w: number) => {
    for (const [label, value] of items) {
      if (!value.trim()) continue;
      text(label, x, 8.5, 'regular', C.muted);
      const valueLines = wrap(value, 'semibold', 9, w - 80);
      valueLines.forEach((valueLine, index) => text(valueLine, x + 80, 9, 'semibold', C.ink, y - index * 12));
      y -= (valueLines.length - 1) * 12 + 8;
      line(x, x + w, y, 0.5, C.hairline);
      y -= 13;
    }
  };
  const partiesTop = y;
  sectionHeading('Billed to', M, half);
  detailRows([
    ['Name', invoice.client.name],
    ['Address', [invoice.client.address, invoice.client.city].filter(Boolean).join(', ')],
    ['Phone', invoice.client.phone],
    ['Email', invoice.client.email],
  ], M, half);
  const clientBottom = y;
  y = partiesTop;
  sectionHeading('From', M + half + columnGap, half);
  detailRows([
    ['Name', ISSUER.name],
    ['Address', `${siteConfig.address.streetAddress}, ${siteConfig.address.addressLocality}`],
    ['Phone', ISSUER.phone],
    ['Email', ISSUER.email],
  ], M + half + columnGap, half);
  y = Math.min(y, clientBottom) - 18;

  // --- line items ------------------------------------------------------------
  const cols = { index: M + 10, description: M + 34, qty: M + 300, price: M + 400, amount: W - M - 12 };
  const descriptionWidth = cols.qty - 40 - cols.description;
  const tableHeader = () => {
    box(M, y, CW, 20, C.green);
    const baseline = y - 13.5;
    text('#', cols.index, 7, 'monoMedium', C.white, baseline);
    text('DESCRIPTION', cols.description, 7, 'monoMedium', C.white, baseline);
    textRight('QTY', cols.qty, 7, 'monoMedium', C.white, baseline);
    textRight('UNIT PRICE', cols.price, 7, 'monoMedium', C.white, baseline);
    textRight('AMOUNT', cols.amount, 7, 'monoMedium', C.white, baseline);
    y -= 20;
  };

  ensureSpace(90);
  text('Items', M, 15, 'bold');
  textRight(`${invoice.items.length} ${invoice.items.length === 1 ? 'line' : 'lines'} · USD`, W - M, 7.5, 'mono', C.muted);
  y -= 14;
  tableHeader();
  invoice.items.forEach((item, index) => {
    const descriptionLines = wrap(item.description || '—', 'regular', 9, descriptionWidth);
    const rowHeight = 16 + (descriptionLines.length - 1) * 12;
    if (ensureSpace(rowHeight)) tableHeader();
    if (index % 2 === 1) box(M, y, CW, rowHeight, C.zebra);
    const baseline = y - 11;
    text(String(index + 1), cols.index, 8, 'mono', C.muted, baseline);
    descriptionLines.forEach((descriptionLine, lineIndex) => text(descriptionLine, cols.description, 9, 'regular', C.body, baseline - lineIndex * 12));
    textRight(quantity(item.quantity), cols.qty, 9, 'regular', C.ink, baseline);
    textRight(money(item.price), cols.price, 9, 'regular', C.ink, baseline);
    textRight(money(item.quantity * item.price), cols.amount, 9, 'semibold', C.ink, baseline);
    line(M, W - M, y - rowHeight, 0.4, C.hairline);
    y -= rowHeight;
  });
  line(M, W - M, y, 1, C.ink);
  y -= 22;

  // --- payment details + totals ----------------------------------------------
  const bankRows: [string, string][] = [
    ['Bank', invoice.bank.name],
    ['Account name', invoice.bank.accountName],
    ['Account no.', invoice.bank.accountNumber],
    ['Branch', invoice.bank.branch],
  ];
  const hasBankDetails = bankRows.some(([, value]) => value.trim());
  ensureSpace(hasBankDetails ? 20 + 21 * bankRows.length : 80);
  const summaryTop = y;
  if (hasBankDetails) {
    sectionHeading('Payment details', M, half, `Ref. ${invoice.invoiceNumber}`);
    detailRows(bankRows, M, half);
  }
  const paymentBottom = y;

  y = summaryTop + 14;
  const totalsX = M + half + columnGap;
  const totalsRight = W - M - 12;
  const totalsRow = (label: string, value: string) => {
    y -= 13;
    text(label, totalsX + 12, 9, 'regular', C.muted);
    textRight(value, totalsRight, 9, 'semibold', C.ink);
    y -= 6;
    line(totalsX, W - M, y, 0.5, C.hairline);
  };
  totalsRow('Subtotal', money(subtotal));
  totalsRow(`Tax (${(invoice.taxRate * 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}%)`, money(tax));
  y -= 6;
  box(totalsX, y, W - M - totalsX, 28, C.green);
  text('TOTAL DUE', totalsX + 12, 7.5, 'monoMedium', C.greenTint, y - 17.5);
  textRight(money(total), totalsRight, 13, 'bold', C.white, y - 18.5);
  y -= 28;
  y = Math.min(y, paymentBottom) - 18;

  // --- terms + notes ---------------------------------------------------------
  const notes = [
    invoice.paymentTerms?.trim() ? `Payment terms. ${invoice.paymentTerms.trim()}` : '',
    invoice.notes?.trim() ? `Notes. ${invoice.notes.trim()}` : '',
  ].filter(Boolean);
  const noteLines = notes.map((note) => wrap(note, 'regular', 8, CW - 28));
  const paragraphHeight = (lines: string[]) => lines.length * 11.5 + 5;
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
    text(remaining.length + chunk.length === noteLines.length ? 'TERMS & NOTES' : 'TERMS & NOTES (CONTINUED)', M + 14, 7, 'monoMedium', C.green);
    y -= 15;
    chunk.forEach((lines) => {
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
    y -= 12;
  }

  // --- footer on every page --------------------------------------------------
  const pages = pdf.getPages();
  const address = `${siteConfig.address.streetAddress}, ${siteConfig.address.addressLocality}, Zimbabwe`;
  const contact = `${ISSUER.phone}  ·  ${ISSUER.email}  ·  ${siteConfig.url.replace('https://', '')}`;
  pages.forEach((current, index) => {
    page = current;
    text(`Thank you for your business. This is a computer-generated ${documentTitle.toLowerCase()} and does not require a signature.`, M, 6.5, 'regular', C.muted, M + 33);
    line(M, W - M, M + 24, 0.75, C.rule);
    text(`${ISSUER.name}  ·  ${address}`, M, 7, 'regular', C.muted, M + 11);
    text(contact, M, 7, 'regular', C.muted, M);
    textRight(docRef, W - M, 7, 'mono', C.muted, M + 11);
    textRight(`Page ${index + 1} of ${pages.length}`, W - M, 7, 'monoMedium', C.ink, M);
  });

  return pdf.save();
}

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import fontkit from '@pdf-lib/fontkit';
import type { Blockquote, BlockContent, List, PhrasingContent, Root, RootContent, Table } from 'mdast';
import { PDFDocument, PDFString, rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

import { articleAuthor, readingMinutes, type KnowledgeArticle } from '@/data/knowledgeArticles';
import remarkCta, { isCta } from '@/lib/remark-cta';
import { absoluteUrl, siteConfig } from '@/lib/seo';

const W = 595.28;
const H = 841.89;
const M = 50;
const CW = W - M * 2;
const BOTTOM = M + 50;

const hex = (value: string) => rgb(
  Number.parseInt(value.slice(1, 3), 16) / 255,
  Number.parseInt(value.slice(3, 5), 16) / 255,
  Number.parseInt(value.slice(5, 7), 16) / 255,
);

const C = {
  ink: hex('#191b18'),
  body: hex('#2c2e29'),
  muted: hex('#6b6f66'),
  green: hex('#1d3a2a'),
  greenTint: hex('#c9d4c8'),
  amber: hex('#d99a2b'),
  amberText: hex('#7a5414'),
  rule: hex('#d9d4c7'),
  hairline: hex('#e6e1d5'),
  paper: hex('#fbfaf6'),
  zebra: hex('#f6f3ec'),
  white: rgb(1, 1, 1),
  ctaText: hex('#dfe6dc'),
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

const formatDate = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

// A run of inline text in one style; links carry their absolute target.
type Run = { text: string; font: FontName; color: RGB; href?: string };
type Style = { font: FontName; color: RGB; href?: string };

function inlineRuns(nodes: PhrasingContent[], style: Style): Run[] {
  return nodes.flatMap((node): Run[] => {
    switch (node.type) {
      case 'text': return [{ text: node.value, ...style }];
      case 'inlineCode': return [{ text: node.value, ...style, font: 'mono' }];
      case 'inlineMath': return [{ text: latexToText(node.value), ...style }];
      case 'break': return [{ text: '\n', ...style }];
      case 'strong': return inlineRuns(node.children, { ...style, font: style.font === 'regular' ? 'semibold' : style.font });
      case 'link': return inlineRuns(node.children, { ...style, color: C.green, href: node.url.startsWith('/') ? absoluteUrl(node.url) : node.url });
      case 'emphasis':
      case 'delete': return inlineRuns(node.children, style);
      default: return 'value' in node && typeof node.value === 'string' ? [{ text: node.value, ...style }] : [];
    }
  });
}

// pdf-lib cannot typeset LaTeX, so print simple formulas as plain text: \frac{a}{b} becomes "a ÷ b".
function latexToText(tex: string): string {
  const out = tex
    .replace(/\\(?:text|mathrm|textbf|mathbf)\{([^{}]*)\}/g, '$1')
    .replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1 ÷ $2')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\cdot/g, '·')
    .replace(/\\(?:left|right)/g, '')
    .replace(/\\[,;! ]/g, ' ');
  return out === tex ? out : latexToText(out);
}

const plainText = (runs: Run[]) => runs.map((run) => run.text).join('');

export async function renderArticlePdf(article: KnowledgeArticle) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(article.title);
  pdf.setAuthor(`${articleAuthor}, ${siteConfig.name}`);
  pdf.setSubject(article.description);
  pdf.setKeywords(article.keywords);
  pdf.setCreator(siteConfig.url);

  const bytes = await loadFontBytes();
  const fonts = Object.fromEntries(
    await Promise.all(Object.entries(bytes).map(async ([name, data]) => [name, await pdf.embedFont(data, { subset: true })] as const)),
  ) as Record<FontName, PDFFont>;

  const articleUrl = absoluteUrl(`/knowledge/${article.slug}`);
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
  const linkArea = (href: string, x1: number, y1: number, x2: number, y2: number) => {
    const annotation = pdf.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [x1, y1, x2, y2],
      Border: [0, 0, 0],
      A: { Type: 'Action', S: 'URI', URI: PDFString.of(href) },
    });
    page.node.addAnnot(pdf.context.register(annotation));
  };
  const link = (href: string, x: number, baseline: number, w: number, size: number) => linkArea(href, x, baseline - size * 0.25, x + w, baseline + size * 0.9);
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

  // Breaks styled runs into lines of words, keeping each word's style.
  type Word = Run & { width: number; space: number };
  const layoutRuns = (runs: Run[], size: number, maxWidth: number) => {
    const lines: Word[][] = [[]];
    let lineWidth = 0;
    let pendingSpace = false;
    for (const run of runs) {
      for (const token of run.text.split(/(\s+)/)) {
        if (!token) continue;
        if (/^\s+$/.test(token)) {
          if (token.includes('\n')) {
            lines.push([]);
            lineWidth = 0;
            pendingSpace = false;
          } else {
            pendingSpace = true;
          }
          continue;
        }
        const current = lines[lines.length - 1];
        // A word glued to the previous one (e.g. "**bold**," punctuation) takes no space.
        const space = current.length && pendingSpace ? width(' ', run.font, size) : 0;
        const wordWidth = width(token, run.font, size);
        if (current.length && lineWidth + space + wordWidth > maxWidth) {
          lines.push([{ ...run, text: token, width: wordWidth, space: 0 }]);
          lineWidth = wordWidth;
        } else {
          current.push({ ...run, text: token, width: wordWidth, space });
          lineWidth += space + wordWidth;
        }
        pendingSpace = false;
      }
    }
    return lines.filter((words) => words.length);
  };
  const lineWidthOf = (words: Word[]) => words.reduce((total, word) => total + word.space + word.width, 0);
  const drawWords = (words: Word[], x: number, size: number, baseline = y) => {
    let cursor = x;
    let previousHref: string | undefined;
    for (const word of words) {
      // Underline the gap only between words of the same link, not the space leading into it.
      const start = word.href && word.href === previousHref ? cursor : cursor + word.space;
      cursor += word.space;
      text(word.text, cursor, size, word.font, word.color, baseline);
      if (word.href) {
        line(start, cursor + word.width, baseline - 1.6, 0.5, C.greenTint);
        link(word.href, start, baseline, cursor + word.width - start, size);
      }
      previousHref = word.href;
      cursor += word.width;
    }
  };

  const continuationHeader = () => {
    page = pdf.addPage([W, H]);
    y = H - M;
    text('FeedSport', M, 12, 'bold', C.green);
    const title = wrap(article.title, 'mono', 7.5, CW - 100)[0];
    textRight(title === article.title ? title : `${title}…`, W - M, 7.5, 'mono', C.muted);
    line(M, W - M, y - 9, 1.5, C.ink);
    box(M, y - 8.25, 36, 2.5, C.amber);
    y -= 38;
  };
  const ensureSpace = (needed: number) => {
    if (y - needed >= BOTTOM) return false;
    continuationHeader();
    return true;
  };

  // --- masthead --------------------------------------------------------------
  const bandHeight = 84;
  box(0, H, W, bandHeight, C.green);
  box(0, H - bandHeight, W, 3, C.amber);
  text('FeedSport', M, 22, 'bold', C.white, H - 44);
  text('INTERNATIONAL', M + 1, 7.5, 'monoMedium', C.greenTint, H - 59);
  textRight('KNOWLEDGE CENTRE', W - M, 8, 'monoMedium', C.white, H - 38);
  textRight(articleUrl.replace('https://', ''), W - M, 7.5, 'mono', C.greenTint, H - 53);
  y = H - bandHeight - 40;

  // --- title block -----------------------------------------------------------
  text(article.topic.toUpperCase(), M, 8, 'monoMedium', C.amberText);
  y -= 32;
  for (const titleLine of wrap(article.title, 'bold', 26, CW)) {
    text(titleLine, M, 26, 'bold');
    y -= 29;
  }
  y -= 2;
  for (const descriptionLine of wrap(article.description, 'regular', 12, CW)) {
    text(descriptionLine, M, 12, 'regular', hex('#3d403a'));
    y -= 17;
  }
  y -= 6;
  const meta = [
    `By ${articleAuthor}`,
    `Published ${formatDate(article.published)}`,
    article.updated !== article.published ? `Updated ${formatDate(article.updated)}` : '',
    `${readingMinutes(article)} min read`,
  ].filter(Boolean).join('   ·   ');
  text(meta, M, 7.5, 'mono', C.muted);
  y -= 12;
  line(M, W - M, y, 1, C.ink);
  y -= 24;

  // --- key points ------------------------------------------------------------
  if (article.keyPoints.length) {
    const pointLines = article.keyPoints.map((point) => wrap(point, 'regular', 10, CW - 44));
    const panelHeight = 40 + pointLines.reduce((total, lines) => total + lines.length * 14 + 4, 0);
    ensureSpace(panelHeight);
    page.drawRectangle({ x: M, y: y - panelHeight, width: CW, height: panelHeight, color: C.paper, borderColor: C.rule, borderWidth: 0.75 });
    y -= 20;
    text('KEY POINTS', M + 16, 7.5, 'monoMedium', C.green);
    y -= 18;
    for (const lines of pointLines) {
      text('•', M + 18, 10, 'bold', C.amber);
      lines.forEach((pointLine) => {
        text(pointLine, M + 30, 10, 'regular', C.body);
        y -= 14;
      });
      y -= 4;
    }
    y -= 26;
  }

  // --- body ------------------------------------------------------------------
  const bodySize = 10.5;
  const bodyLeading = 15.5;

  const paragraph = (runs: Run[], x: number, maxWidth: number, size = bodySize, leading = bodyLeading) => {
    for (const words of layoutRuns(runs, size, maxWidth)) {
      ensureSpace(leading);
      drawWords(words, x, size, y - size);
      y -= leading;
    }
  };

  const list = (node: List, x: number, maxWidth: number) => {
    node.children.forEach((item, index) => {
      const marker = node.ordered ? `${(node.start ?? 1) + index}.` : '•';
      const indent = node.ordered ? 18 : 13;
      ensureSpace(bodyLeading);
      text(marker, x, bodySize, node.ordered ? 'semibold' : 'bold', node.ordered ? C.green : C.amber, y - bodySize);
      item.children.forEach((child, childIndex) => {
        if (childIndex > 0) y -= 3;
        block(child, x + indent, maxWidth - indent, true);
      });
      y -= 4;
    });
  };

  const table = (node: Table) => {
    const size = 8.5;
    const leading = 11.5;
    const pad = 7;
    const rows = node.children.map((row) => row.children.map((cell) => inlineRuns(cell.children, { font: 'regular', color: C.body })));
    const columnCount = Math.max(...rows.map((row) => row.length));
    const headerRuns = (rows[0] ?? []).map((cell) => cell.map((run) => ({ ...run, font: 'semibold' as FontName, color: C.white })));

    // Columns get their longest word at minimum; spare width goes to the columns with the most text.
    const natural = Array.from({ length: columnCount }, (_, column) => Math.max(...rows.map((row, index) => {
      const runs = index === 0 ? headerRuns[column] ?? [] : row[column] ?? [];
      return runs.reduce((total, run) => total + width(run.text, run.font, size), 0);
    })) + pad * 2);
    const minimum = Array.from({ length: columnCount }, (_, column) => Math.max(...rows.map((row, index) => {
      const runs = index === 0 ? headerRuns[column] ?? [] : row[column] ?? [];
      return Math.max(0, ...runs.flatMap((run) => run.text.split(/\s+/).map((word) => width(word, run.font, size))));
    })) + pad * 2);
    const naturalTotal = natural.reduce((a, b) => a + b, 0);
    let widths: number[];
    if (naturalTotal <= CW) {
      widths = natural.map((value) => value + (CW - naturalTotal) * (value / naturalTotal));
    } else {
      const minimumTotal = minimum.reduce((a, b) => a + b, 0);
      const flexible = natural.map((value, column) => value - minimum[column]);
      const flexibleTotal = flexible.reduce((a, b) => a + b, 0) || 1;
      widths = minimum.map((value, column) => value + Math.max(0, CW - minimumTotal) * (flexible[column] / flexibleTotal));
      const scale = Math.min(1, CW / widths.reduce((a, b) => a + b, 0));
      widths = widths.map((value) => value * scale);
    }
    const lefts = widths.map((_, column) => M + widths.slice(0, column).reduce((a, b) => a + b, 0));

    const drawRow = (cells: Run[][], fill: RGB | null, rowIndex: number) => {
      const laidOut = widths.map((columnWidth, column) => layoutRuns(cells[column] ?? [], size, columnWidth - pad * 2));
      const rowHeight = Math.max(1, ...laidOut.map((lines) => lines.length)) * leading + pad + 2;
      if (fill) box(M, y, CW, rowHeight, fill);
      laidOut.forEach((lines, column) => {
        const align = node.align?.[column];
        lines.forEach((words, lineIndex) => {
          const lineWidth = lineWidthOf(words);
          const x = align === 'right' ? lefts[column] + widths[column] - pad - lineWidth
            : align === 'center' ? lefts[column] + (widths[column] - lineWidth) / 2
              : lefts[column] + pad;
          drawWords(words, x, size, y - pad / 2 - 9 - lineIndex * leading);
        });
      });
      if (rowIndex > 0) line(M, W - M, y - rowHeight, 0.4, C.hairline);
      return rowHeight;
    };
    const measureRow = (cells: Run[][]) => Math.max(1, ...widths.map((columnWidth, column) => layoutRuns(cells[column] ?? [], size, columnWidth - pad * 2).length)) * leading + pad + 2;
    const header = () => { y -= drawRow(headerRuns, C.green, 0); };

    ensureSpace(measureRow(headerRuns) + (rows[1] ? measureRow(rows[1]) : 0));
    header();
    rows.slice(1).forEach((row, index) => {
      if (ensureSpace(measureRow(row))) header();
      y -= drawRow(row, index % 2 === 1 ? C.zebra : null, index + 1);
    });
    line(M, W - M, y, 1, C.ink);
  };

  // A call-to-action box: bold heading, short text, and links drawn as buttons. Kept on one page.
  const ctaBox = (node: Blockquote, x: number, maxWidth: number) => {
    const pad = 18;
    const left = x + pad + 4;
    const inner = maxWidth - pad * 2 - 4;
    const buttonSize = 10;
    const buttonHeight = 26;
    const buttonGap = 8;
    type Part = { kind: 'text'; lines: Word[][]; size: number; leading: number } | { kind: 'buttons'; links: { label: string; href: string; width: number }[] };
    const parts: Part[] = [];
    node.children.forEach((child, index) => {
      if (child.type !== 'paragraph') return;
      const links = child.children.filter((item) => item.type === 'link');
      if (links.length && child.children.every((item) => item.type === 'link' || (item.type === 'text' && !item.value.trim()))) {
        const buttons = links.map((item) => {
          const label = plainText(inlineRuns(item.children, { font: 'semibold', color: C.green })).trim();
          return { label, href: item.url.startsWith('/') ? absoluteUrl(item.url) : item.url, width: width(label, 'semibold', buttonSize) + 28 };
        });
        const previous = parts[parts.length - 1];
        if (previous?.kind === 'buttons') previous.links.push(...buttons);
        else parts.push({ kind: 'buttons', links: buttons });
        return;
      }
      const heading = index === 0 && child.children.length === 1 && child.children[0].type === 'strong';
      const size = heading ? 14 : 10.5;
      const color = heading ? C.white : C.ctaText;
      const runs = inlineRuns(child.children, { font: heading ? 'bold' : 'regular', color }).map((run) => ({ ...run, color, font: heading ? 'bold' as FontName : run.font }));
      parts.push({ kind: 'text', lines: layoutRuns(runs, size, inner), size, leading: size * 1.4 });
    });

    // Buttons flow left to right and wrap onto further rows.
    const buttonRows = (links: { width: number }[]) => {
      let rows = 1;
      let used = 0;
      for (const item of links) {
        if (used && used + buttonGap + item.width > inner) {
          rows += 1;
          used = 0;
        }
        used += (used ? buttonGap : 0) + item.width;
      }
      return rows;
    };
    const partHeight = (part: Part) => part.kind === 'text' ? part.lines.length * part.leading : buttonRows(part.links) * (buttonHeight + buttonGap) - buttonGap + 4;
    const height = pad * 2 + parts.reduce((total, part, index) => total + partHeight(part) + (index ? 8 : 0), 0);

    y -= 8;
    ensureSpace(height);
    const top = y;
    box(x, top, maxWidth, height, C.green);
    box(x, top, 5, height, C.amber);
    let cursor = top - pad;
    parts.forEach((part, index) => {
      if (index) cursor -= 8;
      if (part.kind === 'text') {
        for (const words of part.lines) {
          drawWords(words, left, part.size, cursor - part.size);
          cursor -= part.leading;
        }
        return;
      }
      cursor -= 4;
      let bx = left;
      for (const item of part.links) {
        if (bx > left && bx + item.width > left + inner) {
          bx = left;
          cursor -= buttonHeight + buttonGap;
        }
        box(bx, cursor, item.width, buttonHeight, C.paper);
        text(item.label, bx + 14, buttonSize, 'semibold', C.green, cursor - buttonHeight / 2 - buttonSize * 0.35);
        linkArea(item.href, bx, cursor - buttonHeight, bx + item.width, cursor);
        bx += item.width + buttonGap;
      }
      cursor -= buttonHeight;
    });
    y = top - height - 18;
  };

  const block = (node: RootContent | BlockContent, x: number, maxWidth: number, tight = false) => {
    switch (node.type) {
      case 'heading': {
        const runs = inlineRuns(node.children, { font: 'bold', color: C.ink });
        const size = node.depth <= 2 ? 16 : 12.5;
        const leading = size * 1.25;
        const lines = layoutRuns(runs, size, maxWidth);
        // Keep the heading with at least the first few lines that follow it.
        ensureSpace(14 + lines.length * leading + bodyLeading * 3);
        y -= node.depth <= 2 ? 14 : 8;
        for (const words of lines) {
          drawWords(words, x, size, y - size);
          y -= leading;
        }
        y -= 4;
        return;
      }
      case 'paragraph':
        paragraph(inlineRuns(node.children, { font: 'regular', color: C.body }), x, maxWidth);
        if (!tight) y -= 7;
        return;
      case 'list':
        if (tight) y -= 3;
        list(node, x, maxWidth);
        if (!tight) y -= 5;
        return;
      case 'table':
        y -= 4;
        table(node);
        y -= 16;
        return;
      case 'blockquote': {
        if (isCta(node)) {
          ctaBox(node, x, maxWidth);
          return;
        }
        const runs = node.children.flatMap((child, index) => [
          ...(index ? [{ text: '\n', font: 'regular' as FontName, color: C.body }] : []),
          ...(child.type === 'paragraph' ? inlineRuns(child.children, { font: 'regular', color: C.body }) : []),
        ]);
        const lines = layoutRuns(runs, 9.5, maxWidth - 30);
        const quoteHeight = lines.length * 14 + 16;
        ensureSpace(Math.min(quoteHeight, 80));
        let remaining = lines;
        while (remaining.length) {
          const fitting = Math.max(1, Math.min(remaining.length, Math.floor((y - BOTTOM - 16) / 14)));
          const chunk = remaining.slice(0, fitting);
          remaining = remaining.slice(fitting);
          const chunkHeight = chunk.length * 14 + 16;
          box(x, y, maxWidth, chunkHeight, C.paper);
          box(x, y, 3, chunkHeight, C.amber);
          y -= 8;
          for (const words of chunk) {
            drawWords(words, x + 16, 9.5, y - 10);
            y -= 14;
          }
          y -= 8;
          if (remaining.length) continuationHeader();
        }
        y -= 10;
        return;
      }
      case 'math':
        y -= 2;
        paragraph([{ text: latexToText(node.value).replace(/\s+/g, ' ').trim(), font: 'semibold', color: C.ink }], x + 16, maxWidth - 16);
        y -= 9;
        return;
      case 'thematicBreak':
        ensureSpace(20);
        line(x, x + maxWidth, y - 8, 0.75, C.rule);
        y -= 20;
        return;
      case 'code':
        for (const codeLine of node.value.split('\n')) {
          ensureSpace(12);
          text(codeLine, x, 8.5, 'mono', C.body, y - 9);
          y -= 12;
        }
        y -= 8;
        return;
      default:
        return;
    }
  };

  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMath).use(remarkCta);
  const tree = processor.runSync(processor.parse(article.body)) as Root;
  for (const node of tree.children) block(node, M, CW);

  // --- closing note ----------------------------------------------------------
  y -= 6;
  const disclaimer = wrap('Figures in this guide are typical values and general ranges. Confirm targets for your animals, genetics and ingredients, and check batch specifications before formulating.', 'regular', 8.5, CW - 32);
  const help = wrap(`Need a diet checked? Send your ingredients and targets to the FeedSport nutrition team on WhatsApp +263 77 468 4534 or ${siteConfig.email}.`, 'semibold', 9, CW - 32);
  const panelHeight = 30 + disclaimer.length * 12 + help.length * 13 + 8;
  ensureSpace(panelHeight);
  page.drawRectangle({ x: M, y: y - panelHeight, width: CW, height: panelHeight, color: C.paper, borderColor: C.rule, borderWidth: 0.75 });
  y -= 22;
  help.forEach((helpLine) => {
    text(helpLine, M + 16, 9, 'semibold', C.green);
    y -= 13;
  });
  y -= 8;
  disclaimer.forEach((disclaimerLine) => {
    text(disclaimerLine, M + 16, 8.5, 'regular', C.muted);
    y -= 12;
  });

  // --- footer on every page --------------------------------------------------
  const pages = pdf.getPages();
  const contact = `${siteConfig.name}  ·  +263 77 468 4534  ·  ${siteConfig.email}`;
  pages.forEach((current, index) => {
    page = current;
    const source = articleUrl.replace('https://', '');
    line(M, W - M, M + 26, 0.75, C.rule);
    text(source, M, 7, 'mono', C.muted, M + 13);
    link(articleUrl, M, M + 13, width(source, 'mono', 7), 7);
    text(contact, M, 7, 'regular', C.muted, M);
    textRight(`Page ${index + 1} of ${pages.length}`, W - M, 7, 'monoMedium', C.ink, M);
  });

  return pdf.save();
}

import type { Cell, Row, Workbook, Worksheet } from "exceljs";

/**
 * How a PigFlow spreadsheet looks, in one place.
 *
 * These began as private helpers of the funding workbook. The report centre
 * writes four more workbooks from the same plan, and a lender who is sent all
 * five should not be able to tell which one was written first — so the palette,
 * the title block, the number formats and the way a total rules itself off are
 * shared rather than copied. Nothing here knows anything about pigs.
 */

export const COLORS = {
  navy: "17324D",
  blue: "2A78D6",
  paleBlue: "EAF2FB",
  paleGold: "FFF4D6",
  green: "18794E",
  paleGreen: "EAF6EF",
  red: "B42318",
  paleRed: "FDECEC",
  ink: "17212B",
  muted: "667085",
  line: "D9DEE5",
  plane: "F6F7F9",
  white: "FFFFFF",
} as const;

export const FONT = "Aptos";
export const MONEY_FORMAT = '$#,##0;[Red]($#,##0);-';
export const MONEY_FORMAT_DECIMAL = '$#,##0.00;[Red]($#,##0.00);-';
export const NUMBER_FORMAT = '#,##0;[Red](#,##0);-';
/** For a figure that is a measurement rather than a count: 3.25 m is not 3 m. */
export const DECIMAL_FORMAT = '#,##0.00;[Red](#,##0.00);-';

/** Page setup a plan's tables are printed with: wide, and as many pages tall. */
export const LANDSCAPE_PAGE = {
  paperSize: 9,
  orientation: "landscape",
  fitToPage: true,
  fitToWidth: 1,
  fitToHeight: 0,
  margins: { left: 0.25, right: 0.25, top: 0.45, bottom: 0.45, header: 0.2, footer: 0.2 },
} as const;

export const PORTRAIT_PAGE = {
  paperSize: 9,
  orientation: "portrait",
  fitToPage: true,
  fitToWidth: 1,
  fitToHeight: 0,
  margins: { left: 0.35, right: 0.35, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
} as const;

export function forCells(
  sheet: Worksheet,
  fromRow: number,
  toRow: number,
  fromColumn: number,
  toColumn: number,
  visit: (cell: Cell) => void,
) {
  for (let row = fromRow; row <= toRow; row += 1) {
    for (let column = fromColumn; column <= toColumn; column += 1) {
      visit(sheet.getCell(row, column));
    }
  }
}

export function solidFill(argb: string) {
  return { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb } };
}

export function applyBase(sheet: Worksheet) {
  sheet.views = [{ showGridLines: false }];
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.font = {
        name: FONT,
        size: 10,
        color: { argb: COLORS.ink },
        ...cell.font,
      };
      cell.alignment = { vertical: "middle", ...cell.alignment };
    });
  });
}

export function styleTitle(
  sheet: Worksheet,
  title: string,
  subtitle: string,
  lastColumn: string,
) {
  sheet.mergeCells(`A2:${lastColumn}2`);
  sheet.getCell("A2").value = title;
  sheet.getCell("A2").font = { name: FONT, size: 16, bold: true, color: { argb: COLORS.navy } };
  sheet.getRow(2).height = 24;
  sheet.mergeCells(`A3:${lastColumn}3`);
  sheet.getCell("A3").value = subtitle;
  sheet.getCell("A3").font = { name: FONT, size: 10, italic: true, color: { argb: COLORS.muted } };
  sheet.getRow(3).height = 18;
  forCells(sheet, 4, 4, 1, sheet.getColumn(lastColumn).number, (cell) => {
    cell.fill = solidFill(COLORS.navy);
  });
  sheet.getRow(4).height = 3;
}

export function styleTableHeader(row: Row, fromColumn = 1, toColumn = row.cellCount) {
  for (let column = fromColumn; column <= toColumn; column += 1) {
    const cell = row.getCell(column);
    cell.fill = solidFill(COLORS.navy);
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: COLORS.white } };
    cell.alignment = { vertical: "middle", horizontal: column === fromColumn ? "left" : "center" };
    cell.border = { right: { style: "thin", color: { argb: COLORS.white } } };
  }
  row.height = 22;
}

export function styleSection(row: Row, lastColumn: number) {
  for (let column = 1; column <= lastColumn; column += 1) {
    const cell = row.getCell(column);
    cell.fill = solidFill(COLORS.paleBlue);
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: COLORS.navy } };
    cell.border = {
      top: { style: "thin", color: { argb: COLORS.line } },
      bottom: { style: "thin", color: { argb: COLORS.line } },
    };
  }
  row.height = 20;
}

export function styleTotal(row: Row, lastColumn: number, strong = false) {
  for (let column = 1; column <= lastColumn; column += 1) {
    const cell = row.getCell(column);
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: COLORS.ink } };
    cell.border = strong
      ? { top: { style: "double", color: { argb: COLORS.navy } } }
      : { top: { style: "thin", color: { argb: COLORS.line } } };
  }
}

/** A hairline under a row, which is how every body row of a table is separated. */
export function ruleRow(sheet: Worksheet, row: number, lastColumn: number) {
  forCells(sheet, row, row, 1, lastColumn, (cell) => {
    cell.border = { bottom: { style: "thin", color: { argb: COLORS.line } } };
  });
}

export function setResultFormula(cell: Cell, formula: string, result: number) {
  cell.value = { formula, result };
}

export function columnLetter(column: number) {
  let value = column;
  let result = "";
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
}

/**
 * The Date an "mmm-yy" month cell is built from. ExcelJS converts a Date to an
 * Excel serial as `25569 + getTime() / 86_400_000` — pure UTC, with no local
 * offset correction — so a local midnight in a positive-offset zone serialises
 * to 22:00 on the previous day and the cell renders a month early. Anchoring the
 * month at UTC midnight makes the serial exact everywhere.
 */
export function monthCellDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`);
}

/** An empty workbook with the document properties a sent file ought to carry. */
export async function newWorkbook(properties: {
  title: string;
  subject: string;
  description: string;
  company: string;
  created: Date;
}): Promise<Workbook> {
  const excelModule = await import("exceljs");
  const Workbook = excelModule.Workbook ?? excelModule.default.Workbook;
  const workbook = new Workbook();
  workbook.creator = "PigFlow";
  workbook.title = properties.title;
  workbook.subject = properties.subject;
  workbook.description = properties.description;
  workbook.company = properties.company;
  workbook.created = properties.created;
  workbook.modified = properties.created;
  workbook.calcProperties.fullCalcOnLoad = true;
  return workbook;
}

/** The workbook as the bytes a download is made of. */
export async function workbookBytes(workbook: Workbook): Promise<ArrayBuffer> {
  const output = await workbook.xlsx.writeBuffer();
  if (output instanceof ArrayBuffer) return output;
  const bytes = new Uint8Array(output);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

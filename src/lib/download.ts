/**
 * Handing a file to the browser.
 *
 * There is no API for "save this"; there is an anchor with a `download`
 * attribute and an object URL, and the URL has to be let go of afterwards or
 * the bytes stay in memory for as long as the tab is open. Every export in the
 * product does the same four lines, so it does them here — a workbook that
 * leaked its buffer would leak a few megabytes a press.
 */

export const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function downloadFile(
  content: BlobPart,
  filename: string,
  type: string,
): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  // Let the click be dispatched before the URL stops meaning anything.
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Tiny client-side CSV helpers for the attendance export (differentiator #5, S14).
 * No external dependency — RFC-4180-ish quoting is enough for the MVP.
 */

/** A CSV column: a header label and a value extractor for each row. */
export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

/** Escapes a single CSV cell, quoting when it contains a comma, quote, or newline. */
function escapeCell(raw: string | number | null | undefined): string {
  const s = raw === null || raw === undefined ? '' : String(raw);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Serialises an array of rows to a CSV string using the given columns.
 * @param rows The data rows.
 * @param columns Column definitions (header + value extractor).
 */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCell(c.header)).join(',');
  const body = rows
    .map((row) => columns.map((c) => escapeCell(c.value(row))).join(','))
    .join('\r\n');
  return body ? `${header}\r\n${body}` : header;
}

/**
 * Triggers a browser download of `csv` as a file. No-op outside the browser.
 * @param csv The CSV text.
 * @param filename The download filename (e.g. `attendance.csv`).
 */
export function downloadCsv(csv: string, filename: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

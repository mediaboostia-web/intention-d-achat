// CSV that Excel opens as is (spec §5.4): UTF-8 with a BOM, ";" between
// cells (French Excel), CRLF line ends, RFC 4180 quotes. Text that Excel
// would run as a formula (a first name like "=HYPERLINK(…)", a "+221…"
// number) gets a leading apostrophe.
import 'server-only';

const BOM = '﻿';
const FORMULA_START = /^[=+\-@\t\r]/;
const NEEDS_QUOTES = /[;"\r\n]/;

function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (typeof value === 'string' && FORMULA_START.test(text)) text = `'${text}`;
  return NEEDS_QUOTES.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toExcelCsv(
  columns: ReadonlyArray<{ key: string; header: string }>,
  rows: ReadonlyArray<Record<string, string | number | null>>,
): string {
  const lines = [
    columns.map((c) => cell(c.header)).join(';'),
    ...rows.map((r) => columns.map((c) => cell(r[c.key])).join(';')),
  ];
  return `${BOM}${lines.join('\r\n')}\r\n`;
}

import { describe, it, expect } from 'vitest';
import { toExcelCsv } from './csv';

const columns = [
  { key: 'name', header: 'Prénom' },
  { key: 'qty', header: 'Quantité' },
];

describe('toExcelCsv', () => {
  it('starts with a BOM, separates with ; and ends lines with CRLF', () => {
    const csv = toExcelCsv(columns, [
      { name: 'Awa', qty: 3 },
      { name: null, qty: null },
    ]);
    expect(csv).toBe('﻿Prénom;Quantité\r\nAwa;3\r\n;\r\n');
  });

  it('quotes cells holding ; " or a line break', () => {
    const csv = toExcelCsv(columns, [{ name: 'Awa; "la reine"\nde Médina', qty: 1 }]);
    expect(csv).toContain('"Awa; ""la reine""\nde Médina";1');
  });

  it('neutralises formula cells', () => {
    const csv = toExcelCsv(
      [{ key: 'v', header: 'V' }],
      [
        { v: '=HYPERLINK("http://x","clic")' },
        { v: '+221 77 123 45 12' },
        { v: '-2' },
        { v: '@SUM(A1)' },
        { v: -2 },
      ],
    );
    const lines = csv.split('\r\n');
    expect(lines[1]).toBe('"\'=HYPERLINK(""http://x"",""clic"")"');
    expect(lines[2]).toBe("'+221 77 123 45 12");
    expect(lines[3]).toBe("'-2");
    expect(lines[4]).toBe("'@SUM(A1)");
    expect(lines[5]).toBe('-2');
  });
});

import { describe, expect, it } from 'vitest';
import { currencyLabel, formatMoney } from './currency';

describe('formatMoney (lot 7b)', () => {
  it('writes the local name of each currency, never its ISO code', () => {
    expect(formatMoney(7500, 'XOF')).toBe('7 500 FCFA');
    expect(formatMoney(7500, 'XAF')).toBe('7 500 FCFA');
    expect(formatMoney(65000, 'GNF')).toBe('65 000 FG');
    expect(formatMoney(18000, 'CDF')).toBe('18 000 FC');
  });

  it('reads an unknown stored currency as FCFA', () => {
    expect(currencyLabel('EUR')).toBe('FCFA');
    expect(formatMoney(1200, 'EUR')).toBe('1 200 FCFA');
  });
});

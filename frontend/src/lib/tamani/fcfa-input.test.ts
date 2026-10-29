import { describe, it, expect } from 'vitest';
import { parseAmount, parseCount } from './fcfa-input';

describe('parseAmount', () => {
  it('parseAmount reads the ways a price is typed', () => {
    const typed = [
      '7 500',
      '7' + String.fromCharCode(0xa0) + '500', // no-break space
      '7' + String.fromCharCode(0x202f) + '500', // narrow no-break space (Intl)
      '7.500',
      '7500 F',
      '7 500 FCFA',
      '7500',
      ' 7500 cfa ',
    ];
    for (const raw of typed) expect(parseAmount(raw), raw).toBe(7500);
    expect(parseAmount('1.250.000')).toBe(1_250_000);
  });

  it('refuses decimals, zero, negatives, words and huge amounts', () => {
    for (const raw of ['7,5', '7500.50', '7.5', '0', '-5', 'abc', '', '100000001']) {
      expect(parseAmount(raw), raw).toBeNull();
    }
  });
});

describe('parseCount', () => {
  it('reads a whole number at or above the minimum', () => {
    expect(parseCount('12')).toBe(12);
    expect(parseCount('0')).toBe(0);
    expect(parseCount('0', 1)).toBeNull();
    expect(parseCount('1,5')).toBeNull();
    expect(parseCount('')).toBeNull();
  });
});

describe('parseAmount, every currency (lot 7b)', () => {
  it('drops the local name typed after a price', () => {
    expect(parseAmount('65 000 FG')).toBe(65000);
    expect(parseAmount('65000 GNF')).toBe(65000);
    expect(parseAmount('18.000 FC')).toBe(18000);
    expect(parseAmount('18000 CDF')).toBe(18000);
    expect(parseAmount('7 500 FCFA')).toBe(7500);
    expect(parseAmount('7500 F')).toBe(7500);
  });
});

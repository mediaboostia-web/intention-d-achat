import { describe, it, expect } from 'vitest';
import { parseCount, parseFcfa } from './fcfa-input';

describe('parseFcfa', () => {
  it('parseFcfa reads the ways a price is typed', () => {
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
    for (const raw of typed) expect(parseFcfa(raw), raw).toBe(7500);
    expect(parseFcfa('1.250.000')).toBe(1_250_000);
  });

  it('refuses decimals, zero, negatives, words and huge amounts', () => {
    for (const raw of ['7,5', '7500.50', '7.5', '0', '-5', 'abc', '', '100000001']) {
      expect(parseFcfa(raw), raw).toBeNull();
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

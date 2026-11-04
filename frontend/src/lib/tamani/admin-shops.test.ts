import { describe, expect, it } from 'vitest';
import { parseGrantAmount } from './admin-shops';

// Recette 2026-11-04: « 0 » for a gift was refused, because the form read
// it with parseAmount, which is for product prices (never below 1).
describe('parseGrantAmount', () => {
  it('reads 0 as a gift', () => {
    expect(parseGrantAmount('0')).toBe(0);
    expect(parseGrantAmount(' 0 ')).toBe(0);
    expect(parseGrantAmount('0 FCFA')).toBe(0);
  });

  it('reads an amount received like a price', () => {
    expect(parseGrantAmount('3900')).toBe(3900);
    expect(parseGrantAmount('24 900 FCFA')).toBe(24900);
  });

  it('refuses an empty or unreadable amount', () => {
    expect(parseGrantAmount('')).toBeNull();
    expect(parseGrantAmount('abc')).toBeNull();
    expect(parseGrantAmount('-5')).toBeNull();
  });
});

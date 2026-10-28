import { describe, it, expect } from 'vitest';
import { COMMON_UNITS, unitChoices } from './units';

describe('unitChoices', () => {
  it("puts the shop's own units after the common ones without duplicates", () => {
    expect(COMMON_UNITS).toEqual([
      'pièce',
      'carton',
      'sac',
      'bouteille',
      'flacon',
      'paquet',
      'douzaine',
      'demi-douzaine',
      'kg',
      'litre',
    ]);
    expect(unitChoices(['Carton', 'bidon de 20 L', 'bidon de 20 L ', ' '])).toEqual([
      ...COMMON_UNITS,
      'bidon de 20 L',
    ]);
    expect(unitChoices([])).toEqual([...COMMON_UNITS]);
  });
});

import { describe, it, expect } from 'vitest';
import { COMMON_UNITS, CUSTOM_UNIT, unitChoices, unitSelectValue } from './units';

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
      // Porteur, 2026-11-04: « litre, pot, verre, boîtes, paire, douzaines ».
      'pot',
      'verre',
      'boîte',
      'paire',
      'bidon',
      'sachet',
      'mètre',
    ]);
    expect(unitChoices(['Carton', 'bidon de 20 L', 'bidon de 20 L ', ' '])).toEqual([
      ...COMMON_UNITS,
      'bidon de 20 L',
    ]);
    expect(unitChoices([])).toEqual([...COMMON_UNITS]);
  });
});

describe('unitSelectValue', () => {
  it('picks the listed unit, case aside, else the custom choice', () => {
    const choices = unitChoices(['bidon de 20 L']);
    expect(unitSelectValue('Carton', choices)).toBe('carton');
    expect(unitSelectValue(' bidon de 20 L ', choices)).toBe('bidon de 20 L');
    expect(unitSelectValue('bassine', choices)).toBe(CUSTOM_UNIT);
    expect(unitSelectValue('', choices)).toBe(CUSTOM_UNIT);
  });
});

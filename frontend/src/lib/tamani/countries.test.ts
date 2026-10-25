import { describe, it, expect } from 'vitest';
import { SHOP_COUNTRIES, dialCodeFor, nationalNumber } from './countries';

describe('shop countries', () => {
  it('lists Senegal first with its dial code', () => {
    expect(SHOP_COUNTRIES[0]).toEqual({ code: 'SN', label: 'Sénégal', dialCode: '+221' });
    expect(SHOP_COUNTRIES.map((c) => c.code)).toEqual([
      'SN',
      'CI',
      'ML',
      'BF',
      'TG',
      'BJ',
      'NE',
      'GN',
      'CM',
    ]);
  });

  it('gives the dial code of a country, Senegal by default', () => {
    expect(dialCodeFor('ML')).toBe('+223');
    expect(dialCodeFor('XX')).toBe('+221');
  });
});

describe('nationalNumber', () => {
  it('drops the dial code the phone field already shows', () => {
    expect(nationalNumber('+221771234567', 'SN')).toBe('771234567');
    expect(nationalNumber('+2250707070707', 'CI')).toBe('0707070707');
    expect(nationalNumber('+33612345678', 'SN')).toBe('+33612345678');
  });
});

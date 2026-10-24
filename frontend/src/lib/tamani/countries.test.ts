import { describe, it, expect } from 'vitest';
import { SHOP_COUNTRIES, dialCodeFor } from './countries';

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

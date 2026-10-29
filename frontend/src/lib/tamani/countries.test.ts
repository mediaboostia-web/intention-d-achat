import { describe, it, expect } from 'vitest';
import { SHOP_COUNTRIES, currencyForCountry, dialCodeFor, nationalNumber } from './countries';

describe('shop countries', () => {
  it('lists Senegal first with its dial code', () => {
    expect(SHOP_COUNTRIES[0]).toEqual({
      code: 'SN',
      label: 'Sénégal',
      dialCode: '+221',
      currency: 'XOF',
    });
    // Lot 7b: the CFA zone (UEMOA, then CEMAC), Guinea and DR Congo.
    expect(SHOP_COUNTRIES.map((c) => c.code)).toEqual([
      'SN',
      'CI',
      'ML',
      'BF',
      'TG',
      'BJ',
      'NE',
      'GW',
      'CM',
      'GA',
      'CG',
      'TD',
      'CF',
      'GQ',
      'GN',
      'CD',
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

describe('currencyForCountry (lot 7b)', () => {
  it("gives each country its currency, Senegal's by default", () => {
    for (const c of ['SN', 'CI', 'ML', 'BF', 'TG', 'BJ', 'NE', 'GW']) {
      expect(currencyForCountry(c), c).toBe('XOF');
    }
    for (const c of ['CM', 'GA', 'CG', 'TD', 'CF', 'GQ'])
      expect(currencyForCountry(c), c).toBe('XAF');
    expect(currencyForCountry('GN')).toBe('GNF');
    expect(currencyForCountry('CD')).toBe('CDF');
    expect(currencyForCountry('XX')).toBe('XOF');
  });

  it('knows the dial code of every new country', () => {
    expect(
      Object.fromEntries(
        ['GW', 'GA', 'CG', 'TD', 'CF', 'GQ', 'CD'].map((c) => [c, dialCodeFor(c)]),
      ),
    ).toEqual({
      GW: '+245',
      GA: '+241',
      CG: '+242',
      TD: '+235',
      CF: '+236',
      GQ: '+240',
      CD: '+243',
    });
  });
});

import { describe, it, expect } from 'vitest';
import { getCountries, getCountryCallingCode } from 'libphonenumber-js/min';
import { SHOP_COUNTRIES } from './countries';
import {
  PHONE_COUNTRIES,
  countryName,
  dialPrefixFor,
  isPhoneCountry,
  phoneCountryChoices,
} from './phone-countries';

describe('phone countries', () => {
  it('PHONE_COUNTRIES is the list libphonenumber knows, written out', () => {
    const expected = getCountries()
      .slice()
      .sort()
      .map((c) => [c, getCountryCallingCode(c)]);
    expect(PHONE_COUNTRIES).toEqual(expected);
  });

  it('knows a country by its two letters and gives its dial prefix', () => {
    expect(isPhoneCountry('BJ')).toBe(true);
    expect(isPhoneCountry('FR')).toBe(true);
    expect(isPhoneCountry('ZZ')).toBe(false);
    expect(isPhoneCountry('bj')).toBe(false);
    expect(dialPrefixFor('BJ')).toBe('+229');
    expect(dialPrefixFor('ZZ')).toBeNull();
  });

  it('names a country in French, the Tamani way for its own countries', () => {
    expect(countryName('FR')).toBe('France');
    expect(countryName('CI')).toBe("Côte d'Ivoire");
    expect(countryName('BJ')).toBe('Bénin');
  });

  it('puts the shop country first, then the Tamani countries, then the rest by name', () => {
    const choices = phoneCountryChoices('BJ');
    expect(choices[0]).toEqual({ code: 'BJ', label: 'Bénin', dialCode: '+229' });
    expect(choices.slice(1, SHOP_COUNTRIES.length).map((c) => c.code)).toEqual(
      SHOP_COUNTRIES.map((c) => c.code).filter((c) => c !== 'BJ'),
    );
    expect(choices).toHaveLength(PHONE_COUNTRIES.length);
    expect(new Set(choices.map((c) => c.code)).size).toBe(choices.length);
    const rest = choices.slice(SHOP_COUNTRIES.length).map((c) => c.label);
    expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b, 'fr')));
    expect(choices.find((c) => c.code === 'FR')).toEqual({
      code: 'FR',
      label: 'France',
      dialCode: '+33',
    });
  });
});

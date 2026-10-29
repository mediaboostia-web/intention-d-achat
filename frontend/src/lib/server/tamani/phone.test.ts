import { describe, it, expect } from 'vitest';
import { SHOP_COUNTRIES } from '@/lib/tamani/countries';
import { displayPhone, maskPhone, normalizePhone, shopCountry } from './phone';

describe('normalizePhone', () => {
  it('normalizePhone returns the same E.164 for local, +, and 00 forms', () => {
    for (const raw of ['77 123 45 67', '+221771234567', '00221771234567', '+221 77-123-45-67']) {
      expect(normalizePhone(raw, 'SN'), raw).toBe('+221771234567');
    }
  });

  it('rejects what is not a phone number', () => {
    for (const raw of ['', 'abc', '7712', '+2217712345678901']) {
      expect(normalizePhone(raw, 'SN'), raw).toBeNull();
    }
  });

  it('keeps a foreign number in its own country', () => {
    expect(normalizePhone('+33 6 12 34 56 78', 'SN')).toBe('+33612345678');
  });

  it('uses the shop country for local numbers', () => {
    expect(normalizePhone('76 12 34 56', 'ML')).toBe('+22376123456');
  });
});

describe('maskPhone', () => {
  it('shows the first two and the last two national digits', () => {
    expect(maskPhone('+221771234512')).toBe('77 •• •• 12');
  });
});

describe('shopCountry', () => {
  it('falls back to Senegal for an unknown country', () => {
    expect(shopCountry('SN')).toBe('SN');
    expect(shopCountry('ML')).toBe('ML');
    expect(shopCountry('XX')).toBe('SN');
  });
});

describe('displayPhone', () => {
  it('groups a number for reading', () => {
    expect(displayPhone('+221771112233')).toBe('+221 77 111 22 33');
    expect(displayPhone('nope')).toBe('nope');
  });
});

describe('normalizePhone, lot 7b countries', () => {
  it('turns an old 8-digit Benin number into the 10-digit one', () => {
    for (const [raw, country] of [
      ['97 12 34 56', 'BJ'],
      ['+229 97 12 34 56', 'SN'],
      ['00229 97123456', 'SN'],
      ['01 97 12 34 56', 'BJ'],
      ['+229 01 97 12 34 56', 'SN'],
    ] as const) {
      expect(normalizePhone(raw, country), raw).toBe('+2290197123456');
    }
  });

  it('never pads a truncated new number: old Benin numbers never started with 0', () => {
    expect(normalizePhone('01 97 12 34', 'BJ')).toBeNull();
    expect(normalizePhone('+229 01 97 12 34', 'SN')).toBeNull();
  });

  it('leaves 8 digits alone outside Benin', () => {
    expect(normalizePhone('63 01 23 45', 'TD')).toBe('+23563012345');
    expect(normalizePhone('97 12 34 56', 'SN')).toBeNull();
  });

  it('reads a number of each new country with that country by default', () => {
    const local = {
      GW: '955012345',
      GA: '06031234',
      CG: '061234567',
      TD: '63012345',
      CF: '70012345',
      GQ: '222123456',
      CD: '991234567',
    } as const;
    expect(
      Object.fromEntries(
        Object.entries(local).map(([c, n]) => [c, normalizePhone(n, c as keyof typeof local)]),
      ),
    ).toEqual({
      GW: '+245955012345',
      GA: '+24106031234',
      CG: '+242061234567',
      TD: '+23563012345',
      CF: '+23670012345',
      GQ: '+240222123456',
      CD: '+243991234567',
    });
  });

  it('every shop country is a phone region of its own', () => {
    for (const c of SHOP_COUNTRIES) expect(shopCountry(c.code), c.code).toBe(c.code);
  });
});

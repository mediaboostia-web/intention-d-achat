import { describe, it, expect } from 'vitest';
import { maskPhone, normalizePhone, shopCountry } from './phone';

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

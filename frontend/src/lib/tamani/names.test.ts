import { describe, it, expect } from 'vitest';
import { firstName, initials } from './names';

describe('initials', () => {
  it('takes the first letter of the first two words, in capitals', () => {
    expect(initials('Diallo Import')).toBe('DI');
    expect(initials('  chez  mamadou diallo ')).toBe('CM');
  });

  it('keeps accented letters and a single word', () => {
    expect(initials('Élodie')).toBe('É');
  });

  it('gives a question mark for an empty name', () => {
    expect(initials('')).toBe('?');
    expect(initials('  ')).toBe('?');
  });
});

describe('firstName', () => {
  it('is the first word of a full name', () => {
    expect(firstName('Fatou Ndiaye')).toBe('Fatou');
    expect(firstName('  Awa  ')).toBe('Awa');
  });

  it('is null without a name', () => {
    expect(firstName('   ')).toBeNull();
    expect(firstName(null)).toBeNull();
    expect(firstName(undefined)).toBeNull();
  });
});

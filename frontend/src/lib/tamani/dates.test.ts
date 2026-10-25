import { describe, it, expect } from 'vitest';
import { addDays, formatDateFr } from './dates';

const now = new Date('2026-10-24T10:00:00Z');

describe('dates', () => {
  it('formats a day in French, with the year only when it differs', () => {
    expect(formatDateFr(new Date('2026-11-03T10:00:00Z'), now)).toBe('3 novembre');
    expect(formatDateFr(new Date('2027-01-05T10:00:00Z'), now)).toBe('5 janvier 2027');
  });

  it('adds whole days', () => {
    expect(addDays(now, 10).toISOString()).toBe('2026-11-03T10:00:00.000Z');
  });
});

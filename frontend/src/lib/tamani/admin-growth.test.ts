import { describe, expect, it } from 'vitest';
import { deltaText, payingShops } from './admin-growth';

describe('deltaText', () => {
  it('compares the last 30 days with the 30 before, in plain words', () => {
    expect(deltaText(12, 8)).toEqual({ text: '+4 vs les 30 jours d’avant', tone: 'up' });
    expect(deltaText(3, 5)).toEqual({ text: '−2 vs les 30 jours d’avant', tone: 'down' });
    expect(deltaText(4, 4)).toEqual({ text: 'Autant que les 30 jours d’avant', tone: 'flat' });
  });
  it('a first period has nothing to compare with', () => {
    expect(deltaText(5, 0)).toEqual({ text: 'Premiers sur la période', tone: 'up' });
    expect(deltaText(0, 0)).toBeNull();
  });
});

describe('payingShops', () => {
  it('counts the shops on a paid pass, not the trial nor the free ones', () => {
    expect(payingShops({ FREE: 10, TRIAL: 4, MONTH: 3, MONTH_PLUS: 1, UNLIMITED: 1 })).toBe(5);
    expect(payingShops({})).toBe(0);
  });
});

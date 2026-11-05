import { describe, expect, it } from 'vitest';
import {
  cacOf,
  churnOf,
  coverages,
  monthRange,
  mrrOf,
  newPayers,
  parseMonth,
  revenueSeries,
  shiftMonth,
  type PassOrder,
} from './metrics';

const NOW = new Date('2026-11-15T10:00:00Z');
const day = (iso: string) => new Date(`${iso}T09:00:00Z`);
const order = (org: string, at: string, over: Partial<PassOrder> = {}): PassOrder => ({
  organizationId: org,
  offer: 'WEEK',
  amount: 3900,
  provider: 'saspay',
  activatedAt: day(at),
  days: 7,
  ...over,
});

describe('revenueSeries', () => {
  it('sums each of the six months ending with the one shown, oldest first', () => {
    const paid = [
      order('a', '2026-11-02'),
      order('b', '2026-11-20', { amount: 9900 }),
      order('c', '2026-09-30'),
      order('d', '2026-04-10'), // before the six months
    ];
    expect(revenueSeries(paid, '2026-11')).toEqual([
      { month: '2026-06', total: 0 },
      { month: '2026-07', total: 0 },
      { month: '2026-08', total: 0 },
      { month: '2026-09', total: 3900 },
      { month: '2026-10', total: 0 },
      { month: '2026-11', total: 13_800 },
    ]);
  });

  it('crosses the new year', () => {
    expect(revenueSeries([order('a', '2025-12-31')], '2026-02', 3)).toEqual([
      { month: '2025-12', total: 3900 },
      { month: '2026-01', total: 0 },
      { month: '2026-02', total: 0 },
    ]);
  });
});

describe('months', () => {
  it('reads AAAA-MM, and falls back to the current UTC month', () => {
    expect(parseMonth('2026-10', NOW)).toBe('2026-10');
    expect(parseMonth('2026-13', NOW)).toBe('2026-11');
    expect(parseMonth('octobre', NOW)).toBe('2026-11');
    expect(parseMonth(null, NOW)).toBe('2026-11');
  });

  it('spans the calendar month in UTC', () => {
    expect(monthRange('2026-12')).toEqual({
      start: new Date('2026-12-01T00:00:00Z'),
      end: new Date('2027-01-01T00:00:00Z'),
    });
  });

  it('moves a month back and forth across the year', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });
});

describe('coverages', () => {
  it('a pass bought during the grace of the last one keeps the shop covered', () => {
    // Week from Oct 1 ends Oct 8, grace to Oct 11; the next one on Oct 10.
    const c = coverages([order('a', '2026-10-01'), order('a', '2026-10-10')]);
    expect(c.get('a')).toEqual([{ start: day('2026-10-01'), end: day('2026-10-20') }]);
  });

  it('a pass bought while the last one runs ends after it, never before', () => {
    const c = coverages([
      order('a', '2026-10-01', { offer: 'MONTH', days: 30 }),
      order('a', '2026-10-05'),
    ]);
    // The month runs to Oct 31; the week inside it does not shorten it.
    expect(c.get('a')).toEqual([{ start: day('2026-10-01'), end: day('2026-11-03') }]);
  });

  it('a pass bought after the grace opens a new coverage', () => {
    const c = coverages([order('a', '2026-10-01'), order('a', '2026-10-20')]);
    expect(c.get('a')).toHaveLength(2);
  });
});

describe('churnOf', () => {
  const november = monthRange('2026-11');

  it('counts a shop whose pass ended in the month without buying again', () => {
    // a: week from Oct 28 → Nov 4, grace to Nov 7. b: month from Oct 31, runs into December.
    const orders = [
      order('a', '2026-10-28'),
      order('b', '2026-10-31', { offer: 'MONTH', days: 30 }),
    ];
    const r = churnOf(coverages(orders), orders, november);
    expect(r).toEqual({ atStart: 2, churned: 1, rate: 0.5 });
  });

  it('does not count a shop that came back later in the month', () => {
    const orders = [order('a', '2026-10-28'), order('a', '2026-11-20')];
    expect(churnOf(coverages(orders), orders, november)).toEqual({
      atStart: 1,
      churned: 0,
      rate: 0,
    });
  });

  it('has no rate when nobody had a pass at the start of the month', () => {
    const orders = [order('a', '2026-11-03')];
    expect(churnOf(coverages(orders), orders, november)).toEqual({
      atStart: 0,
      churned: 0,
      rate: null,
    });
  });
});

describe('newPayers and CAC', () => {
  const november = monthRange('2026-11');

  it('counts the shops whose first paid pass falls in the month', () => {
    const orders = [
      order('a', '2026-11-02'),
      order('b', '2026-10-02'),
      order('b', '2026-11-05'),
      order('c', '2026-11-06', { amount: 0, provider: 'manual' }),
    ];
    // b had paid before; c's pass was a gift.
    expect(newPayers(orders, november)).toBe(1);
  });

  it('divides the spend by the new paying shops, never by zero', () => {
    expect(cacOf(50_000, 4)).toBe(12_500);
    expect(cacOf(50_000, 0)).toBeNull();
    expect(cacOf(null, 3)).toBeNull();
  });
});

describe('mrrOf', () => {
  const sub = (organizationId: string, plan: string, end: string | null, grace?: string) => ({
    organizationId,
    plan,
    currentPeriodEnd: end ? new Date(end) : null,
    graceUntil: grace ? new Date(grace) : null,
  });

  it('brings every running paid pass to 30 days', () => {
    expect(mrrOf([sub('a', 'WEEK', '2026-11-20T00:00:00Z')], new Map(), NOW)).toBe(16_714);
    expect(mrrOf([sub('a', 'MONTH', '2026-12-01T00:00:00Z')], new Map(), NOW)).toBe(9_900);
  });

  it('leaves out the trial, the grace and the shops without a pass', () => {
    const subs = [
      sub('a', 'TRIAL', '2026-11-16T00:00:00Z'),
      sub('b', 'WEEK', '2026-11-14T00:00:00Z', '2026-11-17T00:00:00Z'),
      sub('c', 'FREE', null),
    ];
    expect(mrrOf(subs, new Map(), NOW)).toBe(0);
  });

  it('reads the Unlimited pass from its last grant', () => {
    const subs = [sub('a', 'UNLIMITED', '2026-12-01T00:00:00Z')];
    expect(mrrOf(subs, new Map([['a', { amount: 55_000, days: 30 }]]), NOW)).toBe(55_000);
    expect(mrrOf(subs, new Map(), NOW)).toBe(0);
  });
});

import { describe, it, expect } from 'vitest';
import {
  GRACE_DAYS,
  applyPurchase,
  effectivePlan,
  trialPass,
  type PassState,
} from './subscription';

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const month: PassState = {
  plan: 'MONTH',
  periodStart: d('2026-10-25'),
  currentPeriodEnd: d('2026-11-24'),
  graceUntil: d('2026-11-27'),
  responsesIncluded: 1000,
};

describe('effectivePlan', () => {
  it('walks FREE → pass → pass in grace → FREE, with the date that matters', () => {
    expect(effectivePlan(null, d('2026-10-24'))).toEqual({
      plan: 'FREE',
      inGrace: false,
      endsAt: null,
    });
    expect(effectivePlan(month, d('2026-10-30'))).toEqual({
      plan: 'MONTH',
      inGrace: false,
      endsAt: d('2026-11-24'),
    });
    expect(effectivePlan(month, d('2026-11-25'))).toEqual({
      plan: 'MONTH',
      inGrace: true,
      endsAt: d('2026-11-27'),
    });
    expect(effectivePlan(month, d('2026-11-27')).plan).toBe('FREE');
  });

  it('trial has no grace', () => {
    const now = d('2026-10-29');
    const trial = trialPass(now);
    expect(trial).toEqual({
      plan: 'TRIAL',
      periodStart: now,
      currentPeriodEnd: d('2026-11-01'),
      graceUntil: null,
      responsesIncluded: 50,
    });
    expect(effectivePlan(trial, d('2026-10-31'))).toEqual({
      plan: 'TRIAL',
      inGrace: false,
      endsAt: d('2026-11-01'),
    });
    expect(effectivePlan({ ...trial, graceUntil: d('2026-11-04') }, d('2026-11-02')).plan).toBe(
      'FREE',
    );
  });

  it('an unknown plan reads FREE', () => {
    const now = d('2026-10-30');
    expect(effectivePlan({ ...month, plan: 'GOLD' }, now).plan).toBe('FREE');
    expect(effectivePlan({ ...month, plan: 'PRO' }, now).plan).toBe('FREE');
    expect(effectivePlan({ ...month, plan: 'FREE' }, now).plan).toBe('FREE');
    expect(effectivePlan({ ...month, currentPeriodEnd: null }, now).plan).toBe('FREE');
  });
});

describe('applyPurchase', () => {
  it('a week pass ends after 7 days then 3 days of grace', () => {
    expect(GRACE_DAYS).toBe(3);
    const now = d('2026-10-29');
    expect(applyPurchase(null, 'WEEK', 0, now)).toEqual({
      plan: 'WEEK',
      periodStart: now,
      currentPeriodEnd: d('2026-11-05'),
      graceUntil: d('2026-11-08'),
      responsesIncluded: 150,
    });
  });

  it('a pass bought during another keeps the unused answers', () => {
    const now = d('2026-11-10');
    expect(applyPurchase(month, 'MONTH_PLUS', 400, now)).toEqual({
      plan: 'MONTH_PLUS',
      periodStart: now,
      currentPeriodEnd: d('2026-12-10'),
      graceUntil: d('2026-12-13'),
      responsesIncluded: 5600,
    });
  });

  it('a pass bought after no pass starts fresh', () => {
    const now = d('2026-12-01');
    expect(applyPurchase(month, 'MONTH', 200, now).responsesIncluded).toBe(1000);
    const free: PassState = { ...month, plan: 'FREE', responsesIncluded: 0 };
    expect(applyPurchase(free, 'WEEK', 0, d('2026-10-30')).responsesIncluded).toBe(150);
  });

  it("a pass bought during the trial keeps the trial's unused answers", () => {
    const start = d('2026-10-29');
    const next = applyPurchase(trialPass(start), 'WEEK', 20, d('2026-10-30'));
    expect(next.responsesIncluded).toBe(180);
    expect(next.periodStart).toEqual(d('2026-10-30'));
  });

  it('a pass bought during grace keeps the unused answers', () => {
    const now = d('2026-11-25');
    expect(applyPurchase(month, 'WEEK', 900, now).responsesIncluded).toBe(250);
    // Answers over the count never take answers off the new pass.
    expect(applyPurchase(month, 'WEEK', 1200, now).responsesIncluded).toBe(150);
  });
});

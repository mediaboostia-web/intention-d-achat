import { describe, it, expect } from 'vitest';
import { GRACE_DAYS, effectivePlan, extendSubscription } from './subscription';

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const pro = { plan: 'MONTH', currentPeriodEnd: d('2026-11-24'), graceUntil: d('2026-11-29') };

describe('effectivePlan', () => {
  it('effectivePlan walks FREE → PRO → PRO in grace → FREE', () => {
    expect(effectivePlan(null, d('2026-10-24'))).toEqual({ plan: 'FREE', inGrace: false });
    expect(effectivePlan(pro, d('2026-10-24'))).toEqual({ plan: 'MONTH', inGrace: false });
    expect(effectivePlan(pro, d('2026-11-26'))).toEqual({ plan: 'MONTH', inGrace: true });
    expect(effectivePlan(pro, d('2026-11-30'))).toEqual({ plan: 'FREE', inGrace: false });
  });

  it('reads FREE for a paid plan without an end, or an unknown plan', () => {
    const now = d('2026-10-24');
    expect(
      effectivePlan({ plan: 'MONTH', currentPeriodEnd: null, graceUntil: null }, now).plan,
    ).toBe('FREE');
    expect(effectivePlan({ ...pro, plan: 'GOLD' }, now).plan).toBe('FREE');
    expect(effectivePlan({ ...pro, plan: 'FREE' }, now).plan).toBe('FREE');
  });
});

describe('extendSubscription', () => {
  it('adds the new period after currentPeriodEnd when the same plan is active', () => {
    expect(GRACE_DAYS).toBe(5);
    expect(extendSubscription(pro, 'MONTH', 1, d('2026-10-30'))).toEqual({
      plan: 'MONTH',
      currentPeriodEnd: d('2026-12-24'),
      graceUntil: d('2026-12-29'),
    });
  });

  it('starts from now for another plan, an expired period or grace', () => {
    const now = d('2026-10-30');
    expect(extendSubscription(pro, 'MONTH_MAX', 1, now).currentPeriodEnd).toEqual(d('2026-11-30'));
    expect(extendSubscription(null, 'MONTH', 1, now).currentPeriodEnd).toEqual(d('2026-11-30'));
    const inGrace = d('2026-11-26');
    expect(extendSubscription(pro, 'MONTH', 1, inGrace).currentPeriodEnd).toEqual(d('2026-12-26'));
  });

  it('PRO 12 months from 2026-10-24 ends on 2027-10-24', () => {
    expect(extendSubscription(null, 'MONTH', 12, d('2026-10-24'))).toEqual({
      plan: 'MONTH',
      currentPeriodEnd: d('2027-10-24'),
      graceUntil: d('2027-10-29'),
    });
  });

  it('clamps month ends (2026-01-31 + 1 month = 2026-02-28)', () => {
    expect(extendSubscription(null, 'MONTH', 1, d('2026-01-31')).currentPeriodEnd).toEqual(
      d('2026-02-28'),
    );
  });
});

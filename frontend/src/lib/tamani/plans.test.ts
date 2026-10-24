import { describe, it, expect } from 'vitest';
import { PLANS, isPlanId, priceFor } from './plans';

describe('plans', () => {
  it('prices a year as ten months', () => {
    expect(priceFor('PRO', 12)).toBe(99000);
    expect(priceFor('PRO', 1)).toBe(9900);
    expect(priceFor('BUSINESS', 1)).toBe(24900);
    expect(priceFor('BUSINESS', 12)).toBe(249000);
  });

  it('carries the exact quotas of the spec', () => {
    expect(PLANS.FREE.monthlyPriceXof).toBe(0);
    expect(PLANS.FREE.maxActiveCampaigns).toBe(3);
    expect(PLANS.PRO.maxActiveCampaigns).toBeNull();
    expect(PLANS.BUSINESS.maxActiveCampaigns).toBeNull();
    expect([PLANS.FREE, PLANS.PRO, PLANS.BUSINESS].map((p) => p.monthlyResponses)).toEqual([
      150, 3000, 15000,
    ]);
    expect(PLANS.BUSINESS.seats).toBe(3);
  });

  it('FREE features are all locked except the powered-by badge', () => {
    const { poweredByBadge, ...rest } = PLANS.FREE.features;
    expect(poweredByBadge).toBe(true);
    expect(Object.values(rest).every((v) => v === false)).toBe(true);
  });

  it('PRO and BUSINESS have every feature and no badge', () => {
    for (const plan of [PLANS.PRO, PLANS.BUSINESS]) {
      const { poweredByBadge, ...rest } = plan.features;
      expect(poweredByBadge).toBe(false);
      expect(Object.values(rest).every((v) => v === true)).toBe(true);
    }
  });

  it('recognises plan ids', () => {
    expect(isPlanId('PRO')).toBe(true);
    expect(isPlanId('GOLD')).toBe(false);
  });
});

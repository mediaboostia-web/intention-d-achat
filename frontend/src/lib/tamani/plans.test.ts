import { describe, it, expect } from 'vitest';
import {
  MARGIN_ASSUMPTIONS,
  PASS_IDS,
  PLANS,
  isPassId,
  isPaymentCountry,
  isPlanId,
  marginOf,
  passPrice,
  passResponses,
} from './plans';

describe('plans', () => {
  it("the porteur's grid", () => {
    const grid = PASS_IDS.map((id) => [
      id,
      PLANS[id].priceXof,
      PLANS[id].durationDays,
      PLANS[id].includedResponses,
    ]);
    expect(grid).toEqual([
      ['WEEK', 3900, 7, 150],
      ['TWO_WEEKS', 5900, 14, 350],
      ['MONTH', 9900, 30, 1000],
      ['MONTH_PLUS', 14900, 30, 2500],
      ['MONTH_MAX', 24900, 30, 5000],
    ]);
    expect([PLANS.TRIAL.priceXof, PLANS.TRIAL.durationDays, PLANS.TRIAL.includedResponses]).toEqual(
      [0, 3, 50],
    );
    expect(PLANS.UNLIMITED.priceXof).toBeNull();
    expect(PLANS.UNLIMITED.durationDays).toBe(30);
    expect(Object.values(PLANS).map((p) => p.label)).toEqual([
      'Sans pass',
      'Essai gratuit',
      'Pass Semaine',
      'Pass 2 Semaines',
      'Pass Mois',
      'Pass Mois Plus',
      'Pass Mois Max',
      'Pass Illimité',
    ]);
    expect(passPrice('MONTH')).toBe(9900);
    expect(passResponses('MONTH_MAX')).toBe(5000);
  });

  it('trial opens everything but source links and export', () => {
    expect(PLANS.TRIAL.features).toEqual({
      estimate: true,
      sourceLinks: false,
      respondentContacts: true,
      csvExport: false,
      reliability: true,
      poweredByBadge: true,
    });
    expect(PLANS.TRIAL.maxActiveCampaigns).toBe(1);
  });

  it('no pass masks numbers and keeps one campaign', () => {
    const { poweredByBadge, ...rest } = PLANS.FREE.features;
    expect(poweredByBadge).toBe(true);
    expect(Object.values(rest).every((v) => v === false)).toBe(true);
    expect(PLANS.FREE.maxActiveCampaigns).toBe(1);
    expect(PLANS.FREE.priceXof).toBe(0);
  });

  it('passes open every feature, unlimited campaigns, no badge', () => {
    for (const id of [...PASS_IDS, 'UNLIMITED' as const]) {
      const { poweredByBadge, ...rest } = PLANS[id].features;
      expect(poweredByBadge).toBe(false);
      expect(Object.values(rest).every((v) => v === true)).toBe(true);
      expect(PLANS[id].maxActiveCampaigns).toBeNull();
    }
  });

  it('every paid offer keeps 70 % margin', () => {
    expect(MARGIN_ASSUMPTIONS).toEqual({
      saspayFee: 0.06,
      payoutFee: 0.045,
      costPerResponse: 0.25,
      floor: 0.7,
    });
    for (const id of PASS_IDS) {
      expect(marginOf(passPrice(id), passResponses(id))).toBeGreaterThanOrEqual(0.7);
    }
    expect(marginOf(24900, 5000)).toBeCloseTo(0.845, 3);
    expect(marginOf(14900, 2500)).toBeCloseTo(0.853, 3);
    expect(marginOf(3900, 150)).toBeCloseTo(0.885, 3);
  });

  it('payment opens in FCFA countries only', () => {
    for (const c of ['BJ', 'GA', 'CG', 'SN', 'CM']) expect(isPaymentCountry(c)).toBe(true);
    for (const c of ['GN', 'CD', 'TD', 'GW', 'CF', 'GQ', 'FR'])
      expect(isPaymentCountry(c)).toBe(false);
  });

  it('recognises plan and pass ids', () => {
    expect(isPlanId('MONTH')).toBe(true);
    expect(isPlanId('PRO')).toBe(false);
    expect(isPassId('WEEK')).toBe(true);
    expect(isPassId('TRIAL')).toBe(false);
    expect(isPassId('UNLIMITED')).toBe(false);
  });
});

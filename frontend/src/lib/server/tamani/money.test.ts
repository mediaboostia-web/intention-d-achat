import { describe, it, expect } from 'vitest';
import type { DemandEstimate } from '@/lib/tamani/results-view';
import { computeMoney } from './money';

const estimate = (consumer: number, reseller: number): DemandEstimate => ({
  announced: 0,
  realistic: consumer + reseller,
  low: 0,
  high: 0,
  byBuyerType: {
    CONSUMER: { respondents: 0, announced: 0, realistic: consumer },
    RESELLER: { respondents: 0, announced: 0, realistic: reseller },
  },
});

const prices = { unitPrice: 7500, wholesalePrice: 6000 };

describe('computeMoney', () => {
  it('values the dead stock avoided at the purchase price', () => {
    const m = computeMoney({
      reference: 400,
      estimate: estimate(84, 126),
      costPrice: 6000,
      ...prices,
    });
    expect(m.avoidedDeadStock).toBe(1_140_000);
  });

  it('avoids nothing when the realistic demand covers the reference', () => {
    const m = computeMoney({
      reference: 100,
      estimate: estimate(60, 60),
      costPrice: 6000,
      ...prices,
    });
    expect(m.avoidedDeadStock).toBe(0);
  });

  it('values resellers at the wholesale price and consumers at the unit price', () => {
    const m = computeMoney({
      reference: 400,
      estimate: estimate(85, 126),
      costPrice: 4000,
      ...prices,
    });
    expect(m.expectedProfit).toBe(126 * 2000 + 85 * 3500);
  });

  it('values resellers at the unit price without a wholesale price', () => {
    const m = computeMoney({
      reference: null,
      estimate: estimate(10, 10),
      costPrice: 4000,
      unitPrice: 7500,
      wholesalePrice: null,
    });
    expect(m).toEqual({ avoidedDeadStock: null, expectedProfit: 20 * 3500 });
  });

  it('is all null without a purchase price', () => {
    expect(
      computeMoney({ reference: 400, estimate: estimate(84, 126), costPrice: null, ...prices }),
    ).toEqual({ avoidedDeadStock: null, expectedProfit: null });
  });
});

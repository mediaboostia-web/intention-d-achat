import { describe, it, expect } from 'vitest';
import { coefficientsFor } from './coefficients';
import { computeCampaignStats, type StatsCampaign, type StatsRow } from './stats';

const coefs = coefficientsFor({ coefConsumer: 0.5, coefReseller: 0.7 });
const zones = [
  { id: 'z1', name: 'Médina' },
  { id: 'z2', name: 'Parcelles' },
];

const campaign = (over: Partial<StatsCampaign> = {}): StatsCampaign => ({
  availability: 'INCOMING',
  plannedQuantity: 400,
  stockQuantity: null,
  product: { costPrice: 6000, unitPrice: 7500, wholesalePrice: 6500 },
  links: [
    { id: 'l2', label: 'Statut', openCount: 30, isDefault: false },
    { id: 'l1', label: 'Lien principal', openCount: 70, isDefault: true },
  ],
  ...over,
});

const done = new Date('2026-10-26T10:00:00Z');
const row = (over: Partial<StatsRow> = {}): StatsRow => ({
  completedAt: done,
  locked: false,
  suspicious: false,
  interested: true,
  notInterestedReason: null,
  buyerType: 'CONSUMER',
  quantity: 2,
  option: null,
  timing: null,
  wantsDelivery: null,
  zoneId: null,
  linkId: 'l1',
  ...over,
});
const no = (reason: string | null) =>
  row({ interested: false, buyerType: null, quantity: null, notInterestedReason: reason });

describe('computeCampaignStats', () => {
  it('counts only completed, unlocked, unsuspicious answers', () => {
    const s = computeCampaignStats(
      [
        row(),
        row(),
        row(),
        no('TOO_EXPENSIVE'),
        row({ locked: true }),
        row({ suspicious: true }),
        row({ completedAt: null }),
        row({ completedAt: null, interested: null }),
      ],
      campaign(),
      zones,
      coefs,
    );
    expect(s).toMatchObject({
      opens: 100,
      completed: 4,
      incomplete: 2,
      lockedCount: 1,
      suspiciousCount: 1,
      interested: 3,
      notInterested: 1,
      interestRate: 0.75,
      announced: 6,
      reference: 400,
      stock: null,
    });
  });

  it('splits the interested by buyer type, zone, pickup, timing, option and source', () => {
    const s = computeCampaignStats(
      [
        row({
          buyerType: 'RESELLER',
          quantity: 12,
          wantsDelivery: true,
          zoneId: 'z1',
          timing: 'ON_ARRIVAL',
          option: 'Rouge',
        }),
        row({
          buyerType: 'RESELLER',
          quantity: 24,
          wantsDelivery: true,
          zoneId: 'z2',
          timing: 'ON_ARRIVAL',
          option: 'Bleu',
          linkId: 'l2',
        }),
        row({
          buyerType: 'CONSUMER',
          quantity: 2,
          wantsDelivery: false,
          timing: 'LATER',
          option: 'Rouge',
        }),
        row({ buyerType: 'CONSUMER', quantity: 3, wantsDelivery: true, zoneId: null }),
        no('NO_NEED'),
        no('TOO_EXPENSIVE'),
        no('TOO_EXPENSIVE'),
      ],
      campaign(),
      zones,
      coefs,
    );
    expect(s.byBuyerType).toEqual({
      CONSUMER: { respondents: 2, announced: 5 },
      RESELLER: { respondents: 2, announced: 36 },
    });
    expect(s.byZone).toEqual([
      { zoneId: 'z2', name: 'Parcelles', respondents: 1, quantity: 24 },
      { zoneId: 'z1', name: 'Médina', respondents: 1, quantity: 12 },
    ]);
    expect(s.pickup).toEqual({ respondents: 1, quantity: 2 });
    expect(s.byTiming).toEqual([
      { timing: 'ON_ARRIVAL', respondents: 2, quantity: 36 },
      { timing: 'LATER', respondents: 1, quantity: 2 },
    ]);
    expect(s.byOption).toEqual([
      { option: 'Bleu', respondents: 1, quantity: 24 },
      { option: 'Rouge', respondents: 2, quantity: 14 },
    ]);
    expect(s.bySource).toEqual([
      { linkId: 'l1', label: 'Lien principal', opens: 70, completed: 6, interested: 3 },
      { linkId: 'l2', label: 'Statut', opens: 30, completed: 1, interested: 1 },
    ]);
    expect(s.noReasons).toEqual([
      { reason: 'TOO_EXPENSIVE', count: 2 },
      { reason: 'NO_NEED', count: 1 },
    ]);
  });

  it('gives the estimate, the verdict and the money from 20 answers', () => {
    const rows = Array.from({ length: 20 }, () => row({ buyerType: 'RESELLER', quantity: 15 }));
    const s = computeCampaignStats(rows, campaign(), zones, coefs);
    expect(s.result.estimate.realistic).toBe(210);
    expect(s.result.verdict).toMatchObject({ code: 'CAUTION', missingResponses: 0 });
    expect(s.result.money).toEqual({
      avoidedDeadStock: 190 * 6000,
      expectedProfit: 210 * 500,
    });
    expect(s.result.coefs).toBe(coefs);
  });

  it('leaves money null while waiting', () => {
    const s = computeCampaignStats(
      [row({ buyerType: 'RESELLER', quantity: 5 })],
      campaign(),
      zones,
      coefs,
    );
    expect(s.result.verdict).toMatchObject({ code: 'WAIT', missingResponses: 19 });
    expect(s.result.money).toBeNull();
  });

  it('skips yes rows without buyer type or quantity', () => {
    const s = computeCampaignStats(
      [row({ buyerType: null, quantity: null, timing: 'LATER' }), row({ quantity: 0 }), row()],
      campaign(),
      zones,
      coefs,
    );
    expect(s.interested).toBe(3);
    expect(s.announced).toBe(2);
    expect(s.byTiming).toEqual([]);
    expect(s.byBuyerType.CONSUMER).toEqual({ respondents: 1, announced: 2 });
  });

  it('reads the stock against the realistic demand', () => {
    const rows = Array.from({ length: 20 }, () => row({ buyerType: 'RESELLER', quantity: 15 }));
    const short = computeCampaignStats(rows, campaign({ stockQuantity: 200 }), zones, coefs);
    expect(short.stock).toBe(200);
    expect(short.result.stockStatus).toBe('SHORTAGE');
    const enough = computeCampaignStats(rows, campaign({ stockQuantity: 300 }), zones, coefs);
    expect(enough.result.stockStatus).toBe('ENOUGH');
    expect(computeCampaignStats(rows, campaign(), zones, coefs).result.stockStatus).toBeNull();
  });

  it('has no interest rate without a completed answer', () => {
    expect(computeCampaignStats([], campaign(), zones, coefs).interestRate).toBeNull();
  });
});

describe('computeCampaignStats for an in-stock campaign', () => {
  const inStock = (over: Partial<StatsCampaign> = {}) =>
    campaign({ availability: 'IN_STOCK', plannedQuantity: null, stockQuantity: 30, ...over });

  it('passes the availability through', () => {
    expect(computeCampaignStats([], inStock(), zones, coefs).availability).toBe('IN_STOCK');
    expect(computeCampaignStats([], campaign(), zones, coefs).availability).toBe('INCOMING');
  });

  it('uses the stock, never plannedQuantity, for an in-stock campaign', () => {
    const s = computeCampaignStats(
      [row({ quantity: 12 })],
      inStock({ plannedQuantity: 100 }),
      zones,
      coefs,
    );
    expect(s.result.estimate.realistic).toBe(6);
    expect(s.result.stockAdvice).toEqual({
      status: 'ENOUGH',
      leftover: 24,
      restock: 0,
      provisional: true,
    });
  });

  it('gives an incoming campaign no stock advice', () => {
    const s = computeCampaignStats([row()], campaign({ stockQuantity: 30 }), zones, coefs);
    expect(s.result.stockAdvice).toBeNull();
  });

  it('gives an in-stock campaign without a stock no stock advice', () => {
    const s = computeCampaignStats([row()], inStock({ stockQuantity: null }), zones, coefs);
    expect(s.result.stockAdvice).toBeNull();
  });

  it('sums the quantity of each timing', () => {
    const rows = Array.from({ length: 3 }, () => row({ timing: 'TODAY_TOMORROW', quantity: 2 }));
    expect(computeCampaignStats(rows, inStock(), zones, coefs).byTiming).toEqual([
      { timing: 'TODAY_TOMORROW', respondents: 3, quantity: 6 },
    ]);
  });

  it('expects a profit capped at the stock and avoids no dead stock', () => {
    const rows = Array.from({ length: 25 }, () => row({ quantity: 2 }));
    const s = computeCampaignStats(
      rows,
      inStock({
        stockQuantity: 20,
        product: { costPrice: 5000, unitPrice: 7000, wholesalePrice: null },
      }),
      zones,
      coefs,
    );
    expect(s.result.estimate.realistic).toBe(25);
    expect(s.result.money).toEqual({ avoidedDeadStock: null, expectedProfit: 40_000 });
    expect(s.result.stockAdvice).toMatchObject({ status: 'SHORTAGE', restock: 5 });
  });

  it('leaves the money null under 20 answers', () => {
    const s = computeCampaignStats([row()], inStock(), zones, coefs);
    expect(s.result.money).toBeNull();
  });
});

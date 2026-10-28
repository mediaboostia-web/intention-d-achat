import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect } from 'vitest';
import type { BuyerType } from '@/lib/tamani/labels';
import { finishedCampaignWhere } from './campaign-status';
import {
  clientReliability,
  learnableCampaignWhere,
  learnedCoefficients,
  loadLearnedCoefficients,
} from './reliability';

const fallback = { consumer: 0.5, reseller: 0.7 };

type Row = { buyerType: BuyerType; campaignId: string; announced: number; fulfilledQty: number };

/** n yes answers of one buyer type, spread in turn over the campaigns. */
const yes = (
  buyerType: BuyerType,
  n: number,
  campaigns: string[],
  announced: number,
  fulfilledQty: number,
): Row[] =>
  Array.from({ length: n }, (_, i) => ({
    buyerType,
    campaignId: campaigns[i % campaigns.length] ?? 'c1',
    announced,
    fulfilledQty,
  }));

describe('clientReliability', () => {
  const finishedYes = (fulfilled: boolean) => ({
    interested: true,
    campaignFinished: true,
    fulfilled,
  });

  it('has no rate under 2 finished yes answers', () => {
    expect(clientReliability([])).toEqual({ yesCount: 0, fulfilledCount: 0, rate: null });
    expect(clientReliability([finishedYes(true)])).toEqual({
      yesCount: 1,
      fulfilledCount: 1,
      rate: null,
    });
  });

  it('4 fulfilled orders on 5 finished yes answers read 0.8', () => {
    const rows = [true, true, false, true, true].map(finishedYes);
    expect(clientReliability(rows)).toEqual({ yesCount: 5, fulfilledCount: 4, rate: 0.8 });
  });

  it('a running campaign and a no answer do not count', () => {
    const rows = [
      ...[true, true, false, true, true].map(finishedYes),
      { interested: true, campaignFinished: false, fulfilled: true },
      { interested: true, campaignFinished: false, fulfilled: false },
      { interested: false, campaignFinished: true, fulfilled: false },
    ];
    expect(clientReliability(rows)).toEqual({ yesCount: 5, fulfilledCount: 4, rate: 0.8 });
  });
});

describe('learnedCoefficients', () => {
  it('19 yes answers keep the fallback', () => {
    expect(learnedCoefficients(yes('RESELLER', 19, ['c1', 'c2'], 10, 8), fallback)).toEqual({
      consumer: 0.5,
      reseller: 0.7,
      learned: { consumer: false, reseller: false },
    });
  });

  it('20 yes answers on 2 finished campaigns are learned', () => {
    expect(learnedCoefficients(yes('RESELLER', 20, ['c1', 'c2'], 10, 8), fallback)).toEqual({
      consumer: 0.5,
      reseller: 0.8,
      learned: { consumer: false, reseller: true },
    });
  });

  it('20 yes answers on 1 campaign keep the fallback', () => {
    expect(learnedCoefficients(yes('RESELLER', 20, ['c1'], 10, 8), fallback)).toEqual({
      consumer: 0.5,
      reseller: 0.7,
      learned: { consumer: false, reseller: false },
    });
  });

  it('is bounded to [0.1, 1]', () => {
    // 10 bought for 200 announced: 0.05.
    const low = [
      ...yes('CONSUMER', 19, ['c1', 'c2'], 10, 0),
      ...yes('CONSUMER', 1, ['c2'], 10, 10),
    ];
    expect(learnedCoefficients(low, fallback)).toMatchObject({
      consumer: 0.1,
      learned: { consumer: true },
    });
    // 14 bought for 10 announced: 1.4.
    expect(learnedCoefficients(yes('CONSUMER', 20, ['c1', 'c2'], 10, 14), fallback)).toMatchObject({
      consumer: 1,
      learned: { consumer: true },
    });
  });

  it('learns each buyer type on its own answers', () => {
    const rows = [
      ...yes('CONSUMER', 30, ['c1', 'c2', 'c3'], 4, 1),
      ...yes('RESELLER', 12, ['c1', 'c2'], 10, 10),
    ];
    expect(learnedCoefficients(rows, fallback)).toEqual({
      consumer: 0.25,
      reseller: 0.7,
      learned: { consumer: true, reseller: false },
    });
  });

  it('rounds to the hundredth', () => {
    // 2 bought for 3 announced on every answer.
    expect(learnedCoefficients(yes('RESELLER', 20, ['c1', 'c2'], 3, 2), fallback).reseller).toBe(
      0.67,
    );
  });

  it('an answer without an announced quantity does not count', () => {
    const rows = [...yes('RESELLER', 19, ['c1', 'c2'], 10, 8), ...yes('RESELLER', 1, ['c2'], 0, 0)];
    expect(learnedCoefficients(rows, fallback).learned.reseller).toBe(false);
  });
});

describe('loadLearnedCoefficients', () => {
  const now = new Date('2026-10-28T12:00:00Z');
  const answer = (campaignId: string, order: { status: string; quantity: number } | null) => ({
    buyerType: 'RESELLER',
    campaignId,
    quantity: 10,
    order,
  });

  it('a campaign teaches only once finished and followed up in orders, none still open', () => {
    // A shop that keeps its orders elsewhere must not learn that nobody buys.
    expect(learnableCampaignWhere(now)).toEqual({
      AND: [
        finishedCampaignWhere(now),
        { orders: { some: { responseId: { not: null } } } },
        {
          orders: {
            none: { responseId: { not: null }, status: { in: ['TO_CONFIRM', 'CONFIRMED'] } },
          },
        },
      ],
    });
  });

  it('reads the counted yes answers of the campaigns the shop followed up', async () => {
    prismaMock.response.findMany.mockResolvedValue([]);
    await loadLearnedCoefficients(prismaMock, 'org_1', fallback, now);
    expect(prismaMock.response.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: 'org_1',
          completedAt: { not: null },
          locked: false,
          suspicious: false,
          interested: true,
          buyerType: { in: ['CONSUMER', 'RESELLER'] },
          quantity: { gt: 0 },
          campaign: learnableCampaignWhere(now),
        },
        select: {
          buyerType: true,
          campaignId: true,
          quantity: true,
          order: { select: { status: true, quantity: true } },
        },
      }),
    );
  });

  it('counts only the quantities of fulfilled orders', async () => {
    // 16 fulfilled for 10, one confirmed, one cancelled, 2 without an order: 160 for 200.
    prismaMock.response.findMany.mockResolvedValue([
      ...Array.from({ length: 16 }, (_, i) =>
        answer(i % 2 ? 'c1' : 'c2', { status: 'FULFILLED', quantity: 10 }),
      ),
      answer('c1', { status: 'CONFIRMED', quantity: 10 }),
      answer('c2', { status: 'CANCELLED', quantity: 10 }),
      answer('c1', null),
      answer('c2', null),
    ] as never);
    expect(await loadLearnedCoefficients(prismaMock, 'org_1', fallback, now)).toEqual({
      consumer: 0.5,
      reseller: 0.8,
      learned: { consumer: false, reseller: true },
    });
  });
});

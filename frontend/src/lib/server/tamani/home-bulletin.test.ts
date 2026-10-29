import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, beforeEach, type Mock } from 'vitest';
import { activeCampaignWhere } from './campaign-status';
import { buildHomeBulletin } from './home-bulletin';

const now = new Date('2026-10-27T12:00:00Z');
const monthStart = new Date('2026-10-01T00:00:00Z');
const weekAgo = new Date('2026-10-20T12:00:00Z');

const pro = { plan: 'MONTH', currentPeriodEnd: new Date('2026-11-20T00:00:00Z'), graceUntil: null };

const shop = (over: object = {}) => ({
  coefConsumer: 0.5,
  coefReseller: 0.7,
  freeVerdictCampaignId: null,
  subscription: pro,
  ...over,
});

const campaign = (id: string, over: object = {}) => ({
  id,
  title: `Campagne ${id}`,
  status: 'ACTIVE',
  endsAt: null,
  createdAt: new Date('2026-10-20T08:00:00Z'),
  arrivedAt: null,
  availability: 'INCOMING',
  plannedQuantity: 200,
  stockQuantity: null,
  product: { unitLabel: 'sac', costPrice: 15000, unitPrice: 18000, wholesalePrice: 17000 },
  ...over,
});

// c3 waits (5 answers), c1 says GO (190 for 200), c2 says STOP (50 for 400) and is from September.
const running = [
  campaign('c3', { createdAt: new Date('2026-10-25T08:00:00Z'), plannedQuantity: 300 }),
  campaign('c1'),
  campaign('c2', { createdAt: new Date('2026-09-15T08:00:00Z'), plannedQuantity: 400 }),
];

type Yes = [campaignId: string, buyerType: string | null, count: number, quantity: number | null];

function answers(completed: Array<[string, number]>, yes: Yes[]) {
  (prismaMock.response.groupBy as unknown as Mock).mockImplementation(((args: { by: string[] }) =>
    Promise.resolve(
      args.by.includes('buyerType')
        ? yes.map(([campaignId, buyerType, n, quantity]) => ({
            campaignId,
            buyerType,
            _count: { _all: n },
            _sum: { quantity },
          }))
        : completed.map(([campaignId, n]) => ({ campaignId, _count: { _all: n } })),
    )) as never);
}

const runningAnswers = () =>
  answers(
    [
      ['c1', 30],
      ['c2', 25],
      ['c3', 5],
    ],
    [
      ['c1', 'CONSUMER', 10, 100],
      ['c1', 'RESELLER', 10, 200],
      ['c2', 'CONSUMER', 10, 100],
      ['c3', 'CONSUMER', 5, 20],
    ],
  );

type OrderGroup = [status: string, fulfillment: string, zoneId: string | null, count: number];

function orders(groups: OrderGroup[]) {
  (prismaMock.saleOrder.groupBy as unknown as Mock).mockResolvedValue(
    groups.map(([status, fulfillment, zoneId, n]) => ({
      status,
      fulfillment,
      zoneId,
      _count: { _all: n },
    })),
  );
}

beforeEach(() => {
  prismaMock.organization.findFirst.mockResolvedValue(shop() as never);
  prismaMock.campaign.findMany.mockResolvedValue([]);
  prismaMock.response.findMany.mockResolvedValue([]);
  answers([], []);
  orders([]);
});

describe('buildHomeBulletin', () => {
  it('gives a verdict per running campaign, newest first', async () => {
    prismaMock.campaign.findMany.mockResolvedValue(running as never);
    runningAnswers();
    const { campaigns } = await buildHomeBulletin(prismaMock, 'org_1', now);
    expect(campaigns).toEqual([
      {
        id: 'c3',
        title: 'Campagne c3',
        unitLabel: 'sac',
        completed: 5,
        verdict: 'WAIT',
        realistic: 10,
        reference: 300,
        offered: false,
        availability: 'INCOMING',
        interested: 5,
        stockStatus: null,
        restock: null,
      },
      {
        id: 'c1',
        title: 'Campagne c1',
        unitLabel: 'sac',
        completed: 30,
        verdict: 'GO',
        realistic: 190,
        reference: 200,
        offered: false,
        availability: 'INCOMING',
        interested: 20,
        stockStatus: null,
        restock: null,
      },
      {
        id: 'c2',
        title: 'Campagne c2',
        unitLabel: 'sac',
        completed: 25,
        verdict: 'STOP',
        realistic: 50,
        reference: 400,
        offered: false,
        availability: 'INCOMING',
        interested: 10,
        stockStatus: null,
        restock: null,
      },
    ]);
  });

  it('reads the campaigns and the counted answers of the shop only', async () => {
    prismaMock.campaign.findMany.mockResolvedValue(running as never);
    runningAnswers();
    await buildHomeBulletin(prismaMock, 'org_1', now);
    expect(prismaMock.campaign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: 'org_1',
          OR: [
            activeCampaignWhere(now),
            { status: { not: 'DRAFT' }, createdAt: { gte: monthStart } },
            { status: 'ARRIVED', arrivedAt: { gte: weekAgo } },
          ],
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );
    const counted = {
      organizationId: 'org_1',
      campaignId: { in: ['c3', 'c1', 'c2'] },
      completedAt: { not: null },
      locked: false,
      suspicious: false,
    };
    expect(prismaMock.response.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ by: ['campaignId'], where: counted }),
    );
    expect(prismaMock.response.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['campaignId', 'buyerType'],
        where: { ...counted, interested: true },
        _sum: { quantity: true },
      }),
    );
  });

  it('keeps 10 running campaigns at most', async () => {
    prismaMock.campaign.findMany.mockResolvedValue(
      Array.from({ length: 12 }, (_, i) => campaign(`c${i}`)) as never,
    );
    expect((await buildHomeBulletin(prismaMock, 'org_1', now)).campaigns).toHaveLength(10);
  });

  it('the free plan sees only its offered verdict', async () => {
    prismaMock.organization.findFirst.mockResolvedValue(
      shop({ subscription: null, freeVerdictCampaignId: 'c1' }) as never,
    );
    prismaMock.campaign.findMany.mockResolvedValue(running as never);
    runningAnswers();
    const { campaigns } = await buildHomeBulletin(prismaMock, 'org_1', now);
    expect(campaigns.map((c) => [c.id, c.verdict, c.realistic, c.reference, c.offered])).toEqual([
      ['c3', null, null, null, false],
      ['c1', 'GO', 190, 200, true],
      ['c2', null, null, null, false],
    ]);
    expect(prismaMock.organization.updateMany).not.toHaveBeenCalled();
  });

  it('the free plan claims its verdict on its oldest campaign past 20 answers', async () => {
    prismaMock.organization.findFirst
      .mockResolvedValueOnce(shop({ subscription: null }) as never)
      .mockResolvedValueOnce({ freeVerdictCampaignId: 'c2' } as never);
    prismaMock.campaign.findMany.mockResolvedValue(running as never);
    runningAnswers();
    const { campaigns } = await buildHomeBulletin(prismaMock, 'org_1', now);
    expect(prismaMock.organization.updateMany).toHaveBeenCalledWith({
      where: { id: 'org_1', freeVerdictCampaignId: null },
      data: { freeVerdictCampaignId: 'c2' },
    });
    expect(campaigns.find((c) => c.id === 'c2')).toMatchObject({ verdict: 'STOP', offered: true });
    expect(campaigns.find((c) => c.id === 'c1')).toMatchObject({ verdict: null, offered: false });
  });

  it('a free shop whose offer is still open sees its campaigns wait', async () => {
    prismaMock.organization.findFirst.mockResolvedValue(shop({ subscription: null }) as never);
    prismaMock.campaign.findMany.mockResolvedValue([running[0]] as never);
    answers([['c3', 5]], [['c3', 'CONSUMER', 5, 20]]);
    const { campaigns } = await buildHomeBulletin(prismaMock, 'org_1', now);
    expect(campaigns[0]).toMatchObject({
      completed: 5,
      verdict: 'WAIT',
      realistic: null,
      reference: null,
      offered: false,
    });
    expect(prismaMock.organization.updateMany).not.toHaveBeenCalled();
  });

  it('money protected sums this month’s visible verdicts, outside WAIT', async () => {
    prismaMock.campaign.findMany.mockResolvedValue(running as never);
    runningAnswers();
    // c1: (200 − 190) × 15 000. c3 waits; c2 is from September.
    expect((await buildHomeBulletin(prismaMock, 'org_1', now)).moneyProtectedThisMonth).toBe(
      150_000,
    );
  });

  describe('an in-stock campaign', () => {
    const inStock = (stockQuantity: number) =>
      campaign('c4', { availability: 'IN_STOCK', plannedQuantity: null, stockQuantity });
    const withC4 = () =>
      answers(
        [
          ['c1', 30],
          ['c2', 25],
          ['c3', 5],
          ['c4', 25],
        ],
        [
          ['c1', 'CONSUMER', 10, 100],
          ['c1', 'RESELLER', 10, 200],
          ['c2', 'CONSUMER', 10, 100],
          ['c3', 'CONSUMER', 5, 20],
          ['c4', 'CONSUMER', 25, 100],
        ],
      );

    it('carries the people to serve and the state of its stock', async () => {
      prismaMock.campaign.findMany.mockResolvedValue([inStock(30)] as never);
      withC4();
      const { campaigns } = await buildHomeBulletin(prismaMock, 'org_1', now);
      // 100 announced × 0.5 = 50 realistic for 30 in stock.
      expect(campaigns[0]).toMatchObject({
        availability: 'IN_STOCK',
        interested: 25,
        stockStatus: 'SHORTAGE',
        restock: 20,
      });
    });

    it('stays out of the money protected', async () => {
      prismaMock.campaign.findMany.mockResolvedValue([...running, inStock(300)] as never);
      withC4();
      expect((await buildHomeBulletin(prismaMock, 'org_1', now)).moneyProtectedThisMonth).toBe(
        150_000,
      );
    });

    it('hides its stock state when the free plan locks it', async () => {
      prismaMock.organization.findFirst.mockResolvedValue(
        shop({ subscription: null, freeVerdictCampaignId: 'c2' }) as never,
      );
      prismaMock.campaign.findMany.mockResolvedValue([inStock(30)] as never);
      withC4();
      const { campaigns } = await buildHomeBulletin(prismaMock, 'org_1', now);
      expect(campaigns[0]).toMatchObject({ interested: 25, stockStatus: null, restock: null });
    });
  });

  it('money protected leaves out the verdicts the free plan hides', async () => {
    prismaMock.organization.findFirst.mockResolvedValue(
      shop({ subscription: null, freeVerdictCampaignId: 'c2' }) as never,
    );
    prismaMock.campaign.findMany.mockResolvedValue(running as never);
    runningAnswers();
    expect((await buildHomeBulletin(prismaMock, 'org_1', now)).moneyProtectedThisMonth).toBe(0);
  });

  it('to do: the campaigns arrived within 7 days that have interested people', async () => {
    prismaMock.campaign.findMany.mockResolvedValue([
      campaign('c_new', { status: 'ARRIVED', arrivedAt: new Date('2026-10-26T09:00:00Z') }),
      campaign('c_arr', { status: 'ARRIVED', arrivedAt: new Date('2026-10-25T09:00:00Z') }),
      campaign('c_old', { status: 'ARRIVED', arrivedAt: new Date('2026-10-19T09:00:00Z') }),
      campaign('c_none', { status: 'ARRIVED', arrivedAt: new Date('2026-10-26T10:00:00Z') }),
    ] as never);
    answers(
      [
        ['c_new', 2],
        ['c_arr', 6],
        ['c_old', 9],
        ['c_none', 3],
      ],
      [
        ['c_new', 'RESELLER', 2, 40],
        ['c_arr', 'CONSUMER', 3, 9],
        ['c_arr', null, 1, null],
        ['c_old', 'CONSUMER', 9, 30],
      ],
    );
    const bulletin = await buildHomeBulletin(prismaMock, 'org_1', now);
    expect(bulletin.todo).toEqual([
      { kind: 'NOTIFY_INTERESTED', campaignId: 'c_new', title: 'Campagne c_new', interested: 2 },
      { kind: 'NOTIFY_INTERESTED', campaignId: 'c_arr', title: 'Campagne c_arr', interested: 4 },
    ]);
    expect(bulletin.campaigns).toEqual([]);
  });

  describe('the coefficients learned from the orders', () => {
    // 20 reseller yes answers on 2 finished campaigns: 160 bought for 200 announced.
    const learning = Array.from({ length: 20 }, (_, i) => ({
      buyerType: 'RESELLER',
      campaignId: i % 2 ? 'c_old1' : 'c_old2',
      quantity: 10,
      order: i < 16 ? { status: 'FULFILLED', quantity: 10 } : null,
    }));

    it('a Pro shop’s verdicts use them', async () => {
      prismaMock.campaign.findMany.mockResolvedValue(running as never);
      runningAnswers();
      prismaMock.response.findMany.mockResolvedValue(learning as never);
      const { campaigns } = await buildHomeBulletin(prismaMock, 'org_1', now);
      // c1: 100 × 0.5 + 200 × 0.8.
      expect(campaigns.find((c) => c.id === 'c1')).toMatchObject({ verdict: 'GO', realistic: 210 });
      expect(prismaMock.response.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: 'org_1', interested: true }),
        }),
      );
    });

    it('the free plan never reads them', async () => {
      prismaMock.organization.findFirst.mockResolvedValue(
        shop({ subscription: null, freeVerdictCampaignId: 'c1' }) as never,
      );
      prismaMock.campaign.findMany.mockResolvedValue(running as never);
      runningAnswers();
      prismaMock.response.findMany.mockResolvedValue(learning as never);
      const { campaigns } = await buildHomeBulletin(prismaMock, 'org_1', now);
      expect(campaigns.find((c) => c.id === 'c1')).toMatchObject({ verdict: 'GO', realistic: 190 });
      expect(prismaMock.response.findMany).not.toHaveBeenCalled();
    });
  });

  describe('the orders to do', () => {
    it('come first: the orders to confirm, then the deliveries and their zones', async () => {
      prismaMock.campaign.findMany.mockResolvedValue([
        campaign('c_arr', { status: 'ARRIVED', arrivedAt: new Date('2026-10-26T09:00:00Z') }),
      ] as never);
      answers([['c_arr', 2]], [['c_arr', 'RESELLER', 2, 40]]);
      orders([
        ['TO_CONFIRM', 'PICKUP', null, 2],
        ['TO_CONFIRM', 'DELIVERY', 'z1', 1],
        ['CONFIRMED', 'DELIVERY', 'z1', 3],
        ['CONFIRMED', 'DELIVERY', 'z2', 1],
        ['CONFIRMED', 'DELIVERY', null, 1],
        ['CONFIRMED', 'PICKUP', null, 4],
      ]);
      const { todo } = await buildHomeBulletin(prismaMock, 'org_1', now);
      expect(todo).toEqual([
        { kind: 'CONFIRM_ORDERS', count: 3 },
        { kind: 'DELIVER', count: 5, zones: 2 },
        { kind: 'NOTIFY_INTERESTED', campaignId: 'c_arr', title: 'Campagne c_arr', interested: 2 },
      ]);
    });

    it('are counted with one groupBy on the shop', async () => {
      await buildHomeBulletin(prismaMock, 'org_1', now);
      expect(prismaMock.saleOrder.groupBy).toHaveBeenCalledWith({
        by: ['status', 'fulfillment', 'zoneId'],
        where: { organizationId: 'org_1', status: { in: ['TO_CONFIRM', 'CONFIRMED'] } },
        _count: { _all: true },
      });
    });

    it('a line shows only when its count is above 0', async () => {
      orders([['TO_CONFIRM', 'DELIVERY', 'z1', 1]]);
      expect((await buildHomeBulletin(prismaMock, 'org_1', now)).todo).toEqual([
        { kind: 'CONFIRM_ORDERS', count: 1 },
      ]);
      // Confirmed pickups are not delivered.
      orders([['CONFIRMED', 'PICKUP', null, 4]]);
      expect((await buildHomeBulletin(prismaMock, 'org_1', now)).todo).toEqual([]);
    });

    it('show in a shop without campaigns', async () => {
      orders([['CONFIRMED', 'DELIVERY', null, 2]]);
      expect((await buildHomeBulletin(prismaMock, 'org_1', now)).todo).toEqual([
        { kind: 'DELIVER', count: 2, zones: 0 },
      ]);
      expect(prismaMock.response.groupBy).not.toHaveBeenCalled();
    });
  });

  it('a shop without campaigns reads no answers', async () => {
    expect(await buildHomeBulletin(prismaMock, 'org_1', now)).toEqual({
      campaigns: [],
      moneyProtectedThisMonth: 0,
      todo: [],
    });
    expect(prismaMock.response.groupBy).not.toHaveBeenCalled();
  });
});

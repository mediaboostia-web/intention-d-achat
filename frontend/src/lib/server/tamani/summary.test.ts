import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { activeCampaignWhere } from './campaign-status';
import { buildHomeBulletin } from './home-bulletin';
import { buildShopSummary } from './summary';

// The bulletin has its own tests (home-bulletin.test.ts) and reads campaigns too.
vi.mock('./home-bulletin', () => ({
  buildHomeBulletin: vi.fn(async () => ({ campaigns: [], moneyProtectedThisMonth: 0, todo: [] })),
}));

const now = new Date('2026-10-25T12:00:00Z');
const weekAgo = new Date('2026-10-18T12:00:00Z');
const dayAgo = new Date('2026-10-24T12:00:00Z');
const days = (n: number) => new Date(now.getTime() + n * 86_400_000);

// The client book's visibility (lot 7): a counted answer, or an order (a manual one adds its client).
const visible = {
  organizationId: 'org_1',
  anonymizedAt: null,
  OR: [
    { responses: { some: { completedAt: { not: null }, locked: false, suspicious: false } } },
    { orders: { some: {} } },
  ],
};

const product = {
  id: 'p1',
  organizationId: 'org_1',
  name: 'Riz parfumé',
  description: null,
  unitLabel: 'sac',
  unitPrice: 18000,
  wholesalePrice: null,
  wholesaleMinQty: null,
  costPrice: null,
  photos: [],
  optionLabel: null,
  options: [],
  archivedAt: null,
  createdAt: now,
  updatedAt: now,
};

const openCampaign = {
  id: 'c1',
  organizationId: 'org_1',
  productId: 'p1',
  title: 'Riz parfumé',
  availability: 'IN_STOCK',
  availableAt: null,
  stockQuantity: null,
  plannedQuantity: null,
  showStock: false,
  endsAt: null,
  deliveryEnabled: false,
  showLiveCounter: true,
  shareTemplate: '*{produit}* {prix} {lien}',
  status: 'ACTIVE',
  closedAt: null,
  arrivedAt: null,
  createdAt: now,
  updatedAt: now,
  product,
  links: [
    {
      id: 'l1',
      campaignId: 'c1',
      code: 'Ab3dE7x',
      label: 'Lien principal',
      isDefault: true,
      openCount: 40,
      createdAt: now,
      updatedAt: now,
    },
  ],
};

const resp = (id: string, iso: string, over: object = {}) => ({
  id,
  completedAt: new Date(iso),
  campaignId: 'c1',
  locked: false,
  interested: true,
  quantity: 3,
  campaign: { product: { name: 'Riz parfumé', unitLabel: 'sac' } },
  ...over,
});

beforeEach(() => {
  prismaMock.response.count.mockResolvedValue(0);
  prismaMock.respondent.count.mockResolvedValue(0);
  prismaMock.response.findMany.mockResolvedValue([]);
  prismaMock.respondent.findMany.mockResolvedValue([]);
  prismaMock.campaign.findMany.mockResolvedValue([]);
  prismaMock.campaign.count.mockResolvedValue(1);
  prismaMock.product.count.mockResolvedValue(1);
  prismaMock.campaign.findFirst.mockResolvedValue(null);
  prismaMock.campaignLink.aggregate.mockResolvedValue({ _sum: { openCount: null } } as never);
});

describe('buildShopSummary', () => {
  it('counts the week on 7 rolling days and yesterday on 24 hours', async () => {
    prismaMock.response.count
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(7);
    const { week } = await buildShopSummary(prismaMock, 'org_1', now);
    expect(week).toMatchObject({ completed: 12, sinceYesterday: 2, interested: 7 });
    expect(prismaMock.response.count).toHaveBeenNthCalledWith(1, {
      where: { organizationId: 'org_1', suspicious: false, completedAt: { gte: weekAgo } },
    });
    expect(prismaMock.response.count).toHaveBeenNthCalledWith(2, {
      where: { organizationId: 'org_1', suspicious: false, completedAt: { gte: dayAgo } },
    });
    expect(prismaMock.response.count).toHaveBeenNthCalledWith(3, {
      where: {
        organizationId: 'org_1',
        suspicious: false,
        completedAt: { gte: weekAgo },
        locked: false,
        interested: true,
      },
    });
  });

  it('opensRunning sums the links of the campaigns open now', async () => {
    prismaMock.campaignLink.aggregate.mockResolvedValue({ _sum: { openCount: 340 } } as never);
    expect((await buildShopSummary(prismaMock, 'org_1', now)).week.opensRunning).toBe(340);
    expect(prismaMock.campaignLink.aggregate).toHaveBeenCalledWith({
      where: { campaign: { organizationId: 'org_1', ...activeCampaignWhere(now) } },
      _sum: { openCount: true },
    });
  });

  it('newClients counts visible clients first seen this week', async () => {
    prismaMock.respondent.count.mockResolvedValue(4);
    expect((await buildShopSummary(prismaMock, 'org_1', now)).week.newClients).toBe(4);
    expect(prismaMock.respondent.count).toHaveBeenCalledWith({
      where: { ...visible, firstSeenAt: { gte: weekAgo } },
    });
  });

  it('a locked response shows without its content', async () => {
    prismaMock.response.findMany.mockResolvedValue([
      resp('r_locked', '2026-10-25T11:00:00Z', { locked: true, interested: true, quantity: 9 }),
    ] as never);
    const { activity } = await buildShopSummary(prismaMock, 'org_1', now);
    expect(activity[0]).toMatchObject({
      kind: 'RESPONSE',
      locked: true,
      interested: null,
      quantity: null,
    });
  });

  it('a new client whose answer is locked does not show', async () => {
    await buildShopSummary(prismaMock, 'org_1', now);
    // Visibility is the query's: a client with only locked or suspicious answers, and
    // no order, is never read; an anonymized one never either.
    expect(prismaMock.respondent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: visible }),
    );
    expect(prismaMock.respondent.count).toHaveBeenCalledWith({
      where: expect.objectContaining(visible),
    });
  });

  it('merges responses and new clients, newest first, 8 at most', async () => {
    prismaMock.response.findMany.mockResolvedValue(
      Array.from({ length: 8 }, (_, i) => resp(`r${i}`, `2026-10-2${i % 5}T0${i}:00:00Z`)) as never,
    );
    prismaMock.respondent.findMany.mockResolvedValue([
      { id: 'cl1', firstName: 'Awa', firstSeenAt: new Date('2026-10-25T11:30:00Z') },
    ] as never);
    const { activity } = await buildShopSummary(prismaMock, 'org_1', now);
    expect(activity).toHaveLength(8);
    expect(activity[0]).toEqual({
      kind: 'NEW_CLIENT',
      id: 'cl1',
      at: '2026-10-25T11:30:00.000Z',
      respondentId: 'cl1',
      firstName: 'Awa',
    });
    const times = activity.map((a) => a.at);
    expect([...times].sort().reverse()).toEqual(times);
    expect(prismaMock.response.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: 'org_1', suspicious: false, completedAt: { not: null } },
        orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
        take: 8,
      }),
    );
  });

  it('upcoming lists campaign ends and arrivals within 30 days', async () => {
    prismaMock.campaign.findMany.mockResolvedValue([
      {
        id: 'c_end',
        title: 'Huile',
        status: 'ACTIVE',
        endsAt: days(3),
        availability: 'IN_STOCK',
        availableAt: null,
      },
      {
        id: 'c_arr',
        title: 'Riz',
        status: 'CLOSED',
        endsAt: null,
        availability: 'INCOMING',
        availableAt: days(10),
      },
      {
        id: 'c_far',
        title: 'Sucre',
        status: 'ACTIVE',
        endsAt: days(40),
        availability: 'IN_STOCK',
        availableAt: null,
      },
      {
        id: 'c_done',
        title: 'Lait',
        status: 'ARRIVED',
        endsAt: null,
        availability: 'INCOMING',
        availableAt: days(5),
      },
    ] as never);
    const { upcoming } = await buildShopSummary(prismaMock, 'org_1', now);
    expect(upcoming).toEqual([
      { kind: 'ENDS', campaignId: 'c_end', title: 'Huile', at: days(3).toISOString() },
      { kind: 'ARRIVES', campaignId: 'c_arr', title: 'Riz', at: days(10).toISOString() },
    ]);
  });

  it('upcoming keeps the 5 nearest', async () => {
    prismaMock.campaign.findMany.mockResolvedValue(
      [9, 2, 7, 1, 5, 3].map((d) => ({
        id: `c${d}`,
        title: `C${d}`,
        status: 'ACTIVE',
        endsAt: days(d),
        availability: 'IN_STOCK',
        availableAt: null,
      })) as never,
    );
    const { upcoming } = await buildShopSummary(prismaMock, 'org_1', now);
    expect(upcoming.map((u) => u.campaignId)).toEqual(['c1', 'c2', 'c3', 'c5', 'c7']);
  });

  it('shareCampaign is the newest open campaign with its share message', async () => {
    prismaMock.campaign.findFirst.mockResolvedValue(openCampaign as never);
    const { shareCampaign } = await buildShopSummary(prismaMock, 'org_1', now);
    expect(shareCampaign?.id).toBe('c1');
    expect(shareCampaign?.title).toBe('Riz parfumé');
    expect(shareCampaign?.shareMessage).toContain('*Riz parfumé*');
    expect(shareCampaign?.shareMessage).toContain('/c/Ab3dE7x');
    expect(prismaMock.campaign.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: 'org_1', ...activeCampaignWhere(now) },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it('shareCampaign is null without an open campaign, and an empty shop says so', async () => {
    prismaMock.campaign.count.mockResolvedValue(0);
    prismaMock.product.count.mockResolvedValue(0);
    const summary = await buildShopSummary(prismaMock, 'org_1', now);
    expect(summary).toMatchObject({ shareCampaign: null, hasCampaign: false, hasProduct: false });
    expect(prismaMock.product.count).toHaveBeenCalledWith({
      where: { organizationId: 'org_1', archivedAt: null },
    });
  });

  it('the summary never carries a phone number', async () => {
    prismaMock.response.findMany.mockResolvedValue([resp('r1', '2026-10-25T10:00:00Z')] as never);
    prismaMock.respondent.findMany.mockResolvedValue([
      { id: 'cl1', firstName: 'Awa', firstSeenAt: now, phoneE164: '+221771112233' },
    ] as never);
    prismaMock.campaign.findFirst.mockResolvedValue(openCampaign as never);
    const summary = await buildShopSummary(prismaMock, 'org_1', now);
    expect(JSON.stringify(summary)).not.toContain('+221');
    expect(prismaMock.respondent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ select: { id: true, firstName: true, firstSeenAt: true } }),
    );
  });

  it('carries the bulletin: verdicts, money protected and the to-do list', async () => {
    const bulletin = {
      campaigns: [
        {
          id: 'c1',
          title: 'Riz parfumé',
          unitLabel: 'sac',
          completed: 30,
          verdict: 'GO' as const,
          realistic: 190,
          reference: 200,
          offered: false,
          availability: 'INCOMING' as const,
          interested: 20,
          stockStatus: null,
          restock: null,
        },
      ],
      moneyProtectedThisMonth: 150_000,
      todo: [
        { kind: 'NOTIFY_INTERESTED' as const, campaignId: 'c2', title: 'Huile', interested: 4 },
      ],
    };
    vi.mocked(buildHomeBulletin).mockResolvedValueOnce(bulletin);
    expect(await buildShopSummary(prismaMock, 'org_1', now)).toMatchObject(bulletin);
    expect(buildHomeBulletin).toHaveBeenCalledWith(prismaMock, 'org_1', now);
  });

  it('every query is scoped to the shop', async () => {
    await buildShopSummary(prismaMock, 'org_1', now);
    const calls = [
      prismaMock.response.count,
      prismaMock.response.findMany,
      prismaMock.respondent.count,
      prismaMock.respondent.findMany,
      prismaMock.campaign.findMany,
      prismaMock.campaign.count,
      prismaMock.campaign.findFirst,
      prismaMock.product.count,
      prismaMock.campaignLink.aggregate,
    ].flatMap((fn) => fn.mock.calls as unknown[][]);
    expect(calls.length).toBeGreaterThanOrEqual(11);
    for (const [args] of calls) {
      expect(JSON.stringify((args as { where: unknown }).where)).toContain(
        '"organizationId":"org_1"',
      );
    }
  });
});

import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, expect, it } from 'vitest';
import { loadAdminDashboard } from './dashboard';

const NOW = new Date('2026-11-15T10:00:00Z');

type CountArgs = { where?: Record<string, unknown> } | undefined;

function seed({
  orders = [] as Record<string, unknown>[],
  subs = [] as Record<string, unknown>[],
  orgs = [] as Record<string, unknown>[],
  spend = null as number | null,
} = {}) {
  prismaMock.order.findMany.mockResolvedValue(orders as never);
  prismaMock.subscription.findMany.mockResolvedValue(subs as never);
  prismaMock.organization.findMany.mockResolvedValue(orgs as never);
  prismaMock.campaign.count.mockImplementation((async (args: CountArgs) => {
    const w = args?.where ?? {};
    if ('archivedAt' in w && w.archivedAt !== null) return 2; // archived
    if (w.status === 'DRAFT') return 3;
    if (w.status === 'ACTIVE') return 4;
    return 10; // every campaign not archived
  }) as never);
  prismaMock.marketingSpend.findUnique.mockResolvedValue(
    (spend === null ? null : { amount: spend }) as never,
  );
  prismaMock.user.count.mockImplementation((async (args: CountArgs) =>
    args?.where ? 1 : 12) as never);
}

const order = (id: string, org: string, at: string, over: Record<string, unknown> = {}) => ({
  id,
  organizationId: org,
  offer: 'WEEK',
  amount: 3900,
  currency: 'XOF',
  provider: 'saspay',
  activatedAt: new Date(at),
  metadata: null,
  organization: { name: `Boutique ${org}` },
  ...over,
});

describe('loadAdminDashboard', () => {
  it('reads only activated pass orders in FCFA', async () => {
    seed();
    await loadAdminDashboard(prismaMock, '2026-11', NOW);
    const where = prismaMock.order.findMany.mock.calls[0]![0]!.where;
    expect(where).toMatchObject({
      activatedAt: { not: null },
      organizationId: { not: null },
      currency: { in: ['XOF', 'XAF'] },
    });
  });

  it('adds XOF and XAF payments of the month, by pass, gifts left out', async () => {
    seed({
      orders: [
        order('o1', 'a', '2026-11-02T09:00:00Z'),
        order('o2', 'b', '2026-11-03T09:00:00Z', { currency: 'XAF', offer: 'MONTH', amount: 9900 }),
        order('o3', 'c', '2026-11-04T09:00:00Z', { provider: 'manual', amount: 0 }),
        order('o4', 'd', '2026-10-20T09:00:00Z'),
      ],
    });
    const d = await loadAdminDashboard(prismaMock, '2026-11', NOW);
    expect(d.revenue.total).toBe(13_800);
    expect(d.revenue.byPass).toEqual([
      { offer: 'WEEK', count: 1, amount: 3900 },
      { offer: 'MONTH', count: 1, amount: 9900 },
    ]);
    expect(d.revenue.payments.map((p) => p.id)).toEqual(['o2', 'o1']);
    expect(d.revenue.payments[0]).toMatchObject({ shopName: 'Boutique b', provider: 'saspay' });
    // Oct 20 is within the last 30 days of Nov 15.
    expect(d.revenue.last30Days).toBe(17_700);
  });

  it('splits the active shops by plan, kind of business and where they sell', async () => {
    seed({
      subs: [
        { organizationId: 'a', plan: 'WEEK', currentPeriodEnd: new Date('2026-11-20') },
        { organizationId: 'b', plan: 'TRIAL', currentPeriodEnd: new Date('2026-11-16') },
        { organizationId: 'c', plan: 'TRIAL', currentPeriodEnd: new Date('2026-11-01') },
      ],
      orgs: [
        { id: 'a', businessType: 'WHOLESALER', salesChannel: 'STORE' },
        { id: 'b', businessType: null, salesChannel: 'ONLINE' },
        { id: 'c', businessType: 'IMPORTER', salesChannel: 'BOTH' },
        { id: 'd', businessType: null, salesChannel: null },
      ],
    });
    const d = await loadAdminDashboard(prismaMock, '2026-11', NOW);
    expect(d.shops).toEqual({
      total: 4,
      active: 2,
      byPlan: { WEEK: 1, TRIAL: 1, FREE: 2 },
      byType: { WHOLESALER: 1, NONE: 1 },
      byChannel: { STORE: 1, ONLINE: 1 },
    });
    expect(d.mrr).toBe(16_714);
  });

  it('counts the campaigns running, drafts, finished and archived apart', async () => {
    seed();
    const d = await loadAdminDashboard(prismaMock, '2026-11', NOW);
    expect(d.campaigns).toEqual({ running: 4, drafts: 3, finished: 3, archived: 2 });
    expect(d.users).toEqual({ total: 12, suspended: 1 });
  });

  it('has no CAC without a spend typed for the month', async () => {
    seed({ orders: [order('o1', 'a', '2026-11-02T09:00:00Z')] });
    const d = await loadAdminDashboard(prismaMock, '2026-11', NOW);
    expect(d.cac).toEqual({ spend: null, payers: 1, value: null });
  });

  it('divides the typed spend by the new paying shops', async () => {
    seed({
      orders: [order('o1', 'a', '2026-11-02T09:00:00Z'), order('o2', 'b', '2026-11-03T09:00:00Z')],
      spend: 50_000,
    });
    const d = await loadAdminDashboard(prismaMock, '2026-11', NOW);
    expect(d.cac).toEqual({ spend: 50_000, payers: 2, value: 25_000 });
  });

  it('reads the Unlimited pass price from its last grant for the MRR', async () => {
    seed({
      orders: [
        order('o1', 'a', '2026-11-01T09:00:00Z', {
          provider: 'manual',
          offer: 'UNLIMITED',
          amount: 55_000,
          metadata: { days: 30, responses: 50_000 },
        }),
      ],
      subs: [{ organizationId: 'a', plan: 'UNLIMITED', currentPeriodEnd: new Date('2026-12-01') }],
      orgs: [{ id: 'a', businessType: 'BOTH', salesChannel: 'BOTH' }],
    });
    const d = await loadAdminDashboard(prismaMock, '2026-11', NOW);
    expect(d.mrr).toBe(55_000);
  });
});

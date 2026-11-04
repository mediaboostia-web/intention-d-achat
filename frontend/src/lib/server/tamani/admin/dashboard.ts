// The support-admin dashboard (lot 11): one read of the orders, the
// subscriptions and the shops, then the pure figures of ./metrics.
import 'server-only';
import type { PrismaClient } from '@prisma/client';
import type { AdminDashboard, AdminPayment } from '@/lib/tamani/admin-dashboard';
import { PASS_IDS, PLANS, isPassId } from '@/lib/tamani/plans';
import { effectivePlan } from '../subscription';
import { cacOf, churnOf, coverages, monthRange, mrrOf, newPayers, type PassOrder } from './metrics';

type Db = Pick<
  PrismaClient,
  'order' | 'subscription' | 'organization' | 'campaign' | 'marketingSpend' | 'user'
>;

/** XOF and XAF are both the CFA franc, at par: they add up. */
const CFA_FRANCS = ['XOF', 'XAF'];
const PAYMENTS_SHOWN = 50;
const LAST_DAYS_MS = 30 * 86_400_000;
const OFFER_ORDER: readonly string[] = [...PASS_IDS, 'UNLIMITED'];

/** A grant by hand says its own length; a SasPay purchase has its pass's. */
export function orderDays(offer: string, metadata: unknown): number {
  const days = (metadata as { days?: unknown } | null)?.days;
  if (typeof days === 'number' && days > 0) return days;
  if (isPassId(offer)) return PLANS[offer].durationDays ?? 0;
  return PLANS.UNLIMITED.durationDays ?? 30;
}

const bump = (tally: Record<string, number>, key: string) => {
  tally[key] = (tally[key] ?? 0) + 1;
};

export async function loadAdminDashboard(
  db: Db,
  month: string,
  now: Date,
): Promise<AdminDashboard> {
  const range = monthRange(month);
  const [rows, subs, orgs, running, drafts, live, archived, spend, users, suspended] =
    await Promise.all([
      db.order.findMany({
        where: {
          activatedAt: { not: null },
          organizationId: { not: null },
          offer: { not: null },
          currency: { in: CFA_FRANCS },
        },
        select: {
          id: true,
          organizationId: true,
          offer: true,
          amount: true,
          provider: true,
          activatedAt: true,
          metadata: true,
          organization: { select: { name: true } },
        },
        orderBy: { activatedAt: 'asc' },
      }),
      db.subscription.findMany({
        select: { organizationId: true, plan: true, currentPeriodEnd: true, graceUntil: true },
      }),
      db.organization.findMany({ select: { id: true, businessType: true, salesChannel: true } }),
      db.campaign.count({
        where: {
          archivedAt: null,
          status: 'ACTIVE',
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        },
      }),
      db.campaign.count({ where: { archivedAt: null, status: 'DRAFT' } }),
      db.campaign.count({ where: { archivedAt: null } }),
      db.campaign.count({ where: { archivedAt: { not: null } } }),
      db.marketingSpend.findUnique({ where: { month }, select: { amount: true } }),
      db.user.count(),
      db.user.count({ where: { status: 'SUSPENDED' } }),
    ]);

  const orders: (PassOrder & { id: string; shopName: string })[] = rows.flatMap((r) =>
    r.organizationId && r.offer && r.activatedAt
      ? [
          {
            id: r.id,
            organizationId: r.organizationId,
            offer: r.offer,
            amount: r.amount,
            provider: r.provider,
            activatedAt: r.activatedAt,
            days: orderDays(r.offer, r.metadata),
            shopName: r.organization?.name ?? '—',
          },
        ]
      : [],
  );

  // Revenue: what came in, gifts (0 FCFA) left out.
  const paid = orders.filter((o) => o.amount > 0);
  const inMonth = paid.filter((o) => o.activatedAt >= range.start && o.activatedAt < range.end);
  const byOffer = new Map<string, { count: number; amount: number }>();
  for (const o of inMonth) {
    const t = byOffer.get(o.offer) ?? { count: 0, amount: 0 };
    byOffer.set(o.offer, { count: t.count + 1, amount: t.amount + o.amount });
  }
  const byPass = [...byOffer.entries()]
    .sort(([a], [b]) => OFFER_ORDER.indexOf(a) - OFFER_ORDER.indexOf(b))
    .map(([offer, t]) => ({ offer, ...t }));
  const payments: AdminPayment[] = [...inMonth]
    .reverse()
    .slice(0, PAYMENTS_SHOWN)
    .map((o) => ({
      id: o.id,
      shopName: o.shopName,
      offer: o.offer,
      amount: o.amount,
      provider: o.provider,
      at: o.activatedAt.toISOString(),
    }));
  const since = new Date(now.getTime() - LAST_DAYS_MS);
  const last30Days = paid
    .filter((o) => o.activatedAt >= since && o.activatedAt <= now)
    .reduce((sum, o) => sum + o.amount, 0);

  // The Unlimited pass has no list price: its last grant gives it one.
  const unlimited = new Map<string, { amount: number; days: number }>();
  for (const o of orders) {
    if (o.offer === 'UNLIMITED')
      unlimited.set(o.organizationId, { amount: o.amount, days: o.days });
  }

  // Shops: the plan in force now, then who the active ones are.
  const subByShop = new Map(subs.map((s) => [s.organizationId, s]));
  const byPlan: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const byChannel: Record<string, number> = {};
  let active = 0;
  for (const org of orgs) {
    const { plan } = effectivePlan(subByShop.get(org.id) ?? null, now);
    bump(byPlan, plan);
    if (plan === 'FREE') continue;
    active += 1;
    bump(byType, org.businessType ?? 'NONE');
    bump(byChannel, org.salesChannel ?? 'NONE');
  }

  const payers = newPayers(orders, range);
  const spent = spend?.amount ?? null;
  return {
    month,
    revenue: {
      total: inMonth.reduce((sum, o) => sum + o.amount, 0),
      last30Days,
      byPass,
      payments,
    },
    mrr: mrrOf(subs, unlimited, now),
    churn: churnOf(coverages(orders), orders, range),
    cac: { spend: spent, payers, value: cacOf(spent, payers) },
    shops: { total: orgs.length, active, byPlan, byType, byChannel },
    campaigns: { running, drafts, finished: Math.max(0, live - running - drafts), archived },
    users: { total: users, suspended },
  };
}

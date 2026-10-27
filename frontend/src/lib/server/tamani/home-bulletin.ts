// The home page's bulletin (lot 6): a verdict line per running campaign,
// the dead stock this month's verdicts avoided, and what to do now. Two
// groupBy on the counted answers feed estimateFromTotals; without the
// estimate feature, only the free plan's offered verdict shows.
import 'server-only';
import type { Prisma } from '@prisma/client';
import type { CampaignBulletinItem, ShopSummary, TodoItem } from '@/lib/tamani/home-view';
import { BUYER_TYPES, type BuyerType } from '@/lib/tamani/labels';
import { PLANS } from '@/lib/tamani/plans';
import { activeCampaignWhere, effectiveStatus } from './campaign-status';
import { coefficientsFor } from './coefficients';
import { estimateFromTotals } from './estimate';
import { claimFreeVerdict, verdictAccess } from './free-verdict';
import type { Db } from './locks';
import { computeMoney } from './money';
import { effectivePlan } from './subscription';
import { computeVerdict, MIN_RESPONSES_FOR_VERDICT, verdictReference } from './verdict';

const DAY_MS = 86_400_000;
const RUNNING_SIZE = 10;
const TODO_DAYS = 7;
const MAX_CAMPAIGNS = 200;

export type HomeBulletin = Pick<ShopSummary, 'campaigns' | 'moneyProtectedThisMonth' | 'todo'>;

const EMPTY: HomeBulletin = { campaigns: [], moneyProtectedThisMonth: 0, todo: [] };

const isBuyerType = (v: string | null): v is BuyerType =>
  v !== null && (BUYER_TYPES as readonly string[]).includes(v);

export async function buildHomeBulletin(
  db: Db,
  organizationId: string,
  now: Date,
): Promise<HomeBulletin> {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const arrivedSince = new Date(now.getTime() - TODO_DAYS * DAY_MS);

  // One read covers the three lists: running now, created this month, arrived this week.
  const [org, campaigns] = await Promise.all([
    db.organization.findFirst({
      where: { id: organizationId },
      select: {
        coefConsumer: true,
        coefReseller: true,
        freeVerdictCampaignId: true,
        subscription: { select: { plan: true, currentPeriodEnd: true, graceUntil: true } },
      },
    }),
    db.campaign.findMany({
      where: {
        organizationId,
        OR: [
          activeCampaignWhere(now),
          { status: { not: 'DRAFT' }, createdAt: { gte: monthStart } },
          { status: 'ARRIVED', arrivedAt: { gte: arrivedSince } },
        ],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: MAX_CAMPAIGNS,
      select: {
        id: true,
        title: true,
        status: true,
        endsAt: true,
        createdAt: true,
        arrivedAt: true,
        plannedQuantity: true,
        stockQuantity: true,
        product: {
          select: { unitLabel: true, costPrice: true, unitPrice: true, wholesalePrice: true },
        },
      },
    }),
  ]);
  if (!org || campaigns.length === 0) return EMPTY;

  const counted = {
    organizationId,
    campaignId: { in: campaigns.map((c) => c.id) },
    completedAt: { not: null },
    locked: false,
    suspicious: false,
  } satisfies Prisma.ResponseWhereInput;
  const [completedBy, yesBy] = await Promise.all([
    db.response.groupBy({ by: ['campaignId'], where: counted, _count: { _all: true } }),
    db.response.groupBy({
      by: ['campaignId', 'buyerType'],
      where: { ...counted, interested: true },
      _count: { _all: true },
      _sum: { quantity: true },
    }),
  ]);

  const completed = new Map(completedBy.map((g) => [g.campaignId, g._count._all]));
  const totalsOf = (campaignId: string) => {
    const sums = {
      CONSUMER: { respondents: 0, announced: 0 },
      RESELLER: { respondents: 0, announced: 0 },
    };
    let interested = 0;
    for (const g of yesBy) {
      if (g.campaignId !== campaignId) continue;
      interested += g._count._all;
      if (!isBuyerType(g.buyerType)) continue;
      sums[g.buyerType].respondents += g._count._all;
      sums[g.buyerType].announced += g._sum.quantity ?? 0;
    }
    return { sums, interested };
  };

  const plan = PLANS[effectivePlan(org.subscription, now).plan];
  const coefs = coefficientsFor(org);
  const eligible = campaigns.filter((c) => (completed.get(c.id) ?? 0) >= MIN_RESPONSES_FOR_VERDICT);
  const freeId = plan.features.estimate
    ? org.freeVerdictCampaignId
    : await claimFreeVerdict(db, organizationId, org.freeVerdictCampaignId, eligible);

  const read = campaigns.map((c) => {
    const n = completed.get(c.id) ?? 0;
    const { sums, interested } = totalsOf(c.id);
    const estimate = estimateFromTotals(sums, coefs);
    const reference = verdictReference(c);
    const verdict = computeVerdict({
      realistic: estimate.realistic,
      completedResponses: n,
      reference,
    });
    const access = verdictAccess(plan, freeId, c.id);
    return { c, n, interested, estimate, reference, verdict, access };
  });

  const items: CampaignBulletinItem[] = read
    .filter(({ c }) => effectiveStatus(c, now) === 'ACTIVE')
    .slice(0, RUNNING_SIZE)
    .map(({ c, n, estimate, reference, verdict, access }) => {
      const base = { id: c.id, title: c.title, unitLabel: c.product.unitLabel, completed: n };
      if (access !== 'LOCKED') {
        return {
          ...base,
          verdict: verdict.code,
          realistic: estimate.realistic,
          reference,
          offered: access === 'OFFERED',
        };
      }
      // While the offer is still open, a free campaign may become the offered one: it shows its wait.
      const waiting = freeId === null && verdict.code === 'WAIT';
      return {
        ...base,
        verdict: waiting ? 'WAIT' : null,
        realistic: null,
        reference: null,
        offered: false,
      };
    });

  const moneyProtectedThisMonth = read
    .filter(
      ({ c, verdict, access }) =>
        c.createdAt >= monthStart && access !== 'LOCKED' && verdict.code !== 'WAIT',
    )
    .reduce((total, { c, estimate, reference }) => {
      const { avoidedDeadStock } = computeMoney({ reference, estimate, ...c.product });
      return total + (avoidedDeadStock ?? 0);
    }, 0);

  const todo: TodoItem[] = read
    .filter(
      ({ c, interested }) =>
        c.status === 'ARRIVED' &&
        c.arrivedAt !== null &&
        c.arrivedAt >= arrivedSince &&
        interested > 0,
    )
    .sort((a, b) => (b.c.arrivedAt?.getTime() ?? 0) - (a.c.arrivedAt?.getTime() ?? 0))
    .map(({ c, interested }) => ({
      kind: 'NOTIFY_INTERESTED',
      campaignId: c.id,
      title: c.title,
      interested,
    }));

  return { campaigns: items, moneyProtectedThisMonth, todo };
}

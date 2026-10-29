// The home page's summary (porteur's feedback §3 bis; lot 6 adds the
// verdicts, the money protected and the to-do list). Every query carries
// the shop's organizationId; no phone number is read.
import 'server-only';
import type { ActivityItem, ShopSummary, UpcomingItem } from '@/lib/tamani/home-view';
import { activeCampaignWhere } from './campaign-status';
import { visibleClientWhere } from './clients';
import { buildHomeBulletin } from './home-bulletin';
import type { Db } from './locks';
import { toCampaign } from './serializers';
import { shopCurrency } from './shop';

const DAY_MS = 86_400_000;
const ACTIVITY_SIZE = 8;
const UPCOMING_SIZE = 5;
const UPCOMING_DAYS = 30;

export async function buildShopSummary(
  db: Db,
  organizationId: string,
  now: Date,
): Promise<ShopSummary> {
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const dayAgo = new Date(now.getTime() - DAY_MS);
  const horizon = new Date(now.getTime() + UPCOMING_DAYS * DAY_MS);
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const counted = { organizationId, suspicious: false };
  const visible = visibleClientWhere(organizationId);

  const [
    completed,
    sinceYesterday,
    interested,
    opens,
    newClients,
    responses,
    clients,
    soon,
    campaignCount,
    productCount,
    share,
    bulletin,
  ] = await Promise.all([
    db.response.count({ where: { ...counted, completedAt: { gte: weekAgo } } }),
    db.response.count({ where: { ...counted, completedAt: { gte: dayAgo } } }),
    db.response.count({
      where: { ...counted, completedAt: { gte: weekAgo }, locked: false, interested: true },
    }),
    db.campaignLink.aggregate({
      where: { campaign: { organizationId, ...activeCampaignWhere(now) } },
      _sum: { openCount: true },
    }),
    db.respondent.count({ where: { ...visible, firstSeenAt: { gte: weekAgo } } }),
    db.response.findMany({
      where: { ...counted, completedAt: { not: null } },
      orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
      take: ACTIVITY_SIZE,
      select: {
        id: true,
        completedAt: true,
        campaignId: true,
        locked: true,
        interested: true,
        quantity: true,
        campaign: { select: { product: { select: { name: true, unitLabel: true } } } },
      },
    }),
    db.respondent.findMany({
      where: visible,
      orderBy: [{ firstSeenAt: 'desc' }, { id: 'desc' }],
      take: ACTIVITY_SIZE,
      select: { id: true, firstName: true, firstSeenAt: true },
    }),
    db.campaign.findMany({
      where: {
        organizationId,
        OR: [
          { status: 'ACTIVE', endsAt: { gt: now, lte: horizon } },
          {
            availability: 'INCOMING',
            status: { in: ['ACTIVE', 'CLOSED'] },
            availableAt: { gte: today, lte: horizon },
          },
        ],
      },
      take: 50,
      select: {
        id: true,
        title: true,
        status: true,
        endsAt: true,
        availability: true,
        availableAt: true,
      },
    }),
    db.campaign.count({ where: { organizationId } }),
    db.product.count({ where: { organizationId, archivedAt: null } }),
    db.campaign.findFirst({
      where: { organizationId, ...activeCampaignWhere(now) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: { product: true, links: { where: { isDefault: true } } },
    }),
    buildHomeBulletin(db, organizationId, now),
  ]);

  const activity: ActivityItem[] = [
    ...responses.map(
      (r): ActivityItem => ({
        kind: 'RESPONSE',
        id: r.id,
        at: (r.completedAt ?? now).toISOString(),
        campaignId: r.campaignId,
        productName: r.campaign.product.name,
        unitLabel: r.campaign.product.unitLabel,
        locked: r.locked,
        interested: r.locked ? null : r.interested,
        quantity: r.locked ? null : r.quantity,
      }),
    ),
    ...clients.map(
      (c): ActivityItem => ({
        kind: 'NEW_CLIENT',
        id: c.id,
        at: c.firstSeenAt.toISOString(),
        respondentId: c.id,
        firstName: c.firstName,
      }),
    ),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, ACTIVITY_SIZE);

  const upcoming: UpcomingItem[] = soon
    .flatMap((c): UpcomingItem[] => {
      const items: UpcomingItem[] = [];
      if (c.status === 'ACTIVE' && c.endsAt && c.endsAt > now && c.endsAt <= horizon) {
        items.push({ kind: 'ENDS', campaignId: c.id, title: c.title, at: c.endsAt.toISOString() });
      }
      const waiting = c.status === 'ACTIVE' || c.status === 'CLOSED';
      if (
        waiting &&
        c.availability === 'INCOMING' &&
        c.availableAt &&
        c.availableAt >= today &&
        c.availableAt <= horizon
      ) {
        items.push({
          kind: 'ARRIVES',
          campaignId: c.id,
          title: c.title,
          at: c.availableAt.toISOString(),
        });
      }
      return items;
    })
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(0, UPCOMING_SIZE);

  const shared = share ? toCampaign(share, now, await shopCurrency(db, organizationId)) : null;
  return {
    week: {
      completed,
      sinceYesterday,
      interested,
      opensRunning: opens._sum.openCount ?? 0,
      newClients,
    },
    activity,
    upcoming,
    hasCampaign: campaignCount > 0,
    hasProduct: productCount > 0,
    shareCampaign: shared
      ? { id: shared.id, title: shared.title, shareMessage: shared.shareMessage }
      : null,
    ...bulletin,
  };
}

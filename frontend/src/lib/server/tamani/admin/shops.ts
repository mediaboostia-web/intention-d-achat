// Support-admin shops (lot 11): the list with its search and plan filter, and
// one shop's card. The plan in force is a rule (an ended trial is « Sans
// pass »), not a column, so the filter runs on the rows read: fine while the
// platform counts shops by the hundred.
import 'server-only';
import type { Prisma, PrismaClient } from '@prisma/client';
import type { AdminShop, AdminShopList, ShopQuery } from '@/lib/tamani/admin-shops';
import { passUsage } from '../quota';
import { effectivePlan } from '../subscription';
import { countCampaigns } from './counts';

type Db = Pick<PrismaClient, 'organization' | 'campaign' | 'order'> & Prisma.TransactionClient;

export const SHOPS_PER_PAGE = 50;
const READ_AT_MOST = 5000;
const PURCHASES_SHOWN = 20;

export async function listAdminShops(
  db: Pick<PrismaClient, 'organization'>,
  query: ShopQuery,
  now: Date,
): Promise<AdminShopList> {
  const q = query.q;
  const where: Prisma.OrganizationWhereInput = q
    ? {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          {
            members: {
              some: { role: 'OWNER', user: { email: { contains: q, mode: 'insensitive' } } },
            },
          },
        ],
      }
    : {};
  const rows = await db.organization.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: READ_AT_MOST,
    select: {
      id: true,
      name: true,
      country: true,
      businessType: true,
      salesChannel: true,
      createdAt: true,
      subscription: { select: { plan: true, currentPeriodEnd: true, graceUntil: true } },
      members: { where: { role: 'OWNER' }, take: 1, select: { user: { select: { email: true } } } },
    },
  });
  const all = rows.map((r) => {
    const pass = effectivePlan(r.subscription, now);
    return {
      id: r.id,
      name: r.name,
      country: r.country,
      ownerEmail: r.members[0]?.user.email ?? null,
      businessType: r.businessType,
      salesChannel: r.salesChannel,
      plan: pass.plan,
      inGrace: pass.inGrace,
      endsAt: pass.endsAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    };
  });
  const matching = query.plan ? all.filter((s) => s.plan === query.plan) : all;
  const pages = Math.max(1, Math.ceil(matching.length / SHOPS_PER_PAGE));
  const page = Math.min(query.page, pages);
  return {
    items: matching.slice((page - 1) * SHOPS_PER_PAGE, page * SHOPS_PER_PAGE),
    total: matching.length,
    page,
    pages,
  };
}

/** `null` for an unknown shop. */
export async function getAdminShop(db: Db, id: string, now: Date): Promise<AdminShop | null> {
  const org = await db.organization.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      country: true,
      businessType: true,
      salesChannel: true,
      createdAt: true,
      members: {
        orderBy: { createdAt: 'asc' },
        select: { role: true, user: { select: { email: true, name: true } } },
      },
    },
  });
  if (!org) return null;
  const [usage, campaigns, purchases] = await Promise.all([
    passUsage(db, id, now),
    countCampaigns(db, { organizationId: id }, now),
    db.order.findMany({
      where: { organizationId: id, offer: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: PURCHASES_SHOWN,
      select: {
        id: true,
        offer: true,
        amount: true,
        currency: true,
        status: true,
        provider: true,
        createdAt: true,
        activatedAt: true,
      },
    }),
  ]);
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    country: org.country,
    businessType: org.businessType,
    salesChannel: org.salesChannel,
    createdAt: org.createdAt.toISOString(),
    members: org.members.map((m) => ({ email: m.user.email, name: m.user.name, role: m.role })),
    pass: {
      plan: usage.plan,
      inGrace: usage.inGrace,
      endsAt: usage.endsAt?.toISOString() ?? null,
      used: usage.used,
      included: usage.included,
      pending: usage.pending,
    },
    campaigns,
    purchases: purchases.map((p) => ({
      id: p.id,
      offer: p.offer ?? '',
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      provider: p.provider,
      at: (p.activatedAt ?? p.createdAt).toISOString(),
    })),
  };
}

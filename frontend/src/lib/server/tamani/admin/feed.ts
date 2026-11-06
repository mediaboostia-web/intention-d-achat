// The notifications feed of the support-admin (lot 13a, spec §6), read from
// the data: a verified e-mail is a sign-up, a new organization a shop, an
// activated order with an amount a payment, a failed or expired one a
// payment that did not go through. Each admin has their own last visit.
import 'server-only';
import type { PrismaClient } from '@prisma/client';
import {
  FEED_DAYS,
  FEED_PAGE_SIZE,
  FEED_UNREAD_CAP,
  feedTitle,
  feedTypes,
  paymentMethodLabel,
  type FeedFilter,
  type FeedItem,
  type FeedType,
} from '@/lib/tamani/admin-feed';
import { ADMIN_HOME } from '@/lib/tamani/admin-nav';
import { planLabel } from '@/lib/tamani/admin-view';
import { formatMoney } from '@/lib/tamani/currency';

type FeedDb = Pick<PrismaClient, 'user' | 'organization' | 'order'>;

const DAY_MS = 86_400_000;
const FAILED = ['FAILED', 'EXPIRED'];

/** Only the first word of a name: the feed never shows a whole name. */
function firstName(name: string | null | undefined): string | null {
  const word = name?.trim().split(/\s+/)[0];
  return word ? word : null;
}

const shopHref = (id: string | null) =>
  id ? `${ADMIN_HOME}/boutiques/${id}` : `${ADMIN_HOME}/boutiques`;

const join = (parts: (string | null | undefined)[]) =>
  parts.filter((p): p is string => Boolean(p)).join(' · ');

export async function loadAdminFeed(
  db: FeedDb,
  opts: { now: Date; type?: FeedFilter; before?: Date | null; limit?: number },
): Promise<{ items: FeedItem[]; next: Date | null }> {
  const limit = opts.limit ?? FEED_PAGE_SIZE;
  const since = new Date(opts.now.getTime() - FEED_DAYS * DAY_MS);
  const range = opts.before ? { gte: since, lt: opts.before } : { gte: since, lte: opts.now };
  const wanted = new Set<FeedType>(feedTypes(opts.type ?? 'tout'));
  const take = limit + 1;

  const [signups, shops, paid, failed] = await Promise.all([
    wanted.has('SIGNUP')
      ? db.user.findMany({
          where: { emailVerifiedAt: range },
          orderBy: [{ emailVerifiedAt: 'desc' }, { id: 'desc' }],
          take,
          select: {
            id: true,
            name: true,
            emailVerifiedAt: true,
            memberships: {
              where: { role: 'OWNER' },
              take: 1,
              select: { organization: { select: { name: true } } },
            },
          },
        })
      : [],
    wanted.has('SHOP')
      ? db.organization.findMany({
          where: { createdAt: range },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take,
          select: {
            id: true,
            name: true,
            createdAt: true,
            members: {
              where: { role: 'OWNER' },
              take: 1,
              select: { user: { select: { name: true } } },
            },
          },
        })
      : [],
    wanted.has('PAYMENT')
      ? db.order.findMany({
          where: { activatedAt: range, amount: { gt: 0 } },
          orderBy: [{ activatedAt: 'desc' }, { id: 'desc' }],
          take,
          select: {
            id: true,
            amount: true,
            currency: true,
            offer: true,
            paymentMethod: true,
            activatedAt: true,
            organizationId: true,
            organization: { select: { name: true } },
          },
        })
      : [],
    wanted.has('PAYMENT_FAILED')
      ? db.order.findMany({
          where: { status: { in: FAILED }, updatedAt: range, amount: { gt: 0 } },
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
          take,
          select: {
            id: true,
            amount: true,
            currency: true,
            offer: true,
            status: true,
            updatedAt: true,
            organizationId: true,
            organization: { select: { name: true } },
          },
        })
      : [],
  ]);

  const items: FeedItem[] = [
    ...signups.map((u) => ({
      id: `SIGNUP:${u.id}`,
      type: 'SIGNUP' as const,
      at: u.emailVerifiedAt ?? opts.now,
      title: feedTitle('SIGNUP'),
      detail: join([
        firstName(u.name) ?? 'Sans prénom',
        u.memberships[0]?.organization.name ?? 'pas encore de boutique',
      ]),
      href: `${ADMIN_HOME}/utilisateurs/${u.id}`,
    })),
    ...shops.map((o) => {
      const owner = firstName(o.members[0]?.user.name);
      return {
        id: `SHOP:${o.id}`,
        type: 'SHOP' as const,
        at: o.createdAt,
        title: feedTitle('SHOP'),
        detail: owner ? `${o.name}, ouverte par ${owner}` : o.name,
        href: shopHref(o.id),
      };
    }),
    ...paid.map((p) => ({
      id: `PAYMENT:${p.id}`,
      type: 'PAYMENT' as const,
      at: p.activatedAt ?? opts.now,
      title: feedTitle('PAYMENT'),
      detail: join([
        p.organization?.name ?? 'Boutique supprimée',
        p.offer ? planLabel(p.offer) : null,
        formatMoney(p.amount, p.currency),
        paymentMethodLabel(p.paymentMethod),
      ]),
      href: shopHref(p.organizationId),
    })),
    ...failed.map((f) => ({
      id: `PAYMENT_FAILED:${f.id}`,
      type: 'PAYMENT_FAILED' as const,
      at: f.updatedAt,
      title: feedTitle('PAYMENT_FAILED'),
      detail: join([
        f.organization?.name ?? 'Boutique supprimée',
        f.offer ? planLabel(f.offer) : null,
        formatMoney(f.amount, f.currency),
        f.status === 'EXPIRED' ? 'expiré' : 'échoué',
      ]),
      href: shopHref(f.organizationId),
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime() || (a.id < b.id ? 1 : -1));

  const page = items.slice(0, limit);
  const next = items.length > limit ? (page[page.length - 1]?.at ?? null) : null;
  return { items: page, next };
}

/** What is new since this admin's last visit (or the last 30 days), up to 99. */
export async function countUnreadFeed(
  db: FeedDb & Pick<PrismaClient, 'adminFeedSeen'>,
  userId: string,
  now: Date,
): Promise<number> {
  const seen = await db.adminFeedSeen.findUnique({ where: { userId } });
  const floor = new Date(now.getTime() - FEED_DAYS * DAY_MS);
  const since = seen && seen.seenAt > floor ? seen.seenAt : floor;
  const range = { gt: since, lte: now };
  const counts = await Promise.all([
    db.user.count({ where: { emailVerifiedAt: range } }),
    db.organization.count({ where: { createdAt: range } }),
    db.order.count({ where: { activatedAt: range, amount: { gt: 0 } } }),
    db.order.count({ where: { status: { in: FAILED }, updatedAt: range, amount: { gt: 0 } } }),
  ]);
  return Math.min(
    FEED_UNREAD_CAP,
    counts.reduce((a, b) => a + b, 0),
  );
}

export async function markFeedSeen(
  db: Pick<PrismaClient, 'adminFeedSeen'>,
  userId: string,
  now: Date,
): Promise<void> {
  await db.adminFeedSeen.upsert({
    where: { userId },
    create: { userId, seenAt: now },
    update: { seenAt: now },
  });
}

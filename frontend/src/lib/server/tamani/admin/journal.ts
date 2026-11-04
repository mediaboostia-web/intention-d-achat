// Support-admin journal (lot 11): the newest back-office actions, each with
// who did it and the name of what it touched. Read-only: AdminAction rows
// are written by logAdminAction and never changed.
import 'server-only';
import type { Prisma, PrismaClient } from '@prisma/client';
import { JOURNAL_SIZE_SHOWN, type JournalEntry } from '@/lib/tamani/admin-journal';
import { monthLabel } from '@/lib/tamani/admin-view';

type Db = Pick<PrismaClient, 'adminAction' | 'user' | 'organization'> & Prisma.TransactionClient;

export const JOURNAL_SIZE = JOURNAL_SIZE_SHOWN;

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

function idsOf(
  rows: readonly { targetType: string | null; targetId: string | null }[],
  type: string,
) {
  return [
    ...new Set(
      rows.flatMap((r) => (r.targetType === type && r.targetId !== null ? [r.targetId] : [])),
    ),
  ];
}

export async function loadJournal(db: Db): Promise<JournalEntry[]> {
  const rows = await db.adminAction.findMany({
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: JOURNAL_SIZE,
    select: {
      id: true,
      action: true,
      targetType: true,
      targetId: true,
      metadata: true,
      createdAt: true,
      actor: { select: { email: true } },
    },
  });

  const shopIds = idsOf(rows, 'Organization');
  const userIds = idsOf(rows, 'User');
  const [shops, users] = await Promise.all([
    shopIds.length === 0
      ? []
      : db.organization.findMany({
          where: { id: { in: shopIds } },
          select: { id: true, name: true },
        }),
    userIds.length === 0
      ? []
      : db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true } }),
  ]);
  const shopName = new Map(shops.map((s) => [s.id, s.name]));
  const userEmail = new Map(users.map((u) => [u.id, u.email]));

  function label(type: string, id: string): string | null {
    if (type === 'Organization') return shopName.get(id) ?? null;
    if (type === 'User') return userEmail.get(id) ?? null;
    if (type === 'MarketingSpend' && MONTH.test(id)) return monthLabel(id);
    return null;
  }

  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    actorEmail: r.actor.email,
    target:
      r.targetType === null || r.targetId === null
        ? null
        : { type: r.targetType, id: r.targetId, label: label(r.targetType, r.targetId) },
    metadata: r.metadata,
    createdAt: r.createdAt.toISOString(),
  }));
}

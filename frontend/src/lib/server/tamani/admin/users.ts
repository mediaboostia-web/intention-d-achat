// Support-admin accounts (lot 11, « Ajouter un utilisateur »): create one
// with a temporary password, list and read them. Suspending and changing a
// role go through the kit's routes.
import 'server-only';
import { randomInt } from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import { hashPassword } from '@/lib/server/auth';
import type { AdminUserList, AdminUserRow, UserQuery } from '@/lib/tamani/admin-users';
import { effectivePlan } from '../subscription';

/** Letters and digits a person reads aloud without a doubt: no 0/O/o, 1/l/I. */
export const TEMPORARY_ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function temporaryPassword(length = 12, pick: (n: number) => number = randomInt): string {
  return Array.from(
    { length },
    () => TEMPORARY_ALPHABET[pick(TEMPORARY_ALPHABET.length)] ?? '',
  ).join('');
}

const USER_FIELDS = { id: true, email: true, name: true, role: true, status: true } as const;

/**
 * A verified account (the super-admin vouches for the address) with a
 * temporary password, returned once to be passed on; only its hash is kept.
 * `null` when the e-mail is already taken.
 */
export async function createUserByAdmin(
  db: Pick<PrismaClient, 'user'>,
  input: { email: string; name: string },
  now: Date,
) {
  const taken = await db.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (taken) return null;
  const password = temporaryPassword();
  try {
    const user = await db.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash: await hashPassword(password),
        emailVerifiedAt: now,
      },
      select: USER_FIELDS,
    });
    return { user, temporaryPassword: password };
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') return null;
    throw err;
  }
}

export const USERS_PER_PAGE = 50;

const ROW_SELECT = {
  ...USER_FIELDS,
  emailVerifiedAt: true,
  createdAt: true,
  memberships: {
    where: { role: 'OWNER' },
    take: 1,
    select: {
      organization: {
        select: {
          id: true,
          name: true,
          subscription: { select: { plan: true, currentPeriodEnd: true, graceUntil: true } },
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

type Row = Prisma.UserGetPayload<{ select: typeof ROW_SELECT }>;

function toRow(r: Row, now: Date): AdminUserRow {
  const org = r.memberships[0]?.organization;
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role,
    status: r.status,
    verified: r.emailVerifiedAt !== null,
    createdAt: r.createdAt.toISOString(),
    shop: org
      ? { id: org.id, name: org.name, plan: effectivePlan(org.subscription, now).plan }
      : null,
  };
}

export async function listAdminUsers(
  db: Pick<PrismaClient, 'user'>,
  query: UserQuery,
  now: Date,
): Promise<AdminUserList> {
  const where: Prisma.UserWhereInput = query.q
    ? {
        OR: [
          { email: { contains: query.q, mode: 'insensitive' } },
          { name: { contains: query.q, mode: 'insensitive' } },
        ],
      }
    : {};
  const total = await db.user.count({ where });
  const pages = Math.max(1, Math.ceil(total / USERS_PER_PAGE));
  const page = Math.min(query.page, pages);
  const rows = await db.user.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    skip: (page - 1) * USERS_PER_PAGE,
    take: USERS_PER_PAGE,
    select: ROW_SELECT,
  });
  return { items: rows.map((r) => toRow(r, now)), total, page, pages };
}

export async function getAdminUser(
  db: Pick<PrismaClient, 'user'>,
  id: string,
  now: Date,
): Promise<AdminUserRow | null> {
  const row = await db.user.findUnique({ where: { id }, select: ROW_SELECT });
  return row ? toRow(row, now) : null;
}

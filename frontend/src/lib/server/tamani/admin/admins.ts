// The support-admin team (lot 13a, spec §5.2): list the admins, add one by
// e-mail (promote the account, or open it verified with a temporary
// password), change a role, remove one (back to USER, never deleted). Nobody
// changes their own role, and the last super-admin always stays.
import 'server-only';
import type { Prisma, PrismaClient } from '@prisma/client';
import { isAdminRole, type AdminRole, type AdminRow } from '@/lib/tamani/admin-team';
import { createUserByAdmin } from './users';

type Db = Pick<PrismaClient, 'user'>;
type Tx = Pick<Prisma.TransactionClient, 'user' | '$queryRaw'>;

const ROW_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  status: true,
  createdAt: true,
} as const satisfies Prisma.UserSelect;

type UserRecord = Prisma.UserGetPayload<{ select: typeof ROW_SELECT }>;

export function adminRow(
  u: Pick<UserRecord, 'id' | 'email' | 'name' | 'role' | 'createdAt'>,
): AdminRow {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role === 'SUPERADMIN' ? 'SUPERADMIN' : 'ADMIN',
    createdAt: u.createdAt.toISOString(),
  };
}

/** The admins, super-admins first, then by the date their account was opened. */
export async function listAdmins(db: Db): Promise<AdminRow[]> {
  const rows = await db.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPERADMIN'] } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: ROW_SELECT,
  });
  const rank = (role: string) => (role === 'SUPERADMIN' ? 0 : 1);
  return rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => rank(a.r.role) - rank(b.r.role) || a.i - b.i)
    .map(({ r }) => adminRow(r));
}

export type AddAdminResult =
  | { kind: 'PROMOTED'; user: UserRecord }
  | { kind: 'CREATED'; user: UserRecord; temporaryPassword: string }
  | { kind: 'ALREADY_ADMIN'; user: UserRecord };

/**
 * Adds an admin by e-mail. A new account is named after its e-mail's first
 * part when no name is given. Runs inside the caller's transaction.
 */
export async function addAdmin(
  tx: Tx,
  input: { email: string; name?: string; role: AdminRole },
  now: Date,
): Promise<AddAdminResult> {
  const existing = await tx.user.findUnique({ where: { email: input.email }, select: ROW_SELECT });
  if (existing && isAdminRole(existing.role)) return { kind: 'ALREADY_ADMIN', user: existing };
  if (existing) {
    const user = await tx.user.update({
      where: { id: existing.id },
      data: { role: input.role },
      select: ROW_SELECT,
    });
    return { kind: 'PROMOTED', user };
  }
  const name = input.name?.trim() || input.email.split('@')[0] || input.email;
  const created = await createUserByAdmin(tx, { email: input.email, name }, now);
  // Another admin opened the same address at the same moment: the unique
  // e-mail refused this one, and the transaction can only roll back.
  if (!created) throw new Error('admin e-mail taken during the add');
  const user = await tx.user.update({
    where: { id: created.user.id },
    data: { role: input.role },
    select: ROW_SELECT,
  });
  return { kind: 'CREATED', user, temporaryPassword: created.temporaryPassword };
}

export type ChangeRoleResult =
  | { kind: 'OK'; from: string; to: string; user: UserRecord }
  | { kind: 'NOT_FOUND' }
  | { kind: 'SELF' }
  | { kind: 'LAST_SUPERADMIN' };

/**
 * Changes an account's role (USER removes it from the team). The
 * super-admins are counted under a row lock, so two super-admins demoting
 * each other at the same moment cannot both succeed.
 */
export async function changeAdminRole(
  tx: Tx,
  actorId: string,
  targetId: string,
  role: 'USER' | AdminRole,
): Promise<ChangeRoleResult> {
  if (actorId === targetId) return { kind: 'SELF' };
  const target = await tx.user.findUnique({ where: { id: targetId }, select: ROW_SELECT });
  if (!target) return { kind: 'NOT_FOUND' };
  if (target.role === 'SUPERADMIN' && role !== 'SUPERADMIN') {
    const supers = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "User" WHERE role = 'SUPERADMIN' FOR UPDATE`;
    if (supers.length <= 1) return { kind: 'LAST_SUPERADMIN' };
  }
  const user =
    target.role === role
      ? target
      : await tx.user.update({ where: { id: targetId }, data: { role }, select: ROW_SELECT });
  return { kind: 'OK', from: target.role, to: role, user };
}

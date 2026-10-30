// Postgres advisory locks scoped to the current transaction: two requests
// that must not interleave (two "create my shop" taps, two campaign
// activations against the FREE limit) queue on the same key and the lock
// is released at commit or rollback.
import 'server-only';
import type { Prisma } from '@prisma/client';

/** The Prisma client or a transaction client. */
export type Db = Prisma.TransactionClient;

export async function advisoryXactLock(tx: Db, key: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
}

/** Counting a shop's answers against its pass (lot 8): completions and unlocks queue here. */
export function quotaLock(organizationId: string): string {
  return `quota:${organizationId}`;
}

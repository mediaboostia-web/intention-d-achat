// Pass purchases through SasPay (lot 8). Task 9 writes the reconciliation;
// until then the webhook's wake-up has nothing to run.
import 'server-only';
import type { PrismaClient } from '@prisma/client';
import type { SaspayClient } from '@/lib/server/payments/saspay';

/** Reconciles the shops' pending SasPay purchases; returns how many were activated. */
export async function reconcilePendingOrders(
  db: PrismaClient,
  saspay: SaspayClient,
  now: Date,
  limit = 10,
): Promise<number> {
  void db;
  void saspay;
  void now;
  void limit;
  return 0;
}

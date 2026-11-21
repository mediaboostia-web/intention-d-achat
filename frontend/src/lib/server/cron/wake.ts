// Let Neon sleep (2026-11-21). The free plan counts every hour the database is
// awake, and it falls asleep only after ~5 quiet minutes; a cron asking it
// « anything to do? » every minute kept it awake all month and spent the quota.
//
// So the frequent crons ask Redis first. Whoever creates work (an outbox row,
// a SasPay checkout) leaves a mark there for a while; without a mark the cron
// stops before touching Postgres. Once an hour it runs anyway (the sweep), so
// a lost mark or a retry scheduled later only waits, never gets lost. Without
// Redis, or when it fails, the cron runs every time, as before.
import 'server-only';
import type { Redis } from '@/lib/server/redis';
import { redis as defaultRedis } from '@/lib/server/redis';

export type WakeKind = 'outbox' | 'billing';
export type WakeStore = Pick<Redis, 'set' | 'exists'>;

export const SWEEP_EVERY_MS = 60 * 60 * 1000;

const markKey = (kind: WakeKind) => `wake:${kind}`;
const sweepKey = (kind: WakeKind) => `wake:${kind}:sweep`;

/** There is (or soon will be) work of this kind: keep its cron running for `ttlMs`. Never throws. */
export async function markWork(
  kind: WakeKind,
  ttlMs: number,
  store: WakeStore | null | undefined = defaultRedis,
): Promise<void> {
  if (!store) return;
  try {
    await store.set(markKey(kind), Date.now(), { px: ttlMs });
  } catch {
    // The hourly sweep picks the work up.
  }
}

/** Should the cron of this kind touch the database now? */
export async function hasWork(
  kind: WakeKind,
  store: WakeStore | null | undefined = defaultRedis,
): Promise<boolean> {
  if (!store) return true;
  try {
    if ((await store.exists(markKey(kind))) > 0) return true;
    const first = await store.set(sweepKey(kind), Date.now(), { px: SWEEP_EVERY_MS, nx: true });
    return first === 'OK';
  } catch {
    return true;
  }
}

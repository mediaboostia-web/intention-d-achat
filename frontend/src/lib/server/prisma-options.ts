import type { Prisma } from '@prisma/client';

// Prisma closes an interactive transaction after 5 s (and waits 2 s to start
// one). Next to the database that is plenty; from a dev machine where each
// round trip to Neon takes a second, creating a shop runs out of time.
// PRISMA_TX_TIMEOUT_MS / PRISMA_TX_MAX_WAIT_MS raise the limits; unset, or not
// a whole number of milliseconds, Prisma keeps its own.
function milliseconds(raw: string | undefined): number | undefined {
  if (!raw || !/^\d+$/.test(raw)) return undefined;
  const n = Number(raw);
  return n > 0 ? n : undefined;
}

export function prismaClientOptions(
  env: Record<string, string | undefined>,
): Prisma.PrismaClientOptions {
  const maxWait = milliseconds(env.PRISMA_TX_MAX_WAIT_MS);
  const timeout = milliseconds(env.PRISMA_TX_TIMEOUT_MS);
  if (maxWait === undefined && timeout === undefined) return {};
  return {
    transactionOptions: {
      ...(maxWait !== undefined && { maxWait }),
      ...(timeout !== undefined && { timeout }),
    },
  };
}

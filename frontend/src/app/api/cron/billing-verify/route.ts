// GET|POST /api/cron/billing-verify — reconciles the SasPay purchases still
// open (lot 8): a pass paid while the return page and the webhook both
// missed it opens here. Vercel Cron calls GET; POST stays for manual runs.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { verifyCronSecret } from '@/lib/server/cron/auth';
import { withLease } from '@/lib/server/leader-lease';
import { createLogger } from '@/lib/server/logger';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { getSaspay } from '@/lib/server/payments/saspay';
import { prisma } from '@/lib/server/prisma';
import { redis } from '@/lib/server/redis';
import { reconcilePendingOrders } from '@/lib/server/tamani/billing';

const log = createLogger();
const LEASE_TTL_MS = 60_000; // ~2 × maxDuration

async function run(req: NextRequest): Promise<NextResponse> {
  const fail = verifyCronSecret(req);
  if (fail) return fail;

  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    let activated = 0;
    const saspay = getSaspay();
    if (saspay) {
      await withLease(redis ?? undefined, 'billing-verify', LEASE_TTL_MS, async () => {
        activated = await reconcilePendingOrders(prisma, saspay, new Date());
        log.info('billing-verify tick', { activated, requestId: ctx.requestId });
      });
    }
    return NextResponse.json(
      { ok: true, activated },
      { headers: { 'x-request-id': ctx.requestId } },
    );
  });
}

export const GET = run;
export const POST = run;

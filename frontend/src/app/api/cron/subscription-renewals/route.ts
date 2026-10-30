// GET|POST /api/cron/subscription-renewals — the daily pass notices (lot 8):
// 3 days before a paid pass ends (with an email), when its grace starts,
// and when the free trial is over. Vercel Cron calls GET; POST stays for
// manual runs. Without the email queue the notices still reach the bell.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { verifyCronSecret } from '@/lib/server/cron/auth';
import { withLease } from '@/lib/server/leader-lease';
import { createLogger } from '@/lib/server/logger';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { getEmailQueue } from '@/lib/server/queues/email-queue-singleton';
import { redis } from '@/lib/server/redis';
import { runRenewals } from '@/lib/server/tamani/renewals';

const log = createLogger();
const LEASE_TTL_MS = 60_000; // ~2 × maxDuration

async function run(req: NextRequest): Promise<NextResponse> {
  const fail = verifyCronSecret(req);
  if (fail) return fail;

  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    let counts = { reminders: 0, graces: 0, trialsEnded: 0 };
    await withLease(redis ?? undefined, 'subscription-renewals', LEASE_TTL_MS, async () => {
      counts = await runRenewals(prisma, new Date(), getEmailQueue());
      log.info('subscription-renewals tick', { ...counts, requestId: ctx.requestId });
    });
    return NextResponse.json(
      { ok: true, ...counts },
      { headers: { 'x-request-id': ctx.requestId } },
    );
  });
}

export const GET = run;
export const POST = run;

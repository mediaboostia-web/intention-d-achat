/**
 * POST /api/webhooks/saspay — SasPay's signed webhook, a reconciliation signal.
 *
 * The kit's handler (lib/server/webhook/handler.ts, PROTECTED) reads the raw
 * body, checks the signature, and records the event once in WebhookLog. Its
 * transaction does nothing else: the body names a transaction, not our
 * checkout session, so a paid or failed event only wakes the idempotent
 * reconciliation after the reply (after()). The return page and the
 * billing-verify cron run the same reconciliation, so a lost wake-up loses
 * nothing. This file never reads the request body itself.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import { after, type NextRequest, type NextResponse } from 'next/server';
import { log } from '@/lib/server/observability/log';
import { getSaspay } from '@/lib/server/payments/saspay';
import { prisma } from '@/lib/server/prisma';
import { reconcilePendingOrders } from '@/lib/server/tamani/billing';
import { tamaniError } from '@/lib/server/tamani/errors';
import { createWebhookHandler } from '@/lib/server/webhook/handler';
import { saspayWebhookProvider, saspayWebhookSecret } from '@/lib/server/webhook/saspay';

async function wakeReconciliation(): Promise<void> {
  const saspay = getSaspay();
  if (!saspay) return;
  try {
    await reconcilePendingOrders(prisma, saspay, new Date());
  } catch (err) {
    log.warn('saspay webhook reconciliation failed', { err: String(err) });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!saspayWebhookSecret()) return tamaniError('BILLING_NOT_CONFIGURED', 503);
  // Set by the kit's dispatch, which skips a deduped replay.
  let wake = false;
  const signal = async () => {
    wake = true;
    return {};
  };
  const res = await createWebhookHandler({
    prisma,
    provider: saspayWebhookProvider,
    onPaid: signal,
    onFailed: signal,
  })(req);
  if (res.status === 200 && wake) after(wakeReconciliation);
  return res;
}

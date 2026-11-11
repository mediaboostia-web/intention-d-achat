// POST /api/admin-gate/code (lot 11c): e-mails the signed-in admin the code
// that opens the support-admin door. Before the door, so requireAdmin and
// not gatedAdmin. Sequence: context → CSRF → admin → rate limit → send.
export const runtime = 'nodejs';

import 'server-only';
import { after, NextResponse, type NextRequest } from 'next/server';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { getEmailQueue } from '@/lib/server/queues/email-queue-singleton';
import { issueAdminCode } from '@/lib/server/tamani/admin/gate-code';
import { tamaniError } from '@/lib/server/tamani/errors';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAdmin('ADMIN');
    if (auth instanceof NextResponse) return auth;

    const limited = await enforceAdminRateLimit(auth.admin.id);
    if (limited) return limited;

    const queue = getEmailQueue();
    if (!queue) return tamaniError('ADMIN_CODE_UNAVAILABLE', 503);

    const result = await issueAdminCode(prisma, queue, auth.admin);
    if (result === 'too-many') return tamaniError('ADMIN_CODE_TOO_MANY', 429);

    // The queue is drained every minute; send this one now, past the reply,
    // so the admin waits neither for the cron nor for the provider. A
    // failure here is not one: the cron will retry.
    after(async () => {
      await queue.drainOne().catch(() => false);
    });

    return NextResponse.json({ sent: true }, { headers: { 'x-request-id': ctx.requestId } });
  });
}

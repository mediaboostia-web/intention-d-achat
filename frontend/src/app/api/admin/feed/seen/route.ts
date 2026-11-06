// POST /api/admin/feed/seen (any admin), lot 13a: this admin opened the
// notifications, so their badge goes back to zero. Another admin's badge
// does not move. Called once by the page in the browser, never by a link
// prefetch. Not journaled: it changes no data anyone else sees.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { markFeedSeen } from '@/lib/server/tamani/admin/feed';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;
    const auth = await requireAdmin('ADMIN');
    if (auth instanceof NextResponse) return auth;
    const limited = await enforceAdminRateLimit(auth.admin.id);
    if (limited) return limited;

    await markFeedSeen(prisma, auth.admin.id, new Date());
    return NextResponse.json({ seen: true }, { headers: { 'x-request-id': ctx.requestId } });
  });
}

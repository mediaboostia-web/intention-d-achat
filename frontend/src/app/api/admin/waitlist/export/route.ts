// GET /api/admin/waitlist/export (any admin), lot 14: the waitlist as a CSV
// that Excel opens, to call the sellers back. Never cached.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { listWaitlist, waitlistCsv } from '@/lib/server/tamani/waitlist';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAdmin('ADMIN');
    if (auth instanceof NextResponse) return auth;
    const limited = await enforceAdminRateLimit(auth.admin.id);
    if (limited) return limited;

    const csv = waitlistCsv(await listWaitlist(prisma));
    const day = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="liste-attente-${day}.csv"`,
        'cache-control': 'no-store',
        'x-request-id': ctx.requestId,
      },
    });
  });
}

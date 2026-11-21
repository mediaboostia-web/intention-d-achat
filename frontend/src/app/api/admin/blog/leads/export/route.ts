// GET /api/admin/blog/leads/export (any admin), lot 13d: the contacts the
// guides brought, as a CSV that Excel opens. Never cached.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { gatedAdmin } from '@/lib/server/tamani/admin/gate';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { leadsCsv, listLeads } from '@/lib/server/tamani/blog';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await gatedAdmin('ADMIN');
    if (auth instanceof NextResponse) return auth;
    const limited = await enforceAdminRateLimit(auth.admin.id);
    if (limited) return limited;

    const csv = leadsCsv(await listLeads(prisma, 10_000));
    const day = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="contacts-blog-${day}.csv"`,
        'cache-control': 'no-store',
        'x-request-id': ctx.requestId,
      },
    });
  });
}

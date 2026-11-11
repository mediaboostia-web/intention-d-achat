// POST /api/admin-gate/leave (lot 11c): closes the support-admin door on
// this browser. Called before sign-out; it needs no session, only the CSRF
// token, since all it can do is remove a cookie.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { verifyCsrf } from '@/lib/server/auth';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { clearAdminGateCookie } from '@/lib/server/tamani/admin/gate';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;
    await clearAdminGateCookie();
    return NextResponse.json({ closed: true }, { headers: { 'x-request-id': ctx.requestId } });
  });
}

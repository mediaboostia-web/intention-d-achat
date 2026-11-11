// POST /api/admin-gate/verify (lot 11c): the code opens the support-admin
// door for twelve hours on this browser. Sequence: context → CSRF → admin →
// rate limit → zod → check → journal + cookie.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf, VERIFICATION_CODE_REGEX } from '@/lib/server/auth';
import { logAdminAction } from '@/lib/server/admin/audit';
import { requireAdmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { setAdminGateCookie } from '@/lib/server/tamani/admin/gate';
import { checkAdminCode } from '@/lib/server/tamani/admin/gate-code';
import { tamaniError } from '@/lib/server/tamani/errors';

const Body = z.object({
  code: z
    .string()
    .max(20)
    .transform((s) => s.replace(/\s+/g, '').toUpperCase())
    .pipe(z.string().regex(VERIFICATION_CODE_REGEX)),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAdmin('ADMIN');
    if (auth instanceof NextResponse) return auth;

    const limited = await enforceAdminRateLimit(auth.admin.id);
    if (limited) return limited;

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return tamaniError('ADMIN_CODE_INVALID', 400);

    const result = await checkAdminCode(prisma, auth.admin.id, parsed.data.code);
    if (result !== 'ok') return tamaniError('ADMIN_CODE_INVALID', 400);

    await logAdminAction(prisma, {
      actorId: auth.admin.id,
      action: 'admin.door_opened',
      targetType: 'User',
      targetId: auth.admin.id,
    });
    await setAdminGateCookie(auth.admin.id);
    return NextResponse.json({ open: true }, { headers: { 'x-request-id': ctx.requestId } });
  });
}

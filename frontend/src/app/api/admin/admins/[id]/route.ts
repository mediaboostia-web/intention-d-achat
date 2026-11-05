// PATCH /api/admin/admins/[id] (super-admin), lot 13a: change an admin's
// role, or remove them from the team (role USER, the account stays). Nobody
// changes their own role; the last super-admin always stays. Journaled with
// the role before and after.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { logAdminAction } from '@/lib/server/admin/audit';
import { requireSuperadmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { adminRow, changeAdminRole } from '@/lib/server/tamani/admin/admins';
import { tamaniError } from '@/lib/server/tamani/errors';

const Body = z.object({ role: z.enum(['USER', 'ADMIN', 'SUPERADMIN']) });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;
    const auth = await requireSuperadmin();
    if (auth instanceof NextResponse) return auth;
    const limited = await enforceAdminRateLimit(auth.admin.id);
    if (limited) return limited;

    const { id } = await params;
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid request body' },
        { status: 400 },
      );
    }
    const result = await prisma.$transaction(async (tx) => {
      const r = await changeAdminRole(tx, auth.admin.id, id, parsed.data.role);
      if (r.kind === 'OK' && r.from !== r.to) {
        await logAdminAction(tx, {
          actorId: auth.admin.id,
          action: 'admin.role_change',
          targetType: 'User',
          targetId: id,
          metadata: { from: r.from, to: r.to },
        });
      }
      return r;
    });
    if (result.kind === 'SELF') return tamaniError('ADMIN_SELF_CHANGE', 409);
    if (result.kind === 'LAST_SUPERADMIN') return tamaniError('ADMIN_LAST_SUPERADMIN', 409);
    if (result.kind === 'NOT_FOUND') return tamaniError('ADMIN_NOT_FOUND', 404);
    return NextResponse.json(
      { admin: { ...adminRow(result.user), role: result.to } },
      { headers: { 'x-request-id': ctx.requestId } },
    );
  });
}

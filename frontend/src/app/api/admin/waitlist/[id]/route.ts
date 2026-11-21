// DELETE /api/admin/waitlist/[id] (super-admin, 2026-11-21): remove one waitlist
// entry (a test, a double, a seller who asked to be forgotten). Journaled
// without the contact: only the entry's id goes to the audit log.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { verifyCsrf } from '@/lib/server/auth';
import { gatedSuperadmin } from '@/lib/server/tamani/admin/gate';
import { prisma } from '@/lib/server/prisma';
import { logAdminAction } from '@/lib/server/admin/audit';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

type Params = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;
    const auth = await gatedSuperadmin();
    if (auth instanceof NextResponse) return auth;
    const limited = await enforceAdminRateLimit(auth.admin.id);
    if (limited) return limited;

    const { id } = await params;
    const deleted = await prisma.$transaction(async (tx) => {
      const entry = await tx.waitlistEntry.findUnique({ where: { id }, select: { id: true } });
      if (!entry) return false;
      await tx.waitlistEntry.delete({ where: { id } });
      await logAdminAction(tx, {
        actorId: auth.admin.id,
        action: 'waitlist.delete',
        targetType: 'WaitlistEntry',
        targetId: id,
      });
      return true;
    });
    if (!deleted) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Waitlist entry not found' },
        { status: 404 },
      );
    }
    return NextResponse.json({ deleted: true }, { headers: { 'x-request-id': ctx.requestId } });
  });
}

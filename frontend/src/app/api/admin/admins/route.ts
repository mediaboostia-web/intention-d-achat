// GET /api/admin/admins (any admin) and POST (super-admin), lot 13a: the
// support-admin team. POST adds an admin by e-mail: the account is promoted,
// or opened verified with a temporary password handed back once (no-store)
// and never journaled.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { logAdminAction } from '@/lib/server/admin/audit';
import { requireAdmin, requireSuperadmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { addAdmin, adminRow, listAdmins } from '@/lib/server/tamani/admin/admins';
import { tamaniError } from '@/lib/server/tamani/errors';
import { zEmail } from '@/lib/server/zod-helpers';

const AddBody = z.object({
  email: zEmail,
  name: z.string().trim().max(80).optional(),
  role: z.enum(['ADMIN', 'SUPERADMIN']),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAdmin('ADMIN');
    if (auth instanceof NextResponse) return auth;
    const limited = await enforceAdminRateLimit(auth.admin.id);
    if (limited) return limited;

    const admins = await listAdmins(prisma);
    return NextResponse.json({ admins }, { headers: { 'x-request-id': ctx.requestId } });
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;
    const auth = await requireSuperadmin();
    if (auth instanceof NextResponse) return auth;
    const limited = await enforceAdminRateLimit(auth.admin.id);
    if (limited) return limited;

    const parsed = AddBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid request body' },
        { status: 400 },
      );
    }
    const { email, name, role } = parsed.data;
    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const r = await addAdmin(tx, { email, role, ...(name ? { name } : {}) }, now);
      if (r.kind === 'ALREADY_ADMIN') return r;
      await logAdminAction(tx, {
        actorId: auth.admin.id,
        action: 'admin.add',
        targetType: 'User',
        targetId: r.user.id,
        metadata: { created: r.kind === 'CREATED', role },
      });
      return r;
    });
    if (result.kind === 'ALREADY_ADMIN') return tamaniError('ADMIN_ALREADY', 409);
    return NextResponse.json(
      {
        admin: adminRow(result.user),
        ...(result.kind === 'CREATED' && { temporaryPassword: result.temporaryPassword }),
      },
      { status: 201, headers: { 'x-request-id': ctx.requestId, 'cache-control': 'no-store' } },
    );
  });
}

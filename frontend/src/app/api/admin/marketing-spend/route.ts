// PUT /api/admin/marketing-spend (lot 11): the month's marketing spend, which
// the CAC divides by the shops that paid a first pass. Super-admin only,
// journaled with the amount before and after.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { gatedSuperadmin } from '@/lib/server/tamani/admin/gate';
import { prisma } from '@/lib/server/prisma';
import { logAdminAction } from '@/lib/server/admin/audit';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { MONTH } from '@/lib/server/tamani/admin/metrics';

const Body = z.object({
  month: z.string().regex(MONTH),
  amount: z.number().int().min(0).max(1_000_000_000),
});

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await gatedSuperadmin();
    if (auth instanceof NextResponse) return auth;

    const limited = await enforceAdminRateLimit(auth.admin.id);
    if (limited) return limited;

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Invalid request body' },
        { status: 400 },
      );
    }
    const { month, amount } = parsed.data;
    const spend = await prisma.$transaction(async (tx) => {
      const before = await tx.marketingSpend.findUnique({
        where: { month },
        select: { amount: true },
      });
      const row = await tx.marketingSpend.upsert({
        where: { month },
        create: { month, amount, updatedById: auth.admin.id },
        update: { amount, updatedById: auth.admin.id },
        select: { month: true, amount: true },
      });
      await logAdminAction(tx, {
        actorId: auth.admin.id,
        action: 'marketing.spend_set',
        targetType: 'MarketingSpend',
        targetId: month,
        metadata: { from: before?.amount ?? null, to: amount },
      });
      return row;
    });
    return NextResponse.json({ spend }, { headers: { 'x-request-id': ctx.requestId } });
  });
}

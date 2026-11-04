// POST / DELETE /api/admin/shops/[orgId]/pass (lot 11): grant a pass by hand
// (a gift, a payment received outside SasPay, the Unlimited pass on quote) or
// end it at once. Super-admin only; each write is journaled.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireSuperadmin } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { logAdminAction } from '@/lib/server/admin/audit';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { endPass, grantPass, grantTerms, notifyGrant } from '@/lib/server/tamani/admin/grant';
import { PASS_IDS } from '@/lib/tamani/plans';

const Body = z.object({
  plan: z.enum([...PASS_IDS, 'UNLIMITED']),
  /** What the shop paid outside SasPay, in FCFA; 0 for a gift. */
  amount: z.number().int().min(0).max(100_000_000),
  days: z.number().int().min(1).max(366).optional(),
  responses: z.number().int().min(1).max(1_000_000).optional(),
});

type Params = { params: Promise<{ orgId: string }> };

const invalid = () =>
  NextResponse.json(
    { error: 'VALIDATION_FAILED', message: 'Invalid request body' },
    { status: 400 },
  );
const notFound = () =>
  NextResponse.json({ error: 'SHOP_NOT_FOUND', message: 'Shop not found' }, { status: 404 });

/** CSRF, then the super-admin, then the rate limit: the kit's order. */
async function gate(req: NextRequest) {
  const csrfFail = verifyCsrf(req);
  if (csrfFail) return csrfFail;
  const auth = await requireSuperadmin();
  if (auth instanceof NextResponse) return auth;
  const limited = await enforceAdminRateLimit(auth.admin.id);
  return limited ?? auth;
}

export async function POST(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await gate(req);
    if (auth instanceof NextResponse) return auth;
    const { orgId } = await params;
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return invalid();
    const terms = grantTerms(parsed.data);
    if (!terms) return invalid();
    const { amount } = parsed.data;
    const now = new Date();
    const granted = await prisma.$transaction(async (tx) => {
      const result = await grantPass(tx, { organizationId: orgId, terms, amount }, now);
      if (!result) return null;
      await logAdminAction(tx, {
        actorId: auth.admin.id,
        action: 'shop.pass_grant',
        targetType: 'Organization',
        targetId: orgId,
        metadata: { ...terms, amount, orderId: result.orderId },
      });
      return result;
    });
    if (!granted) return notFound();
    await notifyGrant(
      prisma,
      { organizationId: orgId, orderId: granted.orderId, plan: terms.plan, endsAt: granted.endsAt },
      now,
    );
    return NextResponse.json(
      { orderId: granted.orderId, endsAt: granted.endsAt.toISOString() },
      { status: 201, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}

export async function DELETE(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await gate(req);
    if (auth instanceof NextResponse) return auth;
    const { orgId } = await params;
    const ended = await prisma.$transaction(async (tx) => {
      const result = await endPass(tx, orgId);
      if (!result) return null;
      await logAdminAction(tx, {
        actorId: auth.admin.id,
        action: 'shop.pass_end',
        targetType: 'Organization',
        targetId: orgId,
        metadata: { from: result.from },
      });
      return result;
    });
    if (!ended) return notFound();
    return NextResponse.json({ ended: true }, { headers: { 'x-request-id': ctx.requestId } });
  });
}

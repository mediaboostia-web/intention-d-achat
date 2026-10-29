// GET /api/shops/me — the caller's shop and role, the pass meter (answers
// counted, included and pending) and the person's name (greeting, avatar), or 404
// SHOP_NOT_FOUND (the shop space sends a new account to /app/bienvenue).
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { tamaniError } from '@/lib/server/tamani/errors';
import { jsonOk } from '@/lib/server/tamani/http';
import { passUsage } from '@/lib/server/tamani/quota';
import { toShop } from '@/lib/server/tamani/serializers';
import { getShopForUser, shopHasProducts } from '@/lib/server/tamani/shop';
import { firstName } from '@/lib/tamani/names';

export async function GET(req: NextRequest): Promise<NextResponse> {
  return withRequestContext(makeRequestContext(req.headers), async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const found = await getShopForUser(prisma, auth.user.sub);
    if (!found) return tamaniError('SHOP_NOT_FOUND', 404);
    const org = await prisma.organization.findUnique({
      where: { id: found.organizationId },
      include: { subscription: true },
    });
    if (!org) return tamaniError('SHOP_NOT_FOUND', 404);
    const now = new Date();
    const [usage, user, locked] = await Promise.all([
      passUsage(prisma, org.id, now),
      prisma.user.findUnique({ where: { id: auth.user.sub }, select: { name: true } }),
      shopHasProducts(prisma, org.id),
    ]);
    return jsonOk({
      shop: toShop(org, org.subscription, now, locked),
      role: found.role,
      usage: {
        used: usage.used,
        included: usage.included,
        endsAt: usage.endsAt?.toISOString() ?? null,
        inGrace: usage.inGrace,
        pending: usage.pending,
      },
      me: { firstName: firstName(user?.name), name: user?.name?.trim() || null },
    });
  });
}

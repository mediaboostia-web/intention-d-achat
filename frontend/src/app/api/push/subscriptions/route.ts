// POST|DELETE /api/push/subscriptions — the browsers of the signed-in user
// that receive Web Push. An endpoint belongs to one browser: subscribing it
// again (another account on the same phone) moves it to the current user.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { jsonOk, readJson, validationFailed } from '@/lib/server/tamani/http';

const endpoint = z.url({ protocol: /^https$/ }).max(1000);
const Subscribe = z.object({
  endpoint,
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});
const Unsubscribe = z.object({ endpoint });

export async function POST(req: NextRequest) {
  return withRequestContext(makeRequestContext(req.headers), async () => {
    const csrf = verifyCsrf(req);
    if (csrf) return csrf;
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const parsed = Subscribe.safeParse(await readJson(req));
    if (!parsed.success) return validationFailed();
    const { endpoint: url, keys } = parsed.data;
    const userId = auth.user.sub;
    await prisma.pushSubscription.upsert({
      where: { endpoint: url },
      create: { userId, endpoint: url, p256dh: keys.p256dh, auth: keys.auth },
      update: { userId, p256dh: keys.p256dh, auth: keys.auth },
    });
    return jsonOk({ ok: true });
  });
}

export async function DELETE(req: NextRequest) {
  return withRequestContext(makeRequestContext(req.headers), async () => {
    const csrf = verifyCsrf(req);
    if (csrf) return csrf;
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const parsed = Unsubscribe.safeParse(await readJson(req));
    if (!parsed.success) return validationFailed();
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: parsed.data.endpoint, userId: auth.user.sub },
    });
    return jsonOk({ ok: true });
  });
}

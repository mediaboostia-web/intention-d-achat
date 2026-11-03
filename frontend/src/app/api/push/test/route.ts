// POST /api/push/test — « Tester la notification » (2026-11-04): one push to
// the signed-in user's own browsers, so a wholesaler hears their phone ring
// and we learn whether the push left. Answers { devices, sent, failed }.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { pushConfigured, sendPush } from '@/lib/server/push/web-push';
import { jsonOk } from '@/lib/server/tamani/http';

export async function POST(req: NextRequest) {
  return withRequestContext(makeRequestContext(req.headers), async () => {
    const csrf = verifyCsrf(req);
    if (csrf) return csrf;
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    if (!pushConfigured()) {
      return NextResponse.json({ error: 'PUSH_NOT_CONFIGURED' }, { status: 503 });
    }
    const userId = auth.user.sub;
    const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        const result = await sendPush(sub, {
          title: 'Tamani',
          body: 'Les notifications marchent sur cet appareil.',
          url: '/app/reglages#notifications',
          tag: 'tamani-test',
        });
        if (result === 'GONE') {
          await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint, userId } });
        }
        return result;
      }),
    );
    return jsonOk({
      devices: subscriptions.length,
      sent: results.filter((r) => r === 'SENT').length,
      failed: results.filter((r) => r === 'FAILED').length,
    });
  });
}

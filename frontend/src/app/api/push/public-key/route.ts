// GET /api/push/public-key — the VAPID public key a browser needs to
// subscribe to Web Push. Public by nature; 503 while push is not set up.
export const runtime = 'nodejs';

import 'server-only';
import type { NextRequest } from 'next/server';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { vapidPublicKey } from '@/lib/server/push/web-push';
import { tamaniError } from '@/lib/server/tamani/errors';
import { jsonOk } from '@/lib/server/tamani/http';

export async function GET(req: NextRequest) {
  return withRequestContext(makeRequestContext(req.headers), async () => {
    const publicKey = vapidPublicKey();
    return publicKey ? jsonOk({ publicKey }) : tamaniError('PUSH_NOT_CONFIGURED', 503);
  });
}

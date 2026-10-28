// PATCH /api/account: the signed-in person changes their own name (Profil,
// porteur's feedback 2, §8). The kit has no route for it; this one follows
// the kit's pattern: request context, CSRF, then the session. Only the
// signed-in user is updated: the body carries no id, and zod drops extra
// keys. The name never goes into the logs.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { log } from '@/lib/server/observability/log';
import { jsonOk, readJson, validationFailed } from '@/lib/server/tamani/http';
import { PROFILE_NAME_MAX } from '@/lib/tamani/names';

const Body = z.object({ name: z.string().trim().min(1).max(PROFILE_NAME_MAX) });

export async function PATCH(req: NextRequest) {
  return withRequestContext(makeRequestContext(req.headers), async () => {
    const csrf = verifyCsrf(req);
    if (csrf) return csrf;
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const parsed = Body.safeParse(await readJson(req));
    if (!parsed.success) return validationFailed();
    const user = await prisma.user.update({
      where: { id: auth.user.sub },
      data: { name: parsed.data.name },
      select: { name: true },
    });
    log.info('account name changed', { userId: auth.user.sub });
    return jsonOk({ user: { name: user.name } });
  });
}

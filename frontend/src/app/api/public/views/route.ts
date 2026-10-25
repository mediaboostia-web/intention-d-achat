// POST /api/public/views — a respondent opened a share link. Counted once
// per device and per day, for the dashboard's opens and conversion rate.
// No CSRF, like every /api/public route (spec §6.5).
export const runtime = 'nodejs';

import 'server-only';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { tamaniError } from '@/lib/server/tamani/errors';
import { jsonOk, readJson, validationFailed } from '@/lib/server/tamani/http';
import { viewSchema } from '@/lib/server/tamani/inputs';
import { enforcePublicRateLimit, isFirstViewToday } from '@/lib/server/tamani/public-limits';

export async function POST(req: NextRequest) {
  return withRequestContext(makeRequestContext(req.headers), async () => {
    const parsed = viewSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationFailed();
    const { code, deviceId } = parsed.data;

    const link = await prisma.campaignLink.findUnique({
      where: { code },
      select: { id: true, campaignId: true },
    });
    if (!link) return tamaniError('CAMPAIGN_NOT_FOUND', 404);
    const limited = await enforcePublicRateLimit(req, link.campaignId, deviceId);
    if (limited) return limited;

    if (await isFirstViewToday(link.id, deviceId, new Date())) {
      await prisma.campaignLink.update({
        where: { id: link.id },
        data: { openCount: { increment: 1 } },
      });
    }
    return jsonOk({ ok: true });
  });
}

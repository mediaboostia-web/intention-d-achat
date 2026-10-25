// POST /api/public/responses — one step of a respondent's answer.
//
// No CSRF (spec §6.5): a respondent carries no auth cookie. The right to
// change a finished answer is the signed token in x-response-token; writes
// are limited per IP and per campaign, and a honeypot field drops bots.
export const runtime = 'nodejs';

import 'server-only';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { log } from '@/lib/server/observability/log';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { isUniqueViolation, tamaniError } from '@/lib/server/tamani/errors';
import { jsonOk, readJson, validationFailed } from '@/lib/server/tamani/http';
import { responseStepSchema } from '@/lib/server/tamani/inputs';
import { enforcePublicRateLimit } from '@/lib/server/tamani/public-limits';
import { ResponseWriteError, upsertResponse } from '@/lib/server/tamani/responses';

export async function POST(req: NextRequest) {
  return withRequestContext(makeRequestContext(req.headers), async () => {
    const parsed = responseStepSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationFailed();
    const { website, ...input } = parsed.data;
    if (website) return jsonOk({ completed: false });

    const link = await prisma.campaignLink.findUnique({
      where: { code: input.code },
      select: { campaignId: true },
    });
    if (!link) return tamaniError('CAMPAIGN_NOT_FOUND', 404);
    const limited = await enforcePublicRateLimit(req, link.campaignId);
    if (limited) return limited;

    const token = req.headers.get('x-response-token');
    const write = () =>
      prisma.$transaction((tx) => upsertResponse(tx, { ...input, token }, new Date()));
    try {
      // Two taps racing on a new answer collide on a unique key: once more
      // finds the row the other one created.
      const result = await write().catch((err: unknown) => {
        if (isUniqueViolation(err)) return write();
        throw err;
      });
      const { firstCompletion, ...reply } = result;
      log.info('public response saved', {
        responseId: result.responseId,
        completed: result.completed,
        firstCompletion,
      });
      return jsonOk(reply);
    } catch (err) {
      if (!(err instanceof ResponseWriteError)) throw err;
      log.info('public response refused', { code: err.code });
      return err.code === 'VALIDATION_FAILED'
        ? validationFailed(err.message)
        : tamaniError(err.code, err.status);
    }
  });
}

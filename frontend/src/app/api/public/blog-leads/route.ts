// POST /api/public/blog-leads (lot 13d): a reader leaves a first name and a
// WhatsApp number at the end of an article and gets the guide's link.
//
// No CSRF, like the popup's routes: a reader carries no auth cookie. The
// per-IP limit and the honeypot stand in for it. The number is read on the
// server (normalizePhone) and never written in a log, nor is the first name.
export const runtime = 'nodejs';

import 'server-only';
import { createHash } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { leadGuide, saveLead } from '@/lib/server/tamani/blog';
import { tamaniError } from '@/lib/server/tamani/errors';
import { jsonOk, readJson, validationFailed } from '@/lib/server/tamani/http';
import { normalizePhone, shopCountry } from '@/lib/server/tamani/phone';
import { enforcePublicRateLimit } from '@/lib/server/tamani/public-limits';
import { BlogLeadInput } from '@/lib/tamani/blog';

export async function POST(req: NextRequest) {
  return withRequestContext(makeRequestContext(req.headers), async () => {
    const parsed = BlogLeadInput.safeParse(await readJson(req));
    if (!parsed.success) return validationFailed();
    const { website, phone, country, firstName, post } = parsed.data;
    // A bot filled the hidden field: answer as usual, keep nothing.
    if (website) return jsonOk({ url: null });

    const e164 = normalizePhone(phone, shopCountry(country));
    if (!e164) return tamaniError('INVALID_PHONE', 400);

    const contact = createHash('sha256').update(e164).digest('hex').slice(0, 24);
    const limited = await enforcePublicRateLimit(req, 'blog-guide', contact);
    if (limited) return limited;

    const found = await leadGuide(prisma, post);
    if (!found) return tamaniError('BLOG_NOT_FOUND', 404);

    await saveLead(
      prisma,
      { firstName, phone: e164, country, postId: found.postId, guideId: found.guide.id },
      new Date(),
    );
    return jsonOk({ url: found.guide.url });
  });
}

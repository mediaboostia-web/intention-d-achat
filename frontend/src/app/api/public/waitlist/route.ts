// POST /api/public/waitlist (lot 14): a seller reserves a place before launch.
//
// No CSRF, like the popup's routes: a visitor carries no auth cookie. What
// stands in for it is the per-IP limit and the honeypot field. The number is
// read on the server (normalizePhone) and never written in a log, nor is the
// e-mail or the first name.
export const runtime = 'nodejs';

import 'server-only';
import { createHash } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { tamaniError } from '@/lib/server/tamani/errors';
import { jsonOk, readJson, validationFailed } from '@/lib/server/tamani/http';
import { normalizePhone, shopCountry } from '@/lib/server/tamani/phone';
import { enforcePublicRateLimit } from '@/lib/server/tamani/public-limits';
import { joinWaitlist } from '@/lib/server/tamani/waitlist';
import { WaitlistInput } from '@/lib/tamani/waitlist';

export async function POST(req: NextRequest) {
  return withRequestContext(makeRequestContext(req.headers), async () => {
    const parsed = WaitlistInput.safeParse(await readJson(req));
    if (!parsed.success) return validationFailed();
    const { website, phone, country, email, firstName, channels, source } = parsed.data;
    // A bot filled the hidden field: answer as usual, keep nothing.
    if (website) return jsonOk({ position: 0, firstName });

    const e164 = phone ? normalizePhone(phone, shopCountry(country)) : null;
    if (phone && !e164) return tamaniError('INVALID_PHONE', 400);

    // 30 tries per contact and 600 per address in 10 minutes: one mobile
    // operator's address carries many sellers. The contact is hashed.
    const contact = createHash('sha256')
      .update(e164 ?? email ?? '')
      .digest('hex')
      .slice(0, 24);
    const limited = await enforcePublicRateLimit(req, 'waitlist', contact);
    if (limited) return limited;

    const place = await joinWaitlist(
      prisma,
      { firstName, phone: e164, email, channels, source },
      new Date(),
    );
    // The name just typed, never the one stored: a contact must not reveal whose it is.
    return jsonOk({ position: place.position, firstName });
  });
}

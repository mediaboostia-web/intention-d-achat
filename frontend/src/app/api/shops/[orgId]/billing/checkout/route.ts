// POST /api/shops/[orgId]/billing/checkout — open SasPay's hosted checkout
// for a pass (lot 8). ADMIN: buying spends the shop's money. The browser is
// sent to checkoutUrl; the pass opens only once the payment is verified.
export const runtime = 'nodejs';

import 'server-only';
import { CircuitOpenError } from '@/lib/server/payments/circuit-breaker';
import { SaspayError, getSaspay } from '@/lib/server/payments/saspay';
import { log } from '@/lib/server/observability/log';
import { prisma } from '@/lib/server/prisma';
import { BillingError, startCheckout } from '@/lib/server/tamani/billing';
import { tamaniError } from '@/lib/server/tamani/errors';
import { jsonOk, readJson, validationFailed } from '@/lib/server/tamani/http';
import { BillingCheckout } from '@/lib/server/tamani/inputs';
import { shopHandler } from '@/lib/server/tamani/route';
import { isPassId } from '@/lib/tamani/plans';

export const POST = shopHandler('ADMIN', async (req, { params, member }) => {
  const parsed = BillingCheckout.safeParse(await readJson(req));
  if (!parsed.success) return validationFailed();
  const { offer } = parsed.data;
  // The trial, « Sans pass » and the quoted Illimité are not sold here.
  if (!isPassId(offer)) return tamaniError('OFFER_NOT_BUYABLE', 400);
  const saspay = getSaspay();
  if (!saspay) return tamaniError('BILLING_NOT_CONFIGURED', 503);

  try {
    const result = await startCheckout(prisma, saspay, {
      organizationId: params.orgId,
      userId: member.user.sub,
      offer,
      now: new Date(),
      appUrl: process.env.APP_URL ?? 'http://localhost:3000',
    });
    return jsonOk(result, 201);
  } catch (err) {
    if (err instanceof BillingError) return tamaniError(err.code, err.status);
    if (err instanceof SaspayError || err instanceof CircuitOpenError) {
      log.warn('saspay checkout failed', {
        organizationId: params.orgId,
        ...(err instanceof SaspayError ? { status: err.status, code: err.code } : {}),
      });
      return tamaniError('PAYMENT_PROVIDER_UNAVAILABLE', 503);
    }
    throw err;
  }
});

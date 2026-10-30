// GET /api/shops/[orgId]/billing — the pass page (lot 8): the pass in force
// and its meter, the answers each campaign used in it, the last purchases,
// and whether the shop can pay online (SasPay configured, a paying country).
export const runtime = 'nodejs';

import 'server-only';
import { getSaspay } from '@/lib/server/payments/saspay';
import { prisma } from '@/lib/server/prisma';
import { tamaniError } from '@/lib/server/tamani/errors';
import { jsonOk } from '@/lib/server/tamani/http';
import { passUsage, passWindow } from '@/lib/server/tamani/quota';
import { shopHandler } from '@/lib/server/tamani/route';
import { PLANS, isPaymentCountry } from '@/lib/tamani/plans';

export const GET = shopHandler('MEMBER', async (_req, { params }) => {
  const organizationId = params.orgId;
  const now = new Date();
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, country: true },
  });
  if (!org) return tamaniError('SHOP_NOT_FOUND', 404);
  const [sub, usage, purchases] = await Promise.all([
    prisma.subscription.findUnique({ where: { organizationId } }),
    passUsage(prisma, organizationId, now),
    prisma.order.findMany({
      where: { organizationId, provider: 'saspay' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        offer: true,
        amount: true,
        status: true,
        createdAt: true,
        activatedAt: true,
      },
    }),
  ]);

  const window = usage.plan !== 'FREE' && sub ? passWindow(sub) : null;
  let perCampaign: { campaignId: string; title: string; used: number }[] = [];
  if (window) {
    const groups = await prisma.response.groupBy({
      by: ['campaignId'],
      where: { organizationId, countedAt: window },
      _count: { _all: true },
    });
    const titles = await prisma.campaign.findMany({
      where: { organizationId, id: { in: groups.map((g) => g.campaignId) } },
      select: { id: true, title: true },
    });
    const titleOf = new Map(titles.map((c) => [c.id, c.title]));
    perCampaign = groups
      .map((g) => ({
        campaignId: g.campaignId,
        title: titleOf.get(g.campaignId) ?? '',
        used: g._count._all,
      }))
      .sort((a, b) => b.used - a.used);
  }

  return jsonOk({
    pass: {
      plan: usage.plan,
      label: PLANS[usage.plan].label,
      endsAt: usage.endsAt?.toISOString() ?? null,
      inGrace: usage.inGrace,
      used: usage.used,
      included: usage.included,
      pending: usage.pending,
    },
    perCampaign,
    purchases: purchases.map((p) => ({
      id: p.id,
      offer: p.offer,
      amount: p.amount,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
      activated: p.activatedAt !== null,
    })),
    paymentAvailable: getSaspay() !== null && isPaymentCountry(org.country),
  });
});

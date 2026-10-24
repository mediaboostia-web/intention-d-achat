// The only way Tamani data leaves the server. Each function lists the
// fields it sends, so a column added to the schema stays private until a
// serializer names it.
import 'server-only';
import type { DeliveryZone, Organization, Subscription } from '@prisma/client';
import { effectivePlan } from './subscription';

type SubscriptionDates = Pick<Subscription, 'plan' | 'currentPeriodEnd' | 'graceUntil'>;

export function toShop(org: Organization, sub: SubscriptionDates | null, now: Date) {
  const { plan, inGrace } = effectivePlan(sub, now);
  return {
    id: org.id,
    slug: org.slug,
    name: org.name,
    whatsappPhone: org.whatsappPhone,
    country: org.country,
    currency: org.currency,
    logoUrl: org.logoUrl,
    coefConsumer: org.coefConsumer,
    coefReseller: org.coefReseller,
    plan: {
      id: plan,
      inGrace,
      currentPeriodEnd: plan === 'FREE' ? null : (sub?.currentPeriodEnd?.toISOString() ?? null),
    },
  };
}

export function toZone(z: Pick<DeliveryZone, 'id' | 'name' | 'sortOrder'>) {
  return { id: z.id, name: z.name, sortOrder: z.sortOrder };
}

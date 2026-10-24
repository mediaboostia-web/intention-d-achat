// The only way Tamani data leaves the server. Each function lists the
// fields it sends, so a column added to the schema stays private until a
// serializer names it.
import 'server-only';
import type { DeliveryZone, Organization, Prisma, Product, Subscription } from '@prisma/client';
import { effectivePlan } from './subscription';

/** Product.photos is Json: keep the strings, drop anything else. */
function photoUrls(photos: Prisma.JsonValue): string[] {
  return Array.isArray(photos) ? photos.filter((p): p is string => typeof p === 'string') : [];
}

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

/** What a respondent may see of a product: never costPrice. Used by the popup (lot 5). */
export function toPublicProduct(p: Product) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    unitLabel: p.unitLabel,
    unitPrice: p.unitPrice,
    wholesalePrice: p.wholesalePrice,
    wholesaleMinQty: p.wholesaleMinQty,
    photos: photoUrls(p.photos),
    optionLabel: p.optionLabel,
    options: p.options,
  };
}

/** The shop's own view, purchase price included. */
export function toShopProduct(p: Product) {
  return {
    ...toPublicProduct(p),
    costPrice: p.costPrice,
    archivedAt: p.archivedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

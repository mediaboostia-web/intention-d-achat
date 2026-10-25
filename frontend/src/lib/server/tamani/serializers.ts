// The only way Tamani data leaves the server. Each function lists the
// fields it sends, so a column added to the schema stays private until a
// serializer names it.
import 'server-only';
import type {
  Campaign,
  CampaignLink,
  DeliveryZone,
  Organization,
  Prisma,
  Product,
  Subscription,
} from '@prisma/client';
import {
  formatAvailability,
  formatPriceLine,
  renderShareMessage,
} from '@/lib/tamani/share-message';
import { effectiveStatus } from './campaign-status';
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
    description: org.description,
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

/** The public link of a share code: ${APP_URL}/c/<code>. */
export function shareUrl(code: string): string {
  const base = (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
  return `${base}/c/${code}`;
}

export function toLink(l: CampaignLink) {
  return {
    id: l.id,
    code: l.code,
    label: l.label,
    isDefault: l.isDefault,
    openCount: l.openCount,
    url: shareUrl(l.code),
  };
}

/**
 * A campaign as the shop sees it: effective status (an expired ACTIVE
 * campaign reads CLOSED) and the share message ready to send.
 */
export function toCampaign(c: Campaign & { product: Product; links: CampaignLink[] }, now: Date) {
  const link = c.links.find((l) => l.isDefault);
  const defaultLink = link ? toLink(link) : null;
  const availability = c.availability === 'IN_STOCK' ? 'IN_STOCK' : 'INCOMING';
  return {
    id: c.id,
    title: c.title,
    productId: c.productId,
    product: {
      id: c.product.id,
      name: c.product.name,
      unitLabel: c.product.unitLabel,
      unitPrice: c.product.unitPrice,
      wholesalePrice: c.product.wholesalePrice,
      wholesaleMinQty: c.product.wholesaleMinQty,
      photos: photoUrls(c.product.photos),
    },
    availability,
    availableAt: c.availableAt?.toISOString() ?? null,
    stockQuantity: c.stockQuantity,
    plannedQuantity: c.plannedQuantity,
    showStock: c.showStock,
    endsAt: c.endsAt?.toISOString() ?? null,
    deliveryEnabled: c.deliveryEnabled,
    showLiveCounter: c.showLiveCounter,
    shareTemplate: c.shareTemplate,
    status: effectiveStatus(c, now),
    closedAt: c.closedAt?.toISOString() ?? null,
    arrivedAt: c.arrivedAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    defaultLink,
    shareMessage: renderShareMessage(c.shareTemplate, {
      produit: c.product.name,
      prix: formatPriceLine(c.product),
      disponibilite: formatAvailability({ availability, availableAt: c.availableAt }, now),
      lien: defaultLink?.url ?? '',
    }),
  };
}

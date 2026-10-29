// A campaign as the shop space reads it (lib/server/tamani/serializers.ts
// toCampaign / toLink) and the lines its screens write about it.
import type { CampaignStatus } from './campaign-actions';
import { formatDateFr } from './dates';
import { formatAvailability, formatPriceLine, renderShareMessage } from './share-message';
import type { Availability } from './timing';

export interface ShopLink {
  id: string;
  code: string;
  label: string;
  isDefault: boolean;
  openCount: number;
  url: string;
}

export interface ShopCampaign {
  id: string;
  title: string;
  productId: string;
  product: {
    id: string;
    name: string;
    unitLabel: string;
    unitPrice: number;
    wholesalePrice: number | null;
    wholesaleMinQty: number | null;
    photos: string[];
  };
  availability: Availability;
  availableAt: string | null;
  stockQuantity: number | null;
  plannedQuantity: number | null;
  showStock: boolean;
  endsAt: string | null;
  deliveryEnabled: boolean;
  showLiveCounter: boolean;
  shareTemplate: string;
  status: CampaignStatus;
  closedAt: string | null;
  arrivedAt: string | null;
  createdAt: string;
  defaultLink: ShopLink | null;
  shareMessage: string;
}

/** Stands for the share link before the campaign exists (the code is drawn at creation). */
export const PREVIEW_LINK = 'tamani.app/c/•••••••';

/** "jusqu'au 3 novembre", "sans date de fin", "terminée le 20 octobre", "arrivée le 23 octobre". */
export function endLine(
  c: Pick<ShopCampaign, 'status' | 'endsAt' | 'closedAt' | 'arrivedAt'>,
  now: Date,
): string {
  if (c.status === 'ARRIVED' && c.arrivedAt) {
    return `arrivée le ${formatDateFr(new Date(c.arrivedAt), now)}`;
  }
  if (c.status === 'CLOSED' || c.status === 'ARRIVED') {
    const ended = c.closedAt ?? c.endsAt;
    return ended ? `terminée le ${formatDateFr(new Date(ended), now)}` : 'terminée';
  }
  return c.endsAt ? `jusqu'au ${formatDateFr(new Date(c.endsAt), now)}` : 'sans date de fin';
}

export function availabilityLine(
  c: Pick<ShopCampaign, 'availability' | 'availableAt'>,
  now: Date,
): string {
  return formatAvailability(
    { availability: c.availability, availableAt: c.availableAt ? new Date(c.availableAt) : null },
    now,
  );
}

/** The share message as it will read, before the campaign (and its link) exists. */
export function previewMessage(
  template: string,
  product: {
    name: string;
    unitPrice: number;
    wholesalePrice: number | null;
    wholesaleMinQty: number | null;
  },
  availability: { availability: Availability; availableAt: Date | null },
  now: Date,
  currency: string,
  link: string = PREVIEW_LINK,
): string {
  return renderShareMessage(template, {
    produit: product.name,
    prix: formatPriceLine(product, currency),
    disponibilite: formatAvailability(availability, now),
    lien: link,
  });
}

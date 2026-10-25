// What a respondent sees of a campaign (spec §5.3), read by its share code.
// An allowlist like the serializers: never the shop's WhatsApp number, the
// purchase price, the planned quantity or anything about other respondents.
import 'server-only';
import { PLANS } from '@/lib/tamani/plans';
import { SHOP_COUNTRIES } from '@/lib/tamani/countries';
import { formatAvailability } from '@/lib/tamani/share-message';
import { TIMING_OPTIONS, type Availability, type Timing } from '@/lib/tamani/timing';
import { effectiveStatus, isAcceptingResponses, type CampaignStatus } from './campaign-status';
import type { Db } from './locks';
import { toPublicProduct } from './serializers';
import { SHORT_CODE_REGEX } from './short-code';
import { effectivePlan } from './subscription';

export interface PublicCampaign {
  code: string;
  linkId: string;
  campaignId: string;
  title: string;
  status: CampaignStatus;
  accepting: boolean;
  availability: Availability;
  availabilityText: string;
  timingOptions: readonly Timing[];
  deliveryEnabled: boolean;
  zones: Array<{ id: string; name: string }>;
  interestedCount: number | null;
  stockQuantity: number | null;
  product: ReturnType<typeof toPublicProduct>;
  shop: {
    name: string;
    slug: string;
    logoUrl: string | null;
    description: string | null;
    dialCode: string;
  };
  poweredByBadge: boolean;
}

/** People who said yes, gave their number, and do not look like a bot. */
export function interestedWhere(campaignId: string) {
  return { campaignId, interested: true, completedAt: { not: null }, suspicious: false };
}

export async function getPublicCampaign(
  db: Db,
  code: string,
  now: Date,
): Promise<PublicCampaign | null> {
  if (!SHORT_CODE_REGEX.test(code)) return null;
  const link = await db.campaignLink.findUnique({
    where: { code },
    include: {
      campaign: {
        include: { product: true, organization: { include: { subscription: true } } },
      },
    },
  });
  if (!link) return null;
  const { campaign } = link;
  const { product, organization: org } = campaign;
  const availability: Availability = campaign.availability === 'IN_STOCK' ? 'IN_STOCK' : 'INCOMING';

  const zones = campaign.deliveryEnabled
    ? await db.deliveryZone.findMany({
        where: { organizationId: org.id },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true },
      })
    : [];
  const interestedCount = campaign.showLiveCounter
    ? await db.response.count({ where: interestedWhere(campaign.id) })
    : null;

  return {
    code: link.code,
    linkId: link.id,
    campaignId: campaign.id,
    title: campaign.title,
    status: effectiveStatus(campaign, now),
    accepting: isAcceptingResponses(campaign, now) && product.archivedAt === null,
    availability,
    availabilityText: formatAvailability({ availability, availableAt: campaign.availableAt }, now),
    timingOptions: TIMING_OPTIONS[availability],
    deliveryEnabled: campaign.deliveryEnabled,
    zones,
    interestedCount,
    stockQuantity: campaign.showStock ? campaign.stockQuantity : null,
    product: toPublicProduct(product),
    shop: {
      name: org.name,
      slug: org.slug,
      logoUrl: org.logoUrl,
      description: org.description,
      dialCode: SHOP_COUNTRIES.find((c) => c.code === org.country)?.dialCode ?? '+221',
    },
    poweredByBadge: PLANS[effectivePlan(org.subscription, now).plan].features.poweredByBadge,
  };
}

import type { ComponentProps } from 'react';
import Link from 'next/link';
import { CAMPAIGN_STATUS_LABELS, type CampaignStatus } from '@/lib/tamani/campaign-actions';
import { availabilityLine, endLine, type ShopCampaign } from '@/lib/tamani/campaign-view';
import { cn } from '@/lib/utils';
import { Badge } from './Badge';
import { Icon } from './icons';

// The running campaign takes the yellow tab; a draft is dashed like
// something not yet decided; the verdict colours stay for the verdict.
const TONES: Record<CampaignStatus, ComponentProps<typeof Badge>['tone']> = {
  DRAFT: 'neutral',
  ACTIVE: 'accent',
  CLOSED: 'primary',
  ARRIVED: 'primary',
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return <Badge tone={TONES[status]}>{CAMPAIGN_STATUS_LABELS[status]}</Badge>;
}

export type CampaignCardData = Pick<
  ShopCampaign,
  'title' | 'status' | 'availability' | 'availableAt' | 'endsAt' | 'closedAt' | 'arrivedAt'
> & { product: Pick<ShopCampaign['product'], 'photos'> };

/** A campaign in a list: photo, title, status, when the product is there, until when. */
export function CampaignCard({
  campaign,
  href,
  now = new Date(),
  className,
}: {
  campaign: CampaignCardData;
  href?: string | undefined;
  now?: Date;
  className?: string | undefined;
}) {
  const photo = campaign.product.photos[0];
  const body = (
    <>
      {photo ? (
        <img
          src={photo}
          alt=""
          className="frame size-16 shrink-0 rounded-control bg-bg object-cover"
        />
      ) : (
        <span className="frame flex size-16 shrink-0 items-center justify-center rounded-control bg-bg text-ink-muted">
          <Icon name="megaphone" />
        </span>
      )}
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-bold break-words text-ink">{campaign.title}</span>
          <CampaignStatusBadge status={campaign.status} />
        </span>
        <span className="text-sm text-ink-soft">{availabilityLine(campaign, now)}</span>
        <span className="text-sm text-ink-muted">{endLine(campaign, now)}</span>
      </span>
    </>
  );
  const classes = cn('frame flex items-center gap-3 rounded-card bg-surface p-3', className);
  return href ? (
    <Link href={href} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}

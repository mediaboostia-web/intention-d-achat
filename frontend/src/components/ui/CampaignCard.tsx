import type { ComponentProps, ReactNode } from 'react';
import Link from 'next/link';
import { CAMPAIGN_STATUS_LABELS, type CampaignStatus } from '@/lib/tamani/campaign-actions';
import { availabilityLine, endLine, type ShopCampaign } from '@/lib/tamani/campaign-view';
import { BANNER, cloudinaryVariant, THUMB } from '@/lib/tamani/cloudinary-url';
import { cn } from '@/lib/utils';
import { Badge } from './Badge';
import { Icon } from './icons';
import type { ListLayout } from './LayoutSwitch';

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

/**
 * A campaign in a list (lot 7a): as a card, the product photo in a banner
 * over the title, the status, when the product is there and until when; as
 * a list line, a 44px thumbnail and the same facts on one row.
 */
export function CampaignCard({
  campaign,
  href,
  layout = 'card',
  now = new Date(),
  className,
}: {
  campaign: CampaignCardData;
  href?: string | undefined;
  layout?: ListLayout;
  now?: Date;
  className?: string | undefined;
}) {
  const first = campaign.product.photos[0];
  const when = availabilityLine(campaign, now);
  const until = endLine(campaign, now);
  if (layout === 'list') {
    return (
      <Shell href={href} className={cn('flex min-h-16 items-center gap-3 px-3 py-2.5', className)}>
        <Thumb src={first ? cloudinaryVariant(first, THUMB) : null} icon="megaphone" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold text-ink">{campaign.title}</span>
          <span className="block truncate text-sm text-ink-soft">
            {when}
            <span className="md:hidden"> · {until}</span>
          </span>
        </span>
        <span className="hidden w-44 shrink-0 truncate text-sm text-ink-muted md:block">
          {until}
        </span>
        <span className="shrink-0">
          <CampaignStatusBadge status={campaign.status} />
        </span>
      </Shell>
    );
  }
  return (
    <Shell
      href={href}
      className={cn(
        'frame flex h-full flex-col overflow-hidden rounded-card bg-surface',
        className,
      )}
    >
      <Banner src={first ? cloudinaryVariant(first, BANNER) : null} icon="megaphone" />
      <span className="flex min-w-0 flex-1 flex-col gap-1 p-3">
        <span className="flex items-start justify-between gap-2">
          <span className="min-w-0 leading-snug font-bold break-words text-ink">
            {campaign.title}
          </span>
          <span className="shrink-0">
            <CampaignStatusBadge status={campaign.status} />
          </span>
        </span>
        <span className="text-sm text-ink-soft">{when}</span>
        <span className="text-sm text-ink-muted">{until}</span>
      </span>
    </Shell>
  );
}

/** A link when given `href` (the whole card is the target), else a plain block. */
export function Shell({
  href,
  className,
  children,
}: {
  href?: string | undefined;
  className: string;
  children: ReactNode;
}) {
  const classes = cn('min-w-0', href && 'hover:bg-bg', className);
  return href ? (
    <Link href={href} className={classes}>
      {children}
    </Link>
  ) : (
    <div className={classes}>{children}</div>
  );
}

/** The card banner, 16:7: the photo, or the picture of the product kind on the paper. */
export function Banner({ src, icon }: { src: string | null; icon: 'megaphone' | 'box' }) {
  return src ? (
    <img
      src={src}
      alt=""
      loading="lazy"
      className="aspect-[16/7] w-full border-b-[2.5px] border-ink bg-bg object-cover"
    />
  ) : (
    <span className="bg-paper flex aspect-[16/7] w-full items-center justify-center border-b-[2.5px] border-ink text-ink-muted">
      <Icon name={icon} className="size-8" />
    </span>
  );
}

/** The 44px thumbnail of a list line. */
export function Thumb({ src, icon }: { src: string | null; icon: 'megaphone' | 'box' }) {
  return src ? (
    <img
      src={src}
      alt=""
      loading="lazy"
      className="size-11 shrink-0 rounded-case border-2 border-ink bg-bg object-cover"
    />
  ) : (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-case border-2 border-ink bg-bg text-ink-muted">
      <Icon name={icon} className="size-5" />
    </span>
  );
}

import { BANNER, cloudinaryVariant, THUMB } from '@/lib/tamani/cloudinary-url';
import { formatPriceLine } from '@/lib/tamani/share-message';
import { cn } from '@/lib/utils';
import { Badge } from './Badge';
import { Banner, Shell, Thumb } from './CampaignCard';
import type { ListLayout } from './LayoutSwitch';

export interface ProductCardData {
  name: string;
  unitLabel: string;
  unitPrice: number;
  wholesalePrice: number | null;
  wholesaleMinQty: number | null;
  photos: readonly string[];
  archivedAt: string | null;
}

/**
 * A product in a list (lot 7a): as a card, its photo in a banner over the
 * name and the price line its campaigns show; as a list line, a 44px
 * thumbnail, the name, the price and the unit on one row.
 */
export function ProductCard({
  product,
  href,
  layout = 'card',
  currency,
  className,
}: {
  product: ProductCardData;
  href?: string | undefined;
  layout?: ListLayout;
  /** The shop's currency (lot 7b). */
  currency: string;
  className?: string | undefined;
}) {
  const first = product.photos[0];
  const price = formatPriceLine(product, currency);
  const archived = product.archivedAt ? <Badge tone="neutral">Archivé</Badge> : null;
  if (layout === 'list') {
    return (
      <Shell href={href} className={cn('flex min-h-16 items-center gap-3 px-3 py-2.5', className)}>
        <Thumb src={first ? cloudinaryVariant(first, THUMB) : null} icon="box" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold text-ink">{product.name}</span>
          <span className="block truncate text-sm text-ink-soft">{price}</span>
        </span>
        <span className="hidden w-36 shrink-0 truncate text-sm text-ink-muted md:block">
          Unité : {product.unitLabel}
        </span>
        {archived && <span className="shrink-0">{archived}</span>}
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
      <Banner src={first ? cloudinaryVariant(first, BANNER) : null} icon="box" />
      <span className="flex min-w-0 flex-1 flex-col gap-1 p-3">
        <span className="flex items-start justify-between gap-2">
          <span className="min-w-0 leading-snug font-bold break-words text-ink">
            {product.name}
          </span>
          {archived && <span className="shrink-0">{archived}</span>}
        </span>
        <span className="text-sm text-ink-soft">{price}</span>
        <span className="text-sm text-ink-muted">Unité : {product.unitLabel}</span>
      </span>
    </Shell>
  );
}

import Link from 'next/link';
import { formatPriceLine } from '@/lib/tamani/share-message';
import { cn } from '@/lib/utils';
import { Badge } from './Badge';
import { Icon } from './icons';
import { cloudinaryVariant, THUMB } from '@/lib/tamani/cloudinary-url';

export interface ProductCardData {
  name: string;
  unitLabel: string;
  unitPrice: number;
  wholesalePrice: number | null;
  wholesaleMinQty: number | null;
  photos: readonly string[];
  archivedAt: string | null;
}

/** A product in a list: its first photo, its name and the price line its campaigns show. */
export function ProductCard({
  product,
  href,
  className,
}: {
  product: ProductCardData;
  href?: string | undefined;
  className?: string | undefined;
}) {
  const photo = product.photos[0] ? cloudinaryVariant(product.photos[0], THUMB) : undefined;
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
          <Icon name="box" />
        </span>
      )}
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-bold break-words text-ink">{product.name}</span>
          {product.archivedAt && <Badge tone="neutral">Archivé</Badge>}
        </span>
        <span className="text-sm text-ink-soft">{formatPriceLine(product)}</span>
        <span className="text-sm text-ink-muted">Unité : {product.unitLabel}</span>
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

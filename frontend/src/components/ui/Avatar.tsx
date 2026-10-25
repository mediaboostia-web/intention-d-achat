import { initials } from '@/lib/tamani/names';
import { cn } from '@/lib/utils';
import { cloudinaryVariant, THUMB } from '@/lib/tamani/cloudinary-url';

const SIZES = {
  sm: 'size-9 text-sm',
  md: 'size-11 text-base',
  lg: 'size-16 text-xl',
} as const;

/**
 * A round picture: the photo when there is one, otherwise the initials on
 * yellow. Decorative: the link or the name next to it says who it is.
 */
export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string;
  src?: string | null | undefined;
  size?: keyof typeof SIZES;
  className?: string | undefined;
}) {
  const classes = cn(
    'frame inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
    SIZES[size],
    className,
  );
  if (src) {
    return (
      <span className={cn(classes, 'bg-surface')}>
        <img src={cloudinaryVariant(src, THUMB)} alt="" className="size-full object-cover" />
      </span>
    );
  }
  return (
    <span aria-hidden="true" className={cn(classes, 'bg-accent font-bold text-accent-ink')}>
      {initials(name)}
    </span>
  );
}

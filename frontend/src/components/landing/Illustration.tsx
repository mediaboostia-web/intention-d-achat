import Image from 'next/image';
import { cn } from '@/lib/utils';
import { LANDING_IMAGES, type LandingImageName } from './content';

/**
 * One of the home page illustrations. `ink` multiplies it onto the paper, so
 * its white background becomes the page; never animate a transform on its
 * parents, or the blend loses the paper behind it. `fill` covers its parent.
 */
export function Illustration({
  name,
  alt,
  sizes,
  ink = false,
  preload = false,
  fill = false,
  className,
}: {
  name: LandingImageName;
  alt: string;
  sizes: string;
  ink?: boolean;
  preload?: boolean;
  fill?: boolean;
  className?: string;
}) {
  const src = `/accueil/${name}.webp`;
  const classes = cn(ink && 'lp-ink', className);
  if (fill) return <Image src={src} alt={alt} sizes={sizes} fill className={classes} />;
  const { width, height } = LANDING_IMAGES[name];
  return (
    <Image
      src={src}
      alt={alt}
      sizes={sizes}
      width={width}
      height={height}
      preload={preload}
      className={classes}
    />
  );
}

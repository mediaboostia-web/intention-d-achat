'use client';

// The product's photos in the popup (lot 6b, retours §3): one per view,
// swiped with a finger (CSS scroll-snap), each whole on the paper, with
// dots for where we are and arrows on a computer. No animation library
// (popup rule): the smooth scroll stops under reduced motion.
import { useRef, useState } from 'react';
import { Icon } from '@/components/ui/icons';
import { POPUP_PHOTO, cloudinaryVariant } from '@/lib/tamani/cloudinary-url';
import { cn } from '@/lib/utils';

export function PhotoGallery({
  photos,
  name,
  className,
}: {
  photos: readonly string[];
  name: string;
  className?: string;
}) {
  const list = useRef<HTMLUListElement>(null);
  const [shown, setShown] = useState(0);
  if (photos.length === 0) return null;
  const n = photos.length;

  const go = (i: number) => {
    const el = list.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: i * el.clientWidth, behavior: reduced ? 'auto' : 'smooth' });
  };

  return (
    <section
      aria-roledescription="carrousel"
      aria-label={`Photos de ${name}`}
      className={cn('relative flex flex-col', className)}
    >
      <ul
        ref={list}
        onScroll={(e) => {
          const el = e.currentTarget;
          setShown(Math.round(el.scrollLeft / Math.max(el.clientWidth, 1)));
        }}
        className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none]"
      >
        {photos.map((p, i) => (
          <li
            key={`${i}-${p}`}
            className="flex w-full shrink-0 snap-center items-center justify-center px-6"
          >
            <img
              src={cloudinaryVariant(p, POPUP_PHOTO)}
              alt={`${name}, photo ${i + 1} sur ${n}`}
              loading={i === 0 ? 'eager' : 'lazy'}
              {...(i === 0 ? { fetchPriority: 'high' as const } : {})}
              className="frame max-h-full w-auto max-w-full rounded-card bg-surface object-contain"
            />
          </li>
        ))}
      </ul>
      {n > 1 && (
        <>
          <div className="mt-1 flex justify-center">
            {photos.map((p, i) => (
              <button
                key={`${i}-${p}`}
                type="button"
                aria-label={`Photo ${i + 1}`}
                aria-current={i === shown ? 'true' : undefined}
                onClick={() => go(i)}
                className="grid size-6 place-items-center"
              >
                <span
                  className={cn(
                    'size-2.5 rounded-full border border-ink/40',
                    i === shown ? 'bg-accent' : 'bg-surface/80',
                  )}
                />
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="Photo précédente"
            disabled={shown === 0}
            onClick={() => go(shown - 1)}
            className="absolute top-1/2 left-1 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-surface/90 text-ink disabled:opacity-0 lg:grid"
          >
            <Icon name="chevron-left" />
          </button>
          <button
            type="button"
            aria-label="Photo suivante"
            disabled={shown === n - 1}
            onClick={() => go(shown + 1)}
            className="absolute top-1/2 right-1 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-surface/90 text-ink disabled:opacity-0 lg:grid"
          >
            <Icon name="chevron-right" />
          </button>
        </>
      )}
    </section>
  );
}

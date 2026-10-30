'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Icon } from '@/components/ui';

/**
 * The pass cards as a rail (lot 8). CSS scroll-snap does the sliding (one
 * card and a half on a phone, four from 1024 px); this leaf only adds the
 * two arrows shown from 1024 px, greyed at either end. The step follows the
 * track's scroll-behavior, which prefers-reduced-motion turns off.
 */
export function OfferRail({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  const track = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const start = el.scrollLeft <= 4;
    const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    setEdge((e) => (e.start === start && e.end === end ? e : { start, end }));
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  const step = (dir: 1 | -1) => {
    const el = track.current;
    const card = el?.firstElementChild;
    if (!el || !(card instanceof HTMLElement)) return;
    const gap = Number.parseFloat(getComputedStyle(el).columnGap) || 0;
    el.scrollBy({ left: dir * (card.offsetWidth + gap) });
  };

  return (
    <div className="lp-rail">
      <div className="lp-rail__nav">
        <button
          type="button"
          aria-label="Pass précédents"
          aria-controls={id}
          disabled={edge.start}
          onClick={() => step(-1)}
        >
          <Icon name="chevron-left" />
        </button>
        <button
          type="button"
          aria-label="Pass suivants"
          aria-controls={id}
          disabled={edge.end}
          onClick={() => step(1)}
        >
          <Icon name="chevron-right" />
        </button>
      </div>
      <ul id={id} ref={track} className="lp-rail__track" aria-label={label} onScroll={measure}>
        {children}
      </ul>
    </div>
  );
}

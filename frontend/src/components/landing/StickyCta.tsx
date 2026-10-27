'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui';

/**
 * On a phone, the sign-up button follows once the hero's own has scrolled
 * away; it steps aside over the prices, the community call and the footer,
 * which carry their own.
 */
export function StickyCta() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const hero = document.getElementById('lp-hero-cta');
    if (!hero) return;
    const covers = ['tarifs', 'communaute', 'lp-footer'].flatMap((id) => {
      const el = document.getElementById(id);
      return el ? [el] : [];
    });
    const seen = new Map<Element, { on: boolean; above: boolean }>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        seen.set(e.target, { on: e.isIntersecting, above: e.boundingClientRect.top < 0 });
      }
      const h = seen.get(hero);
      setOn(Boolean(h && !h.on && h.above && !covers.some((el) => seen.get(el)?.on)));
    });
    io.observe(hero);
    covers.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="lp-sticky" data-on={on ? 'true' : 'false'} aria-hidden={!on}>
      <Button href="/signup" size="lg" tabIndex={on ? 0 : -1}>
        Essayer gratuitement
      </Button>
    </div>
  );
}

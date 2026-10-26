'use client';

import { createElement, useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Marks its element data-inview="true" the first time it reaches the screen,
 * so CSS can play a one-off moment (a stamp landing, a highlighter sweep).
 * Under reduced motion the CSS skips the animation and shows the end state.
 */
export function InView({
  as = 'div',
  threshold = 0.35,
  className,
  children,
  ...rest
}: {
  as?: 'div' | 'section' | 'ol';
  threshold?: number;
  className?: string;
  children: ReactNode;
  id?: string;
  'aria-labelledby'?: string;
  'aria-hidden'?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return createElement(
    as,
    { ref, className, 'data-inview': seen ? 'true' : 'false', ...rest },
    children,
  );
}

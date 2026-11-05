'use client';

import { useEffect, useRef, useState } from 'react';
import { formatMoney } from '@/lib/tamani/currency';
import { countFrame } from '@/lib/tamani/landing';
import { formatPrice } from '@/lib/utils';
import { unbroken } from './content';

const DURATION_MS = 900;

const write = (n: number, unit: 'number' | 'money') =>
  unbroken(unit === 'money' ? formatMoney(n, 'XOF') : formatPrice(n));

/**
 * A number that counts up once it reaches the screen (lot 12). The server,
 * search engines and screen readers get the final value, written once; the
 * running digits are a decorative overlay that keeps the final value's width,
 * so nothing around it moves. Nothing runs under reduced motion.
 */
export function CountUp({ value, unit = 'number' }: { value: number; unit?: 'number' | 'money' }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [run, setRun] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (
      !el ||
      !('IntersectionObserver' in window) ||
      matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    // Already on screen when the page opens: leave the number as it is.
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    setRun(0);
    let frame = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const t0 = performance.now();
        const step = (now: number) => {
          const t = (now - t0) / DURATION_MS;
          setRun(t < 1 ? countFrame(value, t) : null);
          if (t < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    <span ref={ref} className="lp-count" data-running={run === null ? undefined : 'true'}>
      <span className="lp-count__value">{write(value, unit)}</span>
      {run !== null && (
        <span className="lp-count__run" aria-hidden="true">
          {write(run, unit)}
        </span>
      )}
    </span>
  );
}

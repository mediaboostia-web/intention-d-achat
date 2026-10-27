'use client';

import {
  useCallback,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { Icon } from '@/components/ui';
import { clampPercent } from '@/lib/tamani/landing';

const SIDEWAYS_PX = 6;

/**
 * Two pictures of the same place, a bar to drag between them. A mouse moves
 * the bar at once; a finger only once it slides sideways, so a phone still
 * scrolls the page. The arrow keys move it through a visually hidden range.
 */
export function CompareSlider({
  before,
  after,
  label,
}: {
  before: ReactNode;
  after: ReactNode;
  label: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<HTMLInputElement>(null);
  const touched = useRef(false);
  const drag = useRef<{ x: number; y: number; on: boolean } | null>(null);

  // The position lives in a CSS variable, not in React state: no re-render per pointer move.
  const setPos = useCallback((p: number) => {
    const v = clampPercent(p);
    rootRef.current?.style.setProperty('--pos', `${v}%`);
    const range = rangeRef.current;
    if (range) {
      range.value = String(Math.round(v));
      range.setAttribute('aria-valuetext', `${Math.round(v)} % de l'image Avant visible`);
    }
  }, []);

  const posOf = (e: ReactPointerEvent) => {
    const r = rootRef.current?.getBoundingClientRect();
    return r && r.width ? ((e.clientX - r.left) / r.width) * 100 : 50;
  };

  // Once, the bar shows that it moves, unless the visitor got there first.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const sweep = (from: number, to: number, ms: number) =>
      new Promise<void>((resolve) => {
        const t0 = performance.now();
        const step = (t: number) => {
          if (touched.current) return resolve();
          const k = Math.min(1, (t - t0) / ms);
          const eased = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
          setPos(from + (to - from) * eased);
          if (k < 1) frame = requestAnimationFrame(step);
          else resolve();
        };
        frame = requestAnimationFrame(step);
      });
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        void (async () => {
          for (const [a, b] of [
            [50, 30],
            [30, 70],
            [70, 50],
          ] as const) {
            if (touched.current) return;
            await sweep(a, b, 650);
          }
        })();
      },
      { threshold: 0.6 },
    );
    io.observe(root);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [setPos]);

  return (
    <div
      ref={rootRef}
      className="lp-ba"
      onPointerDown={(e) => {
        touched.current = true;
        drag.current = { x: e.clientX, y: e.clientY, on: e.pointerType === 'mouse' };
        if (drag.current.on) {
          e.currentTarget.setPointerCapture(e.pointerId);
          setPos(posOf(e));
        }
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        if (!d.on) {
          const dx = Math.abs(e.clientX - d.x);
          if (dx < SIDEWAYS_PX || dx < Math.abs(e.clientY - d.y)) return;
          d.on = true;
          e.currentTarget.setPointerCapture(e.pointerId);
        }
        setPos(posOf(e));
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
    >
      <div className="lp-ba__layer">{before}</div>
      <div className="lp-ba__layer lp-ba__layer--after">{after}</div>
      <span className="lp-ba__label lp-ba__label--before" aria-hidden="true">
        Avant
      </span>
      <span className="lp-ba__label lp-ba__label--after" aria-hidden="true">
        Avec Tamani
      </span>
      <span className="lp-ba__handle" aria-hidden="true">
        <span className="lp-ba__knob">
          <Icon name="chevron-left" />
          <Icon name="chevron-right" />
        </span>
      </span>
      <input
        ref={rangeRef}
        type="range"
        min={0}
        max={100}
        defaultValue={50}
        className="lp-ba__range sr-only"
        aria-label={label}
        onChange={(e) => {
          touched.current = true;
          setPos(Number(e.currentTarget.value));
        }}
      />
    </div>
  );
}

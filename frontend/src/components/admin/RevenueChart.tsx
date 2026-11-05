'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { chartGeometry } from '@/lib/tamani/admin-chart';
import { adminMoney, monthLabel, shortMonthLabel } from '@/lib/tamani/admin-view';

const HEIGHT = 240;
const MARGIN = { left: 52, right: 16, top: 16, bottom: 32 };

/**
 * Six months of revenue as one area (dataviz rules: 2px line, a light wash,
 * hairline grid, text in ink). The crosshair snaps to the nearest month under
 * the pointer, or moves with the arrow keys; the same amounts sit in the
 * table under the chart, so nothing hides behind a hover.
 */
export function RevenueChart({ series }: { series: { month: string; total: number }[] }) {
  const box = useRef<HTMLDivElement>(null);
  // Drawn at its real width, so 12px labels stay 12px on a phone.
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const watch = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(280, Math.round(entry.contentRect.width)));
    });
    watch.observe(el);
    return () => watch.disconnect();
  }, []);

  const g = chartGeometry(series, { width, height: HEIGHT, ...MARGIN });
  const point = active === null ? null : (g.points[active] ?? null);
  const last = g.points.length - 1;

  function nearest(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    let best = 0;
    g.points.forEach((p, i) => {
      if (Math.abs(p.x - x) < Math.abs((g.points[best]?.x ?? 0) - x)) best = i;
    });
    setActive(best);
  }

  function onKey(e: KeyboardEvent<SVGSVGElement>) {
    const now = active ?? last;
    const moves: Record<string, number> = {
      ArrowLeft: Math.max(0, now - 1),
      ArrowRight: Math.min(last, now + 1),
      Home: 0,
      End: last,
    };
    const next = moves[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setActive(next);
  }

  const summary = `Encaissements des ${series.length} derniers mois : ${series
    .map((s) => `${monthLabel(s.month)} ${adminMoney(s.total)}`)
    .join(', ')}`;

  return (
    <div ref={box} className="relative text-admin">
      <svg
        viewBox={`0 0 ${width} ${HEIGHT}`}
        width="100%"
        height={HEIGHT}
        role="img"
        aria-label={summary}
        tabIndex={0}
        onPointerMove={nearest}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive(last)}
        onBlur={() => setActive(null)}
        onKeyDown={onKey}
        className="block touch-pan-y rounded-control focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-admin"
      >
        <defs>
          <linearGradient id="revenue-wash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity={0.16} />
            <stop offset="100%" stopColor="currentColor" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {g.ticks.map((t) => (
          <g key={t.value}>
            <line
              x1={MARGIN.left}
              x2={width - MARGIN.right}
              y1={t.y}
              y2={t.y}
              strokeWidth={1}
              className="stroke-admin-soft"
            />
            <text
              x={MARGIN.left - 8}
              y={t.y}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-ink-muted text-xs"
            >
              {t.label}
            </text>
          </g>
        ))}
        <path d={g.area} fill="url(#revenue-wash)" />
        <path
          d={g.line}
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-admin"
        />
        {g.points.map((p) => (
          <text
            key={p.month}
            x={p.x}
            y={HEIGHT - 8}
            textAnchor="middle"
            className="fill-ink-muted text-xs"
          >
            {shortMonthLabel(p.month)}
          </text>
        ))}
        {point && (
          <>
            <line
              x1={point.x}
              x2={point.x}
              y1={MARGIN.top}
              y2={g.baseline}
              strokeWidth={1}
              className="stroke-ink-muted"
            />
            <circle
              cx={point.x}
              cy={point.y}
              r={5}
              strokeWidth={2}
              className="fill-admin stroke-surface"
            />
          </>
        )}
      </svg>
      {point && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-control bg-deep px-3 py-2 text-center whitespace-nowrap text-deep-ink shadow-press"
          style={{
            left: `${Math.min(Math.max((point.x / width) * 100, 12), 88)}%`,
            top: `${point.y}px`,
          }}
        >
          <b className="block">{adminMoney(point.total)}</b>
          <span className="text-xs">{monthLabel(point.month)}</span>
        </div>
      )}
    </div>
  );
}

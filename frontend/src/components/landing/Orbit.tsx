'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Icon, Logo } from '@/components/ui';
import { pickWeighted } from '@/lib/tamani/landing';
import { formatPrice } from '@/lib/utils';
import { ORBIT_NETWORKS } from './content';
import { PlatformLogo } from './PlatformLogo';

const SVG_NS = 'http://www.w3.org/2000/svg';
const WEIGHTS = ORBIT_NETWORKS.map((n) => n.weight);
const TRAVEL_MS = 900;

interface Route {
  /** From the link to the tile. */
  out: string;
  /** Back from the tile to the link: the way an answer travels. */
  back: string;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Replays a CSS animation keyed on a data attribute. */
function replay(el: HTMLElement | SVGElement | null | undefined, attr: string) {
  if (!el) return;
  el.removeAttribute(attr);
  void el.getBoundingClientRect();
  el.setAttribute(attr, 'true');
}

/**
 * One link at the centre, the networks around it. While the orbit is on
 * screen, a network buzzes like a phone, a « +1 » travels back to the link
 * and the count of answers rises: the networks feed Tamani.
 */
export function Orbit({ startCount = 58 }: { startCount?: number }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef<SVGSVGElement>(null);
  const linesRef = useRef<SVGSVGElement>(null);
  const tileRefs = useRef<(HTMLLIElement | null)[]>([]);
  const routesRef = useRef<Route[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [box, setBox] = useState('0 0 0 0');
  const [on, setOn] = useState(false);
  const [count, setCount] = useState(startCount);

  useEffect(() => {
    routesRef.current = routes;
  }, [routes]);

  // Lines from the link's centre to each tile, redrawn when the layout changes.
  useEffect(() => {
    const root = rootRef.current;
    const core = coreRef.current;
    if (!root || !core) return;
    const trace = () => {
      const o = root.getBoundingClientRect();
      if (!o.width) return;
      const c = core.getBoundingClientRect();
      const cx = r1(c.left + c.width / 2 - o.left);
      const cy = r1(c.top + c.height / 2 - o.top);
      setBox(`0 0 ${r1(o.width)} ${r1(o.height)}`);
      setRoutes(
        tileRefs.current.map((t, k) => {
          const r = t?.getBoundingClientRect();
          const tx = r ? r1(r.left + r.width / 2 - o.left) : cx;
          const ty = r ? r1(r.top + r.height / 2 - o.top) : cy;
          const bend = (k % 2 ? 1 : -1) * Math.min(30, Math.hypot(tx - cx, ty - cy) * 0.12);
          const mx = r1((cx + tx) / 2 + bend);
          const my = r1((cy + ty) / 2 - bend);
          return {
            out: `M${cx} ${cy} Q${mx} ${my} ${tx} ${ty}`,
            back: `M${tx} ${ty} Q${mx} ${my} ${cx} ${cy}`,
          };
        }),
      );
    };
    const ro = new ResizeObserver(trace);
    ro.observe(root);
    void document.fonts?.ready.then(trace);
    return () => ro.disconnect();
  }, []);

  // Reveal once, then feed while on screen (never under reduced motion).
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let feeding = false;
    let visible = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const later = (fn: () => void, ms: number) => {
      const t = setTimeout(() => {
        timers.delete(t);
        fn();
      }, ms);
      timers.add(t);
    };

    const answer = (k: number) => {
      replay(tileRefs.current[k], 'data-buzz');
      later(() => {
        const route = routesRef.current[k];
        const fx = fxRef.current;
        if (!route || !fx) return;
        const line = linesRef.current?.children[k];
        if (line) {
          line.setAttribute('data-live', 'true');
          later(() => line.removeAttribute('data-live'), TRAVEL_MS);
        }
        const g = document.createElementNS(SVG_NS, 'g');
        g.setAttribute('opacity', '0');
        g.innerHTML =
          '<circle r="13"/><text y="4" text-anchor="middle">+1</text>' +
          `<animateMotion dur="${TRAVEL_MS}ms" begin="indefinite" fill="freeze" path="${route.back}" calcMode="spline" keyPoints="0;1" keyTimes="0;1" keySplines="0.5 0 0.35 1"/>` +
          `<animate attributeName="opacity" values="0;1;1" keyTimes="0;0.15;1" dur="${TRAVEL_MS}ms" begin="indefinite" fill="freeze"/>`;
        fx.appendChild(g);
        g.querySelectorAll<SVGAnimationElement>('animate, animateMotion').forEach((a) =>
          a.beginElement(),
        );
        later(() => {
          g.remove();
          setCount((c) => c + 1);
          replay(coreRef.current, 'data-pulse');
        }, TRAVEL_MS);
      }, 280);
    };

    const loop = () => {
      if (!feeding) return;
      answer(pickWeighted(WEIGHTS, Math.random()));
      timer = setTimeout(loop, 650 + Math.random() * 650);
    };
    const setFeeding = (next: boolean) => {
      if (reduce || next === feeding) return;
      feeding = next;
      clearTimeout(timer);
      if (feeding) timer = setTimeout(loop, 1300);
    };

    const io = new IntersectionObserver(
      ([e]) => {
        visible = Boolean(e?.isIntersecting);
        if (visible) setOn(true);
        setFeeding(visible && !document.hidden);
      },
      { threshold: 0.25 },
    );
    io.observe(root);
    const onVisibility = () => setFeeding(visible && !document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      feeding = false;
      clearTimeout(timer);
      timers.forEach(clearTimeout);
    };
  }, []);

  const tile = (k: number) => {
    const n = ORBIT_NETWORKS[k];
    if (!n) return null;
    const style = { '--x': `${n.x}%`, '--y': `${n.y}%`, '--k': k, '--c': n.color } as CSSProperties;
    return (
      <li
        key={n.slug}
        ref={(el) => {
          tileRefs.current[k] = el;
        }}
        className="lp-otile"
        style={style}
      >
        <span className="lp-otile__ic">
          <PlatformLogo slug={n.slug} />
        </span>
        <b>{n.label}</b>
        <span className="lp-otile__what">{n.what}</span>
      </li>
    );
  };

  return (
    <div ref={rootRef} className="lp-orbit" data-on={on ? 'true' : 'false'}>
      <svg ref={linesRef} className="lp-orbit__lines" viewBox={box} aria-hidden="true">
        {routes.map((r, k) => (
          <path key={k} d={r.out} pathLength={1} style={{ '--k': k } as CSSProperties} />
        ))}
      </svg>
      <ul className="lp-orbit__tiles lp-orbit__tiles--top">{[0, 1, 2, 3].map(tile)}</ul>
      <div ref={coreRef} className="lp-orbit__core">
        <Logo variant="mark" size={52} />
        <span className="lp-linkpill">
          <Icon name="link" />
          tamani.app/c/tAByq3A
        </span>
        <p className="lp-orbit__count">
          <b>{formatPrice(count)}</b>réponses reçues
        </p>
      </div>
      <ul className="lp-orbit__tiles lp-orbit__tiles--bottom">{[4, 5, 6, 7].map(tile)}</ul>
      <svg ref={fxRef} className="lp-orbit__fx" viewBox={box} aria-hidden="true" />
    </div>
  );
}

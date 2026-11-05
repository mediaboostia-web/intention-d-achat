// The support-admin revenue chart (lot 11b), as numbers: the y axis, the
// points and the SVG paths. Pure, so the geometry is tested without a DOM.
// Marks follow the dataviz rules: a 2px line, a ~10% area wash, a hairline
// grid on clean round ticks, compact labels from 10 000 up.

const NBSP = String.fromCharCode(0xa0);
const NUMBER = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

/** Axis labels: in full under 10 000, then « 15 k », « 1,5 M ». */
export function compactAmount(n: number): string {
  if (n >= 1_000_000) return `${NUMBER.format(n / 1_000_000)}${NBSP}M`;
  if (n >= 10_000) return `${NUMBER.format(n / 1000)}${NBSP}k`;
  return NUMBER.format(n);
}

/** Ticks from 0 to the first clean value at or above `max` (steps of 1, 2, 2.5 or 5 × 10ⁿ). */
export function axisTicks(max: number, steps = 4): number[] {
  if (!(max > 0)) return [0, 1000];
  const raw = max / steps;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw;
  const count = Math.ceil(max / step);
  return Array.from({ length: count + 1 }, (_, i) => i * step);
}

export interface ChartBox {
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface ChartPoint {
  month: string;
  total: number;
  x: number;
  y: number;
}

const round = (v: number) => Math.round(v * 10) / 10;
const pair = (x: number, y: number) => `${round(x)} ${round(y)}`;

/**
 * A monotone cubic curve through the points (Fritsch–Carlson): smooth like
 * the porteur's model, yet it never swings below 0 or above a month's peak,
 * so the area never shows money that did not come in.
 */
function monotonePath(points: readonly ChartPoint[]): string {
  const first = points[0];
  if (!first) return '';
  if (points.length === 1) return `M${pair(first.x, first.y)}`;
  const n = points.length;
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    dx.push(b.x - a.x);
    slope.push((b.y - a.y) / (b.x - a.x));
  }
  const tangent = points.map((_, i) => {
    if (i === 0) return slope[0]!;
    if (i === n - 1) return slope[n - 2]!;
    const before = slope[i - 1]!;
    const after = slope[i]!;
    return before * after <= 0 ? 0 : (before + after) / 2;
  });
  for (let i = 0; i < n - 1; i++) {
    const m = slope[i]!;
    if (m === 0) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
      continue;
    }
    const a = tangent[i]! / m;
    const b = tangent[i + 1]! / m;
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      tangent[i] = k * a * m;
      tangent[i + 1] = k * b * m;
    }
  }
  let path = `M${pair(first.x, first.y)}`;
  for (let i = 0; i < n - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const third = dx[i]! / 3;
    path += ` C${pair(a.x + third, a.y + tangent[i]! * third)} ${pair(b.x - third, b.y - tangent[i + 1]! * third)} ${pair(b.x, b.y)}`;
  }
  return path;
}

export function chartGeometry(
  series: readonly { month: string; total: number }[],
  box: ChartBox,
): {
  points: ChartPoint[];
  ticks: { value: number; y: number; label: string }[];
  baseline: number;
  line: string;
  area: string;
} {
  const values = axisTicks(Math.max(0, ...series.map((s) => s.total)));
  const topValue = values[values.length - 1] ?? 1;
  const baseline = box.height - box.bottom;
  const span = baseline - box.top;
  const inner = box.width - box.left - box.right;
  const step = series.length > 1 ? inner / (series.length - 1) : 0;
  const y = (v: number) => round(baseline - (v / topValue) * span);
  const points = series.map((s, i) => ({ ...s, x: round(box.left + i * step), y: y(s.total) }));
  const line = monotonePath(points);
  const first = points[0];
  const last = points[points.length - 1];
  const area =
    first && last ? `${line} L${pair(last.x, baseline)} L${pair(first.x, baseline)} Z` : '';
  return {
    points,
    ticks: values.map((value) => ({ value, y: y(value), label: compactAmount(value) })),
    baseline,
    line,
    area,
  };
}

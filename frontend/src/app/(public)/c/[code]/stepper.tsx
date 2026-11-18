'use client';

// − / number / +, for one option or one offer. The number takes typing for
// big orders; `max` is the stock left (2026-11-18).
export const MAX_PIECES = 100_000;

export function Stepper({
  id,
  label,
  value,
  onChange,
  max = MAX_PIECES,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
  max?: number;
}) {
  const square =
    'frame flex size-11 shrink-0 items-center justify-center rounded-control bg-surface text-xl font-bold text-ink active:translate-y-px disabled:opacity-40 motion-reduce:transition-none';
  const set = (n: number) => onChange(Math.max(0, Math.min(max, n)));
  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        aria-label={`Un de moins : ${label}`}
        disabled={value === 0}
        onClick={() => set(value - 1)}
        className={square}
      >
        −
      </button>
      <input
        id={id}
        aria-label={`Quantité : ${label}`}
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        placeholder="0"
        value={value === 0 ? '' : String(value)}
        onChange={(e) => set(Number(e.target.value.replace(/\D/g, '').slice(0, 6)) || 0)}
        className="frame h-11 w-16 rounded-control bg-surface text-center text-lg font-bold text-ink placeholder:text-ink-muted"
      />
      <button
        type="button"
        aria-label={`Un de plus : ${label}`}
        disabled={value >= max}
        onClick={() => set(value + 1)}
        className={square}
      >
        +
      </button>
    </div>
  );
}

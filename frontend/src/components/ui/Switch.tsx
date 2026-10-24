import type { ChangeEvent } from 'react';
import { cn } from '@/lib/utils';

/**
 * An on/off setting. The real checkbox (role="switch") sits under a drawn
 * track; the whole row is its label, so the target is the row, ≥ 48px.
 */
export function Switch({
  id,
  label,
  hint,
  checked,
  onChange,
  name,
  disabled,
  className,
}: {
  id: string;
  label: string;
  hint?: string | undefined;
  checked: boolean;
  onChange?: ((checked: boolean, event: ChangeEvent<HTMLInputElement>) => void) | undefined;
  name?: string | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label
        htmlFor={id}
        className={cn(
          'flex min-h-12 items-center justify-between gap-4',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        )}
      >
        <span className="font-bold text-ink">{label}</span>
        <span className="relative inline-flex shrink-0">
          <input
            id={id}
            name={name}
            type="checkbox"
            role="switch"
            checked={checked}
            disabled={disabled}
            aria-describedby={hintId}
            // No handler, no closure: the switch also renders in server pages.
            onChange={onChange ? (e) => onChange(e.target.checked, e) : undefined}
            readOnly={!onChange}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className="frame h-8 w-14 rounded-full bg-surface transition-colors peer-checked:bg-primary peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary motion-reduce:transition-none"
          />
          <span
            aria-hidden="true"
            className="absolute top-1.5 left-1.5 size-5 rounded-full bg-ink transition-transform peer-checked:translate-x-6 peer-checked:bg-surface motion-reduce:transition-none"
          />
        </span>
      </label>
      {hint && (
        <p id={hintId} className="text-sm text-ink-soft">
          {hint}
        </p>
      )}
    </div>
  );
}

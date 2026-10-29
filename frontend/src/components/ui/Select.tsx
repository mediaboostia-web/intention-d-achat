import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from './icons';
import { FieldShell, fieldIds, type FieldProps } from './Input';

export interface SelectProps
  extends FieldProps, Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'className'> {
  options: ReadonlyArray<{ value: string; label: string }>;
}

// The phone's own picker (native <select>): large, familiar, accessible.
// Disabled, it reads as fixed: a light frame and a lock instead of the
// arrow (the locked country, lot 7b); the hint says why.
export function Select({ id, label, hint, error, className, options, ...rest }: SelectProps) {
  const { describedBy } = fieldIds(id, hint, error);
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <div className="relative">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'min-h-12 w-full appearance-none rounded-control py-2 pr-11 pl-4 text-base',
            rest.disabled
              ? 'cursor-not-allowed border-[2.5px] border-ink-muted/50 bg-grid/40 text-ink-soft'
              : 'frame bg-surface text-ink',
          )}
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {rest.disabled ? (
          <Icon
            name="lock"
            className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-ink-muted"
          />
        ) : (
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-ink"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        )}
      </div>
    </FieldShell>
  );
}

import type { SelectHTMLAttributes } from 'react';
import { FieldShell, fieldIds, type FieldProps } from './Input';

export interface SelectProps
  extends FieldProps, Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'className'> {
  options: ReadonlyArray<{ value: string; label: string }>;
}

// The phone's own picker (native <select>): large, familiar, accessible.
export function Select({ id, label, hint, error, className, options, ...rest }: SelectProps) {
  const { describedBy } = fieldIds(id, hint, error);
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <div className="relative">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="frame min-h-12 w-full appearance-none rounded-control bg-surface py-2 pr-11 pl-4 text-base text-ink"
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
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
      </div>
    </FieldShell>
  );
}

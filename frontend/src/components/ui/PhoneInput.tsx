import type { InputHTMLAttributes } from 'react';
import { FieldShell, fieldIds, type FieldProps } from './Input';

export interface PhoneInputProps
  extends FieldProps, Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className' | 'type'> {
  /** Country dial code shown before the number; the shop's country by default. */
  dialCode?: string;
}

// Format only — the number is normalized server-side (normalizePhone, lot 3).
export function PhoneInput({
  id,
  label,
  hint,
  error,
  className,
  dialCode = '+221',
  ...rest
}: PhoneInputProps) {
  const dialId = `${id}-dial`;
  const { describedBy } = fieldIds(id, hint, error, dialId);
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <div className="frame flex min-h-12 items-stretch overflow-hidden rounded-control bg-surface focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-primary">
        <span
          id={dialId}
          className="flex items-center border-r-2 border-ink px-3 text-base font-bold text-ink-soft"
        >
          {dialCode}
        </span>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="min-w-0 flex-1 bg-transparent px-3 text-base text-ink outline-none placeholder:text-ink-muted"
          {...rest}
        />
      </div>
    </FieldShell>
  );
}

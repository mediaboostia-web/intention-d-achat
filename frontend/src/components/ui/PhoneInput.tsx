import type { InputHTMLAttributes } from 'react';
import { FieldShell, fieldIds, type FieldProps } from './Input';

export interface PhoneInputProps
  extends FieldProps, Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className' | 'type'> {
  /** Country dial code shown before the number; the shop's country by default. */
  dialCode?: string;
  /** With a list, the dial code becomes a choice of the number's country (lot 6b). */
  countries?: ReadonlyArray<{ code: string; label: string; dialCode: string }>;
  country?: string;
  onCountryChange?: (code: string) => void;
}

// Format only — the number is normalized server-side (normalizePhone, lot 3).
export function PhoneInput({
  id,
  label,
  hint,
  error,
  className,
  dialCode = '+221',
  countries,
  country,
  onCountryChange,
  ...rest
}: PhoneInputProps) {
  const chosen = countries?.find((c) => c.code === country);
  const shown = chosen?.dialCode ?? dialCode;
  const dialId = `${id}-dial`;
  const { describedBy } = fieldIds(id, hint, error, dialId);
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <div className="frame flex min-h-12 items-stretch overflow-hidden rounded-control bg-surface focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-primary">
        <span
          id={dialId}
          className="relative flex items-center border-r-2 border-ink px-3 text-base font-bold text-ink-soft"
        >
          {shown}
          {countries && (
            <>
              <span aria-hidden="true" className="ml-1 text-xs">
                ▾
              </span>
              {/* The select sits invisible on the dial code: the field stays narrow. */}
              <select
                aria-label="Pays du numéro"
                value={country}
                onChange={(e) => onCountryChange?.(e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
              >
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label} ({c.dialCode})
                  </option>
                ))}
              </select>
            </>
          )}
        </span>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          // w-full: an <input> otherwise keeps its intrinsic ~20ch width and
          // pushes the row past a 320px screen.
          className="w-full min-w-0 flex-1 bg-transparent px-3 text-base text-ink outline-none placeholder:text-ink-muted"
          {...rest}
        />
      </div>
    </FieldShell>
  );
}

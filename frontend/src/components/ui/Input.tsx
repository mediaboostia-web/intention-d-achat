import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface FieldProps {
  id: string;
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  className?: string | undefined;
}

/** Ids of the hint and error messages, and the matching aria-describedby. */
export function fieldIds(id: string, hint?: string, error?: string, extra?: string) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId, extra].filter(Boolean).join(' ') || undefined;
  return { hintId, errorId, describedBy };
}

/** Label above, hint and error below — shared by Input and PhoneInput. */
export function FieldShell({
  id,
  label,
  hint,
  error,
  className,
  children,
}: FieldProps & {
  children: ReactNode;
}) {
  const { hintId, errorId } = fieldIds(id, hint, error);
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-bold text-ink">
        {label}
      </label>
      {children}
      {hint && (
        <p id={hintId} className="text-sm text-ink-soft">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm font-bold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export interface InputProps
  extends FieldProps, Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'> {}

// Text stays at 16px (text-base): below that, iOS zooms in on focus.
export function Input({ id, label, hint, error, className, ...rest }: InputProps) {
  const { describedBy } = fieldIds(id, hint, error);
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="frame min-h-12 w-full rounded-control bg-surface px-4 text-base text-ink placeholder:text-ink-muted"
        {...rest}
      />
    </FieldShell>
  );
}

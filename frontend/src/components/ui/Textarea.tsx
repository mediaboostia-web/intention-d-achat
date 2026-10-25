import type { TextareaHTMLAttributes } from 'react';
import { FieldShell, fieldIds, type FieldProps } from './Input';

export interface TextareaProps
  extends FieldProps, Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'className'> {}

export function Textarea({ id, label, hint, error, className, rows = 5, ...rest }: TextareaProps) {
  const { describedBy } = fieldIds(id, hint, error);
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="frame w-full rounded-control bg-surface px-4 py-3 text-base leading-relaxed text-ink placeholder:text-ink-muted"
        {...rest}
      />
    </FieldShell>
  );
}

'use client';

// A password field with an eye: on a phone, the wholesaler checks what was
// typed before sending. Only the input's type changes, so the browser's
// password manager still recognises the field.
import { useState } from 'react';
import { Icon } from '@/components/ui';
import { FieldShell, fieldIds, type InputProps } from '@/components/ui/Input';

export type PasswordInputProps = Omit<InputProps, 'type'>;

/** Stateless: `visible` shows the password as text. */
export function PasswordFieldView({
  id,
  label,
  hint,
  error,
  className,
  visible,
  onToggle,
  ...rest
}: PasswordInputProps & { visible: boolean; onToggle: () => void }) {
  const { describedBy } = fieldIds(id, hint, error);
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          autoCapitalize="none"
          spellCheck={false}
          className="frame min-h-12 w-full rounded-control bg-surface py-0 pr-14 pl-4 text-base text-ink placeholder:text-ink-muted"
          {...rest}
        />
        <button
          type="button"
          aria-controls={id}
          aria-pressed={visible}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          onClick={onToggle}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-control text-ink-soft"
        >
          <Icon name={visible ? 'eye-off' : 'eye'} className="size-5" />
        </button>
      </div>
    </FieldShell>
  );
}

export function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return <PasswordFieldView {...props} visible={visible} onToggle={() => setVisible((v) => !v)} />;
}

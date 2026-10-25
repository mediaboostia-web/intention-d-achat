'use client';

import { useState } from 'react';
import { Button, Icon } from '@/components/ui';

/** Short words typed one by one (Enter, comma or "Ajouter"), shown as chips: zones, options. */
export function ChipsInput({
  id,
  label,
  hint,
  error,
  value,
  onChange,
  max,
  maxLength,
  placeholder,
  addLabel,
}: {
  id: string;
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  value: string[];
  onChange: (items: string[]) => void;
  max: number;
  maxLength: number;
  placeholder: string;
  /** Name of the text field for screen readers ("Nouvelle zone"). */
  addLabel: string;
}) {
  const [draft, setDraft] = useState('');
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  function add() {
    const item = draft.trim().replace(/\s+/g, ' ').slice(0, maxLength);
    setDraft('');
    if (!item || value.length >= max) return;
    if (value.some((v) => v.toLowerCase() === item.toLowerCase())) return;
    onChange([...value, item]);
  }

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-sm font-bold text-ink">{label}</legend>
      {value.length > 0 && (
        <ul className="mt-1.5 flex flex-wrap gap-2">
          {value.map((item) => (
            <li
              key={item}
              className="frame inline-flex items-center rounded-control bg-surface pl-3 font-bold text-ink"
            >
              {item}
              <button
                type="button"
                aria-label={`Retirer ${item}`}
                onClick={() => onChange(value.filter((v) => v !== item))}
                className="flex size-11 items-center justify-center rounded-control text-ink-soft"
              >
                <Icon name="close" className="size-5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {value.length < max && (
        <div className="mt-1.5 flex gap-2">
          <label htmlFor={id} className="sr-only">
            {addLabel}
          </label>
          <input
            id={id}
            value={draft}
            maxLength={maxLength}
            placeholder={placeholder}
            enterKeyHint="done"
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={add}
            onKeyDown={(e) => {
              // Enter would submit the whole form; here it adds the item.
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                add();
              }
            }}
            className="frame min-h-12 w-full min-w-0 flex-1 rounded-control bg-surface px-4 text-base text-ink placeholder:text-ink-muted"
          />
          <Button variant="secondary" onClick={add}>
            Ajouter
          </Button>
        </div>
      )}
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
    </fieldset>
  );
}

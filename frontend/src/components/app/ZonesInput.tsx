'use client';

import { useState } from 'react';
import { Button, Icon } from '@/components/ui';

const MAX_NAME = 60;

/** Delivery zones typed one by one (Enter, comma or "Ajouter"), shown as chips. */
export function ZonesInput({
  id,
  label,
  hint,
  value,
  onChange,
  max = 30,
}: {
  id: string;
  label: string;
  hint?: string | undefined;
  value: string[];
  onChange: (zones: string[]) => void;
  max?: number;
}) {
  const [draft, setDraft] = useState('');
  const hintId = hint ? `${id}-hint` : undefined;

  function add() {
    const name = draft.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME);
    setDraft('');
    if (!name || value.length >= max) return;
    if (value.some((z) => z.toLowerCase() === name.toLowerCase())) return;
    onChange([...value, name]);
  }

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-sm font-bold text-ink">{label}</legend>
      {value.length > 0 && (
        <ul className="mt-1.5 flex flex-wrap gap-2">
          {value.map((zone) => (
            <li
              key={zone}
              className="frame inline-flex items-center rounded-control bg-surface pl-3 font-bold text-ink"
            >
              {zone}
              <button
                type="button"
                aria-label={`Retirer ${zone}`}
                onClick={() => onChange(value.filter((z) => z !== zone))}
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
            Nouvelle zone
          </label>
          <input
            id={id}
            value={draft}
            maxLength={MAX_NAME}
            placeholder="Médina, Parcelles…"
            enterKeyHint="done"
            aria-describedby={hintId}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={add}
            onKeyDown={(e) => {
              // Enter would submit the whole form; here it adds the zone.
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
    </fieldset>
  );
}

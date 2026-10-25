'use client';

import { ChipsInput } from './ChipsInput';

/** Delivery zones (a district, a town), as chips. */
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
  return (
    <ChipsInput
      id={id}
      label={label}
      hint={hint}
      value={value}
      onChange={onChange}
      max={max}
      maxLength={60}
      placeholder="Médina, Parcelles…"
      addLabel="Nouvelle zone"
    />
  );
}

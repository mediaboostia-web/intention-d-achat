'use client';

// How much of the announced demand turns into real purchases (the estimate
// of lot 6): two sliders the wholesaler reads as "5 sur 10".
import { useState, type FormEvent } from 'react';
import { Button, Notice } from '@/components/ui';

/** 0.5 → "5 sur 10", 0.55 → "5,5 sur 10". */
export function coefLabel(coef: number): string {
  return `${(Math.round(coef * 100) / 10).toLocaleString('fr-FR')} sur 10`;
}

function Slider({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (percent: number) => void;
}) {
  const reading = coefLabel(value / 100);
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-bold text-ink">
        {label}
      </label>
      <div className="flex items-center gap-4">
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          step={5}
          value={value}
          aria-valuetext={reading}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-12 min-w-0 flex-1 accent-primary"
        />
        <output htmlFor={id} className="w-28 shrink-0 text-right font-sign text-xl text-primary">
          {reading}
        </output>
      </div>
    </div>
  );
}

export function CoefficientsForm({
  coefConsumer,
  coefReseller,
  onSave,
  error,
  formId,
  hideSubmit = false,
}: {
  coefConsumer: number;
  coefReseller: number;
  onSave: (coefs: { coefConsumer: number; coefReseller: number }) => Promise<void>;
  error?: string | null | undefined;
  /** Lets a button outside the form submit it (`form={formId}`). */
  formId?: string;
  /** The submit button lives elsewhere, e.g. in a section header. */
  hideSubmit?: boolean;
}) {
  const [consumer, setConsumer] = useState(Math.round(coefConsumer * 100));
  const [reseller, setReseller] = useState(Math.round(coefReseller * 100));
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ coefConsumer: consumer / 100, coefReseller: reseller / 100 });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form id={formId} onSubmit={(e) => void submit(e)} className="flex flex-col gap-6">
      <Slider
        id="coef-consumer"
        label="Sur 10 usagers intéressés, combien achètent vraiment ?"
        value={consumer}
        onChange={setConsumer}
      />
      <Slider
        id="coef-reseller"
        label="Sur 10 revendeurs intéressés, combien achètent vraiment ?"
        value={reseller}
        onChange={setReseller}
      />
      <p className="font-hand text-lg text-ink-muted">
        Par défaut : 5 usagers et 7 revendeurs sur 10. Tamani apprendra tes vrais chiffres.
      </p>
      {error && <Notice tone="danger">{error}</Notice>}
      {!hideSubmit && (
        <Button type="submit" className="self-start" disabled={saving}>
          {saving ? 'Enregistrement…' : "Enregistrer l'estimation"}
        </Button>
      )}
    </form>
  );
}

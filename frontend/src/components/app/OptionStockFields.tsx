'use client';

// A count per colour or size (porteur, 2026-11-18). In stock, it is what the
// wholesaler has of each, the cap a client cannot pass (it goes down with paid
// orders); incoming, how many of each he plans to order, with no cap.
import { Input } from '@/components/ui';

export function OptionStockFields({
  idPrefix,
  optionLabel,
  options,
  values,
  onChange,
  inStock,
  error,
}: {
  idPrefix: string;
  optionLabel: string | null;
  options: readonly string[];
  values: Readonly<Record<string, string>>;
  onChange: (values: Record<string, string>) => void;
  inStock: boolean;
  error?: string | undefined;
}) {
  const label = (optionLabel ?? 'option').toLocaleLowerCase('fr');
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="font-bold text-ink">
        {inStock ? `Combien en as-tu par ${label} ?` : `Combien prévois-tu par ${label} ?`}
      </legend>
      <p className="-mt-2 text-sm text-ink-soft">
        {inStock
          ? 'Tes clients ne peuvent pas en demander plus. Le stock baisse à chaque commande payée.'
          : 'Facultatif. Les réponses te diront combien commander de chaque.'}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {options.map((option, index) => (
          <Input
            key={option}
            id={`${idPrefix}-${index}`}
            label={option}
            inputMode="numeric"
            placeholder="0"
            value={values[option] ?? ''}
            onChange={(e) => onChange({ ...values, [option]: e.target.value })}
          />
        ))}
      </div>
      {error && <p className="text-sm font-bold text-danger">{error}</p>}
    </fieldset>
  );
}

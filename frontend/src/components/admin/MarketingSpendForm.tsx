'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button, Input } from '@/components/ui';
import { api } from '@/lib/api';
import { monthLabel } from '@/lib/tamani/admin-view';
import { currencyLabel } from '@/lib/tamani/currency';
import { parseAmount } from '@/lib/tamani/fcfa-input';

/** The month's marketing spend, which the CAC divides (super-admin only). */
export function MarketingSpendForm({ month, amount }: { month: string; amount: number | null }) {
  const router = useRouter();
  const [value, setValue] = useState(amount === null ? '' : String(amount));
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = parseAmount(value);
    if (parsed === null) {
      setState('error');
      return;
    }
    setState('saving');
    try {
      await api('/api/admin/marketing-spend', { method: 'PUT', body: { month, amount: parsed } });
      setState('saved');
      router.refresh();
    } catch {
      setState('error');
    }
  }

  return (
    <form id="marketing-spend" onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <Input
        id="marketing-spend-amount"
        label={`Dépense marketing de ${monthLabel(month)}`}
        hint={`Publicités, influenceurs, affiches… en ${currencyLabel('XOF')}. Elle sert au CAC.`}
        error={
          state === 'error'
            ? 'Montant non enregistré : vérifier le nombre, puis réessayer.'
            : undefined
        }
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setState('idle');
        }}
        className="min-w-0 flex-1"
      />
      <Button type="submit" disabled={state === 'saving'}>
        Enregistrer
      </Button>
      <p role="status" className="w-full text-sm text-ink-soft">
        {state === 'saved' ? 'Enregistré.' : ''}
      </p>
    </form>
  );
}

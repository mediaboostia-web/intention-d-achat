'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { Button, Input, Select } from '@/components/ui';
import { ApiError, api } from '@/lib/api';
import { dateLabel, planLabel } from '@/lib/tamani/admin-view';
import { currencyLabel } from '@/lib/tamani/currency';
import { parseGrantAmount } from '@/lib/tamani/admin-shops';
import { parseAmount } from '@/lib/tamani/fcfa-input';
import { PASS_IDS, PLANS } from '@/lib/tamani/plans';

const GRANTABLE = [...PASS_IDS, 'UNLIMITED'] as const;
type Grantable = (typeof GRANTABLE)[number];

const priceOf = (plan: Grantable) => String(PLANS[plan].priceXof ?? '');

function failure(err: unknown): string {
  if (err instanceof ApiError && err.status === 403) return 'Réservé au super-admin.';
  if (err instanceof ApiError && err.code === 'VALIDATION_FAILED') {
    return 'Vérifier les champs : jours de 1 à 366, réponses de 1 à 1 000 000.';
  }
  return "Le pass n'a pas été attribué. Réessayer.";
}

/** Grant a pass by hand: a gift (0), a payment received elsewhere, the Unlimited pass. */
export function GrantPassForm({ shopId }: { shopId: string }) {
  const router = useRouter();
  const busy = useRef(false);
  const [plan, setPlan] = useState<Grantable>('MONTH');
  const [amount, setAmount] = useState(priceOf('MONTH'));
  const [days, setDays] = useState('30');
  const [responses, setResponses] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const unlimited = plan === 'UNLIMITED';

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy.current) return;
    const paid = parseGrantAmount(amount);
    if (paid === null) {
      setMessage({ ok: false, text: 'Indiquer le montant reçu, 0 pour un cadeau.' });
      return;
    }
    busy.current = true;
    setMessage(null);
    try {
      const body = unlimited
        ? { plan, amount: paid, days: Number(days), responses: parseAmount(responses) ?? 0 }
        : { plan, amount: paid };
      const r = await api<{ endsAt: string }>(`/api/admin/shops/${shopId}/pass`, {
        method: 'POST',
        body,
      });
      setMessage({
        ok: true,
        text: `${planLabel(plan)} attribué jusqu'au ${dateLabel(r.endsAt)}.`,
      });
      router.refresh();
    } catch (err) {
      setMessage({ ok: false, text: failure(err) });
    } finally {
      busy.current = false;
    }
  }

  return (
    <form id="grant-pass" onSubmit={submit} className="space-y-3">
      <Select
        id="grant-plan"
        label="Pass"
        value={plan}
        onChange={(e) => {
          const next = e.target.value as Grantable;
          setPlan(next);
          setAmount(priceOf(next));
        }}
        options={GRANTABLE.map((p) => ({ value: p, label: planLabel(p) }))}
      />
      <Input
        id="grant-amount"
        label={`Montant reçu (${currencyLabel('XOF')})`}
        hint="0 pour un cadeau. Compté dans les encaissements."
        inputMode="numeric"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      {unlimited && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            id="grant-days"
            label="Durée (jours)"
            inputMode="numeric"
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
          <Input
            id="grant-responses"
            label="Réponses incluses"
            hint="Celles du devis, par exemple 50 000."
            inputMode="numeric"
            value={responses}
            onChange={(e) => setResponses(e.target.value)}
          />
        </div>
      )}
      <Button type="submit">Attribuer le pass</Button>
      <p role="status" className={message?.ok === false ? 'font-bold text-danger' : 'text-ink'}>
        {message?.text ?? ''}
      </p>
    </form>
  );
}

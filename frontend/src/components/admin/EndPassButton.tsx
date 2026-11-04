'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Button, Notice } from '@/components/ui';
import { ApiError, api } from '@/lib/api';

/** Status 0 is api()'s late or lost answer: the pass may well be ended. */
export function endFailure(err: unknown): string {
  if (err instanceof ApiError && err.status === 0) {
    return 'Pas de réponse à temps. Recharge la fiche pour voir si le pass a été retiré avant de réessayer.';
  }
  return "Le pass n'a pas été retiré. Réessayer.";
}

/** Ends the pass at once, behind a second tap that says what it costs. */
export function EndPassButton({ shopId }: { shopId: string }) {
  const router = useRouter();
  const busy = useRef(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    try {
      await api(`/api/admin/shops/${shopId}/pass`, { method: 'DELETE' });
      setAsking(false);
      router.refresh();
    } catch (err) {
      setError(endFailure(err));
      if (err instanceof ApiError && err.status === 0) router.refresh();
    } finally {
      busy.current = false;
    }
  }

  if (!asking) {
    return (
      <Button variant="secondary" onClick={() => setAsking(true)}>
        Retirer le pass
      </Button>
    );
  }
  return (
    <Notice tone="danger" title="Retirer le pass maintenant ?">
      <p>
        La boutique passe tout de suite en « Sans pass », sans grâce. Ses réponses non utilisées
        sont perdues.
      </p>
      {error && <p className="mt-2 font-bold">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-3">
        <Button onClick={confirm}>Oui, retirer</Button>
        <Button variant="secondary" onClick={() => setAsking(false)}>
          Garder le pass
        </Button>
      </div>
    </Notice>
  );
}

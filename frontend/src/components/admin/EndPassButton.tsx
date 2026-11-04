'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Button, Notice } from '@/components/ui';
import { api } from '@/lib/api';

/** Ends the pass at once, behind a second tap that says what it costs. */
export function EndPassButton({ shopId }: { shopId: string }) {
  const router = useRouter();
  const busy = useRef(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState(false);

  async function confirm() {
    if (busy.current) return;
    busy.current = true;
    setError(false);
    try {
      await api(`/api/admin/shops/${shopId}/pass`, { method: 'DELETE' });
      setAsking(false);
      router.refresh();
    } catch {
      setError(true);
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
      {error && <p className="mt-2 font-bold">Le pass n&apos;a pas été retiré. Réessayer.</p>}
      <div className="mt-3 flex flex-wrap gap-3">
        <Button onClick={confirm}>Oui, retirer</Button>
        <Button variant="secondary" onClick={() => setAsking(false)}>
          Garder le pass
        </Button>
      </div>
    </Notice>
  );
}

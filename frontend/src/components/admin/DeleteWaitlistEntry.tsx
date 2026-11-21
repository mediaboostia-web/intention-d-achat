'use client';

// One waitlist entry's delete (super-admin, 2026-11-21): a first tap asks,
// a second deletes. The server journals it.
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';

export function DeleteWaitlistEntry({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!confirm) return setConfirm(true);
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/waitlist/${id}`, { method: 'DELETE' });
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        type="button"
        variant="ghost"
        disabled={busy}
        aria-label={`${confirm ? 'Confirmer la suppression de' : 'Supprimer'} ${name} de la liste`}
        onClick={() => void remove()}
      >
        {confirm ? 'Confirmer' : 'Supprimer'}
      </Button>
      {error && (
        <span role="alert" className="text-sm text-danger">
          {error}
        </span>
      )}
    </span>
  );
}

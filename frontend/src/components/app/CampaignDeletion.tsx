'use client';

// « Supprimer la campagne » (porteur, 2026-11-04), at the bottom of the
// Modifier tab, for an owner or admin. The server decides: deleted when
// nobody answered, archived otherwise (removeCampaign). Then back to the list.
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Notice } from '@/components/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';
import { frenchSpacing } from '@/lib/tamani/typography';

export function CampaignDeletionView({
  asking,
  busy,
  error,
  onAsk,
  onKeep,
  onConfirm,
}: {
  asking: boolean;
  busy: boolean;
  error: string | null;
  onAsk: () => void;
  onKeep: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="mt-10 border-t-2 border-grid pt-6">
      {asking ? (
        <Notice
          tone="warning"
          title={frenchSpacing('Supprimer cette campagne ?')}
          action={
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" disabled={busy} onClick={onConfirm}>
                Oui, supprimer
              </Button>
              <Button variant="ghost" disabled={busy} onClick={onKeep}>
                Garder la campagne
              </Button>
            </div>
          }
        >
          Sans réponse, elle est effacée. Avec des réponses, elle est archivée&nbsp;: fermée et
          retirée de ta liste, ses réponses et tes clients restent.
        </Notice>
      ) : (
        <>
          <Button variant="ghost" disabled={busy} onClick={onAsk}>
            Supprimer la campagne
          </Button>
          <p className="text-sm text-ink-muted">
            Une campagne qui a déjà des réponses est archivée, pour garder tes clients.
          </p>
        </>
      )}
      {error && (
        <Notice tone="danger" className="mt-4">
          {error}
        </Notice>
      )}
    </div>
  );
}

export function CampaignDeletion({ shopId, campaignId }: { shopId: string; campaignId: string }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A second tap while the first is on its way does nothing.
  const sent = useRef(false);

  const confirm = async () => {
    if (sent.current) return;
    sent.current = true;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/shops/${shopId}/campaigns/${campaignId}`, { method: 'DELETE' });
      router.replace('/app/campagnes');
    } catch (err) {
      sent.current = false;
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <CampaignDeletionView
      asking={asking}
      busy={busy}
      error={error}
      onAsk={() => setAsking(true)}
      onKeep={() => setAsking(false)}
      onConfirm={() => void confirm()}
    />
  );
}

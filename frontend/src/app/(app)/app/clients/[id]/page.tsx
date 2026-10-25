'use client';

// /app/clients/[id]: one client and every answer they gave. A client whose
// answers are all locked or suspicious is not found (404), like one of
// another shop.
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ClientDetailView } from '@/components/app/ClientDetail';
import { useShop } from '@/components/app/ShopProvider';
import { Button, Notice } from '@/components/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';
import type { ClientDetail } from '@/lib/tamani/client-view';

export default function ClientPage() {
  const { id } = useParams<{ id: string }>();
  const { shop } = useShop();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    api<{ client: ClientDetail }>(`/api/shops/${shop.id}/clients/${encodeURIComponent(id)}`)
      .then((res) => live && setClient(res.client))
      .catch((err: unknown) => live && setError(errorMessage(err)));
    return () => {
      live = false;
    };
  }, [shop.id, id]);

  if (error) {
    return (
      <Notice
        tone="danger"
        action={
          <Button href="/app/clients" variant="secondary">
            Retour aux clients
          </Button>
        }
      >
        {error}
      </Notice>
    );
  }
  if (!client) {
    return (
      <div role="status" aria-label="Chargement du client">
        <div aria-hidden="true" className="flex flex-col gap-4 motion-safe:animate-pulse">
          <span className="h-16 w-2/3 rounded-card bg-grid/70" />
          <span className="h-12 w-48 rounded-card bg-grid/70" />
          <span className="h-40 rounded-card bg-grid/70" />
        </div>
      </div>
    );
  }
  return <ClientDetailView client={client} shopName={shop.name} now={new Date()} />;
}

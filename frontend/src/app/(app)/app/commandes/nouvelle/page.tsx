'use client';

// /app/commandes/nouvelle: an order typed by hand (lot 7). Loads the products
// on sale, the campaigns and the zones, then opens the new order.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OrderForm, type OrderProductChoice } from '@/components/app/OrderForm';
import { useShop } from '@/components/app/ShopProvider';
import { Button, EmptyState, Notice, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';
import type { ShopCampaign } from '@/lib/tamani/campaign-view';
import type { OrderBody } from '@/lib/tamani/order-form';
import type { OrderRow } from '@/lib/tamani/orders-view';
import type { ShopProduct } from '@/lib/tamani/product-form';

interface Choices {
  products: OrderProductChoice[];
  campaigns: Array<{ id: string; title: string; productId: string }>;
  zones: Array<{ id: string; name: string }>;
}

export default function NewOrderPage() {
  const { shop } = useShop();
  const router = useRouter();
  const [choices, setChoices] = useState<Choices | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setLoadError(null);
    // Campaigns and zones only enrich the form: a failure leaves them out.
    Promise.all([
      api<{ items: ShopProduct[] }>(`/api/shops/${shop.id}/products?limit=50`),
      api<{ items: ShopCampaign[] }>(`/api/shops/${shop.id}/campaigns?limit=50`).catch(() => ({
        items: [],
      })),
      api<{ items: Array<{ id: string; name: string }> }>(`/api/shops/${shop.id}/zones`).catch(
        () => ({ items: [] }),
      ),
    ])
      .then(
        ([products, campaigns, zones]) =>
          live &&
          setChoices({
            products: products.items.map((p) => ({
              id: p.id,
              name: p.name,
              unitLabel: p.unitLabel,
              unitPrice: p.unitPrice,
              wholesalePrice: p.wholesalePrice,
              wholesaleMinQty: p.wholesaleMinQty,
            })),
            campaigns: campaigns.items.map((c) => ({
              id: c.id,
              title: c.title,
              productId: c.productId,
            })),
            zones: zones.items.map((z) => ({ id: z.id, name: z.name })),
          }),
      )
      .catch((err: unknown) => live && setLoadError(errorMessage(err)));
    return () => {
      live = false;
    };
  }, [shop.id, attempt]);

  async function create(body: OrderBody): Promise<boolean> {
    setError(null);
    try {
      const res = await api<{ order: OrderRow }>(`/api/shops/${shop.id}/orders`, {
        method: 'POST',
        body,
      });
      router.push(`/app/commandes/${encodeURIComponent(res.order.id)}`);
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    }
  }

  return (
    <>
      <PageHeader title="Nouvelle commande" />
      <div className="mt-6">
        {loadError ? (
          <Notice
            tone="danger"
            action={
              <Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
                Réessayer
              </Button>
            }
          >
            {loadError}
          </Notice>
        ) : choices === null ? (
          <div role="status" className="flex flex-col gap-3 motion-safe:animate-pulse">
            <span className="sr-only">Chargement de tes produits…</span>
            <span aria-hidden="true" className="h-12 rounded-card bg-grid/70" />
            <span aria-hidden="true" className="h-12 rounded-card bg-grid/70" />
            <span aria-hidden="true" className="h-20 rounded-card bg-grid/70" />
          </div>
        ) : choices.products.length === 0 ? (
          <EmptyState
            title="Ajoute d'abord un produit"
            action={
              <Button href="/app/produits/nouveau" className="mt-2">
                Ajouter un produit
              </Button>
            }
          >
            Une commande porte sur un produit de ta boutique.
          </EmptyState>
        ) : (
          <OrderForm
            products={choices.products}
            campaigns={choices.campaigns}
            zones={choices.zones}
            country={shop.country}
            error={error}
            onSubmit={create}
          />
        )}
      </div>
    </>
  );
}

'use client';

// /app/campagnes/nouvelle. ?produit= (after the first product) preselects it.
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CampaignWizard } from '@/components/app/CampaignWizard';
import { useShop } from '@/components/app/ShopProvider';
import { Button, Notice, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';
import type { ShopCampaign } from '@/lib/tamani/campaign-view';
import { initialWizardState, toCampaignBody, type WizardState } from '@/lib/tamani/campaign-wizard';
import type { ShopProduct } from '@/lib/tamani/product-form';

function NewCampaign() {
  const { shop } = useShop();
  const router = useRouter();
  const wanted = useSearchParams().get('produit');
  const [products, setProducts] = useState<ShopProduct[] | null>(null);
  const [zonesCount, setZonesCount] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setLoadError(null);
    api<{ items: ShopProduct[] }>(`/api/shops/${shop.id}/products?limit=50`)
      .then((res) => live && setProducts(res.items))
      .catch((err: unknown) => live && setLoadError(errorMessage(err)));
    // The zones only decide a warning: a failure leaves it out.
    api<{ items: unknown[] }>(`/api/shops/${shop.id}/zones`)
      .then((res) => live && setZonesCount(res.items.length))
      .catch(() => live && setZonesCount(null));
    return () => {
      live = false;
    };
  }, [shop.id, attempt]);

  async function submit(state: WizardState, status: 'DRAFT' | 'ACTIVE') {
    try {
      const res = await api<{ campaign: ShopCampaign }>(`/api/shops/${shop.id}/campaigns`, {
        method: 'POST',
        body: toCampaignBody(state, status, new Date()),
      });
      router.push(`/app/campagnes/${res.campaign.id}?partager=1`);
      return null;
    } catch (err) {
      return errorMessage(err);
    }
  }

  return (
    <>
      <PageHeader title="Nouvelle campagne" />
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
        ) : products === null ? (
          <div role="status" className="flex flex-col gap-3 motion-safe:animate-pulse">
            <span className="sr-only">Chargement de tes produits…</span>
            <span aria-hidden="true" className="h-8 w-1/2 rounded-card bg-grid/70" />
            <span aria-hidden="true" className="h-20 rounded-card bg-grid/70" />
            <span aria-hidden="true" className="h-20 rounded-card bg-grid/70" />
          </div>
        ) : (
          <CampaignWizard
            products={products}
            zonesCount={zonesCount}
            initial={initialWizardState(products.some((p) => p.id === wanted) ? wanted : null)}
            currency={shop.currency}
            onSubmit={submit}
          />
        )}
      </div>
    </>
  );
}

export default function NewCampaignPage() {
  return (
    <Suspense fallback={null}>
      <NewCampaign />
    </Suspense>
  );
}

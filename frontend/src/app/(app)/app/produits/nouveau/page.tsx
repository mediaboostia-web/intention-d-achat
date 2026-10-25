'use client';

// /app/produits/nouveau. After the welcome page (?premier=1) the next step
// is the first campaign, with this product already chosen.
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProductForm } from '@/components/app/ProductForm';
import { useShop } from '@/components/app/ShopProvider';
import { useShopUnits } from '@/components/app/use-shop-units';
import { Button, Notice, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';
import type { ProductBody, ShopProduct } from '@/lib/tamani/product-form';

function NewProduct() {
  const { shop } = useShop();
  const router = useRouter();
  const params = useSearchParams();
  const first = params.get('premier') === '1';
  const units = useShopUnits(shop.id);
  const [error, setError] = useState<string | null>(null);

  async function create(body: ProductBody) {
    setError(null);
    try {
      const res = await api<{ product: ShopProduct }>(`/api/shops/${shop.id}/products`, {
        method: 'POST',
        body,
      });
      router.push(
        first
          ? `/app/campagnes/nouvelle?produit=${encodeURIComponent(res.product.id)}`
          : '/app/produits',
      );
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <>
      {params.get('zones') === 'echec' && (
        <Notice
          tone="warning"
          className="mb-8"
          action={
            <Button href="/app/reglages" variant="secondary">
              Ouvrir les réglages
            </Button>
          }
        >
          Ta boutique est créée, mais des zones de livraison n&apos;ont pas été enregistrées.
          Ajoute-les dans Réglages.
        </Notice>
      )}
      <PageHeader title="Nouveau produit" />
      {first && (
        <p className="mt-2 font-hand text-xl text-primary">Ensuite : tu le mets en campagne.</p>
      )}
      <ProductForm
        className="mt-8"
        submitLabel="Ajouter le produit"
        submittingLabel="Ajout…"
        units={units}
        error={error}
        onSubmit={create}
      />
    </>
  );
}

export default function NewProductPage() {
  return (
    <Suspense fallback={null}>
      <NewProduct />
    </Suspense>
  );
}

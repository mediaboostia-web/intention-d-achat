'use client';

// /app/produits/[id]: edit a product, or take it out of sale. A product with
// past campaigns is archived (they stay readable), one without is deleted;
// one with a running campaign is refused (409 PRODUCT_IN_USE).
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProductForm } from '@/components/app/ProductForm';
import { useShop } from '@/components/app/ShopProvider';
import { Badge, Button, Notice, PageHeader } from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';
import { productToForm, type ProductBody, type ShopProduct } from '@/lib/tamani/product-form';

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { shop, role } = useShop();
  const router = useRouter();
  const { toast } = useToast();
  const [product, setProduct] = useState<ShopProduct | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const path = `/api/shops/${shop.id}/products/${encodeURIComponent(id)}`;

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setProduct((await api<{ product: ShopProduct }>(path)).product);
    } catch (err) {
      setLoadError(errorMessage(err));
    }
  }, [path]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(body: ProductBody) {
    setError(null);
    try {
      await api(path, { method: 'PATCH', body });
      toast('Produit enregistré.', 'success');
      router.push('/app/produits');
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function remove() {
    setRemoving(true);
    setRemoveError(null);
    try {
      const res = await api<{ archived?: boolean; deleted?: boolean }>(path, { method: 'DELETE' });
      toast(
        res.archived
          ? 'Produit archivé : ses campagnes passées restent consultables.'
          : 'Produit supprimé.',
        'success',
      );
      router.push('/app/produits');
    } catch (err) {
      setRemoveError(errorMessage(err));
      setConfirming(false);
      setRemoving(false);
    }
  }

  if (loadError) {
    return (
      <Notice
        tone="danger"
        action={
          <Button href="/app/produits" variant="secondary">
            Revenir aux produits
          </Button>
        }
      >
        {loadError}
      </Notice>
    );
  }
  if (!product) {
    return (
      <div role="status" className="flex flex-col gap-4 motion-safe:animate-pulse">
        <span className="sr-only">Chargement du produit…</span>
        <span aria-hidden="true" className="h-10 w-2/3 rounded-card bg-grid/70" />
        <span aria-hidden="true" className="h-64 rounded-card bg-grid/70" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={product.name}
        note={
          product.archivedAt
            ? "Ce produit n'est plus proposé dans tes nouvelles campagnes."
            : undefined
        }
        action={product.archivedAt ? <Badge tone="neutral">Archivé</Badge> : undefined}
      />
      <ProductForm
        key={product.id}
        className="mt-8"
        initial={productToForm(product)}
        submitLabel="Enregistrer le produit"
        error={error}
        onSubmit={save}
      />

      {role !== 'MEMBER' && !product.archivedAt && (
        <section className="mt-12 border-t-2 border-dashed border-grid pt-8">
          <h2 className="font-hand text-2xl font-bold text-primary">Retirer ce produit</h2>
          <p className="mt-2 text-ink-soft">
            S&apos;il a déjà servi dans une campagne, il est archivé et ses campagnes restent
            consultables.
          </p>
          {removeError && (
            <Notice tone="danger" className="mt-4">
              {removeError}
            </Notice>
          )}
          {confirming ? (
            <Notice
              tone="warning"
              className="mt-4"
              title={`Retirer « ${product.name} » ?`}
              action={
                <div className="flex flex-wrap gap-3">
                  <Button variant="secondary" disabled={removing} onClick={() => void remove()}>
                    {removing ? 'Retrait…' : 'Oui, retirer'}
                  </Button>
                  <Button variant="ghost" disabled={removing} onClick={() => setConfirming(false)}>
                    Annuler
                  </Button>
                </div>
              }
            >
              Il disparaît de ta liste de produits en vente.
            </Notice>
          ) : (
            <Button variant="secondary" className="mt-4" onClick={() => setConfirming(true)}>
              Retirer ce produit
            </Button>
          )}
        </section>
      )}
    </>
  );
}

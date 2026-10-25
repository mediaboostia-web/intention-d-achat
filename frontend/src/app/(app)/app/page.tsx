'use client';

// /app, for now: a greeting and the first step. The "bulletin du jour"
// dashboard replaces it in lot 6.
import { useShop } from '@/components/app/ShopProvider';
import { Button, EmptyState, PageHeader } from '@/components/ui';
import { formatDateFr } from '@/lib/tamani/dates';

export default function HomePage() {
  const { shop } = useShop();
  return (
    <>
      <PageHeader
        title={`Bonjour, ${shop.name}`}
        note={`Aujourd'hui, ${formatDateFr(new Date())}`}
      />
      <EmptyState
        className="mt-8"
        title="Lance ta première campagne"
        action={
          <div className="mt-2 flex flex-wrap gap-3">
            <Button href="/app/produits/nouveau" className="shadow-press">
              Ajouter un produit
            </Button>
            <Button href="/app/campagnes/nouvelle" variant="secondary">
              Créer une campagne
            </Button>
          </div>
        }
      >
        Ajoute un produit, puis partage une campagne sur WhatsApp : ta communauté te dit combien en
        commander.
      </EmptyState>
    </>
  );
}

import { Button, EmptyState, PageHeader } from '@/components/ui';

// The orders module arrives in lot 7; until then the page says what will appear here.
export default function OrdersPage() {
  return (
    <>
      <PageHeader title="Commandes" />
      <EmptyState
        className="mt-8"
        title="Pas encore de commande"
        action={
          <Button href="/app/campagnes/nouvelle" className="mt-2">
            Créer une campagne
          </Button>
        }
      >
        Tes commandes apparaîtront ici quand tes intéressés passeront commande.
      </EmptyState>
    </>
  );
}

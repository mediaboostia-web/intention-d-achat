import { Button, EmptyState, PageHeader } from '@/components/ui';

// The clients module arrives in lot 7; until then the page says what will appear here.
export default function ClientsPage() {
  return (
    <>
      <PageHeader title="Clients" />
      <EmptyState
        className="mt-8"
        title="Pas encore de client"
        action={
          <Button href="/app/campagnes/nouvelle" className="mt-2">
            Créer une campagne
          </Button>
        }
      >
        Tes clients apparaîtront ici dès que ta communauté répondra à une campagne.
      </EmptyState>
    </>
  );
}

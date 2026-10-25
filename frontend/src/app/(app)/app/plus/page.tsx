'use client';

// /app/plus: what the phone's bottom bar has no room for — products,
// settings, the plan and signing out.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useShop, type Shop } from '@/components/app/ShopProvider';
import { Button, Icon, PageHeader, type IconName } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { formatDateFr } from '@/lib/tamani/dates';
import { PLANS } from '@/lib/tamani/plans';

const LINKS: ReadonlyArray<{ href: string; icon: IconName; label: string; note: string }> = [
  { href: '/app/produits', icon: 'box', label: 'Produits', note: 'Tes produits et leurs prix' },
  { href: '/app/reglages', icon: 'gear', label: 'Réglages', note: 'Boutique, zones, compte' },
];

function planSentence(plan: Shop['plan']): string {
  const { label } = PLANS[plan.id];
  if (plan.id === 'FREE' || !plan.currentPeriodEnd) return label;
  return `${label} jusqu'au ${formatDateFr(new Date(plan.currentPeriodEnd))}`;
}

export default function PlusPage() {
  const router = useRouter();
  const { shop } = useShop();
  const { user, logout, loggingOut } = useAuth();
  const plan = PLANS[shop.plan.id];

  async function signOut() {
    await logout();
    router.replace('/login');
  }

  return (
    <>
      <PageHeader title="Plus" />
      <ul className="mt-8 flex flex-col gap-3">
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="frame flex min-h-16 items-center gap-4 rounded-card bg-surface px-4 py-3"
            >
              <Icon name={l.icon} className="text-primary" />
              <span className="flex flex-col">
                <span className="font-bold text-ink">{l.label}</span>
                <span className="text-sm text-ink-soft">{l.note}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="frame mt-8 rounded-card bg-surface p-5">
        <h2 className="font-hand text-2xl font-bold text-primary">Ton forfait</h2>
        <p className="mt-2 text-lg font-bold text-ink">{planSentence(shop.plan)}</p>
        {plan.maxActiveCampaigns !== null && (
          <p className="mt-1 text-ink-soft">
            {plan.maxActiveCampaigns} campagnes en cours au plus, {plan.monthlyResponses} réponses
            par mois.
          </p>
        )}
        {shop.plan.inGrace && (
          <p className="mt-1 text-sm font-bold text-warning">
            Paiement en attente : renouvelle ton forfait pour le garder.
          </p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-hand text-2xl font-bold text-primary">Ton compte</h2>
        {user && <p className="mt-2 text-ink-soft">{user.email}</p>}
        <Button
          variant="secondary"
          className="mt-4"
          disabled={loggingOut}
          onClick={() => void signOut()}
        >
          {loggingOut ? 'Déconnexion…' : 'Se déconnecter'}
        </Button>
      </section>
    </>
  );
}

'use client';

// /app/plus (porteur's feedback 2, §8): one list, an icon on each line, of
// what the phone's bottom bar has no room for. The plan line keeps the
// #forfait anchor the upgrade links point at. Aide waits for Tamani's
// WhatsApp contact (LANDING_LINKS): a null link hides the line.
import type { ReactNode } from 'react';
import Link from 'next/link';
import type { Shop } from '@/components/app/shop-context';
import { Icon, type IconName } from '@/components/ui';
import { formatDateFr } from '@/lib/tamani/dates';
import { PLANS } from '@/lib/tamani/plans';
import { cn } from '@/lib/utils';

const ROW = 'frame flex min-h-16 w-full items-center gap-4 rounded-card bg-surface px-4 py-3';

const LINKS: ReadonlyArray<{ href: string; icon: IconName; label: string; note: string }> = [
  {
    href: '/app/reglages',
    icon: 'gear',
    label: 'Réglages de la boutique',
    note: 'Boutique, zones, estimation',
  },
  {
    href: '/app/reglages#notifications',
    icon: 'bell',
    label: 'Notifications',
    note: 'Être prévenu à chaque réponse',
  },
  { href: '/app/profil', icon: 'user', label: 'Profil', note: 'Ton nom, ton mot de passe' },
];

/** « Sans pass », or « Pass Mois jusqu'au 24 novembre 2026 » for a pass with an end date. */
export function planSentence(plan: Shop['plan']): string {
  const { label } = PLANS[plan.id];
  if (plan.id === 'FREE' || !plan.endsAt) return label;
  return `${label} jusqu'au ${formatDateFr(new Date(plan.endsAt))}`;
}

function RowBody({
  icon,
  label,
  children,
  arrow = false,
}: {
  icon: IconName;
  label: string;
  children?: ReactNode;
  arrow?: boolean;
}) {
  return (
    <>
      <Icon name={icon} className="text-primary" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-bold text-ink">{label}</span>
        {children}
      </span>
      {arrow && <Icon name="chevron-right" className="size-5 text-ink-muted" />}
    </>
  );
}

const note = (text: string) => <span className="text-sm text-ink-soft">{text}</span>;

export function PlusMenu({
  plan,
  help,
  signingOut,
  onSignOut,
}: {
  plan: Shop['plan'];
  /** Tamani's WhatsApp contact (a wa.me link), or null while it is not given. */
  help: string | null;
  signingOut: boolean;
  onSignOut: () => void;
}) {
  const limits = PLANS[plan.id];
  return (
    <ul className="mt-8 flex flex-col gap-3">
      <li>
        <Link href="/app/produits" className={ROW}>
          <RowBody icon="box" label="Produits" arrow>
            {note('Tes produits et leurs prix')}
          </RowBody>
        </Link>
      </li>
      <li id="forfait" className="scroll-mt-6">
        <div className={ROW}>
          <RowBody icon="tag" label="Forfait">
            <span className="font-bold text-ink-soft">{planSentence(plan)}</span>
            {limits.maxActiveCampaigns !== null &&
              note(
                `${limits.maxActiveCampaigns} campagne en cours au plus, ${limits.includedResponses ?? 0} réponses.`,
              )}
            {plan.inGrace && (
              <span className="text-sm font-bold text-warning">
                Paiement en attente&nbsp;: renouvelle ton forfait pour le garder.
              </span>
            )}
          </RowBody>
        </div>
      </li>
      {LINKS.map((l) => (
        <li key={l.href}>
          <Link href={l.href} className={ROW}>
            <RowBody icon={l.icon} label={l.label} arrow>
              {note(l.note)}
            </RowBody>
          </Link>
        </li>
      ))}
      {help && (
        <li>
          <a href={help} target="_blank" rel="noopener noreferrer" className={ROW}>
            <RowBody icon="whatsapp" label="Aide" arrow>
              {note("Écris à l'équipe Tamani sur WhatsApp")}
            </RowBody>
          </a>
        </li>
      )}
      <li>
        <button
          type="button"
          disabled={signingOut}
          onClick={onSignOut}
          className={cn(ROW, 'text-left disabled:opacity-60')}
        >
          <RowBody icon="logout" label={signingOut ? 'Déconnexion…' : 'Se déconnecter'} />
        </button>
      </li>
    </ul>
  );
}

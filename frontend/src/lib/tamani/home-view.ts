// The home page's words (porteur's feedback §3 bis): the greeting, the
// activity rows read like a mobile-money history, what is coming up, and
// the first steps of an empty shop. Pure and shared with the browser; the
// summary itself is built by lib/server/tamani/summary.ts.
import type { IconName } from '@/components/ui/icons';
import { pluralizeUnit } from './verdict-display';

/** What GET /api/shops/[orgId]/summary sends (lot 5b; lot 6 adds the verdicts). */
export interface ShopSummary {
  week: {
    /** Completed answers on 7 rolling days, locked ones included. */
    completed: number;
    /** The same on the last 24 hours. */
    sinceYesterday: number;
    /** Yes answers on 7 days, locked and suspicious ones left out. */
    interested: number;
    /** Openings of the campaigns open now, since they started (openings are not dated). */
    opensRunning: number;
    /** Clients first seen this week. */
    newClients: number;
  };
  activity: ActivityItem[];
  upcoming: UpcomingItem[];
  hasCampaign: boolean;
  hasProduct: boolean;
  shareCampaign: { id: string; title: string; shareMessage: string } | null;
}

export type ActivityItem =
  | {
      kind: 'RESPONSE';
      id: string;
      at: string;
      campaignId: string;
      productName: string;
      unitLabel: string;
      /** Over the monthly quota: interested and quantity stay hidden. */
      locked: boolean;
      interested: boolean | null;
      quantity: number | null;
    }
  | { kind: 'NEW_CLIENT'; id: string; at: string; respondentId: string; firstName: string | null };

export interface UpcomingItem {
  kind: 'ENDS' | 'ARRIVES';
  campaignId: string;
  title: string;
  at: string;
}

/** By the phone's clock: Bonjour from 5 h, Bon après-midi from noon, Bonsoir from 18 h. */
export function greeting(firstName: string | null, shopName: string, now: Date): string {
  const h = now.getHours();
  const word = h >= 5 && h < 12 ? 'Bonjour' : h >= 12 && h < 18 ? 'Bon après-midi' : 'Bonsoir';
  return `${word}, ${firstName ?? shopName}`;
}

export interface ActivityLine {
  title: string;
  detail: string;
  /** Right-hand side: the quantity of a yes, "non" for a no. */
  amount: string | null;
  tone: 'yes' | 'no' | 'neutral';
  icon: IconName;
  href: string;
}

export function activityLine(item: ActivityItem): ActivityLine {
  if (item.kind === 'NEW_CLIENT') {
    return {
      title: item.firstName ?? 'Nouveau client',
      detail: item.firstName ? 'Nouveau client' : 'Ajouté à tes clients',
      amount: null,
      tone: 'neutral',
      icon: 'user',
      href: `/app/clients/${item.respondentId}`,
    };
  }
  const href = `/app/campagnes/${item.campaignId}`;
  if (item.locked) {
    return {
      title: 'Réponse en attente',
      detail: 'Forfait du mois plein',
      amount: null,
      tone: 'neutral',
      icon: 'lock',
      href,
    };
  }
  if (item.interested === false) {
    return {
      title: item.productName,
      detail: 'Pas pour cette fois',
      amount: 'non',
      tone: 'no',
      icon: 'close',
      href,
    };
  }
  return {
    title: item.productName,
    detail: 'Nouvelle réponse',
    amount:
      item.quantity === null
        ? 'oui'
        : `${item.quantity} ${pluralizeUnit(item.unitLabel, item.quantity)}`,
    tone: 'yes',
    icon: 'check',
    href,
  };
}

const DAY_MS = 86_400_000;

/** Calendar days from now's day to the item's day, in UTC (Dakar is UTC+0). */
function daysAhead(at: Date, now: Date): number {
  const day = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((day(at) - day(now)) / DAY_MS);
}

export function upcomingLine(
  item: UpcomingItem,
  now: Date,
): { title: string; when: string; href: string } {
  const n = daysAhead(new Date(item.at), now);
  const when = n <= 0 ? "aujourd'hui" : n === 1 ? 'demain' : `dans ${n} jours`;
  return {
    title: `${item.kind === 'ENDS' ? 'Fin de' : 'Arrivage de'} ${item.title}`,
    when,
    href: `/app/campagnes/${item.campaignId}`,
  };
}

/** "Pour bien démarrer": a sequence, so the steps are numbered. */
export function onboardingSteps(s: {
  hasProduct: boolean;
  hasCampaign: boolean;
}): Array<{ label: string; href: string; done: boolean }> {
  return [
    { label: 'Ajoute un produit', href: '/app/produits/nouveau', done: s.hasProduct },
    { label: 'Crée et partage une campagne', href: '/app/campagnes/nouvelle', done: s.hasCampaign },
  ];
}

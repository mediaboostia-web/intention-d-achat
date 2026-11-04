// The support-admin journal (lot 11): what each audited action is called,
// the one line it says about what changed, and the page of its target. The
// metadata is read field by field: a row the kit wrote, or one written
// before a change of shape, says nothing rather than breaking the page.
import { userRoleLabel } from './admin-users';
import { adminMoney, planLabel } from './admin-view';
import { ADMIN_HOME } from './admin-nav';

/** How many actions the journal shows. */
export const JOURNAL_SIZE_SHOWN = 100;

export type JournalEntry = {
  id: string;
  action: string;
  actorEmail: string;
  target: { type: string; id: string; label: string | null } | null;
  metadata: unknown;
  createdAt: string;
};

const LABELS: Record<string, string> = {
  'shop.pass_grant': 'Pass attribué',
  'shop.pass_end': 'Pass arrêté',
  'marketing.spend_set': 'Dépenses marketing saisies',
  'user.create': 'Compte créé',
  'user.rename': 'Compte renommé',
  'user.role_change': 'Rôle changé',
  'user.suspend': 'Compte suspendu',
  'user.restore': 'Compte rétabli',
};

/** French name of an action; an unknown one keeps its code. */
export function actionLabel(action: string): string {
  return LABELS[action] ?? action;
}

function field(metadata: unknown, key: string): unknown {
  if (typeof metadata !== 'object' || metadata === null) return undefined;
  return (metadata as Record<string, unknown>)[key];
}

const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** What changed, in one line, or null when the metadata does not say. */
export function actionDetail(action: string, metadata: unknown): string | null {
  const from = field(metadata, 'from');
  const to = field(metadata, 'to');
  const fromText = str(from);
  const toText = str(to);
  switch (action) {
    case 'shop.pass_grant': {
      const plan = str(field(metadata, 'plan'));
      const amount = num(field(metadata, 'amount'));
      if (plan === null || amount === null) return null;
      const days = num(field(metadata, 'days'));
      return [planLabel(plan), days === null ? null : `${days} jours`, adminMoney(amount)]
        .filter((part) => part !== null)
        .join(' · ');
    }
    case 'shop.pass_end':
      return fromText === null ? null : `Avant : ${planLabel(fromText)}`;
    case 'user.role_change':
      return fromText === null || toText === null
        ? null
        : `${userRoleLabel(fromText)} → ${userRoleLabel(toText)}`;
    case 'marketing.spend_set': {
      const after = num(to);
      if (after === null) return null;
      const before = num(from);
      return `${before === null ? '—' : adminMoney(before)} → ${adminMoney(after)}`;
    }
    default:
      return null;
  }
}

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** The support-admin page of an action's target, when it has one. */
export function targetHref(type: string | null, id: string | null): string | null {
  if (type === null || id === null) return null;
  if (type === 'Organization') return `${ADMIN_HOME}/boutiques/${id}`;
  if (type === 'User') return `${ADMIN_HOME}/utilisateurs/${id}`;
  if (type === 'MarketingSpend' && MONTH.test(id)) return `${ADMIN_HOME}?mois=${id}`;
  return null;
}

// Times read in Cotonou, the porteur's town (UTC+1 all year).
const ZONE = 'Africa/Porto-Novo';
const DAY = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: ZONE,
});
const HOUR = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: ZONE,
});

/** « 4 nov. 2026 à 10:30 », Cotonou time. */
export function journalWhen(iso: string): string {
  const at = new Date(iso);
  return `${DAY.format(at)} à ${HOUR.format(at)}`;
}

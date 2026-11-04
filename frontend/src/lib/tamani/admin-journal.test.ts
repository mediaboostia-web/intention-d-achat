import { describe, expect, it } from 'vitest';
import { actionDetail, actionLabel, targetHref } from './admin-journal';

// formatMoney writes a no-break space between thousands: compare as text.
const SPACES = new RegExp(`[${String.fromCharCode(0xa0, 0x202f)}]`, 'g');
const plain = (s: string | null) => (s === null ? null : s.replace(SPACES, ' '));

describe('actionLabel', () => {
  it('names each back-office action in French', () => {
    expect(actionLabel('shop.pass_grant')).toBe('Pass attribué');
    expect(actionLabel('shop.pass_end')).toBe('Pass arrêté');
    expect(actionLabel('marketing.spend_set')).toBe('Dépenses marketing saisies');
    expect(actionLabel('user.create')).toBe('Compte créé');
    expect(actionLabel('user.rename')).toBe('Compte renommé');
    expect(actionLabel('user.role_change')).toBe('Rôle changé');
    expect(actionLabel('user.suspend')).toBe('Compte suspendu');
    expect(actionLabel('user.restore')).toBe('Compte rétabli');
  });

  it('names the super-admin made by the command line', () => {
    expect(actionLabel('BOOTSTRAP_SUPERADMIN')).toBe('Super-admin nommé (ligne de commande)');
    expect(actionDetail('BOOTSTRAP_SUPERADMIN', { via: 'cli-script', previousRole: 'USER' })).toBe(
      'Utilisateur → Super-admin',
    );
  });

  it('keeps the code of an action it does not know', () => {
    expect(actionLabel('outbox.retry')).toBe('outbox.retry');
  });
});

describe('actionDetail', () => {
  it('writes the pass, its days and its amount', () => {
    expect(plain(actionDetail('shop.pass_grant', { plan: 'WEEK', amount: 3900 }))).toBe(
      'Pass Semaine · 3 900 FCFA',
    );
    expect(plain(actionDetail('shop.pass_grant', { plan: 'UNLIMITED', days: 30, amount: 0 }))).toBe(
      'Pass Illimité · 30 jours · 0 FCFA',
    );
  });

  it('writes what changed, before → after', () => {
    expect(actionDetail('shop.pass_end', { from: 'MONTH' })).toBe('Avant : Pass Mois');
    expect(actionDetail('user.role_change', { from: 'USER', to: 'ADMIN' })).toBe(
      'Utilisateur → Admin',
    );
    expect(plain(actionDetail('marketing.spend_set', { from: null, to: 25000 }))).toBe(
      '— → 25 000 FCFA',
    );
  });

  it('says nothing when the metadata is missing or not what it expects', () => {
    expect(actionDetail('user.rename', null)).toBeNull();
    expect(actionDetail('shop.pass_grant', { plan: 42 })).toBeNull();
    expect(actionDetail('user.role_change', 'oops')).toBeNull();
    expect(actionDetail('outbox.retry', { from: 'a', to: 'b' })).toBeNull();
  });
});

describe('targetHref', () => {
  it('links a shop, an account and a month to their page', () => {
    expect(targetHref('Organization', 'org_1')).toBe('/support-admin/boutiques/org_1');
    expect(targetHref('User', 'u_1')).toBe('/support-admin/utilisateurs/u_1');
    expect(targetHref('MarketingSpend', '2026-10')).toBe('/support-admin?mois=2026-10');
  });

  it('links nothing it has no page for', () => {
    expect(targetHref('Order', 'o_1')).toBeNull();
    expect(targetHref(null, null)).toBeNull();
    expect(targetHref('MarketingSpend', 'pas-un-mois')).toBeNull();
  });
});

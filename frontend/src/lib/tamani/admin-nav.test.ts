import { describe, expect, it } from 'vitest';
import { ADMIN_HOME, ADMIN_NAV, adminGate, isAdminLinkActive } from './admin-nav';

describe('support-admin navigation', () => {
  it('lives at /support-admin (porteur, 2026-10-30), dashboard first', () => {
    expect(ADMIN_HOME).toBe('/support-admin');
    expect(ADMIN_NAV.map((l) => l.href)).toEqual([
      '/support-admin',
      '/support-admin/liste-attente',
      '/support-admin/boutiques',
      '/support-admin/utilisateurs',
      '/support-admin/journal',
    ]);
    expect(ADMIN_NAV.map((l) => l.label)).toEqual([
      'Tableau de bord',
      "Liste d'attente",
      'Boutiques',
      'Utilisateurs',
      'Journal',
    ]);
  });

  it('marks the dashboard only on its own page, a section on its sub-pages', () => {
    expect(isAdminLinkActive('/support-admin', '/support-admin')).toBe(true);
    expect(isAdminLinkActive('/support-admin', '/support-admin/boutiques')).toBe(false);
    expect(isAdminLinkActive('/support-admin/boutiques', '/support-admin/boutiques/org_1')).toBe(
      true,
    );
    expect(isAdminLinkActive('/support-admin/boutiques', '/support-admin/utilisateurs')).toBe(
      false,
    );
  });
});

describe('adminGate', () => {
  it('sends a visitor without a session to sign in', () => {
    expect(adminGate(401)).toBe('login');
  });

  it('hides the back-office from a signed-in user who is not an admin', () => {
    expect(adminGate(403)).toBe('hidden');
  });

  it('lets an admin in', () => {
    expect(adminGate('ok')).toBe('ok');
  });
});

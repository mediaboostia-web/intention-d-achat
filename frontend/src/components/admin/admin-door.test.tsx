import { describe, expect, it, vi } from 'vitest';
import { html, text } from '@/components/ui/test-html';

vi.mock('next/navigation', async () => (await import('@/test-utils/next-navigation')).navigation);

import { ADMIN_DOOR, adminGate, maskEmail } from '@/lib/tamani/admin-nav';
import { AdminDoor } from './AdminDoor';

describe('AdminDoor', () => {
  it('asks for the password first, with no way to create an account or use Google', () => {
    const out = html(<AdminDoor />);
    const t = text(<AdminDoor />);
    expect(t).toContain('Connexion admin');
    expect(t).toContain('Ton mot de passe, puis un code envoyé sur ton e-mail.');
    expect(out).toContain('type="email"');
    expect(out).toContain('autoComplete="current-password"');
    expect(t).not.toContain('Créer un compte');
    expect(t).not.toContain('Google');
    expect(out).not.toContain('href="/signup"');
  });

  it('goes straight to the code for an admin already signed in, who asks for it', () => {
    const t = text(<AdminDoor signedInAs="hu•••@gmail.com" />);
    expect(t).toContain('Ton code');
    expect(t).toContain('hu•••@gmail.com');
    expect(t).toContain('Recevoir mon code par e-mail');
    expect(t).toContain('Ouvrir le Support-admin');
    expect(html(<AdminDoor signedInAs="hu•••@gmail.com" />)).toContain(
      'autoComplete="one-time-code"',
    );
  });
});

describe('the door helpers', () => {
  it('ADMIN_DOOR is the back-office sign-in page', () => {
    expect(ADMIN_DOOR).toBe('/support-admin/connexion');
  });
  it('adminGate sends to the door without a session or without the code', () => {
    expect(adminGate(401)).toBe('login');
    expect(adminGate(403)).toBe('hidden');
    expect(adminGate('ok')).toBe('ok');
    expect(adminGate('ok', false)).toBe('login');
  });
  it('maskEmail keeps two letters and the domain', () => {
    expect(maskEmail('hullysdesire@gmail.com')).toBe('hu•••@gmail.com');
    expect(maskEmail('a@b.co')).toBe('a•••@b.co');
    expect(maskEmail('nope')).toBe('•••');
  });
});

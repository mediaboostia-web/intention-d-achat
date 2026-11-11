import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NextRequest } from 'next/server';
import { afterEach, describe, it, expect, vi } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));

// The prefixes are read once, when Next loads the file: load it per test.
async function loadProxy(prefixes: string) {
  vi.stubEnv('AUTH_PROTECTED_PREFIXES', prefixes);
  vi.stubEnv('AUTH_LOGIN_PATH', '/login');
  vi.resetModules();
  return (await import('./proxy')).proxy;
}

const request = (path: string, cookies: Record<string, string> = {}) => {
  const req = new NextRequest(`http://localhost:3001${path}`);
  for (const [name, value] of Object.entries(cookies)) req.cookies.set(name, value);
  return req;
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('proxy (protected pages)', () => {
  it('sits where Next 16 reads it: next to app/, named proxy', () => {
    expect(existsSync(resolve(here, 'proxy.ts'))).toBe(true);
    expect(existsSync(resolve(here, '../middleware.ts'))).toBe(false);
    expect(existsSync(resolve(here, 'middleware.ts'))).toBe(false);
  });

  it('sends a visitor without a session from /app to /login?next=', async () => {
    const proxy = await loadProxy('/app,/admin');
    const res = proxy(request('/app/campagnes?statut=ACTIVE'));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe(
      'http://localhost:3001/login?next=%2Fapp%2Fcampagnes%3Fstatut%3DACTIVE',
    );
  });

  it('refreshes silently when only the refresh cookie is left', async () => {
    const proxy = await loadProxy('/app,/admin');
    const res = proxy(request('/app', { 'app-refresh': 'r' }));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe(
      'http://localhost:3001/api/auth/refresh-and-return?next=%2Fapp',
    );
  });

  it('lets a signed-in visitor and public pages through', async () => {
    const proxy = await loadProxy('/app,/admin');
    expect(proxy(request('/app', { 'app-token': 't' })).headers.get('location')).toBeNull();
    expect(proxy(request('/login')).headers.get('location')).toBeNull();
    expect(proxy(request('/application')).headers.get('location')).toBeNull();
  });

  // Porteur, 2026-10-30: the back-office moved to /support-admin; Vercel's
  // AUTH_PROTECTED_PREFIXES still says /admin, so it covers both.
  it('protects /support-admin wherever /admin is protected', async () => {
    const proxy = await loadProxy('/app,/admin');
    const res = proxy(request('/support-admin/boutiques'));
    expect(res.status).toBe(303);
    // Lot 11c: the back-office has its own sign-in page.
    expect(res.headers.get('location')).toBe('http://localhost:3001/support-admin/connexion');
    expect(proxy(request('/support-admin')).headers.get('location')).toBe(
      'http://localhost:3001/support-admin/connexion',
    );
    // The door itself renders without a session: no redirect, no loop.
    expect(proxy(request('/support-admin/connexion')).headers.get('location')).toBeNull();
    // With a refresh cookie only, the door first gets a fresh session like any page.
    expect(
      proxy(request('/support-admin/connexion', { 'app-refresh': 'r' })).headers.get('location'),
    ).toBe('http://localhost:3001/api/auth/refresh-and-return?next=%2Fsupport-admin%2Fconnexion');
    // The shop space still goes to the shop's sign-in page.
    expect(proxy(request('/app/plus')).headers.get('location')).toBe(
      'http://localhost:3001/login?next=%2Fapp%2Fplus',
    );
    expect(proxy(request('/support-administrer')).headers.get('location')).toBeNull();
  });

  it('leaves /support-admin alone when /admin is not protected', async () => {
    const proxy = await loadProxy('/app');
    expect(proxy(request('/support-admin')).headers.get('location')).toBeNull();
  });
});

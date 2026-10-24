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
});

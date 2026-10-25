import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

const req = () => new NextRequest('http://localhost/api/push/public-key');

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('GET /api/push/public-key', () => {
  it('returns the VAPID public key when push is configured', async () => {
    vi.stubEnv('VAPID_PUBLIC_KEY', 'BPublicKey');
    vi.stubEnv('VAPID_PRIVATE_KEY', 'private');
    vi.stubEnv('VAPID_SUBJECT', 'mailto:notifications@tamani.app');
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ publicKey: 'BPublicKey' });
  });

  it('503 PUSH_NOT_CONFIGURED otherwise', async () => {
    vi.stubEnv('VAPID_PUBLIC_KEY', '');
    const res = await GET(req());
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: 'PUSH_NOT_CONFIGURED' });
  });
});

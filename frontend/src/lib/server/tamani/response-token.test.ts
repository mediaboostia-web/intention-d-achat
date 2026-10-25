import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifyToken } from '@/lib/server/auth';
import { signResponseToken, verifyResponseToken } from './response-token';

const p = { responseId: 'resp_1', deviceId: '7b0c6f1e-2a3b-4c5d-8e9f-0a1b2c3d4e5f' };

afterEach(() => {
  vi.useRealTimers();
});

describe('response token', () => {
  it('round-trips responseId and deviceId', async () => {
    expect(await verifyResponseToken(await signResponseToken(p))).toEqual(p);
  });

  it('rejects a tampered token', async () => {
    const token = await signResponseToken(p);
    const last = token.at(-1) === 'A' ? 'B' : 'A';
    expect(await verifyResponseToken(token.slice(0, -1) + last)).toBeNull();
    expect(await verifyResponseToken('abc')).toBeNull();
  });

  it('expires after 90 days', async () => {
    const token = await signResponseToken(p);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 91 * 24 * 3600 * 1000);
    expect(await verifyResponseToken(token)).toBeNull();
  });

  it('a response token is never accepted as an access token', async () => {
    expect(await verifyToken(await signResponseToken(p))).toBeNull();
  });
});

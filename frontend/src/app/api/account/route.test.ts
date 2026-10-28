// PATCH /api/account: the signed-in person renames themselves (porteur's
// feedback 2, §8). The kit has no route for the name.
import { prismaMock } from '@/test-utils/prisma-mock';
import { __cookieStore, mockNextCookies } from '@/test-utils/mock-cookies';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, signIn, TEST_USER } from '@/test-utils/shop-fixtures';
import { log } from '@/lib/server/observability/log';

mockNextCookies();

import { PATCH } from './route';

const patch = (body: unknown, csrf = true) =>
  PATCH(apiRequest('/api/account', { method: 'PATCH', body, csrf }));

describe('PATCH /api/account', () => {
  beforeEach(() => {
    __cookieStore.clear();
  });

  it('401 without a session', async () => {
    const res = await patch({ name: 'Fatou Ndiaye' });
    expect(res.status).toBe(401);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('403 without the CSRF token', async () => {
    await signIn();
    const res = await patch({ name: 'Fatou Ndiaye' }, false);
    expect(res.status).toBe(403);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('400 with an empty, missing or too long name', async () => {
    await signIn();
    for (const body of [
      { name: '' },
      { name: '   ' },
      {},
      { name: 42 },
      { name: 'a'.repeat(81) },
    ]) {
      const res = await patch(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect((await res.json()).error).toBe('VALIDATION_FAILED');
    }
    const broken = await PATCH(apiRequest('/api/account', { method: 'PATCH', body: '{oops' }));
    expect(broken.status).toBe(400);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('200 with a name to clean, on the signed-in user only', async () => {
    await signIn();
    prismaMock.user.update.mockResolvedValue({ name: 'Fatou Ndiaye' } as never);
    const res = await patch({ name: '  Fatou Ndiaye  ', id: 'user_2', email: 'x@test.local' });
    expect(res.status).toBe(200);
    expect(res.headers.get('x-request-id')).toBeTruthy();
    expect(await res.json()).toEqual({ user: { name: 'Fatou Ndiaye' } });
    expect(prismaMock.user.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: TEST_USER.id },
      data: { name: 'Fatou Ndiaye' },
      select: { name: true },
    });
  });

  it('accepts 80 characters', async () => {
    await signIn();
    const name = 'b'.repeat(80);
    prismaMock.user.update.mockResolvedValue({ name } as never);
    const res = await patch({ name });
    expect(res.status).toBe(200);
  });

  it('never writes the name in the logs', async () => {
    const spies = (['debug', 'info', 'warn', 'error'] as const).map((level) =>
      vi.spyOn(log, level),
    );
    await signIn();
    prismaMock.user.update.mockResolvedValue({ name: 'Mariama Diop' } as never);
    await patch({ name: 'Mariama Diop' });
    for (const spy of spies) {
      expect(JSON.stringify(spy.mock.calls)).not.toContain('Mariama');
      spy.mockRestore();
    }
  });
});

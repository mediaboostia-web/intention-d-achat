import { describe, it, expect } from 'vitest';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { jsonOk, readJson, validationFailed } from './http';

describe('http helpers', () => {
  it('jsonOk returns the body and the status', async () => {
    const res = jsonOk({ ok: 1 }, 201);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: 1 });
  });

  it('jsonOk carries the request id of the current context', async () => {
    const ctx = makeRequestContext(new Headers({ 'x-request-id': 'abcdef12-3456' }));
    const res = await withRequestContext(ctx, () => jsonOk({}));
    expect(res.headers.get('x-request-id')).toBe('abcdef12-3456');
  });

  it('validationFailed is the kit 400', async () => {
    const res = validationFailed();
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'VALIDATION_FAILED',
      message: 'Invalid request body',
    });
  });

  it('readJson returns null on a malformed body', async () => {
    const req = new Request('http://x/', { method: 'POST', body: '{' });
    expect(await readJson(req)).toBeNull();
  });
});

import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { DEVICE_A, DEVICE_B, publicLink } from '@/test-utils/public-fixtures';

vi.mock('@/lib/server/redis', () => ({ redis: null }));

const { POST } = await import('./route');

function post(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/public/views', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '41.82.3.3' },
    body: JSON.stringify(body),
  });
}

function givenLink() {
  prismaMock.campaignLink.findUnique.mockResolvedValue(publicLink() as never);
}

describe('POST /api/public/views', () => {
  it('counts the first view of the day', async () => {
    givenLink();
    const res = await POST(post({ code: 'Ab3dE7x', deviceId: DEVICE_A }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(prismaMock.campaignLink.update).toHaveBeenCalledWith({
      where: { id: 'link_1' },
      data: { openCount: { increment: 1 } },
    });
  });

  it('skips a repeated view', async () => {
    givenLink();
    await POST(post({ code: 'Ab3dE7x', deviceId: DEVICE_B }));
    prismaMock.campaignLink.update.mockClear();
    const res = await POST(post({ code: 'Ab3dE7x', deviceId: DEVICE_B }));
    expect(res.status).toBe(200);
    expect(prismaMock.campaignLink.update).not.toHaveBeenCalled();
  });

  it('404 for an unknown code', async () => {
    prismaMock.campaignLink.findUnique.mockResolvedValue(null);
    const res = await POST(post({ code: 'Zz9Zz9Z', deviceId: DEVICE_A }));
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: 'CAMPAIGN_NOT_FOUND' });
  });

  it('400 on a bad body', async () => {
    const res = await POST(post({ code: 'Ab3dE7x' }));
    expect(res.status).toBe(400);
  });
});

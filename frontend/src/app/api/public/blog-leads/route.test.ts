import { prismaMock } from '@/test-utils/prisma-mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { log } from '@/lib/server/observability/log';

vi.mock('@/lib/server/redis', () => ({ redis: null }));

const { POST, runtime } = await import('./route');

let ipSeq = 0;
function post(body: unknown, ip = `41.82.2.${++ipSeq}`): NextRequest {
  return new NextRequest('http://localhost/api/public/blog-leads', {
    method: 'POST',
    headers: new Headers({ 'content-type': 'application/json', 'x-forwarded-for': ip }),
    body: JSON.stringify(body),
  });
}

const BODY = {
  firstName: 'Awa',
  phone: '01 97 12 34 56',
  country: 'BJ',
  consent: true,
  post: 'mon-article',
};

beforeEach(() => {
  prismaMock.blogPost.findFirst.mockResolvedValue({
    id: 'p1',
    guide: { id: 'g1', url: 'https://boutique.example.com/guide' },
  } as never);
  prismaMock.blogLead.create.mockResolvedValue({} as never);
});

describe('POST /api/public/blog-leads', () => {
  it('runs on node', () => {
    expect(runtime).toBe('nodejs');
  });

  it('keeps the contact with its article and guide, then gives the guide link', async () => {
    const res = await POST(post(BODY));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: 'https://boutique.example.com/guide' });
    expect(prismaMock.blogLead.create).toHaveBeenCalledWith({
      data: {
        firstName: 'Awa',
        phone: '+2290197123456',
        country: 'BJ',
        postId: 'p1',
        guideId: 'g1',
        consentAt: expect.any(Date),
      },
    });
  });

  it('never writes the number or the first name in a log', async () => {
    const spies = (['info', 'warn', 'error'] as const).map((l) => vi.spyOn(log, l));
    await POST(post(BODY));
    const logged = JSON.stringify(spies.flatMap((s) => s.mock.calls));
    expect(logged).not.toContain('0197123456');
    expect(logged).not.toContain('Awa');
  });

  it('a wrong number is INVALID_PHONE', async () => {
    const res = await POST(post({ ...BODY, phone: '12' }));
    expect(res.status).toBe(400);
    expect(prismaMock.blogLead.create).not.toHaveBeenCalled();
  });

  it('no consent, no contact', async () => {
    const res = await POST(post({ ...BODY, consent: false }));
    expect(res.status).toBe(400);
  });

  it('a bot that fills the hidden field gets an answer and nothing is kept', async () => {
    const res = await POST(post({ ...BODY, website: 'spam.example' }));
    expect(res.status).toBe(200);
    expect(prismaMock.blogLead.create).not.toHaveBeenCalled();
  });

  it('without any guide the route says so', async () => {
    prismaMock.blogPost.findFirst.mockResolvedValue(null);
    prismaMock.blogGuide.findFirst.mockResolvedValue(null);
    const res = await POST(post(BODY));
    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: string }).error).toBe('BLOG_NOT_FOUND');
  });
});

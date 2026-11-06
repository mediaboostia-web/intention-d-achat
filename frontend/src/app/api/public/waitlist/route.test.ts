import { prismaMock } from '@/test-utils/prisma-mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { log } from '@/lib/server/observability/log';

vi.mock('@/lib/server/redis', () => ({ redis: null }));

const { POST } = await import('./route');

let ipSeq = 0;
function post(body: unknown, ip = `41.82.1.${++ipSeq}`): NextRequest {
  return new NextRequest('http://localhost/api/public/waitlist', {
    method: 'POST',
    headers: new Headers({ 'content-type': 'application/json', 'x-forwarded-for': ip }),
    body: JSON.stringify(body),
  });
}

const BODY = {
  firstName: 'Awa',
  phone: '01 97 12 34 56',
  country: 'BJ',
  email: ' Awa@Test.Local ',
  channels: ['CHAINE_WHATSAPP'],
  source: 'tiktok-j01',
  consent: true,
};

beforeEach(() => {
  prismaMock.waitlistEntry.findFirst.mockResolvedValue(null);
  prismaMock.waitlistEntry.create.mockResolvedValue({
    firstName: 'Awa',
    createdAt: new Date(),
  } as never);
  prismaMock.waitlistEntry.count.mockResolvedValue(11);
});

describe('POST /api/public/waitlist', () => {
  it('reserves a place: the number in international form, the e-mail in lower case', async () => {
    const res = await POST(post(BODY));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ position: 12, firstName: 'Awa' });
    expect(prismaMock.waitlistEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          firstName: 'Awa',
          phone: '+2290197123456',
          email: 'awa@test.local',
          channels: ['CHAINE_WHATSAPP'],
          source: 'tiktok-j01',
        }),
      }),
    );
  });

  it('answers a known contact with the name just typed, never the one stored', async () => {
    prismaMock.waitlistEntry.findFirst.mockResolvedValue({
      firstName: 'Fatou',
      createdAt: new Date(),
    } as never);
    const res = await POST(post(BODY));
    expect(((await res.json()) as { firstName: string }).firstName).toBe('Awa');
  });

  it('keeps an unknown source out', async () => {
    await POST(post({ ...BODY, source: '<script>alert(1)</script>' }));
    expect(prismaMock.waitlistEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ source: null }) }),
    );
  });

  it('answers a bot that filled the hidden field as usual, and writes nothing', async () => {
    const res = await POST(post({ ...BODY, website: 'https://spam.example' }));
    expect(res.status).toBe(200);
    expect(prismaMock.waitlistEntry.create).not.toHaveBeenCalled();
  });

  it('needs a WhatsApp or an e-mail', async () => {
    const res = await POST(post({ ...BODY, phone: '', email: '' }));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe('VALIDATION_FAILED');
  });

  it('refuses a number that is not a phone number', async () => {
    const res = await POST(post({ ...BODY, phone: '12', email: '' }));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe('INVALID_PHONE');
    expect(prismaMock.waitlistEntry.create).not.toHaveBeenCalled();
  });

  it('slows down one address that sends too many', async () => {
    const ip = '41.82.9.9';
    let last = 200;
    for (let i = 0; i < 40; i++) last = (await POST(post(BODY, ip))).status;
    expect(last).toBe(429);
  });

  it('never writes the number or the e-mail in a log', async () => {
    const spies = (['info', 'warn', 'error', 'debug'] as const).map((k) => vi.spyOn(log, k));
    prismaMock.waitlistEntry.create.mockRejectedValueOnce(new Error('database down'));
    await POST(post(BODY)).catch(() => {});
    const logged = JSON.stringify(spies.flatMap((s) => s.mock.calls));
    expect(logged).not.toContain('2290197123456');
    expect(logged).not.toContain('awa@test.local');
    expect(logged).not.toContain('Awa');
  });
});

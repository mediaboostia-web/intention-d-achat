import { prismaMock } from '@/test-utils/prisma-mock';
import { beforeEach, describe, expect, it } from 'vitest';
import { joinWaitlist, waitlistCount } from './waitlist';

const NOW = new Date('2026-11-06T10:00:00Z');
const INPUT = {
  firstName: 'Awa',
  phone: '+2290197000000',
  email: null,
  channels: ['CHAINE_WHATSAPP'],
  source: 'tiktok-j01',
};
const ROW = {
  id: 'w_1',
  firstName: 'Awa',
  phone: '+2290197000000',
  email: null,
  channels: ['CHAINE_WHATSAPP'],
  source: 'tiktok-j01',
  consentAt: NOW,
  createdAt: NOW,
};

beforeEach(() => {
  prismaMock.waitlistEntry.findFirst.mockResolvedValue(null);
  prismaMock.waitlistEntry.create.mockResolvedValue(ROW as never);
  prismaMock.waitlistEntry.count.mockResolvedValue(11);
});

describe('joinWaitlist', () => {
  it('adds a seller and gives their place in the list', async () => {
    const r = await joinWaitlist(prismaMock, INPUT, NOW);
    expect(r).toEqual({ position: 12, firstName: 'Awa', already: false });
    expect(prismaMock.waitlistEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ...INPUT, consentAt: NOW }),
      }),
    );
    // The place counts the sellers who came before.
    expect(prismaMock.waitlistEntry.count).toHaveBeenCalledWith({
      where: { createdAt: { lt: NOW } },
    });
  });

  it('gives a known contact back their own place, without a second line', async () => {
    prismaMock.waitlistEntry.findFirst.mockResolvedValue(ROW as never);
    prismaMock.waitlistEntry.count.mockResolvedValue(4);
    const r = await joinWaitlist(
      prismaMock,
      { ...INPUT, phone: null, email: 'awa@test.local' },
      NOW,
    );
    expect(r).toEqual({ position: 5, firstName: 'Awa', already: true });
    expect(prismaMock.waitlistEntry.create).not.toHaveBeenCalled();
    expect(prismaMock.waitlistEntry.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { OR: [{ email: 'awa@test.local' }] } }),
    );
  });

  it('looks the contact up by WhatsApp and by e-mail', async () => {
    await joinWaitlist(prismaMock, { ...INPUT, email: 'awa@test.local' }, NOW);
    expect(prismaMock.waitlistEntry.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ phone: '+2290197000000' }, { email: 'awa@test.local' }] },
      }),
    );
  });

  it('reads a sign-up sent twice at once as the same place', async () => {
    prismaMock.waitlistEntry.create.mockRejectedValue(
      Object.assign(new Error('unique'), { code: 'P2002', meta: { target: ['phone'] } }),
    );
    prismaMock.waitlistEntry.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(ROW as never);
    const r = await joinWaitlist(prismaMock, INPUT, NOW);
    expect(r.already).toBe(true);
    expect(r.position).toBe(12);
  });
});

describe('waitlistCount', () => {
  it('counts the sellers on the list', async () => {
    prismaMock.waitlistEntry.count.mockResolvedValue(57);
    expect(await waitlistCount(prismaMock)).toBe(57);
  });
});

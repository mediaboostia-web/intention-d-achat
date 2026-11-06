import { prismaMock } from '@/test-utils/prisma-mock';
import { beforeEach, describe, expect, it, type Mock } from 'vitest';
import { joinWaitlist, listWaitlist, waitlistCount, waitlistCsv, waitlistStats } from './waitlist';

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

describe('listWaitlist', () => {
  it('ranks by arrival and shows the newest first, the number written out', async () => {
    prismaMock.waitlistEntry.findMany.mockResolvedValue([
      { ...ROW, id: 'w_1', createdAt: new Date('2026-11-06T08:00:00Z') },
      {
        ...ROW,
        id: 'w_2',
        firstName: 'Fatou',
        phone: null,
        email: 'fatou@test.local',
        source: null,
        createdAt: new Date('2026-11-06T09:00:00Z'),
      },
    ] as never);
    const rows = await listWaitlist(prismaMock);
    expect(prismaMock.waitlistEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }),
    );
    expect(rows.map((r) => [r.position, r.firstName])).toEqual([
      [2, 'Fatou'],
      [1, 'Awa'],
    ]);
    expect(rows[1]?.phone).toBe('+229 01 97 00 00 00');
    expect(rows[0]?.phone).toBeNull();
    expect(rows[0]?.createdAt).toBe('2026-11-06T09:00:00.000Z');
  });
});

describe('waitlistStats', () => {
  it('counts everyone, this week, and by source', async () => {
    prismaMock.waitlistEntry.count.mockResolvedValueOnce(30).mockResolvedValueOnce(8);
    (prismaMock.waitlistEntry.groupBy as unknown as Mock).mockResolvedValue([
      { source: 'tiktok-j01', _count: { _all: 20 } },
      { source: null, _count: { _all: 10 } },
    ] as never);
    const s = await waitlistStats(prismaMock, NOW);
    expect(s).toEqual({
      total: 30,
      thisWeek: 8,
      bySource: [
        { source: 'tiktok-j01', count: 20 },
        { source: null, count: 10 },
      ],
    });
    expect(prismaMock.waitlistEntry.count).toHaveBeenLastCalledWith({
      where: { createdAt: { gte: new Date('2026-10-30T10:00:00Z') } },
    });
  });
});

describe('waitlistCsv', () => {
  it('writes the columns Excel opens, the channels in words', () => {
    const csv = waitlistCsv([
      {
        id: 'w_1',
        position: 1,
        firstName: 'Awa',
        phone: '+229 01 97 00 00 00',
        email: null,
        channels: ['CHAINE_WHATSAPP', 'TIKTOK'],
        source: 'dm',
        createdAt: '2026-11-06T08:00:00.000Z',
      },
    ]);
    const [head, line] = csv.replace(/^\uFEFF/, '').split('\r\n');
    expect(head).toBe('Rang;Prénom;WhatsApp;E-mail;Où il vend;Source;Date');
    expect(line).toContain("1;Awa;'+229 01 97 00 00 00;;Chaîne WhatsApp, TikTok;dm;");
  });
});

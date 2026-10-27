import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect } from 'vitest';
import { encodeCursor } from '@/lib/server/notifications/cursor';
import {
  interestedNumbers,
  listCampaignResponses,
  parseResponseFilter,
} from './campaign-responses';

const at = (iso: string) => new Date(iso);
const answer = (id: string, over: object = {}) => ({
  id,
  respondentId: `r_${id}`,
  interested: true,
  notInterestedReason: null,
  buyerType: 'RESELLER',
  quantity: 12,
  option: 'Rouge',
  timing: 'ON_ARRIVAL',
  wantsDelivery: true,
  completedAt: at('2026-10-26T10:00:00Z'),
  zone: { name: 'Médina' },
  link: { label: 'Statut' },
  respondent: { firstName: 'Awa', phoneE164: '+221771234512', anonymizedAt: null },
  ...over,
});
const counted = { completedAt: { not: null }, locked: false, suspicious: false };

describe('parseResponseFilter', () => {
  it('reads oui by default, non, and refuses anything else', () => {
    expect(parseResponseFilter(null)).toBe('yes');
    expect(parseResponseFilter('oui')).toBe('yes');
    expect(parseResponseFilter('non')).toBe('no');
    expect(parseResponseFilter('peut-etre')).toBeNull();
  });
});

describe('listCampaignResponses', () => {
  it('lists the counted yes answers, newest first, with counts on the first page', async () => {
    prismaMock.response.findMany.mockResolvedValue([answer('a1')] as never);
    prismaMock.response.count.mockResolvedValueOnce(64).mockResolvedValueOnce(30);
    const page = await listCampaignResponses(prismaMock, 'org_1', 'c1', 'yes', null, {
      canSeeContacts: true,
      limit: 20,
    });
    expect(prismaMock.response.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { campaignId: 'c1', organizationId: 'org_1', ...counted, interested: true, AND: [] },
        orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
        take: 21,
      }),
    );
    expect(page.counts).toEqual({ yes: 64, no: 30 });
    expect(page.items[0]).toEqual({
      id: 'a1',
      respondentId: 'r_a1',
      firstName: 'Awa',
      phone: '+221 77 123 45 12',
      phoneE164: '+221771234512',
      interested: true,
      reason: null,
      buyerType: 'RESELLER',
      quantity: 12,
      option: 'Rouge',
      timing: 'ON_ARRIVAL',
      wantsDelivery: true,
      zoneName: 'Médina',
      sourceLabel: 'Statut',
      completedAt: '2026-10-26T10:00:00.000Z',
    });
  });

  it('masks the numbers without the contacts feature', async () => {
    prismaMock.response.findMany.mockResolvedValue([answer('a1')] as never);
    prismaMock.response.count.mockResolvedValue(1);
    const page = await listCampaignResponses(prismaMock, 'org_1', 'c1', 'yes', null, {
      canSeeContacts: false,
      limit: 20,
    });
    expect(page.items[0]).toMatchObject({ phone: '77 •• •• 12', phoneE164: null });
  });

  it('shows neither name nor number of an anonymized client', async () => {
    prismaMock.response.findMany.mockResolvedValue([
      answer('a1', {
        respondent: { firstName: null, phoneE164: null, anonymizedAt: at('2026-10-20T00:00:00Z') },
      }),
    ] as never);
    prismaMock.response.count.mockResolvedValue(1);
    const page = await listCampaignResponses(prismaMock, 'org_1', 'c1', 'yes', null, {
      canSeeContacts: true,
      limit: 20,
    });
    expect(page.items[0]).toMatchObject({ firstName: null, phone: null, phoneE164: null });
  });

  it('continues after the cursor without counting again', async () => {
    const cursor = { createdAt: at('2026-10-26T10:00:00Z'), id: 'a1' };
    prismaMock.response.findMany.mockResolvedValue([
      answer('a2', { interested: false, notInterestedReason: 'TOO_EXPENSIVE' }),
    ] as never);
    const page = await listCampaignResponses(prismaMock, 'org_1', 'c1', 'no', cursor, {
      canSeeContacts: true,
      limit: 1,
    });
    expect(prismaMock.response.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          interested: false,
          AND: [
            {
              OR: [
                { completedAt: { lt: cursor.createdAt } },
                { completedAt: cursor.createdAt, id: { lt: 'a1' } },
              ],
            },
          ],
        }),
      }),
    );
    expect(prismaMock.response.count).not.toHaveBeenCalled();
    expect(page).toMatchObject({ counts: null, nextCursor: null });
    expect(page.items[0]).toMatchObject({ interested: false, reason: 'TOO_EXPENSIVE' });
  });

  it('returns a cursor when more rows follow', async () => {
    prismaMock.response.findMany.mockResolvedValue([answer('a1'), answer('a2')] as never);
    prismaMock.response.count.mockResolvedValue(2);
    const page = await listCampaignResponses(prismaMock, 'org_1', 'c1', 'yes', null, {
      canSeeContacts: true,
      limit: 1,
    });
    expect(page.items).toHaveLength(1);
    expect(page.nextCursor).toBe(encodeCursor({ createdAt: at('2026-10-26T10:00:00Z'), id: 'a1' }));
  });
});

describe('interestedNumbers', () => {
  it('lists each interested number once, international format', async () => {
    prismaMock.response.findMany.mockResolvedValue([
      { respondent: { phoneE164: '+221771234512' } },
      { respondent: { phoneE164: '+221771234512' } },
      { respondent: { phoneE164: '+2250700000001' } },
    ] as never);
    await expect(interestedNumbers(prismaMock, 'org_1', 'c1')).resolves.toEqual([
      '+221 77 123 45 12',
      '+225 07 00 00 0001',
    ]);
    expect(prismaMock.response.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          campaignId: 'c1',
          organizationId: 'org_1',
          ...counted,
          interested: true,
          respondent: { anonymizedAt: null, phoneE164: { not: null } },
        },
        take: 5000,
      }),
    );
  });
});

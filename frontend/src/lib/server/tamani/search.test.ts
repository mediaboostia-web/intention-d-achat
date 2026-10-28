// searchShop (lot 7a): the top bar's search, in one shop only.
import { prismaMock } from '@/test-utils/prisma-mock';
import { beforeEach, describe, expect, it } from 'vitest';
import { searchShop } from './search';

const NOW = new Date('2026-10-28T12:00:00Z');
const args = (q: string, canSeeContacts = true) => ({
  organizationId: 'org_1',
  q,
  canSeeContacts,
  now: NOW,
});
const where = (mock: { mock: { calls: unknown[][] } }) =>
  (mock.mock.calls[0]![0] as { where: unknown; take: number }).where;
const take = (mock: { mock: { calls: unknown[][] } }) =>
  (mock.mock.calls[0]![0] as { where: unknown; take: number }).take;

beforeEach(() => {
  prismaMock.campaign.findMany.mockResolvedValue([]);
  prismaMock.product.findMany.mockResolvedValue([]);
  prismaMock.respondent.findMany.mockResolvedValue([]);
});

describe('searchShop', () => {
  it('looks in this shop only, five per group, ignoring case', async () => {
    await searchShop(prismaMock, args('riz'));
    expect(where(prismaMock.campaign.findMany)).toMatchObject({
      organizationId: 'org_1',
      title: { contains: 'riz', mode: 'insensitive' },
    });
    expect(take(prismaMock.campaign.findMany)).toBe(5);
    expect(where(prismaMock.product.findMany)).toMatchObject({
      organizationId: 'org_1',
      name: { contains: 'riz', mode: 'insensitive' },
    });
    expect(take(prismaMock.product.findMany)).toBe(5);
    const clients = where(prismaMock.respondent.findMany);
    expect(clients).toMatchObject({ organizationId: 'org_1', anonymizedAt: null });
    expect(JSON.stringify(clients)).toContain(
      '"firstName":{"contains":"riz","mode":"insensitive"}',
    );
    expect(take(prismaMock.respondent.findMany)).toBe(5);
  });

  it('never looks into the numbers without the contacts feature', async () => {
    await searchShop(prismaMock, args('77 12', false));
    expect(JSON.stringify(where(prismaMock.respondent.findMany))).not.toContain('phoneE164');
  });

  it('finds a client by the digits of the number on a plan with contacts', async () => {
    await searchShop(prismaMock, args('77 1', true));
    expect(JSON.stringify(where(prismaMock.respondent.findMany))).toContain(
      '"phoneE164":{"contains":"771"}',
    );
  });

  it('sends the effective status and the first photo; the number stays home on Free', async () => {
    prismaMock.campaign.findMany.mockResolvedValue([
      {
        id: 'c1',
        title: 'Riz parfumé',
        status: 'ACTIVE',
        endsAt: new Date('2026-10-01T00:00:00Z'),
        product: { photos: ['https://res.cloudinary.com/x/image/upload/a.jpg'] },
      },
    ] as never);
    prismaMock.product.findMany.mockResolvedValue([
      { id: 'p1', name: 'Riz 25 kg', archivedAt: null, photos: [] },
    ] as never);
    prismaMock.respondent.findMany.mockResolvedValue([
      { id: 'r1', firstName: 'Awa', phoneE164: '+221771234567' },
    ] as never);
    const free = await searchShop(prismaMock, args('ri', false));
    expect(free.campaigns).toEqual([
      {
        id: 'c1',
        title: 'Riz parfumé',
        status: 'CLOSED',
        photo: 'https://res.cloudinary.com/x/image/upload/a.jpg',
      },
    ]);
    expect(free.products).toEqual([{ id: 'p1', name: 'Riz 25 kg', archived: false, photo: null }]);
    expect(free.clients).toEqual([{ id: 'r1', firstName: 'Awa', phone: null }]);
    const pro = await searchShop(prismaMock, args('ri', true));
    expect(pro.clients[0]!.phone).toMatch(/77/);
  });
});

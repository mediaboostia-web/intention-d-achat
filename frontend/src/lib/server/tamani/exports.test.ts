import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect } from 'vitest';
import { NO_CLIENT_FILTERS } from '@/lib/tamani/client-filters';
import { DEFAULT_EXPORT, type ExportQuery } from '@/lib/tamani/export-view';
import { exportFile, exportNumbers, previewExport } from './exports';
import { maskPhone } from './phone';

const NOW = new Date('2026-10-28T12:00:00Z');
const counted = { completedAt: { not: null }, locked: false, suspicious: false };
const answer = (id: string, over: object = {}) => ({
  id,
  respondentId: `r_${id}`,
  interested: true,
  notInterestedReason: null,
  buyerType: 'RESELLER',
  quantity: 12,
  option: null,
  timing: 'THIS_WEEK',
  wantsDelivery: true,
  deliveryPlace: null,
  completedAt: new Date('2026-10-26T10:00:00Z'),
  zone: { name: 'Médina' },
  link: null,
  respondent: { firstName: 'Awa', phoneE164: '+221771234512', anonymizedAt: null },
  campaign: { product: { name: 'Riz' } },
  ...over,
});
const responses = (
  over: Partial<Extract<ExportQuery, { what: 'responses' }>> = {},
): ExportQuery => ({
  ...(DEFAULT_EXPORT as Extract<ExportQuery, { what: 'responses' }>),
  ...over,
});
const whereOf = () => prismaMock.response.findMany.mock.calls[0]?.[0]?.where;

describe('the answers to export', () => {
  it('put every filter in the where', async () => {
    prismaMock.response.findMany.mockResolvedValue([]);
    prismaMock.response.count.mockResolvedValue(0);
    await previewExport(
      prismaMock,
      'org_1',
      responses({
        answer: 'no',
        campaignId: 'c1',
        period: '2026-10',
        zone: 'OTHER',
        timing: 'THIS_WEEK',
        buyerType: 'RESELLER',
        country: 'BJ',
      }),
      { canSeeContacts: true, now: NOW },
    );
    const where = {
      organizationId: 'org_1',
      ...counted,
      interested: false,
      campaignId: 'c1',
      completedAt: {
        not: null,
        gte: new Date('2026-10-01T00:00:00Z'),
        lt: new Date('2026-11-01T00:00:00Z'),
      },
      zoneId: null,
      deliveryPlace: { not: null },
      timing: 'THIS_WEEK',
      buyerType: 'RESELLER',
      respondent: { phoneE164: { startsWith: '+229' } },
    };
    expect(whereOf()).toEqual(where);
    expect(prismaMock.response.count).toHaveBeenCalledWith({ where });
  });

  it('keep yes and no for « toutes », and a zone by its id', async () => {
    prismaMock.response.findMany.mockResolvedValue([]);
    prismaMock.response.count.mockResolvedValue(0);
    await previewExport(prismaMock, 'org_1', responses({ answer: 'all', zone: 'z1' }), {
      canSeeContacts: true,
      now: NOW,
    });
    expect(whereOf()).toEqual({ organizationId: 'org_1', ...counted, zoneId: 'z1' });
  });
});

describe('previewExport', () => {
  it('previewExport masks numbers without respondentContacts', async () => {
    prismaMock.response.findMany.mockResolvedValue([answer('a1')] as never);
    prismaMock.response.count.mockResolvedValue(142);
    const preview = await previewExport(prismaMock, 'org_1', DEFAULT_EXPORT, {
      canSeeContacts: false,
      now: NOW,
    });
    expect(preview.total).toBe(142);
    expect(preview.headers.slice(0, 4)).toEqual(['Date', 'Produit', 'Prénom', 'Numéro WhatsApp']);
    expect(preview.rows[0]?.slice(0, 5)).toEqual([
      '26/10/2026 10:00',
      'Riz',
      'Awa',
      maskPhone('+221771234512'),
      'Sénégal',
    ]);
    expect(JSON.stringify(preview)).not.toContain('123 45');
    expect(prismaMock.response.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, orderBy: [{ completedAt: 'desc' }, { id: 'desc' }] }),
    );
  });

  it('shows one row per client with the zone they named most', async () => {
    prismaMock.respondent.findMany.mockResolvedValue([
      {
        id: 'r1',
        firstName: 'Kofi',
        phoneE164: '+2290197123456',
        responses: [
          {
            interested: true,
            buyerType: 'CONSUMER',
            completedAt: new Date('2026-10-20T08:00:00Z'),
            zone: { name: 'Cadjehoun' },
            campaign: { product: { name: 'Marmite' } },
          },
          {
            interested: false,
            buyerType: 'RESELLER',
            completedAt: new Date('2026-10-10T08:00:00Z'),
            zone: { name: 'Akpakpa' },
            campaign: { product: { name: 'Riz' } },
          },
          {
            interested: true,
            buyerType: 'RESELLER',
            completedAt: new Date('2026-10-01T08:00:00Z'),
            zone: { name: 'Akpakpa' },
            campaign: { product: { name: 'Riz' } },
          },
        ],
      },
    ] as never);
    prismaMock.respondent.count.mockResolvedValue(1);
    const preview = await previewExport(
      prismaMock,
      'org_1',
      { what: 'clients', filters: { ...NO_CLIENT_FILTERS, answer: 'yes' } },
      { canSeeContacts: true, now: NOW },
    );
    expect(preview.headers[4]).toBe('Quartier le plus fréquent');
    expect(preview.rows[0]).toEqual([
      'Kofi',
      '+229 01 97 12 34 56',
      'Bénin',
      'Usager',
      'Akpakpa',
      '3',
      '2',
      '20/10/2026 08:00',
      'Marmite',
    ]);
    const where = prismaMock.respondent.findMany.mock.calls[0]?.[0]?.where;
    expect(where).toMatchObject({ organizationId: 'org_1', anonymizedAt: null });
    expect(where?.AND).toContainEqual({ responses: { some: { ...counted, interested: true } } });
  });
});

describe('exportFile', () => {
  it('exportFile neutralises formulas in the place column', async () => {
    prismaMock.response.findMany.mockResolvedValue([
      answer('a1', { zone: null, deliveryPlace: '=cmd|calc' }),
    ] as never);
    prismaMock.campaign.findFirst.mockResolvedValue({ title: 'Riz parfumé' } as never);
    const file = await exportFile(prismaMock, 'org_1', responses({ campaignId: 'c1' }), NOW);
    expect(file.csv).toContain(";Livraison;;'=cmd|calc;");
    expect(file.csv).toContain("'+221 77 123 45 12");
    expect(file.filename).toBe('tamani-interesses-riz-parfume-2026-10-28.csv');
    expect(prismaMock.campaign.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'c1', organizationId: 'org_1' } }),
    );
    expect(prismaMock.response.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20000 }),
    );
  });

  it('names the file after what it holds', async () => {
    prismaMock.response.findMany.mockResolvedValue([]);
    prismaMock.respondent.findMany.mockResolvedValue([]);
    const names = await Promise.all([
      exportFile(prismaMock, 'org_1', responses({ answer: 'no' }), NOW),
      exportFile(prismaMock, 'org_1', responses({ answer: 'all' }), NOW),
      exportFile(prismaMock, 'org_1', { what: 'clients', filters: NO_CLIENT_FILTERS }, NOW),
    ]);
    expect(names.map((n) => n.filename)).toEqual([
      'tamani-pas-interesses-2026-10-28.csv',
      'tamani-reponses-2026-10-28.csv',
      'tamani-clients-2026-10-28.csv',
    ]);
  });
});

describe('exportNumbers', () => {
  it('gives each number once, from the filtered answers', async () => {
    prismaMock.response.findMany.mockResolvedValue([
      { respondent: { phoneE164: '+221771234512' } },
      { respondent: { phoneE164: '+221771234512' } },
      { respondent: { phoneE164: '+2290197123456' } },
    ] as never);
    const numbers = await exportNumbers(prismaMock, 'org_1', responses({ country: 'SN' }), NOW);
    expect(numbers).toEqual(['+221 77 123 45 12', '+229 01 97 12 34 56']);
    const call = prismaMock.response.findMany.mock.calls[0]?.[0];
    expect(call).toMatchObject({ take: 5000, distinct: ['respondentId'] });
    expect(call?.where).toMatchObject({
      organizationId: 'org_1',
      interested: true,
      respondent: { phoneE164: { startsWith: '+221' } },
      AND: [{ respondent: { anonymizedAt: null, phoneE164: { not: null } } }],
    });
  });

  it('gives the clients numbers', async () => {
    prismaMock.respondent.findMany.mockResolvedValue([{ phoneE164: '+2290197123456' }] as never);
    const numbers = await exportNumbers(
      prismaMock,
      'org_1',
      { what: 'clients', filters: NO_CLIENT_FILTERS },
      NOW,
    );
    expect(numbers).toEqual(['+229 01 97 12 34 56']);
    expect(prismaMock.respondent.findMany.mock.calls[0]?.[0]).toMatchObject({ take: 5000 });
  });
});

// A campaign as the popup routes load it (link → campaign → product, shop),
// and an in-memory Response / Respondent table wired onto prismaMock, so
// upsertResponse's lookups, merges and unique keys run for real.
import { prismaMock } from './prisma-mock';

export const NOW = new Date('2026-10-25T10:00:00Z');
const DAY = 24 * 3600 * 1000;
export const DEVICE_A = '0b8a5f8e-3c2d-4e1f-9a0b-1c2d3e4f5a6b';
export const DEVICE_B = '7b0c6f1e-2a3b-4c5d-8e9f-0a1b2c3d4e5f';

export function publicLink(
  over: { campaign?: object; product?: object; org?: object } = {},
): Record<string, unknown> {
  const organization = {
    id: 'org_1',
    slug: 'diallo-import',
    name: 'Diallo Import',
    whatsappPhone: '+221770000099',
    country: 'SN',
    logoUrl: null,
    subscription: null,
    ...over.org,
  };
  const product = {
    id: 'prod_1',
    organizationId: 'org_1',
    name: 'Marmites inox 5 L',
    unitLabel: 'pièce',
    unitPrice: 7500,
    wholesalePrice: 6000,
    wholesaleMinQty: 12,
    costPrice: 4100,
    photos: [],
    optionLabel: 'Couleur',
    options: ['Rouge', 'Noir'],
    archivedAt: null,
    ...over.product,
  };
  const campaign = {
    id: 'camp_1',
    organizationId: 'org_1',
    productId: 'prod_1',
    title: 'Marmites inox 5 L',
    availability: 'INCOMING',
    availableAt: new Date(NOW.getTime() + 10 * DAY),
    endsAt: null,
    deliveryEnabled: true,
    showLiveCounter: true,
    status: 'ACTIVE',
    product,
    organization,
    ...over.campaign,
  };
  return { id: 'link_1', campaignId: 'camp_1', code: 'Ab3dE7x', campaign };
}

export interface FakeResponse {
  id: string;
  campaignId: string;
  organizationId: string;
  linkId: string | null;
  respondentId: string | null;
  deviceId: string;
  interested: boolean | null;
  notInterestedReason: string | null;
  buyerType: string | null;
  quantity: number | null;
  option: string | null;
  timing: string | null;
  wantsDelivery: boolean | null;
  zoneId: string | null;
  completedAt: Date | null;
  locked: boolean;
  suspicious: boolean;
}

export interface FakeRespondent {
  id: string;
  organizationId: string;
  phoneE164: string;
  firstName: string | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
}

const BLANK = {
  linkId: null,
  respondentId: null,
  interested: null,
  notInterestedReason: null,
  buyerType: null,
  quantity: null,
  option: null,
  timing: null,
  wantsDelivery: null,
  zoneId: null,
  completedAt: null,
  locked: false,
  suspicious: false,
};

/** Wires prismaMock to in-memory tables; returns them for assertions. */
export function fakePublicDb(link: Record<string, unknown> = publicLink()) {
  const responses: FakeResponse[] = [];
  const respondents: FakeRespondent[] = [];
  let seq = 0;
  const m = prismaMock as never as Record<
    string,
    Record<string, { mockImplementation: (f: unknown) => void }>
  >;

  prismaMock.campaignLink.findUnique.mockImplementation((async ({
    where,
  }: {
    where: { code: string };
  }) => (where.code === link.code ? link : null)) as never);
  prismaMock.deliveryZone.findFirst.mockImplementation((async ({
    where,
  }: {
    where: { id: string; organizationId: string };
  }) =>
    where.id === 'zone_1' && where.organizationId === 'org_1' ? { id: 'zone_1' } : null) as never);
  prismaMock.subscription.findUnique.mockResolvedValue(null);

  m.response!.findUnique!.mockImplementation(
    async ({ where }: { where: Record<string, Record<string, string>> }) => {
      if (where.campaignId_deviceId) {
        const k = where.campaignId_deviceId;
        return (
          responses.find((r) => r.campaignId === k.campaignId && r.deviceId === k.deviceId) ?? null
        );
      }
      const k = where.campaignId_respondentId!;
      return (
        responses.find((r) => r.campaignId === k.campaignId && r.respondentId === k.respondentId) ??
        null
      );
    },
  );
  m.response!.findFirst!.mockImplementation(
    async ({ where }: { where: { id: string; campaignId: string } }) =>
      responses.find((r) => r.id === where.id && r.campaignId === where.campaignId) ?? null,
  );
  m.response!.create!.mockImplementation(async ({ data }: { data: Partial<FakeResponse> }) => {
    const row = { ...BLANK, ...data, id: `resp_${++seq}` } as FakeResponse;
    responses.push(row);
    return { ...row };
  });
  m.response!.update!.mockImplementation(
    async ({ where, data }: { where: { id: string }; data: Partial<FakeResponse> }) => {
      const row = responses.find((r) => r.id === where.id);
      if (!row) throw new Error(`no response ${where.id}`);
      Object.assign(row, data);
      return { ...row };
    },
  );
  m.response!.delete!.mockImplementation(async ({ where }: { where: { id: string } }) => {
    const i = responses.findIndex((r) => r.id === where.id);
    return responses.splice(i, 1)[0];
  });
  m.response!.count!.mockImplementation(
    async ({ where }: { where: { campaignId?: string; interested?: boolean } }) =>
      where.interested
        ? responses.filter(
            (r) =>
              r.campaignId === where.campaignId && r.interested && r.completedAt && !r.suspicious,
          ).length
        : 0,
  );
  m.respondent!.upsert!.mockImplementation(
    async ({
      where,
      create,
      update,
    }: {
      where: { organizationId_phoneE164: { organizationId: string; phoneE164: string } };
      create: Omit<FakeRespondent, 'id'>;
      update: Partial<FakeRespondent>;
    }) => {
      const k = where.organizationId_phoneE164;
      const found = respondents.find(
        (r) => r.organizationId === k.organizationId && r.phoneE164 === k.phoneE164,
      );
      if (found) return Object.assign(found, update);
      const row = { ...create, id: `rsp_${++seq}` };
      respondents.push(row);
      return row;
    },
  );
  return { responses, respondents };
}

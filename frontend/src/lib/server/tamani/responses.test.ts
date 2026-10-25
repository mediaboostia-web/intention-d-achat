import { prismaMock } from '@/test-utils/prisma-mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEVICE_A, DEVICE_B, NOW, fakePublicDb, publicLink } from '@/test-utils/public-fixtures';
import { signResponseToken, verifyResponseToken } from './response-token';

const limits = vi.hoisted(() => ({ recordDeviceNumber: vi.fn(async () => 1) }));
vi.mock('./public-limits', () => limits);
const quota = vi.hoisted(() => ({ shouldLockNewCompletion: vi.fn(async () => false) }));
vi.mock('./quota', () => quota);

const { upsertResponse, ResponseWriteError } = await import('./responses');

const base = { code: 'Ab3dE7x', deviceId: DEVICE_A, token: null };
const yes = {
  interested: true,
  buyerType: 'CONSUMER',
  quantity: 3,
  timing: 'ON_ARRIVAL',
  wantsDelivery: false,
} as const;
const contact = { firstName: 'Awa', phone: '77 123 45 67' };

async function failure(p: Promise<unknown>) {
  const err = await p.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(ResponseWriteError);
  const { code, status } = err as InstanceType<typeof ResponseWriteError>;
  return { code, status };
}

beforeEach(() => {
  limits.recordDeviceNumber.mockResolvedValue(1);
  quota.shouldLockNewCompletion.mockResolvedValue(false);
});

describe('upsertResponse', () => {
  it('creates the response on the first step with the link and the device', async () => {
    const { responses } = fakePublicDb();
    const result = await upsertResponse(prismaMock, { ...base, interested: true }, NOW);
    expect(prismaMock.response.create).toHaveBeenCalledWith({
      data: {
        campaignId: 'camp_1',
        organizationId: 'org_1',
        linkId: 'link_1',
        deviceId: DEVICE_A,
        interested: true,
        notInterestedReason: null,
      },
    });
    expect(result).toMatchObject({ completed: false, firstCompletion: false, respondent: null });
    expect(result.responseId).toBe(responses[0]!.id);
    expect(await verifyResponseToken(result.token)).toEqual({
      responseId: responses[0]!.id,
      deviceId: DEVICE_A,
    });
  });

  it('upsertResponse merges a second device into the existing respondent response', async () => {
    const { responses } = fakePublicDb();
    const first = await upsertResponse(prismaMock, { ...base, ...yes, ...contact }, NOW);
    const ra = first.responseId;

    await upsertResponse(prismaMock, { ...base, deviceId: DEVICE_B, ...yes, quantity: 5 }, NOW);
    expect(responses).toHaveLength(2);
    const second = await upsertResponse(
      prismaMock,
      { ...base, deviceId: DEVICE_B, ...contact, phone: '+221771234567' },
      NOW,
    );

    expect(responses).toHaveLength(1);
    expect(second.responseId).toBe(ra);
    expect(responses[0]).toMatchObject({ id: ra, deviceId: DEVICE_A, quantity: 5 });
    expect(second.firstCompletion).toBe(false);
    expect(await verifyResponseToken(second.token)).toEqual({ responseId: ra, deviceId: DEVICE_B });

    const edit = await upsertResponse(
      prismaMock,
      { ...base, deviceId: DEVICE_B, token: second.token, quantity: 6 },
      NOW,
    );
    expect(edit.responseId).toBe(ra);
    expect(responses[0]!.quantity).toBe(6);
  });

  it('creates the Respondent at completion and updates lastSeenAt', async () => {
    const { respondents } = fakePublicDb();
    const result = await upsertResponse(prismaMock, { ...base, ...yes, ...contact }, NOW);
    expect(prismaMock.respondent.upsert).toHaveBeenCalledWith({
      where: { organizationId_phoneE164: { organizationId: 'org_1', phoneE164: '+221771234567' } },
      create: {
        organizationId: 'org_1',
        phoneE164: '+221771234567',
        firstName: 'Awa',
        firstSeenAt: NOW,
        lastSeenAt: NOW,
      },
      update: { firstName: 'Awa', lastSeenAt: NOW },
    });
    expect(respondents).toHaveLength(1);
    expect(result).toMatchObject({
      completed: true,
      firstCompletion: true,
      respondent: { firstName: 'Awa', phoneE164: '+221771234567', phoneMasked: '77 •• •• 67' },
      interestedCount: 1,
    });
  });

  it('locks completion when monthly quota reached', async () => {
    const { responses } = fakePublicDb();
    quota.shouldLockNewCompletion.mockResolvedValue(true);
    const result = await upsertResponse(prismaMock, { ...base, ...yes, ...contact }, NOW);
    expect(result.completed).toBe(true);
    expect(responses[0]).toMatchObject({ locked: true, completedAt: NOW });
  });

  it('a completed response needs its token to change', async () => {
    fakePublicDb();
    await upsertResponse(prismaMock, { ...base, ...yes, ...contact }, NOW);
    expect(await failure(upsertResponse(prismaMock, { ...base, quantity: 2 }, NOW))).toEqual({
      code: 'INVALID_RESPONSE_TOKEN',
      status: 401,
    });
    const foreign = await signResponseToken({ responseId: 'resp_1', deviceId: DEVICE_B });
    expect(
      await failure(upsertResponse(prismaMock, { ...base, token: foreign, quantity: 2 }, NOW)),
    ).toEqual({ code: 'INVALID_RESPONSE_TOKEN', status: 401 });
    expect(
      await failure(upsertResponse(prismaMock, { ...base, token: 'abc', quantity: 2 }, NOW)),
    ).toEqual({ code: 'INVALID_RESPONSE_TOKEN', status: 401 });
  });

  it('marks the response suspicious from the third number on one device', async () => {
    const { responses } = fakePublicDb();
    limits.recordDeviceNumber.mockResolvedValue(2);
    const first = await upsertResponse(prismaMock, { ...base, ...yes, ...contact }, NOW);
    expect(responses[0]!.suspicious).toBe(false);
    limits.recordDeviceNumber.mockResolvedValue(3);
    await upsertResponse(
      prismaMock,
      { ...base, token: first.token, ...contact, phone: '77 123 45 68' },
      NOW,
    );
    expect(responses[0]!.suspicious).toBe(true);
    expect(limits.recordDeviceNumber).toHaveBeenLastCalledWith('camp_1', DEVICE_A, '+221771234568');
  });

  it('a "no" clears the yes-only answers', async () => {
    const { responses } = fakePublicDb();
    await upsertResponse(
      prismaMock,
      { ...base, ...yes, option: 'Rouge', wantsDelivery: true, zoneId: 'zone_1' },
      NOW,
    );
    await upsertResponse(
      prismaMock,
      { ...base, interested: false, notInterestedReason: 'TOO_EXPENSIVE' },
      NOW,
    );
    expect(responses[0]).toMatchObject({
      interested: false,
      notInterestedReason: 'TOO_EXPENSIVE',
      buyerType: null,
      quantity: null,
      option: null,
      timing: null,
      wantsDelivery: null,
      zoneId: null,
    });
  });

  it('refuses an option, timing or zone the campaign does not offer', async () => {
    fakePublicDb();
    const invalid = { code: 'VALIDATION_FAILED', status: 400 };
    const attempt = (fields: object) =>
      failure(upsertResponse(prismaMock, { ...base, ...fields }, NOW));
    expect(await attempt({ option: 'Violet' })).toEqual(invalid);
    expect(await attempt({ timing: 'THIS_WEEK' })).toEqual(invalid);
    expect(await attempt({ zoneId: 'zone_other' })).toEqual(invalid);
    fakePublicDb(publicLink({ campaign: { availability: 'IN_STOCK', deliveryEnabled: false } }));
    expect(await attempt({ timing: 'ON_ARRIVAL' })).toEqual(invalid);
    expect(await attempt({ zoneId: 'zone_1' })).toEqual(invalid);
    expect(prismaMock.response.create).not.toHaveBeenCalled();
  });

  it('refuses to complete an unfinished yes', async () => {
    fakePublicDb();
    const noQuantity = {
      interested: true,
      buyerType: 'CONSUMER',
      timing: 'ON_ARRIVAL',
      wantsDelivery: false,
    } as const;
    expect(
      await failure(upsertResponse(prismaMock, { ...base, ...noQuantity, ...contact }, NOW)),
    ).toEqual({ code: 'VALIDATION_FAILED', status: 400 });
    expect(prismaMock.respondent.upsert).not.toHaveBeenCalled();
  });

  it('completes a "no" with only the contact', async () => {
    fakePublicDb();
    const result = await upsertResponse(
      prismaMock,
      { ...base, interested: false, ...contact },
      NOW,
    );
    expect(result).toMatchObject({ completed: true, firstCompletion: true });
  });

  it('refuses a number that is not a valid one', async () => {
    fakePublicDb();
    expect(
      await failure(
        upsertResponse(prismaMock, { ...base, ...yes, ...contact, phone: '12 34' }, NOW),
      ),
    ).toEqual({ code: 'INVALID_PHONE', status: 422 });
    expect(prismaMock.response.create).not.toHaveBeenCalled();
  });

  it('rejects writes when campaign effective status is CLOSED', async () => {
    fakePublicDb(publicLink({ campaign: { endsAt: new Date(NOW.getTime() - 1000) } }));
    const closed = { code: 'CAMPAIGN_CLOSED', status: 409 };
    expect(await failure(upsertResponse(prismaMock, { ...base, interested: true }, NOW))).toEqual(
      closed,
    );
    fakePublicDb(publicLink({ product: { archivedAt: NOW } }));
    expect(await failure(upsertResponse(prismaMock, { ...base, interested: true }, NOW))).toEqual(
      closed,
    );
    expect(prismaMock.response.create).not.toHaveBeenCalled();
    expect(prismaMock.response.update).not.toHaveBeenCalled();
  });
});

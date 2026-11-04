import { prismaMock } from '@/test-utils/prisma-mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/server/auth', () => ({ hashPassword: vi.fn(async () => 'bcrypt-hash') }));

import { hashPassword } from '@/lib/server/auth';
import { parseUserQuery, usersHref } from '@/lib/tamani/admin-users';
import {
  TEMPORARY_ALPHABET,
  createUserByAdmin,
  getAdminUser,
  listAdminUsers,
  temporaryPassword,
} from './users';

const NOW = new Date('2026-11-04T10:00:00Z');

describe('temporaryPassword', () => {
  it('is 12 characters a person can read aloud: no 0/O, 1/l/I', () => {
    const p = temporaryPassword();
    expect(p).toHaveLength(12);
    expect([...p].every((c) => TEMPORARY_ALPHABET.includes(c))).toBe(true);
    expect(TEMPORARY_ALPHABET).not.toMatch(/[0O1lIo]/);
  });

  it('draws each character with the given source of randomness', () => {
    expect(temporaryPassword(4, () => 0)).toBe(TEMPORARY_ALPHABET[0]!.repeat(4));
  });
});

describe('createUserByAdmin', () => {
  beforeEach(() => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 'u_1',
      email: 'awa@test.local',
      name: 'Awa',
      role: 'USER',
      status: 'ACTIVE',
    } as never);
  });

  it('creates a verified account with a hashed temporary password, shown once', async () => {
    const created = await createUserByAdmin(
      prismaMock,
      { email: 'awa@test.local', name: 'Awa' },
      NOW,
    );
    expect(created?.temporaryPassword).toHaveLength(12);
    expect(hashPassword).toHaveBeenCalledWith(created?.temporaryPassword);
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        email: 'awa@test.local',
        name: 'Awa',
        passwordHash: 'bcrypt-hash',
        emailVerifiedAt: NOW,
      },
      select: { id: true, email: true, name: true, role: true, status: true },
    });
  });

  it('answers null when the e-mail is taken, and creates nothing', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u_0' } as never);
    expect(
      await createUserByAdmin(prismaMock, { email: 'awa@test.local', name: 'Awa' }, NOW),
    ).toBeNull();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('answers null when another request took the e-mail meanwhile', async () => {
    prismaMock.user.create.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));
    expect(
      await createUserByAdmin(prismaMock, { email: 'awa@test.local', name: 'Awa' }, NOW),
    ).toBeNull();
  });
});

const userRow = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  email: `${id}@test.local`,
  name: null,
  role: 'USER',
  status: 'ACTIVE',
  emailVerifiedAt: NOW,
  createdAt: NOW,
  memberships: [
    {
      organization: {
        id: `org_${id}`,
        name: `Boutique ${id}`,
        subscription: { plan: 'WEEK', currentPeriodEnd: new Date('2026-11-10'), graceUntil: null },
      },
    },
  ],
  ...over,
});

describe('listAdminUsers', () => {
  it('searches e-mail and name, newest first, 50 a page', async () => {
    prismaMock.user.count.mockResolvedValue(51);
    prismaMock.user.findMany.mockResolvedValue([userRow('a')] as never);
    const list = await listAdminUsers(prismaMock, { q: 'awa', page: 2 }, NOW);
    const args = prismaMock.user.findMany.mock.calls[0]![0]!;
    expect(args.where).toEqual({
      OR: [
        { email: { contains: 'awa', mode: 'insensitive' } },
        { name: { contains: 'awa', mode: 'insensitive' } },
      ],
    });
    expect(args).toMatchObject({ skip: 50, take: 50 });
    expect(list).toMatchObject({ total: 51, page: 2, pages: 2 });
    expect(list.items[0]).toEqual({
      id: 'a',
      email: 'a@test.local',
      name: null,
      role: 'USER',
      status: 'ACTIVE',
      verified: true,
      createdAt: NOW.toISOString(),
      shop: { id: 'org_a', name: 'Boutique a', plan: 'WEEK' },
    });
  });

  it('shows an account without a shop', async () => {
    prismaMock.user.count.mockResolvedValue(1);
    prismaMock.user.findMany.mockResolvedValue([
      userRow('b', { memberships: [], emailVerifiedAt: null }),
    ] as never);
    const list = await listAdminUsers(prismaMock, { q: '', page: 1 }, NOW);
    expect(list.items[0]).toMatchObject({ verified: false, shop: null });
  });
});

describe('getAdminUser', () => {
  it('answers null for an unknown account', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    expect(await getAdminUser(prismaMock, 'nope', NOW)).toBeNull();
  });
});

describe('the users list address', () => {
  it('reads and writes the search and the page', () => {
    expect(parseUserQuery({ q: ' awa ', page: '3' })).toEqual({ q: 'awa', page: 3 });
    expect(parseUserQuery({ page: 'x' })).toEqual({ q: '', page: 1 });
    expect(usersHref({ q: 'awa', page: 2 })).toBe('/support-admin/utilisateurs?q=awa&page=2');
  });
});

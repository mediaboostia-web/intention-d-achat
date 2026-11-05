import { prismaMock } from '@/test-utils/prisma-mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/server/auth', () => ({ hashPassword: vi.fn(async () => 'bcrypt-hash') }));

import { addAdmin, changeAdminRole, listAdmins } from './admins';

const NOW = new Date('2026-11-05T10:00:00Z');
const CREATED = new Date('2026-10-01T08:00:00Z');

const user = (over: Record<string, unknown> = {}) => ({
  id: 'u_1',
  email: 'awa@test.local',
  name: 'Awa',
  role: 'USER',
  status: 'ACTIVE',
  createdAt: CREATED,
  ...over,
});

describe('listAdmins', () => {
  it('lists the admins, super-admins first, with role and creation date', async () => {
    prismaMock.user.findMany.mockResolvedValue([
      user({ id: 'a_1', email: 'admin@test.local', role: 'ADMIN' }),
      user({ id: 's_1', email: 'super@test.local', role: 'SUPERADMIN' }),
    ] as never);
    const admins = await listAdmins(prismaMock);
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { role: { in: ['ADMIN', 'SUPERADMIN'] } } }),
    );
    expect(admins.map((a) => a.id)).toEqual(['s_1', 'a_1']);
    expect(admins[0]).toEqual({
      id: 's_1',
      email: 'super@test.local',
      name: 'Awa',
      role: 'SUPERADMIN',
      createdAt: CREATED.toISOString(),
    });
  });
});

describe('addAdmin', () => {
  beforeEach(() => {
    prismaMock.user.update.mockImplementation((async (args: { data: { role: string } }) =>
      user({ role: args.data.role })) as never);
  });

  it('promotes an existing account, with no password', async () => {
    prismaMock.user.findUnique.mockResolvedValue(user() as never);
    const r = await addAdmin(prismaMock, { email: 'awa@test.local', role: 'ADMIN' }, NOW);
    expect(r.kind).toBe('PROMOTED');
    expect(r).not.toHaveProperty('temporaryPassword');
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'u_1' }, data: { role: 'ADMIN' } }),
    );
  });

  it('opens a verified account with a 12-character temporary password for an unknown e-mail', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue(user({ email: 'new@test.local' }) as never);
    const r = await addAdmin(
      prismaMock,
      { email: 'new@test.local', name: 'Fatou', role: 'SUPERADMIN' },
      NOW,
    );
    expect(r.kind).toBe('CREATED');
    expect(r.kind === 'CREATED' && r.temporaryPassword).toHaveLength(12);
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'new@test.local',
          name: 'Fatou',
          emailVerifiedAt: NOW,
        }),
      }),
    );
    expect(r.user.role).toBe('SUPERADMIN');
  });

  it('names a new account after its e-mail when no name is given', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue(user({ email: 'fatou.diop@test.local' }) as never);
    await addAdmin(prismaMock, { email: 'fatou.diop@test.local', role: 'ADMIN' }, NOW);
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: 'fatou.diop' }) }),
    );
  });

  it('leaves an admin as is', async () => {
    prismaMock.user.findUnique.mockResolvedValue(user({ role: 'SUPERADMIN' }) as never);
    const r = await addAdmin(prismaMock, { email: 'awa@test.local', role: 'ADMIN' }, NOW);
    expect(r.kind).toBe('ALREADY_ADMIN');
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
});

describe('changeAdminRole', () => {
  beforeEach(() => {
    prismaMock.user.update.mockImplementation((async (args: { data: { role: string } }) =>
      user({ id: 'a_2', role: args.data.role })) as never);
  });

  it('refuses to change its own role', async () => {
    const r = await changeAdminRole(prismaMock, 's_1', 's_1', 'ADMIN');
    expect(r).toEqual({ kind: 'SELF' });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('answers NOT_FOUND for an unknown account', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    expect(await changeAdminRole(prismaMock, 's_1', 'nobody', 'ADMIN')).toEqual({
      kind: 'NOT_FOUND',
    });
  });

  it('removes an admin: the account becomes a normal one', async () => {
    prismaMock.user.findUnique.mockResolvedValue(user({ id: 'a_2', role: 'ADMIN' }) as never);
    const r = await changeAdminRole(prismaMock, 's_1', 'a_2', 'USER');
    expect(r).toMatchObject({ kind: 'OK', from: 'ADMIN', to: 'USER' });
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'a_2' }, data: { role: 'USER' } }),
    );
  });

  it('never demotes the last super-admin, counting under a lock in the transaction', async () => {
    prismaMock.user.findUnique.mockResolvedValue(user({ id: 's_2', role: 'SUPERADMIN' }) as never);
    prismaMock.$queryRaw.mockResolvedValue([{ id: 's_2' }] as never);
    const r = await changeAdminRole(prismaMock, 's_1', 's_2', 'ADMIN');
    expect(r).toEqual({ kind: 'LAST_SUPERADMIN' });
    const sql = (prismaMock.$queryRaw.mock.calls[0]?.[0] as unknown as string[]).join('?');
    expect(sql).toContain('FOR UPDATE');
    expect(sql).toContain('SUPERADMIN');
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('demotes a super-admin while another one stays', async () => {
    prismaMock.user.findUnique.mockResolvedValue(user({ id: 's_2', role: 'SUPERADMIN' }) as never);
    prismaMock.$queryRaw.mockResolvedValue([{ id: 's_1' }, { id: 's_2' }] as never);
    const r = await changeAdminRole(prismaMock, 's_1', 's_2', 'ADMIN');
    expect(r).toMatchObject({ kind: 'OK', from: 'SUPERADMIN', to: 'ADMIN' });
  });
});

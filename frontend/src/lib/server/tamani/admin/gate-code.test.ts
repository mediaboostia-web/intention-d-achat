import { beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';
import {
  ADMIN_CODE_MAX_SENDS,
  ADMIN_CODE_MAX_TRIES,
  ADMIN_CODE_TTL_MS,
  ADMIN_CODE_TYPE,
  adminCodeEmail,
  checkAdminCode,
  issueAdminCode,
} from './gate-code';

const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const NOW = new Date('2026-11-11T10:00:00Z');
const ADMIN = { id: 'admin_1', email: 'admin@test.local' };

function fakeDb() {
  const vc = {
    count: vi.fn().mockResolvedValue(0),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    create: vi.fn().mockResolvedValue({}),
    findFirst: vi.fn(),
  };
  return { db: { verificationCode: vc } as never, vc };
}

describe('issueAdminCode', () => {
  let mailer: { enqueue: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    mailer = { enqueue: vi.fn().mockResolvedValue('job_1') };
  });

  it('stores only the hash, for ten minutes, kills the older codes and e-mails the admin', async () => {
    const { db, vc } = fakeDb();
    expect(await issueAdminCode(db, mailer, ADMIN, NOW)).toBe('sent');

    const mail = mailer.enqueue.mock.calls[0]![0] as { to: string; subject: string; text: string };
    expect(mail.to).toBe('admin@test.local');
    const code = mail.text
      .match(/([A-Z2-9]{4}) ([A-Z2-9]{4})/)!
      .slice(1)
      .join('');
    expect(code).toHaveLength(8);

    expect(vc.updateMany).toHaveBeenCalledWith({
      where: { userId: 'admin_1', type: ADMIN_CODE_TYPE, usedAt: null },
      data: { usedAt: NOW },
    });
    const created = vc.create.mock.calls[0]![0].data;
    expect(created).toMatchObject({ userId: 'admin_1', type: 'ADMIN_LOGIN', code: sha(code) });
    expect(created.code).not.toContain(code);
    expect(created.expiresAt.getTime() - NOW.getTime()).toBe(ADMIN_CODE_TTL_MS);
    expect(ADMIN_CODE_TTL_MS).toBe(10 * 60 * 1000);
  });

  it('refuses a fourth code in ten minutes and sends nothing', async () => {
    const { db, vc } = fakeDb();
    vc.count.mockResolvedValue(ADMIN_CODE_MAX_SENDS);
    expect(await issueAdminCode(db, mailer, ADMIN, NOW)).toBe('too-many');
    expect(vc.create).not.toHaveBeenCalled();
    expect(mailer.enqueue).not.toHaveBeenCalled();
    expect(vc.count.mock.calls[0]![0].where.createdAt.gt.getTime()).toBe(
      NOW.getTime() - ADMIN_CODE_TTL_MS,
    );
  });
});

describe('adminCodeEmail', () => {
  it('is in French, shows the code in two groups and says what to do if it was not asked', () => {
    const mail = adminCodeEmail('ABCD2345');
    expect(mail.subject).toContain('ABCD 2345');
    expect(mail.html).toContain('ABCD 2345');
    expect(mail.text).toContain('valable 10 minutes');
    expect(mail.text).toContain('change ton mot de passe');
  });
});

describe('checkAdminCode', () => {
  it('opens once for the right code of this admin, unexpired and unused', async () => {
    const { db, vc } = fakeDb();
    vc.findFirst.mockResolvedValue({ id: 'vc_1', code: sha('ABCD2345') });
    expect(await checkAdminCode(db, 'admin_1', 'abcd2345', NOW)).toBe('ok');
    expect(vc.findFirst.mock.calls[0]![0].where).toEqual({
      userId: 'admin_1',
      type: 'ADMIN_LOGIN',
      usedAt: null,
      expiresAt: { gt: NOW },
    });
    // A try is taken first, atomically, then the code is consumed.
    expect(vc.updateMany.mock.calls[0]![0]).toEqual({
      where: { id: 'vc_1', usedAt: null, attempts: { lt: ADMIN_CODE_MAX_TRIES } },
      data: { attempts: { increment: 1 } },
    });
    expect(vc.updateMany.mock.calls[1]![0]).toEqual({
      where: { id: 'vc_1', usedAt: null },
      data: { usedAt: NOW },
    });
  });

  it('counts a wrong try and does not consume the code', async () => {
    const { db, vc } = fakeDb();
    vc.findFirst.mockResolvedValue({ id: 'vc_1', code: sha('ABCD2345') });
    expect(await checkAdminCode(db, 'admin_1', 'ZZZZ9999', NOW)).toBe('invalid');
    expect(vc.updateMany).toHaveBeenCalledTimes(1);
  });

  it('answers the same when there is no live code', async () => {
    const { db, vc } = fakeDb();
    vc.findFirst.mockResolvedValue(null);
    expect(await checkAdminCode(db, 'admin_1', 'ABCD2345', NOW)).toBe('invalid');
    expect(vc.updateMany).not.toHaveBeenCalled();
  });

  it('refuses even the right code once the five tries are spent', async () => {
    const { db, vc } = fakeDb();
    vc.findFirst.mockResolvedValue({ id: 'vc_1', code: sha('ABCD2345') });
    vc.updateMany.mockResolvedValueOnce({ count: 0 });
    expect(await checkAdminCode(db, 'admin_1', 'ABCD2345', NOW)).toBe('invalid');
    expect(vc.updateMany).toHaveBeenCalledTimes(1);
    expect(ADMIN_CODE_MAX_TRIES).toBe(5);
  });

  it('a code used by a parallel request does not open twice', async () => {
    const { db, vc } = fakeDb();
    vc.findFirst.mockResolvedValue({ id: 'vc_1', code: sha('ABCD2345') });
    vc.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    expect(await checkAdminCode(db, 'admin_1', 'ABCD2345', NOW)).toBe('invalid');
  });
});

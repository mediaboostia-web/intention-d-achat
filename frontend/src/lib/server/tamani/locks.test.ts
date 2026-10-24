import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect } from 'vitest';
import { advisoryXactLock } from './locks';

describe('advisoryXactLock', () => {
  it('takes a transaction-scoped Postgres advisory lock on the key', async () => {
    prismaMock.$executeRaw.mockResolvedValue(1);
    await advisoryXactLock(prismaMock, 'shop-create:u1');
    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(1);
    const [strings, ...values] = prismaMock.$executeRaw.mock.calls[0]!;
    expect((strings as unknown as string[]).join('?')).toContain('pg_advisory_xact_lock(hashtext(');
    expect(values).toEqual(['shop-create:u1']);
  });
});

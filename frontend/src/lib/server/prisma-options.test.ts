import { describe, it, expect } from 'vitest';
import { prismaClientOptions } from './prisma-options';

describe('prismaClientOptions', () => {
  it("keeps Prisma's own transaction limits when nothing is set", () => {
    expect(prismaClientOptions({})).toEqual({});
  });

  it('reads the transaction limits a machine far from the database needs', () => {
    expect(
      prismaClientOptions({ PRISMA_TX_MAX_WAIT_MS: '15000', PRISMA_TX_TIMEOUT_MS: '30000' }),
    ).toEqual({ transactionOptions: { maxWait: 15000, timeout: 30000 } });
    expect(prismaClientOptions({ PRISMA_TX_TIMEOUT_MS: '30000' })).toEqual({
      transactionOptions: { timeout: 30000 },
    });
  });

  it('ignores a value that is not a whole number of milliseconds', () => {
    for (const bad of ['', 'abc', '0', '-5', '1.5', '30s']) {
      expect(prismaClientOptions({ PRISMA_TX_TIMEOUT_MS: bad }), bad).toEqual({});
    }
  });
});

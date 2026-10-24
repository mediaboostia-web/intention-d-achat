import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const FRONTEND = path.resolve(__dirname, '../../../..');
const REPO = path.resolve(FRONTEND, '..');

describe('pruned surfaces — withdrawals (Tamani lot 1)', () => {
  it.each([
    'src/app/api/withdrawals',
    'src/app/api/auth/withdrawal-pin',
    'src/app/api/admin/withdrawals',
    'src/lib/server/withdrawals',
    'src/lib/server/auth/pin.ts',
  ])('%s is gone', (rel) => {
    expect(existsSync(path.join(FRONTEND, rel))).toBe(false);
  });

  it('schema has no Withdrawal model nor withdrawalPinHash', () => {
    const schema = readFileSync(path.join(FRONTEND, 'prisma/schema.prisma'), 'utf8');
    expect(schema).not.toMatch(/^model Withdrawal\b/m);
    expect(schema).not.toMatch(/withdrawalPinHash/);
  });

  it('.env.example declares no withdrawal or payout keys', () => {
    const env = readFileSync(path.join(REPO, '.env.example'), 'utf8');
    expect(env).not.toMatch(/^WITHDRAWAL_/m);
    expect(env).not.toMatch(/^BICTORYS_PRIVATE_KEY=/m);
    expect(env).not.toMatch(/^BICTORYS_MERCHANT_SECRET_CODE=/m);
  });

  it('features.json no longer lists withdrawals', () => {
    const manifest = JSON.parse(readFileSync(path.join(REPO, '.planning/features.json'), 'utf8'));
    expect(Object.keys(manifest.features)).not.toContain('withdrawals');
  });
});

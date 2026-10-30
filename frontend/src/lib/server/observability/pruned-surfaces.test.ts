import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
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

describe('pruned surfaces — bictorys (Tamani lot 8)', () => {
  it.each([
    'src/lib/server/payments/bictorys.ts',
    'src/lib/server/payments/commission.ts',
    'src/lib/server/payments/provider-singleton.ts',
    'src/lib/server/webhook/bictorys.ts',
    'src/app/api/webhooks/bictorys',
    'src/app/api/orders',
    'src/app/api/pay-redirect',
    'src/test-utils/bictorys-mock.ts',
  ])('%s is gone', (rel) => {
    expect(existsSync(path.join(FRONTEND, rel))).toBe(false);
  });

  it('no source file names Bictorys', () => {
    // Protected kit files keep the name in a comment: CLAUDE.md forbids editing them unasked.
    const allowed = new Set([
      'src/lib/server/webhook/handler.ts',
      'src/lib/server/oauth/google.ts',
      'src/app/api/auth/oauth/google/start/route.ts',
      'src/lib/server/observability/pruned-surfaces.test.ts',
    ]);
    const offenders = readdirSync(path.join(FRONTEND, 'src'), { recursive: true })
      .map((rel) => `src/${String(rel).split(path.sep).join('/')}`)
      .filter((rel) => /\.(ts|tsx|js|mjs|css|json)$/.test(rel) && !allowed.has(rel))
      .filter((rel) => /bictorys/i.test(readFileSync(path.join(FRONTEND, rel), 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('.env.example declares no Bictorys key nor the marketplace commission', () => {
    const env = readFileSync(path.join(REPO, '.env.example'), 'utf8');
    expect(env).not.toMatch(/BICTORYS_/);
    expect(env).not.toMatch(/^COMMISSION_RATE_BP=/m);
    expect(env).toMatch(/^SASPAY_API_KEY=/m);
  });

  it('features.json lists the SasPay payments, not Bictorys', () => {
    const manifest = JSON.parse(readFileSync(path.join(REPO, '.planning/features.json'), 'utf8'));
    expect(Object.keys(manifest.features)).toEqual(
      expect.arrayContaining(['payments-saspay', 'webhooks-saspay']),
    );
    expect(JSON.stringify(manifest)).not.toMatch(/bictorys/i);
  });
});

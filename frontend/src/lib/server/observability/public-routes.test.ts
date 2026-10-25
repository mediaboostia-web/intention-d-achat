// The popup's routes take no CSRF token (spec §6.5: a respondent has no
// auth cookie to ride on). What replaces it must stay: the per-IP and
// per-campaign limit on every route, and the Node runtime.
import { describe, expect, it } from 'vitest';
import fg from 'fast-glob';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../../..');

describe('public routes: no CSRF, always rate-limited', () => {
  const files = fg.sync('src/app/api/public/**/route.ts', { cwd: ROOT, absolute: true });

  it('discovered the public routes', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const rel = file.replace(ROOT + '/', '');
    it(`${rel} runs on Node, calls enforcePublicRateLimit and not verifyCsrf`, () => {
      const src = readFileSync(file, 'utf8');
      expect(src, rel).toMatch(/export\s+const\s+runtime\s*=\s*['"]nodejs['"]/);
      expect(src, rel).toContain('enforcePublicRateLimit(');
      expect(src, rel).not.toContain('verifyCsrf');
    });
  }
});

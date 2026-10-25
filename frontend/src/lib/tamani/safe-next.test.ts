import { describe, it, expect } from 'vitest';
import { safeNextPath } from './safe-next';

describe('safeNextPath', () => {
  it('keeps an internal path with its query', () => {
    expect(safeNextPath('/app/produits?x=1')).toBe('/app/produits?x=1');
  });

  it('safeNextPath refuses anything that leaves the site', () => {
    const traps = [
      '//evil.com',
      'https://evil.com',
      '/\\evil.com',
      'javascript:alert(1)',
      '',
      null,
      undefined,
      'app',
      '/\nfoo',
    ];
    for (const raw of traps) expect(safeNextPath(raw), String(raw)).toBe('/app');
  });

  it('uses the fallback it is given', () => {
    expect(safeNextPath(null, '/app/reglages')).toBe('/app/reglages');
  });
});

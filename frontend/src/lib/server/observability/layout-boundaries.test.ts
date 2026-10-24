import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const APP = path.resolve(__dirname, '../../../app');
const read = (rel: string) => readFileSync(path.join(APP, rel), 'utf8');
const SESSION_IMPORT = /@\/contexts\/(AuthContext|ToastContext)/;

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? filesUnder(full) : [full];
  });
}

describe('layout boundaries (Tamani lot 1)', () => {
  it('root layout carries no session providers and is in French', () => {
    const src = read('layout.tsx');
    expect(src).not.toMatch(SESSION_IMPORT);
    expect(src).toMatch(/lang="fr"/);
  });

  it.each(['(app)/layout.tsx', '(admin)/layout.tsx'])(
    '%s wraps children in Toast + Auth providers',
    (rel) => {
      const src = read(rel);
      expect(src).toMatch(/@\/contexts\/AuthContext/);
      expect(src).toMatch(/@\/contexts\/ToastContext/);
    },
  );

  it('no file under (public) imports session contexts', () => {
    const offenders = filesUnder(path.join(APP, '(public)'))
      .filter((f) => /\.(tsx?|jsx?)$/.test(f))
      .filter((f) => {
        const src = readFileSync(f, 'utf8');
        return SESSION_IMPORT.test(src) || /useAuth\(/.test(src);
      });
    expect(offenders).toEqual([]);
  });

  it('home page lives in the (public) group', () => {
    expect(existsSync(path.join(APP, 'page.tsx'))).toBe(false);
    expect(existsSync(path.join(APP, '(public)/page.tsx'))).toBe(true);
  });
});

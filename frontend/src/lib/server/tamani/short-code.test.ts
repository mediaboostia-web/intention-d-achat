import { describe, it, expect, vi } from 'vitest';
import { SHORT_CODE_REGEX, generateShortCode, withUniqueCode } from './short-code';

const collision = () =>
  Object.assign(new Error('Unique'), { code: 'P2002', meta: { target: ['code'] } });

describe('generateShortCode', () => {
  it('returns 7 base62 characters, almost never twice the same', () => {
    const codes = Array.from({ length: 200 }, () => generateShortCode());
    for (const c of codes) expect(c).toMatch(SHORT_CODE_REGEX);
    expect(new Set(codes).size).toBeGreaterThanOrEqual(195);
  });

  it('honours a custom length', () => {
    expect(generateShortCode(10)).toMatch(/^[0-9A-Za-z]{10}$/);
  });
});

describe('withUniqueCode', () => {
  it('retries on a code collision', async () => {
    const create = vi
      .fn<(code: string) => Promise<string>>()
      .mockRejectedValueOnce(collision())
      .mockImplementationOnce(async (code) => `ok:${code}`);
    const result = await withUniqueCode(create);
    expect(create).toHaveBeenCalledTimes(2);
    const [first, second] = create.mock.calls.map(([c]) => c);
    expect(first).not.toBe(second);
    expect(result).toBe(`ok:${second}`);
  });

  it('rethrows other errors at once', async () => {
    const create = vi.fn().mockRejectedValue(new Error('db down'));
    await expect(withUniqueCode(create)).rejects.toThrow('db down');
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('gives up after 5 collisions', async () => {
    const create = vi.fn().mockImplementation(async () => {
      throw collision();
    });
    await expect(withUniqueCode(create)).rejects.toBeTruthy();
    expect(create).toHaveBeenCalledTimes(5);
  });
});

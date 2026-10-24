import { describe, it, expect } from 'vitest';
import { normalizeCode } from './auth-code';

describe('normalizeCode', () => {
  it('uppercases, drops spaces and keeps 8 characters', () => {
    expect(normalizeCode('abcd 2345')).toBe('ABCD2345');
    expect(normalizeCode(' wxyz6789xx ')).toBe('WXYZ6789');
    expect(normalizeCode('')).toBe('');
  });
});

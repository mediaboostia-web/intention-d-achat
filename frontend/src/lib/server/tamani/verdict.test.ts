import { describe, it, expect } from 'vitest';
import { MIN_RESPONSES_FOR_VERDICT, computeVerdict, verdictReference } from './verdict';

const at = (realistic: number, reference: number | null) =>
  computeVerdict({ realistic, completedResponses: 40, reference });

describe('computeVerdict', () => {
  it('waits under 20 counted answers', () => {
    expect(MIN_RESPONSES_FOR_VERDICT).toBe(20);
    expect(computeVerdict({ realistic: 500, completedResponses: 19, reference: 400 })).toEqual({
      code: 'WAIT',
      ratio: null,
      missingResponses: 1,
    });
    expect(computeVerdict({ realistic: 500, completedResponses: 20, reference: 400 }).code).toBe(
      'GO',
    );
  });

  it('says GO from a ratio of 0.9', () => {
    expect(at(360, 400)).toEqual({ code: 'GO', ratio: 0.9, missingResponses: 0 });
    expect(at(800, 400).code).toBe('GO');
  });

  it('says CAUTION from 0.4 to just under 0.9', () => {
    expect(at(356, 400).code).toBe('CAUTION');
    expect(at(160, 400).code).toBe('CAUTION');
  });

  it('says STOP under 0.4', () => {
    expect(at(156, 400)).toMatchObject({ code: 'STOP', ratio: 0.39 });
    expect(at(0, 400).code).toBe('STOP');
  });

  it('stays NEUTRAL without a reference', () => {
    expect(at(210, null)).toEqual({ code: 'NEUTRAL', ratio: null, missingResponses: 0 });
    expect(at(210, 0).code).toBe('NEUTRAL');
  });
});

describe('verdictReference', () => {
  it('is the planned quantity, else the stock', () => {
    expect(verdictReference({ plannedQuantity: 400, stockQuantity: 200 })).toBe(400);
    expect(verdictReference({ plannedQuantity: null, stockQuantity: 200 })).toBe(200);
    expect(verdictReference({ plannedQuantity: null, stockQuantity: null })).toBeNull();
  });
});

import { describe, it, expect } from 'vitest';
import { computeStockAdvice } from './stock-advice';

describe('computeStockAdvice', () => {
  it('says the stock is enough and what is left, provisional under 20 answers', () => {
    expect(computeStockAdvice({ realistic: 6, stock: 30, completed: 1 })).toEqual({
      status: 'ENOUGH',
      leftover: 24,
      restock: 0,
      provisional: true,
    });
  });

  it('asks for a restock when the demand passes the stock', () => {
    expect(computeStockAdvice({ realistic: 70, stock: 30, completed: 25 })).toEqual({
      status: 'SHORTAGE',
      leftover: 0,
      restock: 40,
      provisional: false,
    });
  });

  it('calls a demand equal to the stock enough, from 20 answers', () => {
    expect(computeStockAdvice({ realistic: 30, stock: 30, completed: 20 })).toEqual({
      status: 'ENOUGH',
      leftover: 0,
      restock: 0,
      provisional: false,
    });
  });
});

// What an in-stock campaign's answers say about its stock (lot 6b, retours
// §1): enough, or a restock to plan. Shown from the first answer, flagged
// provisional until the verdict's 20 counted answers.
import type { StockAdvice } from '@/lib/tamani/results-view';
import { DEFAULT_MIN_RESPONSES } from '@/lib/tamani/verdict-display';

export function computeStockAdvice(i: {
  realistic: number;
  stock: number;
  completed: number;
}): StockAdvice {
  return {
    status: i.realistic > i.stock ? 'SHORTAGE' : 'ENOUGH',
    leftover: Math.max(i.stock - i.realistic, 0),
    restock: Math.max(i.realistic - i.stock, 0),
    provisional: i.completed < DEFAULT_MIN_RESPONSES,
  };
}

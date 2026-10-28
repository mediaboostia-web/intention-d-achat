// The campaign verdict (spec §5.4.0): realistic demand against the quantity
// the wholesaler means to order. The words are in lib/tamani/verdict-display.ts.
import 'server-only';
import { DEFAULT_MIN_RESPONSES, type VerdictCode } from '@/lib/tamani/verdict-display';

export const MIN_RESPONSES_FOR_VERDICT = DEFAULT_MIN_RESPONSES;

const GO_RATIO = 0.9;
const CAUTION_RATIO = 0.4;

/** What the verdict compares to: the planned order, else the stock. */
export function verdictReference(c: {
  plannedQuantity: number | null;
  stockQuantity: number | null;
}): number | null {
  return c.plannedQuantity ?? c.stockQuantity;
}

export function computeVerdict(i: {
  realistic: number;
  completedResponses: number;
  reference: number | null;
}): { code: VerdictCode; ratio: number | null; missingResponses: number } {
  if (i.completedResponses < MIN_RESPONSES_FOR_VERDICT) {
    return {
      code: 'WAIT',
      ratio: null,
      missingResponses: MIN_RESPONSES_FOR_VERDICT - i.completedResponses,
    };
  }
  if (i.reference === null || i.reference <= 0) {
    return { code: 'NEUTRAL', ratio: null, missingResponses: 0 };
  }
  const ratio = i.realistic / i.reference;
  const code = ratio >= GO_RATIO ? 'GO' : ratio >= CAUTION_RATIO ? 'CAUTION' : 'STOP';
  return { code, ratio, missingResponses: 0 };
}

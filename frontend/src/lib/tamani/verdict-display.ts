// How a campaign verdict reads on screen: stamp word, figure, sentence and
// hand-written note. Pure and shared by the UI; the verdict itself is
// computed server-side by lib/server/tamani/verdict.ts (lot 6), which
// returns a VerdictCode from this module. Spec §5.4.0.
import type { VerdictTone } from '@/lib/design/tokens';

export type VerdictCode = 'WAIT' | 'GO' | 'CAUTION' | 'STOP' | 'NEUTRAL';

export const VERDICT_TONE: Readonly<Record<VerdictCode, VerdictTone>> = {
  GO: 'success',
  CAUTION: 'warning',
  STOP: 'danger',
  WAIT: 'neutral',
  NEUTRAL: 'primary',
};

const DEFAULT_MIN_RESPONSES = 20;

/** Quantities from 30 up are shown rounded to the ten ("~210" for 211). */
export function approxQuantity(n: number): number {
  return n < 30 ? n : Math.round(n / 10) * 10;
}

/** "sac de 25 kg" × 12 → "sacs de 25 kg". Words ending in s, x or z stay. */
export function pluralizeUnit(unitLabel: string, n: number): string {
  if (n < 2) return unitLabel;
  const [first = '', ...rest] = unitLabel.split(' ');
  const plural = /[sxz]$/i.test(first) ? first : `${first}s`;
  return [plural, ...rest].join(' ');
}

const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);

export interface VerdictDisplay {
  tone: VerdictTone;
  stampWord: string;
  figure: string;
  unit: string;
  sentence: string;
  /** Hand-written margin note, e.g. "et pas 400 !". */
  note: string | null;
}

export function verdictDisplay(i: {
  code: VerdictCode;
  realistic: number;
  completedResponses: number;
  reference: number | null;
  unitLabel?: string;
  minResponses?: number;
}): VerdictDisplay {
  const unitLabel = i.unitLabel ?? 'pièce';
  const tone = VERDICT_TONE[i.code];
  const q = approxQuantity(i.realistic);
  const units = pluralizeUnit(unitLabel, q);
  const note = i.reference === null ? null : `et pas ${i.reference} !`;

  switch (i.code) {
    case 'WAIT': {
      const min = i.minResponses ?? DEFAULT_MIN_RESPONSES;
      const missing = Math.max(min - i.completedResponses, 0);
      return {
        tone,
        stampWord: 'On attend',
        figure: `${i.completedResponses}/${min}`,
        unit: 'réponses',
        sentence: `Encore ${missing} ${plural(missing, 'réponse', 'réponses')} avant de te conseiller.`,
        note: null,
      };
    }
    case 'GO':
      return {
        tone,
        stampWord: 'Commande',
        figure: `~${q}`,
        unit: units,
        sentence: `Commande environ ${q} ${units}.`,
        note: null,
      };
    case 'CAUTION':
      return {
        tone,
        stampWord: 'Prudence',
        figure: `~${q}`,
        unit: units,
        sentence: `Commande environ ${q} ${units}, pas les ${i.reference} prévues.`,
        note,
      };
    case 'STOP':
      return {
        tone,
        stampWord: "N'achète pas",
        figure: `~${q}`,
        unit: `${units} au plus`,
        sentence: `N'achète pas, ou très peu : la demande réaliste est de ${q} ${units} pour ${i.reference} prévues.`,
        note,
      };
    case 'NEUTRAL':
      return {
        tone,
        stampWord: 'Demande',
        figure: `~${q}`,
        unit: units,
        sentence: `Ta communauté demande environ ${q} ${units}.`,
        note: null,
      };
  }
}

/** "Entre 176 et 246 pièces, d'après 94 réponses dont 64 intéressés." */
export function verdictBasis(i: {
  low: number;
  high: number;
  completedResponses: number;
  interestedCount: number;
  unitLabel?: string;
}): string {
  const units = pluralizeUnit(i.unitLabel ?? 'pièce', i.high);
  const n = i.completedResponses;
  const k = i.interestedCount;
  return `Entre ${i.low} et ${i.high} ${units}, d'après ${n} ${plural(n, 'réponse', 'réponses')} dont ${k} ${plural(k, 'intéressé', 'intéressés')}.`;
}

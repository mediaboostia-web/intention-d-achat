// The campaign creation wizard (spec §5.2 step 4): one question per step,
// state kept as typed, dates kept relative ("dans 10 jours") and resolved
// only when the campaign is sent. A failed launch keeps every answer.
import { addDays } from './dates';
import { parseCount } from './fcfa-input';
import { DEFAULT_SHARE_TEMPLATE } from './share-message';
import type { Availability } from './timing';

export const WIZARD_STEPS = [
  'product',
  'availability',
  'quantities',
  'end',
  'delivery',
  'message',
] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

export interface WizardValues {
  productId: string | null;
  availability: Availability;
  /** Shortcut for an incoming product: arrives in N days. */
  availableInDays: number | null;
  /** A chosen arrival date (YYYY-MM-DD); wins over the shortcut. */
  availableOn: string;
  stockQuantity: string;
  showStock: boolean;
  plannedQuantity: string;
  /** null = no end date. */
  endsInDays: number | null;
  deliveryEnabled: boolean;
  showLiveCounter: boolean;
  shareTemplate: string;
}

export interface WizardState extends WizardValues {
  step: number;
  submitting: boolean;
  error: string | null;
}

export type WizardAction =
  | {
      [K in keyof WizardValues]: { type: 'set'; field: K; value: WizardValues[K] };
    }[keyof WizardValues]
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'goto'; step: number }
  | { type: 'submit' }
  | { type: 'failed'; error: string };

const LAST = WIZARD_STEPS.length - 1;
const clampStep = (n: number) => Math.min(LAST, Math.max(0, n));

export function initialWizardState(productId: string | null = null): WizardState {
  return {
    productId,
    availability: 'IN_STOCK',
    availableInDays: 10,
    availableOn: '',
    stockQuantity: '',
    showStock: false,
    plannedQuantity: '',
    endsInDays: 14,
    deliveryEnabled: false,
    showLiveCounter: true,
    shareTemplate: DEFAULT_SHARE_TEMPLATE,
    step: 0,
    submitting: false,
    error: null,
  };
}

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'set':
      return { ...state, [action.field]: action.value, error: null };
    case 'next':
      return { ...state, step: clampStep(state.step + 1) };
    case 'back':
      return { ...state, step: clampStep(state.step - 1) };
    case 'goto':
      return { ...state, step: clampStep(action.step) };
    case 'submit':
      return { ...state, submitting: true, error: null };
    case 'failed':
      return { ...state, submitting: false, error: action.error };
  }
}

const isDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const optionalCount = (raw: string, min: number) =>
  raw.trim() === '' || parseCount(raw, min) !== null;

export function canAdvance(s: WizardState): boolean {
  switch (WIZARD_STEPS[s.step]) {
    case 'product':
      return s.productId !== null;
    case 'availability':
      return s.availability === 'IN_STOCK' || s.availableInDays !== null || isDay(s.availableOn);
    case 'quantities':
      return optionalCount(s.stockQuantity, 0) && optionalCount(s.plannedQuantity, 1);
    case 'message':
      return s.shareTemplate.trim().length > 0 && s.shareTemplate.length <= 1000;
    default:
      return true;
  }
}

function arrival(s: WizardState, now: Date): string | null {
  if (s.availability === 'IN_STOCK') return null;
  // Noon UTC keeps the chosen day whatever the reader's time zone.
  if (isDay(s.availableOn)) return new Date(`${s.availableOn}T12:00:00.000Z`).toISOString();
  return s.availableInDays === null ? null : addDays(now, s.availableInDays).toISOString();
}

const countOrNull = (raw: string, min: number) => (raw.trim() === '' ? null : parseCount(raw, min));

export function toCampaignBody(
  s: WizardState,
  status: 'DRAFT' | 'ACTIVE',
  now: Date,
): Record<string, unknown> {
  return {
    productId: s.productId,
    availability: s.availability,
    availableAt: arrival(s, now),
    stockQuantity: countOrNull(s.stockQuantity, 0),
    plannedQuantity: countOrNull(s.plannedQuantity, 1),
    showStock: s.showStock,
    endsAt: s.endsInDays === null ? null : addDays(now, s.endsInDays).toISOString(),
    deliveryEnabled: s.deliveryEnabled,
    showLiveCounter: s.showLiveCounter,
    shareTemplate: s.shareTemplate.trim(),
    status,
  };
}

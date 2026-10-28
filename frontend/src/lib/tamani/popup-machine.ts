// The respondent's path through the popup (spec §5.3), one tap per step:
// interest → (no: reason) or (yes: buyer → quantity → timing → delivery)
// → contact → thanks. Pure, so every path is tested without a browser; the
// sheet posts stepBody(action) for each tap.
import type { DeviceMemory, RememberedRespondent } from './device-memory';
import type { BuyerType, NotInterestedReason } from './labels';
import type { Timing } from './timing';

export type PopupStep =
  | 'interest'
  | 'reason'
  | 'buyer'
  | 'quantity'
  | 'timing'
  | 'delivery'
  | 'contact'
  | 'thanks';

export interface PopupAnswers {
  interested: boolean | null;
  notInterestedReason: NotInterestedReason | null;
  buyerType: BuyerType | null;
  quantity: number | null;
  option: string | null;
  timing: Timing | null;
  wantsDelivery: boolean | null;
  zoneId: string | null;
  /** « Autre endroit »: a delivery outside the shop's zones. */
  deliveryPlace: string | null;
}

export const EMPTY_ANSWERS: PopupAnswers = {
  interested: null,
  notInterestedReason: null,
  buyerType: null,
  quantity: null,
  option: null,
  timing: null,
  wantsDelivery: null,
  zoneId: null,
  deliveryPlace: null,
};

export interface PopupState {
  step: PopupStep;
  answers: PopupAnswers;
  remembered: RememberedRespondent | null;
  /** The person « pas toi ? » set aside, until « C'est bien moi » or a new number. */
  forgotten: RememberedRespondent | null;
  deliveryEnabled: boolean;
}

export type PopupAction =
  | { type: 'interest'; interested: boolean }
  | { type: 'reason'; reason: NotInterestedReason | null }
  | { type: 'buyer'; buyerType: BuyerType }
  | { type: 'quantity'; quantity: number; option: string | null }
  | { type: 'timing'; timing: Timing }
  | { type: 'delivery'; wantsDelivery: boolean; zoneId: string | null; place?: string | null }
  | { type: 'completed'; respondent: RememberedRespondent }
  | { type: 'edit' }
  | { type: 'notMe' }
  | { type: 'itsMe' }
  | { type: 'back' }
  /** The phone's memory, read after the server-rendered first paint. */
  | { type: 'restore'; memory: DeviceMemory; campaignId: string };

/** What a tap sends to POST /api/public/responses (the server's step fields). */
export interface ResponseStepBody {
  interested?: boolean;
  notInterestedReason?: NotInterestedReason | null;
  buyerType?: BuyerType;
  quantity?: number;
  option?: string | null;
  timing?: Timing;
  wantsDelivery?: boolean;
  zoneId?: string | null;
  deliveryPlace?: string | null;
  firstName?: string;
  phone?: string;
  phoneCountry?: string;
}

export function initialPopupState(ctx: {
  deliveryEnabled: boolean;
  memory: DeviceMemory | null;
  campaignId: string;
}): PopupState {
  const saved = ctx.memory?.saved[ctx.campaignId];
  return {
    step: saved ? 'thanks' : 'interest',
    answers: saved?.answers ?? EMPTY_ANSWERS,
    remembered: ctx.memory?.respondent ?? null,
    forgotten: null,
    deliveryEnabled: ctx.deliveryEnabled,
  };
}

function path(state: PopupState): PopupStep[] {
  if (state.answers.interested === false) return ['interest', 'reason', 'contact'];
  return [
    'interest',
    'buyer',
    'quantity',
    'timing',
    ...(state.deliveryEnabled ? (['delivery'] as const) : []),
    'contact',
  ];
}

function next(state: PopupState, answers: PopupAnswers): PopupState {
  const moved = { ...state, answers };
  const steps = path(moved);
  return { ...moved, step: steps[steps.indexOf(state.step) + 1] ?? 'contact' };
}

export function popupReducer(state: PopupState, action: PopupAction): PopupState {
  const a = state.answers;
  switch (action.type) {
    case 'interest':
      return next(
        state,
        action.interested
          ? { ...a, interested: true, notInterestedReason: null }
          : { ...EMPTY_ANSWERS, interested: false, notInterestedReason: a.notInterestedReason },
      );
    case 'reason':
      return next(state, { ...a, notInterestedReason: action.reason });
    case 'buyer':
      return next(state, { ...a, buyerType: action.buyerType });
    case 'quantity':
      return next(state, { ...a, quantity: action.quantity, option: action.option });
    case 'timing':
      return next(state, { ...a, timing: action.timing });
    case 'delivery':
      return next(state, {
        ...a,
        wantsDelivery: action.wantsDelivery,
        zoneId: action.wantsDelivery ? action.zoneId : null,
        deliveryPlace:
          action.wantsDelivery && action.zoneId === null ? (action.place ?? null) : null,
      });
    case 'completed':
      return { ...state, step: 'thanks', remembered: action.respondent, forgotten: null };
    case 'edit':
      return { ...state, step: 'interest' };
    case 'notMe':
      return { ...state, remembered: null, forgotten: state.remembered ?? state.forgotten };
    case 'itsMe':
      return state.forgotten ? { ...state, remembered: state.forgotten, forgotten: null } : state;
    case 'restore': {
      const restored = initialPopupState({
        ...state,
        memory: action.memory,
        campaignId: action.campaignId,
      });
      return state.step === 'interest' && state.answers.interested === null
        ? restored
        : { ...state, remembered: restored.remembered };
    }
    case 'back': {
      // « Retour » after « pas toi ? » first comes back to the person.
      if (state.step === 'contact' && state.forgotten && !state.remembered) {
        return { ...state, remembered: state.forgotten, forgotten: null };
      }
      const steps = path(state);
      const i = steps.indexOf(state.step);
      return i > 0 ? { ...state, step: steps[i - 1]! } : state;
    }
  }
}

export function stepBody(action: PopupAction): ResponseStepBody {
  switch (action.type) {
    case 'interest':
      return { interested: action.interested };
    case 'reason':
      return { notInterestedReason: action.reason };
    case 'buyer':
      return { buyerType: action.buyerType };
    case 'quantity':
      return { quantity: action.quantity, option: action.option };
    case 'timing':
      return { timing: action.timing };
    case 'delivery':
      return {
        wantsDelivery: action.wantsDelivery,
        zoneId: action.zoneId,
        ...(action.place === undefined ? {} : { deliveryPlace: action.place }),
      };
    default:
      return {};
  }
}

/** Every answer at once: the last step resends them, so a tap lost on a weak network is not. */
export function answersBody(a: PopupAnswers): ResponseStepBody {
  if (a.interested === false) {
    return { interested: false, notInterestedReason: a.notInterestedReason };
  }
  const body: ResponseStepBody = { option: a.option };
  if (a.interested !== null) body.interested = a.interested;
  if (a.buyerType !== null) body.buyerType = a.buyerType;
  if (a.quantity !== null) body.quantity = a.quantity;
  if (a.timing !== null) body.timing = a.timing;
  if (a.wantsDelivery !== null) {
    body.wantsDelivery = a.wantsDelivery;
    body.zoneId = a.zoneId;
    if (a.wantsDelivery && a.zoneId === null && a.deliveryPlace) {
      body.deliveryPlace = a.deliveryPlace;
    }
  }
  return body;
}

const DOT: Record<PopupStep, number> = {
  interest: 0,
  reason: 1,
  buyer: 1,
  quantity: 2,
  timing: 3,
  delivery: 3,
  contact: 4,
  thanks: 4,
};

/** Which of the five progress dots is lit. */
export function progressIndex(step: PopupStep): number {
  return DOT[step];
}

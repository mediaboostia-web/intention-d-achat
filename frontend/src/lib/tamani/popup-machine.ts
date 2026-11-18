// The respondent's path through the popup (spec §5.3), one tap per step:
// interest → (no: reason) or (yes: buyer → quantity → timing → delivery)
// → contact → thanks. Pure, so every path is tested without a browser; the
// sheet posts stepBody(action) for each tap.
import type { DeviceMemory, RememberedRespondent } from './device-memory';
import type { BuyerType, NotInterestedReason } from './labels';
import type { PickInput } from './offers';
import type { OptionQuantity } from './option-split';
import type { Timing } from './timing';

export type PopupStep =
  | 'interest'
  | 'reason'
  | 'buyer'
  | 'quantity'
  /** After the offers (2026-11-18): the pieces split by colour or size. */
  | 'split'
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
  /** How many of each colour or size (2026-11-04); `quantity` is their total. */
  optionQuantities: OptionQuantity[] | null;
  /** The wholesale offers a reseller picked (2026-11-18); `quantity` is their pieces. */
  offerPicks: PickInput[] | null;
  timing: Timing | null;
  wantsDelivery: boolean | null;
  /** Pickup, delivery or shipping (2026-11-18); wantsDelivery follows it. */
  fulfillment: Fulfillment | null;
  zoneId: string | null;
  /** « Autre endroit », or the city and country of a shipping. */
  deliveryPlace: string | null;
}

export type Fulfillment = 'PICKUP' | 'DELIVERY' | 'SHIPPING';

export const EMPTY_ANSWERS: PopupAnswers = {
  interested: null,
  notInterestedReason: null,
  buyerType: null,
  quantity: null,
  option: null,
  optionQuantities: null,
  offerPicks: null,
  timing: null,
  wantsDelivery: null,
  fulfillment: null,
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
  shippingEnabled: boolean;
  /** The product has colours or sizes: offers are split after. */
  hasOptions: boolean;
}

export type PopupAction =
  | { type: 'interest'; interested: boolean }
  | { type: 'reason'; reason: NotInterestedReason | null }
  | { type: 'buyer'; buyerType: BuyerType }
  | {
      type: 'quantity';
      quantity: number;
      option: string | null;
      optionQuantities?: OptionQuantity[];
    }
  | { type: 'offers'; picks: PickInput[]; pieces: number }
  | { type: 'timing'; timing: Timing }
  | {
      type: 'delivery';
      wantsDelivery: boolean;
      zoneId: string | null;
      place?: string | null;
      fulfillment?: Fulfillment;
    }
  | { type: 'completed'; respondent: RememberedRespondent }
  | { type: 'edit' }
  /** « En fait, ça m'intéresse » on the end dialog of a no. */
  | { type: 'changeMind' }
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
  /** « J'accepte que {boutique} me contacte » (2026-11-04). */
  contactConsent?: boolean;
  /** How many of each colour or size (2026-11-04). */
  optionQuantities?: OptionQuantity[];
  /** The wholesale offers picked (2026-11-18). */
  offerPicks?: PickInput[];
  fulfillment?: Fulfillment;
}

export function initialPopupState(ctx: {
  deliveryEnabled: boolean;
  shippingEnabled?: boolean;
  hasOptions?: boolean;
  memory: DeviceMemory | null;
  campaignId: string;
}): PopupState {
  const saved = ctx.memory?.saved[ctx.campaignId];
  return {
    step: saved ? 'thanks' : 'interest',
    // An answer kept on the phone before 2026-11-18 has no offers nor way to receive it.
    answers: saved ? { ...EMPTY_ANSWERS, ...saved.answers } : EMPTY_ANSWERS,
    shippingEnabled: ctx.shippingEnabled ?? false,
    hasOptions: ctx.hasOptions ?? false,
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
    ...(state.answers.offerPicks && state.hasOptions ? (['split'] as const) : []),
    'timing',
    ...(state.deliveryEnabled || state.shippingEnabled ? (['delivery'] as const) : []),
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
      return next(state, {
        ...a,
        buyerType: action.buyerType,
        offerPicks: action.buyerType === 'RESELLER' ? a.offerPicks : null,
      });
    case 'offers': {
      // A split that no longer adds up to the pieces is asked again.
      const keep = a.optionQuantities !== null && a.quantity === action.pieces;
      return next(state, {
        ...a,
        offerPicks: action.picks,
        quantity: action.pieces,
        option: keep ? a.option : null,
        optionQuantities: keep ? a.optionQuantities : null,
      });
    }
    case 'quantity':
      return next(state, {
        ...a,
        quantity: action.quantity,
        option: action.option,
        optionQuantities: action.optionQuantities ?? null,
        // The split of the offers keeps them; a plain quantity replaces them.
        offerPicks: state.step === 'split' ? a.offerPicks : null,
      });
    case 'timing':
      return next(state, { ...a, timing: action.timing });
    case 'delivery':
      return next(state, {
        ...a,
        wantsDelivery: action.wantsDelivery,
        fulfillment: action.fulfillment ?? (action.wantsDelivery ? 'DELIVERY' : 'PICKUP'),
        zoneId: action.wantsDelivery ? action.zoneId : null,
        deliveryPlace:
          action.wantsDelivery && action.zoneId === null ? (action.place ?? null) : null,
      });
    case 'completed':
      return { ...state, step: 'thanks', remembered: action.respondent, forgotten: null };
    case 'edit':
      return { ...state, step: 'interest' };
    case 'changeMind':
      // Only a finished no turns into a yes; the buyer question comes next.
      if (state.step !== 'thanks' || a.interested !== false) return state;
      return { ...state, step: 'buyer', answers: { ...EMPTY_ANSWERS, interested: true } };
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
    case 'offers':
      return { offerPicks: action.picks };
    case 'quantity':
      return action.optionQuantities
        ? { optionQuantities: action.optionQuantities }
        : { quantity: action.quantity, option: action.option };
    case 'timing':
      return { timing: action.timing };
    case 'delivery':
      return {
        wantsDelivery: action.wantsDelivery,
        zoneId: action.zoneId,
        ...(action.place === undefined ? {} : { deliveryPlace: action.place }),
        ...(action.fulfillment ? { fulfillment: action.fulfillment } : {}),
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
  // An answer kept on the phone before the split has no optionQuantities.
  const split = a.optionQuantities ?? null;
  const picks = a.offerPicks ?? null;
  const body: ResponseStepBody = split ? { optionQuantities: split } : { option: a.option };
  if (picks) body.offerPicks = picks;
  if (a.interested !== null) body.interested = a.interested;
  if (a.buyerType !== null) body.buyerType = a.buyerType;
  if (a.quantity !== null && !split && !picks) body.quantity = a.quantity;
  if (a.timing !== null) body.timing = a.timing;
  if (a.wantsDelivery !== null) {
    body.wantsDelivery = a.wantsDelivery;
    body.zoneId = a.zoneId;
    if (a.fulfillment) body.fulfillment = a.fulfillment;
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
  split: 2,
  timing: 3,
  delivery: 3,
  contact: 4,
  thanks: 4,
};

/** Which of the five progress dots is lit. */
export function progressIndex(step: PopupStep): number {
  return DOT[step];
}

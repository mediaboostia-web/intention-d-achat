import { describe, expect, it } from 'vitest';
import type { DeviceMemory } from './device-memory';
import {
  EMPTY_ANSWERS,
  answersBody,
  initialPopupState,
  popupReducer,
  progressIndex,
  stepBody,
  type PopupAction,
  type PopupState,
} from './popup-machine';

const awa = { firstName: 'Awa', phoneE164: '+221771234512', phoneMasked: '77 •• •• 12' };

function run(state: PopupState, actions: PopupAction[]): PopupState[] {
  const seen: PopupState[] = [];
  for (const a of actions) {
    state = popupReducer(state, a);
    seen.push(state);
  }
  return seen;
}

const fresh = (deliveryEnabled = true) =>
  initialPopupState({ deliveryEnabled, memory: null, campaignId: 'camp_1' });

const yesPath: PopupAction[] = [
  { type: 'interest', interested: true },
  { type: 'buyer', buyerType: 'RESELLER' },
  { type: 'quantity', quantity: 12, option: 'Rouge' },
  { type: 'timing', timing: 'ON_ARRIVAL' },
  { type: 'delivery', wantsDelivery: true, zoneId: 'zone_1' },
  { type: 'completed', respondent: awa },
];

describe('popupReducer', () => {
  it('the yes path goes buyer, quantity, timing, delivery, contact', () => {
    const steps = run(fresh(), yesPath).map((s) => s.step);
    expect(steps).toEqual(['buyer', 'quantity', 'timing', 'delivery', 'contact', 'thanks']);
  });

  it('skips delivery when the campaign has none', () => {
    const steps = run(fresh(false), yesPath.slice(0, 4)).map((s) => s.step);
    expect(steps).toEqual(['buyer', 'quantity', 'timing', 'contact']);
  });

  it('the no path goes reason then contact', () => {
    const [afterNo, afterReason] = run(fresh(), [
      { type: 'interest', interested: false },
      { type: 'reason', reason: 'TOO_EXPENSIVE' },
    ]);
    expect(afterNo!.step).toBe('reason');
    expect(afterReason).toMatchObject({
      step: 'contact',
      answers: { interested: false, notInterestedReason: 'TOO_EXPENSIVE' },
    });
  });

  it('a no forgets the yes answers given before', () => {
    const states = run(fresh(), [...yesPath.slice(0, 3), { type: 'back' }, { type: 'back' }]);
    const back = states.at(-1)!;
    expect(back.step).toBe('buyer');
    const no = popupReducer(popupReducer(back, { type: 'back' }), {
      type: 'interest',
      interested: false,
    });
    expect(no.answers).toEqual({ ...EMPTY_ANSWERS, interested: false });
  });

  it('back returns to the previous step of the path taken', () => {
    const atContact = run(fresh(), yesPath.slice(0, 5)).at(-1)!;
    expect(popupReducer(atContact, { type: 'back' }).step).toBe('delivery');
    const noContact = run(fresh(), [
      { type: 'interest', interested: false },
      { type: 'reason', reason: null },
    ]).at(-1)!;
    expect(popupReducer(noContact, { type: 'back' }).step).toBe('reason');
    expect(popupReducer(fresh(), { type: 'back' }).step).toBe('interest');
  });

  it('edit from thanks restarts at interest with the answers kept', () => {
    const thanks = run(fresh(), yesPath).at(-1)!;
    const edit = popupReducer(thanks, { type: 'edit' });
    expect(edit.step).toBe('interest');
    expect(edit.answers).toEqual(thanks.answers);
    expect(edit.remembered).toEqual(awa);
  });

  it('notMe forgets the remembered respondent on the contact step', () => {
    const memory: DeviceMemory = { deviceId: 'd', respondent: awa, saved: {} };
    const s = initialPopupState({ deliveryEnabled: false, memory, campaignId: 'camp_1' });
    expect(s.remembered).toEqual(awa);
    expect(popupReducer(s, { type: 'notMe' }).remembered).toBeNull();
  });

  it('itsMe brings back the person « pas toi ? » set aside', () => {
    const memory: DeviceMemory = { deviceId: 'd', respondent: awa, saved: {} };
    const s = { ...initialPopupState({ deliveryEnabled: false, memory, campaignId: 'camp_1' }) };
    const notMe = popupReducer({ ...s, step: 'contact' }, { type: 'notMe' });
    expect(notMe).toMatchObject({ remembered: null, forgotten: awa });
    expect(popupReducer(notMe, { type: 'itsMe' })).toMatchObject({
      remembered: awa,
      forgotten: null,
    });
    // « Retour » on the form also comes back to the person first.
    expect(popupReducer(notMe, { type: 'back' })).toMatchObject({
      step: 'contact',
      remembered: awa,
      forgotten: null,
    });
    expect(
      popupReducer(notMe, { type: 'completed', respondent: { ...awa, firstName: 'Fatou' } })
        .forgotten,
    ).toBeNull();
  });

  it('keeps a delivery place until a zone or a pickup replaces it', () => {
    const [placed] = run({ ...fresh(), step: 'delivery' }, [
      { type: 'delivery', wantsDelivery: true, zoneId: null, place: 'Lomé' },
    ]);
    expect(placed!.answers).toMatchObject({
      wantsDelivery: true,
      zoneId: null,
      deliveryPlace: 'Lomé',
    });
    const zoned = popupReducer(
      { ...placed!, step: 'delivery' },
      { type: 'delivery', wantsDelivery: true, zoneId: 'zone_1' },
    );
    expect(zoned.answers).toMatchObject({ zoneId: 'zone_1', deliveryPlace: null });
    const pickup = popupReducer(
      { ...placed!, step: 'delivery' },
      { type: 'delivery', wantsDelivery: false, zoneId: null },
    );
    expect(pickup.answers.deliveryPlace).toBeNull();
  });

  it('popupReducer runs without memory', () => {
    const s = fresh();
    expect(s).toMatchObject({ step: 'interest', remembered: null, answers: EMPTY_ANSWERS });
    expect(run(s, yesPath).at(-1)!.step).toBe('thanks');
  });

  it('opens on thanks when this phone already answered', () => {
    const answers = {
      ...EMPTY_ANSWERS,
      interested: false,
      notInterestedReason: 'NO_NEED' as const,
    };
    const memory: DeviceMemory = {
      deviceId: 'd',
      respondent: awa,
      saved: { camp_1: { token: 't', answers, savedAt: '2026-10-25T10:00:00Z' } },
    };
    expect(
      initialPopupState({ deliveryEnabled: true, memory, campaignId: 'camp_1' }),
    ).toMatchObject({ step: 'thanks', answers, remembered: awa });
    expect(initialPopupState({ deliveryEnabled: true, memory, campaignId: 'camp_2' }).step).toBe(
      'interest',
    );
  });
});

describe('restore', () => {
  const memory: DeviceMemory = {
    deviceId: 'd',
    respondent: awa,
    saved: {
      camp_1: {
        token: 't',
        answers: { ...EMPTY_ANSWERS, interested: false },
        savedAt: '2026-10-25T10:00:00Z',
      },
    },
  };

  it('takes the memory read after the first render', () => {
    expect(popupReducer(fresh(), { type: 'restore', memory, campaignId: 'camp_1' })).toMatchObject({
      step: 'thanks',
      remembered: awa,
    });
  });

  it('never undoes a tap the respondent already made', () => {
    const tapped = popupReducer(fresh(), { type: 'interest', interested: true });
    expect(popupReducer(tapped, { type: 'restore', memory, campaignId: 'camp_1' })).toMatchObject({
      step: 'buyer',
      remembered: awa,
    });
  });
});

describe('answersBody', () => {
  it('sends every answer of a yes with the contact', () => {
    const thanks = run(fresh(), yesPath).at(-1)!;
    expect(answersBody(thanks.answers)).toEqual({
      interested: true,
      buyerType: 'RESELLER',
      quantity: 12,
      option: 'Rouge',
      timing: 'ON_ARRIVAL',
      wantsDelivery: true,
      zoneId: 'zone_1',
    });
  });

  it('sends the place of a delivery elsewhere', () => {
    expect(
      answersBody({
        ...EMPTY_ANSWERS,
        interested: true,
        wantsDelivery: true,
        zoneId: null,
        deliveryPlace: 'Lomé',
      }),
    ).toMatchObject({ wantsDelivery: true, zoneId: null, deliveryPlace: 'Lomé' });
  });

  it('sends a no with its reason only', () => {
    expect(
      answersBody({ ...EMPTY_ANSWERS, interested: false, notInterestedReason: 'NO_NEED' }),
    ).toEqual({ interested: false, notInterestedReason: 'NO_NEED' });
  });
});

describe('stepBody', () => {
  it("sends only the step's fields", () => {
    expect(stepBody({ type: 'quantity', quantity: 12, option: 'Rouge' })).toEqual({
      quantity: 12,
      option: 'Rouge',
    });
    expect(stepBody({ type: 'interest', interested: false })).toEqual({ interested: false });
    expect(stepBody({ type: 'reason', reason: null })).toEqual({ notInterestedReason: null });
    expect(stepBody({ type: 'delivery', wantsDelivery: false, zoneId: null })).toEqual({
      wantsDelivery: false,
      zoneId: null,
    });
    expect(
      stepBody({ type: 'delivery', wantsDelivery: true, zoneId: null, place: 'Lomé' }),
    ).toEqual({ wantsDelivery: true, zoneId: null, deliveryPlace: 'Lomé' });
    expect(stepBody({ type: 'back' })).toEqual({});
    expect(stepBody({ type: 'itsMe' })).toEqual({});
    // « En fait, ça m'intéresse » tells the server the answer turned to yes.
    expect(stepBody({ type: 'changeMind' })).toEqual({ interested: true });
  });
});

describe('changeMind (lot 7a)', () => {
  it('turns a finished no into a yes and goes on to the buyer question', () => {
    const no = popupReducer(
      { ...initialPopupState({ deliveryEnabled: true, memory: null, campaignId: 'c1' }) },
      { type: 'interest', interested: false },
    );
    const done = { ...no, step: 'thanks' as const };
    const next = popupReducer(done, { type: 'changeMind' });
    expect(next.step).toBe('buyer');
    expect(next.answers).toEqual({ ...EMPTY_ANSWERS, interested: true });
  });

  it('does nothing outside the end of a no', () => {
    const yes = {
      ...initialPopupState({ deliveryEnabled: true, memory: null, campaignId: 'c1' }),
      step: 'thanks' as const,
      answers: { ...EMPTY_ANSWERS, interested: true },
    };
    expect(popupReducer(yes, { type: 'changeMind' })).toBe(yes);
  });
});

describe('progressIndex', () => {
  it('maps the steps on the five dots of spec §5.3', () => {
    expect(
      (['interest', 'reason', 'buyer', 'quantity', 'timing', 'delivery', 'contact'] as const).map(
        progressIndex,
      ),
    ).toEqual([0, 1, 1, 2, 3, 3, 4]);
  });
});

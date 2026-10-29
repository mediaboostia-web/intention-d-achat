'use client';

// The popup (spec §5.3): the product on top, a sheet rising from the bottom,
// one tap per step. PopupView only draws a state, so every screen renders in
// tests; PopupSheet holds the state, the phone's memory and the calls.
import { useEffect, useReducer, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { ChoiceButton } from '@/components/ui/ChoiceButton';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/ui/Logo';
import { Picto } from '@/components/ui/Picto';
import { PhoneInput } from '@/components/ui/PhoneInput';
import type { PublicCampaign } from '@/lib/server/tamani/public-campaign';
import { POPUP_PHOTO, cloudinaryVariant, THUMB } from '@/lib/tamani/cloudinary-url';
import {
  loadDeviceMemory,
  safeStorage,
  saveDeviceMemory,
  type DeviceMemory,
} from '@/lib/tamani/device-memory';
import {
  BUYER_TYPES,
  BUYER_TYPE_POPUP_LABELS,
  NOT_INTERESTED_REASONS,
  NOT_INTERESTED_REASON_LABELS,
  QUANTITY_PRESETS,
} from '@/lib/tamani/labels';
import {
  answersBody,
  initialPopupState,
  popupReducer,
  progressIndex,
  stepBody,
  type PopupAction,
  type PopupAnswers,
  type PopupState,
  type ResponseStepBody,
} from '@/lib/tamani/popup-machine';
import { leavePage } from '@/lib/tamani/leave-page';
import {
  ANSWERS_CLOSED_TITLE,
  answersClosedLine,
  poweredByHref,
  stockLine,
  thanksCopy,
} from '@/lib/tamani/popup-copy';
import { formatMoney } from '@/lib/tamani/currency';
import { TIMING_LABELS } from '@/lib/tamani/timing';
import { phoneCountryChoices } from '@/lib/tamani/phone-countries';
import { pluralizeUnit } from '@/lib/tamani/verdict-display';
import { cn } from '@/lib/utils';
import { PhotoGallery } from './photo-gallery';
import { popupErrorMessage, postStep, postView } from './popup-client';
import { ThanksDialog } from './thanks-dialog';

const MIN_COUNTER = 3;

type Contact = { firstName: string; phone: string; phoneCountry?: string };

export interface PopupViewProps {
  campaign: PublicCampaign;
  state: PopupState;
  busy?: boolean;
  error?: string | null;
  interestedCount?: number | null;
  onAction?: (action: PopupAction) => void;
  onContact?: (contact: Contact) => void;
  onLeave?: () => void;
  /** The browser kept the page open after « Fermer ». */
  left?: boolean;
  /** The app's address (APP_URL), where « Propulsé par Tamani » leads. */
  homeUrl?: string;
}

function Question({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-5 mb-3.5 font-hand text-[34px] leading-none font-bold text-primary">
      {children}
    </h2>
  );
}

function ShopChip({ shop }: { shop: PublicCampaign['shop'] }) {
  const initials = shop.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <span className="mt-5 ml-4 inline-flex max-w-[calc(100%-2rem)] items-center gap-2 self-start rounded-full bg-surface/95 py-1 pr-3.5 pl-1 text-sm font-bold text-ink">
      {shop.logoUrl ? (
        <img
          src={cloudinaryVariant(shop.logoUrl, THUMB)}
          alt=""
          className="size-7 rounded-full object-cover"
        />
      ) : (
        <span className="grid size-7 place-items-center rounded-full bg-primary font-sign text-xs text-primary-ink">
          {initials}
        </span>
      )}
      <span className="truncate">{shop.name}</span>
    </span>
  );
}

function ProductHeader({ c, count }: { c: PublicCampaign; count: number | null }) {
  const { product } = c;
  return (
    <>
      <p className="text-lg leading-tight font-bold">{product.name}</p>
      <p className="mt-0.5 font-sign text-2xl leading-tight">
        {formatMoney(product.unitPrice, c.shop.currency)}{' '}
        <span className="font-sans text-sm text-ink-muted">pour 1 {product.unitLabel}</span>
      </p>
      <p className="mt-3 flex items-center gap-2 font-bold text-ink">
        <Picto name={c.availability === 'IN_STOCK' ? 'stall' : 'calendar'} />
        <span>{c.availabilityText}</span>
      </p>
      {c.stockQuantity !== null && (
        <p className="mt-1.5 flex items-center gap-2 font-bold text-ink">
          <Picto name="cartons" />
          <span>{stockLine(c.stockQuantity, product.unitLabel)}</span>
        </p>
      )}
      {count !== null && count >= MIN_COUNTER && (
        <p className="mt-2 text-ink-soft">
          <b className="text-ink">{count} personnes</b> sont déjà intéressées.
        </p>
      )}
    </>
  );
}

function QuantityStep({ c, answers, onAction }: StepProps) {
  const { product } = c;
  const buyerType = answers.buyerType ?? 'CONSUMER';
  const [option, setOption] = useState<string | null>(answers.option);
  const [custom, setCustom] = useState(false);
  const [typed, setTyped] = useState('');
  const needsOption = product.options.length > 0 && option === null;
  const choose = (quantity: number) => onAction({ type: 'quantity', quantity, option });
  const typedQty = Number(typed);
  return (
    <>
      <Question>Combien ?</Question>
      {buyerType === 'RESELLER' &&
        product.wholesalePrice !== null &&
        product.wholesaleMinQty !== null && (
          <p className="-mt-1 mb-3 font-bold text-ink-soft">
            Prix de gros : {formatMoney(product.wholesalePrice, c.shop.currency)} dès{' '}
            {product.wholesaleMinQty}
          </p>
        )}
      {product.options.length > 0 && (
        <div className="mb-3">
          <p className="mb-2 text-sm font-bold text-ink-soft">{product.optionLabel ?? 'Choix'}</p>
          <div className="flex flex-wrap gap-2">
            {product.options.map((o) => (
              <ChoiceButton
                key={o}
                selected={option === o}
                onClick={() => setOption(o)}
                className="min-h-12 w-auto px-4 text-base"
              >
                {o}
              </ChoiceButton>
            ))}
          </div>
          {needsOption && (
            <p className="mt-2 text-sm text-ink-muted">
              Choisis d&apos;abord : {(product.optionLabel ?? 'ton choix').toLowerCase()}
            </p>
          )}
        </div>
      )}
      {custom ? (
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (Number.isInteger(typedQty) && typedQty > 0) choose(typedQty);
          }}
        >
          <Input
            id="popup-qty"
            label="Quantité"
            type="number"
            inputMode="numeric"
            min={1}
            max={100000}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="flex-1"
            autoFocus
          />
          <Button type="submit" disabled={needsOption || !(typedQty > 0)}>
            Valider
          </Button>
        </form>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {QUANTITY_PRESETS[buyerType].map((n) => (
            <ChoiceButton
              key={n}
              selected={answers.quantity === n}
              disabled={needsOption}
              onClick={() => choose(n)}
            >
              {n}
            </ChoiceButton>
          ))}
          <ChoiceButton
            disabled={needsOption}
            onClick={() => setCustom(true)}
            aria-label="Autre quantité"
          >
            +
          </ChoiceButton>
        </div>
      )}
    </>
  );
}

function PlaceField({ answers, onAction }: Pick<StepProps, 'answers' | 'onAction'>) {
  const [place, setPlace] = useState(answers.deliveryPlace ?? '');
  const ok = place.trim().length >= 2;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (ok) onAction({ type: 'delivery', wantsDelivery: true, zoneId: null, place: place.trim() });
  };
  return (
    <form onSubmit={submit}>
      <Question>Où te livrer ?</Question>
      <Input
        id="popup-place"
        label="Où ? (quartier, ville ou pays)"
        maxLength={80}
        required
        value={place}
        onChange={(e) => setPlace(e.target.value)}
      />
      <Button type="submit" size="lg" className="mt-4 w-full" disabled={!ok}>
        Continuer
      </Button>
    </form>
  );
}

function DeliveryStep({ c, answers, onAction }: StepProps) {
  // Coming back to this step shows the choice made before.
  const [mode, setMode] = useState<'ask' | 'zones' | 'place'>(() =>
    answers.wantsDelivery !== true
      ? 'ask'
      : c.zones.length === 0 || (answers.zoneId === null && answers.deliveryPlace)
        ? 'place'
        : 'zones',
  );
  if (mode === 'place') return <PlaceField answers={answers} onAction={onAction} />;
  if (mode === 'zones') {
    return (
      <>
        <Question>Dans quel quartier ?</Question>
        <div className="grid gap-3">
          {c.zones.map((z) => (
            <ChoiceButton
              key={z.id}
              selected={answers.zoneId === z.id}
              onClick={() => onAction({ type: 'delivery', wantsDelivery: true, zoneId: z.id })}
            >
              {z.name}
            </ChoiceButton>
          ))}
          <ChoiceButton
            selected={answers.wantsDelivery === true && answers.deliveryPlace !== null}
            onClick={() => setMode('place')}
          >
            Autre endroit
          </ChoiceButton>
        </div>
      </>
    );
  }
  return (
    <>
      <Question>Livraison ?</Question>
      <div className="grid gap-3">
        <ChoiceButton
          selected={answers.wantsDelivery === true}
          onClick={() => setMode(c.zones.length > 0 ? 'zones' : 'place')}
        >
          Oui, livre-moi
        </ChoiceButton>
        <ChoiceButton
          selected={answers.wantsDelivery === false}
          onClick={() => onAction({ type: 'delivery', wantsDelivery: false, zoneId: null })}
        >
          Je passe récupérer
        </ChoiceButton>
      </div>
    </>
  );
}

function consent(shop: string): string {
  return `Ton numéro est partagé uniquement avec ${shop} pour te recontacter au sujet de ce produit.`;
}

function ContactStep({
  c,
  state,
  busy,
  onAction,
  onContact,
}: StepProps & { state: PopupState; busy: boolean; onContact: (contact: Contact) => void }) {
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState(c.shop.country);
  const [countries] = useState(() => phoneCountryChoices(c.shop.country));
  const title =
    state.answers.interested === false
      ? 'Pour être prévenu des prochains arrivages'
      : "Pour être prévenu à l'arrivée";
  const { remembered } = state;
  if (remembered) {
    return (
      <>
        <Question>{title}</Question>
        <p className="text-ink">
          Tu réponds en tant que <b>{remembered.firstName}</b> ·{' '}
          <span className="whitespace-nowrap">{remembered.phoneMasked}</span>{' '}
          <button
            type="button"
            onClick={() => onAction({ type: 'notMe' })}
            className="font-bold text-primary underline decoration-2 underline-offset-4"
          >
            pas toi ?
          </button>
        </p>
        <Button
          size="lg"
          className="mt-4 w-full"
          disabled={busy}
          onClick={() =>
            onContact({ firstName: remembered.firstName, phone: remembered.phoneE164 })
          }
        >
          Envoyer ma réponse
        </Button>
        <p className="mt-3 text-sm text-ink-muted">{consent(c.shop.name)}</p>
      </>
    );
  }
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (firstName.trim() && phone.trim()) {
      onContact({ firstName: firstName.trim(), phone, phoneCountry: country });
    }
  };
  return (
    <form onSubmit={submit}>
      <Question>{title}</Question>
      <div className="grid gap-3">
        <Input
          id="popup-first-name"
          label="Ton prénom"
          autoComplete="given-name"
          maxLength={40}
          required
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <PhoneInput
          id="popup-phone"
          label="Ton numéro WhatsApp"
          dialCode={c.shop.dialCode}
          countries={countries}
          country={country}
          onCountryChange={setCountry}
          hint={consent(c.shop.name)}
          maxLength={30}
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <Button type="submit" size="lg" className="mt-4 w-full" disabled={busy}>
        Envoyer ma réponse
      </Button>
      {state.forgotten && (
        <button
          type="button"
          onClick={() => onAction({ type: 'itsMe' })}
          className="mt-3 min-h-12 font-bold text-primary underline decoration-2 underline-offset-4"
        >
          C&apos;est bien moi, {state.forgotten.firstName}
        </button>
      )}
    </form>
  );
}

function recap(c: PublicCampaign, a: PopupAnswers): string[] {
  if (a.interested === false) {
    return [
      a.notInterestedReason
        ? `Pas intéressé : ${NOT_INTERESTED_REASON_LABELS[a.notInterestedReason].toLowerCase()}.`
        : 'Pas intéressé pour cette fois.',
    ];
  }
  const lines: string[] = [];
  if (a.quantity !== null) {
    const who = a.buyerType === 'RESELLER' ? 'pour revendre' : 'pour toi';
    const option = a.option ? ` (${a.option})` : '';
    lines.push(`${a.quantity} ${pluralizeUnit(c.product.unitLabel, a.quantity)}${option}, ${who}.`);
  }
  if (a.timing !== null) lines.push(`${TIMING_LABELS[a.timing]}.`);
  if (a.wantsDelivery === true) {
    const zone = c.zones.find((z) => z.id === a.zoneId)?.name;
    lines.push(zone ? `Livraison à ${zone}.` : 'Livraison.');
  }
  if (a.wantsDelivery === false) lines.push('Tu passes récupérer.');
  return lines;
}

interface StepProps {
  c: PublicCampaign;
  answers: PopupAnswers;
  onAction: (action: PopupAction) => void;
}

function StepContent({
  c,
  state,
  busy,
  onAction,
  onContact,
}: {
  c: PublicCampaign;
  state: PopupState;
  busy: boolean;
  onAction: (action: PopupAction) => void;
  onContact: (contact: Contact) => void;
}) {
  const a = state.answers;
  switch (state.step) {
    case 'interest':
      return (
        <>
          <Question>Ça t&apos;intéresse ?</Question>
          <div className="grid grid-cols-2 gap-3">
            <ChoiceButton
              emphasis
              selected={a.interested === true}
              onClick={() => onAction({ type: 'interest', interested: true })}
            >
              Oui
            </ChoiceButton>
            <ChoiceButton
              selected={a.interested === false}
              onClick={() => onAction({ type: 'interest', interested: false })}
            >
              Non
            </ChoiceButton>
          </div>
          {c.shop.description && (
            <p className="mt-4 line-clamp-3 text-sm leading-snug text-ink-soft">
              {c.shop.description}
            </p>
          )}
        </>
      );
    case 'reason':
      return (
        <>
          <Question>Pourquoi pas ?</Question>
          <div className="grid grid-cols-2 gap-3">
            {NOT_INTERESTED_REASONS.map((r) => (
              <ChoiceButton
                key={r}
                selected={a.notInterestedReason === r}
                onClick={() => onAction({ type: 'reason', reason: r })}
                className="text-lg"
              >
                {NOT_INTERESTED_REASON_LABELS[r]}
              </ChoiceButton>
            ))}
          </div>
          <Button
            variant="ghost"
            className="mt-3 w-full"
            onClick={() => onAction({ type: 'reason', reason: null })}
          >
            Passer
          </Button>
        </>
      );
    case 'buyer':
      return (
        <>
          <Question>Tu achètes pour…</Question>
          <div className="grid grid-cols-2 gap-3">
            {BUYER_TYPES.map((b) => (
              <ChoiceButton
                key={b}
                selected={a.buyerType === b}
                onClick={() => onAction({ type: 'buyer', buyerType: b })}
              >
                {BUYER_TYPE_POPUP_LABELS[b]}
              </ChoiceButton>
            ))}
          </div>
        </>
      );
    case 'quantity':
      return <QuantityStep c={c} answers={a} onAction={onAction} />;
    case 'timing':
      return (
        <>
          <Question>Quand ?</Question>
          <div className="grid gap-3">
            {c.timingOptions.map((t) => (
              <ChoiceButton
                key={t}
                selected={a.timing === t}
                onClick={() => onAction({ type: 'timing', timing: t })}
              >
                {TIMING_LABELS[t]}
              </ChoiceButton>
            ))}
          </div>
        </>
      );
    case 'delivery':
      return <DeliveryStep c={c} answers={a} onAction={onAction} />;
    case 'contact':
      return (
        <ContactStep
          c={c}
          answers={a}
          state={state}
          busy={busy}
          onAction={onAction}
          onContact={onContact}
        />
      );
    case 'thanks':
      // The end dialog (ThanksDialog) speaks; behind it, a summary of the answer.
      return (
        <ul className="mt-4 grid gap-1 text-ink-soft">
          {recap(c, a).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      );
  }
}

export function PopupView({
  campaign: c,
  state,
  busy = false,
  error = null,
  interestedCount = c.interestedCount,
  onAction = () => {},
  onContact = () => {},
  onLeave = () => {},
  left = false,
  homeUrl = '',
}: PopupViewProps) {
  const photo = c.product.photos[0] ? cloudinaryVariant(c.product.photos[0], POPUP_PHOTO) : null;
  const hasPhotos = c.product.photos.length > 0;
  // A person who already started keeps their answer; nobody starts a new one.
  const closedForMonth = c.answersClosed && state.step === 'interest';
  const canGoBack = c.accepting && state.step !== 'interest' && state.step !== 'thanks';
  const done = c.accepting && state.step === 'thanks';
  const poweredBy = c.poweredByBadge && (
    <a
      href={poweredByHref(homeUrl, c.shop.slug)}
      target="_blank"
      rel="noopener"
      className="mt-4 flex min-h-11 items-center justify-center gap-1.5 text-xs text-ink-muted"
    >
      <Logo variant="mark" size={16} />
      <span>
        Propulsé par{' '}
        <b className="text-ink underline decoration-accent decoration-2 underline-offset-2">
          Tamani
        </b>
      </span>
    </a>
  );
  return (
    <main className="relative flex h-dvh flex-col overflow-hidden bg-ink text-ink">
      {photo && (
        <img
          src={photo}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full scale-110 object-cover opacity-60 blur-2xl"
        />
      )}
      <div inert={done} className="relative mx-auto flex h-full w-full max-w-md flex-col">
        <ShopChip shop={c.shop} />
        {/* The photos keep their height; the sheet scrolls in the rest of the screen. */}
        <div className="flex flex-1 items-center py-3">
          {hasPhotos && (
            <PhotoGallery
              photos={c.product.photos}
              name={c.product.name}
              className="h-[38dvh] min-h-40 w-full lg:h-[44dvh]"
            />
          )}
        </div>
        <BottomSheet label="Ta réponse" className="shrink-0">
          <div
            className={cn(
              'overflow-y-auto overscroll-contain',
              hasPhotos
                ? 'max-h-[calc(62dvh-6.5rem)] lg:max-h-[calc(56dvh-6.5rem)]'
                : 'max-h-[calc(100dvh-6.5rem)]',
            )}
          >
            <ProductHeader c={c} count={interestedCount} />
            {!c.accepting ? (
              <>
                <Question>
                  {c.status === 'DRAFT'
                    ? "Cette campagne n'est pas encore ouverte."
                    : 'Cette campagne est terminée'}
                </Question>
                <p className="text-ink-soft">
                  Demande à <b className="text-ink">{c.shop.name}</b> ses prochains arrivages.
                </p>
              </>
            ) : closedForMonth ? (
              <>
                <Question>{ANSWERS_CLOSED_TITLE}</Question>
                <p className="text-ink-soft">{answersClosedLine(c.shop.name)}</p>
              </>
            ) : (
              <>
                {canGoBack && (
                  <button
                    type="button"
                    onClick={() => onAction({ type: 'back' })}
                    className="mt-3 -mb-2 text-sm font-bold text-primary underline decoration-2 underline-offset-4"
                  >
                    Retour
                  </button>
                )}
                <StepContent
                  c={c}
                  state={state}
                  busy={busy}
                  onAction={onAction}
                  onContact={onContact}
                />
                {error && (
                  <p role="alert" className="mt-3 font-bold text-danger">
                    {error}
                  </p>
                )}
                {state.step !== 'thanks' && (
                  <div className="mt-5 flex justify-center gap-1.5" aria-hidden="true">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className={`size-3.5 rounded-case border-2 border-ink ${i <= progressIndex(state.step) ? 'bg-accent' : 'bg-surface'}`}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
            {poweredBy}
          </div>
        </BottomSheet>
      </div>
      {done && (
        <ThanksDialog
          copy={thanksCopy({
            interested: state.answers.interested === true,
            firstName: state.remembered?.firstName ?? null,
            shopName: c.shop.name,
            productName: c.product.name,
            unitLabel: c.product.unitLabel,
            quantity: state.answers.quantity,
          })}
          interested={state.answers.interested === true}
          recap={recap(c, state.answers).slice(1)}
          left={left}
          footer={poweredBy}
          onClose={onLeave}
          onEdit={() => onAction({ type: 'edit' })}
          onChangeMind={() => onAction({ type: 'changeMind' })}
        />
      )}
    </main>
  );
}

export function PopupSheet({ campaign, homeUrl }: { campaign: PublicCampaign; homeUrl: string }) {
  const [state, dispatch] = useReducer(popupReducer, campaign, (c) =>
    initialPopupState({
      deliveryEnabled: c.deliveryEnabled,
      memory: null,
      campaignId: c.campaignId,
    }),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(campaign.interestedCount);
  const [left, setLeft] = useState(false);
  const storage = useRef<Storage | null>(null);
  const memory = useRef<DeviceMemory | null>(null);
  const token = useRef<string | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  function deviceMemory(): DeviceMemory {
    if (!memory.current) {
      storage.current = safeStorage();
      memory.current = loadDeviceMemory(storage.current);
      saveDeviceMemory(storage.current, memory.current);
    }
    return memory.current;
  }

  useEffect(() => {
    const m = deviceMemory();
    token.current = m.saved[campaign.campaignId]?.token ?? null;
    dispatch({ type: 'restore', memory: m, campaignId: campaign.campaignId });
    if (campaign.accepting) postView(campaign.code, m.deviceId);
    // Once per page: the campaign is fixed for the page's life.
  }, []);

  // Taps leave one after the other, each with the latest token.
  function send(body: ResponseStepBody) {
    const { deviceId } = deviceMemory();
    const run = queue.current.then(async () => {
      const reply = await postStep({ ...body, code: campaign.code, deviceId }, token.current);
      if (reply.ok) {
        token.current = reply.result.token;
        if (reply.result.interestedCount !== null) setCount(reply.result.interestedCount);
      }
      return reply;
    });
    queue.current = run.catch(() => null);
    return run;
  }

  function onAction(action: PopupAction) {
    setError(null);
    dispatch(action);
    const body = stepBody(action);
    // A lost step is resent with the contact, so errors wait for that one.
    if (Object.keys(body).length > 0) void send(body);
  }

  async function onContact(contact: Contact) {
    setBusy(true);
    setError(null);
    const reply = await send({ ...answersBody(state.answers), ...contact });
    setBusy(false);
    if (!reply.ok || !reply.result.respondent) {
      setError(popupErrorMessage(reply.ok ? null : reply.code));
      return;
    }
    const m = deviceMemory();
    const { respondent, token: saved } = reply.result;
    memory.current = {
      ...m,
      respondent,
      saved: {
        ...m.saved,
        [campaign.campaignId]: {
          token: saved,
          answers: state.answers,
          savedAt: new Date().toISOString(),
        },
      },
    };
    saveDeviceMemory(storage.current, memory.current);
    dispatch({ type: 'completed', respondent });
  }

  function onLeave() {
    const outcome = leavePage(window);
    if (outcome === 'stayed') setLeft(true);
    // Some in-app browsers ignore « back »: the page is still here, say so.
    if (outcome === 'back') window.setTimeout(() => setLeft(true), 800);
  }

  return (
    <PopupView
      campaign={campaign}
      state={state}
      busy={busy}
      error={error}
      interestedCount={count}
      onAction={onAction}
      onContact={onContact}
      onLeave={onLeave}
      left={left}
      homeUrl={homeUrl}
    />
  );
}

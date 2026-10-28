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
import { formatXof } from '@/lib/tamani/share-message';
import { TIMING_LABELS } from '@/lib/tamani/timing';
import { pluralizeUnit } from '@/lib/tamani/verdict-display';
import { cn } from '@/lib/utils';
import { PhotoGallery } from './photo-gallery';
import { popupErrorMessage, postStep, postView } from './popup-client';

const MIN_COUNTER = 3;

type Contact = { firstName: string; phone: string };

export interface PopupViewProps {
  campaign: PublicCampaign;
  state: PopupState;
  busy?: boolean;
  error?: string | null;
  interestedCount?: number | null;
  onAction?: (action: PopupAction) => void;
  onContact?: (contact: Contact) => void;
  onLeave?: () => void;
  /** The browser kept the page open after « Fermer la page ». */
  left?: boolean;
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
        {formatXof(product.unitPrice)}{' '}
        <span className="font-sans text-sm text-ink-muted">pour 1 {product.unitLabel}</span>
      </p>
      <p className="mt-3 text-ink-soft">
        {c.availabilityText}.
        {count !== null && count >= MIN_COUNTER && (
          <>
            {' '}
            <b className="text-ink">{count} personnes</b> sont déjà intéressées.
          </>
        )}
      </p>
      {c.stockQuantity !== null && (
        <p className="mt-1 font-bold text-warning">
          Plus que {c.stockQuantity} {pluralizeUnit(product.unitLabel, c.stockQuantity)}
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
            Prix de gros : {formatXof(product.wholesalePrice)} dès {product.wholesaleMinQty}
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

function DeliveryStep({ c, answers, onAction }: StepProps) {
  const [pickZone, setPickZone] = useState(false);
  if (pickZone) {
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
          onClick={() =>
            c.zones.length > 0
              ? setPickZone(true)
              : onAction({ type: 'delivery', wantsDelivery: true, zoneId: null })
          }
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
    if (firstName.trim() && phone.trim()) onContact({ firstName: firstName.trim(), phone });
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
  left,
  onAction,
  onContact,
  onLeave,
}: {
  c: PublicCampaign;
  state: PopupState;
  busy: boolean;
  left: boolean;
  onAction: (action: PopupAction) => void;
  onContact: (contact: Contact) => void;
  onLeave: () => void;
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
      return (
        <>
          <Question>
            {state.remembered ? `Merci ${state.remembered.firstName} !` : 'Merci !'}
          </Question>
          <p className="text-lg text-ink">
            <b>{c.shop.name}</b> te préviendra.
          </p>
          <ul className="mt-3 grid gap-1 text-ink-soft">
            {recap(c, a).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <Button
            variant="secondary"
            className="mt-5 w-full"
            onClick={() => onAction({ type: 'edit' })}
          >
            Modifier ma réponse
          </Button>
          {left ? (
            <p role="status" className="mt-3 text-center font-bold text-ink">
              C&apos;est noté. Tu peux fermer cette page.
            </p>
          ) : (
            <Button variant="ghost" className="mt-2 w-full" onClick={onLeave}>
              Fermer la page
            </Button>
          )}
        </>
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
}: PopupViewProps) {
  const photo = c.product.photos[0] ? cloudinaryVariant(c.product.photos[0], POPUP_PHOTO) : null;
  const hasPhotos = c.product.photos.length > 0;
  const canGoBack = c.accepting && state.step !== 'interest' && state.step !== 'thanks';
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
      <div className="relative mx-auto flex h-full w-full max-w-md flex-col">
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
                  left={left}
                  onAction={onAction}
                  onContact={onContact}
                  onLeave={onLeave}
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
            {c.poweredByBadge && (
              <a
                href={`/?ref=${encodeURIComponent(c.shop.slug)}`}
                className="mt-4 flex items-center justify-center gap-1.5 text-xs text-ink-muted"
              >
                <Logo variant="mark" size={16} />
                Propulsé par Tamani
              </a>
            )}
          </div>
        </BottomSheet>
      </div>
    </main>
  );
}

export function PopupSheet({ campaign }: { campaign: PublicCampaign }) {
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
    />
  );
}

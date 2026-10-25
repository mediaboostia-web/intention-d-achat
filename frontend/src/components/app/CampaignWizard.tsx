'use client';

// The campaign wizard (spec §5.2 step 4): one question per screen, the
// answers kept in wizardReducer. A refused launch (the free plan's limit,
// the network) keeps every answer and offers the draft instead.
import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Button,
  ChoiceButton,
  EmptyState,
  Icon,
  Input,
  Notice,
  Steps,
  Switch,
  Textarea,
} from '@/components/ui';
import { previewMessage } from '@/lib/tamani/campaign-view';
import {
  WIZARD_STEPS,
  canAdvance,
  isArrivalDay,
  todayIso,
  wizardAvailableAt,
  wizardReducer,
  type WizardState,
  type WizardStep,
  type WizardValues,
} from '@/lib/tamani/campaign-wizard';
import { addDays, formatDateFr } from '@/lib/tamani/dates';
import { parseCount } from '@/lib/tamani/fcfa-input';
import type { ShopProduct } from '@/lib/tamani/product-form';
import { formatAvailability, formatPriceLine } from '@/lib/tamani/share-message';
import { WhatsAppBubble } from './ShareCard';
import { cloudinaryVariant, THUMB } from '@/lib/tamani/cloudinary-url';

const QUESTIONS: Record<WizardStep, string> = {
  product: 'Quel produit proposes-tu ?',
  availability: 'Le produit est-il déjà là ?',
  quantities: 'Tes quantités',
  end: "Jusqu'à quand ta communauté peut répondre ?",
  delivery: 'Comment tes clients reçoivent le produit ?',
  message: 'Le message à partager',
};

const COUNT_HINT = 'Écris un nombre entier, par exemple 120.';
const countError = (raw: string, min: number) =>
  raw.trim() !== '' && parseCount(raw, min) === null ? COUNT_HINT : undefined;

function Pencil({ children }: { children: ReactNode }) {
  return <p className="mt-4 font-hand text-lg text-ink-muted">{children}</p>;
}

export function CampaignWizard({
  products,
  zonesCount,
  initial,
  onSubmit,
  now: fixedNow,
}: {
  products: readonly ShopProduct[];
  /** null while the zones load. */
  zonesCount: number | null;
  initial: WizardState;
  /** Sends the campaign; resolves to an error message, or null once sent. */
  onSubmit: (state: WizardState, status: 'DRAFT' | 'ACTIVE') => Promise<string | null>;
  now?: Date;
}) {
  const [s, dispatch] = useReducer(wizardReducer, initial);
  const [sending, setSending] = useState<'DRAFT' | 'ACTIVE' | null>(null);
  const top = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  const now = fixedNow ?? new Date();
  const step = WIZARD_STEPS[s.step] ?? 'product';
  const last = s.step === WIZARD_STEPS.length - 1;
  const product = products.find((p) => p.id === s.productId) ?? null;
  const ready = WIZARD_STEPS.every((_, i) => canAdvance({ ...s, step: i }, now));

  // A new question starts at the top of the screen, and screen readers read it.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    top.current?.scrollIntoView({ block: 'start' });
    top.current?.focus({ preventScroll: true });
  }, [s.step]);

  function set<K extends keyof WizardValues>(field: K, value: WizardValues[K]) {
    dispatch({ type: 'set', field, value } as Parameters<typeof dispatch>[0]);
  }

  async function send(status: 'DRAFT' | 'ACTIVE') {
    if (s.submitting) return;
    setSending(status);
    dispatch({ type: 'submit' });
    const error = await onSubmit(s, status);
    if (error) {
      dispatch({ type: 'failed', error });
      setSending(null);
    }
  }

  const bodies: Record<WizardStep, ReactNode> = {
    product:
      products.length === 0 ? (
        <EmptyState
          title="Ajoute d'abord un produit"
          action={<Button href="/app/produits/nouveau">Ajouter un produit</Button>}
        >
          Une campagne présente un produit à ta communauté.
        </EmptyState>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {products.map((p) => (
              <li key={p.id}>
                <ChoiceButton
                  selected={s.productId === p.id}
                  onClick={() => set('productId', p.id)}
                  className="min-h-20 justify-start gap-3 px-3 py-2 text-left text-base"
                >
                  {p.photos[0] ? (
                    <img
                      src={cloudinaryVariant(p.photos[0], THUMB)}
                      alt=""
                      className="frame size-14 shrink-0 rounded-control bg-bg object-cover"
                    />
                  ) : (
                    <span className="flex size-14 shrink-0 items-center justify-center rounded-control bg-bg text-ink-muted">
                      <Icon name="box" />
                    </span>
                  )}
                  <span className="flex min-w-0 flex-col">
                    <span className="break-words">{p.name}</span>
                    <span className="text-sm font-normal">{formatPriceLine(p)}</span>
                  </span>
                </ChoiceButton>
              </li>
            ))}
          </ul>
          <Link
            href="/app/produits/nouveau"
            className="mt-4 inline-flex min-h-12 items-center gap-2 font-bold text-primary underline decoration-2 underline-offset-4"
          >
            <Icon name="plus" className="size-5" />
            Ajouter un produit
          </Link>
        </>
      ),

    availability: (
      <>
        <div className="grid gap-3 sm:grid-cols-2">
          <ChoiceButton
            selected={s.availability === 'IN_STOCK'}
            onClick={() => set('availability', 'IN_STOCK')}
          >
            Déjà disponible
          </ChoiceButton>
          <ChoiceButton
            selected={s.availability === 'INCOMING'}
            onClick={() => set('availability', 'INCOMING')}
          >
            Arrive bientôt
          </ChoiceButton>
        </div>
        {s.availability === 'INCOMING' && (
          <Input
            id="wizard-arrival"
            type="date"
            label="Date d'arrivée"
            className="mt-6"
            min={todayIso(now)}
            value={s.availableOn}
            error={
              s.availableOn !== '' && !isArrivalDay(s.availableOn, now)
                ? "Choisis une date à partir d'aujourd'hui."
                : undefined
            }
            onChange={(e) => set('availableOn', e.target.value)}
          />
        )}
        <Pencil>
          Sur WhatsApp :{' '}
          {formatAvailability(
            { availability: s.availability, availableAt: wizardAvailableAt(s) },
            now,
          )}
        </Pencil>
      </>
    ),

    quantities: (
      <div className="flex flex-col gap-6">
        <Input
          id="wizard-stock"
          label="Combien en as-tu ? (facultatif)"
          inputMode="numeric"
          placeholder="0"
          value={s.stockQuantity}
          error={countError(s.stockQuantity, 0)}
          onChange={(e) => set('stockQuantity', e.target.value)}
        />
        <Switch
          id="wizard-show-stock"
          label="Montrer le stock à tes clients"
          hint="Ils voient combien il en reste."
          checked={s.showStock && s.stockQuantity.trim() !== ''}
          disabled={s.stockQuantity.trim() === ''}
          onChange={(on) => set('showStock', on)}
        />
        <Input
          id="wizard-planned"
          label="Combien prévois-tu de commander ? (facultatif)"
          hint="Tamani te dira si c'est trop."
          inputMode="numeric"
          placeholder="400"
          value={s.plannedQuantity}
          error={countError(s.plannedQuantity, 1)}
          onChange={(e) => set('plannedQuantity', e.target.value)}
        />
      </div>
    ),

    end: (
      <>
        <div className="grid gap-3 sm:grid-cols-2">
          {[7, 14, 30].map((d) => (
            <ChoiceButton
              key={d}
              selected={s.endsInDays === d}
              onClick={() => set('endsInDays', d)}
            >
              Dans {d} jours
            </ChoiceButton>
          ))}
          <ChoiceButton selected={s.endsInDays === null} onClick={() => set('endsInDays', null)}>
            Pas de date de fin
          </ChoiceButton>
        </div>
        <Pencil>
          {s.endsInDays === null
            ? 'Tu la termineras toi-même.'
            : `Les réponses s'arrêtent le ${formatDateFr(addDays(now, s.endsInDays), now)}.`}
        </Pencil>
      </>
    ),

    delivery: (
      <>
        <div className="grid gap-3 sm:grid-cols-2">
          <ChoiceButton selected={s.deliveryEnabled} onClick={() => set('deliveryEnabled', true)}>
            Je livre
          </ChoiceButton>
          <ChoiceButton selected={!s.deliveryEnabled} onClick={() => set('deliveryEnabled', false)}>
            Ils viennent récupérer
          </ChoiceButton>
        </div>
        <Pencil>
          {s.deliveryEnabled
            ? 'Tes clients choisissent leur quartier en répondant.'
            : 'Tes clients viennent chercher leur commande.'}
        </Pencil>
        {s.deliveryEnabled && zonesCount === 0 && (
          <Notice tone="warning" className="mt-4">
            Tu n&apos;as pas encore de zone de livraison. Ajoute tes quartiers dans Réglages juste
            après le lancement : tes clients choisiront le leur.
          </Notice>
        )}
      </>
    ),

    message: (
      <div className="flex flex-col gap-6">
        <Textarea
          id="wizard-message"
          label="Ton message"
          hint="{produit}, {prix}, {disponibilite} et {lien} sont remplacés par ceux de ta campagne."
          rows={4}
          maxLength={1000}
          value={s.shareTemplate}
          error={s.shareTemplate.trim() === '' ? 'Écris le message à partager.' : undefined}
          onChange={(e) => set('shareTemplate', e.target.value)}
        />
        <div>
          <p className="font-hand text-lg text-ink-muted">Aperçu</p>
          <WhatsAppBubble
            className="mt-2"
            text={
              product
                ? previewMessage(
                    s.shareTemplate,
                    product,
                    { availability: s.availability, availableAt: wizardAvailableAt(s) },
                    now,
                  )
                : s.shareTemplate
            }
          />
        </div>
        <Switch
          id="wizard-counter"
          label="Afficher le nombre d'intéressés"
          hint="Tes clients voient combien de personnes ont déjà dit oui."
          checked={s.showLiveCounter}
          onChange={(on) => set('showLiveCounter', on)}
        />
      </div>
    ),
  };

  return (
    <div>
      <div ref={top} tabIndex={-1} className="scroll-mt-6 outline-none">
        <Steps current={s.step + 1} total={WIZARD_STEPS.length} title={QUESTIONS[step]} />
      </div>
      <div className="mt-6">{bodies[step]}</div>

      {s.error && (
        <Notice tone="danger" className="mt-8">
          {s.error}
        </Notice>
      )}

      {/* On a phone the main button comes first, full width, under the thumb. */}
      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        {s.step > 0 ? (
          <Button
            variant="ghost"
            className="self-start"
            disabled={s.submitting}
            onClick={() => dispatch({ type: 'back' })}
          >
            Retour
          </Button>
        ) : (
          <span className="hidden sm:block" />
        )}
        {last ? (
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={!ready || s.submitting}
              onClick={() => void send('DRAFT')}
            >
              {sending === 'DRAFT' ? 'Enregistrement…' : 'Enregistrer en brouillon'}
            </Button>
            <Button
              className="w-full shadow-press sm:w-auto"
              disabled={!ready || s.submitting}
              onClick={() => void send('ACTIVE')}
            >
              {sending === 'ACTIVE' ? 'Lancement…' : 'Lancer la campagne'}
            </Button>
          </div>
        ) : (
          <Button
            className="w-full shadow-press sm:w-auto"
            disabled={!canAdvance(s, now)}
            onClick={() => dispatch({ type: 'next' })}
          >
            Continuer
          </Button>
        )}
      </div>
    </div>
  );
}

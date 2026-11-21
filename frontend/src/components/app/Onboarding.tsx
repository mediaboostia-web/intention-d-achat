'use client';

// The onboarding (porteur, 2026-11-04; made « simple et facile » 2026-11-21):
// one question a screen, big picture cards, one tap moves on; then the shop
// with only its name, country and number, the logo and zones folded as
// optional. The country is guessed from the phone's time zone. Every step
// stays mounted, so going back keeps what was typed; the hidden ones are out
// of the page and of the reading order, and the focus follows the step.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Button, Icon, Steps } from '@/components/ui';
import type { IconName } from '@/components/ui/icons';
import { guessShopCountry } from '@/lib/tamani/countries';
import {
  BUSINESS_TYPE_OPTIONS,
  SALES_CHANNEL_OPTIONS,
  type BusinessType,
  type SalesChannel,
} from '@/lib/tamani/shop-profile';
import { ShopForm, emptyShopForm, type ShopFormErrors, type ShopFormValues } from './ShopForm';

export interface Activity {
  businessType: BusinessType | null;
  salesChannel: SalesChannel | null;
}

const BUSINESS_ICONS: Record<BusinessType, IconName> = {
  WHOLESALER: 'box',
  IMPORTER: 'truck',
  BOTH: 'grid',
  RETAILER: 'tag',
  OTHER: 'more',
};

const CHANNEL_ICONS: Record<SalesChannel, IconName> = {
  ONLINE: 'megaphone',
  STORE: 'home',
  BOTH: 'grid',
};

/** One question as big cards: a picture and a word, the picked one filled. */
export function ChoiceStep<T extends string>({
  legend,
  options,
  icons,
  value,
  onPick,
}: {
  legend: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  icons: Record<T, IconName>;
  value: T | null;
  onPick: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-2xl font-bold text-ink">{legend}</legend>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {options.map((o) => {
          const picked = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={picked}
              onClick={() => onPick(o.value)}
              className={`frame flex min-h-28 flex-col items-center justify-center gap-2 rounded-card p-3 text-center text-lg font-bold transition-transform active:translate-y-px motion-reduce:transition-none ${
                picked ? 'bg-primary text-primary-ink shadow-press' : 'bg-surface text-ink'
              }`}
            >
              <Icon name={icons[o.value]} className="size-9" />
              <span>{o.label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

const noSubscription = () => () => {};
/** The phone's time zone once the page runs in the browser; undefined on the server. */
function useTimeZone(): string | undefined {
  return useSyncExternalStore(
    noSubscription,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => undefined,
  );
}

const TITLES = {
  1: 'Parle-nous de toi',
  2: 'Parle-nous de tes ventes',
  3: 'Ta boutique',
} as const;

const LINES = {
  1: 'Touche ce qui te ressemble le plus.',
  2: 'Touche ce qui te ressemble le plus.',
  3: 'Ton nom et ton numéro apparaissent sur chaque campagne que tu partages.',
} as const;

export function WelcomeFlow({
  submitting,
  error,
  errors,
  onSubmit,
}: {
  submitting: boolean;
  error: string | null;
  errors: ShopFormErrors;
  onSubmit: (shop: ShopFormValues, activity: Activity) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [activity, setActivity] = useState<Activity>({ businessType: null, salesChannel: null });
  const country = guessShopCountry(useTimeZone());
  const heading = useRef<HTMLDivElement>(null);
  const moved = useRef(false);

  // A screen reader follows the step: focus goes to its title, not on the first load.
  useEffect(() => {
    if (moved.current) heading.current?.focus();
    moved.current = true;
  }, [step]);

  return (
    <>
      <div ref={heading} tabIndex={-1} className="outline-none">
        <Steps current={step} total={3} title={TITLES[step]} />
        <p className="mt-1 text-ink-soft">{LINES[step]}</p>
      </div>
      <div data-step="1" hidden={step !== 1} className="mt-6">
        <ChoiceStep
          legend="Tu es…"
          options={BUSINESS_TYPE_OPTIONS}
          icons={BUSINESS_ICONS}
          value={activity.businessType}
          onPick={(businessType) => {
            setActivity((a) => ({ ...a, businessType }));
            setStep(2);
          }}
        />
      </div>
      <div data-step="2" hidden={step !== 2} className="mt-6">
        <ChoiceStep
          legend="Où vends-tu ?"
          options={SALES_CHANNEL_OPTIONS}
          icons={CHANNEL_ICONS}
          value={activity.salesChannel}
          onPick={(salesChannel) => {
            setActivity((a) => ({ ...a, salesChannel }));
            setStep(3);
          }}
        />
        <Button variant="ghost" className="mt-4" onClick={() => setStep(1)}>
          Retour
        </Button>
      </div>
      <div data-step="3" hidden={step !== 3} className="mt-6">
        <ShopForm
          // A new guess (the browser's zone, read after the first paint) starts the form again;
          // it lands while step 1 shows, before anything is typed here.
          key={country}
          initial={{ ...emptyShopForm, country }}
          foldExtras
          submitLabel="Créer ma boutique"
          submittingLabel="Création…"
          submitting={submitting}
          error={error}
          errors={errors}
          onSubmit={(v) => onSubmit(v, activity)}
        />
        <Button variant="ghost" className="mt-4" disabled={submitting} onClick={() => setStep(2)}>
          Retour
        </Button>
      </div>
    </>
  );
}

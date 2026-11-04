'use client';

// The onboarding (porteur, 2026-11-04): what the shop is and where it sells,
// then the shop form. Both steps stay mounted, so going back keeps what was
// typed; the hidden one is out of the page and of the reading order.
import { useEffect, useRef, useState } from 'react';
import { Button, ChoiceButton, Steps } from '@/components/ui';
import {
  BUSINESS_TYPE_OPTIONS,
  SALES_CHANNEL_OPTIONS,
  type BusinessType,
  type SalesChannel,
} from '@/lib/tamani/shop-profile';
import { ShopForm, type ShopFormErrors, type ShopFormValues } from './ShopForm';

export interface Activity {
  businessType: BusinessType | null;
  salesChannel: SalesChannel | null;
}

function Choices<T extends string>({
  legend,
  options,
  value,
  onPick,
}: {
  legend: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T | null;
  onPick: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-lg font-bold text-ink">{legend}</legend>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {options.map((o) => (
          <ChoiceButton
            key={o.value}
            selected={value === o.value}
            onClick={() => onPick(o.value)}
            className="min-h-14 text-lg"
          >
            {o.label}
          </ChoiceButton>
        ))}
      </div>
    </fieldset>
  );
}

/** Step 1: two questions, one tap each; « Continuer » once both are answered. */
export function ActivityStep({
  value,
  onChange,
  onNext,
}: {
  value: Activity;
  onChange: (next: Activity) => void;
  onNext: () => void;
}) {
  const ready = value.businessType !== null && value.salesChannel !== null;
  return (
    <div className="flex flex-col gap-8">
      <Choices
        legend="Tu es"
        options={BUSINESS_TYPE_OPTIONS}
        value={value.businessType}
        onPick={(businessType) => onChange({ ...value, businessType })}
      />
      <Choices
        legend="Où tu vends"
        options={SALES_CHANNEL_OPTIONS}
        value={value.salesChannel}
        onPick={(salesChannel) => onChange({ ...value, salesChannel })}
      />
      <Button size="lg" className="w-full shadow-press" disabled={!ready} onClick={onNext}>
        Continuer
      </Button>
    </div>
  );
}

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
  const [step, setStep] = useState<1 | 2>(1);
  const [activity, setActivity] = useState<Activity>({ businessType: null, salesChannel: null });
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
        <Steps
          current={step}
          total={2}
          title={step === 1 ? 'Parle-nous de ton activité' : 'Ta boutique'}
        />
        <p className="mt-1 text-ink-soft">
          {step === 1
            ? 'Deux questions, puis ta boutique.'
            : 'Ton nom et ton numéro apparaissent sur chaque campagne que tu partages.'}
        </p>
      </div>
      <div data-step="1" hidden={step !== 1} className="mt-8">
        <ActivityStep value={activity} onChange={setActivity} onNext={() => setStep(2)} />
      </div>
      <div data-step="2" hidden={step !== 2} className="mt-8">
        <ShopForm
          submitLabel="Créer ma boutique"
          submittingLabel="Création…"
          submitting={submitting}
          error={error}
          errors={errors}
          onSubmit={(v) => onSubmit(v, activity)}
        />
        <Button variant="ghost" className="mt-4" disabled={submitting} onClick={() => setStep(1)}>
          Retour
        </Button>
      </div>
    </>
  );
}

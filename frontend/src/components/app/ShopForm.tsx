'use client';

// The shop's identity: name, country, WhatsApp number, logo and, at
// creation, the delivery zones. The page sends the values and gives back
// the server's answer (error notice or field errors).
import { useState, type FormEvent } from 'react';
import { Button, Input, Notice, PhoneInput, Select, Textarea } from '@/components/ui';
import { dialCodeFor, SHOP_COUNTRIES } from '@/lib/tamani/countries';
import { PhotoPicker } from './PhotoPicker';
import { ZonesInput } from './ZonesInput';

export interface ShopFormValues {
  name: string;
  country: string;
  whatsappPhone: string;
  logoUrl: string | null;
  /** Edit mode only: what the popup shows of the shop. */
  description: string;
  zones: string[];
}

export type ShopFormErrors = Partial<Record<'name' | 'whatsappPhone', string>>;

export const emptyShopForm: ShopFormValues = {
  name: '',
  country: 'SN',
  whatsappPhone: '',
  logoUrl: null,
  description: '',
  zones: [],
};

export const SHOP_DESCRIPTION_MAX = 300;

const COUNTRY_OPTIONS = SHOP_COUNTRIES.map((c) => ({
  value: c.code,
  label: `${c.label} (${c.dialCode})`,
}));

export function shopFormErrors(v: ShopFormValues): ShopFormErrors {
  const errors: ShopFormErrors = {};
  const name = v.name.trim();
  if (!name) errors.name = 'Donne un nom à ta boutique.';
  else if (name.length > 60) errors.name = '60 caractères au plus.';
  if (!v.whatsappPhone.trim()) errors.whatsappPhone = 'Écris ton numéro WhatsApp.';
  return errors;
}

export function ShopForm({
  initial = emptyShopForm,
  withZones = true,
  mode = 'create',
  submitLabel,
  submittingLabel,
  submitting,
  error,
  errors: serverErrors,
  onSubmit,
  formId,
  hideSubmit = false,
  countryLocked = false,
}: {
  initial?: ShopFormValues;
  withZones?: boolean;
  /** create: the welcome page's main gesture; edit: one save among the settings. */
  mode?: 'create' | 'edit';
  submitLabel: string;
  submittingLabel: string;
  submitting: boolean;
  error?: string | null | undefined;
  errors?: ShopFormErrors | undefined;
  onSubmit: (values: ShopFormValues) => void;
  /** Lets a button outside the form submit it (`form={formId}`). */
  formId?: string;
  /** The submit button lives elsewhere, e.g. in a section header. */
  hideSubmit?: boolean;
  /** A product exists: the country, and so the currency, stay (lot 7b). */
  countryLocked?: boolean;
}) {
  const [values, setValues] = useState(initial);
  const [localErrors, setLocalErrors] = useState<ShopFormErrors>({});
  const errors = { ...serverErrors, ...localErrors };
  const set = <K extends keyof ShopFormValues>(field: K, value: ShopFormValues[K]) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (field === 'name' || field === 'whatsappPhone') {
      const fixed = field as keyof ShopFormErrors;
      setLocalErrors((current) => {
        const next = { ...current };
        delete next[fixed];
        return next;
      });
    }
  };

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const found = shopFormErrors(values);
    setLocalErrors(found);
    if (Object.keys(found).length === 0) {
      onSubmit({ ...values, name: values.name.trim(), whatsappPhone: values.whatsappPhone.trim() });
    }
  }

  return (
    <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-6">
      <Input
        id="shop-name"
        label="Nom de ta boutique"
        placeholder="Diallo Import"
        autoComplete="organization"
        maxLength={60}
        value={values.name}
        error={errors.name}
        onChange={(e) => set('name', e.target.value)}
      />
      <Select
        id="shop-country"
        label="Pays"
        options={COUNTRY_OPTIONS}
        value={values.country}
        disabled={countryLocked}
        hint={countryLocked ? 'Le pays ne change plus une fois un produit ajouté.' : undefined}
        onChange={(e) => set('country', e.target.value)}
      />
      <PhoneInput
        id="shop-phone"
        label="Ton numéro WhatsApp"
        hint="Tes clients te contactent sur ce numéro."
        dialCode={dialCodeFor(values.country)}
        value={values.whatsappPhone}
        error={errors.whatsappPhone}
        onChange={(e) => set('whatsappPhone', e.target.value)}
      />
      <PhotoPicker
        id="shop-logo"
        label="Logo (facultatif)"
        max={1}
        value={values.logoUrl ? [values.logoUrl] : []}
        onChange={(urls) => set('logoUrl', urls[0] ?? null)}
      />
      {mode === 'edit' && (
        <Textarea
          id="shop-description"
          label="Présente ta boutique (facultatif)"
          hint={`Ce que tu vends, où tu es, quand tu livres. ${values.description.length} / ${SHOP_DESCRIPTION_MAX}`}
          rows={3}
          maxLength={SHOP_DESCRIPTION_MAX}
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
        />
      )}
      {withZones && (
        <ZonesInput
          id="shop-zones"
          label="Zones de livraison (facultatif)"
          hint="Les quartiers ou les villes où tu livres. Tu pourras les changer plus tard."
          value={values.zones}
          onChange={(zones) => set('zones', zones)}
        />
      )}
      {error && <Notice tone="danger">{error}</Notice>}
      {!hideSubmit && (
        <Button
          type="submit"
          size={mode === 'create' ? 'lg' : 'md'}
          disabled={submitting}
          className={mode === 'create' ? 'w-full shadow-press' : 'self-start'}
        >
          {submitting ? submittingLabel : submitLabel}
        </Button>
      )}
    </form>
  );
}

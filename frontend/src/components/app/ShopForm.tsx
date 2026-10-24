'use client';

// The shop's identity: name, country, WhatsApp number, logo and, at
// creation, the delivery zones. The page sends the values and gives back
// the server's answer (error notice or field errors).
import { useState, type FormEvent } from 'react';
import { Button, Input, Notice, PhoneInput, Select } from '@/components/ui';
import { dialCodeFor, SHOP_COUNTRIES } from '@/lib/tamani/countries';
import { PhotoPicker } from './PhotoPicker';
import { ZonesInput } from './ZonesInput';

export interface ShopFormValues {
  name: string;
  country: string;
  whatsappPhone: string;
  logoUrl: string | null;
  zones: string[];
}

export type ShopFormErrors = Partial<Record<'name' | 'whatsappPhone', string>>;

export const emptyShopForm: ShopFormValues = {
  name: '',
  country: 'SN',
  whatsappPhone: '',
  logoUrl: null,
  zones: [],
};

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
  submitLabel,
  submittingLabel,
  submitting,
  error,
  errors: serverErrors,
  onSubmit,
}: {
  initial?: ShopFormValues;
  withZones?: boolean;
  submitLabel: string;
  submittingLabel: string;
  submitting: boolean;
  error?: string | null | undefined;
  errors?: ShopFormErrors | undefined;
  onSubmit: (values: ShopFormValues) => void;
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
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
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
      <Button type="submit" size="lg" disabled={submitting} className="w-full shadow-press">
        {submitting ? submittingLabel : submitLabel}
      </Button>
    </form>
  );
}

'use client';

// /app/reglages, four cards: the shop, its delivery zones, the estimate
// coefficients and the account. The first three need the ADMIN role: a
// MEMBER sees them, greyed out, with a word on why.
import { useEffect, useState } from 'react';
import { AccountSection } from '@/components/app/AccountSection';
import { CoefficientsForm } from '@/components/app/CoefficientsForm';
import { ShopForm, type ShopFormErrors, type ShopFormValues } from '@/components/app/ShopForm';
import { useShop } from '@/components/app/ShopProvider';
import { ZoneEditor, type Zone } from '@/components/app/ZoneEditor';
import { Button, Card, Notice, PageHeader } from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import { api, ApiError } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';
import { nationalNumber } from '@/lib/tamani/countries';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card as="section" className="p-5 sm:p-6">
      <h2 className="font-hand text-2xl font-bold text-primary">{title}</h2>
      <div className="mt-5">{children}</div>
    </Card>
  );
}

export function SettingsView({ google }: { google: boolean }) {
  const { shop, role, reload } = useShop();
  const { toast } = useToast();
  const admin = role !== 'MEMBER';
  const [zones, setZones] = useState<Zone[] | null>(null);
  const [zonesError, setZonesError] = useState<string | null>(null);
  const [zonesAttempt, setZonesAttempt] = useState(0);
  const [savingShop, setSavingShop] = useState(false);
  const [shopError, setShopError] = useState<string | null>(null);
  const [shopErrors, setShopErrors] = useState<ShopFormErrors>({});
  const [coefError, setCoefError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setZonesError(null);
    api<{ items: Zone[] }>(`/api/shops/${shop.id}/zones`)
      .then((res) => live && setZones(res.items))
      .catch((err: unknown) => live && setZonesError(errorMessage(err)));
    return () => {
      live = false;
    };
  }, [shop.id, zonesAttempt]);

  async function saveShop(v: ShopFormValues) {
    setSavingShop(true);
    setShopError(null);
    setShopErrors({});
    try {
      await api(`/api/shops/${shop.id}`, {
        method: 'PATCH',
        body: {
          name: v.name,
          whatsappPhone: v.whatsappPhone,
          country: v.country,
          logoUrl: v.logoUrl,
        },
      });
      await reload();
      toast('Boutique enregistrée.', 'success');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INVALID_PHONE') {
        setShopErrors({ whatsappPhone: errorMessage(err) });
      } else {
        setShopError(errorMessage(err));
      }
    } finally {
      setSavingShop(false);
    }
  }

  async function saveCoefs(coefs: { coefConsumer: number; coefReseller: number }) {
    setCoefError(null);
    try {
      await api(`/api/shops/${shop.id}`, { method: 'PATCH', body: coefs });
      await reload();
      toast('Estimation enregistrée.', 'success');
    } catch (err) {
      setCoefError(errorMessage(err));
    }
  }

  return (
    <>
      <PageHeader title="Réglages" />
      {!admin && (
        <Notice tone="warning" className="mt-6">
          Seul le gérant de la boutique peut modifier la boutique, les zones et l&apos;estimation.
        </Notice>
      )}
      <div className="mt-8 flex flex-col gap-6">
        <Section title="Ta boutique">
          <fieldset disabled={!admin} className="disabled:opacity-60">
            <ShopForm
              initial={{
                name: shop.name,
                country: shop.country,
                whatsappPhone: nationalNumber(shop.whatsappPhone, shop.country),
                logoUrl: shop.logoUrl,
                zones: [],
              }}
              withZones={false}
              mode="edit"
              submitLabel="Enregistrer la boutique"
              submittingLabel="Enregistrement…"
              submitting={savingShop}
              error={shopError}
              errors={shopErrors}
              onSubmit={(v) => void saveShop(v)}
            />
          </fieldset>
        </Section>

        <Section title="Zones de livraison">
          <fieldset disabled={!admin} className="disabled:opacity-60">
            {zonesError ? (
              <Notice
                tone="danger"
                action={
                  <Button variant="secondary" onClick={() => setZonesAttempt((n) => n + 1)}>
                    Réessayer
                  </Button>
                }
              >
                {zonesError}
              </Notice>
            ) : zones === null ? (
              <p role="status" className="text-ink-muted">
                Chargement des zones…
              </p>
            ) : (
              <ZoneEditor shopId={shop.id} zones={zones} />
            )}
          </fieldset>
        </Section>

        <Section title="Estimation">
          <fieldset disabled={!admin} className="disabled:opacity-60">
            <CoefficientsForm
              coefConsumer={shop.coefConsumer}
              coefReseller={shop.coefReseller}
              error={coefError}
              onSave={saveCoefs}
            />
          </fieldset>
        </Section>

        <Section title="Ton compte">
          <AccountSection google={google} />
        </Section>
      </div>
    </>
  );
}

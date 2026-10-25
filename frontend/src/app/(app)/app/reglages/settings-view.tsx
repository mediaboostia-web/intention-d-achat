'use client';

// /app/reglages, five sections (porteur's feedback §3 bis): the shop, its
// delivery zones, the estimate coefficients, notifications and the account.
// From lg a menu on the left jumps to each; below, they stack. A section's
// save button sits in its header. The first three need the ADMIN role: a
// MEMBER sees them, greyed out, with a word on why.
import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { AccountSection } from '@/components/app/AccountSection';
import { CoefficientsForm } from '@/components/app/CoefficientsForm';
import { PushCard } from '@/components/app/PushCard';
import { ShopForm, type ShopFormErrors, type ShopFormValues } from '@/components/app/ShopForm';
import { useShop } from '@/components/app/ShopProvider';
import { ZoneEditor, type Zone } from '@/components/app/ZoneEditor';
import { Button, Card, Notice, PageHeader } from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import { api, ApiError } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';
import { nationalNumber } from '@/lib/tamani/countries';
import { shopCompleteness, type ShopGap } from '@/lib/tamani/shop-completeness';

const SECTIONS = {
  boutique: 'Boutique',
  zones: 'Zones',
  estimation: 'Estimation',
  notifications: 'Notifications',
  compte: 'Compte',
} as const;

type SectionId = keyof typeof SECTIONS;

const GAPS: Record<ShopGap, { section: SectionId; label: string }> = {
  description: { section: 'boutique', label: 'une description' },
  logo: { section: 'boutique', label: 'un logo' },
  zones: { section: 'zones', label: 'des zones de livraison' },
};

function Section({
  id,
  action,
  children,
}: {
  id: SectionId;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-6">
      <Card className="p-5 sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h2 id={`${id}-title`} className="font-hand text-2xl font-bold text-primary">
            {SECTIONS[id]}
          </h2>
          {action}
        </header>
        <div className="mt-5">{children}</div>
      </Card>
    </section>
  );
}

/** "une description, un logo et des zones de livraison", each a link to its section. */
function GapList({ gaps }: { gaps: ShopGap[] }) {
  return gaps.map((gap, i) => (
    <Fragment key={gap}>
      {i > 0 && (i === gaps.length - 1 ? ' et ' : ', ')}
      <a href={`#${GAPS[gap].section}`} className="font-bold text-primary underline">
        {GAPS[gap].label}
      </a>
    </Fragment>
  ));
}

export function SettingsView({ google }: { google: boolean }) {
  const { shop, role, reload } = useShop();
  const { toast } = useToast();
  const admin = role !== 'MEMBER';
  const [zones, setZones] = useState<Zone[] | null>(null);
  const [zoneCount, setZoneCount] = useState<number | null>(null);
  const [zonesError, setZonesError] = useState<string | null>(null);
  const [zonesAttempt, setZonesAttempt] = useState(0);
  const [savingShop, setSavingShop] = useState(false);
  const [shopError, setShopError] = useState<string | null>(null);
  const [shopErrors, setShopErrors] = useState<ShopFormErrors>({});
  const [savingCoefs, setSavingCoefs] = useState(false);
  const [coefError, setCoefError] = useState<string | null>(null);
  // Zones count only once loaded: until then nothing is said about them.
  const gaps = shopCompleteness(shop, zoneCount ?? 0).missing.filter(
    (gap) => gap !== 'zones' || zoneCount !== null,
  );

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
          description: v.description.trim() || null,
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
    setSavingCoefs(true);
    setCoefError(null);
    try {
      await api(`/api/shops/${shop.id}`, { method: 'PATCH', body: coefs });
      await reload();
      toast('Estimation enregistrée.', 'success');
    } catch (err) {
      setCoefError(errorMessage(err));
    } finally {
      setSavingCoefs(false);
    }
  }

  return (
    <>
      <PageHeader title="Réglages" />
      <div className="mt-8 lg:grid lg:grid-cols-[12rem_1fr] lg:gap-8">
        <nav
          aria-label="Sections des réglages"
          className="hidden lg:sticky lg:top-6 lg:block lg:self-start"
        >
          <ul className="flex flex-col gap-1">
            {Object.entries(SECTIONS).map(([id, title]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="flex min-h-11 items-center rounded-control px-3 font-bold text-ink-soft hover:bg-surface hover:text-ink"
                >
                  {title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex min-w-0 flex-col gap-6">
          {!admin && (
            <Notice tone="warning">
              Seul le gérant de la boutique peut modifier la boutique, les zones et
              l&apos;estimation.
            </Notice>
          )}
          {admin && gaps.length > 0 && (
            <Notice tone="info">
              Ajoute <GapList gaps={gaps} /> : tes clients les voient quand ils répondent.
            </Notice>
          )}

          <Section
            id="boutique"
            action={
              <Button type="submit" form="shop-form" disabled={!admin || savingShop}>
                {savingShop ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            }
          >
            <fieldset disabled={!admin} className="disabled:opacity-60">
              <ShopForm
                formId="shop-form"
                hideSubmit
                initial={{
                  name: shop.name,
                  country: shop.country,
                  whatsappPhone: nationalNumber(shop.whatsappPhone, shop.country),
                  logoUrl: shop.logoUrl,
                  description: shop.description ?? '',
                  zones: [],
                }}
                withZones={false}
                mode="edit"
                submitLabel="Enregistrer"
                submittingLabel="Enregistrement…"
                submitting={savingShop}
                error={shopError}
                errors={shopErrors}
                onSubmit={(v) => void saveShop(v)}
              />
            </fieldset>
          </Section>

          <Section id="zones">
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
                <ZoneEditor shopId={shop.id} zones={zones} onCountChange={setZoneCount} />
              )}
            </fieldset>
          </Section>

          <Section
            id="estimation"
            action={
              <Button type="submit" form="coef-form" disabled={!admin || savingCoefs}>
                {savingCoefs ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            }
          >
            <fieldset disabled={!admin} className="disabled:opacity-60">
              <CoefficientsForm
                formId="coef-form"
                hideSubmit
                coefConsumer={shop.coefConsumer}
                coefReseller={shop.coefReseller}
                error={coefError}
                onSave={saveCoefs}
              />
            </fieldset>
          </Section>

          <Section id="notifications">
            <PushCard place="settings" />
          </Section>

          <Section id="compte">
            <AccountSection google={google} />
          </Section>
        </div>
      </div>
    </>
  );
}

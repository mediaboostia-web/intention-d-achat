'use client';

// /app/bienvenue: the one page an account sees before it has a shop. The
// onboarding asks what the shop is and where it sells (2026-11-04), then the
// shop form. The shop is created first, then each zone in order; a zone that
// fails does not undo the shop — the product page says so and points to the
// settings.
import { useState } from 'react';
import { AuthTitle } from '@/components/app/AuthForm';
import { WelcomeFlow, type Activity } from '@/components/app/Onboarding';
import type { ShopFormErrors, ShopFormValues } from '@/components/app/ShopForm';
import { useShopGate, type Shop } from '@/components/app/ShopProvider';
import { Logo } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';

const FIRST_PRODUCT = '/app/produits/nouveau?premier=1';

export default function WelcomePage() {
  const { created, reload } = useShopGate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<ShopFormErrors>({});

  async function onSubmit(v: ShopFormValues, activity: Activity) {
    setSubmitting(true);
    setError(null);
    setErrors({});
    let shop: Shop;
    try {
      const res = await api<{ shop: Shop }>('/api/shops', {
        method: 'POST',
        body: {
          name: v.name,
          whatsappPhone: v.whatsappPhone,
          country: v.country,
          ...(v.logoUrl ? { logoUrl: v.logoUrl } : {}),
          ...(activity.businessType ? { businessType: activity.businessType } : {}),
          ...(activity.salesChannel ? { salesChannel: activity.salesChannel } : {}),
        },
      });
      shop = res.shop;
    } catch (err) {
      if (err instanceof ApiError && err.code === 'SHOP_ALREADY_EXISTS') {
        await reload(); // the gate then opens the existing shop
        return;
      }
      if (err instanceof ApiError && err.code === 'INVALID_PHONE') {
        setErrors({ whatsappPhone: errorMessage(err) });
      } else {
        setError(errorMessage(err));
      }
      setSubmitting(false);
      return;
    }

    let failed = 0;
    for (const [sortOrder, name] of v.zones.entries()) {
      try {
        await api(`/api/shops/${shop.id}/zones`, { method: 'POST', body: { name, sortOrder } });
      } catch {
        failed += 1;
      }
    }
    created(shop, 'OWNER', failed > 0 ? `${FIRST_PRODUCT}&zones=echec` : FIRST_PRODUCT);
  }

  return (
    <div className="min-h-dvh bg-paper">
      <div className="mx-auto flex w-full max-w-md flex-col px-4 pt-8 pb-16">
        <Logo variant="lockup" size={34} />
        <main className="mt-12">
          <AuthTitle title="Bienvenue ! Créons ta boutique." />
          <div className="mt-8">
            <WelcomeFlow
              submitting={submitting}
              error={error}
              errors={errors}
              onSubmit={(v, activity) => void onSubmit(v, activity)}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

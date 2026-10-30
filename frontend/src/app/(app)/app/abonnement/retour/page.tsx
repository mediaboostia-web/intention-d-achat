'use client';

// /app/abonnement/retour?achat=<orderId>: SasPay sends the customer back
// here after paying; the page waits for the verified payment (lot 8).
import { Suspense } from 'react';
import { ReturnScreen } from '@/components/app/BillingView';

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={null}>
      <ReturnScreen />
    </Suspense>
  );
}

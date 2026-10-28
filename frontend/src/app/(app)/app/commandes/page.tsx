// /app/commandes: every order and « À livrer par quartier » (lot 7). The
// filters live in the address, hence the Suspense around useSearchParams.
import { Suspense } from 'react';
import { OrdersScreen } from '@/components/app/OrderList';

export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <OrdersScreen />
    </Suspense>
  );
}

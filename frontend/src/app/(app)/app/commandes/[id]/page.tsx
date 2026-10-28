'use client';

// /app/commandes/[id]: one order (lot 7). An order of another shop is not
// found (404 ORDER_NOT_FOUND), like one that never existed.
import { useParams } from 'next/navigation';
import { OrderScreen } from '@/components/app/OrderDetail';

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  return <OrderScreen id={id} />;
}

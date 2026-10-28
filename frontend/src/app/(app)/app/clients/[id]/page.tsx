'use client';

// /app/clients/[id]: one client, their orders, the note and every answer
// they gave (lot 7). A client whose answers are all locked or suspicious is
// not found (404), like one of another shop.
import { useParams } from 'next/navigation';
import { ClientScreen } from '@/components/app/ClientDetail';

export default function ClientPage() {
  const { id } = useParams<{ id: string }>();
  return <ClientScreen id={id} />;
}

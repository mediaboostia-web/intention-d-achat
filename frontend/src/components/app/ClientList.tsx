'use client';

// The client book as WhatsApp lists calls (porteur's feedback §3 bis):
// initials in a circle, the first name, the latest interest with a green
// arrow for a yes and a red one for a no, and the WhatsApp button on the
// right. On Free the button is locked and leads to the plans.
import Link from 'next/link';
import { Avatar, Button, EmptyState, Icon } from '@/components/ui';
import {
  clientWhatsappMessage,
  lastInterestText,
  lockedContactText,
  type ClientRow,
} from '@/lib/tamani/client-view';
import { relativeTime } from '@/lib/tamani/relative-time';
import { waChatLink } from '@/lib/tamani/wa';
import { cn } from '@/lib/utils';

export function clientName(firstName: string | null): string {
  return firstName ?? 'Client sans prénom';
}

/** The round WhatsApp button, or its lock on Free. */
export function ContactButton({ client, shopName }: { client: ClientRow; shopName: string }) {
  const name = clientName(client.firstName);
  if (client.phoneE164) {
    const message = clientWhatsappMessage({
      firstName: client.firstName,
      shopName,
      productName: client.last?.productName ?? null,
    });
    return (
      <a
        href={waChatLink(client.phoneE164, message)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Écrire à ${name} sur WhatsApp`}
        className="frame flex size-12 shrink-0 items-center justify-center rounded-full bg-whatsapp text-whatsapp-ink transition-transform hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        <Icon name="whatsapp" />
      </a>
    );
  }
  if (!client.phone) return null;
  return (
    <Link
      href="/app/abonnement"
      aria-label={lockedContactText(client.firstName)}
      className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-grid bg-surface text-ink-muted hover:border-ink"
    >
      <Icon name="lock" className="size-5" />
    </Link>
  );
}

export function ClientList({
  rows,
  shopName,
  now,
}: {
  rows: readonly ClientRow[];
  shopName: string;
  now: Date;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        className="mt-6"
        title="Pas encore de client"
        action={
          <Button href="/app/campagnes" className="mt-2">
            Partager une campagne
          </Button>
        }
      >
        Tes clients apparaîtront ici dès leur première réponse.
      </EmptyState>
    );
  }
  return (
    <ul
      aria-label="Clients"
      className="frame mt-4 divide-y-2 divide-grid overflow-hidden rounded-card bg-surface"
    >
      {rows.map((c) => (
        <li key={c.id} className="flex items-center gap-2 pr-3">
          <Link
            href={`/app/clients/${c.id}`}
            className="flex min-h-18 min-w-0 flex-1 items-center gap-3 py-3 pl-4 hover:bg-bg"
          >
            <Avatar name={c.firstName ?? ''} />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate font-bold text-ink">{clientName(c.firstName)}</span>
                {c.last && (
                  <span className="shrink-0 text-xs text-ink-muted">
                    {relativeTime(new Date(c.last.at), now)}
                  </span>
                )}
              </span>
              {c.last && (
                <span className="flex items-center gap-1 text-sm text-ink-soft">
                  <span className={cn(c.last.interested ? 'text-success' : 'text-danger')}>
                    <Icon
                      name={c.last.interested ? 'arrow-down-left' : 'arrow-up-right'}
                      className="size-4"
                    />
                  </span>
                  <span className="truncate">{lastInterestText(c.last)}</span>
                </span>
              )}
              {c.phone && <span className="block text-xs text-ink-muted">{c.phone}</span>}
            </span>
          </Link>
          <ContactButton client={c} shopName={shopName} />
        </li>
      ))}
    </ul>
  );
}

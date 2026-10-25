'use client';

// A client's page: who they are, how to reach them (locked on Free) and
// every answer they gave, each opening its campaign.
import Link from 'next/link';
import { Avatar, Button, Notice } from '@/components/ui';
import {
  clientWhatsappMessage,
  lockedContactText,
  type ClientDetail,
  type ClientInterest,
} from '@/lib/tamani/client-view';
import { formatDateFr } from '@/lib/tamani/dates';
import { relativeTime } from '@/lib/tamani/relative-time';
import { TIMING_LABELS, type Timing } from '@/lib/tamani/timing';
import { pluralizeUnit } from '@/lib/tamani/verdict-display';
import { waChatLink } from '@/lib/tamani/wa';
import { cn } from '@/lib/utils';
import { clientName } from './ClientList';

const BUYER_WORDS = { RESELLER: 'pour revendre', CONSUMER: 'pour son usage' } as const;

/** "3 sacs, pour revendre, Rouge, cette semaine, livraison à Médina". */
function interestDetail(i: ClientInterest): string {
  if (!i.interested) return 'Pas pour cette fois';
  const parts: string[] = [];
  if (i.quantity !== null) parts.push(`${i.quantity} ${pluralizeUnit(i.unitLabel, i.quantity)}`);
  if (i.buyerType) parts.push(BUYER_WORDS[i.buyerType]);
  if (i.option) parts.push(i.option);
  if (i.timing && Object.hasOwn(TIMING_LABELS, i.timing)) {
    parts.push(TIMING_LABELS[i.timing as Timing].toLocaleLowerCase('fr'));
  }
  if (i.wantsDelivery) parts.push(i.zoneName ? `livraison à ${i.zoneName}` : 'livraison');
  return parts.length > 0 ? parts.join(', ') : 'Intéressé';
}

export function ClientDetailView({
  client,
  shopName,
  now,
}: {
  client: ClientDetail;
  shopName: string;
  now: Date;
}) {
  return (
    <>
      <header className="flex items-center gap-4 lg:pr-[var(--shell-tools,0px)]">
        <Avatar name={client.firstName ?? ''} size="lg" />
        <div className="min-w-0">
          <h1 className="font-hand text-3xl leading-tight font-bold break-words text-primary">
            {clientName(client.firstName)}
          </h1>
          {client.phone && <p className="text-ink-soft">{client.phone}</p>}
          <p className="text-sm text-ink-muted">
            Client depuis le {formatDateFr(new Date(client.firstSeenAt), now)}
          </p>
        </div>
      </header>

      {client.phoneE164 ? (
        <Button
          variant="whatsapp"
          className="mt-6"
          href={waChatLink(
            client.phoneE164,
            clientWhatsappMessage({
              firstName: client.firstName,
              shopName,
              productName: client.last?.productName ?? null,
            }),
          )}
          target="_blank"
          rel="noopener noreferrer"
        >
          Écrire sur WhatsApp
        </Button>
      ) : (
        <Notice
          tone="info"
          className="mt-6"
          action={
            <Button href="/app/plus#forfait" variant="secondary">
              Voir le forfait Pro
            </Button>
          }
        >
          {lockedContactText(client.firstName)}
        </Notice>
      )}

      <section aria-labelledby="answers-title" className="mt-8">
        <h2 id="answers-title" className="font-hand text-2xl font-bold text-primary">
          Ses réponses
        </h2>
        <ul
          aria-label="Ses réponses"
          className="frame mt-3 divide-y-2 divide-grid overflow-hidden rounded-card bg-surface"
        >
          {client.interests.map((i) => (
            <li key={i.responseId}>
              <Link
                href={`/app/campagnes/${i.campaignId}`}
                className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-bg"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'size-3 shrink-0 rounded-full',
                    i.interested ? 'bg-success' : 'bg-danger',
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-ink">{i.campaignTitle}</span>
                  <span className="block text-sm text-ink-soft">{interestDetail(i)}</span>
                </span>
                <span className="shrink-0 text-xs text-ink-muted">
                  {relativeTime(new Date(i.at), now)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

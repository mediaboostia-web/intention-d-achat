'use client';

// A client's page: who they are, how to reach them (locked on Free), their
// orders and the total bought, how often their yes became a purchase (with a pass),
// the wholesaler's note and every answer they gave, each opening its
// campaign. An ADMIN or the OWNER can delete the client's data on request
// (spec §6.9). ClientScreen loads and saves; ClientDetailView draws from its
// props.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar, Badge, Button, Card, Notice, Textarea } from '@/components/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';
import {
  CLIENT_NOTE_MAX,
  clientWhatsappMessage,
  lockedContactText,
  lockedReliabilityText,
  normalizeClientNote,
  reliabilityText,
  type ClientDetail,
  type ClientInterest,
  type ClientReliabilityView,
} from '@/lib/tamani/client-view';
import { formatDateFr } from '@/lib/tamani/dates';
import { relativeTime } from '@/lib/tamani/relative-time';
import { TIMING_LABELS, type Timing } from '@/lib/tamani/timing';
import { frenchSpacing } from '@/lib/tamani/typography';
import { pluralizeUnit } from '@/lib/tamani/verdict-display';
import { waChatLink } from '@/lib/tamani/wa';
import { formatMoney } from '@/lib/tamani/currency';
import { cn } from '@/lib/utils';
import { clientName } from './ClientList';
import { OrderLines } from './OrderList';
import type { OrgRole } from './shop-context';
import { useShop } from './ShopProvider';

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

const SECTION_TITLE = 'font-hand text-2xl font-bold text-primary';

function ClientOrders({ client, currency }: { client: ClientDetail; currency: string }) {
  return (
    <section aria-labelledby="orders-title" className="mt-8">
      <h2 id="orders-title" className={SECTION_TITLE}>
        Ses commandes
      </h2>
      {client.orders.length > 0 ? (
        <>
          <p className="mt-2 text-sm text-ink-muted">Total acheté</p>
          <p className="font-sign text-4xl leading-tight text-ink">
            {formatMoney(client.totalSpent, currency)}
          </p>
          <p className="text-sm text-ink-soft">Les commandes livrées ou récupérées.</p>
          <div className="frame mt-3 overflow-hidden rounded-card bg-surface">
            <OrderLines rows={client.orders} label="Ses commandes" currency={currency} />
          </div>
        </>
      ) : (
        <p className="mt-2 text-ink-soft">
          Aucune commande pour l&apos;instant. Quand {client.firstName ?? 'ce client'} dit oui,
          transforme sa réponse en commande depuis l&apos;onglet Intéressés de la campagne.
        </p>
      )}
    </section>
  );
}

function ClientReliability({
  reliability,
  firstName,
}: {
  reliability: ClientReliabilityView | null;
  firstName: string | null;
}) {
  if (!reliability) {
    return (
      <Card as="section" className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={SECTION_TITLE}>Fiabilité</h2>
          <Badge tone="accent">Pass</Badge>
        </div>
        <p className="mt-2 text-ink-soft">{lockedReliabilityText(firstName)}</p>
        <Button className="mt-4" href="/app/abonnement" variant="secondary">
          Prendre un pass
        </Button>
      </Card>
    );
  }
  const { line, pending } = reliabilityText(reliability, firstName);
  return (
    <Card as="section" className="mt-8">
      <h2 className={SECTION_TITLE}>Fiabilité</h2>
      <p className="mt-2 text-lg font-bold text-ink">{line}</p>
      <p className="mt-1 text-sm text-ink-soft">
        {pending ??
          'Compté sur ses « oui » des campagnes terminées et ses commandes livrées ou récupérées.'}
      </p>
    </Card>
  );
}

export type NoteStatus = 'idle' | 'saving' | 'saved' | 'error';

const NOTE_STATUS: Readonly<Record<Exclude<NoteStatus, 'error'>, string>> = {
  idle: '',
  saving: 'Enregistrement…',
  saved: 'Note enregistrée.',
};

/** The note as a form: saved when the field loses focus or with « Enregistrer ». */
export function ClientNoteView({
  value,
  status,
  error,
  onChange,
  onCommit,
}: {
  value: string;
  status: NoteStatus;
  error: string | null;
  onChange: (value: string) => void;
  onCommit: () => void;
}) {
  return (
    <form
      aria-labelledby="client-note-title"
      onSubmit={(e) => {
        e.preventDefault();
        onCommit();
      }}
      className="mt-8 flex flex-col gap-3"
    >
      <h2 id="client-note-title" className={SECTION_TITLE}>
        Ta note
      </h2>
      <Textarea
        id="client-notes"
        label="Ce que tu retiens sur ce client"
        hint="Visible par ta boutique seulement. Ses habitudes, un rappel…"
        rows={3}
        maxLength={CLIENT_NOTE_MAX}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="secondary" disabled={status === 'saving'}>
          Enregistrer
        </Button>
        <p
          role="status"
          className={cn('text-sm', status === 'error' ? 'font-bold text-danger' : 'text-ink-muted')}
        >
          {status === 'error' ? error : NOTE_STATUS[status]}
        </p>
      </div>
    </form>
  );
}

/**
 * One request per change: a blur then a tap on « Enregistrer » send the note
 * once, and a change made while a save is on its way is sent after it, so
 * two saves never race.
 */
function ClientNote({
  initial,
  onSave,
}: {
  initial: string | null;
  onSave: (notes: string | null) => Promise<void>;
}) {
  const [value, setValue] = useState(initial ?? '');
  const [status, setStatus] = useState<NoteStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const draft = useRef(initial ?? '');
  const saved = useRef(initial);
  const sending = useRef(false);
  const again = useRef(false);

  async function commit() {
    if (sending.current) {
      again.current = true;
      return;
    }
    const notes = normalizeClientNote(draft.current);
    if (notes === saved.current) return;
    sending.current = true;
    setStatus('saving');
    setError(null);
    try {
      await onSave(notes);
      saved.current = notes;
      setStatus('saved');
    } catch (err) {
      // No retry on its own: « Enregistrer » sends it again.
      again.current = false;
      setStatus('error');
      setError(errorMessage(err));
    } finally {
      sending.current = false;
    }
    if (again.current) {
      again.current = false;
      await commit();
    }
  }

  return (
    <ClientNoteView
      value={value}
      status={status}
      error={error}
      onChange={(next) => {
        draft.current = next;
        setValue(next);
        if (status === 'saved') setStatus('idle');
      }}
      onCommit={() => void commit()}
    />
  );
}

/** « Supprimer les données de ce client », then the second tap that says it is final. */
export function ClientDeletionView({
  asking,
  busy,
  error,
  onAsk,
  onKeep,
  onConfirm,
}: {
  asking: boolean;
  busy: boolean;
  error: string | null;
  onAsk: () => void;
  onKeep: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="mt-10 border-t-2 border-grid pt-6">
      {asking ? (
        <Notice
          tone="warning"
          title={frenchSpacing('Supprimer les données de ce client ?')}
          action={
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" disabled={busy} onClick={onConfirm}>
                Oui, supprimer ses données
              </Button>
              <Button variant="ghost" disabled={busy} onClick={onKeep}>
                Garder ce client
              </Button>
            </div>
          }
        >
          C&apos;est définitif&nbsp;: son prénom, son numéro et tes notes seront effacés, sans
          retour possible. Ses réponses et ses commandes restent comptées, sans nom.
        </Notice>
      ) : (
        <>
          <Button variant="ghost" disabled={busy} onClick={onAsk}>
            Supprimer les données de ce client
          </Button>
          <p className="text-sm text-ink-muted">
            Quand un client te demande d&apos;effacer ses données.
          </p>
        </>
      )}
      {error && (
        <Notice tone="danger" className="mt-4">
          {error}
        </Notice>
      )}
    </div>
  );
}

function ClientDeletion({ onDelete }: { onDelete: () => Promise<void> }) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      // On success the screen leaves the page: the button stays busy.
      await onDelete();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }
  return (
    <ClientDeletionView
      asking={asking}
      busy={busy}
      error={error}
      onAsk={() => setAsking(true)}
      onKeep={() => {
        setAsking(false);
        setError(null);
      }}
      onConfirm={() => void confirm()}
    />
  );
}

export function ClientDetailView({
  client,
  shopName,
  currency,
  now,
  role,
  onSaveNote,
  onDelete,
}: {
  client: ClientDetail;
  shopName: string;
  /** The shop's currency (lot 7b). */
  currency: string;
  now: Date;
  /** The deletion is for an ADMIN or the OWNER (the server asks ADMIN). */
  role: OrgRole;
  onSaveNote: (notes: string | null) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  return (
    <>
      <header className="flex items-center gap-4">
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
            <Button href="/app/abonnement" variant="secondary">
              Prendre un pass
            </Button>
          }
        >
          {lockedContactText(client.firstName)}
        </Notice>
      )}

      <ClientOrders client={client} currency={currency} />
      <ClientReliability reliability={client.reliability} firstName={client.firstName} />
      <ClientNote initial={client.notes} onSave={onSaveNote} />

      <section aria-labelledby="answers-title" className="mt-8">
        <h2 id="answers-title" className={SECTION_TITLE}>
          Ses réponses
        </h2>
        {client.interests.length === 0 ? (
          <p className="mt-2 text-ink-soft">
            Ajouté au carnet par une commande, sans réponse à une campagne pour l&apos;instant.
          </p>
        ) : (
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
        )}
      </section>

      {role !== 'MEMBER' && <ClientDeletion onDelete={onDelete} />}
    </>
  );
}

/**
 * Loads one client, saves the note (PATCH) and deletes the data (DELETE,
 * `{ anonymized: true }`), then goes back to the book. A client whose answers are all locked
 * or suspicious is not found (404), like one of another shop.
 */
export function ClientScreen({ id }: { id: string }) {
  const { shop, role } = useShop();
  const router = useRouter();
  const path = `/api/shops/${shop.id}/clients/${encodeURIComponent(id)}`;
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    api<{ client: ClientDetail }>(path)
      .then((res) => live && setClient(res.client))
      .catch((err: unknown) => live && setError(errorMessage(err)));
    return () => {
      live = false;
    };
  }, [path]);

  if (error) {
    return (
      <Notice
        tone="danger"
        action={
          <Button href="/app/clients" variant="secondary">
            Retour aux clients
          </Button>
        }
      >
        {error}
      </Notice>
    );
  }
  if (!client) {
    return (
      <div role="status" aria-label="Chargement du client">
        <div aria-hidden="true" className="flex flex-col gap-4 motion-safe:animate-pulse">
          <span className="h-16 w-2/3 rounded-card bg-grid/70" />
          <span className="h-12 w-48 rounded-card bg-grid/70" />
          <span className="h-40 rounded-card bg-grid/70" />
        </div>
      </div>
    );
  }
  return (
    <ClientDetailView
      client={client}
      shopName={shop.name}
      currency={shop.currency}
      now={new Date()}
      role={role}
      onSaveNote={async (notes) => {
        await api<{ client: { notes: string | null } }>(path, {
          method: 'PATCH',
          body: { notes },
        });
      }}
      onDelete={async () => {
        await api<{ anonymized: true }>(path, { method: 'DELETE' });
        // The card is gone: back must not land on its 404.
        router.replace('/app/clients');
      }}
    />
  );
}

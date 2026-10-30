'use client';

// The Intéressés tab of a campaign (spec §5.5): who said yes or no, with a
// WhatsApp message ready for each, the numbers to paste into a broadcast
// list and the Excel file (on the « Exporter » page, lot 6b). On Free the
// numbers stay masked and the copy leads to the plans; the export page
// shows its preview on every plan. Each yes turns into one order, on every
// plan (lot 7, spec §5.5.1); a converted answer links to its order.
// InterestedTab loads; InterestedView draws.
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Badge, Button, EmptyState, FilterBar, Icon, Notice } from '@/components/ui';
import { ApiError, api } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';
import type { CampaignStatus } from '@/lib/tamani/campaign-actions';
import type { Availability } from '@/lib/tamani/timing';
import { clientWhatsappMessage, lockedContactText } from '@/lib/tamani/client-view';
import { DEFAULT_EXPORT, exportHref } from '@/lib/tamani/export-view';
import { relativeTime } from '@/lib/tamani/relative-time';
import {
  interestedDetail,
  interestedMessage,
  type InterestedPage,
  type InterestedRow,
} from '@/lib/tamani/results-view';
import { waChatLink } from '@/lib/tamani/wa';
import { copyText } from './CopyButton';

export interface InterestedCampaign {
  id: string;
  productName: string;
  unitLabel: string;
  status: CampaignStatus;
  availability: Availability;
}

type Filter = 'yes' | 'no';
type CopyState = 'idle' | 'copied' | 'empty' | 'failed';

/** Copies the interested numbers, one per line; the count copied, or null when the copy failed. */
export async function copyInterestedNumbers(
  shopId: string,
  campaignId: string,
): Promise<number | null> {
  const { numbers } = await api<{ numbers: string[] }>(
    `/api/shops/${shopId}/campaigns/${encodeURIComponent(campaignId)}/responses/numbers`,
  );
  if (numbers.length === 0) return 0;
  return (await copyText(numbers.join('\n'))) ? numbers.length : null;
}

/** « Transformer en commande »: one order per answer, the new order's id. */
export async function convertToOrder(
  shopId: string,
  campaignId: string,
  responseId: string,
): Promise<string> {
  const { order } = await api<{ order: { id: string } }>(
    `/api/shops/${shopId}/campaigns/${encodeURIComponent(campaignId)}/responses/${encodeURIComponent(responseId)}/order`,
    { method: 'POST' },
  );
  return order.id;
}

const COPY_FEEDBACK: Record<Exclude<CopyState, 'idle'>, string> = {
  copied: 'Numéros copiés. Colle-les dans une liste de diffusion WhatsApp.',
  empty: "Aucun numéro à copier pour l'instant.",
  failed: 'La copie a échoué. Réessaie.',
};

/** A yes becomes an order; once it is one, the row links to it. */
function OrderAction({
  row,
  converting,
  error,
  onConvert,
}: {
  row: InterestedRow;
  converting: boolean;
  error: string | null;
  onConvert: () => void;
}) {
  return (
    <div className="mt-2 flex flex-col items-start gap-1">
      {row.orderId ? (
        <Link
          href={`/app/commandes/${row.orderId}`}
          className="inline-flex min-h-12 items-center gap-1.5 font-bold text-success hover:underline"
        >
          <Icon name="check" className="size-4" />
          Commande créée
        </Link>
      ) : (
        <Button
          variant="secondary"
          className="px-4"
          disabled={converting}
          aria-busy={converting || undefined}
          onClick={onConvert}
        >
          Transformer en commande
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm font-bold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function PassAction({ label }: { label: string }) {
  return (
    <Button href="/app/abonnement" variant="secondary">
      {label}
      <Badge tone="accent">Pass</Badge>
    </Button>
  );
}

export function InterestedView({
  campaign,
  shopName,
  filter,
  rows,
  counts,
  hasMore,
  loading,
  contacts,
  exportable,
  busy,
  copyState,
  error,
  now,
  converting,
  convertError,
  onMore,
  onCopy,
  onArrived,
  onConvert,
}: {
  campaign: InterestedCampaign;
  shopName: string;
  filter: Filter;
  rows: readonly InterestedRow[];
  counts: { yes: number; no: number } | null;
  hasMore: boolean;
  loading: boolean;
  /** respondentContacts: full numbers and WhatsApp buttons. */
  contacts: boolean;
  /** csvExport and respondentContacts: copy the numbers. */
  exportable: boolean;
  busy: boolean;
  copyState: CopyState;
  error: string | null;
  now: Date;
  /** The answer whose order is being made. */
  converting: string | null;
  convertError: { rowId: string; message: string } | null;
  onMore: () => void;
  onCopy: () => void;
  onArrived: () => void;
  onConvert: (responseId: string) => void;
}) {
  const base = `/app/campagnes/${campaign.id}?onglet=interesses`;
  const toExport = exportHref({ ...DEFAULT_EXPORT, answer: filter, campaignId: campaign.id });
  const moment = campaign.status === 'ARRIVED' ? 'ARRIVED' : campaign.availability;
  // A product already in stock never "arrives".
  const canArrive =
    campaign.availability === 'INCOMING' &&
    (campaign.status === 'ACTIVE' || campaign.status === 'CLOSED');

  return (
    <div className="flex flex-col gap-5">
      {canArrive && (
        <Notice
          tone="info"
          title="Le produit est arrivé ?"
          action={
            <Button variant="secondary" disabled={busy} onClick={onArrived}>
              Oui, il est arrivé
            </Button>
          }
        >
          Dis-le ici : tes messages WhatsApp annonceront l&apos;arrivée à tes intéressés.
        </Notice>
      )}

      <div className="flex flex-wrap gap-2.5">
        {exportable ? (
          <Button variant="secondary" onClick={onCopy}>
            <Icon name={copyState === 'copied' ? 'check' : 'copy'} className="size-5" />
            Copier les numéros
          </Button>
        ) : (
          <PassAction label="Copier les numéros" />
        )}
        <Button href={toExport} variant="secondary">
          Télécharger pour Excel
        </Button>
      </div>
      <p role="status" className="text-sm text-ink-soft empty:hidden">
        {copyState === 'idle' ? '' : COPY_FEEDBACK[copyState]}
      </p>

      <FilterBar
        label="Afficher"
        items={[
          {
            id: 'yes',
            label: 'Oui',
            href: base,
            active: filter === 'yes',
            count: counts?.yes ?? 0,
          },
          {
            id: 'no',
            label: 'Non',
            href: `${base}&filtre=non`,
            active: filter === 'no',
            count: counts?.no ?? 0,
          },
        ]}
      />

      {error && <Notice tone="danger">{error}</Notice>}

      {rows.length > 0 && (
        <ul className="flex flex-col divide-y-2 divide-grid">
          {rows.map((row) => {
            const name = row.firstName ?? 'Sans prénom';
            const message = row.interested
              ? interestedMessage({
                  firstName: row.firstName,
                  productName: campaign.productName,
                  quantity: row.quantity,
                  unitLabel: campaign.unitLabel,
                  shopName,
                  moment,
                })
              : clientWhatsappMessage({
                  firstName: row.firstName,
                  shopName,
                  productName: campaign.productName,
                });
            return (
              <li key={row.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink">
                    {row.respondentId ? (
                      <Link href={`/app/clients/${row.respondentId}`} className="hover:underline">
                        {name}
                      </Link>
                    ) : (
                      name
                    )}
                    {row.phone && (
                      <span className="ml-2 text-sm font-normal text-ink-muted">{row.phone}</span>
                    )}
                  </p>
                  <p className="text-sm text-ink-soft">
                    {interestedDetail(row, campaign.unitLabel)}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {relativeTime(new Date(row.completedAt), now)}
                  </p>
                  {row.interested && row.respondentId && (
                    <OrderAction
                      row={row}
                      converting={converting === row.id}
                      error={convertError?.rowId === row.id ? convertError.message : null}
                      onConvert={() => onConvert(row.id)}
                    />
                  )}
                </div>
                {contacts && row.phoneE164 ? (
                  <a
                    href={waChatLink(row.phoneE164, message)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Écrire à ${name} sur WhatsApp`}
                    className="frame flex size-12 shrink-0 items-center justify-center rounded-full bg-whatsapp text-whatsapp-ink transition-transform hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  >
                    <Icon name="whatsapp" />
                  </a>
                ) : (
                  row.phone && (
                    <Link
                      href="/app/abonnement"
                      aria-label={lockedContactText(row.firstName)}
                      title={lockedContactText(row.firstName)}
                      className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-grid bg-surface text-ink-muted hover:border-ink"
                    >
                      <Icon name="lock" className="size-5" />
                    </Link>
                  )
                )}
              </li>
            );
          })}
        </ul>
      )}

      {loading && (
        <div aria-hidden="true" className="flex flex-col gap-2 motion-safe:animate-pulse">
          <span className="h-[72px] rounded-card bg-grid/70" />
          <span className="h-[72px] rounded-card bg-grid/70" />
        </div>
      )}

      {!loading &&
        !error &&
        rows.length === 0 &&
        (filter === 'yes' ? (
          <EmptyState title="Pas encore d'intéressé">
            Les personnes qui répondent « oui » apparaîtront ici, avec leur quantité.
          </EmptyState>
        ) : (
          <p className="text-ink-soft">Personne n&apos;a dit non pour l&apos;instant.</p>
        ))}

      {hasMore && !loading && (
        <Button variant="secondary" onClick={onMore}>
          Voir plus
        </Button>
      )}
    </div>
  );
}

interface Listing {
  items: InterestedRow[];
  next: string | null;
  counts: { yes: number; no: number } | null;
  loading: boolean;
  error: string | null;
}

const EMPTY: Listing = { items: [], next: null, counts: null, loading: true, error: null };

/** Loads the list page by page (?filtre=non for the no answers) and runs the actions. */
export function InterestedTab({
  shopId,
  shopName,
  campaign,
  contacts,
  exportable,
  busy,
  onArrived,
}: {
  shopId: string;
  shopName: string;
  campaign: InterestedCampaign;
  contacts: boolean;
  exportable: boolean;
  busy: boolean;
  onArrived: () => void;
}) {
  const params = useSearchParams();
  const filter: Filter = params.get('filtre') === 'non' ? 'no' : 'yes';
  const [list, setList] = useState<Listing>(EMPTY);
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const [actionError, setActionError] = useState<string | null>(null);
  const [converting, setConverting] = useState<string | null>(null);
  const [convertError, setConvertError] = useState<{ rowId: string; message: string } | null>(null);
  // A second tap before the button disables never sends a second request.
  const inFlight = useRef(false);
  const path = `/api/shops/${shopId}/campaigns/${encodeURIComponent(campaign.id)}`;

  const load = useCallback(
    async (cursor: string | null, keep: InterestedRow[]) => {
      setList((l) => ({ ...l, loading: true, error: null }));
      const query = new URLSearchParams({ filtre: filter === 'yes' ? 'oui' : 'non' });
      if (cursor) query.set('cursor', cursor);
      try {
        const page = await api<InterestedPage>(`${path}/responses?${query.toString()}`);
        setList((l) => ({
          items: [...keep, ...page.items],
          next: page.nextCursor,
          counts: page.counts ?? l.counts,
          loading: false,
          error: null,
        }));
      } catch (err) {
        setList((l) => ({ ...l, loading: false, error: errorMessage(err) }));
      }
    },
    [path, filter],
  );

  useEffect(() => {
    setList((l) => ({ ...EMPTY, counts: l.counts }));
    void load(null, []);
  }, [load]);

  useEffect(() => {
    if (copyState === 'idle') return;
    const t = setTimeout(() => setCopyState('idle'), 4000);
    return () => clearTimeout(t);
  }, [copyState]);

  async function copy() {
    setActionError(null);
    try {
      const n = await copyInterestedNumbers(shopId, campaign.id);
      setCopyState(n === null ? 'failed' : n === 0 ? 'empty' : 'copied');
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function convert(responseId: string) {
    if (inFlight.current) return;
    inFlight.current = true;
    setConverting(responseId);
    setConvertError(null);
    try {
      const orderId = await convertToOrder(shopId, campaign.id, responseId);
      setList((l) => ({
        ...l,
        items: l.items.map((r) => (r.id === responseId ? { ...r, orderId } : r)),
      }));
    } catch (err) {
      setConvertError({ rowId: responseId, message: errorMessage(err) });
      // Made from another tab: the first page brings its link back.
      if (err instanceof ApiError && err.code === 'ORDER_ALREADY_EXISTS') void load(null, []);
    } finally {
      inFlight.current = false;
      setConverting(null);
    }
  }

  return (
    <InterestedView
      campaign={campaign}
      shopName={shopName}
      filter={filter}
      rows={list.items}
      counts={list.counts}
      hasMore={list.next !== null}
      loading={list.loading}
      contacts={contacts}
      exportable={exportable}
      busy={busy}
      copyState={copyState}
      error={list.error ?? actionError}
      now={new Date()}
      converting={converting}
      convertError={convertError}
      onMore={() => void load(list.next, list.items)}
      onCopy={() => void copy()}
      onArrived={onArrived}
      onConvert={(id) => void convert(id)}
    />
  );
}

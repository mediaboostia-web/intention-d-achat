'use client';

// The « Exporter » page (lot 6b, retours §6): what to export, its filters,
// a preview of the first 10 rows, then the file or the numbers for a
// follow-up. The address holds the query (lib/tamani/export-view.ts), so
// the Intéressés tab and the client book open it already filtered.
// ExportScreen loads; ExportView draws from its props.
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Badge, Button, FilterBar, Icon, Notice, PageHeader, Select } from '@/components/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';
import { NO_CLIENT_FILTERS, periodLabel, recentMonths } from '@/lib/tamani/client-filters';
import { DownloadError, downloadFile } from '@/lib/tamani/download';
import {
  DEFAULT_EXPORT,
  exportHref,
  exportSearch,
  parseExportSearch,
  type ExportAnswer,
  type ExportPreview,
  type ExportQuery,
} from '@/lib/tamani/export-view';
import { BUYER_TYPE_LABELS, type BuyerType } from '@/lib/tamani/labels';
import { phoneCountryChoices } from '@/lib/tamani/phone-countries';
import { PLANS } from '@/lib/tamani/plans';
import { TIMING_LABELS, type Timing } from '@/lib/tamani/timing';
import type { FilterChoices } from './ClientFilters';
import { copyText } from './CopyButton';
import { useShop } from './ShopProvider';

const lines = (n: number) => `${n.toLocaleString('fr-FR')} ligne${n > 1 ? 's' : ''}`;

/** The same filters, read as answers or as clients, when « Quoi » changes. */
function asResponses(q: ExportQuery, answer: ExportAnswer): ExportQuery {
  if (q.what === 'responses') return { ...q, answer };
  const f = q.filters;
  return {
    ...DEFAULT_EXPORT,
    answer,
    campaignId: f.campaignId,
    period: f.period,
    zone: f.zone,
    buyerType: f.type,
    country: f.country,
  };
}

function asClients(q: ExportQuery): ExportQuery {
  if (q.what === 'clients') return q;
  return {
    what: 'clients',
    filters: {
      ...NO_CLIENT_FILTERS,
      answer: q.answer === 'all' ? null : q.answer,
      campaignId: q.campaignId,
      period: q.period,
      zone: q.zone,
      type: q.buyerType,
      country: q.country,
    },
  };
}

const PERIODS = ['ce-mois', 'mois-dernier', '3-mois'];

function Filters({
  query,
  choices,
  onChange,
}: {
  query: ExportQuery;
  choices: FilterChoices;
  onChange: (next: ExportQuery) => void;
}) {
  // The filters both kinds share, under the names of the client book.
  const shared =
    query.what === 'clients'
      ? query.filters
      : {
          campaignId: query.campaignId,
          period: query.period,
          zone: query.zone,
          type: query.buyerType,
          country: query.country,
        };
  const set = (patch: {
    campaignId?: string | null;
    period?: string | null;
    zone?: string | null;
    type?: BuyerType | null;
    country?: string | null;
  }) => {
    if (query.what === 'clients') {
      onChange({ what: 'clients', filters: { ...query.filters, ...patch } });
      return;
    }
    const { type, ...rest } = patch;
    onChange({ ...query, ...rest, ...(type !== undefined && { buyerType: type }) });
  };
  const value = (e: { target: { value: string } }) => e.target.value || null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {query.what === 'clients' && (
        <Select
          id="export-answer"
          label="Réponse"
          value={query.filters.answer ?? ''}
          onChange={(e) =>
            onChange({
              what: 'clients',
              filters: { ...query.filters, answer: value(e) as 'yes' | 'no' | null },
            })
          }
          options={[
            { value: '', label: 'Toutes les réponses' },
            { value: 'yes', label: 'Intéressés' },
            { value: 'no', label: 'Pas intéressés' },
          ]}
        />
      )}
      <Select
        id="export-campaign"
        label="Campagne"
        value={shared.campaignId ?? ''}
        onChange={(e) => set({ campaignId: value(e) })}
        options={[
          { value: '', label: 'Toutes les campagnes' },
          ...choices.campaigns.map((c) => ({ value: c.id, label: c.title })),
        ]}
      />
      <Select
        id="export-period"
        label="Période de la réponse"
        value={shared.period ?? ''}
        onChange={(e) => set({ period: value(e) })}
        options={[
          { value: '', label: 'Toutes les dates' },
          ...[...PERIODS, ...choices.months].map((p) => ({ value: p, label: periodLabel(p) })),
        ]}
      />
      <Select
        id="export-zone"
        label="Quartier"
        value={shared.zone ?? ''}
        onChange={(e) => set({ zone: value(e) })}
        options={[
          { value: '', label: 'Tous les quartiers' },
          ...choices.zones.map((z) => ({ value: z.id, label: z.name })),
          { value: 'OTHER', label: 'Autre endroit' },
        ]}
      />
      {query.what === 'responses' && (
        <Select
          id="export-timing"
          label="Quand"
          value={query.timing ?? ''}
          onChange={(e) => onChange({ ...query, timing: value(e) as Timing | null })}
          options={[
            { value: '', label: 'Tous les moments' },
            ...(Object.keys(TIMING_LABELS) as Timing[]).map((t) => ({
              value: t,
              label: TIMING_LABELS[t],
            })),
          ]}
        />
      )}
      <Select
        id="export-type"
        label="Achète pour"
        value={shared.type ?? ''}
        onChange={(e) => set({ type: value(e) as BuyerType | null })}
        options={[
          { value: '', label: 'Revendeurs et usagers' },
          { value: 'RESELLER', label: BUYER_TYPE_LABELS.RESELLER },
          { value: 'CONSUMER', label: BUYER_TYPE_LABELS.CONSUMER },
        ]}
      />
      <Select
        id="export-country"
        label="Pays du numéro"
        value={shared.country ?? ''}
        onChange={(e) => set({ country: value(e) })}
        options={[
          { value: '', label: 'Tous les pays' },
          ...choices.countries.map((c) => ({ value: c.code, label: c.label })),
        ]}
      />
    </div>
  );
}

function PreviewTable({ preview }: { preview: ExportPreview }) {
  return (
    // The table scrolls sideways inside its frame, never the page.
    <div className="frame overflow-x-auto rounded-card bg-surface">
      <table className="w-max min-w-full border-collapse text-left text-sm">
        <thead>
          <tr>
            {preview.headers.map((h) => (
              <th
                key={h}
                scope="col"
                className="border-b-2 border-grid px-3 py-2 font-bold whitespace-nowrap text-ink"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {preview.rows.map((row, i) => (
            <tr key={i} className="border-b border-grid last:border-b-0">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 whitespace-nowrap text-ink">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ExportView({
  query,
  preview,
  choices,
  canDownload,
  busy,
  feedback,
  onChange,
  onDownload,
  onCopy,
}: {
  query: ExportQuery;
  /** Null while the first preview loads. */
  preview: ExportPreview | null;
  choices: FilterChoices;
  /** csvExport and respondentContacts: download the file, copy the numbers. */
  canDownload: boolean;
  busy: boolean;
  feedback: string | null;
  onChange: (next: ExportQuery) => void;
  onDownload: () => void;
  onCopy: () => void;
}) {
  const answer = query.what === 'responses' ? query.answer : null;
  const total = preview?.total ?? 0;
  const off = busy || preview === null || total === 0;

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="export-what" className="flex flex-col gap-3">
        <h2 id="export-what" className="font-hand text-2xl font-bold text-primary">
          Quoi
        </h2>
        <FilterBar
          label="Quoi exporter"
          items={[
            {
              id: 'yes',
              label: 'Intéressés',
              href: exportHref(asResponses(query, 'yes')),
              active: answer === 'yes',
            },
            {
              id: 'no',
              label: 'Pas intéressés',
              href: exportHref(asResponses(query, 'no')),
              active: answer === 'no',
            },
            {
              id: 'all',
              label: 'Toutes les réponses',
              href: exportHref(asResponses(query, 'all')),
              active: answer === 'all',
            },
            {
              id: 'clients',
              label: 'Clients',
              icon: 'user',
              href: exportHref(asClients(query)),
              active: query.what === 'clients',
            },
          ]}
        />
      </section>

      <section aria-labelledby="export-filters" className="flex flex-col gap-3">
        <h2 id="export-filters" className="font-hand text-2xl font-bold text-primary">
          Filtres
        </h2>
        <Filters query={query} choices={choices} onChange={onChange} />
      </section>

      <section aria-labelledby="export-preview" className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="export-preview" className="font-hand text-2xl font-bold text-primary">
            Aperçu
          </h2>
          {preview && <p className="font-bold text-ink">{lines(total)}</p>}
        </div>
        {preview === null ? (
          <p className="text-ink-soft">Aperçu en cours…</p>
        ) : total === 0 ? (
          <p className="text-ink-soft">Rien à exporter avec ces filtres.</p>
        ) : (
          <>
            <PreviewTable preview={preview} />
            {total > preview.rows.length && preview.rows.length > 0 && (
              <p className="text-sm text-ink-soft">
                Les {preview.rows.length} premières lignes. Le fichier les a toutes.
              </p>
            )}
          </>
        )}
      </section>

      <div className="flex flex-wrap gap-2.5">
        {canDownload ? (
          <>
            <Button disabled={off} onClick={onDownload}>
              Télécharger ({lines(total)})
            </Button>
            <Button variant="secondary" disabled={off} onClick={onCopy}>
              <Icon name="copy" className="size-5" />
              Copier les numéros
            </Button>
          </>
        ) : (
          <Button href="/app/plus#forfait" variant="secondary">
            Passe au Pro pour télécharger
            <Badge tone="accent">Pro</Badge>
          </Button>
        )}
      </div>
      <p role="status" className="text-sm text-ink-soft empty:hidden">
        {feedback ?? ''}
      </p>
    </div>
  );
}

function downloadMessage(err: unknown): string {
  if (!(err instanceof DownloadError)) return 'Le téléchargement a échoué. Réessaie.';
  if (err.status === 0) return 'Pas de connexion. Réessaie quand le réseau revient.';
  if (err.status === 401) return 'Ta session a expiré : reconnecte-toi.';
  if (err.status === 403) return 'Cette fonction vient avec le forfait Pro.';
  return 'Le téléchargement a échoué. Réessaie.';
}

export function ExportScreen() {
  const { shop } = useShop();
  const params = useSearchParams();
  const router = useRouter();
  const search = params.toString();
  // An address the parser refuses opens on the interested answers.
  const query = useMemo(
    () => parseExportSearch(new URLSearchParams(search)) ?? DEFAULT_EXPORT,
    [search],
  );
  const qs = exportSearch(query);
  const features = PLANS[shop.plan.id].features;
  const canDownload = features.csvExport && features.respondentContacts;
  const [preview, setPreview] = useState<ExportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [lists, setLists] = useState<Pick<FilterChoices, 'campaigns' | 'zones'>>({
    campaigns: [],
    zones: [],
  });
  const choices: FilterChoices = useMemo(
    () => ({
      ...lists,
      countries: phoneCountryChoices(shop.country),
      months: recentMonths(new Date()),
    }),
    [lists, shop.country],
  );

  useEffect(() => {
    let live = true;
    void Promise.all([
      api<{ items: Array<{ id: string; title: string }> }>(
        `/api/shops/${shop.id}/campaigns?limit=50`,
      ),
      api<{ items: Array<{ id: string; name: string }> }>(`/api/shops/${shop.id}/zones`),
    ])
      .then(([campaigns, zones]) => {
        if (live) setLists({ campaigns: campaigns.items, zones: zones.items });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [shop.id]);

  // The preview reloads 300 ms after the last change.
  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      api<ExportPreview>(`/api/shops/${shop.id}/exports/preview?${qs}`)
        .then((p) => {
          if (!live) return;
          setPreview(p);
          setError(null);
        })
        .catch((err: unknown) => {
          if (live) setError(errorMessage(err));
        });
    }, 300);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [shop.id, qs]);

  async function download() {
    setFeedback(null);
    setBusy(true);
    try {
      await downloadFile(`/api/shops/${shop.id}/exports/file?${qs}`, 'tamani-export.csv');
    } catch (err) {
      setFeedback(downloadMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    setFeedback(null);
    setBusy(true);
    try {
      const { numbers } = await api<{ numbers: string[] }>(
        `/api/shops/${shop.id}/exports/numbers?${qs}`,
      );
      if (numbers.length === 0) setFeedback('Aucun numéro à copier avec ces filtres.');
      else if (await copyText(numbers.join('\n'))) {
        setFeedback(
          `${numbers.length} numéro${numbers.length > 1 ? 's' : ''} copié${numbers.length > 1 ? 's' : ''}. Colle-les dans une liste de diffusion WhatsApp.`,
        );
      } else setFeedback('La copie a échoué. Réessaie.');
    } catch (err) {
      setFeedback(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Exporter"
        note="Choisis quoi exporter, regarde l'aperçu, puis télécharge le fichier pour Excel."
      />
      {error && (
        <Notice tone="danger" title="L'aperçu n'a pas pu se charger" className="mt-4">
          {error}
        </Notice>
      )}
      <div className="mt-6">
        <ExportView
          query={query}
          preview={preview}
          choices={choices}
          canDownload={canDownload}
          busy={busy}
          feedback={feedback}
          onChange={(next) => router.replace(exportHref(next), { scroll: false })}
          onDownload={() => void download()}
          onCopy={() => void copy()}
        />
      </div>
    </div>
  );
}

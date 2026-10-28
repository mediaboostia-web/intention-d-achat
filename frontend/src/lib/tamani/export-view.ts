// What the « Exporter » page exports (lot 6b, retours §6), kept in the
// address: the answers (interested, not, or all) with their filters, or the
// clients with the client book's filters. Pure and shared: the page writes
// it, the export routes read it with the same parser.
import {
  NO_CLIENT_FILTERS,
  clientFilterSearch,
  parseClientSearch,
  type ClientFilterState,
} from './client-filters';
import type { BuyerType } from './labels';
import { TIMING_LABELS, type Timing } from './timing';

export type ExportAnswer = 'yes' | 'no' | 'all';

export interface ResponsesExport {
  what: 'responses';
  answer: ExportAnswer;
  campaignId: string | null;
  period: string | null;
  /** A zone id, or OTHER for « Autre endroit ». */
  zone: string | null;
  timing: Timing | null;
  buyerType: BuyerType | null;
  country: string | null;
}

export interface ClientsExport {
  what: 'clients';
  filters: ClientFilterState;
}

export type ExportQuery = ResponsesExport | ClientsExport;

/** The first rows of an export as the file holds them, already in French. */
export interface ExportPreview {
  total: number;
  headers: string[];
  rows: string[][];
}

export const DEFAULT_EXPORT: ResponsesExport = {
  what: 'responses',
  answer: 'yes',
  campaignId: null,
  period: null,
  zone: null,
  timing: null,
  buyerType: null,
  country: null,
};

const ANSWERS: Readonly<Record<string, ExportAnswer>> = { oui: 'yes', non: 'no', toutes: 'all' };
const ANSWER_PARAMS: Readonly<Record<ExportAnswer, string>> = {
  yes: 'oui',
  no: 'non',
  all: 'toutes',
};

/** ?quoi=reponses|clients and its filters; null when one is unknown (the API answers 400). */
export function parseExportSearch(params: URLSearchParams): ExportQuery | null {
  const what = params.get('quoi');
  const rest = new URLSearchParams(params);
  rest.delete('quoi');
  if (what === 'clients') {
    rest.delete('echeance');
    const filters = parseClientSearch(rest);
    return filters ? { what: 'clients', filters } : null;
  }
  if (what !== null && what !== 'reponses') return null;
  const answer = params.get('reponse');
  const timing = params.get('echeance');
  if (answer !== null && !Object.hasOwn(ANSWERS, answer)) return null;
  if (timing !== null && !Object.hasOwn(TIMING_LABELS, timing)) return null;
  // The other filters are the client book's: same names, same checks.
  rest.delete('reponse');
  rest.delete('echeance');
  rest.delete('q');
  const shared = parseClientSearch(rest);
  if (!shared) return null;
  return {
    what: 'responses',
    answer: answer === null ? 'yes' : (ANSWERS[answer] ?? 'yes'),
    campaignId: shared.campaignId,
    period: shared.period,
    zone: shared.zone,
    timing: timing as Timing | null,
    buyerType: shared.type,
    country: shared.country,
  };
}

/** The export as an address query, in a stable order. */
export function exportSearch(q: ExportQuery): string {
  if (q.what === 'clients') {
    const filters = clientFilterSearch(q.filters);
    return filters ? `quoi=clients&${filters}` : 'quoi=clients';
  }
  const out = new URLSearchParams({ quoi: 'reponses', reponse: ANSWER_PARAMS[q.answer] });
  const shared = clientFilterSearch({
    ...NO_CLIENT_FILTERS,
    campaignId: q.campaignId,
    period: q.period,
    zone: q.zone,
  });
  for (const [k, v] of new URLSearchParams(shared)) out.set(k, v);
  if (q.timing) out.set('echeance', q.timing);
  if (q.buyerType) out.set('type', q.buyerType === 'RESELLER' ? 'revendeurs' : 'usagers');
  if (q.country) out.set('pays', q.country);
  return out.toString();
}

/** The « Exporter » page opened on a query. */
export function exportHref(q: ExportQuery): string {
  return `/app/exporter?${exportSearch(q)}`;
}

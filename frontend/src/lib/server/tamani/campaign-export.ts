// The Excel exports (spec §5.4, lot 6b retours §6): one French row per
// counted answer, or per client, and the file's name. The preview shows the
// same cells, so both read them from here.
import 'server-only';
import {
  BUYER_TYPE_LABELS,
  NOT_INTERESTED_REASON_LABELS,
  type BuyerType,
} from '@/lib/tamani/labels';
import type { InterestedRow } from '@/lib/tamani/results-view';
import { countryName } from '@/lib/tamani/phone-countries';
import { TIMING_LABELS } from '@/lib/tamani/timing';
import { toExcelCsv } from './csv';

type Cells = Record<string, string | number | null>;

/** An answer of the export: an interested-list row and its product. */
export interface ExportResponseRow extends InterestedRow {
  productName: string | null;
}

/** A client of the export, their counted answers summed up. */
export interface ExportClientRow {
  firstName: string | null;
  phone: string | null;
  country: string | null;
  kind: BuyerType | null;
  topZone: string | null;
  responses: number;
  yes: number;
  lastAt: string | null;
  lastProduct: string | null;
}

export const RESPONSE_COLUMNS = [
  { key: 'date', header: 'Date' },
  { key: 'product', header: 'Produit' },
  { key: 'firstName', header: 'Prénom' },
  { key: 'phone', header: 'Numéro WhatsApp' },
  { key: 'country', header: 'Pays' },
  { key: 'interested', header: 'Intéressé' },
  { key: 'reason', header: 'Raison du non' },
  { key: 'buyerType', header: 'Achète pour' },
  { key: 'quantity', header: 'Quantité' },
  { key: 'option', header: 'Option' },
  { key: 'timing', header: 'Quand' },
  { key: 'delivery', header: 'Livraison' },
  { key: 'zone', header: 'Quartier' },
  { key: 'place', header: 'Lieu' },
  { key: 'source', header: 'Source' },
] as const;

export const CLIENT_COLUMNS = [
  { key: 'firstName', header: 'Prénom' },
  { key: 'phone', header: 'Numéro WhatsApp' },
  { key: 'country', header: 'Pays' },
  { key: 'kind', header: 'Achète pour' },
  { key: 'topZone', header: 'Quartier le plus fréquent' },
  { key: 'responses', header: 'Réponses' },
  { key: 'yes', header: 'Oui' },
  { key: 'lastAt', header: 'Dernière réponse' },
  { key: 'lastProduct', header: 'Dernier produit' },
] as const;

const pad = (n: number) => String(n).padStart(2, '0');

/** "26/10/2026 09:05", in UTC (Dakar time). */
function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function responseCells(r: ExportResponseRow): Cells {
  return {
    date: formatDate(r.completedAt),
    product: r.productName,
    firstName: r.firstName,
    phone: r.phone,
    country: r.country ? countryName(r.country) : null,
    interested: r.interested ? 'Oui' : 'Non',
    reason: r.reason ? NOT_INTERESTED_REASON_LABELS[r.reason] : null,
    buyerType: r.buyerType ? BUYER_TYPE_LABELS[r.buyerType] : null,
    quantity: r.quantity,
    option: r.option,
    timing: r.timing ? TIMING_LABELS[r.timing] : null,
    delivery: r.wantsDelivery === null ? null : r.wantsDelivery ? 'Livraison' : 'Retrait',
    zone: r.zoneName,
    place: r.deliveryPlace,
    source: r.sourceLabel,
  };
}

export function clientCells(r: ExportClientRow): Cells {
  return {
    firstName: r.firstName,
    phone: r.phone,
    country: r.country ? countryName(r.country) : null,
    kind: r.kind ? BUYER_TYPE_LABELS[r.kind] : null,
    topZone: r.topZone,
    responses: r.responses,
    yes: r.yes,
    lastAt: r.lastAt ? formatDate(r.lastAt) : null,
    lastProduct: r.lastProduct,
  };
}

export function responsesCsv(rows: readonly ExportResponseRow[]): string {
  return toExcelCsv(RESPONSE_COLUMNS, rows.map(responseCells));
}

export function clientsCsv(rows: readonly ExportClientRow[]): string {
  return toExcelCsv(CLIENT_COLUMNS, rows.map(clientCells));
}

/** The name given most often, newest first so a tie keeps the most recent; null without any. */
export function mostFrequent(names: ReadonlyArray<string | null>): string | null {
  const counts = new Map<string, number>();
  let best: string | null = null;
  for (const name of names) {
    if (name === null) continue;
    const n = (counts.get(name) ?? 0) + 1;
    counts.set(name, n);
    if (best === null || n > (counts.get(best) ?? 0)) best = name;
  }
  return best;
}

export type ExportKind = 'interesses' | 'pas-interesses' | 'reponses' | 'clients';

/** "tamani-interesses-riz-2026-10-28.csv": what, the campaign in plain letters if one, and the day. */
export function exportFilename(kind: ExportKind, title: string | null, now: Date): string {
  const slug = (title ?? '')
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');
  const day = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}`;
  return `tamani-${kind}${slug ? `-${slug}` : ''}-${day}.csv`;
}

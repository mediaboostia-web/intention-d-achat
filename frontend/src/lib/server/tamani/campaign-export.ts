// The Excel export of a campaign's answers (spec §5.4): one French row per
// counted answer, and the file's name.
import 'server-only';
import { BUYER_TYPE_LABELS, NOT_INTERESTED_REASON_LABELS } from '@/lib/tamani/labels';
import type { InterestedRow } from '@/lib/tamani/results-view';
import { countryName } from '@/lib/tamani/phone-countries';
import { TIMING_LABELS } from '@/lib/tamani/timing';
import { toExcelCsv } from './csv';

const COLUMNS = [
  { key: 'date', header: 'Date' },
  { key: 'firstName', header: 'Prénom' },
  { key: 'phone', header: 'Numéro WhatsApp' },
  { key: 'country', header: 'Pays' },
  { key: 'interested', header: 'Intéressé' },
  { key: 'buyerType', header: 'Achète pour' },
  { key: 'quantity', header: 'Quantité' },
  { key: 'option', header: 'Option' },
  { key: 'timing', header: 'Quand' },
  { key: 'delivery', header: 'Livraison' },
  { key: 'zone', header: 'Quartier' },
  { key: 'place', header: 'Lieu' },
  { key: 'reason', header: 'Raison du non' },
  { key: 'source', header: 'Source' },
] as const;

const pad = (n: number) => String(n).padStart(2, '0');

/** "26/10/2026 09:05", in UTC (Dakar time). */
function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function responsesCsv(rows: readonly InterestedRow[]): string {
  return toExcelCsv(
    COLUMNS,
    rows.map((r) => ({
      date: formatDate(r.completedAt),
      firstName: r.firstName,
      phone: r.phone,
      country: r.country ? countryName(r.country) : null,
      interested: r.interested ? 'Oui' : 'Non',
      buyerType: r.buyerType ? BUYER_TYPE_LABELS[r.buyerType] : null,
      quantity: r.quantity,
      option: r.option,
      timing: r.timing ? TIMING_LABELS[r.timing] : null,
      delivery: r.wantsDelivery === null ? null : r.wantsDelivery ? 'Livraison' : 'Retrait',
      zone: r.zoneName,
      place: r.deliveryPlace,
      reason: r.reason ? NOT_INTERESTED_REASON_LABELS[r.reason] : null,
      source: r.sourceLabel,
    })),
  );
}

/** "tamani-marmites-inox-5-l-2026-10-27.csv": the campaign in plain letters, and the day. */
export function exportFilename(title: string, now: Date): string {
  const slug =
    title
      .normalize('NFD')
      .replace(/\p{Mn}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40)
      .replace(/-+$/, '') || 'campagne';
  const day = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}`;
  return `tamani-${slug}-${day}.csv`;
}

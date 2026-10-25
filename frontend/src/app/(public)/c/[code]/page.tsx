// /c/[code] — the link a wholesaler shares on WhatsApp (spec §5.3, §6.6).
// Rendered on the server so the product shows before any script runs; the
// sheet's taps are the only client code.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { popupMetadata } from '@/lib/tamani/popup-metadata';
import { loadCampaign } from './load-campaign';
import { PopupSheet } from './popup-sheet';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const campaign = await loadCampaign((await params).code);
  return popupMetadata(campaign, process.env.APP_URL ?? 'http://localhost:3000');
}

export default async function PopupPage({ params }: Props) {
  const campaign = await loadCampaign((await params).code);
  if (!campaign) notFound();
  return <PopupSheet campaign={campaign} />;
}

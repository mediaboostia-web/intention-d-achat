// /c/[code] — the link a wholesaler shares on WhatsApp (spec §5.3, §6.6).
// Rendered on the server so the product shows before any script runs; the
// sheet's taps are the only client code.
import { notFound } from 'next/navigation';
import { loadCampaign } from './load-campaign';
import { PopupSheet } from './popup-sheet';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ code: string }> };

export default async function PopupPage({ params }: Props) {
  const campaign = await loadCampaign((await params).code);
  if (!campaign) notFound();
  return <PopupSheet campaign={campaign} />;
}

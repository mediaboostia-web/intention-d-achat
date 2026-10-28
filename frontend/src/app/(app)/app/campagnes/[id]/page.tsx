'use client';

// /app/campagnes/[id]: a campaign's results, its interested people, its
// share links and its settings, one tab each (?onglet=…).
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { CampaignActions } from '@/components/app/CampaignActions';
import { CampaignResultsTab } from '@/components/app/CampaignResults';
import { InterestedTab } from '@/components/app/InterestedList';
import { CampaignEditForm, type CampaignPatchBody } from '@/components/app/CampaignEditForm';
import { ShareCard } from '@/components/app/ShareCard';
import { useShop } from '@/components/app/ShopProvider';
import { SourceLinks } from '@/components/app/SourceLinks';
import { Button, CampaignStatusBadge, Notice, PageHeader, Tabs } from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';
import type { CampaignStatus } from '@/lib/tamani/campaign-actions';
import type { ShopCampaign, ShopLink } from '@/lib/tamani/campaign-view';
import { PLANS } from '@/lib/tamani/plans';
import { campaignTab, campaignTabs } from '@/lib/tamani/results-view';
import { formatPriceLine } from '@/lib/tamani/share-message';

const NOT_LIVE: Record<Exclude<CampaignStatus, 'ACTIVE'>, string> = {
  DRAFT: "Ce brouillon n'est pas encore en ligne. Lance-le pour que ta communauté puisse répondre.",
  CLOSED: 'Cette campagne est terminée : son lien ne prend plus de réponses. Rouvre-la si besoin.',
  ARRIVED: 'Le produit est arrivé : cette campagne ne prend plus de réponses.',
};

function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const justSent = params.get('partager') === '1';
  const { shop } = useShop();
  const { toast } = useToast();
  const [campaign, setCampaign] = useState<ShopCampaign | null>(null);
  const [links, setLinks] = useState<ShopLink[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const path = `/api/shops/${shop.id}/campaigns/${encodeURIComponent(id)}`;

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await api<{ campaign: ShopCampaign; links: ShopLink[] }>(path);
      setCampaign(res.campaign);
      setLinks(res.links);
    } catch (err) {
      setLoadError(errorMessage(err));
    }
  }, [path]);

  useEffect(() => {
    void load();
  }, [load]);

  async function move(to: CampaignStatus) {
    if (
      to === 'CLOSED' &&
      !window.confirm('Terminer cette campagne ? Ta communauté ne pourra plus répondre.')
    ) {
      return;
    }
    setBusy(true);
    setMoveError(null);
    try {
      const res = await api<{ campaign: ShopCampaign }>(path, {
        method: 'PATCH',
        body: { status: to },
      });
      setCampaign(res.campaign);
    } catch (err) {
      setMoveError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function save(body: CampaignPatchBody) {
    setSaveError(null);
    try {
      const res = await api<{ campaign: ShopCampaign }>(path, { method: 'PATCH', body });
      setCampaign(res.campaign);
      toast('Campagne enregistrée.', 'success');
    } catch (err) {
      setSaveError(errorMessage(err));
    }
  }

  if (loadError) {
    return (
      <Notice
        tone="danger"
        action={
          <Button href="/app/campagnes" variant="secondary">
            Revenir aux campagnes
          </Button>
        }
      >
        {loadError}
      </Notice>
    );
  }
  if (!campaign) {
    return (
      <div role="status" className="flex flex-col gap-4 motion-safe:animate-pulse">
        <span className="sr-only">Chargement de la campagne…</span>
        <span aria-hidden="true" className="h-10 w-2/3 rounded-card bg-grid/70" />
        <span aria-hidden="true" className="h-40 rounded-card bg-grid/70" />
      </div>
    );
  }

  const base = `/app/campagnes/${campaign.id}`;
  const features = PLANS[shop.plan.id].features;
  const locked = !features.sourceLinks;
  const tab = campaignTab(params.get('onglet'), params.get('partager'), campaign.status);

  return (
    <>
      <PageHeader
        title={campaign.title}
        note={
          campaign.title === campaign.product.name
            ? formatPriceLine(campaign.product)
            : `${campaign.product.name}, ${formatPriceLine(campaign.product)}`
        }
        action={<CampaignStatusBadge status={campaign.status} />}
      />
      {justSent && (
        <Notice tone="info" className="mt-6">
          {campaign.status === 'ACTIVE'
            ? 'Ta campagne est en ligne. Partage-la maintenant sur WhatsApp.'
            : 'Brouillon enregistré. Lance-le quand tu es prêt.'}
        </Notice>
      )}
      <CampaignActions
        className="mt-6"
        status={campaign.status}
        availability={campaign.availability}
        busy={busy}
        onMove={(to) => void move(to)}
      />
      {moveError && (
        <Notice tone="danger" className="mt-4">
          {moveError}
        </Notice>
      )}
      <Tabs className="mt-8" label="Campagne" items={campaignTabs(base, tab, campaign.status)} />
      <div className="mt-6">
        {tab === 'results' ? (
          <CampaignResultsTab
            shopId={shop.id}
            campaignId={campaign.id}
            productId={campaign.productId}
            unitLabel={campaign.product.unitLabel}
          />
        ) : tab === 'interested' ? (
          <InterestedTab
            shopId={shop.id}
            shopName={shop.name}
            campaign={{
              id: campaign.id,
              productName: campaign.product.name,
              unitLabel: campaign.product.unitLabel,
              status: campaign.status,
              availability: campaign.availability,
            }}
            contacts={features.respondentContacts}
            exportable={features.respondentContacts && features.csvExport}
            busy={busy}
            onArrived={() => void move('ARRIVED')}
          />
        ) : tab === 'edit' ? (
          <CampaignEditForm key={campaign.id} campaign={campaign} error={saveError} onSave={save} />
        ) : campaign.status === 'ACTIVE' && campaign.defaultLink ? (
          <div className="flex flex-col gap-10">
            <ShareCard message={campaign.shareMessage} url={campaign.defaultLink.url} />
            <SourceLinks shopId={shop.id} campaignId={campaign.id} links={links} locked={locked} />
          </div>
        ) : (
          <Notice tone="warning">
            {campaign.status === 'ACTIVE'
              ? "Cette campagne n'a pas encore de lien. Recharge la page."
              : NOT_LIVE[campaign.status]}
          </Notice>
        )}
      </div>
    </>
  );
}

export default function CampaignPage() {
  return (
    <Suspense fallback={null}>
      <CampaignDetail />
    </Suspense>
  );
}

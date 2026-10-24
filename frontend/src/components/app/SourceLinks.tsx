'use client';

// One link per source (a WhatsApp group, a status, a market) tells where
// the interested people come from. A Pro feature: on the free plan the
// section explains it instead of offering a form that would be refused.
import { useState, type FormEvent } from 'react';
import { Badge, Button, Icon, Input, Notice } from '@/components/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';
import type { ShopLink } from '@/lib/tamani/campaign-view';
import { CopyButton } from './CopyButton';

const opens = (n: number) =>
  n === 0 ? 'Pas encore ouvert' : n === 1 ? '1 ouverture' : `${n} ouvertures`;

export function SourceLinks({
  shopId,
  campaignId,
  links,
  locked,
}: {
  shopId: string;
  campaignId: string;
  links: ShopLink[];
  locked: boolean;
}) {
  const [items, setItems] = useState(links);
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!label.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await api<{ link: ShopLink }>(
        `/api/shops/${shopId}/campaigns/${campaignId}/links`,
        { method: 'POST', body: { label: label.trim() } },
      );
      setItems((current) => [...current, res.link]);
      setLabel('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <section>
      <h2 className="font-hand text-2xl font-bold text-primary">Liens par source</h2>
      {locked ? (
        <Notice
          tone="info"
          className="mt-3"
          action={
            <Button href="/app/plus" variant="secondary">
              Voir mon forfait
            </Button>
          }
        >
          <span className="flex items-center gap-2 font-bold">
            <Icon name="lock" className="size-5 text-primary" />
            <Badge tone="accent">Pro</Badge>
          </span>
          <span className="mt-2 block">
            Les liens par source viennent avec le forfait Pro. Un lien par groupe WhatsApp te dit
            d&apos;où viennent tes intéressés.
          </span>
        </Notice>
      ) : (
        <>
          <ul className="mt-3 flex flex-col gap-3">
            {items.map((l) => (
              <li
                key={l.id}
                className="frame flex flex-wrap items-center gap-3 rounded-card bg-surface p-3"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex flex-wrap items-center gap-2 font-bold text-ink">
                    {l.label}
                    {l.isDefault && <Badge tone="primary">Principal</Badge>}
                  </span>
                  <span className="truncate text-sm text-ink-soft">{l.url}</span>
                  <span className="text-sm text-ink-muted">{opens(l.openCount)}</span>
                </span>
                <CopyButton text={l.url} label="Copier" />
              </li>
            ))}
          </ul>
          <form
            onSubmit={(e) => void create(e)}
            className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <Input
              id="link-label"
              label="Nouvelle source"
              placeholder="Groupe WhatsApp Médina"
              maxLength={60}
              value={label}
              className="flex-1"
              onChange={(e) => setLabel(e.target.value)}
            />
            <Button type="submit" variant="secondary" disabled={sending || !label.trim()}>
              {sending ? 'Création…' : 'Créer le lien'}
            </Button>
          </form>
          {error && (
            <Notice tone="danger" className="mt-3">
              {error}
            </Notice>
          )}
        </>
      )}
    </section>
  );
}

'use client';

// The share step: the message as it will appear in WhatsApp, the green
// button that opens WhatsApp with it, and the campaign link.
import { Fragment } from 'react';
import { Button } from '@/components/ui';
import { waShareLink, whatsappSegments } from '@/lib/tamani/wa';
import { cn } from '@/lib/utils';
import { CopyButton } from './CopyButton';

/** A chat bubble with the message, *bold* rendered as WhatsApp renders it. */
export function WhatsAppBubble({
  text,
  className,
}: {
  text: string;
  className?: string | undefined;
}) {
  return (
    <div
      className={cn(
        'frame max-w-md rounded-card rounded-tl-case bg-surface px-4 py-3 text-ink',
        className,
      )}
    >
      <p className="break-words whitespace-pre-wrap">
        {whatsappSegments(text).map((s, i) =>
          s.bold ? <strong key={i}>{s.text}</strong> : <Fragment key={i}>{s.text}</Fragment>,
        )}
      </p>
    </div>
  );
}

export function ShareCard({ message, url }: { message: string; url: string }) {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <p className="font-hand text-lg text-ink-muted">Ce que ta communauté va recevoir</p>
        <WhatsAppBubble text={message} className="mt-2" />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          href={waShareLink(message)}
          target="_blank"
          rel="noopener noreferrer"
          variant="whatsapp"
          size="lg"
          className="shadow-press"
        >
          Partager sur WhatsApp
        </Button>
        <CopyButton text={message} label="Copier le message" size="lg" />
      </div>
      <div>
        <p className="text-sm font-bold text-ink">Le lien de ta campagne</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-3">
          <span className="frame flex min-h-12 min-w-0 flex-1 items-center rounded-control bg-surface px-4">
            <span className="truncate text-ink">{url}</span>
          </span>
          <CopyButton text={url} label="Copier le lien" />
        </div>
      </div>
    </section>
  );
}

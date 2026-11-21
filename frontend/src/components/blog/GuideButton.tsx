'use client';

// « Télécharger le guide » (lot 13d, option A): a small window asks a first
// name and a WhatsApp number, then gives the guide's link. Checked here first,
// then on the server, which also reads the number.
import Link from 'next/link';
import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Button, Input, PhoneInput } from '@/components/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';
import { BlogLeadInput, type BlogGuideView } from '@/lib/tamani/blog';
import { phoneCountryChoices } from '@/lib/tamani/phone-countries';

type Errors = Partial<Record<'firstName' | 'phone' | 'consent', string>>;

export function GuideButton({
  guide,
  post,
  label = 'Télécharger le guide',
  variant = 'primary',
  className,
}: {
  guide: BlogGuideView;
  /** The article's slug, to know which one brings contacts. */
  post?: string;
  label?: string;
  variant?: 'primary' | 'secondary';
  className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const countries = useMemo(() => phoneCountryChoices('BJ'), []);
  const [firstName, setFirstName] = useState('');
  const [country, setCountry] = useState('BJ');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (sending) return;
    const body = { firstName, phone, country, consent, website, ...(post ? { post } : {}) };
    const check = BlogLeadInput.safeParse(body);
    if (!check.success) {
      const next: Errors = {};
      for (const issue of check.error.issues) {
        const key = issue.path[0];
        if (key === 'firstName') next.firstName = 'Écris ton prénom.';
        else if (key === 'phone') next.phone = 'Écris ton numéro WhatsApp.';
        else if (key === 'consent') next.consent = 'Coche la case pour recevoir le guide.';
      }
      setErrors(next);
      return;
    }
    setSending(true);
    setErrors({});
    setFailure(null);
    try {
      const res = await api<{ url: string | null }>('/api/public/blog-leads', {
        method: 'POST',
        body,
      });
      setUrl(res.url);
    } catch (err) {
      setFailure(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Button
        variant={variant}
        size="lg"
        {...(className ? { className } : {})}
        onClick={() => dialog.current?.showModal()}
      >
        {label}
      </Button>
      <dialog ref={dialog} className="blog-dialog" aria-labelledby="blog-guide-title">
        <div className="flex items-start justify-between gap-3">
          <h2 id="blog-guide-title" className="text-xl font-bold">
            {guide.title}
          </h2>
          <button
            type="button"
            className="min-h-11 min-w-11 rounded-control text-2xl leading-none"
            aria-label="Fermer"
            onClick={() => dialog.current?.close()}
          >
            ×
          </button>
        </div>
        {url ? (
          <div className="mt-4 flex flex-col gap-4">
            <p className="text-lg">Merci {firstName.trim()} ! Ton guide est prêt.</p>
            <Button href={url} size="lg" target="_blank" rel="noopener noreferrer">
              Ouvrir le guide
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="mt-3 flex flex-col gap-4">
            {guide.description && <p className="text-ink-soft">{guide.description}</p>}
            <Input
              id="guide-firstName"
              label="Ton prénom"
              autoComplete="given-name"
              maxLength={40}
              value={firstName}
              error={errors.firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <PhoneInput
              id="guide-phone"
              label="Ton numéro WhatsApp"
              countries={countries}
              country={country}
              onCountryChange={setCountry}
              autoComplete="tel-national"
              value={phone}
              error={errors.phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            {/* The honeypot: hidden from people, filled by bots. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              aria-hidden="true"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 size-5 flex-none"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>
                J&apos;accepte que Tamani me contacte sur WhatsApp au sujet de ce guide.{' '}
                <Link href="/confidentialite" className="underline">
                  Confidentialité
                </Link>
              </span>
            </label>
            {errors.consent && <p className="text-sm font-bold text-danger">{errors.consent}</p>}
            {failure && (
              <p className="text-sm font-bold text-danger" role="alert">
                {failure}
              </p>
            )}
            <Button type="submit" size="lg" disabled={sending}>
              {sending ? 'Envoi…' : 'Recevoir le guide'}
            </Button>
          </form>
        )}
      </dialog>
    </>
  );
}

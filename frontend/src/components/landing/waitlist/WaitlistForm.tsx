'use client';

import { useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import { Button, Input, PhoneInput } from '@/components/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';
import Link from 'next/link';
import { SHOP_COUNTRIES } from '@/lib/tamani/countries';
import { phoneCountryChoices } from '@/lib/tamani/phone-countries';
import {
  WAITLIST_CHANNELS,
  WaitlistInput,
  waitlistChannelLabel,
  type WaitlistChannel,
} from '@/lib/tamani/waitlist';
import { WaitlistThanks } from './WaitlistThanks';

type Place = { position: number; firstName: string };
type FieldErrors = Partial<Record<'firstName' | 'contact' | 'email' | 'consent', string>>;

const OWN_COUNTRIES = new Set(SHOP_COUNTRIES.map((c) => c.code));
const noSubscription = () => () => {};
/** False on the server and while the page hydrates, true once it runs in the browser. */
const useHydrated = () =>
  useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );

/**
 * The waitlist form (lot 14): first name, WhatsApp or e-mail, where they
 * sell, the consent. Checked here first, then on the server, which also
 * reads the number. The ?src= tag of the page's address goes along.
 */
export function WaitlistForm({ appUrl, community }: { appUrl: string; community: string | null }) {
  // The other countries' names come from the engine's Intl data, which Node
  // and the browsers do not share: the server sends Tamani's own (fixed
  // names), the browser adds the rest once the page is live.
  const hydrated = useHydrated();
  const allCountries = useMemo(() => phoneCountryChoices('BJ'), []);
  const countries = useMemo(
    () => (hydrated ? allCountries : allCountries.filter((c) => OWN_COUNTRIES.has(c.code))),
    [hydrated, allCountries],
  );
  const busy = useRef(false);
  const [firstName, setFirstName] = useState('');
  const [country, setCountry] = useState('BJ');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [channels, setChannels] = useState<WaitlistChannel[]>([]);
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [place, setPlace] = useState<Place | null>(null);

  if (place) {
    return (
      <WaitlistThanks
        firstName={place.firstName}
        position={place.position}
        appUrl={appUrl}
        community={community}
      />
    );
  }

  function toggle(c: WaitlistChannel) {
    setChannels((list) => (list.includes(c) ? list.filter((x) => x !== c) : [...list, c]));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy.current) return;
    const source = new URLSearchParams(window.location.search).get('src') ?? undefined;
    const body = { firstName, phone, country, email, channels, consent, source, website };
    const check = WaitlistInput.safeParse(body);
    if (!check.success) {
      const next: FieldErrors = {};
      for (const issue of check.error.issues) {
        const key = issue.path[0];
        // Copy brief §7.1; the rules themselves are WaitlistInput's, unchanged.
        if (key === 'firstName')
          next.firstName = firstName.trim()
            ? 'Écris ton prénom en 40 lettres au plus.'
            : 'Ce champ est nécessaire pour envoyer ta demande.';
        else if (key === 'phone')
          next.contact = phone.trim()
            ? "Vérifie l'indicatif du pays et le numéro saisi."
            : 'Ce champ est nécessaire pour envoyer ta demande : laisse ton numéro WhatsApp ou ton adresse e-mail.';
        else if (key === 'email') next.email = 'Vérifie le format de ton adresse e-mail.';
        else if (key === 'consent')
          next.consent = 'Pour recevoir un message de lancement, donne ton accord de contact.';
      }
      setErrors(next);
      return;
    }
    busy.current = true;
    setSending(true);
    setErrors({});
    setFailure(null);
    try {
      setPlace(await api<Place>('/api/public/waitlist', { method: 'POST', body }));
    } catch (err) {
      setFailure(errorMessage(err));
    } finally {
      busy.current = false;
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="lp-wait__form"
      aria-labelledby="lp-wait-form-title"
    >
      <h2 id="lp-wait-form-title" className="lp-wait__form-title">
        Rejoins la liste d&apos;attente
      </h2>
      <p className="lp-wait__form-sub">
        Laisse un moyen de contact valide. Nous t&apos;écrirons au sujet de l&apos;ouverture de
        Tamani si tu nous y autorises.
      </p>

      <Input
        id="wait-firstName"
        label="Ton prénom"
        autoComplete="given-name"
        maxLength={40}
        value={firstName}
        error={errors.firstName}
        onChange={(e) => setFirstName(e.target.value)}
      />
      <PhoneInput
        id="wait-phone"
        label="Ton numéro WhatsApp"
        hint="Ou ton adresse e-mail juste en dessous."
        countries={countries}
        country={country}
        onCountryChange={setCountry}
        autoComplete="tel-national"
        value={phone}
        error={errors.contact}
        onChange={(e) => setPhone(e.target.value)}
      />
      <Input
        id="wait-email"
        label="Ton adresse e-mail (facultative si le numéro WhatsApp est renseigné)"
        type="email"
        autoComplete="email"
        inputMode="email"
        value={email}
        error={errors.email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <fieldset className="lp-wait__channels">
        <legend>Où vends-tu ? (facultatif)</legend>
        <div className="lp-wait__chips">
          {WAITLIST_CHANNELS.map((c) => (
            <label key={c} className="lp-wait__chip">
              <input
                type="checkbox"
                name="channels"
                value={c}
                checked={channels.includes(c)}
                onChange={() => toggle(c)}
              />
              <span>{waitlistChannelLabel(c)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="lp-wait__consent">
        <input
          id="wait-consent"
          type="checkbox"
          checked={consent}
          aria-invalid={errors.consent ? true : undefined}
          aria-describedby={errors.consent ? 'wait-consent-error' : undefined}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>
          J&apos;accepte que l&apos;équipe Tamani me contacte au sujet du lancement sur WhatsApp ou
          par e-mail, selon les coordonnées que j&apos;ai fournies.
        </span>
      </label>
      {errors.consent && (
        <p id="wait-consent-error" className="lp-wait__error">
          {errors.consent}
        </p>
      )}

      {/* A person never sees this field; a bot fills it. */}
      <div className="lp-wait__trap" aria-hidden="true">
        <label htmlFor="wait-website">Site web</label>
        <input
          id="wait-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <Button type="submit" size="lg" disabled={sending} className="lp-press lp-go w-full">
        Rejoindre gratuitement la liste d&apos;attente
      </Button>
      <p className="lp-wait__micro">
        Nous utiliserons tes coordonnées uniquement selon le consentement donné et les informations
        de la <Link href="/confidentialite">politique de confidentialité</Link>.
      </p>
      {failure && (
        <p role="alert" className="lp-wait__error">
          {failure}
        </p>
      )}
    </form>
  );
}

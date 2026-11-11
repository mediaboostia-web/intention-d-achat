import { Button, Icon } from '@/components/ui';
import { WAITLIST_PATH } from '@/lib/tamani/waitlist';

/** The invitation a seller sends to another seller, with the page's link. */
export function inviteHref(appUrl: string): string {
  const url = `${appUrl.replace(/\/+$/, '')}${WAITLIST_PATH}?src=parrainage`;
  const text = `Je viens de m'inscrire sur la liste d'attente de Tamani, un outil pour recueillir les intentions d'achat de nos clients avant de commander le stock. Inscris-toi aussi : ${url}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** After the form (copy brief §7.1): the request is saved, then two ways to bring someone along. */
export function WaitlistThanks({
  firstName,
  position,
  appUrl,
  community,
}: {
  firstName: string;
  position: number;
  appUrl: string;
  community: string | null;
}) {
  return (
    <div className="lp-wait__thanks" role="status" aria-live="polite">
      <span className="lp-wait__seal" aria-hidden="true">
        <Icon name="check" className="size-7" />
      </span>
      <p className="lp-wait__done">Merci {firstName} ! Ta demande a bien été enregistrée.</p>
      {position > 0 && <p className="lp-wait__rank">Tu es n° {position}</p>}
      <p className="lp-wait__next">
        Nous te préviendrons à l&apos;ouverture de Tamani. En attendant, tu peux inviter
        d&apos;autres vendeurs que tu connais.
      </p>
      <div className="lp-wait__share">
        <Button
          href={inviteHref(appUrl)}
          variant="whatsapp"
          size="lg"
          target="_blank"
          rel="noopener"
          className="w-full"
        >
          Inviter un vendeur sur WhatsApp
        </Button>
        {community && (
          <Button
            href={community}
            variant="secondary"
            size="lg"
            target="_blank"
            rel="noopener"
            className="w-full"
          >
            Rejoindre le groupe WhatsApp
          </Button>
        )}
      </div>
    </div>
  );
}

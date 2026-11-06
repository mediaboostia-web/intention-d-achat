import { Button, Icon } from '@/components/ui';
import { WAITLIST_PATH } from '@/lib/tamani/waitlist';

/** The invitation a seller sends to another seller, with the page's link. */
export function inviteHref(appUrl: string): string {
  const url = `${appUrl.replace(/\/+$/, '')}${WAITLIST_PATH}?src=parrainage`;
  const text = `Je viens de réserver ma place sur Tamani : nos abonnés disent ce qu'ils veulent acheter avant qu'on commande le stock. Réserve la tienne : ${url}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** After the form: the place, then two ways to bring someone along. */
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
      <p className="lp-wait__done">Ta place est réservée, {firstName} !</p>
      {position > 0 && <p className="lp-wait__rank">Tu es n° {position}</p>}
      <p className="lp-wait__next">
        On t&apos;écrit dès que ton accès est prêt. En attendant, invite une vendeuse que tu connais
        : vous testerez Tamani ensemble.
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
          Inviter une vendeuse sur WhatsApp
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
            Rejoindre le groupe des vendeurs
          </Button>
        )}
      </div>
    </div>
  );
}

import { Button, Icon } from '@/components/ui';
import { LANDING_FAQ, LANDING_LINKS, type LandingLinks } from '@/lib/tamani/landing';
import { twoDigits } from './content';
import { Illustration } from './Illustration';

type Question = { question: string; answer: string };

/**
 * Questions: the same as the page's FAQPage structured data. The home page
 * shows LANDING_FAQ; /forfaits passes its own. From 960 px the title and the
 * way to a real person stay beside the numbered questions.
 */
export function Faq({
  links = LANDING_LINKS,
  items = LANDING_FAQ,
  id = 'faq',
  title = 'Questions fréquentes',
}: {
  links?: LandingLinks;
  items?: readonly Question[];
  id?: string;
  title?: string;
}) {
  return (
    <section id={id} className="lp-section" aria-labelledby={`${id}-title`}>
      <div className="lp-wrap lp-faqs">
        <div className="lp-faqs__side">
          <span className="lp-faqs__mark" aria-hidden="true">
            ?
          </span>
          <h2 id={`${id}-title`} className="lp-h2">
            {title}
          </h2>
          <p className="lp-lead">Les réponses courtes aux questions des vendeurs.</p>
          <div className="lp-faqs__help">
            <Illustration
              name="menu-support"
              alt=""
              sizes="(min-width: 960px) 400px, 100vw"
              className="lp-faqs__img"
            />
            {links.whatsappContact && (
              <div className="lp-ask">
                <p>Une autre question ?</p>
                <Button
                  href={links.whatsappContact}
                  variant="whatsapp"
                  target="_blank"
                  rel="noopener"
                >
                  Écris-nous sur WhatsApp
                </Button>
              </div>
            )}
          </div>
        </div>
        <div className="lp-faq">
          {items.map((q, i) => (
            <details key={q.question}>
              <summary>
                <span className="lp-faq__num" aria-hidden="true">
                  {twoDigits(i + 1)}
                </span>
                <span className="lp-faq__q">{q.question}</span>
                <Icon name="plus" />
              </summary>
              <p>{q.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

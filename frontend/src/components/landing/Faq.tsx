import { Button, Icon } from '@/components/ui';
import { LANDING_FAQ, LANDING_LINKS, type LandingLinks } from '@/lib/tamani/landing';

type Question = { question: string; answer: string };

/**
 * Questions: the same as the page's FAQPage structured data. The home page
 * shows LANDING_FAQ; /forfaits passes its own.
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
      <div className="lp-wrap">
        <div className="lp-center">
          <h2 id={`${id}-title`} className="lp-h2">
            {title}
          </h2>
        </div>
        <div className="lp-faq">
          {items.map((q) => (
            <details key={q.question}>
              <summary>
                {q.question}
                <Icon name="plus" />
              </summary>
              <p>{q.answer}</p>
            </details>
          ))}
        </div>
        {links.whatsappContact && (
          <div className="lp-ask">
            <p>Une autre question ?</p>
            <Button href={links.whatsappContact} variant="whatsapp" target="_blank" rel="noopener">
              Écris-nous sur WhatsApp
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

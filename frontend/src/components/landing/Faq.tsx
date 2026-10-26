import { Button, Icon } from '@/components/ui';
import { LANDING_FAQ, LANDING_LINKS, type LandingLinks } from '@/lib/tamani/landing';

/** 9. Questions: the same as the page's FAQPage structured data. */
export function Faq({ links = LANDING_LINKS }: { links?: LandingLinks }) {
  return (
    <section id="questions" className="lp-section" aria-labelledby="lp-faq-title">
      <div className="lp-wrap">
        <div className="lp-center">
          <h2 id="lp-faq-title" className="lp-h2">
            Tes questions.
          </h2>
        </div>
        <div className="lp-faq">
          {LANDING_FAQ.map((q) => (
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

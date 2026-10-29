import { Button, Icon, OfferCard } from '@/components/ui';
import { LANDING_LINKS, pricingOffers, type LandingLinks } from '@/lib/tamani/landing';
import { PLANS } from '@/lib/tamani/plans';
import { formatPrice } from '@/lib/utils';
import { OfferRail } from './OfferRail';

type Cell = string | boolean;
const { TRIAL, WEEK, MONTH_MAX } = PLANS;
const RANGE = `${formatPrice(WEEK.includedResponses ?? 0)} à ${formatPrice(MONTH_MAX.includedResponses ?? 0)}`;
const ROWS: readonly [string, Cell, Cell][] = [
  ['Durée', `${TRIAL.durationDays} jours`, '7, 14 ou 30 jours'],
  ['Réponses', formatPrice(TRIAL.includedResponses ?? 0), RANGE],
  ['Campagnes en cours', String(TRIAL.maxActiveCampaigns), 'Illimitées'],
  ['Réponses et totaux', true, true],
  ['Quantité conseillée et verdict', TRIAL.features.estimate, WEEK.features.estimate],
  [
    'Numéros des clients et WhatsApp',
    TRIAL.features.respondentContacts,
    WEEK.features.respondentContacts,
  ],
  ['Un lien par groupe', TRIAL.features.sourceLinks, WEEK.features.sourceLinks],
  ['Commandes et livraisons par quartier', true, true],
  ['Fiabilité des clients', TRIAL.features.reliability, WEEK.features.reliability],
  ['Export pour Excel', TRIAL.features.csvExport, WEEK.features.csvExport],
  ['Mention « Propulsé par Tamani »', 'Oui', 'Non'],
];

function CellValue({ value }: { value: Cell }) {
  if (value === true)
    return (
      <span>
        <Icon name="check" />
        <span className="sr-only">Oui</span>
      </span>
    );
  if (value === false) return <span className="text-ink-muted">Non</span>;
  return <>{value}</>;
}

/**
 * 7. Pricing (porteur, 2026-10-29): the trial, the five passes and the
 * Illimité as a rail of cards, the line under them, every detail on demand.
 * The Illimité's button waits for Tamani's WhatsApp number.
 */
export function Pricing({ links = LANDING_LINKS }: { links?: LandingLinks }) {
  const help = links.whatsappContact;
  const actionFor = (id: string) => {
    if (id === 'TRIAL')
      return (
        <Button href="/signup" className="lp-press w-full">
          Essayer gratuitement
        </Button>
      );
    if (id === 'UNLIMITED')
      return help ? (
        <Button
          href={help}
          variant="secondary"
          className="w-full"
          target="_blank"
          rel="noopener noreferrer"
        >
          Contacter le support
        </Button>
      ) : null;
    return (
      <Button href="/signup" variant="secondary" className="w-full">
        Choisir
      </Button>
    );
  };

  return (
    <section id="tarifs" className="lp-section" aria-labelledby="lp-price-title">
      <div className="lp-wrap lp-center">
        <h2 id="lp-price-title" className="lp-h2">
          Un prix plus petit qu&apos;un carton qui dort.
        </h2>
        <p className="lp-lead">
          Essaie 3 jours gratuitement. Prends ensuite un pass : tu paies des réponses, jamais des
          campagnes.
        </p>
        <OfferRail label="Les pass Tamani">
          {pricingOffers().map((o) => (
            <li key={o.id}>
              <OfferCard
                name={o.name}
                price={o.price}
                durationLabel={o.durationLabel}
                responsesLabel={o.responsesLabel}
                forWho={o.forWho}
                badge={o.badge}
                action={actionFor(o.id)}
              />
            </li>
          ))}
        </OfferRail>
        <p className="lp-rail__note">
          Mobile Money ou carte · Pas de renouvellement automatique · Campagnes illimitées
        </p>
        <details className="lp-compare">
          <summary>
            <Icon name="plus" />
            Comparer tous les détails
          </summary>
          <div className="lp-compare__scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Ce que tu as</th>
                  <th scope="col">{TRIAL.label}</th>
                  <th scope="col">Avec un pass</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map(([label, ...cells]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    {cells.map((c, i) => (
                      <td key={i}>
                        <CellValue value={c} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </section>
  );
}

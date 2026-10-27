import { Icon, type IconName } from '@/components/ui';
import { PLANS } from '@/lib/tamani/plans';
import { formatPrice } from '@/lib/utils';
import { PricingTags } from './PricingTags';

const PROMISES: readonly { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'receipt',
    title: "Rien n'est prélevé tout seul",
    text: "Mobile money ou carte. Tu paies 1 mois ou 12 mois d'avance.",
  },
  {
    icon: 'check',
    title: 'Aucune réponse perdue',
    text: "Au-delà de ton quota, elles t'attendent.",
  },
  {
    icon: 'lock',
    title: 'Tes données restent à toi',
    text: 'Tes clients et leurs numéros ne sont partagés avec personne.',
  },
];

type Cell = string | boolean;
const { FREE, PRO, BUSINESS } = PLANS;
const ROWS: readonly [string, Cell, Cell, Cell][] = [
  ['Campagnes en cours', String(FREE.maxActiveCampaigns), 'Illimitées', 'Illimitées'],
  [
    'Réponses par mois',
    formatPrice(FREE.monthlyResponses),
    formatPrice(PRO.monthlyResponses),
    formatPrice(BUSINESS.monthlyResponses),
  ],
  ['Réponses et totaux', true, true, true],
  [
    'Quantité conseillée et verdict',
    FREE.features.estimate,
    PRO.features.estimate,
    BUSINESS.features.estimate,
  ],
  [
    'Un lien par groupe',
    FREE.features.sourceLinks,
    PRO.features.sourceLinks,
    BUSINESS.features.sourceLinks,
  ],
  ['Numéros des clients et WhatsApp', 'Masqués', true, true],
  ['Commandes et livraisons par quartier', true, true, true],
  [
    'Fiabilité des clients',
    FREE.features.reliability,
    PRO.features.reliability,
    BUSINESS.features.reliability,
  ],
  [
    'Export pour Excel',
    FREE.features.csvExport,
    PRO.features.csvExport,
    BUSINESS.features.csvExport,
  ],
  ['Mention « Propulsé par Tamani »', 'Oui', 'Non', 'Non'],
  ["Membres d'équipe", String(FREE.seats), String(PRO.seats), `${BUSINESS.seats} (bientôt)`],
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

/** 7. Pricing: price tags hanging from the stall, the guarantees, every detail on demand. */
export function Pricing() {
  return (
    <section id="tarifs" className="lp-section" aria-labelledby="lp-price-title">
      <div className="lp-wrap lp-center">
        <h2 id="lp-price-title" className="lp-h2">
          Un prix plus petit qu&apos;un carton qui dort.
        </h2>
        <p className="lp-lead">
          Commence gratuitement. Passe à Pro quand tu veux la quantité conseillée et les numéros de
          tes clients.
        </p>
        <PricingTags />
        <ul className="lp-promise">
          {PROMISES.map((p) => (
            <li key={p.title}>
              <Icon name={p.icon} />
              <span>
                <b>{p.title}</b>
                {p.text}
              </span>
            </li>
          ))}
        </ul>
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
                  <th scope="col">{FREE.label}</th>
                  <th scope="col">{PRO.label}</th>
                  <th scope="col">{BUSINESS.label}</th>
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

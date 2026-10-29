import { Icon, type IconName } from '@/components/ui';
import { PLANS } from '@/lib/tamani/plans';
import { formatPrice } from '@/lib/utils';
import { PricingTags } from './PricingTags';

const PROMISES: readonly { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'receipt',
    title: "Rien n'est prélevé tout seul",
    text: "Mobile money ou carte. Tu paies ton pass d'avance, pour 7, 14 ou 30 jours.",
  },
  {
    icon: 'check',
    title: 'Aucune réponse perdue',
    text: "Au-delà de ton pass, elles t'attendent.",
  },
  {
    icon: 'lock',
    title: 'Tes données restent à toi',
    text: 'Tes clients et leurs numéros ne sont partagés avec personne.',
  },
];

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

/** 7. Pricing: price tags hanging from the stall, the guarantees, every detail on demand. */
export function Pricing() {
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

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import {
  Badge,
  BottomNav,
  BottomSheet,
  Button,
  CalcTable,
  Card,
  ChoiceButton,
  DataList,
  EmptyState,
  FilterBar,
  Icon,
  type IconName,
  Input,
  Logo,
  MoneyCard,
  Notice,
  PageHeader,
  PhoneInput,
  Select,
  SideNav,
  StatTile,
  Steps,
  Switch,
  Tabs,
  Textarea,
  VerdictCard,
} from '@/components/ui';
import { DEFAULT_SHARE_TEMPLATE } from '@/lib/tamani/share-message';
import { colors } from '@/lib/design/tokens';

// Dev-only living reference of docs/brand/tamani-brand.md: every token and
// component, plus the two reference screens rebuilt from the kit.
export const metadata: Metadata = {
  title: 'Charte en composants — Tamani',
  robots: { index: false, follow: false },
};

const CAMPAIGN = { realistic: 211, completed: 94, reference: 400, interested: 64 };

const ICONS: readonly IconName[] = [
  'home',
  'megaphone',
  'receipt',
  'people',
  'more',
  'box',
  'gear',
  'plus',
  'copy',
  'link',
  'photo',
  'check',
  'lock',
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-14">
      <h2 className="font-hand text-3xl font-bold text-primary">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function PotIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={className}>
      <path d="M9 17h22v10.5a6.5 6.5 0 0 1-6.5 6.5h-9A6.5 6.5 0 0 1 9 27.5z" fill="currentColor" />
      <path
        d="M6.5 17h27M4 20h5M31 20h5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M11 14.2c3-3.6 15-3.6 18 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="20" cy="9.5" r="2.2" fill="currentColor" />
    </svg>
  );
}

// Demand against the planned quantity, coloured in like notebook squares.
// Lot 6 promotes it to components/ui once the stats API feeds it.
function CasesGauge({
  realistic,
  announced,
  reference,
}: {
  realistic: number;
  announced: number;
  reference: number;
}) {
  const per = reference / 10;
  const fill = (n: number, i: number) => Math.min(Math.max((n - i * per) / per, 0), 1) * 100;
  return (
    <div>
      <div className="pen grid grid-cols-10 gap-[3px]" aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => {
          const r = fill(realistic, i);
          const a = fill(announced, i);
          return (
            <span
              key={i}
              className="h-[26px] rounded-case border-2 border-ink"
              style={{
                background: [
                  `linear-gradient(90deg, var(--color-primary) ${r}%, transparent ${r}%)`,
                  `linear-gradient(90deg, transparent ${a}%, var(--color-surface) ${a}%)`,
                  'repeating-linear-gradient(-55deg, var(--color-primary) 0 1.5px, var(--color-surface) 1.5px 6px)',
                ].join(', '),
              }}
            />
          );
        })}
      </div>
      <p className="mt-1.5 flex flex-wrap justify-between gap-x-3 font-hand text-base text-ink-muted">
        <span>
          réaliste <b className="text-primary">{realistic}</b>
        </span>
        <span>
          annoncé <b className="text-primary">{announced}</b>
        </span>
        <span>
          prévu <b className="text-primary">{reference}</b>
        </span>
      </p>
      <p className="sr-only">
        Demande réaliste {realistic}, annoncée {announced}, pour {reference} prévues.
      </p>
    </div>
  );
}

function CampaignScreen() {
  return (
    <div className="frame relative mx-auto w-full max-w-[390px] overflow-hidden rounded-[40px] bg-paper">
      <span aria-hidden="true" className="absolute inset-y-0 left-[31px] w-[1.5px] bg-margin" />
      <div className="relative py-6 pr-5 pl-[46px]">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <a href="#" className="text-sm font-bold">
            ‹ Campagnes
          </a>
          <span className="font-hand text-base text-ink-muted">jeudi 24 octobre</span>
        </div>
        <h3 className="mt-4 font-hand text-[32px] leading-tight font-bold text-primary">
          Marmites inox 5 L
        </h3>
        <svg
          viewBox="0 0 228 13"
          preserveAspectRatio="none"
          className="h-3 w-56 max-w-full"
          aria-hidden="true"
        >
          <path
            d="M2 5 C 60 2.5, 140 7, 224 3.5 M8 10.5 C 70 8.5, 150 11.5, 214 9"
            stroke="var(--color-margin)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
        <p className="mt-2 text-sm text-ink-soft">
          Arrivage dans 10 jours. Tu prévoyais d&apos;en commander 400.
        </p>

        <VerdictCard
          className="mt-6"
          code="CAUTION"
          realistic={CAMPAIGN.realistic}
          completedResponses={CAMPAIGN.completed}
          reference={CAMPAIGN.reference}
          basis={{ low: 176, high: 246, interestedCount: CAMPAIGN.interested }}
        />

        <div className="mt-6">
          <CasesGauge realistic={211} announced={350} reference={400} />
        </div>

        <h4 className="mt-7 font-hand text-2xl font-bold text-primary">Le calcul</h4>
        <CalcTable
          className="mt-1"
          rows={[
            { label: 'Revendeurs', count: 22, announced: 180, coef: 0.7, realistic: 126 },
            { label: 'Usagers', count: 42, announced: 170, coef: 0.5, realistic: 85 },
          ]}
          total={{ announced: 350, realistic: 211 }}
          footnote="0,7 : sur 10 revendeurs qui disent oui, 7 achètent vraiment."
        />

        <MoneyCard
          className="mt-7"
          avoidedDeadStock={850500}
          expectedProfit={444000}
          reference={400}
        />

        <h4 className="mt-7 font-hand text-2xl font-bold text-primary">Où livrer</h4>
        <DataList
          items={[
            { id: 'medina', label: 'Médina', value: 24 },
            { id: 'parcelles', label: 'Parcelles Assainies', value: 17 },
            { id: 'guediawaye', label: 'Guédiawaye', value: 12 },
            { id: 'autres', label: 'Autres quartiers', value: 11 },
          ]}
        />

        <h4 className="mt-7 font-hand text-2xl font-bold text-primary">Quand</h4>
        <DataList
          items={[
            { id: 'arrivee', label: "Dès l'arrivée", value: '60 %' },
            { id: 'semaine', label: 'La semaine suivante', value: '30 %' },
            { id: 'tard', label: 'Plus tard', value: '10 %' },
          ]}
        />

        <p className="mt-6 font-hand text-xl text-ink-soft">
          7 « non » sur 30 :{' '}
          <span className="inline-block -rotate-3 rounded-[50%] border-2 border-margin px-2 font-bold text-danger">
            trop cher
          </span>
        </p>

        <div className="mt-7 flex flex-col gap-2.5">
          <Button href="#">Voir les 64 intéressés</Button>
          <Button href="#" variant="whatsapp">
            Partager sur WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
}

function PopupScreen() {
  return (
    <div className="frame relative mx-auto h-[720px] w-full max-w-[390px] overflow-hidden rounded-[40px]">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 22%, color-mix(in oklab, var(--color-ink) 25%, var(--color-surface)), var(--color-ink))',
        }}
      />
      <PotIcon className="absolute top-16 left-1/2 size-64 -translate-x-1/2 text-surface/80 blur-md" />
      <span className="relative mt-5 ml-4 inline-flex items-center gap-2 rounded-full bg-surface/95 py-1 pr-3.5 pl-1 text-sm font-bold">
        <span className="grid size-7 place-items-center rounded-full bg-primary font-sign text-xs text-primary-ink">
          DI
        </span>
        Diallo Import
      </span>
      <BottomSheet label="Ta réponse" className="absolute inset-x-0 bottom-0">
        <div className="flex items-center gap-3">
          <div className="frame grid size-16 shrink-0 place-items-center rounded-control bg-grid text-ink-muted">
            <PotIcon className="size-10" />
          </div>
          <div>
            <p className="text-lg leading-tight font-bold">Marmites inox 5 L</p>
            <p className="mt-0.5 font-sign text-2xl leading-tight">
              7 500 FCFA <span className="font-sans text-sm text-ink-muted">pour 1 pièce</span>
            </p>
          </div>
        </div>
        <p className="mt-4 text-ink-soft">
          Arrive dans 10 jours. <b className="text-ink">64 personnes</b> sont déjà intéressées.
        </p>
        <h3 className="mt-5 mb-3.5 font-hand text-[38px] leading-none font-bold text-primary">
          Ça t&apos;intéresse ?
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <ChoiceButton emphasis>Oui</ChoiceButton>
          <ChoiceButton>Non</ChoiceButton>
        </div>
        <div className="mt-5 flex justify-center gap-1.5" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={`size-3.5 rounded-case border-2 border-ink ${i === 0 ? 'bg-accent' : 'bg-surface'}`}
            />
          ))}
        </div>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-ink-muted">
          <Logo variant="mark" size={16} />
          Propulsé par Tamani
        </p>
      </BottomSheet>
    </div>
  );
}

const SWATCHES = Object.entries(colors) as Array<[keyof typeof colors, string]>;
const SCALE = [12, 14, 16, 18, 21, 24, 32, 40, 48, 60];

export default function StyleguidePage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <main className="min-h-screen bg-paper">
      <div className="mx-auto max-w-5xl px-3 pt-10 pb-24 sm:px-5">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Logo size={48} />
            <h1 className="mt-4 font-hand text-4xl font-bold text-primary">
              Tamani : la charte en composants
            </h1>
            <p className="mt-1 max-w-[60ch] text-ink-soft">
              « Cahier du marché ». Page réservée au développement : chaque token et chaque
              composant de <code>components/ui</code>, et les deux écrans de référence refaits avec
              eux.
            </p>
          </div>
        </header>

        <Section title="Les deux écrans de référence">
          {/* min-w-0: grid items otherwise keep their min-content width and overflow at 320px. */}
          <div className="grid gap-10 md:grid-cols-2">
            <div className="min-w-0">
              <p className="mb-3 text-center text-sm font-bold">
                Le grossiste : page de la campagne
              </p>
              <CampaignScreen />
            </div>
            <div className="min-w-0">
              <p className="mb-3 text-center text-sm font-bold">La communauté : le pop-up</p>
              <PopupScreen />
            </div>
          </div>
        </Section>

        <Section title="Le logo">
          <div className="flex flex-wrap items-center gap-8">
            <Logo size={56} />
            <Logo variant="mark" size={64} />
            <Logo variant="mark" size={32} />
            <Logo variant="mark" size={16} />
            <img src="/icon.svg" alt="Icône de l'app" width={56} height={56} />
          </div>
        </Section>

        <Section title="Les couleurs">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {SWATCHES.map(([name, hex]) => (
              <div key={name} className="frame overflow-hidden rounded-card bg-surface">
                <div className="h-14" style={{ background: hex }} />
                <p className="px-3 pt-2 text-sm font-bold">{name}</p>
                <p className="px-3 pb-2 text-xs text-ink-muted">{hex}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Les polices">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <p className="text-sm text-ink-muted">font-sans, Andika</p>
              <p className="mt-2 text-lg">Tu sais quoi acheter. Tout le texte, net en petit.</p>
            </Card>
            <Card>
              <p className="text-sm text-ink-muted">font-hand, Kalam</p>
              <p className="mt-2 font-hand text-3xl font-bold text-primary">Ta communauté parle.</p>
            </Card>
            <Card>
              <p className="text-sm text-ink-muted">font-sign, Bowlby One</p>
              <p className="mt-2 font-sign text-3xl">850 500 FCFA</p>
            </Card>
          </div>
          <div className="mt-6 flex flex-col gap-1">
            {SCALE.map((px) => (
              <p key={px} className="leading-tight break-words" style={{ fontSize: px }}>
                {px} px, Marmites inox 5 L
              </p>
            ))}
          </div>
        </Section>

        <Section title="Les verdicts">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <VerdictCard code="GO" realistic={380} completedResponses={120} reference={400} />
            <VerdictCard code="CAUTION" realistic={211} completedResponses={94} reference={400} />
            <VerdictCard code="STOP" realistic={90} completedResponses={60} reference={400} />
            <VerdictCard code="WAIT" realistic={30} completedResponses={9} reference={400} />
            <VerdictCard code="NEUTRAL" realistic={211} completedResponses={94} reference={null} />
            <VerdictCard
              code="CAUTION"
              realistic={1250}
              completedResponses={300}
              reference={2000}
              unitLabel="sac de 25 kg"
            />
          </div>
        </Section>

        <Section title="Les boutons">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Créer la campagne</Button>
            <Button variant="secondary">Annuler</Button>
            <Button variant="whatsapp">Partager sur WhatsApp</Button>
            <Button variant="ghost">Comment c&apos;est calculé ?</Button>
            <Button size="lg">Grand bouton</Button>
          </div>
          <div className="mt-5 grid max-w-md grid-cols-2 gap-3">
            <ChoiceButton emphasis>Oui</ChoiceButton>
            <ChoiceButton>Non</ChoiceButton>
            <ChoiceButton selected>12</ChoiceButton>
            <ChoiceButton>24</ChoiceButton>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge tone="success">Commande</Badge>
            <Badge tone="warning">Prudence</Badge>
            <Badge tone="danger">N&apos;achète pas</Badge>
            <Badge tone="neutral">On attend</Badge>
            <Badge tone="primary">Demande</Badge>
            <Badge tone="accent">Nouveau</Badge>
          </div>
        </Section>

        <Section title="Les champs">
          <div className="grid max-w-2xl gap-5 md:grid-cols-2">
            <Input id="sg-shop" label="Nom de la boutique" placeholder="Diallo Import" />
            <PhoneInput
              id="sg-phone"
              label="Ton numéro WhatsApp"
              placeholder="77 123 45 67"
              hint="Ton numéro est partagé uniquement avec Diallo Import pour te recontacter au sujet de ce produit."
            />
            <Input
              id="sg-price"
              label="Prix à l'unité (FCFA)"
              inputMode="numeric"
              defaultValue="0"
              error="Le prix doit être supérieur à 0."
            />
          </div>
        </Section>

        <Section title="Les listes et les filtres">
          <FilterBar
            label="Filtrer les clients"
            items={[
              { id: 'all', label: 'Tous', href: '#', count: 312 },
              { id: 'res', label: 'Revendeurs', href: '#', active: true, count: 86 },
              { id: 'med', label: 'Médina', href: '#', count: 41 },
              { id: 'oct', label: 'Octobre', href: '#' },
              { id: 'no', label: "N'ont pas commandé", href: '#' },
            ]}
          />
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <StatTile label="Réponses complètes" value={94} hint="dont 64 intéressés" />
            <StatTile label="Revendeurs" value={22} hint="180 pièces annoncées" />
            <StatTile label="Usagers" value={42} hint="170 pièces annoncées" />
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <MoneyCard avoidedDeadStock={null} expectedProfit={null} addCostPriceHref="#" />
            <EmptyState
              title="Pas encore de campagne"
              action={<Button href="#">Créer une campagne</Button>}
            >
              Lance ta première campagne : ta communauté te dira quoi acheter.
            </EmptyState>
          </div>
        </Section>

        <Section title="Espace grossiste">
          <PageHeader
            title="Mes campagnes"
            note="2 en cours sur 3 avec le forfait Gratuit"
            action={<Button href="#">Créer une campagne</Button>}
          />
          <Tabs
            className="mt-6"
            label="Campagne"
            items={[
              { id: 'share', label: 'Partager', href: '#', active: true },
              { id: 'edit', label: 'Modifier', href: '#' },
            ]}
          />
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <div className="flex flex-col gap-5">
              <Steps current={2} total={6} title="Quand le produit est là ?" />
              <Select
                id="sg-country"
                label="Pays de la boutique"
                defaultValue="SN"
                options={[
                  { value: 'SN', label: 'Sénégal (+221)' },
                  { value: 'CI', label: "Côte d'Ivoire (+225)" },
                  { value: 'ML', label: 'Mali (+223)' },
                ]}
              />
              <Textarea
                id="sg-message"
                label="Message à partager"
                defaultValue={DEFAULT_SHARE_TEMPLATE}
                hint="Les mots entre accolades sont remplacés par ceux de ta campagne."
              />
              <Switch
                id="sg-live"
                label="Afficher le compteur de réponses"
                hint="Tes clients voient combien de personnes ont déjà répondu."
                checked
              />
              <Switch id="sg-delivery" label="Proposer la livraison" checked={false} />
            </div>
            <div className="flex flex-col gap-4">
              <Notice tone="info">Brouillon enregistré. Tu peux le lancer quand tu veux.</Notice>
              <Notice
                tone="warning"
                title="3 campagnes en cours"
                action={
                  <Button href="#" variant="secondary">
                    Voir le forfait Pro
                  </Button>
                }
              >
                C&apos;est le maximum du forfait Gratuit. Termine-en une ou passe au Pro.
              </Notice>
              <Notice tone="danger">
                Cette photo est trop lourde : 10 Mo au plus. Choisis-en une autre.
              </Notice>
              <ul className="frame flex flex-wrap gap-4 rounded-card bg-surface p-4 text-primary">
                {ICONS.map((name) => (
                  <li key={name} title={name}>
                    <Icon name={name} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-10 font-hand text-lg text-ink-muted">
            La barre du bas ne s&apos;affiche que sur téléphone, la colonne de gauche à partir de
            1024 px.
          </p>
          <div className="mt-4 flex flex-wrap items-start gap-8">
            {/* transform makes the fixed bar sit inside the frame instead of the window */}
            <div className="frame relative h-40 w-[390px] max-w-full overflow-hidden rounded-card bg-paper [transform:translateZ(0)] lg:hidden">
              <BottomNav pathname="/app/campagnes/abc" />
            </div>
            <div className="frame hidden overflow-hidden rounded-card lg:block [&>nav]:static [&>nav]:h-auto">
              <SideNav
                pathname="/app/produits"
                shop={{ name: 'Diallo Import', logoUrl: null, planLabel: 'Gratuit' }}
                usage={{ used: 42, limit: 150 }}
                upgrade
              />
            </div>
          </div>
        </Section>
      </div>
    </main>
  );
}

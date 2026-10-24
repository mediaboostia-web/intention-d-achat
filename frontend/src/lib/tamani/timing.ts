// When a respondent wants the product (popup step 4, spec §5.3). The
// choices depend on whether the product is in stock or still coming.

export type Availability = 'IN_STOCK' | 'INCOMING';

export type Timing =
  | 'TODAY_TOMORROW'
  | 'THIS_WEEK'
  | 'THIS_MONTH'
  | 'ON_ARRIVAL'
  | 'WEEK_AFTER'
  | 'LATER';

export const TIMING_OPTIONS: Readonly<Record<Availability, readonly Timing[]>> = {
  IN_STOCK: ['TODAY_TOMORROW', 'THIS_WEEK', 'THIS_MONTH'],
  INCOMING: ['ON_ARRIVAL', 'WEEK_AFTER', 'LATER'],
};

export const TIMING_LABELS: Readonly<Record<Timing, string>> = {
  TODAY_TOMORROW: "Aujourd'hui / demain",
  THIS_WEEK: 'Cette semaine',
  THIS_MONTH: 'Ce mois-ci',
  ON_ARRIVAL: "Dès l'arrivée",
  WEEK_AFTER: 'La semaine suivante',
  LATER: 'Plus tard',
};

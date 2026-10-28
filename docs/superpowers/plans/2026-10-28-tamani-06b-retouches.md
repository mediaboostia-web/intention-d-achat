# Tamani 06b : les retouches après le test du lot 6

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger ce que le porteur a trouvé en testant le lot 6 :
- un produit en stock se lit « à servir » et « état du stock », et non « on attend » ;
- la livraison ailleurs et les numéros étrangers ;
- les photos du pop-up et « C'est bien moi » ;
- les onglets et les actions de la page campagne ;
- les filtres des clients ;
- l'export avec aperçu ;
- les notifications demandées d'office sur téléphone ;
- Plus et Profil ;
- la demi-douzaine.

**Architecture:**
- Les règles restent pures et testées :
  - `lib/server/tamani/` : `stock-advice.ts` (nouveau), `stats.ts`, `money.ts`, `exports.ts` (nouveau), `clients.ts` ;
  - `lib/tamani/` : `phone-countries.ts`, `client-filters.ts` et `export-view.ts` (nouveaux), `popup-machine.ts`, `campaign-actions.ts`, `push-state.ts`.
- Une migration : `8c_delivery_place`.
- Nouvelles routes :
  - `GET …/exports/preview`, `…/exports/file`, `…/exports/numbers` ;
  - `PATCH /api/account`.
- Nouvelles pages : `/app/exporter` et `/app/profil`.
- La route `…/campaigns/[campaignId]/export` disparaît, remplacée par `exports/file`.

**Tech Stack:** Next.js 16 (route handlers, `runtime = 'nodejs'`), Prisma 5, React 19, Tailwind 4 (jetons du lot 2), Vitest (`prismaMock`, HTML statique), libphonenumber-js (serveur et tests seulement).

**Spec:** [retours du porteur, 2026-10-28](../specs/2026-10-28-tamani-retours-porteur-2.md), qui fait foi ; [spec produit](../specs/2026-10-24-tamani-design.md) §5.3 à §5.5 ; [plan du lot 6](2026-10-27-tamani-06-tableau-de-bord.md) pour les contrats existants.

## Global Constraints

- **Branche** `plan/06-tableau-de-bord` (décision du porteur) ; pas de PR avant la fin du lot 6b.
- **En stock** : seulement `availability = IN_STOCK`, comparé à `stockQuantity`. On ne regarde **jamais** `plannedQuantity`.
  - `ENOUGH` si réaliste ≤ stock, sinon `SHORTAGE`.
  - `leftover = max(stock − réaliste, 0)`, `restock = max(réaliste − stock, 0)`, affichés avec `approxQuantity`.
  - `provisional` sous `DEFAULT_MIN_RESPONSES` (20) réponses comptées.
  - Jamais « On attend » sur une campagne en stock. Les campagnes `INCOMING` gardent le verdict du lot 6 sans changement.
- **Argent en stock** : `avoidedDeadStock` est `null` ; `expectedProfit` est plafonné au stock et reste `null` sous 20 réponses comptées (même règle que `WAIT`). L'« Argent protégé » de l'accueil ne compte que les campagnes `INCOMING`.
- **Lieu de livraison** : `deliveryPlace` fait 2 à 80 caractères, sans espaces aux bouts ni caractère de contrôle (`\u0000-\u001f`, `\u007f`). Il est gardé seulement si `wantsDelivery === true` et `zoneId === null` ; sinon il passe à `null`.
- **Migration** `8c_delivery_place` : les dossiers sont triés comme du texte, et le lot 7 garde `9_sale_orders`.
- **Pays du numéro** : code ISO à deux lettres, pris dans `PHONE_COUNTRIES`. Sans code, on prend le pays de la boutique. Le pop-up n'importe jamais `libphonenumber-js` : la liste est statique, et un test la compare à la bibliothèque.
- **Pop-up** : ni `motion`, ni `framer-motion`, ni `gsap`. Les animations s'arrêtent sous `prefers-reduced-motion`.
- **Export** :
  - aperçu de 10 lignes ;
  - fichier de 20 000 lignes au plus ;
  - 5 000 numéros au plus ;
  - CSV aux règles du lot 6 (BOM, `;`, CRLF, apostrophe devant `= + - @`, tabulation, CR).
  - Télécharger et copier demandent `respondentContacts` et `csvExport`. L'aperçu est ouvert à tous, avec les numéros masqués si le forfait ne les montre pas.
- **Filtres** : tous les filtres de réponse s'appliquent à **une même** réponse comptée. Le pays s'applique au numéro du client (`phoneE164` commence par l'indicatif).
- **Feuille des notifications** :
  - seulement sur téléphone : `matchMedia('(pointer: coarse)')` et largeur < 1024 ;
  - seulement à l'état `ask` ou `install-first` ;
  - « Plus tard » redemande une seule fois, 7 jours après ;
  - mémoire dans `localStorage` (`tamani-push-prompt`), lue et écrite dans un `try/catch`.
- **Nom du profil** : 1 à 80 caractères après `trim`.
- **Isolation et vie privée** : `organizationId` dans chaque `where` ; une campagne ou un quartier d'une autre boutique donne 404 ; jamais de prénom, de numéro, de nom ni de lieu dans `log.*`.
- **Fichiers protégés** : ni `lib/api.ts`, ni `auth.ts`, ni les middlewares. La route du compte utilise `requireAuth`, `verifyCsrf` et `withRequestContext` tels qu'ils sont.
- **Copie** : interface en français, pas de tiret cadratin ni demi-cadratin, `&nbsp;` avant `:` en JSX, couleurs par jetons seulement (`no-default-palette`).
- **Barrière** avant chaque commit : `pnpm format && pnpm lint && pnpm typecheck && pnpm test`. `pnpm build`, puis la recette sur l'app réelle en fin de lot (règle du porteur : « toujours tester après avoir codé »).

## Review Focus

1. **Une campagne en stock avec un `plannedQuantity` rempli** (ancienne campagne modifiée). L'état du stock doit suivre `stockQuantity`, pas la référence du verdict. → `computeCampaignStats uses the stock, never plannedQuantity, for an in-stock campaign` (Task 1).
2. **Un « Autre endroit » piégé** (`=HYPERLINK(…)`). Il ne doit pas s'exécuter dans Excel. → `exportFile neutralises formulas in the place column` (Task 9).
3. **L'aperçu de l'export en Gratuit.** Aucun numéro complet ne doit quitter le serveur. → `previewExport masks numbers without respondentContacts` (Task 9).
4. **Un pop-up resté ouvert depuis hier**, qui envoie un numéro sans `phoneCountry`. Le pays de la boutique doit s'appliquer. → `upsertResponse falls back to the shop country without phoneCountry` (Task 6).
5. **Le filtre « même réponse »** : un client qui a dit oui au riz en septembre et non à l'huile en octobre ne correspond pas à « intéressé + octobre ». → `listClients applies response filters to one answer` (Task 8). Et un `localStorage` qui lève une erreur ne doit faire ni plantage ni boucle de demandes : `pushPromptDue with throwing storage` (Task 11).

---

### Task 1 : L'état du stock (serveur)

**Files:**
- Create `lib/server/tamani/stock-advice.ts` and its test.
- Modify:
  - `lib/tamani/results-view.ts` (types) ;
  - `lib/server/tamani/stats.ts` ;
  - `lib/server/tamani/money.ts` ;
  - `app/api/shops/[orgId]/campaigns/[campaignId]/stats/route.ts` (select `availability`).
- Tests : `stats.test.ts`, `money.test.ts`, le test de la route stats.

**Interfaces:**
- `export interface StockAdvice { status: 'ENOUGH' | 'SHORTAGE'; leftover: number; restock: number; provisional: boolean }` dans `results-view.ts`.
- `computeStockAdvice(i: { realistic: number; stock: number; completed: number }): StockAdvice`.
- `StatsCampaign` gagne `availability: Availability`.
- `CampaignStats` gagne :
  - `availability: Availability` ;
  - `byTiming: Array<{ timing; respondents; quantity }>`, la quantité venant de `tally`.
- `CampaignResult` gagne `stockAdvice: StockAdvice | null`, non nul seulement pour `IN_STOCK` avec `stockQuantity !== null`. `stockStatus` reste tel quel pour `INCOMING`.
- `computeMoney` gagne `cap: number | null`. Quand `cap !== null` et `realistic > cap`, le bénéfice est multiplié par `cap / realistic` et arrondi. En stock, la route passe `reference: null` et `cap: stock`.

- [ ] Tests :
  - `computeStockAdvice` :
    - (6, 30, 1) → `ENOUGH`, leftover 24, restock 0, provisional true ;
    - (70, 30, 25) → `SHORTAGE`, restock 40, leftover 0, provisional false ;
    - (30, 30, 20) → `ENOUGH`, leftover 0, provisional false.
  - `computeCampaignStats uses the stock, never plannedQuantity, for an in-stock campaign` : stock 30, planned 100 → leftover calculé sur 30.
  - Une campagne `INCOMING` a `stockAdvice: null`.
  - `byTiming` porte la quantité : 3 réponses « aujourd'hui » de 2 pièces → `{ respondents: 3, quantity: 6 }`.
  - En stock, 25 usagers × 2 pièces, coût 5 000, prix 7 000, stock 20 → `avoidedDeadStock: null`, `expectedProfit: 40000`.
  - En stock sous 20 réponses → `money: null`.
  - La route passe `availability` jusqu'à `stats.availability`.
- [ ] Rouge, vert, barrière, commit `feat(dashboard): stock advice for in-stock campaigns`.

### Task 2 : L'onglet Résultats d'une campagne en stock

**Files:**
- Create `components/ui/StockCard.tsx`, exportée par `components/ui/index.ts`.
- Modify :
  - `components/ui/DemandGauge.tsx` ;
  - `lib/tamani/results-view.ts` ;
  - `components/app/CampaignResults.tsx` ;
  - le styleguide (une StockCard de chaque sorte).
- Tests : `composites.test.tsx`, `results-view.test.ts`, `results.test.tsx`.

**Interfaces:**
- `stockAdviceDisplay(advice: StockAdvice, unitLabel: string): { word: string; figure: string | null; sentence: string; tone: 'success' | 'warning' }`. La copie :
  - `ENOUGH` : mot « Stock suffisant », pas de chiffre. Phrase « Il t'en restera environ {approx(leftover)} {unités}. », ou « Tout ton stock devrait partir. » quand leftover vaut 0 ;
  - `SHORTAGE` : mot « Réassort », chiffre `~{approx(restock)}`, phrase « Rupture probable : prévois un réassort d'environ {approx(restock)} {unités}. ».
- `provisionalNote(completed: number): string` donne « Estimation provisoire : {n} réponse(s) sur 20. ».
- `toServeLine(interested: number, announced: number, unitLabel: string): string` donne « 6 intéressés · 12 bouteilles ».
- `StockCard({ word, figure, sentence, tone, note, className })` : un tampon (`Stamp`) avec le mot et le chiffre, la phrase, puis la note en écriture main si elle est donnée.
- `DemandGauge` gagne `referenceLabel?: 'prévu' | 'en stock'` (défaut `'prévu'`). Le texte lu à voix haute dit « pour {S} en stock ».
- `CampaignResults`, quand `stats.availability === 'IN_STOCK'`, dans cet ordre :
  1. **« À servir maintenant »** (une `Card`), si `interested > 0` : `toServeLine`, une ligne par échéance (`TIMING_LABELS`, quantité), et le bouton « Voir les intéressés ». Visible à tous les accès.
  2. **L'état du stock** :
     - si `result?.stockAdvice` existe : `StockCard`, avec la note provisoire sous 20 réponses ;
     - si `stats.stock === null` : la phrase « Indique ton stock dans la campagne pour savoir s'il suffira. » et un lien vers `?onglet=modifier` ;
     - si l'accès est `LOCKED` : la carte « Ton stock va-t-il suffire ? » avec le badge Pro. Elle reprend la phrase du verdict offert quand `offerOpen` vaut true.
  3. La jauge, avec `referenceLabel="en stock"`.
  4. Puis le calcul, l'argent et les chiffres, comme au lot 6.
  - Jamais de `VerdictCard` pour une campagne en stock.

- [ ] Tests :
  - en stock, 1 réponse, accès `PLAN` : « À servir maintenant », « Stock suffisant », « Estimation provisoire : 1 réponse sur 20 », « en stock », et pas « On attend » ;
  - en stock, `SHORTAGE` avec 25 réponses : « Réassort », « ~40 », et pas « invendus » ;
  - en stock, accès `LOCKED` : « Ton stock va-t-il suffire ? », le badge Pro, et toujours « À servir maintenant » ;
  - en stock sans stock : la phrase et `href="/app/campagnes/c1?onglet=modifier"` ;
  - les tests `INCOMING` du lot 6 passent sans changement ;
  - la `DemandGauge` dit « en stock 30 ».
- [ ] Rouge, vert, barrière, commit `feat(dashboard): results tab for an in-stock campaign`.

### Task 3 : L'accueil d'une campagne en stock

**Files:**
- Modify :
  - `lib/server/tamani/home-bulletin.ts` ;
  - `lib/tamani/home-view.ts` ;
  - `components/app/HomeView.tsx`.
- Tests : `home-bulletin.test.ts`, `home-view.test.ts`, `home.test.tsx`.

**Interfaces:**
- `CampaignBulletinItem` gagne `availability: Availability`, `interested: number`, `stockStatus: 'ENOUGH' | 'SHORTAGE' | null` et `restock: number | null`. Les deux derniers valent `null` quand l'accès est `LOCKED` ou qu'il n'y a pas de stock.
- `buildHomeBulletin` :
  - sélectionne `availability` et `stockQuantity` ;
  - calcule `computeStockAdvice` pour les campagnes en stock ;
  - ne somme `moneyProtectedThisMonth` que sur les campagnes `INCOMING`.
- `campaignVerdictLine(item)` pour `IN_STOCK` :
  - le mot vaut « Stock suffisant » (ton success), « Réassort ~X » (ton warning), ou « À servir » (ton primary) quand il n'y a ni stock ni accès ;
  - le chiffre vaut `${interested} à servir` ;
  - `locked: false`.

- [ ] Tests :
  - une campagne en stock n'entre pas dans `moneyProtectedThisMonth` ;
  - elle porte `stockStatus`, `restock` et `interested` ;
  - elle est `LOCKED` en Gratuit → `stockStatus: null` ;
  - les trois lignes `campaignVerdictLine` ;
  - l'accueil affiche « 6 à servir ».
- [ ] Rouge, vert, barrière, commit `feat(dashboard): home line for an in-stock campaign`.

### Task 4 : Onglets et actions de la page campagne

**Files:**
- Modify :
  - `components/ui/Tabs.tsx` ;
  - `lib/tamani/campaign-actions.ts` ;
  - `components/app/CampaignActions.tsx` ;
  - `components/app/InterestedList.tsx` ;
  - `app/(app)/app/campagnes/[id]/page.tsx` (passe `availability`).
- Tests : `shell.test.tsx`, `campaign-actions.test.ts`, `interested.test.tsx`.

**Interfaces:**
- `campaignActions(status, availability): ReadonlyArray<{ to: CampaignStatus; label: string; emphasis: 'primary' | 'quiet' }>` :
  - `DRAFT` → Lancer la campagne (primary) ;
  - `ACTIVE` :
    - `INCOMING` → Le produit est arrivé (primary), Terminer la campagne (quiet) ;
    - `IN_STOCK` → Terminer la campagne (quiet) ;
  - `CLOSED` :
    - `INCOMING` → Le produit est arrivé (primary), Rouvrir la campagne (quiet) ;
    - `IN_STOCK` → Rouvrir la campagne (quiet) ;
  - `ARRIVED` → Terminer la campagne (quiet).
- `CampaignActions` : le bouton `primary` est un `Button`. Un bouton `quiet` est un `Button variant="ghost"`, souligné, à droite des actions principales. La confirmation de « Terminer » reste.
- `Tabs` devient une barre d'onglets :
  - `nav` avec un trait du bas `border-b-2 border-grid` ;
  - chaque `li` en `flex-1` ;
  - le lien fait au moins 48 px de haut, centré, avec `border-b-4` : `border-accent text-ink font-bold` quand il est actif, `border-transparent text-ink-soft` sinon ;
  - ni `frame` ni `bg-accent` ;
  - la barre défile au-delà de quatre onglets.
- `InterestedView` : l'encadré « Le produit est arrivé ? » n'apparaît que pour une campagne `INCOMING` qui n'est pas encore `ARRIVED`.

- [ ] Tests :
  - le test existant « chaque bouton est un mouvement que le serveur accepte » couvre les deux disponibilités ;
  - `IN_STOCK` n'a jamais `ARRIVED` ;
  - les onglets ont `aria-current="page"` sur l'actif, et aucun n'a la classe `frame` ;
  - pas d'encadré d'arrivée sur une campagne en stock.
- [ ] Rouge, vert, barrière, commit `feat(campaign): tab bar and named actions`.

### Task 5 : La galerie de photos du pop-up

**Files:**
- Create `app/(public)/c/[code]/photo-gallery.tsx` (`'use client'`).
- Modify `app/(public)/c/[code]/popup-sheet.tsx`.
- Tests : `popup.test.tsx`.

**Interfaces:**
- `PhotoGallery({ photos: readonly string[]; name: string; className? })`. Rien quand `photos` est vide.
- Le balisage :
  - une `section` avec `aria-roledescription="carrousel"` et `aria-label="Photos de {name}"` ;
  - une `ul` en `flex snap-x snap-mandatory overflow-x-auto` ;
  - chaque `li` en `w-full shrink-0 snap-center` ;
  - chaque `img` avec `src = cloudinaryVariant(p, POPUP_PHOTO)` et `object-contain` ;
  - le texte de l'image : « {name}, photo {i} sur {n} ».
- Le chargement : la première photo en `loading="eager"` et `fetchPriority="high"`, les autres en `lazy`.
- Avec au moins 2 photos :
  - un point par photo : `button` avec `aria-label="Photo {i}"` et `aria-current` sur la photo affichée, qui fait défiler jusqu'à elle (`behavior: 'smooth'`, ou `'auto'` sous `prefers-reduced-motion`) ;
  - des flèches à partir de `lg`.
- L'indice affiché se calcule au défilement : `Math.round(scrollLeft / clientWidth)`.
- La mise en page du pop-up :
  - la galerie fait `h-[38dvh] min-h-40` (`lg:h-[44dvh]`) au lieu de la zone qui rétrécissait ;
  - la feuille défile dans le reste de l'écran ;
  - le fond flou garde la première photo.

- [ ] Tests :
  - 3 photos → 3 images et 3 points ; la première en eager et high, les deux autres en lazy ;
  - 1 photo → aucun point ;
  - aucune photo → pas de galerie ;
  - les textes des images ;
  - le test « la page tient sur un écran » est mis à jour pour la nouvelle hauteur ;
  - `no-motion-in-popup` passe.
- [ ] Rouge, vert, barrière, commit `feat(popup): swipeable product photos`.

### Task 6 : Lieu de livraison et pays du numéro (serveur)

**Files:**
- Modify `prisma/schema.prisma` : `Response.deliveryPlace String?`.
- Create :
  - `prisma/migrations/8c_delivery_place/migration.sql` : `ALTER TABLE "Response" ADD COLUMN "deliveryPlace" TEXT;` ;
  - `lib/tamani/phone-countries.ts` et son test.
- Modify :
  - `lib/server/tamani/inputs.ts`, `responses.ts`, `stats.ts`, `campaign-responses.ts`, `campaign-export.ts`, `public-campaign.ts` ;
  - `lib/tamani/results-view.ts` ;
  - le select de la route stats.
- Tests : `phone-countries.test.ts`, `inputs.test.ts`, `responses.test.ts`, `stats.test.ts`, `campaign-export.test.ts`, `results-view.test.ts`, `schema-tamani.test.ts`.

**Interfaces:**
- `PHONE_COUNTRIES: ReadonlyArray<readonly [code: string, dial: string]>` : tous les pays de libphonenumber, triés par code, écrits en dur (sans import de la bibliothèque).
- `isPhoneCountry(code: string): boolean`.
- `dialPrefixFor(code): string | null` donne `'+229'`.
- `phoneCountryChoices(shopCountry: string, names?: Intl.DisplayNames): Array<{ code; label; dialCode }>`, dans cet ordre :
  1. le pays de la boutique ;
  2. les autres `SHOP_COUNTRIES`, dans leur ordre ;
  3. le reste, trié par nom français (`Intl.DisplayNames(['fr'], { type: 'region' })`, et le code quand le nom manque).
- Le corps public gagne :
  - `deliveryPlace?: string | null` (2 à 80 caractères, trim, caractères de contrôle refusés) ;
  - `phoneCountry?: string` (`isPhoneCountry`, sinon 400 `VALIDATION_FAILED`).
- `upsertResponse` :
  - `deliveryPlace` est gardé seulement si `wantsDelivery === true` et que la réponse n'a pas de `zoneId` ; un quartier ou un retrait l'efface ;
  - le numéro passe par `normalizePhone(phone, phoneCountry ?? shopCountry(org.country))`.
- `PublicCampaign.shop` gagne `country: string`.
- `StatsRow` gagne `deliveryPlace`, et `CampaignStats` gagne `elsewhere: { respondents; quantity }` : les oui livrés sans quartier mais avec un lieu.
- `InterestedRow` gagne `deliveryPlace: string | null` et `country: string | null`. Le pays est calculé côté serveur avec libphonenumber, et `null` sans numéro visible.
- `interestedDetail` montre « Livraison · {lieu} » quand il n'y a pas de quartier.
- `responsesCsv` gagne les colonnes « Produit » (en tête), « Pays » et « Lieu ».
- `CampaignResults` (dans `components/app/`, testé dans `results.test.tsx`) : « Où livrer » gagne la ligne « Autre endroit : N » après « Retrait sur place », quand `elsewhere.respondents > 0`.

- [ ] Tests :
  - `PHONE_COUNTRIES` est égale à `getCountries()` / `getCountryCallingCode()` de `libphonenumber-js/min` ;
  - `phoneCountryChoices('BJ')` commence par BJ, puis SN, CI… ;
  - un lieu est gardé quand il n'y a pas de quartier, et effacé par un quartier ou par un retrait ;
  - un lieu de 81 caractères, ou contenant `\u0007`, donne 400 ;
  - `phoneCountry: 'FR'` avec « 6 12 34 56 78 » donne `+33612345678` ;
  - `upsertResponse falls back to the shop country without phoneCountry` ;
  - `phoneCountry: 'ZZ'` donne 400 ;
  - `elsewhere` compte 2 lieux, et l'onglet Résultats montre « Autre endroit » ;
  - le CSV a les colonnes Produit, Pays et Lieu ;
  - `schema-tamani` trie `8c_delivery_place` entre `8b_free_verdict` et le futur `9_sale_orders`.
- [ ] Appliquer la migration sur Neon de dev (`node --env-file=.env.local node_modules/prisma/build/index.js migrate deploy`), puis `prisma generate`, le serveur arrêté.
- [ ] Rouge, vert, barrière, commit `feat(popup): delivery place and phone country on the server`.

### Task 7 : Les écrans du pop-up : « Autre endroit », pays, « C'est bien moi »

**Files:**
- Modify :
  - `lib/tamani/popup-machine.ts` ;
  - `lib/tamani/popup-client.ts` ;
  - `components/ui/PhoneInput.tsx` ;
  - `app/(public)/c/[code]/popup-sheet.tsx` ;
  - `lib/server/observability/no-motion-in-popup.test.ts` (nouvelle règle).
- Tests : `popup-machine.test.ts`, `popup.test.tsx`, `primitives.test.tsx`.

**Interfaces:**
- `PopupAnswers` gagne `deliveryPlace: string | null`. L'action `delivery` gagne `place: string | null`, qui passe à `null` dès qu'un quartier est choisi ou que la personne passe récupérer.
- `PopupState` gagne `forgotten: RememberedRespondent | null` :
  - `notMe` met `remembered` dans `forgotten` ;
  - une nouvelle action `{ type: 'itsMe' }` remet `forgotten` dans `remembered` ;
  - `completed` vide `forgotten`.
- `stepBody` et le renvoi de toutes les réponses portent `deliveryPlace`. Le contact porte `phoneCountry`.
- `PhoneInput` gagne `countries?: ReadonlyArray<{ code; label; dialCode }>`, `country?: string` et `onCountryChange?: (code) => void`. Avec `countries`, l'indicatif devient un `select`, nommé « Pays du numéro », qui affiche l'indicatif choisi. Sans `countries`, rien ne change.
- `DeliveryStep` :
  - après les quartiers vient le choix « Autre endroit ». Il ouvre un `Input` « Où ? (quartier, ville ou pays) » (`maxLength` 80) et le bouton « Continuer », actif à partir de 2 caractères ;
  - une boutique sans quartier : « Oui, livre-moi » ouvre directement ce champ.
- `ContactStep` :
  - sans `remembered` mais avec `forgotten`, le formulaire montre le lien « C'est bien moi, {Prénom} » ;
  - le `PhoneInput` reçoit `phoneCountryChoices(c.shop.country)`.
- La règle `no-motion-in-popup` refuse aussi `libphonenumber-js` sous `app/(public)/c/**` et dans `lib/tamani/phone-countries.ts`.

- [ ] Tests :
  - `notMe` puis `itsMe` rend la même personne ;
  - `delivery` avec un lieu, puis un quartier, efface le lieu ;
  - « Autre endroit » est présent après les quartiers ;
  - le champ a `maxlength="80"` ;
  - une boutique sans quartier demande « Où ? » ;
  - le `select` du pays a BJ choisi en premier pour une boutique béninoise ;
  - « C'est bien moi, Awa » ;
  - la règle de la bibliothèque échoue sur un import ajouté pour le test, puis passe.
- [ ] Rouge, vert, barrière, commit `feat(popup): elsewhere, phone country and its-me`.

### Task 8 : Les filtres des clients

**Files:**
- Create `lib/tamani/client-filters.ts` et son test, ainsi que `components/app/ClientFilterSheet.tsx`.
- Modify :
  - `lib/server/tamani/clients.ts` ;
  - `app/(app)/app/clients/page.tsx` ;
  - `components/app/ClientList.tsx` si besoin.
- Tests : `clients.test.ts`, le test de la route clients, `client-filters.test.ts`, le test de la page clients.

**Interfaces:**
- Les paramètres d'adresse :
  - `type=revendeurs|usagers` ;
  - `reponse=oui|non` ;
  - `campagne=<id>` ;
  - `quartier=<zoneId>|autre` ;
  - `periode=ce-mois|mois-dernier|3-mois|AAAA-MM` ;
  - `pays=<ISO2>` ;
  - `q`.
- `ClientFilterState` (pur, dans `client-filters.ts`) : `{ type, answer, campaignId, zone, period, country, q }`, chacun `null` quand il est absent.
- Les fonctions pures :
  - `parseClientSearch(params): ClientFilterState | null` donne `null` sur une valeur inconnue ;
  - `clientFilterSearch(state): string` rend les paramètres dans un ordre stable, sans le curseur ;
  - `filterChips(state, names: { campaigns: Map; zones: Map }): Array<{ key; label; href }>` donne une pastille par filtre actif, avec l'adresse sans ce filtre ;
  - `periodRange(period, now): { gte: Date; lt: Date }` en UTC, avec `monthWindowUtc` ;
  - pour `3-mois` : du début du mois M−2 jusqu'à la fin du mois en cours.
- `clients.ts` :
  - `ClientFilters` devient `ClientFilterState` (le serveur réutilise `parseClientSearch`) ;
  - **un seul** `responses: { some: { ...COUNTED, buyerType?, interested?, campaignId?, zoneId? | { zoneId: null, deliveryPlace: { not: null } }, completedAt? } }` quand un filtre de réponse est présent ;
  - le pays donne `phoneE164: { startsWith: dialPrefixFor(pays) }` ;
  - les `counts` restent ceux de toute la boutique.
- La page Clients :
  - un bouton « Filtrer » ouvre `ClientFilterSheet` (un `dialog` en `showModal`). La feuille charge les campagnes (`GET …/campaigns`) et les quartiers (`GET …/zones`). Elle propose un `Select` par filtre et les quatre périodes, plus les mois qui ont des réponses. Le pays vient de `phoneCountryChoices(shop.country)` ;
  - sous la recherche : les pastilles, chacune avec sa croix, puis « Tout effacer ».

- [ ] Tests :
  - `listClients applies response filters to one answer` : le `where` contient un seul `some` qui porte `interested` et `completedAt` ensemble ;
  - `pays=BJ` donne `startsWith '+229'` ;
  - `quartier=autre` donne `zoneId: null` et `deliveryPlace` non nul ;
  - `periode=2026-13` donne 400 ;
  - un `campagne` d'une autre boutique ne renvoie personne : le `where` porte toujours `organizationId` ;
  - `filterChips` retire seulement son propre filtre ;
  - la page montre les pastilles et « Tout effacer ».
- [ ] Rouge, vert, barrière, commit `feat(clients): filters by answer, campaign, zone, period and country`.

### Task 9 : L'export avec filtres (serveur)

**Files:**
- Create :
  - `lib/tamani/export-view.ts` et son test ;
  - `lib/server/tamani/exports.ts` et son test ;
  - les routes `app/api/shops/[orgId]/exports/{preview,file,numbers}/route.ts` et leurs tests.
- Modify `lib/server/tamani/campaign-export.ts` (ajout de `clientsCsv`) et `campaign-responses.ts` (exporte `ROW_SELECT`, `toRow` et `COUNTED`).
- Delete `app/api/shops/[orgId]/campaigns/[campaignId]/export/route.ts` et son test.

**Interfaces:**
- `ExportQuery` (dans `export-view.ts`) :
  - `{ what: 'responses'; answer: 'yes' | 'no' | 'all'; campaignId; period; zone; timing: Timing | null; buyerType: BuyerType | null; country }` ;
  - ou `{ what: 'clients'; filters: ClientFilterState }`.
- Les paramètres : `quoi=reponses|clients`, `reponse=oui|non|toutes`, `echeance=<Timing>`, et pour le reste les mêmes noms que le Task 8.
- Les fonctions :
  - `parseExportSearch(params): ExportQuery | null` ;
  - `exportSearch(q): string`.
- `exports.ts` :
  - `previewExport(db, orgId, q, { canSeeContacts }): Promise<{ total: number; headers: string[]; rows: string[][] }>` : 10 lignes, cellules déjà en texte français, numéro masqué sans `canSeeContacts` ;
  - `exportFile(db, orgId, q, now): Promise<{ csv: string; filename: string }>` : 20 000 lignes au plus. Les noms de fichier : `tamani-{interesses|pas-interesses|reponses|clients}[-{campagne}]-{AAAA-MM-JJ}.csv` ;
  - `exportNumbers(db, orgId, q): Promise<string[]>` : 5 000 numéros au plus, chacun une fois, au format `displayPhone`.
- `clientsCsv(rows)` : Prénom, Numéro WhatsApp, Pays, Achète pour, Quartier le plus fréquent, Réponses, Oui, Dernière réponse, Dernier produit.
- Les routes, toutes `MEMBER` :
  - `preview` → `{ total, headers, rows }`, sur tous les forfaits ;
  - `file` → le CSV, ou 403 `PLAN_FEATURE_LOCKED` sans `csvExport` et `respondentContacts` ;
  - `numbers` → `{ numbers }`, avec la même règle de forfait ;
  - une requête mal formée donne 400 `VALIDATION_FAILED` ;
  - une campagne d'une autre boutique donne 404 `CAMPAIGN_NOT_FOUND`.

- [ ] Tests :
  - les filtres (réponse, période, quartier, autre endroit, échéance, type, pays) arrivent dans le `where` ;
  - `previewExport masks numbers without respondentContacts` ;
  - `exportFile neutralises formulas in the place column` ;
  - le nom du fichier ;
  - le quartier le plus fréquent d'un client ;
  - `file` donne 403 en Gratuit, `preview` 200 en Gratuit avec des numéros masqués ;
  - `numbers` est dédupliqué ;
  - 400, puis 404 pour la campagne d'une autre boutique.
- [ ] Rouge, vert, barrière, commit `feat(export): filtered preview, file and numbers`.

### Task 10 : L'écran Exporter

**Files:**
- Create `app/(app)/app/exporter/page.tsx` et `components/app/ExportView.tsx` (`ExportView` dessinée depuis ses props, `ExportScreen` qui charge).
- Modify :
  - `components/app/InterestedList.tsx` ;
  - `app/(app)/app/clients/page.tsx` ;
  - `lib/tamani/export-view.ts` (`exportHref`).
- Tests : `export.test.tsx`, `interested.test.tsx`.

**Interfaces:**
- `exportHref(q: ExportQuery): string` donne `/app/exporter?…`.
- `ExportView({ query, preview, canDownload, busy, onChange, onDownload, onCopy })`, dans cet ordre :
  1. « Quoi » : choix entre intéressés, pas intéressés, toutes les réponses, et clients ;
  2. « Filtres » : un `Select` par filtre, les clients reprenant les filtres du Task 8 ;
  3. « Aperçu » : « {total} lignes », puis un tableau des en-têtes et des 10 lignes, qui défile à l'horizontale dans son cadre, jamais la page ;
  4. les boutons « Télécharger ({total} lignes) » et « Copier les numéros ».
  - En Gratuit, `canDownload` vaut false : les deux boutons cèdent la place à « Passe au Pro pour télécharger » (`/app/plus#forfait`), avec le badge Pro.
  - Sans aucune ligne, « Rien à exporter avec ces filtres. » remplace le tableau, et les boutons sont désactivés.
- `ExportScreen` lit l'adresse (`parseExportSearch`) et y réécrit chaque changement (`router.replace`). L'aperçu se recharge 300 ms après le dernier changement. `downloadFile` charge `exports/file`, et `copyText` reçoit le résultat de `exports/numbers`.
- `InterestedView` : « Télécharger pour Excel » devient un lien vers `exportHref({ what: 'responses', campaignId, answer: filtre actif })`. Le bouton copier reste.
- La page Clients : un bouton « Exporter » mène à `exportHref({ what: 'clients', filters })`.

- [ ] Tests :
  - le rendu Pro : l'aperçu montre 10 lignes, et « Télécharger (142 lignes) » ;
  - le rendu Gratuit : « Passe au Pro pour télécharger », des numéros masqués, et aucun bouton de téléchargement ;
  - le cas vide ;
  - le lien de l'onglet Intéressés vaut `/app/exporter?quoi=reponses&reponse=oui&campagne=c1`.
- [ ] Rouge, vert, barrière, commit `feat(export): export screen with preview`.

### Task 11 : Les notifications demandées d'office sur téléphone

**Files:**
- Create `components/app/PushPrompt.tsx`.
- Modify :
  - `lib/tamani/push-state.ts` ;
  - `components/app/AppShell.tsx` (monte `PushPrompt`) ;
  - `components/app/HomeView.tsx` (retire `PushCard`) ;
  - `app/(app)/app/reglages/settings-view.tsx` (`id="notifications"` sur la section).
- Tests : `push-state.test.ts`, `push.test.tsx` (ou le test existant de `PushCard`), `home.test.tsx`.

**Interfaces:**
- `pushPromptDue(i: { state: PushCardState; isPhone: boolean; memory: { count: number; at: number } | null; now: number }): boolean`. Vrai quand les trois conditions tiennent :
  - `isPhone` ;
  - l'état est `ask` ou `install-first` ;
  - `memory` est nul, ou `count === 1` et 7 jours au moins sont passés depuis `at`.
- `readPushPrompt(storage: Storage | null): { count; at } | null` et `writePushPrompt(storage, value): void` ne lèvent jamais d'erreur.
- `PushPromptView({ state: 'ask' | 'install-first', busy, onYes, onLater })` :
  - pour `ask` : « Être prévenu à chaque réponse ? », avec les boutons « Oui, préviens-moi » et « Plus tard » ;
  - pour `install-first` : la phrase d'installation de `PushCard`, avec « J'ai compris » et « Plus tard ».
- `PushPrompt` : `usePush('settings')`, `isPhone` calculé une fois au montage, et la feuille montrée quand `pushPromptDue` est vrai.
  - « Oui » appelle `enable()`, puis ferme la feuille.
  - « Plus tard » et « J'ai compris » écrivent `{ count + 1, at: now }`.
  - Le compteur est aussi écrit quand `enable()` échoue, pour ne pas reposer la question.

- [ ] Tests :
  - `pushPromptDue` : sur ordinateur, jamais ; à `count` 2, jamais ; dans les états `on`, `denied` et `unsupported`, jamais ; avec `count` 1, 6 jours après → faux, 7 jours après → vrai ;
  - `pushPromptDue with throwing storage` : `readPushPrompt` sur un stockage qui lève une erreur donne `null`, et `writePushPrompt` ne lève rien ;
  - la vue montre les deux textes ;
  - l'accueil n'a plus « Sois prévenu à chaque réponse ».
- [ ] Rouge, vert, barrière, commit `feat(push): ask on the phone, settings keep the switch`.

### Task 12 : Plus et Profil

**Files:**
- Create :
  - `app/api/account/route.ts` et son test ;
  - `app/(app)/app/profil/page.tsx` ;
  - `components/app/ProfileView.tsx`.
- Modify :
  - `app/(app)/app/plus/page.tsx` ;
  - `components/app/AppShell.tsx` ;
  - `lib/tamani/api-messages.ts` (un message si un nouveau code apparaît).
- Tests : le test de la route, `profile.test.tsx`, le test de la page Plus, `shell.test.tsx`.

**Interfaces:**
- `PATCH /api/account` :
  - corps `{ name: string }`, avec `trim` et 1 à 80 caractères ;
  - suit le modèle des routes du kit : `withRequestContext`, `verifyCsrf`, `requireAuth`, puis `prisma.user.update({ where: { id: ctx.userId } })` ;
  - renvoie `{ user: { name } }` ;
  - `runtime = 'nodejs'` ;
  - le nom n'apparaît jamais dans les logs.
- `/app/profil` lit `GET /api/auth/me` (`hasPassword`) et montre `ProfileView({ name, email, hasPassword, logoUrl, onRename, onPassword, onSignOut })`, dans cet ordre :
  1. l'avatar ;
  2. le formulaire du nom, puis `reload()` du shop pour l'en-tête ;
  3. l'e-mail en lecture seule ;
  4. le mot de passe :
     - avec `hasPassword` : un mot de passe actuel et un nouveau, envoyés à `PUT /api/auth/change-password` (`{ currentPassword, newPassword }`) ;
     - sinon : « Créer un mot de passe », envoyé à `POST /api/auth/set-password` (`{ newPassword }`) ;
     - les erreurs passent par `errorMessage` ;
  5. « Se déconnecter », sortie de la page Plus.
- La page Plus est une seule liste, avec une icône par ligne :
  - Produits ;
  - Forfait : `planSentence`, puis `#forfait` qui reste l'ancre du forfait ;
  - Réglages de la boutique ;
  - Notifications (`/app/reglages#notifications`) ;
  - Profil ;
  - Aide (`LANDING_LINKS.whatsappContact`, lien `wa.me`, caché si `null`) ;
  - Se déconnecter.
- `AppShell` : l'avatar mène à `/app/profil`, avec `aria-label="Ton profil"`.

- [ ] Tests :
  - la route : 401 sans session, 403 sans CSRF, 400 avec un nom vide, 200 avec un nom à nettoyer ;
  - elle ne met à jour que l'utilisateur connecté ;
  - `runtime-enforcement` passe ;
  - le Profil existe en deux variantes, selon `hasPassword` ;
  - Plus montre les lignes, et Aide reste cachée quand le lien est `null` ;
  - l'avatar a `href="/app/profil"`.
- [ ] Rouge, vert, barrière, commit `feat(account): profile page and the Plus list`.

### Task 13 : Demi-douzaine, documentation, recette sur l'app réelle

**Files:**
- Modify :
  - `lib/tamani/units.ts` et son test ;
  - `lib/tamani/verdict-display.test.ts` ;
  - `docs/superpowers/specs/2026-10-24-tamani-design.md` (§5.3, §5.4, §5.5, §6) ;
  - la feuille de route ;
  - `CLAUDE.md`, section du lot 6.
- La recette vit dans le scratchpad : `tools/recette-6-data.mjs` (nouveau mode `create6b`) et `tools/recette-6b.mjs`.

- [ ] `COMMON_UNITS` gagne « demi-douzaine » juste après « douzaine ». `pluralizeUnit('demi-douzaine', 2)` donne « demi-douzaines ». Rouge, vert.
- [ ] Docs :
  - la spec, selon le §11 des retours ;
  - la feuille de route : une ligne `6b`, le point 4 du lot 7 réduit au filtre `hasOrdered`, à la note et à l'anonymisation, et le travail UX/UI noté après le lot 7 ;
  - `CLAUDE.md` : un paragraphe « Lot 6b » sur l'état du stock, le lieu, le pays, les filtres, l'export, la feuille des notifications et le profil.
- [ ] Barrière complète, puis `pnpm build` (en arrière-plan ; vérifier d'abord la mémoire libre, voir les pièges Windows).
- [ ] Données de recette `create6b` (compte jetable `recette-6@example.com`). Les numéros sont inventés ; ne jamais lancer `seed:dev`.
  - Une campagne « Livre de commerce » en stock :
    - stock 30, 3 photos Cloudinary de démonstration ;
    - 25 réponses, dont 2 « Autre endroit » (« Lomé », et `=HYPERLINK("x")`) et un numéro +33.
  - Une campagne en stock sans stock.
- [ ] La recette `recette-6b.mjs` sur `next start` (port 3001), à 390 et 1 280 px, avec des captures d'écran et sans débordement horizontal :
  1. le pop-up : 3 photos, des points qui changent la photo, « Autre endroit » jusqu'au bout, le pays FR choisi, « pas toi ? » puis « C'est bien moi » ;
  2. la page campagne en stock :
     - 4 onglets visibles, pas de « Produit arrivé » ;
     - « À servir maintenant », « Réassort ~… » ou « Stock suffisant », « en stock » ;
     - le cas sans stock ;
  3. les clients : filtre pays, filtre « Autre endroit », pastilles et « Tout effacer » ;
  4. l'export :
     - l'aperçu et son nombre de lignes ;
     - le fichier : 200, BOM lu par `arrayBuffer`, colonne Lieu protégée par une apostrophe ;
     - en Gratuit : aperçu masqué, `file` 403 ;
  5. Plus et Profil : changer le nom, qui apparaît dans l'en-tête ; Aide cachée ;
  6. sur 390 px tactile (`Emulation.setTouchEmulationEnabled`) : la feuille des notifications apparaît une fois, et « Plus tard » la fait disparaître au rechargement ;
  7. l'accueil : pas de carte de notifications ; « N à servir » pour la campagne en stock.
- [ ] Corriger chaque défaut vu en recette : un test rouge d'abord, puis vert, la barrière et un commit.
- [ ] Remettre le serveur en marche et donner au porteur le lien et les identifiants. Lui proposer la PR du lot 6 + 6b, et la suppression du compte de recette quand il aura fini.
- [ ] Commit `docs(dashboard): lot 6b rules, decisions and recette`.

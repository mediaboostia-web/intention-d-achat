# Tamani 06 : le tableau de bord

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tenir la promesse de Tamani : sur la page campagne, le grossiste voit le verdict, la quantité à commander, l'argent évité, d'où vient la demande et la liste des intéressés à recontacter. L'accueil devient le « bulletin du jour ».

**Architecture:**
- Les règles sont pures et testées dans `lib/server/tamani/` :
  - `coefficients.ts`, `verdict.ts`, `money.ts` ;
  - `stats.ts`, qui assemble une campagne ;
  - `free-verdict.ts`, le verdict offert ;
  - `csv.ts`.
- Les types partagés avec le navigateur et les phrases des écrans vivent dans `lib/tamani/results-view.ts`.
- Quatre routes de lecture :
  - `stats` ;
  - `responses` ;
  - `responses/numbers` ;
  - `export`.
- Une route existante change : le résumé de l'accueil (`summary`).
- La page campagne gagne deux onglets client, Résultats et Intéressés, construits avec le kit du lot 2. La jauge du styleguide devient un composant du kit.

**Tech Stack:** Next.js 16 (route handlers, `runtime = 'nodejs'`), Prisma 5 (migration `8b_free_verdict`), React 19, Tailwind 4 (jetons du lot 2), Vitest (`prismaMock`, HTML statique, jsdom).

**Spec:** [spec produit](../specs/2026-10-24-tamani-design.md) §5.4 à §5.5, §5.6 ; [feuille de route](2026-10-24-tamani-roadmap.md), Lot 6 et §Contrats Lot 6 ; écran de référence : `CampaignScreen` du styleguide (`app/(public)/styleguide/page.tsx`).

## Décisions du porteur (2026-10-27) prises en compte

- **Verdict offert** : en Gratuit, la boutique voit le verdict de **sa première campagne qui atteint 20 réponses**.
  - Le porteur a validé l'idée du verdict offert sur la première campagne. La règle « la première qui atteint 20 réponses » est un **[choix]** : une campagne d'essai avec 3 réponses ne doit pas gaspiller le cadeau.
  - Le choix est gardé une fois pour toutes dans `Organization.freeVerdictCampaignId`.
- **Paiement à la consommation** : les fonctions qui coûtent à l'usage se paieront en crédits, en plus des forfaits. Détails au lot 8 ; rien à faire dans ce lot.
- **Toute l'Afrique francophone** : un lot « Pays et monnaies » est ajouté à la feuille de route. Rien à faire dans ce lot.

## Global Constraints

- Seuils exacts du verdict :
  - moins de 20 réponses comptées → `WAIT` ;
  - ratio réaliste / référence ≥ 0.9 → `GO` ;
  - ratio ≥ 0.4 → `CAUTION` ;
  - sinon `STOP` ;
  - sans référence → `NEUTRAL`.
- La référence est `plannedQuantity`, sinon `stockQuantity`.
- Coefficients par défaut : usagers 0.5, revendeurs 0.7. La fourchette est le coefficient ± 0.1, bornée à [0, 1].
- **Réponse comptée** = complète, non verrouillée, non suspecte. Seules les réponses comptées entrent dans l'estimation, les répartitions, la liste et l'export. Les verrouillées et les suspectes ne sont que comptées à part.
- Les forfaits passent par `PLANS[plan].features` :
  - `estimate` donne le verdict, la quantité et l'argent ;
  - `respondentContacts` donne les numéros et les boutons WhatsApp ;
  - `csvExport` donne l'export et la copie des numéros.
- En Gratuit, aucun numéro complet ne quitte le serveur : `maskPhone`, `phoneE164: null`.
- Isolation : chaque requête porte `organizationId` ; une campagne d'une autre boutique donne `404 CAMPAIGN_NOT_FOUND`.
- Données personnelles : jamais de prénom ni de numéro dans `log.*`.
- Montants entiers en FCFA. Aucune couleur hors jetons (`no-default-palette`). Interface en français. Pas de tiret cadratin ni demi-cadratin dans le texte affiché.
- Barrière avant chaque commit : `pnpm format && pnpm lint && pnpm typecheck && pnpm test`. `pnpm build` en fin de lot.
- Noms de migrations : Prisma les trie comme du texte. `10_…` passerait avant `1_…`. Ce lot prend `8b_free_verdict`, et le lot 7 garde `9_sale_orders`.

## Review Focus

1. **Peu de réponses.** Avec 5 réponses, le stock « évité » serait énorme et faux. → L'argent n'est calculé qu'en dehors de `WAIT` : `computeCampaignStats leaves money null while waiting`.
2. **Un prénom piégé dans l'export.** `=HYPERLINK(...)` ou `+221…` ouverts dans Excel s'exécutent comme une formule. → Toute cellule qui commence par `= + - @` est préfixée d'une apostrophe : `toExcelCsv neutralises formula cells`.
3. **Deux campagnes atteignent 20 réponses en même temps en Gratuit.** Une seule reçoit le verdict offert, et pour toujours. → `updateMany … where freeVerdictCampaignId: null`, puis relecture : `claimFreeVerdict keeps the first claim`.
4. **Une boutique Gratuite qui devine les numéros.** Ni `stats`, ni `responses`, ni `numbers`, ni `export` ne rendent un numéro complet. → Tests de restriction sur chaque route.
5. **Une réponse « oui » incomplète ou sans statut** (vieille donnée, popup interrompu). Elle n'entre ni dans l'estimation ni dans les répartitions, et rien ne plante. → `computeCampaignStats skips yes rows without buyer type or quantity`.

---

### Task 1 : Les règles du verdict

**Files:**
- Create: `frontend/src/lib/server/tamani/coefficients.ts`, `verdict.ts`, `money.ts` et leurs `*.test.ts`
- Modify: `frontend/src/lib/server/tamani/estimate.ts` (ajout de `estimateFromTotals`)
- Create: `frontend/src/lib/tamani/results-view.ts` (types partagés), avec `DemandEstimate` déplacé depuis `estimate.ts`, qui le réexporte.

**Interfaces (Produces):**
- `coefficientsFor(org: { coefConsumer: number; coefReseller: number }, learned?: null): { consumer; reseller; source: { consumer: 'DEFAULT' | 'SHOP'; reseller: 'DEFAULT' | 'SHOP' } }` : `SHOP` dès que la valeur diffère du défaut.
- `MIN_RESPONSES_FOR_VERDICT = 20` ; `verdictReference({ plannedQuantity, stockQuantity }): number | null` ; `computeVerdict({ realistic, completedResponses, reference }): { code: VerdictCode; ratio: number | null; missingResponses: number }`.
- `computeMoney({ reference, estimate, costPrice, unitPrice, wholesalePrice }): { avoidedDeadStock: number | null; expectedProfit: number | null }`. Sans `costPrice`, les deux valent `null`. Sans référence, `avoidedDeadStock` vaut `null`. Les revendeurs sont valorisés au prix de gros quand il existe. Les montants sont arrondis à l'entier.
- `estimateFromTotals(totals: Record<BuyerType, { respondents; announced }>, coefs): DemandEstimate`. `estimateDemand` en devient un appel.

- [ ] Tests d'abord (aux seuils de la feuille de route) :
  - `computeVerdict` : 19 réponses → `WAIT` (`missingResponses` 1) ; ratio 0.9 → `GO` ; 0.89 → `CAUTION` ; 0.4 → `CAUTION` ; 0.39 → `STOP` ; référence `null` → `NEUTRAL` ; référence 0 → `NEUTRAL`.
  - `computeMoney` : référence 400, réaliste 210, prix d'achat 6 000 → `avoidedDeadStock 1140000`. Réaliste au-dessus de la référence → 0. Sans prix d'achat → `null`.
  - Bénéfice : 126 revendeurs au gros (6 000) et 85 usagers à 7 500, achat 4 000 → `126*2000 + 85*3500`.
  - `coefficientsFor` : 0.5 et 0.7 → `DEFAULT` ; 0.6 → `SHOP`.
  - `estimateFromTotals` donne le même résultat que `estimateDemand` sur les mêmes lignes.
- [ ] Les voir échouer, implémenter, les voir passer, barrière, commit `feat(dashboard): verdict, coefficients and money rules`.

### Task 2 : Les chiffres d'une campagne (`stats.ts`)

**Files:** Create `frontend/src/lib/server/tamani/stats.ts`, `stats.test.ts`. Modify `lib/tamani/results-view.ts`.

**Interfaces (Produces):** dans `results-view.ts`, `CampaignStats` :
```ts
{
  opens; completed; incomplete; lockedCount; suspiciousCount;
  interested; notInterested; interestRate: number | null; announced;
  reference: number | null; stock: number | null;
  stockStatus: 'SHORTAGE' | 'ENOUGH' | null;              // réaliste face au stock
  byBuyerType: Record<BuyerType, { respondents; announced }>;
  byZone: Array<{ zoneId: string; name: string; respondents; quantity }>; // intéressés livrés, quantité décroissante
  pickup: { respondents; quantity };                       // intéressés qui passent récupérer
  byTiming: Array<{ timing: Timing; respondents }>;
  byOption: Array<{ option: string; respondents; quantity }>;
  bySource: Array<{ linkId; label; opens; completed; interested }>; // lien par défaut d'abord
  noReasons: Array<{ reason: NotInterestedReason; count }>; // décroissant
  result: CampaignResult;                                   // toujours calculé ici
}
CampaignResult = {
  estimate: DemandEstimate;
  coefs: { consumer; reseller; source };
  verdict: { code; ratio; missingResponses };
  money: { avoidedDeadStock; expectedProfit } | null;      // null tant que WAIT
}
```
`computeCampaignStats(rows: StatsRow[], campaign: StatsCampaign, zones: Array<{ id; name }>, coefs): CampaignStats`. `StatsRow` reprend les colonnes de `Response` utilisées ; `StatsCampaign` = `plannedQuantity`, `stockQuantity`, `product { costPrice, unitPrice, wholesalePrice }`, `links { id, label, openCount, isDefault }`.

- [ ] Tests d'abord :
  - comptes (complètes, incomplètes, verrouillées, suspectes) ;
  - le taux d'intérêt ;
  - les répartitions (zone inconnue ignorée, retrait à part) ;
  - `stockStatus` ;
  - et les deux points du Review Focus : `leaves money null while waiting` et `skips yes rows without buyer type or quantity`.
- [ ] Rouge, implémentation, vert, barrière, commit `feat(dashboard): campaign statistics`.

### Task 3 : Le verdict offert

**Files:**
- Migration `frontend/prisma/migrations/8b_free_verdict/migration.sql` : `ALTER TABLE "Organization" ADD COLUMN "freeVerdictCampaignId" TEXT;`
- `schema.prisma` : `freeVerdictCampaignId String?`, avec un commentaire.
- Create `lib/server/tamani/free-verdict.ts` et son test.
- Appliquer la migration à la base de dev (`migrate deploy`), puis `generate`.

**Interfaces (Produces):**
- `claimFreeVerdict(db, organizationId, current: string | null, eligible: ReadonlyArray<{ id: string; createdAt: Date }>): Promise<string | null>` :
  - `current` est renvoyé tel quel ;
  - sinon, la plus ancienne campagne éligible est réservée par `updateMany` (`where freeVerdictCampaignId: null`), puis la valeur est relue.
- `verdictAccess(plan: PlanDefinition, freeVerdictCampaignId: string | null, campaignId: string): 'PLAN' | 'OFFERED' | 'LOCKED'`.
- Une campagne est éligible quand elle a au moins `MIN_RESPONSES_FOR_VERDICT` réponses comptées.

- [ ] Tests :
  - `keeps the first claim` (une `updateMany` à 0 ligne relit la valeur gagnante) ;
  - aucune écriture quand `current` est déjà pris ou quand rien n'est éligible ;
  - `verdictAccess` pour les trois cas.
- [ ] Rouge, vert, barrière, commit `feat(dashboard): the free plan's offered verdict`.

### Task 4 : La route des statistiques

**Files:** Create `app/api/shops/[orgId]/campaigns/[campaignId]/stats/route.ts` et son test.

**Interfaces:** `GET` (`MEMBER`) → `{ stats: CampaignStats & { result: CampaignResult | null }, access: 'PLAN' | 'OFFERED' | 'LOCKED' }`. Le corps de la route :
- lit la campagne (product, links), les zones, les réponses (`select` des colonnes de `StatsRow`), l'organisation (coefficients, `freeVerdictCampaignId`) et l'abonnement ;
- calcule `computeCampaignStats` ;
- applique le verdict offert, puis passe `result` à `null` si l'accès vaut `LOCKED`.

- [ ] Tests :
  - un membre lit ses chiffres ;
  - un non-membre reçoit 404 ;
  - une campagne d'une autre boutique donne 404 `CAMPAIGN_NOT_FOUND` ;
  - Gratuit sans verdict offert : `result: null`, `access: 'LOCKED'` ;
  - Gratuit avec 20 réponses et rien de réservé : `OFFERED`, et `updateMany` appelée ;
  - Pro : `PLAN`.
- [ ] Rouge, vert, barrière, commit `feat(dashboard): campaign stats route`.

### Task 5 : Les intéressés et leurs numéros

**Files:**
- Create `…/campaigns/[campaignId]/responses/route.ts` et `…/responses/numbers/route.ts`, avec leurs tests.
- Create `lib/server/tamani/campaign-responses.ts` et son test.
- Add `InterestedRow` dans `results-view.ts`.

**Interfaces:**
- `GET …/responses?filtre=oui|non&cursor&limit` (`MEMBER`, `oui` par défaut) → `{ items: InterestedRow[]; nextCursor; counts: { yes; no } | null }`.
  - `counts` n'est envoyé qu'en première page.
  - Les réponses comptées sont triées par `completedAt` décroissant, puis `id`.
- `InterestedRow` = `{ id; respondentId; firstName; phone; phoneE164; interested; reason; buyerType; quantity; option; timing; wantsDelivery; zoneName; sourceLabel; completedAt }`.
  - `phone` est masqué sans `respondentContacts`, au format international sinon.
  - Un client anonymisé donne `firstName` et `phone` à `null`.
- `GET …/responses/numbers` (`MEMBER`) → `{ numbers: string[] }` : les intéressés comptés, au format international, sans doublon, 5 000 au plus. Sans `csvExport`, la route renvoie `403 PLAN_FEATURE_LOCKED`.

- [ ] Tests :
  - pagination et curseur ;
  - filtre ;
  - numéros masqués et `phoneE164: null` en Gratuit ;
  - client anonymisé ;
  - isolation ;
  - 403 sur `numbers` en Gratuit.
- [ ] Rouge, vert, barrière, commit `feat(dashboard): interested people and their numbers`.

### Task 6 : L'export pour Excel

**Files:**
- Create `lib/server/tamani/csv.ts` (+ test).
- Create `…/campaigns/[campaignId]/export/route.ts` (+ test).
- Create `lib/tamani/download.ts` (+ test, jsdom).

**Interfaces:**
- `toExcelCsv(columns: ReadonlyArray<{ key: string; header: string }>, rows: ReadonlyArray<Record<string, string | number | null>>): string`.
  - Le texte commence par un BOM UTF-8, utilise le séparateur `;` et des fins de ligne CRLF.
  - Guillemets RFC 4180 quand la cellule contient `;`, `"`, CR ou LF.
  - Une apostrophe préfixe toute cellule qui commence par `=`, `+`, `-` ou `@`.
- `GET …/export` (`MEMBER`) répond `403 PLAN_FEATURE_LOCKED` sans `csvExport`. Sinon :
  - `200 text/csv; charset=utf-8` avec `Content-Disposition: attachment; filename="tamani-<titre-en-slug>-AAAA-MM-JJ.csv"` ;
  - colonnes Date (`JJ/MM/AAAA HH:MM`, UTC), Prénom, Numéro WhatsApp, Intéressé (Oui/Non), Achète pour, Quantité, Option, Quand, Livraison, Quartier, Raison du non, Source ;
  - les réponses comptées, 20 000 au plus.
- `downloadFile(path: string, filename: string): Promise<void>` télécharge avec `fetch`, réessaie une fois après un rafraîchissement de session sur 401, comme `upload.ts`, puis lance le téléchargement par un lien `blob:`. Elle lève `DownloadError(status, code)`.

- [ ] Tests :
  - BOM, `;`, CRLF, guillemets ;
  - `neutralises formula cells` ;
  - 403 en Gratuit ;
  - en-têtes de la réponse en Pro ;
  - `downloadFile` réessaie une fois sur 401.
- [ ] Rouge, vert, barrière, commit `feat(dashboard): Excel export`.

### Task 7 : Le bulletin de l'accueil (serveur)

**Files:** Modify `lib/server/tamani/summary.ts`, `summary.test.ts`, `lib/tamani/home-view.ts`, `home-view.test.ts`, la route `summary` et son test.

**Interfaces:** `ShopSummary` gagne :
- `campaigns: Array<{ id; title; unitLabel; completed; verdict: VerdictCode | null; realistic: number | null; reference: number | null; offered: boolean }>` :
  - les campagnes effectivement en cours, la plus récente d'abord, 10 au plus ;
  - `verdict: null` quand le forfait le cache.
- `moneyProtectedThisMonth: number` : la somme de `avoidedDeadStock` sur les campagnes créées dans le mois UTC dont le verdict est visible et n'est pas `WAIT`.
- `todo: Array<{ kind: 'NOTIFY_INTERESTED'; campaignId; title; interested }>` : les campagnes `ARRIVED` depuis 7 jours au plus qui ont des intéressés.

Calcul :
- deux `groupBy` sur les réponses comptées :
  - par campagne, pour le nombre ;
  - par campagne et statut pour les intéressés, avec la somme des quantités ;
- puis `estimateFromTotals` ;
- et `claimFreeVerdict` quand le forfait n'a pas `estimate`.

Côté vue, `home-view.ts` gagne `campaignVerdictLine(item)` (« Commande ~120 sacs », « On attend 12/20 », « Verdict avec Pro ») et `todoLine(item)`.

- [ ] Tests :
  - verdict par campagne ;
  - verdict caché en Gratuit, sauf la campagne offerte ;
  - argent protégé limité au mois et hors `WAIT` ;
  - `todo` à 7 jours ;
  - les phrases de vue.
- [ ] Rouge, vert, barrière, commit `feat(dashboard): home bulletin data`.

### Task 8 : La jauge dans le kit

**Files:** Create `components/ui/DemandGauge.tsx`, exporté dans `index.ts`, avec un test dans `composites.test.tsx`. Modify le styleguide, qui importe la jauge au lieu de `CasesGauge`.

`DemandGauge({ realistic, announced, reference, className })` est la `CasesGauge` du styleguide, sans changement visuel, avec la phrase cachée pour les lecteurs d'écran. Les cases s'arrêtent à la référence.

- [ ] Test (les trois chiffres, la phrase cachée, 10 cases), rouge, vert, barrière, commit `feat(ui): demand gauge`.

### Task 9 : L'onglet Résultats

**Files:**
- Create `components/app/CampaignResults.tsx`.
- Modify `app/(app)/app/campagnes/[id]/page.tsx` et `results-view.ts`.
- Test `components/app/results.test.tsx`.

**Onglets** : Résultats (par défaut), Intéressés, Partager, Modifier.
- `?onglet=interesses`, `?onglet=partager` et `?onglet=modifier` choisissent l'onglet.
- Un brouillon s'ouvre sur Partager, comme `?partager=1`.

**Écran**, dans l'ordre de `CampaignScreen` :
- Sans réponse comptée : un état vide qui envoie vers Partager.
- Accès `PLAN` ou `OFFERED` :
  - `VerdictCard` (avec la base) ;
  - si l'accès vaut `OFFERED`, la note « Verdict offert pour ta première campagne. Avec Pro, tu l'as sur toutes. » ;
  - `DemandGauge` quand il y a une référence ;
  - un `<details>` « Comment c'est calculé ? », avec `CalcTable` et la phrase du coefficient ;
  - `MoneyCard` quand `money` existe, qui renvoie vers la fiche produit.
- Accès `LOCKED` : une carte « Combien commander ? » qui donne le nombre de réponses et la demande annoncée, avec un bouton vers `/app/plus` et le badge Pro.
- Puis, dans tous les cas :
  - les chiffres de base (`DataList`) ;
  - revendeurs et usagers ;
  - l'alerte de rupture quand `stockStatus` vaut `SHORTAGE` ;
  - « Où livrer », « Quand », les options, les sources s'il y en a plus d'une ;
  - le signal prix (le « non » le plus fréquent entouré) ;
  - « Voir les N intéressés ».
- Les réponses en attente (`lockedCount`) ont leur Notice.

Phrases pures, dans `results-view.ts` : `percentRows`, `priceSignal`, `stockLine`, `coefNote`.

- [ ] Tests :
  - verdict visible, offert, verrouillé ;
  - état vide ;
  - rupture ;
  - les phrases pures ;
  - les onglets (adapter `campaign.test.tsx`).
- [ ] Rouge, vert, barrière, commit `feat(dashboard): campaign results tab`.

### Task 10 : L'onglet Intéressés

**Files:** Create `components/app/InterestedList.tsx` et son test. Modify `results-view.ts`.

**Liste** :
- des filtres Oui / Non avec leurs comptes, et « Voir plus » (curseur) ;
- une ligne par personne : prénom, numéro, quantité et unité, statut, quartier, quand, date.

**Avec `respondentContacts`** :
- un bouton WhatsApp par personne, `waChatLink(phoneE164, message)` ;
- « Copier les numéros », qui passe par la route `numbers` et `navigator.clipboard`, avec repli sur la sélection du texte ;
- « Télécharger pour Excel », par `downloadFile` sur la route `export`.

**En Gratuit** : le numéro reste masqué, avec « Passe au Pro pour contacter Awa », et ces deux actions portent le badge Pro et mènent à `/app/plus`.

**Produit arrivé** : si la campagne n'est pas `ARRIVED`, une Notice propose « Le produit est arrivé ? », qui appelle le même changement de statut que `CampaignActions`.

**Message WhatsApp** : `interestedMessage({ firstName, productName, quantity, unitLabel, shopName, moment })`, où `moment` vaut `'ARRIVED' | 'IN_STOCK' | 'INCOMING'` :
- `ARRIVED` : « Bonjour Awa, c'est {boutique}. *{produit}* : c'est arrivé ! Tu voulais 3 pièces, je te les garde ? »
- `IN_STOCK` : « Bonjour Awa, c'est {boutique}. Merci pour ta réponse sur *{produit}* (3 pièces). C'est disponible : tu passes quand ? »
- `INCOMING` : « Bonjour Awa, c'est {boutique}. Merci pour ta réponse sur *{produit}* (3 pièces). Je te préviens dès que c'est là. »
- Sans prénom, « Bonjour, ».

- [ ] Tests :
  - les trois messages ;
  - Pro face à Gratuit ;
  - « Voir plus » ;
  - copie des numéros ;
  - la Notice d'arrivée.
- [ ] Rouge, vert, barrière, commit `feat(dashboard): interested people tab`.

### Task 11 : L'accueil

**Files:** Modify `components/app/HomeView.tsx` et `home.test.tsx`.

Juste après « Cette semaine » et les raccourcis :
- **« À faire maintenant »** (`todo`) : des lignes vers `?onglet=interesses`.
- **« Tes campagnes »** : une ligne-verdict par campagne, avec le mot coloré par le ton du verdict.
- **« Argent protégé ce mois-ci »** : la ligne en surligneur, seulement si le montant dépasse 0.

- [ ] Tests (chaque section présente et absente, lien `?onglet=interesses`), rouge, vert, barrière, commit `feat(dashboard): home bulletin`.

### Task 12 : Documentation, vérification, PR

- `CLAUDE.md` gagne une section « Tamani dashboard (lot 6) » :
  - les règles, les routes, le verdict offert ;
  - la règle de nommage des migrations.
- Feuille de route :
  - contrats du lot 6 précisés (forme de `stats`, route `numbers`, forme de `campaigns[]`) ;
  - décisions du 2026-10-27 :
    - marché : toute l'Afrique francophone, avec un lot « Pays et monnaies » placé avant le lot 8 ;
    - paiement à la consommation : crédits au lot 8 ;
    - verdict offert.
- Spec : §2, marché de départ [décidé] ; §5.6, verdict offert et principe des crédits.
- `pnpm build` ; vérification à l'écran sur `next start`, à 390 et 1280 px :
  - les deux onglets ;
  - l'accueil ;
  - le Gratuit verrouillé et le Pro.
- Push, PR vers `main`. Fusion seulement avec l'accord du porteur.

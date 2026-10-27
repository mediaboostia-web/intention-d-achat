# Tamani — Plan d'implémentation (feuille de route)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** construire Tamani, le SaaS qui permet aux grossistes de mesurer l'intention d'achat de leur communauté WhatsApp, de transformer ces intentions en commandes et de connaître leurs clients.
- Côté communauté : un pop-up auquel on répond en ~10 s.
- Côté grossiste : un tableau de bord avec un verdict et une quantité à commander, un module de commandes sans paiement en ligne, et un carnet de clients dynamique.
- Modèle économique : freemium encaissé par SasPay.

**Architecture :** monolithe Next.js 16 issu du kit izikit, déjà installé et vérifié.
- Le domaine Tamani s'ajoute sous `frontend/src/lib/tamani/` (logique pure, partagée avec le navigateur) et `frontend/src/lib/server/tamani/` (logique serveur).
- Les routes vont sous `frontend/src/app/api/`.
- Les pages sont rangées dans trois groupes de routes : `(public)`, `(app)` et `(admin)`.
- Une boutique correspond à une `Organization` du kit, et chaque route de boutique est protégée par `requireOrgRole`.

**Tech Stack :** Next.js 16 (App Router, Turbopack), React 19, TypeScript strict, Prisma 5 avec Neon Postgres, Upstash Redis, Cloudinary, Resend, Sentry, Tailwind v4, Vitest 3, SasPay (REST), `libphonenumber-js`, `jose`.

**Spec :** [docs/superpowers/specs/2026-10-24-tamani-design.md](../specs/2026-10-24-tamani-design.md). Les exécutants lisent la spec **et** ce plan.

**Mode de découpage :** la spec couvre 9 sous-systèmes. On fait donc **9 plans successifs**, et chacun livre un logiciel qui marche et qui est testé.
- Ce document est le plan complet au niveau des lots. Il fige les **contrats entre lots** : noms, signatures, modèles, routes, codes d'erreur.
- Le plan détaillé, tâche par tâche, de chaque lot s'écrit au début du lot, à partir de ce document et du code alors en place.
- Le lot 1 est déjà détaillé : [2026-10-24-tamani-01-fondations.md](2026-10-24-tamani-01-fondations.md).

## Global Constraints

- **Toutes les routes** :
  - chaque route handler exporte `export const runtime = 'nodejs'` et enveloppe son corps dans `withRequestContext(makeRequestContext(req.headers), …)` ;
  - les routes de boutique appellent `requireOrgRole(organizationId, 'MEMBER' | 'ADMIN' | 'OWNER')`, et en premier `verifyCsrf(req)` pour une mutation. Un non-membre reçoit **404**.
- **Routes publiques `/api/public/*`** : **pas** de `verifyCsrf`, car il n'y a aucun cookie d'authentification. À la place : un jeton signé dans l'en-tête `x-response-token`, plus une limitation de débit par IP et par campagne.
- **Montants** : **entiers en FCFA (XOF)**. On ne les convertit en chaîne décimale (`"9900.00"`) qu'à la frontière SasPay.
- **Langue et erreurs** : interface en **français**. Codes d'erreur API stables en `SCREAMING_SNAKE_CASE` (voir §Contrats). Le front teste `ApiError.code`.
- **Fichiers protégés** (liste dans `CLAUDE.md`) : **jamais modifiés**. Aucun lot n'en a besoin. Si cela arrivait, s'arrêter et demander une confirmation.
- **Effets de bord des webhooks** : ils passent par `enqueueOutbox(tx, …)` avec les types d'événement **existants** (`notification.payment_received`, `email.payment_confirmation`), car `outbox/dispatcher.ts` est protégé.
- **Admin** : toute mutation d'admin passe par `logAdminAction(prisma, {...})`.
- **Données personnelles** : on ne passe **jamais** un numéro ni un prénom de répondant à `log.*` ou à Sentry. On journalise `respondentId` et `responseId`.
- **Pop-up `/c/[code]`** : JavaScript client de la route ≤ **60 Ko compressés**, aucune librairie d'animation, images en `f_auto,q_auto,w_600`.
- **Règles produit** : une boutique par compte (v1). Le numéro WhatsApp du répondant est **obligatoire** pour qu'une réponse soit complète. Dès qu'une réponse est complète, le répondant **apparaît dans le carnet de clients**.
- **Forfaits** (valeurs exactes) :
  - FREE : 0 FCFA, 3 campagnes actives, 150 réponses par mois ;
  - PRO : 9 900 FCFA par mois, campagnes illimitées, 3 000 réponses par mois ;
  - BUSINESS : 24 900 FCFA par mois, campagnes illimitées, 15 000 réponses par mois ;
  - annuel = mensuel × 10, période de grâce de 5 jours ;
  - commandes et carnet de clients ouverts à tous les forfaits. En FREE, les numéros sont masqués et le WhatsApp est verrouillé. La fiabilité et les coefficients appris commencent au PRO.
- **Marge** (règle du porteur, 2026-10-25) : chaque abonnement garde **au moins 70 %** de marge une fois payés les forfaits et l'usage de chaque fournisseur (Vercel, Neon, Upstash, Cloudinary, Resend, Sentry) et les frais SasPay (pire cas : carte, 5 %). Une communauté de plus de 100 000 personnes ne doit jamais rendre une boutique déficitaire. Tamani n'envoie jamais d'email, de SMS ou de message WhatsApp par réponse sans que son coût soit compté dans le prix.
- **Estimation** :
  - coefficients par défaut : usagers `0.5`, revendeurs `0.7` ;
  - fourchette : coefficient ± `0.1`, bornée à [0, 1] ;
  - coefficient appris dès 20 réponses « Oui » réparties sur au moins 2 campagnes terminées, borné à [0.1, 1] ;
  - fiabilité d'un client affichée dès 2 réponses « Oui » sur des campagnes terminées.
- **Verdict** :
  - moins de 20 réponses complètes → `WAIT` ;
  - ratio réaliste / référence ≥ 0.9 → `GO` ;
  - ratio ≥ 0.4 → `CAUTION` ;
  - sinon → `STOP` ;
  - sans référence → `NEUTRAL`.
- **Design** : niveau de qualité exceptionnel, sans rien de générique. La structure validée sur maquette se trouve dans la spec §5.4.0. Le style est défini au lot 2.
- **Barrière** avant chaque commit : `pnpm format && pnpm lint && pnpm typecheck && pnpm test`, plus `pnpm build` en fin de lot.
- **Windows** :
  - lancer la CLI Prisma avec `node --env-file=.env.local node_modules/prisma/build/index.js <cmd>` depuis `frontend/` ;
  - après un `pnpm install` complet, lancer `node node_modules/prisma/build/index.js generate` depuis `frontend/`.
- **Git** : un lot = une branche `plan/NN-<nom>` = une PR vers `main`. Les commits se terminent par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

Les cinq situations, implicites dans la spec, qui toucheraient le plus un vrai utilisateur. Chacune est épinglée par un test dans le lot qui possède le code.
1. **Le même numéro répond depuis deux téléphones.** La réponse existante est mise à jour (unicité `campaignId + respondentId`) et comptée une seule fois. → Lot 5, `upsertResponse merges a second device into the existing respondent response`.
2. **Le lien circule après la fin de la campagne** (`endsAt` dépassé, `CLOSED`, produit archivé). Le pop-up affiche « Cette campagne est terminée », rien n'est écrit, et l'API renvoie `409 CAMPAIGN_CLOSED`. → Lot 5, `rejects writes when campaign effective status is CLOSED`.
3. **Le quota est dépassé en cours de mois.** Le répondant voit un succès normal. La réponse est enregistrée `locked: true`. Le passage au forfait supérieur déverrouille les plus anciennes jusqu'à la nouvelle limite. → Lot 5, `locks completion when monthly quota reached` ; lot 8, `unlockCurrentMonth unlocks oldest first up to new limit`.
4. **Le même numéro saisi de trois façons** (`77 123 45 67`, `+221771234567`, `00221771234567`) donne **un seul** client. → Lot 3, `normalizePhone returns the same E.164 for local, +, and 00 forms`.
5. **Un webhook SasPay rejoué ou reçu dans le désordre** (succès en double, échec après un succès). L'abonnement est prolongé une seule fois et n'est jamais rétrogradé par un échec tardif. → Lot 8, `activation is idempotent per order` et `late failed event does not downgrade a PAID order`.

À couvrir en plus :
- **`localStorage` indisponible** (navigation privée, WebView) : le pop-up reste utilisable. → Lot 5, réducteur `popupReducer` en mode « sans mémoire ».
- **Une réponse convertie deux fois en commande** : une seule commande est créée, et la seconde tentative renvoie `409 ORDER_ALREADY_EXISTS`. → Lot 7, `convertResponseToOrder is single-shot per response`.

---

## Contrats entre lots

Les lots suivants **doivent** utiliser exactement ces noms. Toute divergence est un bug.

### Modèles Prisma
Convention du kit : `id String @id @default(cuid())`, statuts en `String` (pas d'`enum` Prisma), `createdAt` et `updatedAt`.

**Lot 3, migration `6_tamani_core`**
- `Organization`, ajouts : `whatsappPhone String?`, `country String @default("SN")`, `currency String @default("XOF")`, `logoUrl String?`, `coefConsumer Float @default(0.5)`, `coefReseller Float @default(0.7)`, et les relations ci-dessous.
- `DeliveryZone { organizationId, name, sortOrder Int @default(0) }`, avec `@@unique([organizationId, name])`.
- `Product { organizationId, name, description String?, unitLabel String @default("pièce"), unitPrice Int, wholesalePrice Int?, wholesaleMinQty Int?, costPrice Int?, photos Json @default("[]"), optionLabel String?, options String[], archivedAt DateTime? }`. `costPrice` n'est **jamais** exposé au public.
- `Campaign { organizationId, productId, title, availability String /* IN_STOCK|INCOMING */, availableAt DateTime?, stockQuantity Int?, plannedQuantity Int?, showStock Boolean @default(false), endsAt DateTime?, deliveryEnabled Boolean @default(false), showLiveCounter Boolean @default(true), shareTemplate String, status String @default("DRAFT") /* DRAFT|ACTIVE|CLOSED|ARRIVED */, closedAt DateTime?, arrivedAt DateTime? }`.
- `CampaignLink { campaignId, code String @unique, label String, isDefault Boolean @default(false), openCount Int @default(0) }`.
- `Respondent` (« client » dans l'interface) : `{ organizationId, phoneE164 String?, firstName String?, notes String?, firstSeenAt, lastSeenAt, anonymizedAt DateTime? }`, avec `@@unique([organizationId, phoneE164])`. Les champs ne passent à `null` qu'après une anonymisation. Postgres accepte plusieurs `NULL` dans une contrainte d'unicité.
- `Response { campaignId, organizationId /* dénormalisé : quota et filtres */, linkId String?, respondentId String?, deviceId, interested Boolean?, notInterestedReason String?, buyerType String?, quantity Int?, option String?, timing String?, wantsDelivery Boolean?, zoneId String?, completedAt DateTime?, locked Boolean @default(false), suspicious Boolean @default(false) }`, avec :
  - `@@unique([campaignId, deviceId])`
  - `@@unique([campaignId, respondentId])`
  - `@@index([organizationId, completedAt])`
  - `@@index([campaignId, completedAt])`
  - `@@index([respondentId])`
- `Subscription { organizationId @unique, plan String @default("FREE"), currentPeriodEnd DateTime?, graceUntil DateTime? }`.

**Lot 5, migration `7_push_subscriptions`**
- `PushSubscription { userId, endpoint String @unique, p256dh, auth }`, avec `@@index([userId])` et la relation `User.pushSubscriptions` (`onDelete: Cascade`).

**Lot 5b, migration `8_shop_description`**
- `Organization.description String?` : 300 caractères au plus (validé par `inputs.ts`), vide → `null`. Le pop-up la montre sous « Oui / Non ».

**Lot 7, migration `9_sale_orders`** (renumérotée deux fois le 2026-10-25 : le lot 5 a pris le n° 7, le lot 5b le n° 8)
- `SaleOrder { organizationId, respondentId, productId, campaignId String?, responseId String? @unique, buyerType, quantity Int, unitPrice Int, totalAmount Int, fulfillment String /* DELIVERY|PICKUP */, zoneId String?, status String @default("TO_CONFIRM") /* TO_CONFIRM|CONFIRMED|FULFILLED|CANCELLED */, paid Boolean @default(false), paidAt DateTime?, notes String?, confirmedAt DateTime?, fulfilledAt DateTime?, cancelledAt DateTime? }`, avec `@@index([organizationId, status])` et `@@index([respondentId])`.
- **Lot 8** : on réutilise `Order` (existant) pour les paiements d'abonnement : `provider = 'saspay'`, `metadata = { organizationId, plan, months }`, statuts `PENDING | AWAITING_VERIFICATION | PAID | FAILED | EXPIRED`.

### Identité et composants (lot 2)
Charte : [docs/brand/tamani-brand.md](../../brand/tamani-brand.md), direction « Cahier du marché ».
- `frontend/src/lib/design/tokens.ts` :
  - `colors` (19 tokens) et `type ColorToken` ;
  - `type VerdictTone = 'success' | 'warning' | 'danger' | 'neutral' | 'primary'` et `verdictToneColor` ;
  - `contrastPairs`, `relativeLuminance(hex)` et `contrastRatio(hexA, hexB)`.
  - `globals.css` en est le miroir (`@theme`), et `tokens-sync.test.ts` vérifie l'égalité.
- `frontend/src/lib/design/logo-paths.ts` : `MARK_PATH`, `CORDS_PATH`, `WORDMARK_PATH`, `WORDMARK_VIEWBOX` et `WORDMARK_ASPECT`.
- `frontend/src/lib/tamani/verdict-display.ts` :
  - `type VerdictCode = 'WAIT' | 'GO' | 'CAUTION' | 'STOP' | 'NEUTRAL'` et `VERDICT_TONE` ;
  - `approxQuantity(n)`, `pluralizeUnit(unitLabel, n)`, `verdictDisplay({ code, realistic, completedResponses, reference, unitLabel?, minResponses? })` et `verdictBasis({ low, high, completedResponses, interestedCount, unitLabel? })`.
- Composants (`frontend/src/components/ui/`, exportés par `index.ts`, composants serveur sans état) :
  - `Button`, `ChoiceButton`, `Input`, `PhoneInput`, `Card`, `Badge` ;
  - `BottomSheet` (avec l'auvent), `StatTile`, `VerdictCard`, `MoneyCard`, `FilterBar`, `DataList`, `EmptyState` ;
  - `Logo`, `InkFilters` (dans le layout racine) et `CalcTable`.
- Utilitaires CSS : `bg-paper`, `frame` (contour encre de 2,5 px), `highlight`, `stamp`, `pen`, `shadow-press`, `shadow-sheet`, `animate-sheet-up` et `rounded-case|control|card|sheet`. Polices : `font-sans` (Andika), `font-hand` (Kalam) et `font-sign` (Bowlby One).

### Modules partagés et purs : `frontend/src/lib/tamani/` (lot 3, sauf mention contraire)

**`plans.ts`**
- `type PlanId = 'FREE' | 'PRO' | 'BUSINESS'`
- `interface PlanDefinition { id; label; monthlyPriceXof: number; maxActiveCampaigns: number | null; monthlyResponses: number; seats: number; features: { estimate: boolean; sourceLinks: boolean; respondentContacts: boolean; csvExport: boolean; reliability: boolean; poweredByBadge: boolean } }`
- `PLANS: Readonly<Record<PlanId, PlanDefinition>>`. En FREE, toutes les fonctionnalités valent `false`, sauf `poweredByBadge: true`.
- `priceFor(plan: 'PRO' | 'BUSINESS', months: 1 | 12): number`
- `isPlanId(value: string): value is PlanId`

**`timing.ts`**
- `type Availability = 'IN_STOCK' | 'INCOMING'`
- `type Timing = 'TODAY_TOMORROW' | 'THIS_WEEK' | 'THIS_MONTH' | 'ON_ARRIVAL' | 'WEEK_AFTER' | 'LATER'`
- `TIMING_OPTIONS: Record<Availability, readonly Timing[]>` : `IN_STOCK` prend les trois premiers, `INCOMING` les trois derniers.
- `TIMING_LABELS` : « Aujourd'hui / demain », « Cette semaine », « Ce mois-ci », « Dès l'arrivée », « La semaine suivante », « Plus tard ».

**`labels.ts`**
- `type BuyerType = 'CONSUMER' | 'RESELLER'`, avec `BUYER_TYPE_POPUP_LABELS` (« Moi », « Revendre ») et `BUYER_TYPE_LABELS` (« Usager », « Revendeur »).
- `type NotInterestedReason = 'TOO_EXPENSIVE' | 'NO_NEED' | 'ALREADY_BOUGHT' | 'OTHER'` : « Trop cher », « Pas besoin », « Déjà acheté », « Autre ».
- `QUANTITY_PRESETS = { CONSUMER: [1, 2, 3, 5], RESELLER: [6, 12, 24, 50] }`.
- `ORDER_STATUS_LABELS` (lot 7) : « À confirmer », « Confirmée », « Livrée » ou « Récupérée » selon `fulfillment`, « Annulée ».

**`share-message.ts`**
- `DEFAULT_SHARE_TEMPLATE = '🔔 Nouveau : *{produit}* à {prix}. {disponibilite}. Tu en veux ? Réponds en moins de 30 secondes 👉 {lien}'`
- `renderShareMessage(template, vars: { produit; prix; disponibilite; lien }): string`. Une variable inconnue reste telle quelle. `{disponibilité}`, avec l'accent, est remplacée comme `{disponibilite}`.
- `formatXof(amount: number): string` → `'7 500 FCFA'`
- `formatPriceLine(p: { unitPrice; wholesalePrice: number | null; wholesaleMinQty: number | null }): string` → `'7 500 FCFA (gros : 6 000 FCFA dès 12)'`
- `formatAvailability(c: { availability; availableAt: Date | null }, now: Date): string` → `'Disponible maintenant'` ou `'Arrivage dans 10 jours'`

**`wa.ts`**
- `waChatLink(phoneE164: string, text?: string): string` → `https://wa.me/221771234567?text=…`
- `waShareLink(text: string): string` → `https://wa.me/?text=…`

**`client-filters.ts`** (lot 7)
- `ClientFilters = { q?: string; productId?: string; campaignId?: string; from?: string /* ISO date */; to?: string; buyerType?: BuyerType; zoneId?: string; interested?: boolean; hasOrdered?: boolean; reliabilityMin?: number }`
- `parseClientFilters(searchParams: URLSearchParams): ClientFilters`. Elle est partagée entre l'interface (URL) et l'API.

### Modules serveur : `frontend/src/lib/server/tamani/`

**Lot 3**
- `errors.ts` : liste figée `TAMANI_ERRORS`, avec `SHOP_ALREADY_EXISTS`, `SHOP_NOT_FOUND`, `ZONE_NOT_FOUND`, `ZONE_ALREADY_EXISTS`, `PRODUCT_NOT_FOUND`, `PRODUCT_IN_USE`, `CAMPAIGN_NOT_FOUND`, `CAMPAIGN_CLOSED`, `CAMPAIGN_LIMIT_REACHED`, `INVALID_CAMPAIGN_TRANSITION`, `PLAN_FEATURE_LOCKED`, `INVALID_PHONE`, `INVALID_RESPONSE_TOKEN`, `RATE_LIMITED`, `ORDER_NOT_FOUND`, `ORDER_ALREADY_EXISTS`, `INVALID_ORDER_TRANSITION`, `CLIENT_NOT_FOUND`, `BILLING_NOT_CONFIGURED`, `PAYMENT_VERIFY_FAILED`, `PUSH_NOT_CONFIGURED` (lot 5). Plus `tamaniError(code, status, message?) => NextResponse`, qui renvoie `{ error: code, message }`, et `isUniqueViolation(err, field?)` (P2002 sur ce champ).
- `http.ts` : `readJson(req)`, `jsonOk(data, status = 200)` (en-tête `x-request-id`) et `validationFailed(message?)` (400 `VALIDATION_FAILED`, code du kit).
- `locks.ts` : `type Db = Prisma.TransactionClient` et `advisoryXactLock(tx, key)` (`pg_advisory_xact_lock(hashtext(key))`). Clés : `shop-create:<userId>`, `campaign-activate:<organizationId>`.
- `inputs.ts` : schémas zod des corps (boutique, zone, produit, campagne, lien) et `checkProductRules`.
- `serializers.ts` : seule sortie des données. `toShop`, `toZone`, `toShopProduct`, `toPublicProduct` (liste blanche, sans `costPrice`, réutilisée par le lot 5), `toCampaign` (statut effectif et `shareMessage` rendu), `toLink` et `shareUrl(code)` (`${APP_URL}/c/${code}`).
- `phone.ts` :
  - `normalizePhone(raw: string, defaultCountry: CountryCode): string | null`, au format E.164, avec `libphonenumber-js/min` ;
  - `maskPhone(e164: string): string` → `'77 •• •• 12'` ;
  - `shopCountry(country: string): CountryCode` (repli `'SN'`).
- `short-code.ts` : `generateShortCode(length = 7): string` (base62, `crypto.randomInt`), `SHORT_CODE_REGEX = /^[0-9A-Za-z]{7}$/` et `withUniqueCode(create, attempts = 5)` (nouvel essai sur une P2002 du champ `code` ; il enveloppe toute la transaction).
- `campaign-status.ts` :
  - `type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARRIVED'` ;
  - `effectiveStatus(c: { status; endsAt: Date | null }, now): CampaignStatus` : une campagne `ACTIVE` dont `endsAt ≤ now` devient `CLOSED` ; un statut inconnu vaut `DRAFT` ;
  - `isAcceptingResponses(c, now)` : vrai pour `ACTIVE` et `ARRIVED` ;
  - `isFinished(c, now)` : vrai pour `CLOSED` et `ARRIVED` ;
  - `CAMPAIGN_TRANSITIONS` et `canTransitionCampaign(from, to)` : `DRAFT → ACTIVE`, `ACTIVE → CLOSED | ARRIVED`, `CLOSED → ACTIVE | ARRIVED`, `ARRIVED → CLOSED`, à partir du statut effectif ;
  - `activeCampaignWhere(now)` et `effectiveStatusWhere(status, now)` : fragments `where` Prisma du statut effectif. La limite FREE compte les campagnes au statut effectif `ACTIVE` (pas `ARRIVED`).
- `estimate.ts` :
  - `estimateDemand(rows: ReadonlyArray<{ buyerType: BuyerType; quantity: number }>, coefs: { consumer: number; reseller: number }): DemandEstimate` ;
  - `DemandEstimate = { announced; realistic; low; high; byBuyerType: Record<BuyerType, { respondents; announced; realistic }> }`, avec un `Math.round` sur chaque total.
- `subscription.ts` :
  - `effectivePlan(sub: { plan; currentPeriodEnd: Date | null; graceUntil: Date | null } | null, now): { plan: PlanId; inGrace: boolean }` ;
  - `extendSubscription(current, plan: 'PRO' | 'BUSINESS', months: 1 | 12, now): { plan; currentPeriodEnd; graceUntil }` : si le même forfait est encore actif, la période s'ajoute après `currentPeriodEnd`, sinon elle part de `now` ; `graceUntil = currentPeriodEnd + 5 jours` ;
  - `GRACE_DAYS = 5`.
- `quota.ts` :
  - `monthWindowUtc(now): { start; end }` ;
  - `shouldLockNewCompletion(db, organizationId, now): Promise<boolean>` ;
  - `unlockCurrentMonth(tx, organizationId, now): Promise<number>`, utilisée au lot 8, qui déverrouille les plus anciennes d'abord.
- `shop.ts` : `getShopForUser(db, userId): Promise<{ organizationId; role: OrgRole } | null>`.

**Lot 5**
- `response-token.ts` :
  - `signResponseToken({ responseId, deviceId }): Promise<string>` : HS256 avec une clé **dérivée** de `JWT_SECRET_BYTES` (HMAC-SHA256, étiquette `tamani:response-token`), `aud: 'tamani:response'`, valable 90 jours. La clé brute ne sert pas : `verifyToken` d'`auth.ts` ne vérifie pas l'audience, un jeton de réponse passerait pour un jeton d'accès ;
  - `verifyResponseToken(token): Promise<{ responseId; deviceId } | null>`.
- `public-campaign.ts` : `getPublicCampaign(db, code, now): Promise<PublicCampaign | null>`. **Aucune** donnée de répondant, ni `whatsappPhone`, ni `costPrice`, ni `plannedQuantity`.
- `responses.ts` : `upsertResponse(db, input: ResponseStepInput & { token: string | null }, now): Promise<UpsertResult>`, avec `UpsertResult = { responseId; token; completed; firstCompletion; respondent: { firstName; phoneE164; phoneMasked } | null; interestedCount: number | null }`. À la complétion, le `Respondent` est créé ou mis à jour : c'est ce qui l'ajoute au carnet de clients. `firstCompletion` déclenche la notification ; la route ne le renvoie pas.
- `public-limits.ts` : `enforcePublicRateLimit(req, campaignId, deviceId)`, `isFirstViewToday(linkId, deviceId, now)` et `recordDeviceNumber(campaignId, deviceId, phoneE164)` (numéro haché), sur Upstash, avec un repli en mémoire sans Redis.
- `notify-response.ts` : `responseNotificationText(...)` et `notifyShopOfResponse(db, responseId)`, lancée par `after()` ; `push/web-push.ts` : `pushConfigured()`, `vapidPublicKey()` et `sendPush(sub, payload) → 'SENT' | 'GONE' | 'FAILED'`.

**Lot 6**
- `coefficients.ts` : `coefficientsFor(org: { coefConsumer; coefReseller }, learned?: LearnedCoefficients | null): { consumer; reseller; source: { consumer: 'DEFAULT' | 'SHOP' | 'LEARNED'; reseller: … } }`. Au lot 6, `learned` est toujours absent ; il est fourni à partir du lot 7.
- `verdict.ts` :
  - `computeVerdict({ realistic, completedResponses, reference: number | null }): { code: VerdictCode; ratio: number | null; missingResponses: number }`, avec `VerdictCode` importé de `@/lib/tamani/verdict-display` (lot 2) ;
  - `MIN_RESPONSES_FOR_VERDICT = 20` ;
  - la référence est `plannedQuantity`, sinon `stockQuantity`.
- `money.ts` : `computeMoney({ reference, estimate: DemandEstimate, costPrice: number | null, unitPrice, wholesalePrice: number | null }): { avoidedDeadStock: number | null; expectedProfit: number | null }`. Tout vaut `null` si `costPrice` est absent. Les revendeurs sont valorisés au prix de gros quand il existe.
- `stats.ts` : `computeCampaignStats(rows, campaign, zones, coefs): CampaignStats` (types dans `lib/tamani/results-view.ts`).
  - Chiffres visibles par tous : `opens`, `completed`, `incomplete`, `lockedCount`, `suspiciousCount`, `interested`, `notInterested`, `interestRate`, `announced`, `reference`, `stock`, et les répartitions `byBuyerType`, `byZone`, `pickup`, `byTiming`, `byOption`, `bySource`, `noReasons`.
  - `result { estimate; coefs; verdict; money; stockStatus }` : ce que seul `estimate` montre. `money` vaut `null` tant que le verdict attend (`WAIT`).
- `estimate.ts` gagne `estimateFromTotals(sums, coefs)` : la même estimation à partir de totaux par statut, sommés en base (accueil).
- `free-verdict.ts` : `claimFreeVerdict(db, organizationId, current, eligible): Promise<string | null>` (réserve `Organization.freeVerdictCampaignId` une seule fois) et `verdictAccess(plan, freeVerdictCampaignId, campaignId): 'PLAN' | 'OFFERED' | 'LOCKED'`.
- `campaign-responses.ts` : `parseResponseFilter`, `listCampaignResponses(db, organizationId, campaignId, filter, cursor, { canSeeContacts; limit }): Promise<InterestedPage>`, `interestedNumbers(...)` (dédupliqués, 5 000 au plus) et `campaignExportRows(...)` (20 000 au plus).
- `csv.ts` : `toExcelCsv(columns, rows)` ; `campaign-export.ts` : `responsesCsv(rows)` et `exportFilename(title, now)`.
- `home-bulletin.ts` : `buildHomeBulletin(db, organizationId, now)`, appelé par `buildShopSummary`.
- `summary.ts` (lot 5b, étendu au lot 6) : `buildShopSummary(db, organizationId, now): Promise<ShopSummary>`, type partagé dans `lib/tamani/home-view.ts`.
  - **Contrat 5b** : `week { completed; sinceYesterday; interested; opensRunning; newClients }` (7 jours glissants, `sinceYesterday` sur 24 h ; `opensRunning` = ouvertures cumulées des campagnes en cours, car les ouvertures ne sont pas datées), `activity[]` (8 au plus : réponses et nouveaux clients, les plus récents d'abord), `upcoming[]` (5 au plus : fins de campagne et arrivages dans les 30 jours), `hasCampaign`, `hasProduct`, `shareCampaign { id; title; shareMessage } | null`.
  - **Le lot 6 ajoute** :
    - `campaigns[] { id; title; unitLabel; completed; verdict: VerdictCode | null; realistic: number | null; reference: number | null; offered: boolean }` : les campagnes en cours, la plus récente d'abord, 10 au plus ; `verdict` vaut `null` quand le forfait le cache, `WAIT` tant que le verdict offert reste à donner ;
    - `moneyProtectedThisMonth` : la somme de `avoidedDeadStock` des campagnes créées dans le mois UTC dont le verdict est visible et n'est pas `WAIT` ;
    - `todo[] { kind: 'NOTIFY_INTERESTED'; campaignId; title; interested }` : les campagnes arrivées depuis 7 jours au plus qui ont des intéressés. Le lot 7 ajoute les commandes à confirmer et les livraisons par quartier.
- `csv.ts` : `toExcelCsv(columns: ReadonlyArray<{ key; header }>, rows): string`, avec BOM UTF-8, séparateur `;`, fins de ligne CRLF et guillemets RFC 4180.

**Lot 7**
- `orders.ts` :
  - `orderUnitPrice(product: { unitPrice; wholesalePrice: number | null; wholesaleMinQty: number | null }, buyerType, quantity): number` : prix de gros si `RESELLER` et `quantity ≥ wholesaleMinQty`, sinon prix unitaire ;
  - `ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]>` : `TO_CONFIRM → CONFIRMED | CANCELLED` et `CONFIRMED → FULFILLED | CANCELLED` ;
  - `canTransition(from, to): boolean` ;
  - `convertResponseToOrder(tx, organizationId, responseId, now): Promise<SaleOrder>`. Elle refuse une réponse non « Oui » ou déjà convertie (`409 ORDER_ALREADY_EXISTS`).
- `reliability.ts` :
  - `clientReliability(rows: ReadonlyArray<{ interested: boolean; campaignFinished: boolean; fulfilled: boolean }>): { yesCount; fulfilledCount; rate: number | null }`. `rate` vaut `null` tant que les réponses « Oui » terminées sont moins de 2 ;
  - `learnedCoefficients(rows: ReadonlyArray<{ buyerType; campaignId; announced: number; fulfilledQty: number }>, fallback: { consumer; reseller }): LearnedCoefficients`, de la forme `{ consumer; reseller; learned: { consumer: boolean; reseller: boolean } }`. Seuil : 20 réponses « Oui » sur au moins 2 campagnes, par statut ; résultat borné à [0.1, 1].
- `clients.ts` : livré au lot 5b (voir plus bas) ; le lot 7 étend `ClientFilters` (zone, produit, mois, `hasOrdered`) et ajoute la note, l'anonymisation et la fiabilité. La vue Intérêts (`listInterests`) est abandonnée.

**Lot 5b**
- `clients.ts` :
  - `visibleClientWhere(organizationId)` : un client visible est non anonymisé, avec au moins une réponse complète, non verrouillée et non suspecte ;
  - `parseClientFilters(params): ClientFilters | null` (`type=revendeurs|usagers`, `q` de 60 caractères au plus) ;
  - `listClients(db, organizationId, filters, cursor, { canSeeContacts, limit })`, trié par dernière activité, curseur du kit, compteurs sur la première page ; en Gratuit (`respondentContacts` faux) les numéros ne sortent pas du serveur et la recherche ignore les chiffres ;
  - `getClient(db, organizationId, respondentId, { canSeeContacts })` : la fiche et toutes ses réponses.
- `quota.ts` : `responsesThisMonth(db, organizationId, now): Promise<{ used; limit }>` (barre latérale).
- `shop.ts` : `shopPlan(db, organizationId, now): Promise<PlanDefinition>`.

**Lot 8**
- `billing.ts` : `activateFromPayment(tx, orderId, now): Promise<'ACTIVATED' | 'ALREADY_DONE' | 'NOT_PAID'>`.

### Routes
- **Lot 3, boutique** :
  - `POST /api/shops` (`409 SHOP_ALREADY_EXISTS`) ;
  - `GET /api/shops/me` ;
  - `GET|PATCH /api/shops/[orgId]` ;
  - `GET|POST /api/shops/[orgId]/zones` et `PATCH|DELETE …/zones/[zoneId]`.
- **Lot 3, produits** : `GET|POST /api/shops/[orgId]/products` et `GET|PATCH|DELETE …/products/[productId]`. `DELETE` archive le produit s'il a des campagnes.
- **Lot 3, campagnes** :
  - `GET|POST /api/shops/[orgId]/campaigns` ;
  - `GET|PATCH …/campaigns/[campaignId]` (activation : `409 CAMPAIGN_LIMIT_REACHED`) ;
  - `GET|POST …/campaigns/[campaignId]/links` (liens de source : `403 PLAN_FEATURE_LOCKED` en FREE).
- **Lot 5, public** : `POST /api/public/views` et `POST /api/public/responses`.
- **Lot 5, notifications** : `GET /api/push/public-key` (`503 PUSH_NOT_CONFIGURED` sans clés VAPID), `POST|DELETE /api/push/subscriptions` (session et CSRF ; adresse https d'un service de push de navigateur seulement : FCM, Mozilla, Apple, Windows). La cloche utilise les routes `/api/notifications` du kit.
- **Lot 5b** :
  - `GET /api/shops/me` envoie en plus `usage { responsesThisMonth; monthlyLimit }` et `me { firstName; name }` ;
  - `GET /api/shops/[orgId]/summary` (`MEMBER`) ;
  - `GET /api/shops/[orgId]/clients` et `GET …/clients/[respondentId]` (`404 CLIENT_NOT_FOUND`) ;
  - `GET /api/shops/[orgId]/products/units` (les unités déjà utilisées, 50 au plus) ;
  - `GET …/campaigns` et `GET …/products` acceptent `q` et envoient `counts` sur la première page (sans tenir compte de la recherche ni du filtre) ; `GET …/products` accepte `inCampaign=1`.
- **Lot 6, tableau de bord** :
  - `GET /api/shops/[orgId]/summary` étendu (voir `summary.ts`) ;
  - `GET …/campaigns/[campaignId]/stats` → `{ stats, access: 'PLAN' | 'OFFERED' | 'LOCKED', offerOpen }`, `stats.result` à `null` quand l'accès vaut `LOCKED` ;
  - `GET …/campaigns/[campaignId]/responses?filtre=oui|non&cursor=` (`400` sur un autre filtre ; numéros masqués si `respondentContacts` est faux ; `counts { yes; no }` sur la première page) ;
  - `GET …/campaigns/[campaignId]/responses/numbers` → `{ numbers }` ;
  - `GET …/campaigns/[campaignId]/export` (CSV pour Excel).
  - `numbers` et `export` répondent `403 PLAN_FEATURE_LOCKED` sans `respondentContacts` **et** `csvExport`, et `404 CAMPAIGN_NOT_FOUND` pour une campagne d'une autre boutique.
- **Lot 7, commandes** :
  - `GET|POST /api/shops/[orgId]/orders`, avec les filtres `status`, `campaignId`, `productId` et `zoneId`, et le paramètre `view=to-deliver`, qui groupe les commandes par zone ;
  - `GET|PATCH …/orders/[orderId]` (transitions, paiement, prix avant confirmation) ;
  - `POST …/campaigns/[campaignId]/responses/[responseId]/order` (conversion).
- **Lot 7, clients** (les deux `GET` existent depuis le lot 5b ; `/interests` est abandonné) :
  - `GET /api/shops/[orgId]/clients` avec les filtres ajoutés à `ClientFilters` ;
  - `PATCH …/clients/[respondentId]` (note) ;
  - `DELETE …/clients/[respondentId]` (anonymisation, rôle `ADMIN` minimum).
- **Lot 8, facturation** : `POST /api/billing/checkout`, `GET /api/billing/return`, `GET /api/billing/subscription` et `POST /api/webhooks/saspay`.
- **Lot 8, tâches planifiées** : `GET /api/cron/billing-verify` (`*/1`) et `GET /api/cron/subscription-renewals` (`0 8 * * *`). `vercel.json` en compte alors **8**.
- **Lot 9, admin** : `GET /api/admin/shops`, `GET /api/admin/shops/[orgId]` et `POST /api/admin/shops/[orgId]/plan` (avec audit).

### Pages
- `(public)` : `/`, `/tarifs`, `/c/[code]`, `/login`, `/signup`, `/verify-email`, `/forgot-password`, `/reset-password`, `/auth/error`, `/confidentialite`, `/cgu`.
- `(app)` : `/app`, `/app/bienvenue`, `/app/produits`, `/app/produits/nouveau`, `/app/produits/[id]`, `/app/campagnes`, `/app/campagnes/nouvelle`, `/app/campagnes/[id]`, `/app/commandes`, `/app/clients` (sans onglets), `/app/clients/[id]`, `/app/abonnement`, `/app/reglages`.
- `(admin)` : `/admin`, `/admin/boutiques` et `/admin/boutiques/[id]`.

### Variables d'environnement
- **Lot 4** (ajout) : `AUTH_PROTECTED_PREFIXES="/app,/admin"` et `AUTH_LOGIN_PATH="/login"`.
- **Lot 5** (ajout) : `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` et `VAPID_SUBJECT` (`mailto:` ou `https:`). Facultatives : sans elles, le push est inerte.
- **Lot 8** (ajout) : `SASPAY_API_KEY`, `SASPAY_WEBHOOK_SECRET` et `SASPAY_API_URL="https://api.saspay.me/api/v1"`. Elles sont facultatives : si elles manquent, l'API renvoie `503 BILLING_NOT_CONFIGURED`.
- **Retraits** : le lot 1 retire `WITHDRAWAL_*`, `BICTORYS_PRIVATE_KEY` et `BICTORYS_MERCHANT_SECRET_CODE`. Le lot 8 retire les autres `BICTORYS_*` et `COMMISSION_RATE_BP`.

---

## Les 9 lots

| # | Lot | Livrable vérifiable | Dépend de |
|---|---|---|---|
| 1 | Fondations | Le repo `intention-d-achat` est en place. Retraits retirés, nom Tamani, groupes de routes. Barrière et smoke test d'auth verts. | — |
| 2 | Identité visuelle | Logo, tokens, polices et composants de niveau exceptionnel, validés sur maquettes. Contrastes testés. | 1 |
| 3 | Cœur métier (backend) | Modèles, logique pure et API boutique, produits et campagnes, tous testés (cloisonnement inclus). | 1 |
| 4 | Espace grossiste | Un grossiste s'inscrit, crée sa boutique, un produit et une campagne, puis la partage sur WhatsApp. | 2, 3 |
| 5 | Pop-up public | Un répondant répond depuis son téléphone. La réponse est dédupliquée, protégée et compte dans le quota, et la personne entre dans le carnet de clients. | 2, 3 |
| 6 | Tableau de bord | Verdict, quantité, argent évité et bénéfice, bulletin du jour, statistiques, relance WhatsApp et export CSV. | 3, 5 |
| 7 | Commandes et clients | Conversion d'une réponse en commande, commandes manuelles, statuts, livraisons par quartier, carnet dynamique filtrable, fiabilité et coefficients appris. | 3, 5, 6 |
| 7b | Pays et monnaies | Toute l'Afrique francophone : chaque pays a sa monnaie, ses prix et ses numéros (ajout du 2026-10-27). | 3, 4 |
| 8 | Forfaits prépayés et SasPay | Passes (Semaine, Mois, Grossiste) et recharges payés en mode test SasPay : activation idempotente, réponses comptées par pass, rappels et grâce, plafond du Gratuit. Bictorys retiré. | 3, 5, 6, 7, 7b |
| 9 | Admin, accueil, légal, production | Admin Tamani, page d'accueil, CGU et confidentialité, mise en ligne sur Vercel avec SasPay en mode live. | tous |

Les lots 2 et 3 peuvent être menés en parallèle, puis les lots 4 et 5.

### Lot 1 : Fondations
Détaillé dans [2026-10-24-tamani-01-fondations.md](2026-10-24-tamani-01-fondations.md).

### Lot 2 : Identité visuelle (exigence : niveau exceptionnel)
Skills : `ui-ux-pro-max:design-system`, `ui-ux-pro-max:design` (logo), `ui-ux-pro-max:brand`, `design-taste-frontend`, `frontend-design`. Validation par le compagnon visuel du brainstorming.
1. **Pistes de direction artistique.** Trois pistes contrastées, chacune avec palette, typographie, logo et **le même écran** (la page campagne de la spec §5.4.0) montré en rendu fidèle. Le porteur du projet choisit, puis on affine (étape humaine). Résultat : la charte `docs/brand/tamani-brand.md`, avec les piliers proximité, clarté et émerveillement, le ton, la palette, les polices et les règles de mise en page.
2. **Logo.**
   - Fichiers : `frontend/public/brand/tamani-logo.svg`, `tamani-mark.svg`, `frontend/src/app/icon.svg`, `apple-icon.png` et `frontend/public/brand/og-default.png` (1200×630).
   - Silhouette du *tamani* (tambour en sablier) qui se lit aussi comme une bulle de parole.
3. **Tokens.**
   - `globals.css` contient un bloc `@theme` avec les couleurs sémantiques `--color-bg`, `--color-surface`, `--color-ink`, `--color-ink-muted`, `--color-primary`, `--color-primary-ink`, `--color-accent`, `--color-success`, `--color-warning`, `--color-danger`, `--color-neutral-verdict` et `--color-whatsapp`, plus les rayons, ombres, espacements et l'échelle typographique.
   - Les polices passent par `next/font`.
   - Test `frontend/src/lib/design/contrast.test.ts` : les paires texte/fond de `frontend/src/lib/design/tokens.ts`, y compris les 5 couleurs de verdict, ont un contraste ≥ 4,5:1, calculé avec `contrastRatio(hexA, hexB)`.
4. **Composants** dans `frontend/src/components/ui/`.
   - `Button`, `ChoiceButton` (cible tactile ≥ 48 px), `Input`, `PhoneInput`, `Card`, `BottomSheet` (animation **CSS seulement**), `Badge`, `StatTile`, `VerdictCard`, `MoneyCard`, `FilterBar`, `DataList` et `EmptyState`.
   - La page `/styleguide` appelle `notFound()` en production.
   - Test `no-motion-in-popup.test.ts` : `BottomSheet`, `ChoiceButton` et les fichiers sous `app/(public)/c/` n'importent ni `motion`, ni `framer-motion`, ni `gsap`.

### Lot 3 : Cœur métier (backend)
Plan détaillé : [2026-10-24-tamani-03-coeur-metier.md](2026-10-24-tamani-03-coeur-metier.md). Rôles : lectures `MEMBER` ; réglages de la boutique et zones `ADMIN` ; produits et campagnes `MEMBER` ; suppression d'un produit `ADMIN`.

1. **Schéma et migration `6_tamani_core`** (§Contrats).
   - Génération par `migrate diff --from-schema-datasource … --to-schema-datamodel … --script`, puis relecture du SQL et `migrate deploy`.
   - Test : `schema-tamani.test.ts`.
2. **Modules partagés**, avec leurs tests :
   - `priceFor('PRO', 12) === 99000` ;
   - `formatPriceLine` produit exactement la chaîne du §Contrats ;
   - `renderShareMessage` laisse `{inconnu}` tel quel ;
   - `waChatLink('+221771234567', 'Salut')` renvoie `https://wa.me/221771234567?text=Salut`.
3. **Modules serveur purs**, avec la dépendance `libphonenumber-js`. Tests :
   - Review Focus 4 ;
   - `maskPhone('+221771234512') === '77 •• •• 12'` ;
   - `estimateDemand` avec 10 réponses usagers et 100 revendeurs et les coefficients 0.5 / 0.7 donne `announced 110, realistic 75, low 64, high 86` ;
   - `effectivePlan` : FREE, puis PRO, puis PRO en grâce, puis retour à FREE ;
   - `extendSubscription` ajoute la nouvelle période après `currentPeriodEnd` ;
   - `monthWindowUtc(2026-10-24)` renvoie `[2026-10-01T00:00Z, 2026-11-01T00:00Z)`.
4. **API boutique et zones.** `POST /api/shops` crée l'`Organization`, le membre `OWNER` et la `Subscription` FREE dans une seule transaction. Tests : `409` à la deuxième création, `404` pour un non-membre, `403` sans CSRF, coefficients bornés à [0, 1].
5. **API produits.** Tests : prix entiers et strictement positifs, `wholesaleMinQty` exigé avec `wholesalePrice`, `costPrice` absent des réponses publiques, archivage au lieu de la suppression quand le produit a des campagnes, cloisonnement.
6. **API campagnes et liens.** Un lien par défaut est créé, avec un code unique et un nouvel essai en cas de collision. Tests : 3 campagnes actives au maximum en FREE, liens de source refusés en FREE, `DEFAULT_SHARE_TEMPLATE` par défaut.

### Lot 4 : Espace grossiste (UI)
Plan détaillé : [2026-10-24-tamani-04-espace-grossiste.md](2026-10-24-tamani-04-espace-grossiste.md). `checkProductRules` passe dans `lib/tamani/product-rules.ts` (partagé avec le navigateur) ; les pages d'auth vivent dans le groupe `(auth)` ; l'envoi des photos passe par `uploadPhoto()` (`lib/tamani/upload.ts`), car `lib/api.ts` (protégé) n'envoie que du JSON.

1. **Pages d'authentification** reprises des `examples/frontend-pages/` avec la charte. Ajouter `AUTH_PROTECTED_PREFIXES` et `AUTH_LOGIN_PATH`. Vérifier que `/app` sans session redirige vers `/login` et que le smoke test d'auth reste vert.
2. **`/app/bienvenue`** : création de la boutique (nom, WhatsApp, pays, logo, zones).
3. **Coquille** : navigation en bas sur mobile (Accueil, Campagnes, Commandes, Clients, Plus) et barre latérale sur ordinateur.
4. **Produits** : liste, création et modification (photos via `POST /api/upload`, prix, prix d'achat facultatif présenté comme « pour calculer ton bénéfice », unité, options).
5. **Campagnes** : un assistant de création (produit → disponibilité → stock et « combien tu prévois de commander » → fin → livraison → message), puis la page campagne avec son onglet Partage (copier, WhatsApp, liens de source verrouillés en FREE).
6. **Réglages** : boutique, zones, coefficients, compte.
7. **Palette** : une fois les pages du kit réécrites (`reglages`, `auth/error`, `error.tsx`, `ToastContext`), ajouter `--color-*: initial;` en tête du bloc `@theme` pour retirer la palette Tailwind par défaut. Ajouter aussi un garde-fou qui interdit les classes `gray-*`, `red-*`, etc. sous `src/`.

Vérification : `pnpm build` et la liste de recette manuelle du plan détaillé.

### Lot 5 : Pop-up public
1. **`getPublicCampaign` et la page `/c/[code]`** : rendu serveur, photo floutée, `BottomSheet`, états « introuvable » et « terminée ».
   - `interestedCount` n'est inclus que si `showLiveCounter` est vrai, `stockQuantity` que si `showStock` est vrai, et `poweredByBadge` suit le forfait effectif.
   - Tests : jamais `whatsappPhone`, ni `costPrice`, ni `plannedQuantity`, ni répondant ; une campagne `CLOSED` donne `accepting: false`.
2. **Aperçu WhatsApp** : `generateMetadata`. `og:image` est la photo du produit en JPEG 1200 × 630 servie par Cloudinary (`c_fill,g_auto,w_1200,h_630,f_jpg,q_auto`), et `/brand/og-default.png` sans photo. Pas d'`opengraph-image.tsx` : WhatsApp abandonne les grandes images, ce qu'un PNG composé avec une photo dépasse souvent.
3. **`POST /api/public/views`** : déduplication par appareil et par jour (Redis `tamani:view:{linkId}:{deviceId}:{yyyymmdd}`, 48 h), puis `openCount`.
4. **`POST /api/public/responses`**.
   - Étapes validées avec zod. Correspondance par `campaignId` et `deviceId`, puis jeton facultatif.
   - Numéro : `normalizePhone`, puis création ou mise à jour du `Respondent` (le client entre dans le carnet), puis fusion des appareils.
   - `suspicious` à partir de 3 numéros différents sur le même appareil. `locked` via `shouldLockNewCompletion`.
   - Limite, par campagne et par 10 min : 30 écritures par téléphone (IP et identifiant d'appareil) et 600 par IP, car les opérateurs mobiles mettent beaucoup d'abonnés derrière une même IP. Champ piège `website`.
   - Tests : Review Focus 1, 2 et 3, `422 INVALID_PHONE`, `401 INVALID_RESPONSE_TOKEN`, `429 RATE_LIMITED`, et `Respondent` créé à la complétion avec `lastSeenAt` mis à jour.
5. **Client du pop-up**.
   - `popupReducer` dans `frontend/src/lib/tamani/popup-machine.ts` (étapes de la spec §5.3). `deviceMemory` est protégé par un `try/catch`.
   - Écran de remerciement et « Modifier ma réponse ».
   - Texte exact sous le champ numéro : « Ton numéro est partagé uniquement avec {Boutique} pour te recontacter au sujet de ce produit. »
   - Mention « Propulsé par Tamani » qui renvoie vers `/?ref={slug}`.
   - Tests : chaque chemin, et le mode sans mémoire.
6. **Budget de performance**.
   - Garde-fou `public-routes.test.ts` : `runtime` présent, pas de `verifyCsrf`, appel de `enforcePublicRateLimit`.
   - JavaScript chargé au premier affichage de `/c/[code]` : ≤ 60 Ko.
   - Recette sur Android et iOS depuis WhatsApp.
7. **Notifications des réponses** (ajout du 2026-10-25, voir [les retours du porteur](../specs/2026-10-25-tamani-retours-porteur.md) §2).
   - À chaque réponse complète : `createNotification` pour chaque membre, puis Web Push (VAPID) envoyé avec `after()`, sans outbox.
   - Modèle `PushSubscription`, routes `/api/push/*`, service worker, manifeste PWA.
   - Cloche dans l'en-tête de l'espace grossiste, et carte « Activer les notifications ».

### Lot 5b : Retouches de l'espace grossiste (ajout du 2026-10-25)
Les onze demandes du porteur ([retours](../specs/2026-10-25-tamani-retours-porteur.md) §3) :
- types d'unité ;
- date d'arrivée seule ;
- avatar et cloche ;
- effets au survol ;
- barre latérale ;
- description de la boutique ;
- pages plus remplies ;
- disposition des Réglages ;
- connexion et inscription en deux colonnes.

Livré par le [plan 5b](2026-10-25-tamani-05b-retouches.md). Décisions prises :
- **« Ouvertures »** : les ouvertures ne sont pas datées (`CampaignLink.openCount` est un total), donc la carte « Cette semaine » montre les ouvertures cumulées des campagnes en cours, sous le libellé « ouvertures en cours ». « intéressés » et « nouveaux clients » sont sur 7 jours glissants.
- **Prénom de l'accueil** : premier mot de `User.name`, envoyé par `GET /api/shops/me` (`me.firstName`). `AuthContext` et `/api/auth/me` restent tels que le kit les livre.
- **Salutation selon l'heure** (demande du porteur) : heure locale du téléphone ; « Bonjour » de 5 h à 12 h, « Bon après-midi » de 12 h à 18 h, « Bonsoir » de 18 h à 5 h.
- **Avatar** : le logo de la boutique, sinon les initiales du nom de l'utilisateur, sinon celles de la boutique. Il ouvre `/app/plus` (« Compte et forfait »).
- **Recherche en Gratuit** : prénoms seulement ; les chiffres ne cherchent dans les numéros qu'avec `respondentContacts`.
- **Réglages sur téléphone** : sections empilées, sans barre de navigation ; le menu de gauche n'existe qu'à partir de `lg`.
- **Unités courantes** : pièce, carton, sac, bouteille, flacon, paquet, douzaine, kg, litre (le poids va dans le nom du produit). Les unités déjà utilisées par la boutique suivent.
- **Date passée** : refusée à la création ; à la modification, seulement si la date change (une campagne arrivée garde sa date).
- **Compteurs des listes** : envoyés sur la première page seulement, sans tenir compte de la recherche ni du filtre (ils décrivent la boutique entière) ; une pastille à 0 est cachée, sauf si elle est active.
- **Pas de « Voir tout »** sous « Activité » : il n'y a pas de page d'activité.
- **Migration `8_shop_description`** ; celle des commandes du lot 7 devient `9_sale_orders`.
- **Clients avancés du lot 7** : `GET …/clients` et `GET …/clients/[respondentId]` sont livrés ici ; la note, l'anonymisation, les filtres zone, produit, mois et « Ont commandé », et la fiabilité restent au lot 7. `GET …/interests` et l'onglet Intérêts sont abandonnés.

### Page d'accueil publique (avancée du lot 9, le 2026-10-25) : lot 9a
Elle vient juste après le lot 5b, avec son propre passage de conception et des maquettes ([retours](../specs/2026-10-25-tamani-retours-porteur.md) §4). Elle est livrée par le lot 9a ([plan](2026-10-26-tamani-09a-accueil.md)), d'après la [maquette v3](../../brand/mockups/2026-10-25-page-accueil-v3.html).

Décisions du porteur, prises sur les maquettes v1 à v3 :
- **Ordre des sections** :
  1. hero ;
  2. vidéo ;
  3. problème ;
  4. solution ;
  5. comment ça marche ;
  6. avant / après ;
  7. tarifs ;
  8. rejoindre la communauté ;
  9. FAQ ;
  10. pied de page.
- **Ce qui disparaît** : aucun écran de téléphone dessiné, et un seul exemple sur toute la page (300 cartons commandés, 190 qui dorment, ≈ 120 à commander).
- **Illustrations** : faites dans ChatGPT ([prompts](../../brand/prompts-images-accueil.md)).
- **Barre de navigation** : flottante. Elle se cache quand on descend et revient quand on remonte.
- **Orbite des réseaux** : gardée. Les logos vibrent quand une réponse arrive.
- **Bande de logos qui défile** : gardée.
- **Durée de réponse annoncée** : « moins de 30 secondes ». Cela vaut aussi pour `DEFAULT_SHARE_TEMPLATE` et pour l'aperçu du lien.
- **À fournir par le porteur** (renseignés dans `LANDING_LINKS` et `LANDING_VIDEO`, boutons cachés tant qu'ils manquent) :
  - le numéro WhatsApp de contact ;
  - le lien du groupe WhatsApp ;
  - les comptes Facebook, Instagram et TikTok ;
  - la vidéo.
- **Pages légales** (`/cgu`, `/confidentialite`) : elles restent au lot 9. Le pied de page les liera à ce moment-là.

### Lot 6 : Tableau de bord
1. **`coefficients`, `verdict`, `money`, `stats`**, avec leurs tests.
   - Verdict aux seuils exacts : 19 réponses → `WAIT` ; ratio 0.9 → `GO` ; 0.89 → `CAUTION` ; 0.4 → `CAUTION` ; 0.39 → `STOP` ; sans référence → `NEUTRAL`.
   - Argent : référence 400, estimation réaliste 210 et prix d'achat 6 000 donnent `avoidedDeadStock 1140000` ; sans prix d'achat, `null`.
   - Les réponses `suspicious` et `locked` sont exclues de l'estimation, et `lockedCount` est calculé à part.
2. **`summary`** : `buildShopSummary` et sa route existent depuis le lot 5b ; on ajoute `campaigns[]`, `moneyProtectedThisMonth` et `todo[]`. Tests : campagnes arrivées avec intéressés à prévenir, argent protégé sur le mois.
3. **API statistiques et réponses de campagne, et export CSV.** Tests : cloisonnement, restrictions par forfait, numéros masqués en FREE, BOM, `;`, guillemets.
4. **Interface**, avec la structure de la spec §5.4.0 et le style du lot 2 (skill `dataviz` pour les répartitions).
   - Accueil `/app` en « bulletin du jour ».
   - Page campagne, onglet Résultats : `VerdictCard`, `MoneyCard`, revendeurs et usagers, demande face à la référence, « Où et quand », signal prix, « Comment c'est calculé ? ».
   - Liste des intéressés avec un bouton WhatsApp, « Copier les numéros », et l'action « Le produit est arrivé ».

Décisions du porteur, le 2026-10-27 (livrées par le [plan du lot 6](2026-10-27-tamani-06-tableau-de-bord.md)) :
- **Verdict offert** : en Gratuit, la première campagne qui atteint 20 réponses comptées reçoit son verdict (quantité et argent), une fois pour toutes. Migration `8b_free_verdict` (`Organization.freeVerdictCampaignId`).
- **Marché** : toute l'Afrique francophone, pas seulement l'UEMOA. Nouveau lot « Pays et monnaies » (7b), placé avant le lot 8.
- **Forfaits prépayés**, tranchés le même jour : on paie des réponses, jamais des campagnes ; passes de 7 ou 30 jours et recharges ; le lien n'est jamais bloqué ; au-delà du plafond du Gratuit, « Réponses fermées pour ce mois ». Spec §5.6, à construire au lot 8.
- **Numéros complets** : la copie des numéros et l'export demandent `respondentContacts` et `csvExport`.

### Lot 7 : Commandes et clients
1. **Migration `9_sale_orders`, puis `orders.ts`**, avec ses tests.
   - `orderUnitPrice` : un revendeur qui commande 12 pièces avec un minimum de 12 paie le prix de gros ; avec 11 pièces, le prix unitaire ; un usager paie toujours le prix unitaire.
   - Transitions autorisées et interdites, ces dernières renvoyant `409 INVALID_ORDER_TRANSITION`.
   - Conversion unique par réponse (Review Focus, à couvrir en plus).
2. **API des commandes.**
   - Création manuelle : le client est créé par `normalizePhone` s'il n'existe pas.
   - Conversion depuis une réponse.
   - Modification du prix uniquement à l'état `TO_CONFIRM`.
   - Paiement « payé » et `paidAt`.
   - Vue `to-deliver`, groupée par zone avec les totaux par produit.
   - Tests : cloisonnement, `ORDER_NOT_FOUND`, et prix figé qui ne change plus après confirmation.
3. **`reliability.ts` et branchement des coefficients appris** dans `coefficientsFor`, réservés au PRO et au-dessus.
   - Tests aux seuils : 19 réponses « Oui » donnent le coefficient de repli, 20 réponses sur 2 campagnes donnent le coefficient appris, et le résultat est borné à [0.1, 1].
   - `clientReliability` : `rate` vaut `null` sous 2 réponses, et 4 commandes livrées sur 5 réponses « Oui » donnent `0.8`.
4. **Filtres clients ajoutés à `clients.ts` (zone, produit, mois, `hasOrdered`), note et anonymisation.** La liste et la fiche existent depuis le lot 5b.
   - Tests de filtres combinés : par exemple, revendeurs + Médina + produit + octobre + `hasOrdered=false`.
   - Tests de pagination et de restriction par forfait (numéros masqués en FREE).
   - Le client anonymisé est toujours compté dans les statistiques, mais n'apparaît plus dans les listes.
5. **`summary`** : on ajoute les commandes à confirmer et les livraisons par quartier dans « À faire ».
6. **Interface.**
   - `/app/commandes` : liste avec filtres, « À livrer par quartier », bouton WhatsApp « Ta commande est confirmée… ».
   - Page campagne, onglet Commandes : stock restant affiché.
   - « Transformer en commande » sur chaque intéressé.
   - `/app/clients` (sans onglets) : les nouveaux filtres dans la `FilterBar` synchronisée avec l'URL.
   - `/app/clients/[id]` : historique, montant total, note, fiabilité.

### Lot 7b : Pays et monnaies (ajout du 2026-10-27)
Le porteur veut couvrir toute l'Afrique francophone. Aujourd'hui tout est en FCFA et la liste des pays est celle de l'Afrique de l'Ouest.
1. **Pays et monnaie par boutique** : `Organization.currency` dérivée du pays ; FCFA UEMOA (XOF), FCFA CEMAC (XAF), franc guinéen (GNF), franc congolais (CDF), et les autres pays francophones retenus avec le porteur.
2. **Incohérences à corriger** :
   - la Guinée est déjà dans `SHOP_COUNTRIES` mais ses prix s'affichent en FCFA alors que sa monnaie est le franc guinéen ;
   - le Cameroun paie en FCFA CEMAC (XAF), pas en XOF : même mot à l'écran, monnaie différente pour SasPay.
3. **Prix et montants** : `formatPrice`, le message de partage, l'argent du verdict et l'export lisent la monnaie de la boutique ; les montants restent des entiers dans la plus petite unité.
4. **Numéros** : la normalisation de `phone.ts` et les indicatifs couvrent chaque pays ajouté.
5. **Paiement** : vérifier dans l'OpenAPI SasPay les pays et les moyens couverts avant d'ouvrir un pays au paiement ; la règle de marge de 70 % se vérifie par monnaie.

### Lot 8 : Forfaits prépayés et SasPay
1. **Client SasPay** dans `frontend/src/lib/server/payments/saspay.ts` (`PaymentProvider.charge` via une session de checkout, plus `verifyPayment(paymentId)`).
   - `toSaspayAmount(9900) === '9900.00'`.
   - `Idempotency-Key` = `Order.idempotencyKey`, avec le `CircuitBreaker` existant.
   - **D'abord** lire `https://docs.saspay.me/api-reference/openapi.json` pour savoir comment relier une session de checkout au webhook (spec §6.7).
   - Tests avec un `fetch` simulé.
2. **`webhook/saspay.ts` (`WebhookProvider`)**.
   - Signature HMAC-SHA256 hexadécimale de `${X-Webhook-Timestamp}.${corps brut}`, avec une tolérance de 300 s et une comparaison à temps constant.
   - `transaction.success` → `paid` ; `transaction.failed` et `transaction.cancelled` → `failed`.
   - Tests : signature valide, signature fausse, horodatage trop vieux, correspondance des événements.
3. **Remplacement de Bictorys** (PRUNING.md adapté).
   - On **garde** : `provider.ts`, `circuit-breaker.ts`, `webhook/handler.ts`, `WebhookLog`, `Order`, `order-expiration` et `webhook-log-purge`.
   - On supprime : `payments/bictorys.ts`, `commission.ts`, `webhook/bictorys.ts` et ses tests, `app/api/webhooks/bictorys`, `app/api/orders`, `app/api/pay-redirect` et `test-utils/bictorys-mock.ts`.
   - On réécrit `provider-singleton.ts` pour SasPay.
   - On met à jour : `.env.example`, `env.ts`, `features.json`, la documentation, et on étend le test `pruned-surfaces`.
4. **Routes de facturation.**
   - `checkout` crée un `Order` en `PENDING` pour un pass ou une recharge, au montant de l'offre, ouvre la session SasPay et renvoie `{ checkoutUrl }`.
   - Le webhook passe la commande en `AWAITING_VERIFICATION` et ajoute à l'outbox les événements des types existants.
   - `billing-verify` (tâche planifiée) et `return` appellent `verifyPayment`, puis `activateFromPayment`, qui prolonge le pass ou ajoute la recharge, puis ouvre les réponses en attente.
   - Tests : Review Focus 3 et 5.
5. **`subscription-renewals`** (aucun renouvellement automatique : un pass se rachète) : rappel à J-3 (`EmailJob` et `Notification`, avec un `dedupeKey` par période), début de grâce, puis retour au FREE. Mettre à jour `vercel.json` et le garde-fou `vercel-json-shape` (8 tâches planifiées).
6. **Interface** : `/app/abonnement` (pass en cours, jauge des réponses, achat d'un pass ou d'une recharge, pass 12 mois), `/tarifs`, bandeau « N réponses en attente », bandeau de grâce. Recette de bout en bout en mode test SasPay.
7. **Passes et recharges** (décision du porteur, 2026-10-27 ; spec §5.6).
   - `PLANS` gagne la durée de chaque offre et le Pass Semaine ; les recharges sont des offres à part, réservées à un pass actif.
   - Le pass enregistre son début, sa fin et ses réponses incluses ; chaque recharge ajoute des réponses jusqu'à la fin du pass. Le modèle exact se décide dans le plan du lot 8.
   - `quota.ts` compte les réponses sur la période du pass ; le Gratuit garde le mois calendaire.
   - Le Grand compte attend le coût réel par réponse mesuré chez un grand grossiste pilote ; avant lui, réduire les appels au serveur par réponse (aujourd'hui un par étape du pop-up).
8. **Garde-fous de marge** (règle « Marge » ci-dessus).
   - Lire les vrais tarifs par réseau avec `GET /pricing/my-rates/` avant de figer les prix.
   - Un test pur qui échoue si un forfait payant, à quota plein, passe sous 70 % de marge (frais SasPay au pire cas, coût par réponse, frais de retrait).
   - Gratuit : plafond de réponses enregistrées par boutique et par mois (1 000 proposé). Au-delà, **décidé par le porteur le 2026-10-27** : la fiche du produit reste visible et affiche « Réponses fermées pour ce mois », sans demander ni quantité ni numéro ; seules les visites sont comptées, et le grossiste voit combien de personnes ont voulu répondre.
   - Au-delà du quota, une notification groupée par jour (« N nouvelles réponses en attente ») au lieu d'une par réponse ; purge des notifications de plus de 90 jours.
   - Alertes et plafonds de dépense chez chaque fournisseur ; photo du pop-up allégée.

### Lot 9 : Admin, accueil, légal, production
1. **API admin des boutiques** : liste, détail, et attribution manuelle d'un forfait (`logAdminAction`, action `shop.plan_grant`). Tests : audit enregistré, `requireSuperadmin`.
2. **Pages `/admin`.**
3. **Page d'accueil `/`** (animations autorisées ici), `/confidentialite` et `/cgu`.
4. **Mise en production** (étapes humaines signalées) :
   - projet Vercel et variables d'environnement ;
   - choix du planificateur des tâches ;
   - achat de `tamani.app` et configuration DNS ;
   - domaine vérifié chez Resend ;
   - clés SasPay live et webhook déclaré dans le tableau de bord SasPay ;
   - Sentry ;
   - `db:migrate:deploy` et `db:make-superadmin` sur la base de production ;
   - smoke test en production.

---

## Protocole d'exécution
1. Au début de chaque lot : créer la branche `plan/NN-<nom>`, puis écrire le plan détaillé `docs/superpowers/plans/AAAA-MM-JJ-tamani-NN-<nom>.md` (skill writing-plans), à partir de ce document et du code en place.
2. Pour chaque tâche : TDD (test qui échoue, code, test qui passe), barrière, commit.
3. En fin de lot : `pnpm build`, smoke test d'auth, revue, PR vers `main`, puis fusion après l'accord du porteur du projet.
4. Toute divergence avec un contrat de ce document se corrige **ici d'abord**.

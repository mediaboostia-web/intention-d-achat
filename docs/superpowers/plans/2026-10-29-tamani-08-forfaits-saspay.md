# Lot 8 : Forfaits prépayés et SasPay — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** un grossiste démarre avec 3 jours d'essai, achète un pass en Mobile Money ou par carte via SasPay, le pass s'active une seule fois après vérification, les réponses en attente s'ouvrent, et la page d'accueil montre la grille du porteur.

**Architecture :** la grille est une table pure (`lib/tamani/plans.ts`) lue par les écrans, les garde-fous de marge et le serveur. Le pass en cours vit dans `Subscription` (début, fin, grâce, réponses incluses) ; une réponse compte quand elle reçoit `Response.countedAt`. Un achat de pass est un `Order` du kit (`provider = 'saspay'`) relié à une session de checkout SasPay ; le webhook signé n'est qu'un signal, et le rapprochement idempotent (`reconcileOrder`) vérifie la session puis le paiement avant d'activer, depuis la page de retour, le webhook et une tâche planifiée.

**Tech Stack :** Next.js 16 (App Router), Prisma 5 / Neon, Vitest, l'API REST SasPay (`https://api.saspay.me/api/v1`), `createWebhookHandler` et `CircuitBreaker` du kit (protégés, utilisés sans modification), Tailwind 4 (jetons seulement).

**Spec :** [docs/superpowers/specs/2026-10-24-tamani-design.md](../specs/2026-10-24-tamani-design.md) §5.6, §5.7 et §6.7 (réécrits le 2026-10-29), et la feuille de route [2026-10-24-tamani-roadmap.md](2026-10-24-tamani-roadmap.md), « Lot 8 ».

## Global Constraints

- **Grille** (porteur, 2026-10-29), en FCFA, même chiffre en XOF et en XAF :
  - Essai gratuit : 0, 3 jours, 50 réponses, 1 campagne en cours, sans liens par groupe ni export, avec « Propulsé par Tamani » ;
  - Pass Semaine : 3 900, 7 jours, 150 réponses ;
  - Pass 2 Semaines : 5 900, 14 jours, 350 réponses ;
  - Pass Mois : 9 900, 30 jours, 1 000 réponses ;
  - Pass Mois Plus : 14 900, 30 jours, 5 000 réponses ;
  - Pass Mois Max : 24 900, 30 jours, 15 000 réponses ;
  - Pass Illimité : sur devis, attribué à la main (lot 9) ;
  - pas de recharges ni de Pass 12 mois : les seuls prix sont les pass. Pour plus de réponses, on prend un autre pass, qui démarre tout de suite et garde les réponses non utilisées.
- **Sans pass** (après l'essai, ou après un pass et sa grâce) : le lien marche, chaque nouvelle réponse est en attente, numéros masqués, 1 campagne en cours.
- **Grâce** : 3 jours après la fin d'un pass payé, fonctions gardées ; l'essai n'a pas de grâce.
- **Clé SasPay** (porteur, 2026-10-29) : SasPay ne propose pas de clé de test à ce compte, on développe donc avec la clé live. Les tests automatiques ne joignent jamais SasPay (`fetch` simulé) et ne lisent pas la clé ; les lectures (tarifs, réseaux) et les sessions non payées ne déplacent pas d'argent ; un vrai paiement n'a lieu qu'avec l'accord explicite du porteur, sur le plus petit pass, payé par lui sur son propre compte marchand.
- **Frais** : `fee_charge_mode: "DEDUCTED"` (Tamani absorbe). **Pays** : paiement dans les 14 pays XOF et XAF seulement ; GN et CD voient « Bientôt disponible ».
- **Marge** : chaque offre payante garde au moins 70 % avec 5 % de frais SasPay, 2 % de retrait et 0,25 FCFA par réponse (test pur, tâche 2).
- **SasPay** (CLAUDE.md, « Intégration de l'API SasPay ») :
  - appels serveur seulement ; la clé jamais dans le navigateur, un log ou git ;
  - montants en chaînes décimales (`"9900.00"`), convertis à la frontière ;
  - activation seulement sur `GET /payments/{id}/verify/` = `SUCCESS` ;
  - redirection vers `checkout_url` ;
  - signature du webhook vérifiée sur le corps brut, rejet au-delà de 300 s ;
  - `401/403/404/409/422/429` gérés, `429` espacé ;
  - aucun champ, statut ou événement absent de l'OpenAPI (copie locale : `.superpowers/saspay/openapi.json`).
- **Montants** : entiers FCFA partout dans la base et le code ; `toSaspayAmount` est le seul passage en chaîne.
- **Fichiers protégés** non modifiés : `webhook/handler.ts`, `payments/circuit-breaker.ts`, `outbox/dispatcher.ts`, `lib/api.ts`, `middleware/*`, `observability/request-context.ts`.
- **Routes** : `export const runtime = 'nodejs'` ; routes de boutique via `shopHandler` ; erreurs via `tamaniError` avec un code de `TAMANI_ERRORS` et sa phrase dans `api-messages.ts`.
- **Logs** : jamais un numéro, un prénom, un email ni la clé ; les identifiants seulement.
- **Migration** : `9c_passes` (les dossiers se trient comme du texte).
- **Mots à l'écran** : « pass », « réponses en attente », « Sans pass », « Essai gratuit ». Plus de « Gratuit », « Pro » ni « Business » dans l'espace grossiste.
- **Recette** : un lot finit par une recette sur la vraie appli, téléphone et ordinateur, via ngrok, avec un seul vrai paiement accepté par le porteur.

## Review Focus

1. **Trois rapprochements en même temps** (retour de paiement, signal du webhook, tâche planifiée) sur le même achat : le pass s'active une fois. → tâche 9, `reconcileOrder activates once when called twice concurrently`.
2. **Un échec lu après un succès** (session relue `FAILED` ou `EXPIRED` après l'activation) : rien n'est rétrogradé. → tâche 9, `late failure never downgrades an activated order`.
3. **Un paiement annoncé mais mal vérifié** : `PAID` côté session, mais `verify` qui ne dit pas `SUCCESS`, ou une autre monnaie, ou un autre `requested_amount`. Pas d'activation, l'achat reste en attente. → tâche 9, `refuses activation when verify is not SUCCESS or the amount differs`.
4. **Réponses en attente à l'achat** : 87 en attente, un Pass Semaine (150) en ouvre 87, les plus anciennes d'abord, et 63 restent libres ; un second pass en ouvre d'autres. → tâche 5, `unlockPending opens the oldest up to the room left`.
5. **Achat payé après son expiration** : `order-expiration` a passé l'`Order` en `EXPIRED`, le paiement réussit ensuite, et `billing-verify` l'active quand même. → tâche 9, `an EXPIRED order paid late is still activated`.

---

### Task 1 : Reconnaissance SasPay (clé live, sans paiement)

Aucun code de production. Elle lit la clé live de `frontend/.env.local` (pas de clé de test chez SasPay) ; on vérifie seulement son préfixe et sa longueur, et rien n'est payé.

**Files :**
- Create (scratchpad, hors dépôt) : `tools/saspay-recon.mjs`. Il lit la clé depuis `.env.local` et n'affiche jamais la clé, un email ni un numéro.
- Modify : la ligne « Marge » de la spec §5.6, avec les vrais tarifs.

- [ ] **Step 1 :** `GET /pricing/my-rates/` et `GET /networks/`. Noter, pour chacun des 14 pays XOF/XAF, les réseaux payin disponibles et leur tarif (pourcentage, fixe, plancher, plafond, `otp_required`).
- [ ] **Step 2 :** `POST /checkout-sessions/` de 500 XOF (BJ), puis `GET /checkout-sessions/{id}/status/`. Comparer les deux corps à l'exemple de l'OpenAPI (corps à plat, sans enveloppe).
- [ ] **Step 3 :** ne pas payer la session : c'est du vrai argent. Les champs de `GET /payments/{transaction_id}/verify/` (`requested_amount`, `debited_amount`, `net_amount`, `currency`, `status`) se lisent sur l'exemple de l'OpenAPI. Ils seront confirmés au seul paiement réel de la tâche 14, accepté par le porteur ; d'ici là, ce point est marqué « non vérifié ».
- [ ] **Step 4 :** recalculer la marge de chaque offre avec le pire tarif payin réel. Expected : toutes ≥ 70 %. Sinon, s'arrêter et montrer le chiffre au porteur, car c'est sa grille.
- [ ] **Step 5 :** un pays sans réseau payin rejoint GN et CD dans « Bientôt disponible » (`PAYMENT_COUNTRIES`, tâche 2). Le noter en ruling.

### Task 2 : La grille, pure, avec ses garde-fous de marge

**Files :**
- Modify : `frontend/src/lib/tamani/plans.ts` (réécrit), `plans.test.ts`.
- Modify, pour que tout compile : chaque lecteur de `monthlyPriceXof`, `monthlyResponses`, `priceFor` et `label`. Liste : `PlusMenu.tsx`, `ShopProvider.tsx`, `AppShell.tsx`, `landing.ts` (`pricingTiers`, FAQ, JSON-LD), `Pricing.tsx`, `PricingTags.tsx`, `quota.ts`, `campaign-limit.ts`, et les 15 fichiers de test qui citent `'PRO'` ou `'BUSINESS'`.

**Interfaces :**
- Produces :
  - `type PlanId = 'FREE' | 'TRIAL' | 'WEEK' | 'TWO_WEEKS' | 'MONTH' | 'MONTH_PLUS' | 'MONTH_MAX' | 'UNLIMITED'` (`FREE` = « Sans pass ») ;
  - `interface PlanDefinition { id; label; priceXof: number | null; durationDays: number | null; includedResponses: number | null; maxActiveCampaigns: number | null; features: {…six booléens actuels…} }` ;
  - `PLANS: Record<PlanId, PlanDefinition>` ;
  - `PASS_IDS = ['WEEK','TWO_WEEKS','MONTH','MONTH_PLUS','MONTH_MAX'] as const` (`type PassId`) ;
  - `isPassId(v): v is PassId`, `passPrice(id): number`, `passResponses(id): number` (pas de recharges) ;
  - `MARGIN_ASSUMPTIONS = { saspayFee: 0.05, payoutFee: 0.02, costPerResponse: 0.25, floor: 0.7 }`, `marginOf(priceXof, responses): number` ;
  - `PAYMENT_CURRENCIES = ['XOF', 'XAF']`, `PAYMENT_COUNTRIES` (les 14 codes de `SHOP_COUNTRIES` en XOF ou XAF, moins ceux de la tâche 1), `isPaymentCountry(code)` ;
  - labels : « Sans pass », « Essai gratuit », « Pass Semaine », « Pass 2 Semaines », « Pass Mois », « Pass Mois Plus », « Pass Mois Max », « Pass Illimité ».

- [ ] **Step 1 : tests qui échouent** (`plans.test.ts`) :
  - `the porteur's grid` : prix, durées et réponses exactes des Global Constraints, `PLANS.UNLIMITED.priceXof === null` ;
  - `trial opens everything but source links and export` : `TRIAL.features` = `estimate`, `respondentContacts`, `reliability`, `poweredByBadge` à `true`, `sourceLinks` et `csvExport` à `false`, et `maxActiveCampaigns === 1` ;
  - `no pass masks numbers and keeps one campaign` : `FREE.features.respondentContacts === false` et `FREE.maxActiveCampaigns === 1` ;
  - `every paid offer keeps 70 % margin` : pour chaque `PASS_IDS`, `marginOf(...) >= 0.7`. Plus `marginOf(24900, 15000)` ≈ 0.779 au millième, et `marginOf(3900, 150)` ≈ 0.920 ;
  - `payment opens in FCFA countries only` : `isPaymentCountry('BJ')`, `('GA')` vrais ; `('GN')`, `('CD')` faux.
- [ ] **Step 2 :** `pnpm --filter frontend exec vitest run src/lib/tamani/plans.test.ts`. Expected : FAIL.
- [ ] **Step 3 :** écrire `plans.ts`. Adapter les lecteurs listés :
  - la page d'accueil garde une grille simple tirée de `PLANS`, que la tâche 12 remplace ;
  - les tests remplacent `'PRO'` par `'MONTH'` et `'BUSINESS'` par `'MONTH_MAX'`.
- [ ] **Step 4 :** `pnpm typecheck && pnpm test`. Expected : PASS.
- [ ] **Step 5 :** commit `feat(plans): the porteur's passes and margin guard`.

### Task 3 : Migration `9c_passes`

**Files :**
- Modify : `frontend/prisma/schema.prisma`, `schema-tamani.test.ts`.
- Create : `frontend/prisma/migrations/9c_passes/migration.sql`.

**Interfaces :**
- Produces :
  - `Subscription.periodStart DateTime?` et `Subscription.responsesIncluded Int @default(0)` ; `plan` garde son type `String` et prend les valeurs `PlanId` ;
  - `Response.countedAt DateTime?` et `@@index([organizationId, countedAt])` ;
  - sur `Order` : `organizationId String?` (relation `Organization`, `onDelete: SetNull`), `offer String?`, `activatedAt DateTime?`, `@@index([organizationId, createdAt])` et `@@index([provider, status, createdAt])`.

- [ ] **Step 1 : test qui échoue** (`schema-tamani.test.ts`) : `9c_passes` est triée après `9b_currency_by_country`, et le schéma déclare les champs ci-dessus.
- [ ] **Step 2 :** lancer le test. Expected : FAIL.
- [ ] **Step 3 :** écrire le schéma et le SQL :
  - le SQL fait le report `UPDATE "Response" SET "countedAt" = "completedAt" WHERE "completedAt" IS NOT NULL AND "locked" = false` ;
  - les boutiques existantes gardent `plan = 'FREE'` [ruling : données de développement seulement, aucune boutique réelle] ;
  - appliquer avec `node --env-file=.env.local node_modules/prisma/build/index.js migrate deploy`, puis `generate`.
- [ ] **Step 4 :** `pnpm typecheck && pnpm test`. Expected : PASS.
- [ ] **Step 5 :** commit `feat(db): passes, counted answers and shop purchases`.

### Task 4 : Les règles du pass

**Files :**
- Modify : `frontend/src/lib/server/tamani/subscription.ts`, `subscription.test.ts`, `app/api/shops/route.ts` (et son test), `serializers.ts` (`toShop`).
- Modify : les appels à `effectivePlan` (même signature d'entrée).

**Interfaces :**
- Consumes : `PLANS`, `PassId` (tâche 2).
- Produces :
  - `GRACE_DAYS = 3` ;
  - `interface PassState { plan: PlanId; periodStart: Date | null; currentPeriodEnd: Date | null; graceUntil: Date | null; responsesIncluded: number }` ;
  - `effectivePlan(sub, now): { plan: PlanId; inGrace: boolean; endsAt: Date | null }` : `FREE` sans ligne, plan inconnu ou dates absentes (fail closed) ; `TRIAL` jusqu'à `currentPeriodEnd`, sans grâce ;
  - `trialPass(now): PassState` (50 réponses, 3 jours) ;
  - `applyPurchase(current: PassState | null, pass: PassId, used: number, now): PassState`.
    - Un pass démarre à `now`, pour `durationDays`, avec `graceUntil = fin + 3 j`.
    - Il reprend `max(0, responsesIncluded − used)` d'un pass encore en cours ou en grâce, essai compris.

- [ ] **Step 1 : tests qui échouent** (`subscription.test.ts`) :
  - `trial has no grace` ;
  - `a week pass ends after 7 days then 3 days of grace` ;
  - `a pass bought during another keeps the unused answers` (MONTH 1 000, 400 utilisées, puis MONTH_PLUS : 5 600 incluses, `periodStart = now`) ;
  - `a pass bought after no pass starts fresh` ;
  - `a pass bought during the trial keeps the trial's unused answers` ;
  - `a pass bought during grace keeps the unused answers` ;
  - `an unknown plan reads FREE`.
- [ ] **Step 2 : test qui échoue** (route `POST /api/shops`) : une boutique créée a `plan = 'TRIAL'`, avec 50 réponses et une fin à 3 jours.
- [ ] **Step 3 :** lancer les deux fichiers. Expected : FAIL.
- [ ] **Step 4 :** implémenter. `toShop` envoie `plan: { id, inGrace, endsAt }`. `currentPeriodEnd` devient `endsAt` côté client, et `shop-context.ts` suit.
- [ ] **Step 5 :** `pnpm typecheck && pnpm test`. Expected : PASS. Commit `feat(billing): pass rules — trial, carry-over, 3 days of grace`.

### Task 5 : Réponses comptées par pass, en attente et plafond

**Files :**
- Modify : `quota.ts`, `quota.test.ts`, `responses.ts`, `public-campaign.ts`, `notify-response.ts`.
- Modify : la route `GET /api/shops/me`, `ShopProvider.tsx`, `shop-context.ts`, `popup-copy.ts`, le pop-up (`app/(public)/c/[code]/…`), `test-utils/shop-context.tsx`.

**Interfaces :**
- Consumes : `effectivePlan`, `PassState` (tâche 4).
- Produces :
  - `passUsage(db, orgId, now): Promise<{ plan: PlanId; used: number; included: number; endsAt: Date | null; inGrace: boolean; pending: number }>`. `used` compte les `countedAt` dans `[periodStart, graceUntil ?? currentPeriodEnd)`. `pending` compte les réponses complètes et `locked`, sans limite de date ;
  - `shouldLockNewCompletion(tx, orgId, now): Promise<boolean>` : toujours vrai en `FREE`, sinon `used >= included`. Il prend d'abord `advisoryXactLock(tx, quotaLock(orgId))` (`quota:<orgId>`, dans `locks.ts`) ;
  - à la première complétion non verrouillée, `upsertResponse` écrit `countedAt = now` ;
  - `unlockPending(tx, orgId, now): Promise<number>` : les plus anciennes (`completedAt`, puis `id`) jusqu'à la place restante, avec `locked = false` et `countedAt = now`. Il remplace `unlockCurrentMonth` ;
  - `RECORDED_CEILING = 1000`, `answersClosed(db, orgId, now): Promise<boolean>` : vrai en `FREE` ou `TRIAL` quand 1 000 réponses complètes ou plus ont été enregistrées ce mois calendaire ;
  - `PublicCampaign.answersClosed: boolean`. `upsertResponse` répond `409 ANSWERS_CLOSED` à une nouvelle réponse si la campagne est fermée ; une réponse existante reste modifiable ;
  - `GET /api/shops/me` → `usage: { used, included, endsAt, inGrace, pending }` (remplace `responsesThisMonth` / `monthlyLimit`).

- [ ] **Step 1 : tests qui échouent** (`quota.test.ts`) :
  - `no pass locks every new completion` ;
  - `a pass counts answers from its start, carried-over answers included` ;
  - `unlockPending opens the oldest up to the room left` (Review Focus 4 : 87 en attente, 150 incluses → 87 ouvertes, place restante 63) ;
  - `answersClosed at 1 000 recorded this month, never on a paid pass` ;
  - `the quota lock is taken before counting`.
- [ ] **Step 2 : tests qui échouent** (`public-campaign.test.ts`, `responses.test.ts`, test du pop-up) :
  - `answersClosed` dans le JSON public ;
  - `409 ANSWERS_CLOSED` pour une nouvelle réponse ;
  - le pop-up fermé affiche « Réponses fermées pour ce mois » sans demander quantité ni numéro.
- [ ] **Step 3 :** lancer les fichiers. Expected : FAIL.
- [ ] **Step 4 :** implémenter. La notification de réponse en attente dit « Une nouvelle réponse t'attend. Prends un pass pour la voir. »
- [ ] **Step 5 :** `pnpm typecheck && pnpm test`. Expected : PASS. Commit `feat(quota): answers counted per pass, pending answers and the monthly ceiling`.

### Task 6 : Client SasPay

**Files :**
- Create : `frontend/src/lib/server/payments/saspay.ts`, `saspay.test.ts`.
- Modify : `frontend/src/lib/server/env.ts`, `frontend/.env.example` (avec `SASPAY_API_KEY`, `SASPAY_WEBHOOK_SECRET`, `SASPAY_API_URL` facultatives), `env-shape.test.ts` s'il les liste.

**Interfaces :**
- Produces :
  - `toSaspayAmount(n: number): string` (`9900` → `"9900.00"` ; lève une erreur pour un non-entier ou un négatif) ;
  - `class SaspayError extends Error { status: number; code: string; retryable: boolean }` : `401`/`403`/`404`/`409`/`422` non relançables, `429` et `5xx` relançables. Le message ne contient jamais la clé ;
  - `createSaspayClient({ apiKey, baseUrl, fetchImpl? })` → `{ createCheckoutSession(input), checkoutSessionStatus(id), verifyPayment(paymentId) }` :
    - `createCheckoutSession(input: { amount: number; currency: 'XOF' | 'XAF'; country: string; customerEmail: string; customerName: string; description: string; returnUrl: string; metadata: Record<string, string>; expiresAt: Date })` → `{ id, checkoutUrl }` ;
    - `checkoutSessionStatus(id)` → `{ status: string; transactionId: string | null; transactionStatus: string | null }` ;
    - `verifyPayment(id)` → `{ status: 'PENDING' | 'SUCCESS' | 'FAILED' | string; requestedAmount: string; currency: string }` ;
  - `getSaspay(): SaspayClient | null` : paresseux, `null` sans `SASPAY_API_KEY`. Chaque appel passe par une instance de module du `CircuitBreaker` du kit (importé, non modifié).

- [ ] **Step 1 : tests qui échouent** (`saspay.test.ts`, `fetch` simulé) :
  - `toSaspayAmount` ;
  - `createCheckoutSession` envoie `POST {base}/checkout-sessions/` avec `Authorization: Bearer <clé>`, `amount: "9900.00"`, `fee_charge_mode: "DEDUCTED"`, `currency`, `country`, `customer_email`, `customer_name`, `return_url`, `metadata`, `expires_at`, et lit `id` et `checkout_url` à plat (exemple OpenAPI) ;
  - `a 401 is not retryable and never echoes the key` ;
  - `a 429 and a 503 are retryable` ;
  - `checkoutSessionStatus reads status, transaction_id, transaction_status` ;
  - `verifyPayment reads status, requested_amount, currency` ;
  - `getSaspay is null without SASPAY_API_KEY`.
- [ ] **Step 2 :** lancer le test. Expected : FAIL.
- [ ] **Step 3 :** implémenter. Un corps inattendu (pas d'`id` ou de `checkout_url`) est une `SaspayError` (502, relançable), jamais une valeur vide.
- [ ] **Step 4 :** `pnpm typecheck && pnpm test`. Expected : PASS. Commit `feat(saspay): server client for checkout sessions and verify`.

### Task 7 : Webhook SasPay

**Files :**
- Create : `frontend/src/lib/server/webhook/saspay.ts`, `saspay.test.ts`, `frontend/src/app/api/webhooks/saspay/route.ts`, `route.test.ts`.

**Interfaces :**
- Consumes : `createWebhookHandler`, `WebhookProvider` (`handler.ts`, protégé) ; `reconcilePendingOrders` (tâche 9, simulé ici, puis branché à la tâche 9).
- Produces :
  - `getSaspayWebhookProvider(): WebhookProvider<SaspayWebhookPayload>` (`{ event: string; data: { id?: string; status?: string } & Record<string, unknown> }`) :
    - `verifySignature` : en-têtes `x-webhook-signature` et `x-webhook-timestamp` ; `|now − ts| ≤ 300 s` ; HMAC-SHA256 hexadécimal de `${ts}.` + corps brut avec `SASPAY_WEBHOOK_SECRET` ; `timingSafeEqual` sur des longueurs égales ;
    - `extractIds` : `externalId = data.id ?? "${event}:${ts}"` et `eventType = event` ; `transaction.success` → `paid`, `transaction.failed` et `transaction.cancelled` → `failed`, le reste → `other` ;
  - `POST /api/webhooks/saspay` : le gestionnaire du kit, sans effet dans la transaction. Sur une réponse 200 avec un `kind` `paid` ou `failed`, `after(() => reconcilePendingOrders(...))` réveille le rapprochement [ruling : signal idempotent, rattrapé par le retour et la tâche planifiée ; rien n'est perdu si `after` échoue]. 503 sans secret.

- [ ] **Step 1 : tests qui échouent** :
  - `valid signature` ;
  - `wrong signature` ;
  - `timestamp 301 s old is refused` ;
  - `timestamp 301 s ahead is refused` ;
  - `missing headers` ;
  - `event mapping` ;
  - `the signature is computed on the raw bytes` (un corps avec des espaces et des accents, signé tel quel) ;
  - route : `200 then reconciliation is scheduled` et `a replay is deduped` (prismaMock et `next/server` `after` simulés) ;
  - `503 without SASPAY_WEBHOOK_SECRET`.
- [ ] **Step 2 :** lancer. Expected : FAIL.
- [ ] **Step 3 :** implémenter. `runtime-enforcement` reste vert.
- [ ] **Step 4 :** `pnpm typecheck && pnpm test`. Expected : PASS. Commit `feat(saspay): signed webhook as a reconciliation signal`.

### Task 8 : Retrait de Bictorys

**Files :**
- Delete :
  - `payments/bictorys.ts`, `payments/commission.ts`, `payments/provider-singleton.ts` (et leurs tests) ;
  - `webhook/bictorys.ts` et ses tests ;
  - `app/api/webhooks/bictorys/`, `app/api/orders/`, `app/api/pay-redirect/` ;
  - `test-utils/bictorys-mock.ts`.
- Modify :
  - `.env.example` et `env.ts` (plus de `BICTORYS_*` ni de `COMMISSION_RATE_BP`) ;
  - `.planning/features.json`, `PRUNING.md`, `README.md` (moyen de paiement : SasPay) ;
  - `pruned-surfaces.test.ts`.
- Keep : `provider.ts`, `circuit-breaker.ts`, `webhook/handler.ts`, `orders/expire.ts`, `WebhookLog`, `Order`.

- [ ] **Step 1 : test qui échoue** (`pruned-surfaces.test.ts`, nouveau bloc `bictorys (Tamani lot 8)`) : les fichiers listés n'existent plus, et aucun fichier de `src/` ni `.env.example` ne contient `BICTORYS_` ni `bictorys`.
- [ ] **Step 2 :** lancer. Expected : FAIL.
- [ ] **Step 3 :** supprimer et adapter, en suivant les étapes de PRUNING.md (modifications chirurgicales avant les suppressions). `readme-shape` et `env-shape` restent verts : adapter leurs attentes sur Bictorys, pas leurs invariants.
- [ ] **Step 4 :** `pnpm format && pnpm lint && pnpm typecheck && pnpm test`. Expected : PASS. Commit `chore(payments): remove Bictorys, SasPay is the provider`.

### Task 9 : Achat, rapprochement et activation

**Files :**
- Create : `frontend/src/lib/server/tamani/billing.ts`, `billing.test.ts`.
- Create : les routes `app/api/shops/[orgId]/billing/route.ts`, `…/billing/checkout/route.ts`, `…/billing/orders/[orderId]/route.ts` (et leurs tests), `app/api/cron/billing-verify/route.ts` (et son test).
- Modify : `errors.ts`, `api-messages.ts`, `notifications/templates.ts`, `webhooks/saspay/route.ts` (branchement réel), `vercel.json` (tâche 10 compte les tâches planifiées).

**Interfaces :**
- Consumes : `getSaspay` (tâche 6), `applyPurchase` / `effectivePlan` (tâche 4), `unlockPending` / `passUsage` (tâche 5), `advisoryXactLock`.
- Produces :
  - nouveaux codes : `PAYMENT_COUNTRY_UNAVAILABLE` (409), `OFFER_NOT_BUYABLE` (400), `PAYMENT_PROVIDER_UNAVAILABLE` (503), `PURCHASE_NOT_FOUND` (404), `ANSWERS_CLOSED` (409, tâche 5) ; `BILLING_NOT_CONFIGURED` (503) existe déjà ;
  - `startCheckout(db, saspay, { organizationId, userId, offer, now, appUrl }): Promise<{ orderId: string; checkoutUrl: string }>` :
    - refuse un pays hors `PAYMENT_COUNTRIES` ;
    - réutilise un `Order` `PENDING` non expiré de la même boutique et de la même offre qui a déjà un `paymentUrl` (double tap) ;
    - sinon crée l'`Order` (`provider 'saspay'`, `amount = offerPrice`, `currency = shop.currency`, `organizationId`, `offer`, `userId`, `expiresAt = now + 24 h`), ouvre la session hors transaction (`return_url = ${appUrl}/app/abonnement/retour?achat=<orderId>`, `metadata { orderId, organizationId, offer }`, email et nom du compte), puis écrit `providerChargeId` et `paymentUrl` ;
  - `activateFromPayment(tx, orderId, now): Promise<'ACTIVATED' | 'ALREADY_DONE'>`, dans une transaction avec `advisoryXactLock(tx, billingLock(orgId))` :
    - `updateMany({ where: { id, activatedAt: null }, data: { status: 'PAID', paidAt, activatedAt } })` ; 0 ligne → `'ALREADY_DONE'` ;
    - puis `applyPurchase` sur `Subscription` (upsert), puis `unlockPending` ;
  - `reconcileOrder(db, saspay, orderId, now): Promise<'ACTIVATED' | 'ALREADY_DONE' | 'PENDING' | 'FAILED'>` :
    - lit l'état de la session, puis, sur `PAID`, `verifyPayment(transactionId)` ;
    - active seulement si `status === 'SUCCESS'`, `currency === order.currency` et `requestedAmount === toSaspayAmount(order.amount)` ;
    - un échec de session ne touche qu'un `Order` encore `PENDING` (`updateMany where status PENDING` → `FAILED`), jamais un achat activé ;
  - `reconcilePendingOrders(db, saspay, now, limit = 10)` : achats SasPay `PENDING` ou `EXPIRED` de moins de 48 h sans `activatedAt`, l'un après l'autre. Sur une `SaspayError` 429, il s'arrête jusqu'au prochain passage ;
  - routes :
    - `POST /api/shops/[orgId]/billing/checkout` `{ offer }` (`ADMIN`) → `201 { orderId, checkoutUrl }` ;
    - `GET /api/shops/[orgId]/billing` (`MEMBER`) → `{ pass: { plan, label, endsAt, inGrace, used, included, pending }, perCampaign: [{ campaignId, title, used }], purchases: [{ id, offer, amount, status, createdAt, activated }] (10 derniers), paymentAvailable }` ;
    - `GET /api/shops/[orgId]/billing/orders/[orderId]` (`MEMBER`) → lance `reconcileOrder` sauf si l'achat est déjà activé, puis `{ purchase: { id, offer, status, activated } }` ; un achat d'une autre boutique → `404 PURCHASE_NOT_FOUND` ;
    - `GET`/`POST /api/cron/billing-verify` (`verifyCronSecret`, `withLease`) → `reconcilePendingOrders` ;
  - à l'activation, `passActivated(userId, …)` (`templates.ts`, `dedupeKey pass-activated:<orderId>:<userId>`) pour le propriétaire et les admins : « Ton Pass Mensuel est actif jusqu'au 28 novembre. »

- [ ] **Step 1 : tests qui échouent** (`billing.test.ts`, prismaMock, client SasPay simulé) :
  - `reconcileOrder activates once when called twice concurrently` (Review Focus 1) ;
  - `late failure never downgrades an activated order` (2) ;
  - `refuses activation when verify is not SUCCESS or the amount differs` (3) ;
  - `an EXPIRED order paid late is still activated` (5) ;
  - `startCheckout reuses the pending session on a double tap` ;
  - `startCheckout refuses GN and CD` ;
  - `activation unlocks pending answers` ;
  - `a 429 stops the batch`.
- [ ] **Step 2 : tests qui échouent** (routes, `shop-fixtures`) :
  - un `MEMBER` qui paie → 403 ;
  - un non-membre → 404 ;
  - `503 BILLING_NOT_CONFIGURED` sans clé ;
  - `400 VALIDATION_FAILED` pour une offre inconnue ;
  - `400 OFFER_NOT_BUYABLE` pour `UNLIMITED` ;
  - `404 PURCHASE_NOT_FOUND` pour l'achat d'une autre boutique ;
  - la tâche planifiée refuse sans `CRON_SECRET`.
- [ ] **Step 3 :** lancer. Expected : FAIL.
- [ ] **Step 4 :** implémenter. Brancher le webhook (tâche 7) sur `reconcilePendingOrders`.
- [ ] **Step 5 :** `pnpm typecheck && pnpm test`. Expected : PASS. Commit `feat(billing): checkout, idempotent reconciliation and activation`.

### Task 10 : Rappels, grâce et fin d'essai

**Files :**
- Create : `frontend/src/lib/server/tamani/renewals.ts`, `renewals.test.ts`, `app/api/cron/subscription-renewals/route.ts` (et son test).
- Modify : `notifications/templates.ts`, `vercel.json`, `vercel-json-shape.test.ts` (6 → 8 tâches : `billing-verify` `*/1 * * * *` et `subscription-renewals` `0 8 * * *`).

**Interfaces :**
- Produces : `runRenewals(db, now, mail: Pick<EmailQueue, 'enqueue'>): Promise<{ reminders: number; graces: number; trialsEnded: number }>`. Notifications au propriétaire et aux admins :
  - J-3 : un pass payé finit dans les 3 prochains jours. Notification `dedupeKey pass-reminder:<orgId>:<currentPeriodEnd ISO>` et email (seulement quand la notification vient d'être créée) : « Ton pass finit le 12 novembre. Rachète-le pour garder tes réponses ouvertes. » ;
  - grâce : la fin est passée, `graceUntil` non : « Ton pass est terminé. Il te reste 3 jours pour le racheter. » ;
  - essai : un `TRIAL` fini depuis moins de 24 h : « Ton essai est terminé. Tes nouvelles réponses t'attendent : prends un pass pour les voir. ».

- [ ] **Step 1 : tests qui échouent** :
  - `reminds once per period` (deux passages, un email) ;
  - `no email when the notification was deduped` ;
  - `grace and trial end are told once` ;
  - `FREE shops get nothing` ;
  - cron : `refuses without CRON_SECRET` ;
  - `vercel.json declares 8 crons`.
- [ ] **Step 2 :** lancer. Expected : FAIL.
- [ ] **Step 3 :** implémenter.
- [ ] **Step 4 :** `pnpm typecheck && pnpm test`. Expected : PASS. Commit `feat(billing): pass reminders, grace and trial end`.

### Task 11 : Le pass dans l'espace grossiste

**Files :**
- Create :
  - `components/ui/PassMeter.tsx` (et son test) ;
  - `components/ui/OfferCard.tsx` (et son test), partagé avec la page d'accueil ;
  - `components/app/BillingView.tsx` (`BillingView` dessiné depuis ses props, `BillingScreen` qui charge) ;
  - `app/(app)/app/abonnement/page.tsx`, `app/(app)/app/abonnement/retour/page.tsx` ;
  - `lib/tamani/billing-view.ts` (et son test).
- Modify :
  - `AppShell.tsx` (bandeaux), `SideNav`, `HomeView`, `PlusMenu.tsx` ;
  - `api-messages.ts`, `client-view.ts`, `ExportView.tsx`, `InterestedList.tsx`, `ClientDetail.tsx`, `ClientList.tsx`, `OrderDetail.tsx`, `SourceLinks.tsx`, `NavBar.tsx`, `styleguide/page.tsx` : chaque `/app/plus#forfait` → `/app/abonnement` et chaque « Pro » / « Gratuit » → les mots du pass.

**Interfaces :**
- Consumes : `GET /api/shops/[orgId]/billing`, `POST …/billing/checkout`, `GET …/billing/orders/[orderId]` (tâche 9) ; `useShop().usage` (tâche 5).
- Produces :
  - `billing-view.ts` : `meterTone(used, included): 'ok' | 'warning' | 'full'` (≥ 80 % → `warning`, ≥ 100 % → `full`), `meterLine(usage, now)` (« 1 240 / 3 000 réponses · pass jusqu'au 12 novembre », ou « Sans pass · 87 réponses en attente »), `offerCards(currency)` (les 5 pass, Confort marqué `bestValue`), `returnState(purchase)` (`'checking' | 'active' | 'failed'`) ;
  - `PassMeter({ usage, currency, canBuy })` : barre, ton d'alerte, bouton « Prendre un pass », qui devient « Prendre un autre pass » quand un pass est en cours ;
  - `OfferCard({ name, price, currency, durationLabel, responsesLabel, forWho, badge?, action })`.

- [ ] **Step 1 : tests qui échouent** (`billing-view.test.ts`, HTML statique des vues) :
  - `meterTone at 79, 80 and 100 %` ;
  - `meterLine without pass shows the pending count` ;
  - `the subscription page lists five passes, the best value badge on Mois Max` ;
  - `the subscription page shows the per-campaign detail` ;
  - `home shows the pass meter on phone and desktop` ;
  - `no top-up anywhere: a full meter offers another pass` ;
  - `a GN shop sees « Bientôt disponible » and no buy button` ;
  - `a MEMBER sees why they cannot buy` ;
  - `the grace banner and the pending banner` ;
  - `the return page states checking, active and failed` ;
  - `no « Pro » or « Gratuit » left in the shop space` (lit les sources `components/app` et `lib/tamani`, hors landing et tests).
- [ ] **Step 2 :** lancer. Expected : FAIL.
- [ ] **Step 3 :** implémenter :
  - « Choisir » envoie le checkout, puis `window.location.assign(checkoutUrl)` ;
  - la page de retour interroge l'achat toutes les 3 s pendant 2 min, puis propose « Vérifier encore » ;
  - jetons du kit seulement, `formatMoney(…, shop.currency)`.
- [ ] **Step 4 :** `pnpm typecheck && pnpm test`. Expected : PASS. Commit `feat(app): pass meter, subscription page, return page and banners`.

### Task 12 : La grille sur la page d'accueil

**Files :**
- Modify : `components/landing/Pricing.tsx` (réécrit), `landing.css`, `lib/tamani/landing.ts` (`pricingOffers`, FAQ, JSON-LD), `Hero.tsx` et `Community.tsx` (« Gratuit pour commencer » → « 3 jours d'essai gratuit »), `landing.test.tsx`, `landing.test.ts`.
- Delete : `components/landing/PricingTags.tsx` (le choix 1 mois / 12 mois disparaît).
- Create : `components/landing/OfferRail.tsx` (feuille client : les flèches seulement).

**Interfaces :**
- Consumes : `OfferCard` (tâche 11), `PLANS`, `LANDING_LINKS.whatsappContact`.
- Produces : `pricingOffers(): Array<{ id; name; price: string; durationLabel; responsesLabel; forWho; badge? }>` (essai, 5 pass, Illimité), avec les lignes « pour qui » :
  - Essai : « Pour voir Tamani marcher sur un produit » ;
  - Semaine : « Pour un arrivage à écouler vite » ;
  - 2 Semaines : « Pour deux semaines de ventes » ;
  - Mois : « Pour vendre tout le mois » ;
  - Mois Plus : « Pour un groupe actif » ;
  - Mois Max : « Pour les grands groupes » ;
  - Illimité : « Pour les très grandes communautés ».

- [ ] **Step 1 : tests qui échouent** :
  - `seven cards in the porteur's order` ;
  - `Mois Max carries « Le meilleur prix par réponse »` ;
  - `Illimité reads « Sur devis » and hides its button while whatsappContact is null` ;
  - `the line under the cards` (« Mobile Money ou carte · Pas de renouvellement automatique · Campagnes illimitées ») ;
  - `JSON-LD lists the five passes in XOF` ;
  - `the FAQ answers how the free trial works` ;
  - `no 12-month toggle`.
- [ ] **Step 2 :** lancer. Expected : FAIL.
- [ ] **Step 3 :** implémenter :
  - la rangée est en `scroll-snap` CSS (une carte et demie visible sur téléphone, quatre et des flèches à partir de `lg`) ;
  - pas de bibliothèque d'animation ;
  - tout s'arrête sous `prefers-reduced-motion` ;
  - aucun débordement horizontal de la page à 320 px.
- [ ] **Step 4 :** `pnpm typecheck && pnpm test`. Expected : PASS. Commit `feat(landing): the porteur's pricing grid as a scrollable rail`.

### Task 13 : Documentation

**Files :**
- Modify : `CLAUDE.md`, la feuille de route, `README.md`.

- [ ] **Step 1 :** `CLAUDE.md` :
  - nouvelle section « Tamani passes and SasPay (lot 8) » : la grille, `countedAt`, le rapprochement et ses trois déclencheurs, les codes d'erreur, les tâches planifiées, la recette ngrok ;
  - les phrases du kit qui disent « Bictorys is the default » passent à SasPay ;
  - les tests `*shape*` restent verts.
- [ ] **Step 2 :** feuille de route : « Lot 8 » → « Fait », avec les rulings du ledger.
- [ ] **Step 3 :** `pnpm format && pnpm lint && pnpm typecheck && pnpm test && pnpm build`. Expected : PASS. Commit `docs(billing): passes and SasPay`.

### Task 14 : Recette de bout en bout (ngrok, un vrai paiement accepté)

**Files :**
- Create (scratchpad) : `tools/recette-8-data.mjs` (compte jetable, création et suppression) et `tools/recette-8.mjs` (CDP, 390 et 1280 px).

- [ ] **Step 1 :** le serveur `next start --port 3001` avec `APP_URL=https://<domaine ngrok>`, puis le tunnel ngrok. Le porteur déclare le webhook dans le tableau de bord SasPay :
  - URL `https://<domaine ngrok>/api/webhooks/saspay` ;
  - événements `transaction.success`, `transaction.failed`, `transaction.cancelled`, `webhook.test` ;
  - il colle le secret dans `SASPAY_WEBHOOK_SECRET`. On vérifie seulement la longueur.
- [ ] **Step 2 :** `webhook.test` depuis le tableau de bord. Expected : 200 dans les logs du serveur, une ligne `WebhookLog`.
- [ ] **Step 3 :** le parcours :
  1. nouvelle boutique (BJ) ;
  2. « Essai gratuit · 0 / 50 » ;
  3. 3 réponses par le pop-up ;
  4. passage de l'essai à la fin (date reculée en base, compte jetable) ;
  5. 2 réponses en attente ;
  6. « Choisir » le Pass Semaine ;
  7. paiement réel sur la page SasPay, par le porteur et seulement avec son accord (3 900 FCFA vers son propre compte marchand) ;
  8. la page de retour dit « actif » ;
  9. le compteur indique « 2 / 150 », les 2 réponses sont ouvertes ;
  10. le report d'un pass à l'autre est couvert par les tests de la tâche 4 ; un second vrai paiement n'a lieu que si le porteur le demande.
- [ ] **Step 4 :** une boutique GN voit « Bientôt disponible » ; un `MEMBER` ne peut pas acheter ; la grille de la page d'accueil défile sans débordement à 390 px.
- [ ] **Step 5 :** relire `GET /pricing/my-rates/` et confirmer la marge de la tâche 1. Envoyer au porteur le lien et l'accès.

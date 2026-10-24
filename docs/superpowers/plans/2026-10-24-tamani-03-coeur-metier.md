# Tamani — Lot 3 : Cœur métier (backend)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** poser le socle serveur de Tamani : le schéma (boutique, zones, produits, campagnes, liens, répondants, réponses, abonnement), les modules métier purs et testés, et les API privées de la boutique, des produits et des campagnes que les lots 4 à 8 consomment.

**Architecture :**
- Logique pure partagée avec le navigateur : `frontend/src/lib/tamani/` (forfaits, vocabulaire, message de partage, liens WhatsApp).
- Logique serveur : `frontend/src/lib/server/tamani/`. Les modules purs (téléphone, codes courts, statut de campagne, estimation, abonnement) sont séparés des modules qui touchent la base (quota, boutique, verrous).
- Routes sous `frontend/src/app/api/shops/**`. Chaque route de boutique passe par le vrai `requireOrgRole` du kit : un non-membre reçoit 404.
- Les sérialiseurs (`serializers.ts`) sont la seule porte de sortie des données. `toPublicProduct` est une liste blanche explicite que le lot 5 réutilise.
- Les deux courses réalistes (double création de boutique, activation simultanée de campagnes) sont fermées par un verrou consultatif Postgres pris dans la transaction (`pg_advisory_xact_lock`).

**Tech Stack :** Next.js 16 Route Handlers, Prisma 5.22 + Neon, zod 4, `libphonenumber-js` (nouvelle dépendance, import `libphonenumber-js/min`), `node:crypto` (`randomInt`), Vitest 3 + `vitest-mock-extended`.

**Spec :** [docs/superpowers/specs/2026-10-24-tamani-design.md](../specs/2026-10-24-tamani-design.md) §5.1, §5.2, §5.6, §6.2, §6.3, §6.5 (cloisonnement), §6.9. **Feuille de route :** [2026-10-24-tamani-roadmap.md](2026-10-24-tamani-roadmap.md), lot 3 et §Contrats (mis à jour par ce plan : voir « Ajouts aux contrats »).

## Global Constraints

- Chaque route : `export const runtime = 'nodejs'`, corps dans `withRequestContext(makeRequestContext(req.headers), …)`, mutation → `verifyCsrf(req)` **en premier**, puis `requireAuth()` ou `requireOrgRole(orgId, rôle)`.
- **Rôles** : lectures `MEMBER`. Réglages de la boutique (`PATCH /api/shops/[orgId]`, création, modification et suppression des zones) : `ADMIN`. Produits (`POST`, `PATCH`) et campagnes (`POST`, `PATCH`, liens) : `MEMBER`. Suppression d'un produit : `ADMIN`.
- **Cloisonnement** : toute requête sur une ressource fille porte `organizationId` dans son `where` (`findFirst({ where: { id, organizationId } })`, `deleteMany`, `updateMany`). Jamais `findUnique({ where: { id } })` seul sur une ressource de boutique. Une ressource d'une autre boutique donne 404 avec le code de la ressource.
- **Erreurs** : `{ error: CODE, message }`. Corps invalide → `400 { error: 'VALIDATION_FAILED', message }` (code du kit). Codes Tamani pris dans `TAMANI_ERRORS`, messages par défaut en français, au tutoiement.
- Chaque réponse JSON (succès et erreur Tamani) porte l'en-tête `x-request-id`.
- **Montants** : entiers FCFA strictement positifs, au plus `100 000 000`. Un décimal, une chaîne ou zéro → 400.
- **Photos et logo** : URL `https://res.cloudinary.com/…` uniquement (sortie de `/api/upload`), 6 photos au plus.
- **Numéros** : stockés en E.164. Jamais de numéro ni de prénom dans `log.*`.
- **Forfaits** : FREE 0 FCFA, 3 campagnes actives, 150 réponses par mois ; PRO 9 900, illimitées, 3 000 ; BUSINESS 24 900, illimitées, 15 000 ; annuel = mensuel × 10 ; grâce 5 jours.
- **Fichiers protégés** : aucun n'est modifié. `slug.ts`, `zod-helpers.ts`, `auth.ts` et les middlewares sont seulement importés.
- **Windows** : CLI Prisma depuis `frontend/` avec `node --env-file=.env.local node_modules/prisma/build/index.js <cmd>` (Git Bash pour les redirections) ; aucun `next dev` lancé pendant `generate` ; un `P1001` se relance.
- **Tests ciblés** : `npx vitest run <chemin>` depuis `frontend/` (le `pnpm --filter frontend exec vitest` du CLAUDE.md échoue sur ce poste). Mettre les chemins à crochets entre guillemets.
- Barrière avant chaque commit : `pnpm format && pnpm lint && pnpm typecheck && pnpm test` (depuis la racine). Fin de lot : `pnpm build` et `pnpm smoke:auth`. Commits Conventional Commits terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Double appui sur « Créer ma boutique »** (deux `POST /api/shops` simultanés, réseau lent). Une seule boutique naît ; le second appel reçoit `409 SHOP_ALREADY_EXISTS`. → Tâche 5, `POST /api/shops re-checks membership inside the locked transaction`.
2. **Deux grossistes appellent leur boutique « Chez Awa »**. Le second obtient le slug `chez-awa-2`, jamais une 500. → Tâche 5, `POST /api/shops retries the slug when another shop has the same name`.
3. **Un prix tapé « 7500.50 », « 7 500 » ou 0**. Rien n'est enregistré, `400 VALIDATION_FAILED`. → Tâche 6, `POST rejects decimal, string, zero and negative prices`.
4. **Une boutique FREE contourne la limite de 3 campagnes** en rouvrant une campagne terminée ou en repoussant la date de fin d'une campagne expirée. → Tâche 7, `PATCH reopening a closed campaign at the FREE limit returns 409 CAMPAIGN_LIMIT_REACHED` et `PATCH pushing endsAt forward on an expired campaign counts as reopening`.
5. **Un identifiant d'une autre boutique** dans l'URL ou dans le corps (un `productId` étranger à la création d'une campagne). 404, aucune donnée. → Tâche 6, `GET product of another shop returns 404 PRODUCT_NOT_FOUND` ; Tâche 7, `POST with a productId from another shop returns 404 PRODUCT_NOT_FOUND`.

Déjà épinglé par la feuille de route : Review Focus 4 du projet (même numéro saisi de trois façons) → Tâche 3, `normalizePhone returns the same E.164 for local, +, and 00 forms`.

## Ajouts aux contrats (reportés dans la feuille de route avec ce plan)

- `TAMANI_ERRORS` gagne `ZONE_NOT_FOUND`, `ZONE_ALREADY_EXISTS` et `INVALID_CAMPAIGN_TRANSITION`.
- `errors.ts` exporte aussi `isUniqueViolation(err: unknown, field?: string): boolean` (P2002, et `field` présent dans `meta.target`).
- `phone.ts` exporte aussi `shopCountry(country: string): CountryCode` (repli `'SN'`).
- `short-code.ts` exporte aussi `withUniqueCode<T>(create: (code: string) => Promise<T>, attempts = 5): Promise<T>`.
- `campaign-status.ts` exporte aussi `CampaignStatus`, `CAMPAIGN_TRANSITIONS`, `canTransitionCampaign(from, to)`, `activeCampaignWhere(now)` et `effectiveStatusWhere(status, now)`.
- `plans.ts` exporte aussi `isPlanId(value: string): value is PlanId`.
- `renderShareMessage` accepte `{disponibilite}` **et** `{disponibilité}` (le grossiste tape l'accent).
- Nouveaux modules serveur : `http.ts` (`readJson`, `jsonOk`, `validationFailed`), `locks.ts` (`advisoryXactLock`), `inputs.ts` (schémas zod des corps), `serializers.ts` (`toShop`, `toZone`, `toShopProduct`, `toPublicProduct`, `toCampaign`, `toLink`, `shareUrl`).
- **Limite FREE** : on compte les campagnes au statut effectif `ACTIVE`. Une campagne `ARRIVED` ne compte pas, pour que « Produit arrivé » ne soit jamais bloqué ; le quota mensuel de réponses reste la vraie borne.
- **Transitions de campagne** : `DRAFT → ACTIVE`, `ACTIVE → CLOSED | ARRIVED`, `CLOSED → ACTIVE | ARRIVED`, `ARRIVED → CLOSED`. Elles partent du statut **effectif**.

---

### Task 1 : Schéma et migration `6_tamani_core`

**Files:**
- Modify: `frontend/prisma/schema.prisma` (modèle `Organization`, nouveaux modèles en fin de fichier)
- Create: `frontend/prisma/migrations/6_tamani_core/migration.sql`
- Test: `frontend/src/lib/server/tamani/schema-tamani.test.ts`

**Interfaces:**
- Produces : les modèles du §Contrats de la feuille de route, à l'identique. Accesseurs Prisma : `deliveryZone`, `product`, `campaign`, `campaignLink`, `respondent`, `response`, `subscription`. Relations : `Organization.zones | products | campaigns | respondents | responses | subscription`, `Campaign.product | links | responses`, `Response.link | respondent | zone`.

Choix fixés :
- Chaque modèle : `id String @id @default(cuid())`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`.
- `organization` → `onDelete: Cascade` partout. `Campaign.product` → `onDelete: NoAction` : on ne supprime pas un produit qui a des campagnes (l'API archive), mais la suppression d'une boutique cascade encore. `Response.link`, `Response.respondent`, `Response.zone` → `onDelete: SetNull`.
- `Product.options String[] @default([])`. Index : `Product @@index([organizationId, createdAt])`, `Campaign @@index([organizationId, status])`, `Campaign @@index([productId])`, `CampaignLink @@index([campaignId])`, plus ceux du contrat sur `Response`.
- `Respondent.firstSeenAt` et `lastSeenAt` : `DateTime @default(now())`.

- [ ] **Step 1 : Écrire le test qui échoue** `schema-tamani.test.ts`. Il lit `prisma/schema.prisma` et `prisma/migrations/6_tamani_core/migration.sql` (chemins via `import.meta.url`, comme `schema-direct-url.test.ts`), découpe chaque bloc `model X { … }` et vérifie :
  - `it.each` sur les 7 nouveaux modèles : le bloc existe et chaque champ du contrat y figure avec son type (`unitPrice Int`, `wholesalePrice Int?`, `costPrice Int?`, `photos Json @default("[]")`, `options String[]`, `status String @default("DRAFT")`, `code String @unique`, `plan String @default("FREE")`, `locked Boolean @default(false)`…) ;
  - `Organization` contient `whatsappPhone String?`, `country String @default("SN")`, `currency String @default("XOF")`, `logoUrl String?`, `coefConsumer Float @default(0.5)`, `coefReseller Float @default(0.7)` ;
  - les contraintes : `@@unique([organizationId, name])` (zone), `@@unique([organizationId, phoneE164])`, `@@unique([campaignId, deviceId])`, `@@unique([campaignId, respondentId])`, `@@index([organizationId, completedAt])`, `@@index([campaignId, completedAt])`, `@@index([respondentId])`, `organizationId String @unique` (abonnement) ;
  - `money fields are Int, never Float or Decimal` : aucune ligne `unitPrice|wholesalePrice|costPrice … Float|Decimal` ;
  - la migration crée les 7 tables (`CREATE TABLE "Product"` …) et ajoute `"coefConsumer"` à `"Organization"`.

- [ ] **Step 2 : Lancer le test.** `npx vitest run src/lib/server/tamani/schema-tamani.test.ts` → FAIL (modèles et migration absents).

- [ ] **Step 3 : Écrire les modèles** dans `schema.prisma`, puis valider : `node --env-file=.env.local node_modules/prisma/build/index.js validate` → `The schema at prisma\schema.prisma is valid`.

- [ ] **Step 4 : Générer le SQL** (Git Bash, depuis `frontend/`) :
  `mkdir -p prisma/migrations/6_tamani_core && node --env-file=.env.local node_modules/prisma/build/index.js migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/6_tamani_core/migration.sql`
  Relire le SQL : seulement des `CREATE TABLE`, `CREATE INDEX`, `ALTER TABLE "Organization" ADD COLUMN` et des clés étrangères ; **aucun** `DROP`.

- [ ] **Step 5 : Appliquer.** `… migrate deploy` → `All migrations have been successfully applied.` Puis `node node_modules/prisma/build/index.js generate` → `Generated Prisma Client`. Puis `… migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code` → code 0 (`No difference detected`).

- [ ] **Step 6 : Relancer le test.** → PASS.

- [ ] **Step 7 : Barrière et commit.** `feat(db): add the Tamani core schema (migration 6_tamani_core)`.

---

### Task 2 : Modules partagés `lib/tamani/`

**Files:**
- Create: `frontend/src/lib/tamani/plans.ts`, `timing.ts`, `labels.ts`, `share-message.ts`, `wa.ts`
- Test: `frontend/src/lib/tamani/plans.test.ts`, `vocabulary.test.ts` (timing et labels), `share-message.test.ts`, `wa.test.ts`

**Interfaces:**
- Produces : exactement le §Contrats « Modules partagés et purs » (sauf `ORDER_STATUS_LABELS` et `client-filters.ts`, lot 7), plus `isPlanId`, `BUYER_TYPES` (`['CONSUMER', 'RESELLER'] as const`), `NOT_INTERESTED_REASONS` et `NOT_INTERESTED_REASON_LABELS`.
- Aucun import serveur : ces fichiers tournent aussi dans le navigateur. `formatXof` réutilise `formatPrice(amount, 'FCFA')` de `@/lib/utils` (espace ASCII).

Valeurs fixées :
- `PLANS` : FREE `{ label: 'Gratuit', monthlyPriceXof: 0, maxActiveCampaigns: 3, monthlyResponses: 150, seats: 1 }` ; PRO `{ 'Pro', 9900, null, 3000, 1 }` ; BUSINESS `{ 'Business', 24900, null, 15000, 3 }`. Fonctionnalités : FREE tout à `false` sauf `poweredByBadge: true` ; PRO et BUSINESS tout à `true` sauf `poweredByBadge: false`.
- `formatAvailability` : `IN_STOCK` → `'Disponible maintenant'` ; `INCOMING` avec `availableAt` à N jours (`Math.ceil` de l'écart en jours) : N ≥ 2 → `'Arrivage dans N jours'`, N = 1 → `'Arrivage demain'`, N ≤ 0 → `'Arrivage imminent'` ; sans `availableAt` → `'Arrivage prochainement'`.
- `formatPriceLine` sans prix de gros → `'7 500 FCFA'`.

- [ ] **Step 1 : Écrire les tests qui échouent.**
  - `plans.test.ts` : `priceFor('PRO', 12) === 99000`, `priceFor('PRO', 1) === 9900`, `priceFor('BUSINESS', 12) === 249000` ; `PLANS.FREE.maxActiveCampaigns === 3`, `monthlyResponses` 150 / 3000 / 15000 ; `FREE features are all locked except the powered-by badge` ; `PRO has every feature and no badge` ; `isPlanId('PRO')` vrai, `isPlanId('GOLD')` faux.
  - `vocabulary.test.ts` : `TIMING_OPTIONS.IN_STOCK` = `['TODAY_TOMORROW', 'THIS_WEEK', 'THIS_MONTH']`, `INCOMING` = `['ON_ARRIVAL', 'WEEK_AFTER', 'LATER']` ; `TIMING_LABELS.TODAY_TOMORROW === "Aujourd'hui / demain"` et les cinq autres libellés du contrat ; `BUYER_TYPE_POPUP_LABELS` (« Moi », « Revendre »), `BUYER_TYPE_LABELS` (« Usager », « Revendeur ») ; les quatre raisons du « non » ; `QUANTITY_PRESETS`.
  - `share-message.test.ts` : `formatXof(7500) === '7 500 FCFA'` ; `formatPriceLine({ unitPrice: 7500, wholesalePrice: 6000, wholesaleMinQty: 12 }) === '7 500 FCFA (gros : 6 000 FCFA dès 12)'` et sans gros → `'7 500 FCFA'` ; `formatAvailability` pour les cinq cas ci-dessus (now = `2026-10-24T10:00:00Z`, `availableAt` = now + 10 j, + 1 j, − 1 h, `null`) ; `renderShareMessage(DEFAULT_SHARE_TEMPLATE, vars)` donne exactement `'🔔 Nouveau : *Marmites inox 5 L* à 7 500 FCFA (gros : 6 000 FCFA dès 12). Arrivage dans 10 jours. Tu en veux ? Réponds en 5 secondes 👉 https://tamani.app/c/k3P9xQa'` ; `renderShareMessage leaves unknown variables untouched` (`'{inconnu} {produit}'` → `'{inconnu} Marmites inox 5 L'`) ; `{disponibilité}` accentué remplacé aussi.
  - `wa.test.ts` : `waChatLink('+221771234567', 'Salut') === 'https://wa.me/221771234567?text=Salut'` ; sans texte → `'https://wa.me/221771234567'` ; le texte est encodé (`'Prix : 7 500 ?'` → `text=Prix%20%3A%207%20500%20%3F`) ; `waShareLink('a b') === 'https://wa.me/?text=a%20b'`.

- [ ] **Step 2 : Lancer.** `npx vitest run src/lib/tamani` → FAIL (modules absents ; `verdict-display.test.ts` reste vert).

- [ ] **Step 3 : Implémenter** les cinq modules selon le §Contrats et les valeurs ci-dessus. `renderShareMessage` : un seul `replace(/\{([^{}\s]+)\}/g, …)` sur une table de correspondance ; une clé absente renvoie la correspondance telle quelle.

- [ ] **Step 4 : Relancer.** → PASS.

- [ ] **Step 5 : Barrière et commit.** `feat(tamani): add plans, vocabulary, share message and WhatsApp links`.

---

### Task 3 : Modules serveur purs

**Files:**
- Modify: `frontend/package.json` (`pnpm --filter frontend add libphonenumber-js`)
- Create: `frontend/src/lib/server/tamani/http.ts`, `errors.ts`, `phone.ts`, `short-code.ts`, `campaign-status.ts`, `estimate.ts`, `subscription.ts`
- Test: un `*.test.ts` par module, à côté

**Interfaces:**
- Consumes : `PlanId`, `isPlanId` (Tâche 2) ; `BuyerType` (Tâche 2) ; `getRequestId()` de `observability/request-context`.
- Produces :
  - `http.ts` : `readJson(req: Request): Promise<unknown>` (`null` si le JSON est invalide) ; `jsonOk(data: unknown, status = 200): NextResponse` (ajoute `x-request-id` quand un contexte existe) ; `validationFailed(message = 'Invalid request body'): NextResponse` (400 `VALIDATION_FAILED`).
  - `errors.ts` : `TAMANI_ERRORS` (`as const`, les 17 codes du contrat + les 3 ajouts), `type TamaniErrorCode`, `tamaniError(code, status, message?): NextResponse`, `isUniqueViolation(err, field?)`.
  - `phone.ts` : `normalizePhone(raw: string, defaultCountry: CountryCode): string | null`, `maskPhone(e164: string): string`, `shopCountry(country: string): CountryCode`.
  - `short-code.ts` : `generateShortCode(length = 7): string`, `SHORT_CODE_REGEX`, `withUniqueCode(create, attempts = 5)`.
  - `campaign-status.ts` : `type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARRIVED'` ; `effectiveStatus(c: { status: string; endsAt: Date | null }, now: Date): CampaignStatus` ; `isAcceptingResponses(c, now)` ; `isFinished(c, now)` ; `CAMPAIGN_TRANSITIONS: Readonly<Record<CampaignStatus, readonly CampaignStatus[]>>` ; `canTransitionCampaign(from, to): boolean` ; `activeCampaignWhere(now): Prisma.CampaignWhereInput` (`{ status: 'ACTIVE', OR: [{ endsAt: null }, { endsAt: { gt: now } }] }`) ; `effectiveStatusWhere(status: CampaignStatus, now): Prisma.CampaignWhereInput` (`CLOSED` = `OR: [{ status: 'CLOSED' }, { status: 'ACTIVE', endsAt: { lte: now } }]`).
  - `estimate.ts` : `estimateDemand(rows, coefs): DemandEstimate` (contrat).
  - `subscription.ts` : `effectivePlan`, `extendSubscription`, `GRACE_DAYS = 5` (contrat).

Choix fixés :
- `normalizePhone` : `trim`, un préfixe `00` devient `+`, puis `parsePhoneNumberFromString(…, defaultCountry)` de `libphonenumber-js/min` ; renvoie `number` (E.164) seulement si `isValid()`, sinon `null`. Ne lève jamais.
- `maskPhone` : numéro national (sans indicatif) → `${2 premiers} •• •• ${2 derniers}` ; si l'analyse échoue → `•• •• ${2 derniers}`.
- `effectiveStatus` : un statut inconnu est traité comme `DRAFT` (fermé aux réponses).
- `estimateDemand` : sommes par type d'acheteur, puis `Math.round` sur chaque total ; fourchette = coefficient ± 0,1 borné à [0, 1].
- `effectivePlan` : `null`, `FREE`, plan inconnu ou forfait payant sans `currentPeriodEnd` → FREE ; `currentPeriodEnd > now` → forfait, `inGrace: false` ; sinon `graceUntil > now` → forfait, `inGrace: true` ; sinon FREE.
- `extendSubscription` : la période part de `current.currentPeriodEnd` seulement si `current.plan === plan` **et** `currentPeriodEnd > now` (pendant la grâce, elle part de `now`). Ajout de mois en UTC avec plafonnement au dernier jour du mois.

- [ ] **Step 1 : Écrire les tests qui échouent.**
  - `http.test.ts` : `jsonOk` renvoie le corps et le statut ; dans `withRequestContext`, l'en-tête `x-request-id` vaut l'identifiant du contexte ; `validationFailed()` → 400 `{ error: 'VALIDATION_FAILED', message: 'Invalid request body' }` ; `readJson` sur un corps `'{'` → `null`.
  - `errors.test.ts` : `TAMANI_ERRORS` contient les 20 codes (liste écrite en dur dans le test) ; `tamaniError('SHOP_NOT_FOUND', 404)` → statut 404, `error === 'SHOP_NOT_FOUND'`, `message` non vide ; un message passé remplace le défaut ; `isUniqueViolation({ code: 'P2002', meta: { target: ['slug'] } }, 'slug')` vrai, avec `'code'` faux, sans champ vrai ; `meta.target` sous forme de chaîne (`'CampaignLink_code_key'`) reconnu pour `'code'` ; `{ code: 'P2025' }` faux.
  - `phone.test.ts` : **`normalizePhone returns the same E.164 for local, +, and 00 forms`** : `'77 123 45 67'`, `'+221771234567'`, `'00221771234567'`, `'+221 77-123-45-67'` → `'+221771234567'` (pays `SN`) ; `normalizePhone rejects what is not a phone number` : `''`, `'abc'`, `'7712'`, `'+2217712345678901'` → `null` ; `keeps a foreign number in its own country` : `'+33 6 12 34 56 78'` (SN) → `'+33612345678'` ; `uses the shop country for local numbers` : `'76 12 34 56'` (ML) → `'+22376123456'` ; `maskPhone('+221771234512') === '77 •• •• 12'` ; `shopCountry('SN') === 'SN'`, `shopCountry('XX') === 'SN'`.
  - `short-code.test.ts` : 200 codes générés respectent `SHORT_CODE_REGEX` et au moins 195 sont distincts ; `generateShortCode(10)` fait 10 caractères base62 ; `withUniqueCode retries on a code collision` (premier appel rejeté par `{ code: 'P2002', meta: { target: ['code'] } }`, second résolu → résultat renvoyé, 2 appels, 2 codes différents) ; `rethrows other errors at once` (1 appel) ; `gives up after 5 collisions` (rejette, 5 appels).
  - `campaign-status.test.ts` : `effectiveStatus` → `ACTIVE` + `endsAt` passé ou égal à now → `CLOSED`, futur ou `null` → `ACTIVE`, `ARRIVED` avec `endsAt` passé reste `ARRIVED`, `'BOGUS'` → `DRAFT` ; table `isAcceptingResponses` (vrai pour ACTIVE et ARRIVED) et `isFinished` (vrai pour CLOSED et ARRIVED) ; `canTransitionCampaign` vrai pour les 6 transitions des contrats, faux pour `DRAFT → ARRIVED`, `ARRIVED → ACTIVE`, `CLOSED → DRAFT` ; `activeCampaignWhere(now)` et `effectiveStatusWhere` égaux aux objets ci-dessus (`toEqual`).
  - `estimate.test.ts` : lignes `[{CONSUMER,4},{CONSUMER,6},{RESELLER,50},{RESELLER,50}]`, coefficients 0,5 / 0,7 → `announced 110, realistic 75, low 64, high 86`, `byBuyerType.CONSUMER = { respondents: 2, announced: 10, realistic: 5 }`, `RESELLER = { 2, 100, 70 }` ; coefficients 0,95 / 0,05 sur 100 + 100 → `high` utilise 1 et `low` utilise 0 (`low = 85`, `high = 115`) ; lignes vides → tout à 0.
  - `subscription.test.ts` : **`effectivePlan walks FREE → PRO → PRO in grace → FREE`** (abonnement PRO, fin `2026-11-24`, grâce `2026-11-29` ; now = `2026-10-24` → PRO ; `2026-11-26` → PRO en grâce ; `2026-11-30` → FREE ; `null` → FREE) ; PRO sans `currentPeriodEnd` → FREE ; `extendSubscription adds the new period after currentPeriodEnd when the same plan is active` (PRO actif jusqu'au `2026-11-24`, + 1 mois → `2026-12-24`, `graceUntil` `2026-12-29`) ; `starts from now for another plan, an expired period or grace` ; `PRO 12 months from 2026-10-24 ends on 2027-10-24` ; `clamps month ends (2026-01-31 + 1 month = 2026-02-28)`.

- [ ] **Step 2 : Lancer.** `npx vitest run src/lib/server/tamani` → FAIL (modules absents).

- [ ] **Step 3 : Ajouter la dépendance.** Depuis la racine : `pnpm --filter frontend add libphonenumber-js` → la ligne apparaît dans `frontend/package.json`. Si `@prisma/client` ne se résout plus ensuite, relancer `node node_modules/prisma/build/index.js generate` depuis `frontend/` (piège noté dans CLAUDE.md).

- [ ] **Step 4 : Implémenter** les sept modules selon les Interfaces et les choix fixés.

- [ ] **Step 5 : Relancer.** → PASS.

- [ ] **Step 6 : Barrière et commit.** `feat(tamani): add server rules for phones, codes, campaign status, estimate and plans`.

---

### Task 4 : Modules serveur d'accès aux données

**Files:**
- Create: `frontend/src/lib/server/tamani/quota.ts`, `shop.ts`, `locks.ts`
- Test: `quota.test.ts`, `shop.test.ts`, `locks.test.ts` (avec `prismaMock`)

**Interfaces:**
- Consumes : `effectivePlan` (Tâche 3), `PLANS` (Tâche 2), modèles de la Tâche 1.
- Produces :
  - `type Db = Prisma.TransactionClient` (le client et un client de transaction conviennent tous deux), exporté par `locks.ts`.
  - `advisoryXactLock(tx: Db, key: string): Promise<void>` : `tx.$executeRaw\`SELECT pg_advisory_xact_lock(hashtext(${key}))\``. Clés utilisées : `shop-create:<userId>` et `campaign-activate:<organizationId>`.
  - `monthWindowUtc(now): { start: Date; end: Date }`.
  - `shouldLockNewCompletion(db, organizationId, now): Promise<boolean>` : limite = `PLANS[effectivePlan(abonnement).plan].monthlyResponses` ; vrai si le nombre de réponses `{ organizationId, locked: false, completedAt: { gte: start, lt: end } }` atteint la limite.
  - `unlockCurrentMonth(tx, organizationId, now): Promise<number>` : place = limite − réponses non verrouillées du mois ; si place ≤ 0 → 0 sans écriture ; sinon `findMany({ where: { organizationId, locked: true, completedAt: { gte, lt } }, orderBy: [{ completedAt: 'asc' }, { id: 'asc' }], take: place, select: { id: true } })` puis `updateMany({ where: { id: { in } }, data: { locked: false } })` ; renvoie le nombre déverrouillé.
  - `getShopForUser(db, userId): Promise<{ organizationId: string; role: OrgRole } | null>` : `organizationMember.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' }, select: { organizationId: true, role: true } })`.

- [ ] **Step 1 : Écrire les tests qui échouent.**
  - `quota.test.ts` : `monthWindowUtc(new Date('2026-10-24T15:00:00Z'))` → `start 2026-10-01T00:00:00.000Z`, `end 2026-11-01T00:00:00.000Z` ; décembre → `end 2027-01-01` ; `shouldLockNewCompletion` FREE (abonnement `null`) : 149 → `false`, 150 → `true`, et le `count` reçoit exactement le `where` ci-dessus ; PRO actif : 150 → `false` ; **`unlockCurrentMonth unlocks oldest first up to new limit`** (PRO, 150 non verrouillées, 10 verrouillées → `take: 2850`, `orderBy` ascendant, `updateMany` sur les identifiants trouvés, renvoie 10) ; FREE à 150 → renvoie 0 et n'appelle ni `findMany` ni `updateMany`.
  - `shop.test.ts` : renvoie `{ organizationId, role }` de la plus ancienne adhésion ; `null` sans adhésion.
  - `locks.test.ts` : `advisoryXactLock(prismaMock, 'shop-create:u1')` appelle `$executeRaw` une fois ; le SQL contient `pg_advisory_xact_lock(hashtext(` et la valeur liée est `'shop-create:u1'`.

- [ ] **Step 2 : Lancer.** `npx vitest run src/lib/server/tamani/quota.test.ts src/lib/server/tamani/shop.test.ts src/lib/server/tamani/locks.test.ts` → FAIL.

- [ ] **Step 3 : Implémenter** les trois modules.

- [ ] **Step 4 : Relancer.** → PASS.

- [ ] **Step 5 : Barrière et commit.** `feat(tamani): add quota, shop lookup and advisory lock helpers`.

---

### Task 5 : API boutique et zones

**Files:**
- Create: `frontend/src/lib/server/tamani/inputs.ts` (schémas boutique et zone), `serializers.ts` (`toShop`, `toZone`)
- Create: `frontend/src/app/api/shops/route.ts` (POST), `shops/me/route.ts` (GET), `shops/[orgId]/route.ts` (GET, PATCH), `shops/[orgId]/zones/route.ts` (GET, POST), `shops/[orgId]/zones/[zoneId]/route.ts` (PATCH, DELETE)
- Create: `frontend/src/test-utils/shop-fixtures.ts`
- Test: `frontend/src/app/api/shops/route.test.ts` (POST et `/me`), `shops/[orgId]/route.test.ts`, `shops/[orgId]/zones/route.test.ts`

**Interfaces:**
- Consumes : `normalizePhone`, `shopCountry`, `tamaniError`, `isUniqueViolation`, `jsonOk`, `readJson`, `validationFailed` (Tâche 3) ; `effectivePlan` (Tâche 3) ; `getShopForUser`, `advisoryXactLock` (Tâche 4) ; `slugify`, `ensureUniqueSlug` de `@/lib/server/slug` ; `requireAuth`, `requireOrgRole` du kit.
- Produces :
  - `toShop(org, subscription, now)` → `{ id, slug, name, whatsappPhone, country, currency, logoUrl, coefConsumer, coefReseller, plan: { id: PlanId, inGrace: boolean, currentPeriodEnd: string | null } }`.
  - `toZone(z)` → `{ id, name, sortOrder }`.
  - Réponses : `POST /api/shops` → 201 `{ shop }` ; `GET /api/shops/me` → `{ shop, role }` ou 404 `SHOP_NOT_FOUND` ; `GET|PATCH /api/shops/[orgId]` → `{ shop }` ; `GET zones` → `{ items }` ; `POST zones` → 201 `{ zone }` ; `PATCH zone` → `{ zone }` ; `DELETE zone` → `{ deleted: true }`.
  - `shop-fixtures.ts` (tests) : `signIn(user?)` (vrai jeton `createAccessToken` posé dans le magasin de cookies simulé + `prismaMock.user.findUnique`), `asMember(organizationId, role = 'OWNER')`, `asNonMember()`, `apiRequest(url, { method, body, csrf = true })` (en-tête `x-csrf-token` + cookie `app-csrf`), `routeParams(p)` → `{ params: Promise.resolve(p) }`, `runTransactionsInline()`. Le vrai `requireOrgRole` tourne : rien de `@/lib/server/middleware` n'est simulé.

Choix fixés :
- Corps `POST /api/shops` : `name` (1–60, `trim`), `whatsappPhone` (chaîne), `country` (ISO-2 majuscules, `isSupportedCountry`, défaut `'SN'`), `logoUrl` (Cloudinary, facultatif). Corps `PATCH` : les mêmes plus `coefConsumer` et `coefReseller` (nombres dans [0, 1]), tous facultatifs, au moins un ; `logoUrl: null` efface. Le slug ne change jamais après la création (`?ref=` en dépend).
- `POST /api/shops` : `normalizePhone` avant toute écriture (`400 INVALID_PHONE`) ; puis `ensureUniqueSlug(slugify(name, { maxLength: 48 }) || 'boutique', create, { isCollision: (e) => isUniqueViolation(e, 'slug') })` où `create(slug)` = `prisma.$transaction(async (tx) => { advisoryXactLock(tx, 'shop-create:' + userId); si getShopForUser(tx, userId) → lever ShopAlreadyExists; tx.organization.create({ data: { slug, name, ownerId, whatsappPhone, country, currency: 'XOF', logoUrl, members: { create: { userId, role: 'OWNER' } }, subscription: { create: { plan: 'FREE' } } }, include: { subscription: true } }) })` ; `ShopAlreadyExists` → `409 SHOP_ALREADY_EXISTS`.
- Zones : `name` 1–60 (`trim`), `sortOrder` entier ≥ 0 (défaut 0) ; tri `[{ sortOrder: 'asc' }, { name: 'asc' }]` ; doublon (P2002) → `409 ZONE_ALREADY_EXISTS` ; zone hors boutique → `404 ZONE_NOT_FOUND`. `DELETE` = `deleteMany({ where: { id, organizationId } })`, compte 0 → 404.

- [ ] **Step 1 : Écrire `shop-fixtures.ts`** puis les tests qui échouent (chaque fichier : `prismaMock` en premier import, `mockNextCookies()`, `__cookieStore.clear()` dans `beforeEach`).
  - `shops/route.test.ts` : `POST /api/shops creates the shop, its OWNER member and a FREE subscription in one transaction` (corps `{ name: 'Chez Awa', whatsappPhone: '77 123 45 67' }` → 201, `organization.create` reçoit `slug: 'chez-awa'`, `whatsappPhone: '+221771234567'`, `country: 'SN'`, `currency: 'XOF'`, `members.create { userId, role: 'OWNER' }`, `subscription.create { plan: 'FREE' }` ; `body.shop.plan.id === 'FREE'`) ; `returns 409 SHOP_ALREADY_EXISTS when the user already has a shop` ; **`re-checks membership inside the locked transaction`** (`$executeRaw` appelé avant `organizationMember.findFirst`, comparé par `mock.invocationCallOrder`) ; **`retries the slug when another shop has the same name`** (premier `organization.create` rejeté par P2002 `target: ['slug']` → second appel avec `slug: 'chez-awa-2'`, 201) ; `returns 400 INVALID_PHONE for a malformed WhatsApp number` (aucun `$transaction`) ; `returns 403 without a CSRF token` ; `returns 401 when signed out` ; `GET /api/shops/me returns the shop and the role` ; `GET /api/shops/me returns 404 SHOP_NOT_FOUND without a shop`.
  - `shops/[orgId]/route.test.ts` : `GET returns the shop to a member` ; `GET returns 404 to a non-member` ; `PATCH updates coefficients within [0, 1]` (0 et 1 acceptés) ; `PATCH rejects coefficients outside [0, 1]` (1,2 et −0,1 → 400, aucun `update`) ; `PATCH requires ADMIN` (MEMBER → 403 `ORG_ROLE_INSUFFICIENT`) ; `PATCH normalizes a new WhatsApp number` ; `PATCH returns 400 INVALID_PHONE` ; `PATCH rejects an empty body` ; `PATCH returns 403 without a CSRF token`.
  - `shops/[orgId]/zones/route.test.ts` : `GET lists zones by sortOrder then name` (`where: { organizationId }`) ; `POST creates a zone` (201) ; `POST returns 409 ZONE_ALREADY_EXISTS on a duplicate name` ; `POST requires ADMIN` ; `PATCH returns 404 ZONE_NOT_FOUND for a zone of another shop` (`findFirst` reçoit `{ id: 'zone_x', organizationId: 'org_1' }`) ; `DELETE deletes within the shop only` (`deleteMany` reçoit `{ id, organizationId }` ; compte 0 → 404).

- [ ] **Step 2 : Lancer.** `npx vitest run src/app/api/shops` → FAIL (routes absentes).

- [ ] **Step 3 : Implémenter** `inputs.ts`, `serializers.ts` et les cinq routes.

- [ ] **Step 4 : Relancer.** → PASS. Puis `npx vitest run src/lib/server/observability/runtime-enforcement.test.ts` → PASS (les nouvelles routes déclarent `runtime`).

- [ ] **Step 5 : Barrière et commit.** `feat(api): add shop and delivery zone routes`.

---

### Task 6 : API produits

**Files:**
- Modify: `frontend/src/lib/server/tamani/inputs.ts` (schémas produit), `serializers.ts` (`toShopProduct`, `toPublicProduct`)
- Create: `frontend/src/app/api/shops/[orgId]/products/route.ts` (GET, POST), `products/[productId]/route.ts` (GET, PATCH, DELETE)
- Test: `frontend/src/app/api/shops/[orgId]/products/route.test.ts`, `frontend/src/lib/server/tamani/serializers.test.ts`

**Interfaces:**
- Consumes : Tâches 3 à 5 (`shop-fixtures`, `jsonOk`, `tamaniError`, `activeCampaignWhere`) ; `clampLimit`, `cursorWhere`, `buildPage`, `decodeCursor` de `@/lib/server/pagination/paginate`.
- Produces :
  - `toShopProduct(p)` → `{ id, name, description, unitLabel, unitPrice, wholesalePrice, wholesaleMinQty, costPrice, photos: string[], optionLabel, options, archivedAt: string | null, createdAt: string }`.
  - `toPublicProduct(p)` → liste blanche `{ id, name, description, unitLabel, unitPrice, wholesalePrice, wholesaleMinQty, photos, optionLabel, options }`. Le lot 5 l'utilise dans `getPublicCampaign`.
  - `checkProductRules(p: { unitPrice; wholesalePrice; wholesaleMinQty; optionLabel; options }): string | null` dans `inputs.ts` (message d'erreur ou `null`), appliquée à la création et au produit **fusionné** d'un `PATCH`.
  - Réponses : `GET` → `{ items, nextCursor }` ; `POST` → 201 `{ product }` ; `GET [productId]` → `{ product }` ; `PATCH` → `{ product }` ; `DELETE` → `{ deleted: true }` ou `{ archived: true, product }`.

Choix fixés :
- Corps : `name` 1–80 ; `description` ≤ 1 000 ou `null` ; `unitLabel` 1–30, défaut `'pièce'` ; `unitPrice` entier 1–100 000 000 ; `wholesalePrice`, `costPrice` mêmes bornes ou `null` ; `wholesaleMinQty` entier 2–100 000 ou `null` ; `photos` 0–6 URL Cloudinary ; `optionLabel` 1–30 ou `null` ; `options` 0–12 chaînes 1–30, sans doublon.
- Règles (`checkProductRules`) : `wholesalePrice` et `wholesaleMinQty` vont ensemble ; `wholesalePrice < unitPrice` ; `optionLabel` et `options` non vide vont ensemble.
- Liste : `where: { organizationId, archivedAt: null, ...cursorWhere(cursor) }` (`?archived=1` retire le filtre `archivedAt`), `orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]`, `take: limit + 1`.
- `DELETE` (rôle `ADMIN`) : une campagne `activeCampaignWhere(now)` du produit → `409 PRODUCT_IN_USE` ; sinon au moins une campagne → `update({ archivedAt: now })` ; sinon `deleteMany({ where: { id, organizationId } })`.

- [ ] **Step 1 : Écrire les tests qui échouent.**
  - `serializers.test.ts` : **`toPublicProduct never exposes costPrice`** (les clés valent exactement la liste blanche, triée) ; `toShopProduct keeps costPrice for the shop`.
  - `products/route.test.ts` : `POST creates a product with integer prices` (201, `product.create` reçoit `organizationId: 'org_1'` de l'URL, jamais du corps) ; **`POST rejects decimal, string, zero and negative prices`** (`it.each` sur `7500.5`, `'7500'`, `'7 500'`, `0`, `-1` → 400, aucun `create`) ; `POST requires wholesaleMinQty with wholesalePrice and the reverse` ; `POST rejects a wholesale price at or above the unit price` ; `POST rejects options without an option label` ; `POST rejects photo URLs outside Cloudinary` ; `GET lists non-archived products with a cursor` (`where` et `take: 21`, `nextCursor` non nul avec 21 lignes) ; `GET ?archived=1 includes archived products` ; **`GET product of another shop returns 404 PRODUCT_NOT_FOUND`** (`findFirst` reçoit `{ id, organizationId: 'org_1' }`) ; `PATCH validates the merged product` (existant avec gros 6 000 dès 12, `{ wholesaleMinQty: null }` → 400) ; `PATCH returns 404 for a product of another shop` ; `DELETE hard-deletes a product without campaigns` ; `DELETE archives a product that has campaigns` ; `DELETE returns 409 PRODUCT_IN_USE while a campaign is active` ; `DELETE requires ADMIN`.

- [ ] **Step 2 : Lancer.** `npx vitest run "src/app/api/shops/[orgId]/products" src/lib/server/tamani/serializers.test.ts` → FAIL.

- [ ] **Step 3 : Implémenter** les schémas, les sérialiseurs et les deux routes.

- [ ] **Step 4 : Relancer.** → PASS.

- [ ] **Step 5 : Barrière et commit.** `feat(api): add product routes with archive-on-delete`.

---

### Task 7 : API campagnes et liens, documentation et validation du lot

**Files:**
- Modify: `frontend/src/lib/server/tamani/inputs.ts` (schémas campagne et lien), `serializers.ts` (`toCampaign`, `toLink`, `shareUrl`), `serializers.test.ts`
- Create: `frontend/src/app/api/shops/[orgId]/campaigns/route.ts` (GET, POST), `campaigns/[campaignId]/route.ts` (GET, PATCH), `campaigns/[campaignId]/links/route.ts` (GET, POST)
- Modify: `CLAUDE.md` (section « Tamani backend (lot 3) »)
- Test: `frontend/src/app/api/shops/[orgId]/campaigns/route.test.ts`

**Interfaces:**
- Consumes : tout ce qui précède ; `DEFAULT_SHARE_TEMPLATE`, `renderShareMessage`, `formatPriceLine`, `formatAvailability` (Tâche 2) ; `withUniqueCode`, `generateShortCode`, statut de campagne (Tâche 3) ; `advisoryXactLock` (Tâche 4).
- Produces :
  - `shareUrl(code)` → `${APP_URL sans « / » final}/c/${code}` (`process.env.APP_URL`, repli `http://localhost:3000`).
  - `toLink(l)` → `{ id, code, label, isDefault, openCount, url }`.
  - `toCampaign(c, now)` (campagne avec `product` et `links`) → `{ id, title, productId, product: { id, name, unitLabel, unitPrice, wholesalePrice, wholesaleMinQty, photos }, availability, availableAt, stockQuantity, plannedQuantity, showStock, endsAt, deliveryEnabled, showLiveCounter, shareTemplate, status /* effectif */, closedAt, arrivedAt, createdAt, defaultLink: Link | null, shareMessage }` ; `shareMessage = renderShareMessage(shareTemplate, { produit: product.name, prix: formatPriceLine(product), disponibilite: formatAvailability(c, now), lien: defaultLink.url })`.
  - Réponses : `GET campaigns` → `{ items, nextCursor }` (`?status=` filtre par `effectiveStatusWhere`) ; `POST` → 201 `{ campaign }` ; `GET [campaignId]` → `{ campaign, links }` ; `PATCH` → `{ campaign }` ; `GET links` → `{ items }` (défaut d'abord, puis par date) ; `POST links` → 201 `{ link }`.

Choix fixés :
- Corps `POST` : `productId` ; `title` 1–80 (défaut : nom du produit) ; `availability` `IN_STOCK | INCOMING` ; `availableAt` ISO ou `null` ; `stockQuantity` entier ≥ 0 ou `null` ; `plannedQuantity` entier ≥ 1 ou `null` ; `showStock`, `deliveryEnabled`, `showLiveCounter` booléens ; `endsAt` ISO strictement futur ou `null` ; `shareTemplate` 1–1 000 (défaut `DEFAULT_SHARE_TEMPLATE`) ; `status` `DRAFT | ACTIVE` (défaut `ACTIVE`). `PATCH` : les mêmes champs sauf `productId`, tous facultatifs, `status` parmi les quatre.
- Produit : `product.findFirst({ where: { id: productId, organizationId, archivedAt: null } })`, sinon `404 PRODUCT_NOT_FOUND`.
- Création : `withUniqueCode((code) => prisma.$transaction(async (tx) => { si ACTIVE : advisoryXactLock(tx, 'campaign-activate:' + orgId) puis contrôle de limite ; tx.campaign.create({ data: { …, links: { create: { code, label: 'Lien principal', isDefault: true } } }, include: { product: true, links: true } }) }))`. Le nouvel essai enveloppe toute la transaction, car une P2002 annule la transaction Postgres en cours.
- Contrôle de limite : `max = PLANS[effectivePlan(abonnement, now).plan].maxActiveCampaigns` ; si `max !== null` et `campaign.count({ where: { organizationId, ...activeCampaignWhere(now), id: { not: courante } } }) >= max` → `409 CAMPAIGN_LIMIT_REACHED`.
- `PATCH` : `before = effectiveStatus(existante)`. Si `status` est fourni et différent de `before` sans `canTransitionCampaign(before, status)` → `409 INVALID_CAMPAIGN_TRANSITION`. Passage en `CLOSED` → `closedAt = now` s'il est vide ; en `ARRIVED` → `arrivedAt = now` s'il est vide ; en `ACTIVE` → `closedAt = null`. `after = effectiveStatus(fusion)` : `status: 'ACTIVE'` demandé mais `after === 'CLOSED'` (date de fin passée) → 400 ; `after === 'ACTIVE' && before !== 'ACTIVE'` → contrôle de limite sous verrou, dans la même transaction que l'`update`.
- Liens : `label` 1–60 ; `PLANS[plan].features.sourceLinks` faux → `403 PLAN_FEATURE_LOCKED` ; création par `withUniqueCode((code) => prisma.campaignLink.create(…))`. Campagne hors boutique → `404 CAMPAIGN_NOT_FOUND` sur les trois routes.

- [ ] **Step 1 : Écrire les tests qui échouent.**
  - `serializers.test.ts` (ajouts) : `shareUrl strips the trailing slash of APP_URL` ; `toCampaign renders the share message with the default link` (le message contient `'*Marmites inox 5 L*'`, `'7 500 FCFA (gros : 6 000 FCFA dès 12)'` et `'/c/k3P9xQa'`) ; `toCampaign reports the effective status` (ACTIVE expirée → `'CLOSED'`).
  - `campaigns/route.test.ts` : `POST creates an ACTIVE campaign with a default link and the default share template` (`shareTemplate === DEFAULT_SHARE_TEMPLATE`, `links.create` avec un code conforme à `SHORT_CODE_REGEX`, `label: 'Lien principal'`, `isDefault: true` ; 201 ; `defaultLink.url` se termine par `/c/<code>`) ; `POST retries the link code on a collision` (premier `$transaction` rejeté par P2002 `target: ['code']`) ; `POST returns 409 CAMPAIGN_LIMIT_REACHED for a 4th active campaign on FREE` (`count` → 3, aucun `create`) ; `POST lets a PRO shop activate a 4th campaign` ; `POST counts only effectively active campaigns` (le `where` du `count` contient `activeCampaignWhere(now)`) ; `POST as DRAFT skips the limit` (ni verrou ni `count`) ; **`POST with a productId from another shop returns 404 PRODUCT_NOT_FOUND`** ; `POST rejects an endsAt in the past` ; `GET lists campaigns with their effective status` ; `GET ?status=CLOSED filters with effectiveStatusWhere` ; `GET campaign of another shop returns 404 CAMPAIGN_NOT_FOUND` ; `PATCH closes a campaign and stamps closedAt` ; `PATCH returns 409 INVALID_CAMPAIGN_TRANSITION for DRAFT to ARRIVED` ; `PATCH marks a closed campaign ARRIVED without the limit check` ; **`PATCH reopening a closed campaign at the FREE limit returns 409 CAMPAIGN_LIMIT_REACHED`** ; **`PATCH pushing endsAt forward on an expired campaign counts as reopening`** ; `PATCH reopening with a past endsAt returns 400` ; `POST links returns 403 PLAN_FEATURE_LOCKED on FREE` ; `POST links creates a source link on PRO` (201, `isDefault: false`, `url`) ; `GET links lists the default link first` ; `links routes return 404 CAMPAIGN_NOT_FOUND for another shop's campaign`.

- [ ] **Step 2 : Lancer.** `npx vitest run "src/app/api/shops/[orgId]/campaigns" src/lib/server/tamani/serializers.test.ts` → FAIL.

- [ ] **Step 3 : Implémenter** les schémas, les sérialiseurs et les trois routes.

- [ ] **Step 4 : Relancer.** → PASS.

- [ ] **Step 5 : Documenter dans `CLAUDE.md`** une section « Tamani backend (lot 3) » : où vivent les modules (`lib/tamani/` pur et partagé, `lib/server/tamani/`), la règle de cloisonnement (`where: { id, organizationId }`), la table des rôles par route, `tamaniError` et `TAMANI_ERRORS`, les sérialiseurs comme seule sortie (`toPublicProduct` pour le public), le verrou `advisoryXactLock` et ses deux clés, `shop-fixtures.ts` pour tester avec le vrai `requireOrgRole`, et la commande `npx vitest run` pour un fichier. Puis `npx vitest run src/lib/server/observability` → PASS (les gardes-fous de forme du CLAUDE.md restent verts).

- [ ] **Step 6 : Barrière et commit.** `feat(api): add campaign and share link routes`.

- [ ] **Step 7 : Validation du lot.** `pnpm build` → succès, les nouvelles routes listées en `ƒ` (dynamiques). Puis serveur sur le port 3001 (`APP_URL=http://localhost:3001 pnpm exec next dev --port 3001 --turbopack` depuis `frontend/`) et `SMOKE_BASE_URL=http://localhost:3001 pnpm smoke:auth` → PASS. Arrêter le serveur (par son PID, après vérification de sa ligne de commande).

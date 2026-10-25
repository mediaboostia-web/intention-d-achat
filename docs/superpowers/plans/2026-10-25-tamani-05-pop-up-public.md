# Tamani lot 5 — Pop-up public et notifications : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Le lien d'une campagne, posté sur WhatsApp ou un réseau social, s'affiche avec la photo du produit, ouvre le pop-up où le client répond en quelques touches, et le grossiste reçoit une notification sur son téléphone.

**Architecture:** Une page serveur `/c/[code]` lit la campagne par une liste blanche (`getPublicCampaign`) et monte un petit client à réducteur pur (`popupReducer`). Chaque étape est envoyée à `POST /api/public/responses`, sans CSRF, avec un jeton signé et une limite par IP et par campagne. À la première complétion, `after()` écrit les notifications de la cloche et envoie un Web Push (VAPID) aux membres de la boutique ; l'espace grossiste devient une PWA installable.

**Tech Stack:** Next.js 16 (App Router, `after`, `generateMetadata`, `manifest.ts`), React 19, Prisma 5 + Neon, Upstash Redis, `jose`, `zod` 4, `web-push` 3, Vitest.

**Spec:** [docs/superpowers/specs/2026-10-24-tamani-design.md](../specs/2026-10-24-tamani-design.md) §5.3, §6.2, §6.5, §6.6, §6.9, et [docs/superpowers/specs/2026-10-25-tamani-retours-porteur.md](../specs/2026-10-25-tamani-retours-porteur.md) §1 et §2. Contrats : [roadmap](2026-10-24-tamani-roadmap.md) §Contrats et §Lot 5.

## Global Constraints

- Toutes les contraintes de la roadmap §Global Constraints s'appliquent (runtime `nodejs`, `withRequestContext`, montants entiers, codes d'erreur stables, fichiers protégés intouchés, barrière avant chaque commit).
- `/api/public/*` : **pas** de `verifyCsrf` ; jeton dans l'en-tête `x-response-token` ; `enforcePublicRateLimit` sur chaque route ; champ piège `website`.
- Limite : **30 écritures par 10 minutes, par IP et par campagne**.
- Vues : déduplication par appareil et par jour, clé Redis `tamani:view:{linkId}:{deviceId}:{yyyymmdd}`, durée 48 h.
- `suspicious` à partir de **3** numéros différents sur un même appareil et une même campagne.
- Jeton de réponse : HS256, `aud: 'tamani:response'`, valable **90 jours**.
- Pop-up : JavaScript de la route ≤ **60 Ko compressés**, aucune librairie d'animation (`no-motion-in-popup.test.ts`), photos en `f_auto,q_auto,w_600`.
- Texte exact sous le champ numéro : « Ton numéro est partagé uniquement avec {Boutique} pour te recontacter au sujet de ce produit. »
- Remerciement : « Merci {prénom} ! {Boutique} te préviendra. », bouton « Modifier ma réponse », et en FREE « Propulsé par Tamani » vers `/?ref={slug}`.
- Notifications : titre « Nouvelle réponse · {titre de la campagne} » ; **jamais** de prénom ni de numéro ; `tag` = campagne ; un clic ouvre `/app/campagnes/{id}` ; seules les réponses **complètes** notifient ; un abonnement push en 404 ou 410 est supprimé.
- Variables : `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:`). Sans elles, le push est inerte et la cloche marche.
- Jamais de numéro ni de prénom de répondant dans `log.*` ou Sentry : on journalise `responseId`.
- `.env.local` du porteur : écrit par script seulement, aucune valeur affichée ; relire les noms et longueurs avant de redémarrer le serveur.

## Review Focus

1. **Le même numéro répond depuis deux téléphones** : la réponse existante reçoit les nouvelles réponses, la seconde est supprimée, une seule compte. → Task 2, `upsertResponse merges a second device into the existing respondent response`.
2. **Le lien circule après la fin de la campagne** (`endsAt` passé, `CLOSED`, produit archivé) : le pop-up dit « Cette campagne est terminée » et l'API répond `409 CAMPAIGN_CLOSED` sans rien écrire. → Task 1, `a CLOSED campaign gives accepting: false` ; Task 2, `rejects writes when campaign effective status is CLOSED`.
3. **Le quota du mois est atteint** : le client voit un succès normal, la réponse est `locked`, et la notification ne dévoile pas son contenu. → Task 2, `locks completion when monthly quota reached` ; Task 5, `a locked response notifies without its content`.
4. **`localStorage` indisponible** (navigation privée, navigateur intégré de WhatsApp) : le pop-up marche, sans mémoire. → Task 3, `popupReducer runs without memory` et `safeStorage returns null when storage throws`.
5. **La dernière étape part deux fois** (double touche, réseau qui renvoie) : une seule réponse, une seule notification par membre. → Task 2, `retries once on a unique conflict` ; Task 5, `a repeated completion notifies once`.

---

## Rulings déjà pris en écrivant ce plan (à reporter dans la roadmap, Task 7)

- **Clé du jeton de réponse dérivée** de `JWT_SECRET_BYTES` (HMAC-SHA256 avec l'étiquette `tamani:response-token`), au lieu de la clé brute : `verifyToken` d'`auth.ts` (protégé) ne vérifie pas l'audience, donc un jeton signé avec la même clé passerait pour un jeton d'accès.
- **Aperçu sans `opengraph-image.tsx`** : `og:image` est la photo Cloudinary recadrée en JPEG 1200 × 630 (`c_fill,g_auto,w_1200,h_630,f_jpg,q_auto`), et l'image de marque `/brand/og-default.png` sans photo. WhatsApp abandonne les grandes images (au-delà d'environ 300 Ko), ce qu'un PNG composé avec une photo dépasse souvent. Le nom, le prix et la boutique vont dans le titre et la description, que WhatsApp affiche sous l'image.
- **Migration `7_push_subscriptions`** ; celle des commandes du lot 7 devient `8_sale_orders`.
- **Nouveau code d'erreur `PUSH_NOT_CONFIGURED`** (503).
- **Limite sans Redis** : repli sur `MemoryRateLimitStore` (par instance), pas d'échec fermé : la réponse d'un client vaut plus qu'une limite parfaite, et Upstash est configuré en production.
- **Compteur « X intéressés »** affiché à partir de 3, pour ne jamais montrer « 0 personne ».
- **Corps de la notification « oui »** au neutre : « Quelqu'un en veut 3 pièces (pour son usage). 12 intéressés au total. » ou « (pour revendre) ».

---

### Task 1: Lectures publiques, jeton, limites et images

**Files:**
- Create: `frontend/src/lib/tamani/cloudinary-url.ts`, test `cloudinary-url.test.ts`
- Create: `frontend/src/lib/server/tamani/response-token.ts`, test `response-token.test.ts`
- Create: `frontend/src/lib/server/tamani/public-campaign.ts`, test `public-campaign.test.ts`
- Create: `frontend/src/lib/server/tamani/public-limits.ts`, test `public-limits.test.ts`

**Interfaces:**
- Consumes: `toPublicProduct`, `effectiveStatus`, `isAcceptingResponses`, `effectivePlan`, `PLANS`, `formatAvailability`, `TIMING_OPTIONS`, `SHOP_COUNTRIES`, `SHORT_CODE_REGEX`, `JWT_SECRET_BYTES`, `redis`, `RedisRateLimitStore`, `MemoryRateLimitStore`, `tamaniError`.
- Produces:
  - `cloudinaryVariant(url: string, transformation: string): string` ; `POPUP_PHOTO = 'f_auto,q_auto,w_600'` ; `OG_PHOTO = 'c_fill,g_auto,w_1200,h_630,f_jpg,q_auto'`.
  - `signResponseToken(p: { responseId: string; deviceId: string }): Promise<string>` ; `verifyResponseToken(token: string): Promise<{ responseId: string; deviceId: string } | null>`.
  - `interface PublicCampaign { code; linkId; campaignId; title; status: CampaignStatus; accepting: boolean; availability: Availability; availabilityText: string; timingOptions: readonly Timing[]; deliveryEnabled: boolean; zones: Array<{ id: string; name: string }>; interestedCount: number | null; stockQuantity: number | null; product: ReturnType<typeof toPublicProduct>; shop: { name: string; slug: string; logoUrl: string | null; dialCode: string }; poweredByBadge: boolean }`.
  - `getPublicCampaign(db: Db, code: string, now: Date): Promise<PublicCampaign | null>`.
  - `enforcePublicRateLimit(req: NextRequest, campaignId: string): Promise<NextResponse | null>`.
  - `isFirstViewToday(linkId: string, deviceId: string, now: Date): Promise<boolean>`.
  - `recordDeviceNumber(campaignId: string, deviceId: string, phoneE164: string): Promise<number>` (nombre de numéros distincts).

- [ ] **Step 1: Write the failing tests**

`cloudinary-url.test.ts` :
```ts
it('inserts the transformation after /image/upload/', () => {
  expect(cloudinaryVariant('https://res.cloudinary.com/demo/image/upload/v17/p/a.jpg', POPUP_PHOTO))
    .toBe('https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_600/v17/p/a.jpg');
});
it('leaves a non-Cloudinary URL unchanged', () => {
  expect(cloudinaryVariant('/brand/og-default.png', OG_PHOTO)).toBe('/brand/og-default.png');
});
```

`response-token.test.ts` : `round-trips responseId and deviceId` ; `rejects a tampered token` (dernier caractère changé → `null`) ; `expires after 90 days` (`vi.setSystemTime` à +91 jours → `null`) ; `a response token is never accepted as an access token` (`expect(await verifyToken(await signResponseToken(p))).toBeNull()`, `verifyToken` importé d'`@/lib/server/auth`).

`public-campaign.test.ts` (avec `prismaMock`, une campagne `ACTIVE` d'une boutique dont `whatsappPhone = '+221770000099'`, un produit `costPrice: 4100`, `plannedQuantity: 777`) :
- `never exposes whatsappPhone, costPrice, plannedQuantity or respondents` : `JSON.stringify(result)` ne contient ni `'+221770000099'`, ni `4100`, ni `777`, et `Object.keys(result)` est exactement la liste de `PublicCampaign`.
- `a CLOSED campaign gives accepting: false` : `endsAt` d'hier → `status: 'CLOSED'`, `accepting: false`.
- `an archived product closes the popup` : `archivedAt` rempli → `accepting: false`.
- `hides the counter and the stock unless the campaign shows them` : `showLiveCounter: false` → `interestedCount: null` et `response.count` non appelé ; `showStock: false` → `stockQuantity: null`.
- `counts complete, interested, non-suspicious responses` : `response.count` appelé avec `{ where: { campaignId, interested: true, completedAt: { not: null }, suspicious: false } }`.
- `poweredByBadge follows the effective plan` : sans abonnement → `true` ; PRO en cours → `false`.
- `returns null for an unknown or malformed code` : `'abc'` → `null` sans requête ; code inconnu → `null`.
- `lists zones only when delivery is offered`.

`public-limits.test.ts`, avec `vi.mock('@/lib/server/redis', () => ({ redis: null }))` pour le repli mémoire, puis un second `describe` avec un faux client Redis :
- `allows 30 writes per 10 minutes per IP and campaign, then 429 RATE_LIMITED` : la 31e requête (en-tête `x-forwarded-for: 41.82.1.1`) renvoie 429, `error: 'RATE_LIMITED'` et `Retry-After` ; une autre IP et une autre campagne passent encore.
- `isFirstViewToday is true once per device and day` : `true`, puis `false`, puis `true` le lendemain.
- `recordDeviceNumber counts distinct numbers per device and campaign` : 1, 1 (même numéro), 2, 3.
- `uses the documented Redis keys` : `redis.set('tamani:view:link_1:dev_1:20261025', '1', { nx: true, ex: 172800 })` ; `sadd` sur `tamani:device-numbers:camp_1:dev_1` avec le SHA-256 hexadécimal du numéro (jamais le numéro en clair), puis `expire` à 90 jours.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/lib/tamani/cloudinary-url.test.ts src/lib/server/tamani/response-token.test.ts src/lib/server/tamani/public-campaign.test.ts src/lib/server/tamani/public-limits.test.ts`
Expected: FAIL, modules introuvables.

- [ ] **Step 3: Implement the four modules**

- `response-token.ts` : clé = `createHmac('sha256', JWT_SECRET_BYTES).update('tamani:response-token').digest()` ; `SignJWT({ rid: responseId, did: deviceId })`, `setAudience('tamani:response')`, `setExpirationTime('90d')` ; `verify` attrape tout et renvoie `null`.
- `public-campaign.ts` : un seul `campaignLink.findUnique({ where: { code }, include: { campaign: { include: { product: true, organization: { include: { subscription: true } } } } } })`, puis les zones (`orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]`) et le compteur seulement quand il le faut. `dialCode` vient de `SHOP_COUNTRIES` (repli `'+221'`).
- `public-limits.ts` : IP = premier élément de `x-forwarded-for`, sinon `x-real-ip`, sinon `'unknown'` ; clé de limite `rl:public:{campaignId}:{ip}` ; stores créés une fois par module ; replis mémoire (`MemoryRateLimitStore`, `Map` avec échéance) quand `redis === null`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: la commande du Step 2. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/tamani/cloudinary-url* frontend/src/lib/server/tamani/response-token* frontend/src/lib/server/tamani/public-campaign* frontend/src/lib/server/tamani/public-limits*
git commit -m "feat(public): read a campaign for the popup, sign response tokens, limit public writes"
```

---

### Task 2: Écrire les réponses — `upsertResponse` et les routes publiques

**Files:**
- Modify: `frontend/src/lib/server/tamani/inputs.ts` (schémas `responseStepSchema`, `viewSchema`)
- Create: `frontend/src/lib/server/tamani/responses.ts`, test `responses.test.ts`
- Create: `frontend/src/app/api/public/responses/route.ts`, test `route.test.ts`
- Create: `frontend/src/app/api/public/views/route.ts`, test `route.test.ts`
- Create: `frontend/src/lib/server/observability/public-routes.test.ts`

**Interfaces:**
- Consumes: Task 1 (`verifyResponseToken`, `signResponseToken`, `enforcePublicRateLimit`, `isFirstViewToday`, `recordDeviceNumber`) ; `normalizePhone`, `shopCountry`, `maskPhone`, `shouldLockNewCompletion`, `isAcceptingResponses`, `TIMING_OPTIONS`, `isUniqueViolation`, `tamaniError`, `jsonOk`, `validationFailed`, `readJson`.
- Produces:
  - `responseStepSchema` : `{ code: SHORT_CODE_REGEX; deviceId: z.uuid(); website?: string ≤ 200; interested?: boolean; notInterestedReason?: NotInterestedReason | null; buyerType?: BuyerType; quantity?: int 1..100000; option?: string 1..60 | null; timing?: Timing; wantsDelivery?: boolean; zoneId?: string | null; firstName?: string 1..40 (trim); phone?: string 6..30 }`, avec `firstName` et `phone` tous deux présents ou tous deux absents. `type ResponseStepInput = z.infer<…>`.
  - `viewSchema` : `{ code; deviceId }`.
  - `class ResponseWriteError extends Error { code: TamaniErrorCode | 'VALIDATION_FAILED'; status: number }`.
  - `upsertResponse(db: Db, input: ResponseStepInput & { token: string | null }, now: Date): Promise<UpsertResult>`, avec `UpsertResult = { responseId: string; token: string; completed: boolean; firstCompletion: boolean; respondent: { firstName: string; phoneE164: string; phoneMasked: string } | null; interestedCount: number | null }`.
  - `POST /api/public/responses` → 200 `UpsertResult` sans `firstCompletion` ; `POST /api/public/views` → 200 `{ ok: true }`.

- [ ] **Step 1: Write the failing tests**

`responses.test.ts` (`prismaMock`, `runTransactionsInline`, `vi.mock` de `./public-limits` pour `recordDeviceNumber`) :
- `creates the response on the first step with the link and the device` : `response.create` reçoit `{ campaignId, organizationId, linkId, deviceId, interested: true }` ; résultat `completed: false`, `respondent: null`.
- `upsertResponse merges a second device into the existing respondent response` : l'appareil B finit avec le numéro de R, qui a déjà la réponse RA (appareil A) → `response.update` sur RA avec les réponses de B, `response.delete` sur la réponse de B, `responseId === RA.id`, et le jeton renvoyé vérifie `{ responseId: RA.id, deviceId: B }`.
- `creates the Respondent at completion and updates lastSeenAt` : `respondent.upsert` avec `where: { organizationId_phoneE164: { organizationId, phoneE164: '+221771234567' } }`, `create: { …, firstSeenAt: now, lastSeenAt: now }`, `update: { firstName: 'Awa', lastSeenAt: now }` ; résultat `respondent.phoneMasked === '77 •• •• 67'`.
- `locks completion when monthly quota reached` : `shouldLockNewCompletion` vrai → `locked: true` à la première complétion, et `completed: true` quand même.
- `a completed response needs its token to change` : réponse trouvée par appareil avec `completedAt` et sans jeton → `ResponseWriteError` 401 `INVALID_RESPONSE_TOKEN` ; jeton d'un autre appareil → 401.
- `marks the response suspicious from the third number on one device` : `recordDeviceNumber` → 3 → `suspicious: true` ; → 2 → reste `false`.
- `a "no" clears the yes-only answers` : `interested: false` → `buyerType`, `quantity`, `option`, `timing`, `wantsDelivery`, `zoneId` à `null`.
- `refuses an option, timing or zone the campaign does not offer` : 400 `VALIDATION_FAILED` pour `option: 'Violet'`, `timing: 'ON_ARRIVAL'` sur une campagne `IN_STOCK`, et un `zoneId` d'une autre boutique.
- `refuses to complete an unfinished yes` : prénom et numéro sans `quantity` → 400.
- `rejects writes when campaign effective status is CLOSED` : `endsAt` passé → 409 `CAMPAIGN_CLOSED`, ni `create` ni `update`.

`app/api/public/responses/route.test.ts` (requêtes construites sans CSRF) :
- `saves a step without a CSRF token` (200).
- `422 INVALID_PHONE`, `401 INVALID_RESPONSE_TOKEN` (en-tête `x-response-token: abc`), `404 CAMPAIGN_NOT_FOUND`, `400 VALIDATION_FAILED` sur un corps invalide.
- `429 RATE_LIMITED after 30 writes from one IP`.
- `ignores a filled honeypot without writing` : `website: 'x'` → 200 `{ completed: false }`, aucune écriture.
- `retries once on a unique conflict` : la première transaction lève une P2002 sur `campaignId,deviceId`, la seconde passe → 200, une seule réponse.
- `never logs the phone or the first name` : espion sur `log`, aucun appel ne contient `'771234567'` ni `'Awa'`.

`app/api/public/views/route.test.ts` : `counts the first view of the day` (`campaignLink.update` avec `{ openCount: { increment: 1 } }`) et `skips a repeated view` (`isFirstViewToday` faux → pas d'update) ; `404` pour un code inconnu.

`public-routes.test.ts` : parcourt `src/app/api/public/**/route.ts` ; chaque fichier contient `export const runtime = 'nodejs'` et `enforcePublicRateLimit(`, et ne contient pas `verifyCsrf`. Il échoue s'il ne trouve aucun fichier.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/lib/server/tamani/responses.test.ts "src/app/api/public" src/lib/server/observability/public-routes.test.ts`
Expected: FAIL, modules introuvables.

- [ ] **Step 3: Implement `upsertResponse`**

L'ordre décide de la fusion ; c'est la seule partie que la signature ne fixe pas :
1. Charger le lien par `code` avec campagne, produit et boutique ; absent → 404 `CAMPAIGN_NOT_FOUND`. Pas `isAcceptingResponses` ou produit archivé → 409 `CAMPAIGN_CLOSED`.
2. Valider `timing ∈ TIMING_OPTIONS[availability]`, `option ∈ product.options`, `zoneId` d'une zone de la boutique avec `deliveryEnabled`, et normaliser le numéro (`normalizePhone(phone, shopCountry(country))`, sinon 422 `INVALID_PHONE`), **avant** toute écriture.
3. Trouver la réponse : avec un jeton, `verifyResponseToken` puis `deviceId` identique et réponse de cette campagne, sinon 401 ; sans jeton, `findUnique({ campaignId_deviceId })`, et 401 si elle est déjà complète.
4. Écrire les champs reçus (`update` ou `create`). Un « non » remet à `null` les champs du « oui » ; `wantsDelivery: false` remet `zoneId` à `null`.
5. Avec prénom et numéro : vérifier la complétude sur la ligne écrite (`interested` connu ; pour un oui, `buyerType`, `quantity`, `timing`, et `wantsDelivery` si la livraison est proposée), sinon 400. Puis `respondent.upsert`. Si une autre réponse de la campagne porte déjà ce répondant, y recopier les champs de réponse et supprimer la ligne courante, qui devient l'autre. Enfin `respondentId`, `completedAt ?? now`, `locked` (calculé à la première complétion seulement) et `suspicious` (`recordDeviceNumber(...) >= 3`, ou déjà vrai).
6. Signer le jeton pour `{ responseId, deviceId: input.deviceId }` ; `interestedCount` comme dans `getPublicCampaign` quand `showLiveCounter`.

- [ ] **Step 4: Implement the two routes**

`responses/route.ts` : contexte de requête → `readJson` + `safeParse` → piège → `campaignLink.findUnique({ where: { code }, select: { campaignId: true } })` (404) → `enforcePublicRateLimit` → `prisma.$transaction((tx) => upsertResponse(tx, { ...input, token }, now))`, rejoué une fois sur `isUniqueViolation` → `ResponseWriteError` traduite en `tamaniError` ou `validationFailed` → `log.info('public response saved', { responseId, completed })`. `views/route.ts` : même entrée, puis `isFirstViewToday` et `openCount` incrémenté.

- [ ] **Step 5: Run the tests to verify they pass**

Run: la commande du Step 2. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/server/tamani/inputs.ts frontend/src/lib/server/tamani/responses* frontend/src/app/api/public frontend/src/lib/server/observability/public-routes.test.ts
git commit -m "feat(public): save popup answers step by step and count link opens"
```

---

### Task 3: Le pop-up `/c/[code]`

**Files:**
- Create: `frontend/src/lib/tamani/popup-machine.ts`, test `popup-machine.test.ts`
- Create: `frontend/src/lib/tamani/device-memory.ts`, test `device-memory.test.ts`
- Create: `frontend/src/app/(public)/c/[code]/page.tsx`, `not-found.tsx`, `popup-sheet.tsx` (client), `popup-client.ts`, test `popup.test.tsx`
- Modify: `frontend/src/lib/server/observability/no-motion-in-popup.test.ts` seulement s'il ne couvre pas déjà les nouveaux fichiers

**Interfaces:**
- Consumes: Task 1 (`PublicCampaign`, `getPublicCampaign`, `cloudinaryVariant`, `POPUP_PHOTO`) ; Task 2 (corps `ResponseStepInput`, réponse `UpsertResult`, en-tête `x-response-token`) ; `BottomSheet`, `ChoiceButton`, `Input`, `PhoneInput`, `Logo` ; `QUANTITY_PRESETS`, `BUYER_TYPE_POPUP_LABELS`, `NOT_INTERESTED_REASON_LABELS`, `TIMING_LABELS`, `formatXof`, `pluralizeUnit`, `errorMessage`.
- Produces:
  - `type PopupStep = 'interest' | 'reason' | 'buyer' | 'quantity' | 'timing' | 'delivery' | 'contact' | 'thanks'`.
  - `interface PopupAnswers { interested: boolean | null; notInterestedReason: NotInterestedReason | null; buyerType: BuyerType | null; quantity: number | null; option: string | null; timing: Timing | null; wantsDelivery: boolean | null; zoneId: string | null }`.
  - `interface PopupState { step: PopupStep; answers: PopupAnswers; remembered: RememberedRespondent | null; deliveryEnabled: boolean }`.
  - `type PopupAction = { type: 'interest'; interested: boolean } | { type: 'reason'; reason: NotInterestedReason | null } | { type: 'buyer'; buyerType: BuyerType } | { type: 'quantity'; quantity: number; option: string | null } | { type: 'timing'; timing: Timing } | { type: 'delivery'; wantsDelivery: boolean; zoneId: string | null } | { type: 'completed'; respondent: RememberedRespondent } | { type: 'edit' } | { type: 'notMe' } | { type: 'back' }`.
  - `initialPopupState(ctx: { deliveryEnabled: boolean; memory: DeviceMemory | null; campaignId: string }): PopupState` (réponse déjà enregistrée sur ce téléphone → `step: 'thanks'`).
  - `popupReducer(state: PopupState, action: PopupAction): PopupState` ; `stepBody(action: PopupAction): Partial<ResponseStepBody>` (les champs à envoyer) ; `progressIndex(step: PopupStep): number` (0 à 4).
  - `interface RememberedRespondent { firstName: string; phoneE164: string; phoneMasked: string }` ; `interface DeviceMemory { deviceId: string; respondent: RememberedRespondent | null; saved: Record<string, { token: string; answers: PopupAnswers; savedAt: string }> }`.
  - `safeStorage(): Storage | null` ; `loadDeviceMemory(storage: Storage | null): DeviceMemory` ; `saveDeviceMemory(storage: Storage | null, memory: DeviceMemory): void` (garde les 20 campagnes les plus récentes) ; `newDeviceId(): string` (UUID v4, `crypto.randomUUID` sinon `getRandomValues`).

- [ ] **Step 1: Write the failing tests**

`popup-machine.test.ts` :
- `the yes path goes buyer, quantity, timing, delivery, contact` (livraison proposée) et `skips delivery when the campaign has none`.
- `the no path goes reason then contact`.
- `back returns to the previous step of the path taken`.
- `edit from thanks restarts at interest with the answers kept`.
- `notMe forgets the remembered respondent on the contact step`.
- `stepBody sends only the step's fields` : `{ type: 'quantity', quantity: 12, option: 'Rouge' }` → `{ quantity: 12, option: 'Rouge' }`.
- `popupReducer runs without memory` : `initialPopupState({ memory: null, … })` donne `step: 'interest'`, `remembered: null`, et tout le chemin oui va jusqu'à `thanks`.
- `opens on thanks when this phone already answered` : `memory.saved[campaignId]` présent → `step: 'thanks'`, réponses reprises.

`device-memory.test.ts` :
- `safeStorage returns null when storage throws` (accès à `localStorage` qui lève, et `setItem` qui lève en navigation privée).
- `loadDeviceMemory creates a device id when storage is empty or corrupt` (JSON invalide → nouvelle mémoire, sans exception).
- `saveDeviceMemory keeps the 20 most recent campaigns`.
- `newDeviceId falls back to getRandomValues` (sans `randomUUID`, résultat conforme à `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/`).

`popup.test.tsx` (rendu statique de `PopupSheet` avec un `PublicCampaign` de test) :
- `shows the consent sentence under the number` : texte exact avec le nom de la boutique.
- `greets a remembered respondent` : « Tu réponds en tant que Awa · 77 •• •• 12 » et le lien « pas toi ? ».
- `says the campaign is over and shows no choice` quand `accepting: false` : « Cette campagne est terminée », aucun bouton `aria-pressed`.
- `links Propulsé par Tamani to /?ref={slug} on the free plan` et le cache quand `poweredByBadge: false`.
- `shows the counter from 3 interested` : 2 → absent ; 64 → « 64 personnes sont déjà intéressées ».
- `shows the stock only when the campaign shows it` : `stockQuantity: 200` → « Plus que 200 pièces » ; `null` → absent.
- `serves the photo at w_600` : `src` contient `f_auto,q_auto,w_600`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/lib/tamani/popup-machine.test.ts src/lib/tamani/device-memory.test.ts "src/app/(public)/c"`
Expected: FAIL, modules introuvables.

- [ ] **Step 3: Implement the machine, the memory and the page**

- `page.tsx` (serveur) : `getPublicCampaign` enveloppé dans `cache()` de React (Task 4 le réutilise) ; `notFound()` si `null` ; fond = photo en `POPUP_PHOTO` floutée en CSS, la même URL que la vignette de la feuille ; `DRAFT` → « Cette campagne n'est pas encore ouverte. » ; `accepting: false` → « Cette campagne est terminée ».
- `not-found.tsx` : « Ce lien ne marche pas » et une phrase qui dit de redemander le lien au vendeur.
- `popup-sheet.tsx` (`'use client'`) : `useReducer(popupReducer, …)` ; chaque touche envoie `stepBody` par `popup-client.ts` (`fetch`, envois mis en file l'un après l'autre, jeton en `x-response-token`) ; la vue part une fois au montage ; le prix de gros (« Prix de gros : 6 000 FCFA dès 12 ») s'affiche quand `buyerType === 'RESELLER'` ; une erreur affiche `errorMessage(code)` sous les choix sans perdre l'étape.
- Pas d'import de `@/lib/api` ni d'une librairie d'animation.

- [ ] **Step 4: Run the tests to verify they pass**

Run: la commande du Step 2, puis `npx vitest run src/lib/server/observability/no-motion-in-popup.test.ts`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/tamani/popup-machine* frontend/src/lib/tamani/device-memory* "frontend/src/app/(public)/c"
git commit -m "feat(popup): answer a campaign in a few taps from the shared link"
```

---

### Task 4: L'aperçu du lien (WhatsApp, Facebook, Telegram, X)

**Files:**
- Create: `frontend/src/lib/tamani/popup-metadata.ts`, test `popup-metadata.test.ts`
- Modify: `frontend/src/app/(public)/c/[code]/page.tsx` (`generateMetadata`)

**Interfaces:**
- Consumes: Task 1 (`PublicCampaign`, `cloudinaryVariant`, `OG_PHOTO`) ; `formatXof`.
- Produces: `popupMetadata(c: PublicCampaign | null, appUrl: string): Metadata`.

- [ ] **Step 1: Write the failing test**

```ts
it('previews the product photo, its name, its price and the shop', () => {
  const m = popupMetadata(campaign, 'https://tamani.app');
  expect(m.title).toBe('Marmites inox 5 L · 7 500 FCFA');
  expect(m.description).toBe('Diallo Import · Arrivage dans 10 jours. Réponds en 5 secondes.');
  expect(m.openGraph).toMatchObject({
    type: 'website', siteName: 'Tamani', locale: 'fr_FR', url: 'https://tamani.app/c/Ab3dE7x',
    images: [{ url: expect.stringContaining('/image/upload/c_fill,g_auto,w_1200,h_630,f_jpg,q_auto/'), width: 1200, height: 630, alt: 'Marmites inox 5 L' }],
  });
  expect(m.twitter).toMatchObject({ card: 'summary_large_image' });
  expect(m.robots).toMatchObject({ index: false, follow: false });
});
it('falls back to the brand image without a photo', () => { /* images[0].url === 'https://tamani.app/brand/og-default.png' */ });
it('names an unknown link without leaking anything', () => { /* popupMetadata(null, …).title === 'Lien introuvable · Tamani', robots noindex */ });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/lib/tamani/popup-metadata.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Step 3: Implement `popupMetadata` and `generateMetadata`**

`generateMetadata({ params })` lit la campagne par la même fonction `cache()` que la page et passe `process.env.APP_URL`.

- [ ] **Step 4: Run the test to verify it passes**

Run: la commande du Step 2. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/tamani/popup-metadata* "frontend/src/app/(public)/c/[code]/page.tsx"
git commit -m "feat(popup): show the product photo, name and price in shared link previews"
```

---

### Task 5: Notifications côté serveur (cloche et Web Push)

**Files:**
- Modify: `frontend/prisma/schema.prisma` (`PushSubscription`, relation sur `User`) ; Create: `frontend/prisma/migrations/7_push_subscriptions/migration.sql`
- Modify: `frontend/package.json` (`web-push`, `@types/web-push`)
- Create: `frontend/src/lib/server/push/web-push.ts`, test `web-push.test.ts`
- Create: `frontend/src/lib/server/tamani/notify-response.ts`, test `notify-response.test.ts`
- Create: `frontend/src/app/api/push/public-key/route.ts`, `frontend/src/app/api/push/subscriptions/route.ts`, tests
- Modify: `frontend/src/app/api/public/responses/route.ts` et son test (`after()`)
- Modify: `frontend/src/lib/server/tamani/errors.ts` et `frontend/src/lib/tamani/api-messages.ts` (`PUSH_NOT_CONFIGURED`)
- Modify: `frontend/.env.example` (`VAPID_*`) ; `frontend/.env.local` par script (clés générées, jamais affichées)

**Interfaces:**
- Consumes: `createNotification`, `requireAuth`, `verifyCsrf`, `pluralizeUnit`, `NOT_INTERESTED_REASON_LABELS`, Task 2 (`UpsertResult.firstCompletion`).
- Produces:
  - `model PushSubscription { id String @id @default(cuid()); userId String; user User @relation(fields: [userId], references: [id], onDelete: Cascade); endpoint String @unique; p256dh String; auth String; createdAt DateTime @default(now()); updatedAt DateTime @updatedAt; @@index([userId]) }`.
  - `pushConfigured(): boolean` ; `vapidPublicKey(): string | null` ; `interface PushPayload { title: string; body: string; url: string; tag: string }` ; `sendPush(sub: { endpoint: string; p256dh: string; auth: string }, payload: PushPayload): Promise<'SENT' | 'GONE' | 'FAILED'>`.
  - `responseNotificationText(r: { campaignTitle: string; unitLabel: string; interested: boolean; buyerType: BuyerType | null; quantity: number | null; reason: NotInterestedReason | null; interestedTotal: number; locked: boolean }): { title: string; body: string }`.
  - `notifyShopOfResponse(db: PrismaClient, responseId: string): Promise<void>` (n'échoue jamais : erreurs journalisées avec `responseId`).
  - `GET /api/push/public-key` → `{ publicKey }` ou 503 `PUSH_NOT_CONFIGURED` ; `POST /api/push/subscriptions` (`{ endpoint: https URL; keys: { p256dh; auth } }`, upsert par `endpoint` vers l'utilisateur courant) et `DELETE /api/push/subscriptions` (`{ endpoint }`, seulement les siens) → `{ ok: true }`.

- [ ] **Step 1: Write the failing tests**

`notify-response.test.ts` :
- `responseNotificationText` : oui → titre `Nouvelle réponse · Marmites inox 5 L`, corps `Quelqu'un en veut 3 pièces (pour son usage). 12 intéressés au total.` ; revendeur → `(pour revendre)` ; 1 intéressé → `1 intéressé au total.` ; non avec raison → `Une personne n'est pas intéressée : trop cher.` ; non sans raison → `Une personne n'est pas intéressée.`
- `a locked response notifies without its content` : `locked: true` → corps `Une nouvelle réponse t'attend. Ton forfait du mois est plein : passe à Pro pour la voir.`, sans quantité.
- `writes one bell notification per shop member` : `createNotification` (mocké) appelé pour chaque `organizationMember` avec `type: 'tamani.response'`, `dedupeKey: 'tamani.response:{responseId}:{userId}'` et `data: { campaignId, responseId, url: '/app/campagnes/{campaignId}' }`.
- `never puts the respondent's name or number in a notification` : la fixture a un répondant `Awa` / `+221771234567` ; aucun argument de `createNotification` ni de `sendPush` ne les contient.
- `a repeated completion notifies once` : `createNotification` renvoie `null` (doublon) → aucun push pour ce membre.
- `pushes with the campaign as tag and drops gone subscriptions` : `sendPush` reçoit `tag: 'campaign:{campaignId}'` ; `'GONE'` → `pushSubscription.deleteMany({ where: { endpoint } })`.
- `skips push when VAPID is not configured` : cloche écrite, `sendPush` non appelé.
- `swallows and logs a failure with the responseId only`.

`web-push.test.ts` (`vi.mock('web-push')`) : `pushConfigured` faux sans l'une des trois variables ; `sendPush` renvoie `'GONE'` sur `statusCode` 404 et 410, `'FAILED'` sur 500, `'SENT'` sinon ; options `{ TTL: 86400, urgency: 'high' }`.

`push/subscriptions/route.test.ts` : 403 sans CSRF ; 401 sans session ; `upserts by endpoint for the signed-in user` ; `refuses a non-https endpoint` (400) ; `DELETE removes only the caller's subscription` (`deleteMany({ where: { endpoint, userId } })`). `push/public-key/route.test.ts` : la clé quand configuré, 503 `PUSH_NOT_CONFIGURED` sinon.

`public/responses/route.test.ts`, ajouts (`vi.mock('next/server')` partiel, `after` capturé) : `notifies the shop after the first completion` (`after` appelé une fois, et la fonction passée appelle `notifyShopOfResponse(prisma, responseId)`) et `does not notify on a step or an edit` (`firstCompletion: false` → `after` non appelé).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/lib/server/tamani/notify-response.test.ts src/lib/server/push "src/app/api/push" "src/app/api/public/responses"`
Expected: FAIL, modules introuvables.

- [ ] **Step 3: Schema, migration, dependency and keys**

Arrêter `next start` et `next dev`. Depuis `frontend/` : `pnpm add web-push` et `pnpm add -D @types/web-push` ; ajouter le modèle ; produire le SQL avec `node --env-file=.env.local node_modules/prisma/build/index.js migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script` (la base est à la migration 6), le relire (une table, un index unique sur `endpoint`, un index sur `userId`, une clé étrangère `ON DELETE CASCADE`) et l'enregistrer dans `migration.sql` ; puis `migrate deploy` et `generate`. Script Node qui appelle `webpush.generateVAPIDKeys()` et ajoute `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` et `VAPID_SUBJECT="mailto:notifications@tamani.app"` à `.env.local` s'ils manquent, sans rien afficher d'autre que les noms et les longueurs.

- [ ] **Step 4: Implement the modules and routes**

- `web-push.ts` : `setVapidDetails` une seule fois, au premier envoi.
- `notify-response.ts` : réponse avec campagne, produit (`unitLabel`) et `notInterestedReason` ; membres par `organizationMember.findMany({ where: { organizationId }, select: { userId: true } })` ; `interestedTotal` = réponses complètes, intéressées, ni verrouillées ni suspectes ; push seulement aux utilisateurs dont la notification vient d'être créée.
- `responses/route.ts` : `if (result.firstCompletion) after(() => notifyShopOfResponse(prisma, result.responseId))`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: la commande du Step 2, puis `npx vitest run src/lib/server/tamani/errors.test.ts src/lib/tamani/api-messages.test.ts src/lib/server/observability`. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/prisma frontend/package.json pnpm-lock.yaml frontend/.env.example frontend/src/lib/server/push frontend/src/lib/server/tamani/notify-response* frontend/src/lib/server/tamani/errors.ts frontend/src/lib/tamani/api-messages.ts frontend/src/app/api/push frontend/src/app/api/public/responses
git commit -m "feat(notifications): tell the shop about each completed answer, in the app and by Web Push"
```

---

### Task 6: Notifications côté grossiste (PWA, activation, cloche)

**Files:**
- Create: `frontend/public/sw.js`, test `frontend/src/lib/server/observability/service-worker.test.ts`
- Create: `frontend/src/app/manifest.ts`, test `manifest.test.ts`
- Create: `frontend/public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` ; `docs/brand/sources/pwa-icon.html` ; Modify: `docs/brand/sources/README.md`, `frontend/src/lib/design/brand-assets.test.ts`
- Create: `frontend/src/lib/tamani/push-state.ts`, test `push-state.test.ts`
- Create: `frontend/src/lib/tamani/relative-time.ts`, test `relative-time.test.ts`
- Create: `frontend/src/components/app/use-push.ts`, `PushCard.tsx`, `NotificationBell.tsx`, test `notifications.test.tsx`
- Modify: `frontend/src/components/app/AppShell.tsx` (en-tête à toutes les largeurs, cloche à droite), `frontend/src/components/ui/icons.tsx` (`bell`), `frontend/src/app/(app)/app/page.tsx` et la page Réglages (carte), `frontend/src/components/app/shell.test.tsx`

**Interfaces:**
- Consumes: Task 5 (`/api/push/public-key`, `/api/push/subscriptions`, notifications `type: 'tamani.response'` avec `data.url`) ; routes du kit `GET /api/notifications?limit=10`, `PATCH /api/notifications` (`{ ids: string[] | 'all' }`), `GET /api/notifications/count` ; `api()` de `@/lib/api`.
- Produces:
  - `type PushCardState = 'hidden' | 'ask' | 'install-first' | 'denied' | 'unsupported'` ; `pushCardState(env: { configured: boolean; supported: boolean; isIos: boolean; standalone: boolean; permission: NotificationPermission; subscribed: boolean }): PushCardState` ; `urlBase64ToUint8Array(base64: string): Uint8Array`.
  - `relativeTime(date: Date, now: Date): string` (« à l'instant », « il y a 5 min », « il y a 2 h », « hier », puis `formatDateFr`).
  - `bellLabel(unread: number): string` (« Notifications », « Notifications, 1 non lue », « Notifications, 3 non lues »).

- [ ] **Step 1: Write the failing tests**

- `push-state.test.ts` : `hidden` si non configuré ou déjà abonné ; `install-first` sur iPhone hors écran d'accueil ; `unsupported` sans `PushManager` ; `denied` ; `ask` sinon ; `urlBase64ToUint8Array` décode une clé base64url de 65 octets.
- `relative-time.test.ts` : les cinq paliers ci-dessus.
- `service-worker.test.ts` : charge `public/sw.js` dans `vm` avec un faux `self` ; un `push` dont les données sont `{ title, body, url, tag }` appelle `showNotification(title, { body, tag, renotify: true, icon: '/icons/icon-192.png', data: { url } })` ; un `notificationclick` ferme la notification et ouvre `url` (ou met au premier plan l'onglet déjà ouvert sur l'app).
- `manifest.test.ts` : `name: 'Tamani'`, `start_url: '/app'`, `display: 'standalone'`, `lang: 'fr'`, couleurs = `colors.bg` et `colors.primary`, icônes 192, 512 et 512 `maskable`.
- `brand-assets.test.ts` : les trois PNG existent aux bonnes dimensions.
- `notifications.test.tsx` (statique) : `PushCard` en `ask` montre « Sois prévenu à chaque réponse » et le bouton « Activer les notifications » ; en `install-first` explique l'écran d'accueil ; en `denied` explique comment autoriser ; en `hidden` ne rend rien. `NotificationBell` a un bouton dont l'`aria-label` vient de `bellLabel`, et pas de pastille à 0.
- `shell.test.tsx` : l'en-tête contient la cloche à toutes les largeurs (pas de `lg:hidden` sur l'en-tête, seulement sur le logo et le nom).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/lib/tamani/push-state.test.ts src/lib/tamani/relative-time.test.ts src/lib/server/observability/service-worker.test.ts src/app/manifest.test.ts src/lib/design/brand-assets.test.ts src/components/app/notifications.test.tsx src/components/app/shell.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Icons**

`pwa-icon.html` reprend `apple-icon.html` ; la variante masquable garde le logo dans les 80 % centraux. Rendu Chrome headless comme dans le README des sources, aux tailles 192, 512 et 512.

- [ ] **Step 4: Implement**

- `sw.js` : pas de gestionnaire `fetch` (pas de cache hors ligne dans ce lot).
- `use-push.ts` : enregistre `/sw.js` (portée `/`) depuis l'espace grossiste seulement ; lit la permission et l'abonnement ; `enable()` = `Notification.requestPermission()` → `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` → `POST /api/push/subscriptions`.
- `PushCard` : textes de la spec des retours §2 ; sur `install-first` : « Sur iPhone, ajoute d'abord Tamani à l'écran d'accueil : bouton Partager, puis « Sur l'écran d'accueil ». Ouvre Tamani depuis l'icône, puis reviens ici. » ; sur `denied` : « Les notifications sont bloquées pour Tamani. Autorise-les dans les réglages du navigateur (le cadenas à côté de l'adresse), puis recharge la page. » ; sur `unsupported` : « Ce navigateur ne reçoit pas les notifications. Ouvre Tamani dans Chrome ou Safari. »
- `NotificationBell` : compte au montage, toutes les 60 s quand la page est visible et au retour sur l'onglet ; panneau des 10 dernières, chacune vers `data.url` et marquée lue au clic ; « Tout marquer comme lu ».

- [ ] **Step 5: Run the tests to verify they pass**

Run: la commande du Step 2, puis `npx vitest run src/lib/server/observability/no-default-palette.test.ts`. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/public docs/brand/sources frontend/src/app/manifest* frontend/src/lib/tamani/push-state* frontend/src/lib/tamani/relative-time* frontend/src/lib/design/brand-assets.test.ts frontend/src/lib/server/observability/service-worker.test.ts frontend/src/components "frontend/src/app/(app)"
git commit -m "feat(app): installable app, notification bell and push activation card"
```

---

### Task 7: Documentation, budget, recette et PR

**Files:**
- Modify: `CLAUDE.md` (section « Tamani public popup (lot 5) »), `docs/superpowers/plans/2026-10-24-tamani-roadmap.md` (rulings ci-dessus dans §Contrats), `docs/superpowers/specs/2026-10-25-tamani-retours-porteur.md` (corps neutre de la notification)

- [ ] **Step 1: Docs**

`CLAUDE.md` : exception CSRF de `/api/public/*` et ce qui la remplace (jeton dérivé, limite, piège, tripwire `public-routes.test.ts`) ; `after()` sans outbox pour les notifications ; `VAPID_*` facultatives ; PWA et service worker enregistrés depuis l'espace grossiste seulement ; aperçu Open Graph par Cloudinary. Roadmap : clé du jeton, aperçu sans `opengraph-image`, migrations `7_push_subscriptions` et `8_sale_orders`, `PUSH_NOT_CONFIGURED`, `notifyShopOfResponse` et la forme d'`UpsertResult`.

- [ ] **Step 2: Gate and build**

Run: `pnpm format && pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: tout passe.

- [ ] **Step 3: Performance budget**

Avec `next start`, charger `/c/{code}` d'une campagne active, additionner la taille gzip de chaque `<script src>` de la page, en séparant les morceaux propres à la route du socle commun de Next.
Expected: morceaux de la route ≤ 60 Ko. Si le total dépasse 60 Ko à cause du socle de Next, consigner un ruling avec les deux chiffres.

- [ ] **Step 4: Recette mobile**

À 320, 390 et 1280 px : toutes les étapes du oui et du non, le remerciement, « Modifier ma réponse », « pas toi ? », le lien terminé, le lien introuvable, et une réponse en navigation privée. Vérifier dans le HTML les balises `og:*`, puis télécharger l'`og:image` : 200, `image/jpeg`, moins de 300 Ko. Dans Chrome sur l'ordinateur : activer les notifications avec le compte démo, répondre depuis un autre profil, et constater la notification (`registration.getNotifications()`) et la cloche. Smoke test d'auth.

- [ ] **Step 5: Final review and PR**

Revue de toute la branche (`review-package`), puis PR vers `plan/04-espace-grossiste` (pile sur la PR #4), avec ce qui reste à tester sur un vrai téléphone après déploiement : l'aperçu WhatsApp et le push Android et iPhone.

```bash
git add CLAUDE.md docs
git commit -m "docs: document the public popup, its CSRF exception and the notifications"
```

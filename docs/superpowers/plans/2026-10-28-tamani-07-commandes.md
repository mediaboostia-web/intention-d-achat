# Tamani lot 7 : Commandes et clients — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** transformer les intentions en commandes réelles (prix figé, statuts, payé, « À livrer par quartier »), apprendre qui achète vraiment (fiabilité, coefficients appris) et finir le carnet de clients (« a commandé », note, anonymisation).

**Architecture :** un modèle `SaleOrder` (migration `9_sale_orders`). Les règles pures vivent dans `lib/server/tamani/orders.ts` et `reliability.ts` ; les requêtes dans `order-queries.ts` ; les vues partagées avec le navigateur dans `lib/tamani/orders-view.ts`. Les routes suivent `shopHandler`. Les écrans suivent le découpage du lot 6 : un chargeur (`…Screen` ou `…Tab`) et une vue dessinée depuis ses props, testée en HTML statique.

**Tech Stack :** Next.js 16, Prisma 5 (Neon), Vitest + `prismaMock`, rendu statique (`@/components/ui/test-html`).

**Spec :** [docs/superpowers/specs/2026-10-24-tamani-design.md](../specs/2026-10-24-tamani-design.md) §5.5.1, §5.5.2, §5.5.3, §6.2, §6.3, §6.4, §6.9 ; [retours du porteur 2](../specs/2026-10-28-tamani-retours-porteur-2.md) §10 ; [feuille de route](2026-10-24-tamani-roadmap.md) « Lot 7 » et ses contrats (`SaleOrder`, `orders.ts`, `reliability.ts`, routes).

## Global Constraints

- **Branche** `plan/07-commandes`, tirée de `plan/06-tableau-de-bord` (la PR du lot 6 + 6b attend l'accord du porteur). Une PR à la fin du lot ; jamais de fusion sans le porteur.
- **Migration** `9_sale_orders` (dossiers triés comme du texte : elle passe après `8c_delivery_place`).
- **`SaleOrder`** : le contrat de la feuille de route, mot pour mot : `organizationId, respondentId, productId, campaignId String?, responseId String? @unique, buyerType, quantity Int, unitPrice Int, totalAmount Int, fulfillment ('DELIVERY'|'PICKUP'), zoneId String?, status @default("TO_CONFIRM") ('TO_CONFIRM'|'CONFIRMED'|'FULFILLED'|'CANCELLED'), paid Boolean @default(false), paidAt DateTime?, notes String?, confirmedAt, fulfilledAt, cancelledAt DateTime?`, `@@index([organizationId, status])`, `@@index([respondentId])`, plus `createdAt`, `updatedAt`.
- **Argent** : entiers FCFA. `totalAmount = unitPrice × quantity`, recalculé à chaque changement de prix ou de quantité.
- **Prix figé** : `orderUnitPrice` à la création (prix de gros si `RESELLER` et `quantity ≥ wholesaleMinQty`, sinon prix unitaire). Prix et quantité modifiables seulement à `TO_CONFIRM` ; sinon `409 INVALID_ORDER_TRANSITION`.
- **Statuts** : `TO_CONFIRM → CONFIRMED | CANCELLED`, `CONFIRMED → FULFILLED | CANCELLED`. `FULFILLED` se lit « Livrée » (`DELIVERY`) ou « Récupérée » (`PICKUP`). Une transition interdite donne `409 INVALID_ORDER_TRANSITION`. Chaque passage date son champ (`confirmedAt`, `fulfilledAt`, `cancelledAt`).
- **Payé** est indépendant du statut : `paid: true` pose `paidAt = now` (s'il était nul), `paid: false` le remet à `null`.
- **Une commande par réponse** : seulement une réponse comptée (complète, non `locked`, non `suspicious`) et « Oui ». Réponse absente, d'une autre boutique ou non comptée : `404 RESPONSE_NOT_FOUND` (nouveau code) ; réponse « Non » : `409 RESPONSE_NOT_INTERESTED` (nouveau code) ; déjà convertie : `409 ORDER_ALREADY_EXISTS` (aussi quand la contrainte unique `P2002` tombe pendant une course).
- **Stock restant** (campagne) = `stockQuantity − Σ quantity` des commandes `CONFIRMED` et `FULFILLED` de la campagne ; un affichage, jamais un blocage. Sans `stockQuantity`, pas de stock restant.
- **Forfaits** : les commandes sont sur tous les forfaits. Le bouton WhatsApp d'une commande et les numéros complets demandent `respondentContacts` (en Gratuit : numéro masqué, bouton vers `/app/plus#forfait` avec le badge Pro). La fiabilité et les coefficients appris demandent `features.reliability`.
- **Fiabilité** d'un client : réponses « Oui » suivies d'une commande `FULFILLED` / réponses « Oui » sur des campagnes terminées (statut effectif `CLOSED` ou `ARRIVED`). `rate = null` sous 2 réponses « Oui » terminées. Texte : « a dit oui 5 fois, a acheté 4 fois · 80 % ».
- **Coefficient appris**, par statut acheteur : Σ quantités des commandes `FULFILLED` / Σ quantités annoncées, sur les réponses « Oui » des campagnes terminées. Il s'applique à partir de **20 réponses « Oui » sur au moins 2 campagnes terminées** ; sinon le coefficient des réglages reste. Borné à [0.1, 1]. Source `LEARNED`.
- **Anonymisation** (`DELETE …/clients/[respondentId]`, rôle `ADMIN`) : `firstName`, `phoneE164`, `notes` à `null`, `anonymizedAt = now`. Le client sort des listes et des exports ; ses réponses et ses commandes restent comptées, sans identité. Irréversible : l'écran demande une confirmation.
- **Note** du client : 0 à 1 000 caractères après `trim`, vide → `null`.
- **Isolation** : `organizationId` dans chaque `where` (`findFirst({ where: { id, organizationId } })`, `updateMany`) ; un id d'une autre boutique donne 404 avec le code de la ressource. Le produit, la campagne et le quartier d'une commande sont vérifiés dans la boutique.
- **Rôles** : commandes `MEMBER` ; note `MEMBER` ; anonymisation `ADMIN`.
- **Suppression d'un produit** : un produit qui a des commandes n'est jamais supprimé ; il est archivé comme un produit à campagnes passées (`onDelete: Restrict` sur `SaleOrder.product`).
- **Vie privée** : jamais de prénom, de numéro, de note ni de lieu dans `log.*`.
- **Fichiers protégés** : ni `lib/api.ts`, ni `auth.ts`, ni les middlewares.
- **Copie** : français, pas de tiret cadratin ni demi-cadratin, `&nbsp;` avant `:` en JSX, couleurs par jetons (`no-default-palette`), montants par `formatPrice(n, 'FCFA')` (`lib/utils.ts`).
- **Barrière** avant chaque commit : `pnpm format && pnpm lint && pnpm typecheck && pnpm test`. En fin de lot : `pnpm build`, puis la recette sur l'app réelle à 390 et 1 280 px (règle du porteur : « toujours tester après avoir codé »).

## Review Focus

1. **Deux clics sur « Transformer en commande »** (double tap, deux onglets) : une seule commande, le second reçoit `409 ORDER_ALREADY_EXISTS`, jamais une 500. → Task 2, test `converting twice gives ORDER_ALREADY_EXISTS, also on P2002`.
2. **Changer le prix d'une commande déjà confirmée** (requête forgée) : refusé `409`, le total ne bouge pas. → Task 3, test `PATCH price after confirmation is refused`.
3. **Le produit d'une commande change de prix après coup** : la commande garde son prix figé. → Task 2, test `a later product price change leaves the order price`.
4. **Une commande manuelle avec un numéro déjà au carnet** (autre format, `77 123 45 12` contre `+221771234512`) : le même client, pas un doublon. → Task 3, test `manual order finds the client by normalized number`.
5. **Un client anonymisé** : absent des listes, des exports et de la recherche ; ses commandes restent dans « À livrer » et les totaux, sans prénom ni numéro. → Task 5, test `anonymize keeps orders and answers counted`.

---

### Task 1 : Le modèle `SaleOrder` et les vues partagées

**Files :**
- Modify `frontend/prisma/schema.prisma` ; create `frontend/prisma/migrations/9_sale_orders/migration.sql`.
- Create `frontend/src/lib/tamani/orders-view.ts` et son test.
- Modify `frontend/src/lib/server/tamani/errors.ts` (`RESPONSE_NOT_FOUND`, `RESPONSE_NOT_INTERESTED`) et `frontend/src/lib/tamani/api-messages.ts` (leurs phrases).
- Test : `schema-tamani.test.ts` (l'ordre des migrations).

**Interfaces :**
- Produces (`orders-view.ts`) :
  - `ORDER_STATUSES = ['TO_CONFIRM','CONFIRMED','FULFILLED','CANCELLED'] as const`, `type OrderStatus`, `type Fulfillment = 'DELIVERY' | 'PICKUP'` ;
  - `orderStatusLabel(status, fulfillment): string` : « À confirmer », « Confirmée », « Livrée » / « Récupérée », « Annulée » ;
  - `interface OrderRow { id; status: OrderStatus; paid: boolean; paidAt: string | null; createdAt: string; quantity; unitPrice; totalAmount; fulfillment; zoneName: string | null; productId; productName; unitLabel; campaignId: string | null; campaignTitle: string | null; responseId: string | null; buyerType: BuyerType; client: { id: string; firstName: string | null; phone: string | null; phoneE164: string | null } }` (le numéro masqué sans `respondentContacts`, `phoneE164` nul alors) ;
  - `interface ToDeliverGroup { zoneId: string | null; zoneName: string | null; orders: OrderRow[]; totals: Array<{ productId; productName; unitLabel; quantity: number }> }` (`zoneId` nul : « Sans quartier », retraits exclus) ;
  - `ORDER_FILTER_PARAMS` : `statut=a-confirmer|confirmees|livrees|annulees`, `campagne`, `produit`, `quartier`, `vue=a-livrer` ;
  - `parseOrderSearch(params): OrderFilters | null` et `orderSearch(f): string`, avec `interface OrderFilters { status: OrderStatus | null; campaignId; productId; zoneId; view: 'list' | 'to-deliver' }` ;
  - `orderWhatsappMessage({ firstName, shopName, productName, unitLabel, quantity, totalAmount, fulfillment, zoneName }): string` : « Bonjour {Prénom}, ta commande de {quantité} {unité au pluriel} de {produit} est confirmée. Total : {montant} FCFA. {« Livraison à {quartier}. » | « Livraison. » | « Retrait à la boutique. »} À bientôt, {boutique}. » ; sans prénom, « Bonjour, ».

- [ ] Test `orders-view.test.ts` : les quatre libellés, dont « Récupérée » pour un retrait ; `parseOrderSearch` lit et réécrit chaque paramètre, refuse `statut=livre` et `vue=carte` ; le message avec et sans prénom, avec quartier, sans quartier, en retrait, `pluralizeUnit` (« 3 pièces »), le montant groupé (« 37 500 FCFA »).
- [ ] Rouge, puis le module ; le schéma (`SaleOrder` avec ses relations : `organization` Cascade, `respondent` Cascade, `product` Restrict, `campaign` SetNull, `response` SetNull, `zone` SetNull ; les relations inverses `orders` sur `Organization`, `Respondent`, `Product`, `Campaign`, `Response`, `DeliveryZone`) ; la migration écrite par `migrate diff` puis appliquée au Neon de dev (`migrate deploy`) ; `prisma generate` serveur arrêté.
- [ ] Le test de `schema-tamani` passe (ordre des dossiers). Barrière, commit `feat(orders): sale order model and shared views`.

### Task 2 : Les règles des commandes et la conversion

**Files :** create `frontend/src/lib/server/tamani/orders.ts` et son test ; modify `serializers.ts` (`toOrderRow`).

**Interfaces :**
- Consumes : Task 1.
- Produces (`orders.ts`) :
  - `orderUnitPrice(product: { unitPrice: number; wholesalePrice: number | null; wholesaleMinQty: number | null }, buyerType: BuyerType, quantity: number): number` ;
  - `ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]>` et `canTransition(from, to): boolean` ;
  - `ORDER_SELECT` (Prisma) et `toOrderRow(row, canSeeContacts): OrderRow` dans `serializers.ts` ;
  - `convertResponseToOrder(tx, organizationId, responseId, now): Promise<{ id: string }>` : lit la réponse comptée de la boutique avec son produit, crée la commande `TO_CONFIRM` (produit, campagne, réponse, client, `buyerType` de la réponse ou `CONSUMER`, quantité de la réponse ou 1, `fulfillment` = `DELIVERY` si `wantsDelivery`, `zoneId`, prix figé). Lève `OrderError('RESPONSE_NOT_FOUND' | 'RESPONSE_NOT_INTERESTED' | 'ORDER_ALREADY_EXISTS')` ; un `P2002` sur `responseId` devient `ORDER_ALREADY_EXISTS`.
  - `class OrderError extends Error { code: TamaniErrorCode; status: 404 | 409 }`.

- [ ] Tests : `orderUnitPrice` (revendeur 12 avec minimum 12 → gros ; 11 → unitaire ; usager 50 → unitaire ; pas de prix de gros → unitaire) ; toutes les transitions permises et interdites (`FULFILLED → CANCELLED` interdit, `CANCELLED → *` interdit) ; conversion : la commande porte le prix figé et le total, `DELIVERY` + quartier, `PICKUP` sans quartier ; `a later product price change leaves the order price` (le prix lu est celui de la création, rien ne le relit) ; `converting twice gives ORDER_ALREADY_EXISTS, also on P2002` ; réponse « Non » → `RESPONSE_NOT_INTERESTED` ; réponse d'une autre boutique ou `locked` → `RESPONSE_NOT_FOUND` (le `where` porte `organizationId` et `COUNTED`).
- [ ] Rouge, vert, barrière, commit `feat(orders): price, transitions and conversion`.

### Task 3 : L'API des commandes

**Files :**
- Create `frontend/src/lib/server/tamani/order-queries.ts` et son test ; les routes `app/api/shops/[orgId]/orders/route.ts`, `orders/[orderId]/route.ts`, `campaigns/[campaignId]/responses/[responseId]/order/route.ts` et leurs tests.
- Modify la route `DELETE` des produits (un produit avec commandes est archivé, comme un produit à campagnes passées).

**Interfaces :**
- Consumes : Tasks 1 et 2.
- Produces :
  - `listOrders(db, organizationId, filters: OrderFilters, cursor, { canSeeContacts, limit }): Promise<{ items: OrderRow[]; nextCursor: string | null; counts: Record<OrderStatus, number> | null }>` (plus récentes d'abord ; `counts` sur la première page, pour toute la boutique) ;
  - `ordersToDeliver(db, organizationId, { canSeeContacts }): Promise<ToDeliverGroup[]>` : commandes `CONFIRMED` en `DELIVERY`, groupées par quartier (ordre des quartiers de la boutique, « Sans quartier » à la fin), totaux par produit ;
  - `createManualOrder(tx, organizationId, input: { productId; firstName; phone; quantity; buyerType; fulfillment; zoneId: string | null; campaignId: string | null }, shopCountry, now): Promise<{ id }>` : `normalizePhone` (`400 INVALID_PHONE`), le client trouvé par `(organizationId, phoneE164)` ou créé (prénom gardé s'il en a déjà un), prix figé ;
  - `updateOrder(tx, organizationId, orderId, patch: { status?; paid?; unitPrice?; quantity?; notes? }, now): Promise<OrderRow>` ;
  - `campaignOrderSummary(db, organizationId, campaignId): Promise<{ confirmed: number; fulfilled: number; toConfirm: number; stockLeft: number | null }>` (quantités).
- Routes (toutes `shopHandler('MEMBER', …)`, `runtime = 'nodejs'`) :
  - `GET /orders` (filtres de `parseOrderSearch` ; `vue=a-livrer` → `{ groups }`), `POST /orders` (zod : `productId`, `firstName` 1 à 40, `phone`, `quantity` 1 à 100 000, `buyerType`, `fulfillment`, `zoneId?`, `campaignId?`) → `201 { order }` ;
  - `GET /orders/[orderId]` → `{ order }` ; `PATCH /orders/[orderId]` (zod : `status?`, `paid?`, `unitPrice?` 0 à 100 000 000, `quantity?`, `notes?` 0 à 500) → `{ order }` ;
  - `POST …/responses/[responseId]/order` → `201 { order }` ;
  - `GET …/campaigns/[campaignId]/orders` → `{ items, summary }` (les commandes de la campagne et `campaignOrderSummary`).

- [ ] Tests : cloisonnement (une commande, un produit, une campagne ou un quartier d'une autre boutique → 404 avec le bon code) ; `ORDER_NOT_FOUND` ; `PATCH price after confirmation is refused` ; `confirm then fulfil dates each step` ; `paid sets and clears paidAt` ; `manual order finds the client by normalized number` (`77 123 45 12` dans une boutique SN retrouve `+221771234512`) ; « À livrer » groupe par quartier avec les totaux par produit et exclut les retraits ; numéros masqués en Gratuit ; `stockLeft = 30 − (confirmées + livrées)` ; le produit à commandes est archivé, pas supprimé ; 400 sur un corps invalide ; 403 CSRF ; `runtime-enforcement` passe.
- [ ] Rouge, vert, barrière, commit `feat(orders): orders API, to-deliver view and conversion route`.

### Task 4 : Fiabilité et coefficients appris

**Files :** create `frontend/src/lib/server/tamani/reliability.ts` et son test ; modify `coefficients.ts`, la route `stats`, `home-bulletin.ts` et leurs tests.

**Interfaces :**
- Consumes : Task 1.
- Produces :
  - `clientReliability(rows: ReadonlyArray<{ interested: boolean; campaignFinished: boolean; fulfilled: boolean }>): { yesCount: number; fulfilledCount: number; rate: number | null }` ;
  - `learnedCoefficients(rows: ReadonlyArray<{ buyerType: BuyerType; campaignId: string; announced: number; fulfilledQty: number }>, fallback: { consumer: number; reseller: number }): LearnedCoefficients` avec `LearnedCoefficients = { consumer; reseller; learned: { consumer: boolean; reseller: boolean } }` ;
  - `loadLearnedCoefficients(db, organizationId, fallback, now): Promise<LearnedCoefficients>` : les réponses « Oui » comptées des campagnes terminées, leur quantité annoncée et la quantité de leurs commandes `FULFILLED` ;
  - `coefficientsFor(org, learned: LearnedCoefficients | null = null): Coefficients` : la source devient `LEARNED` pour un statut appris ;
  - la route `stats` et `buildHomeBulletin` passent `learned` seulement quand `features.reliability`.
- [ ] Tests aux seuils : 19 réponses « Oui » → repli ; 20 réponses sur 2 campagnes → appris ; 20 réponses sur 1 campagne → repli ; résultat borné (0.05 → 0.1, 1.4 → 1) ; un statut appris, l'autre non ; `clientReliability` : `rate` nul sous 2, 4 livrées sur 5 « Oui » → 0.8, une campagne en cours ne compte pas ; `coefNote` dit « appris de tes commandes » pour `LEARNED` (vérifier la phrase existante de `coefNote` et l'étendre) ; en Gratuit, la route `stats` ne lit jamais les commandes.
- [ ] Rouge, vert, barrière, commit `feat(orders): reliability and learned coefficients`.

### Task 5 : Le carnet de clients : « a commandé », note, anonymisation, fiche

**Files :** modify `lib/tamani/client-filters.ts`, `lib/server/tamani/clients.ts`, `lib/tamani/client-view.ts`, les routes `clients` et `clients/[respondentId]` et leurs tests, `lib/tamani/export-view.test.ts`.

**Interfaces :**
- Consumes : Tasks 1 et 4 (`clientReliability`).
- Produces :
  - `ClientFilterState.ordered: boolean | null`, paramètre `commande=oui|non` (refus de toute autre valeur), pastille « A commandé » / « Pas encore commandé » ; `ordered` vrai = au moins une commande non annulée ; la page Exporter le reprend sans changement (même parseur) ;
  - `ClientDetail` gagne `notes: string | null`, `orders: OrderRow[]` (plus récentes d'abord), `totalSpent: number` (Σ `totalAmount` des commandes `FULFILLED`), `reliability: { yesCount; fulfilledCount; rate } | null` (null sans `features.reliability`) ;
  - `PATCH /clients/[respondentId]` (`MEMBER`, `{ notes }`) → `{ client: { notes } }` ; `DELETE /clients/[respondentId]` (`ADMIN`) → `204`, `anonymizeClient(tx, organizationId, respondentId, now)`.
- [ ] Tests : `parseClientSearch` lit `commande=non` et refuse `commande=peut-etre` ; le filtre `ordered` combiné (revendeurs + quartier + campagne + octobre + `commande=non`) donne un `where` avec la réponse unique **et** `orders: { none: { status: { not: 'CANCELLED' } } }` ; `anonymize keeps orders and answers counted` (le client sort de `visibleClientWhere`, `responses` et `orders` intacts, stats inchangées) ; un `MEMBER` reçoit 403 sur `DELETE` (le vrai `requireOrgRole`) ; note de 1 001 caractères → 400 ; la fiche porte la fiabilité en Pro et `null` en Gratuit, le total des commandes livrées ; numéros masqués en Gratuit.
- [ ] Rouge, vert, barrière, commit `feat(clients): has-ordered filter, note, anonymization and orders on the card`.

### Task 6 : L'accueil : commandes à confirmer et livraisons

**Files :** modify `lib/tamani/home-view.ts` (`TodoItem`, `todoLine`), `lib/server/tamani/home-bulletin.ts`, leurs tests et `home.test.tsx`.

**Interfaces :**
- Consumes : Task 1.
- Produces : `TodoItem` devient une union : `NOTIFY_INTERESTED` (inchangé), `{ kind: 'CONFIRM_ORDERS'; count }` → « {n} commandes à confirmer », lien `/app/commandes?statut=a-confirmer` ; `{ kind: 'DELIVER'; count; zones: number }` → « {n} commandes à livrer dans {z} quartiers », lien `/app/commandes?vue=a-livrer`. Une ligne n'apparaît que si `count > 0`. Singuliers justes (« 1 commande à confirmer », « dans 1 quartier »).
- [ ] Tests : les deux lignes et leurs liens ; rien sans commande ; le bulletin les compte avec `groupBy` sur `organizationId` (jamais d'une autre boutique).
- [ ] Rouge, vert, barrière, commit `feat(home): orders to confirm and to deliver`.

### Task 7 : L'écran Commandes

**Files :** replace `app/(app)/app/commandes/page.tsx` ; create `app/(app)/app/commandes/nouvelle/page.tsx`, `app/(app)/app/commandes/[id]/page.tsx`, `components/app/OrderList.tsx` (`OrderListView` + `OrdersScreen`), `components/app/OrderDetail.tsx` (`OrderDetailView` + `OrderScreen`), `components/app/OrderForm.tsx` ; test `components/app/orders.test.tsx`.

**Interfaces :**
- Consumes : Tasks 1, 3.
- Produces :
  - `/app/commandes` : `PageHeader` « Commandes » avec le bouton « Nouvelle commande » (et le `Fab` sur téléphone) ; deux vues par `Tabs` : « Toutes » et « À livrer par quartier » (`vue=a-livrer`) ; « Toutes » a un `FilterBar` de statuts avec leurs compteurs et deux `Select` (campagne, produit) ; chaque ligne : client, produit, quantité, total, statut en `Badge`, « Payé » ; « Voir plus » au curseur ; état vide qui explique « Transforme un intéressé en commande depuis l'onglet Intéressés d'une campagne, ou crée-la ici. » ;
  - « À livrer par quartier » : une carte par quartier, le total par produit (« 24 sacs de Riz parfumé ») puis les commandes ;
  - `/app/commandes/[id]` : le détail, les actions selon `ORDER_TRANSITIONS` (« Confirmer », « Marquer livrée » / « Marquer récupérée », « Annuler » en `ghost` avec confirmation), la case « Payé », le prix et la quantité modifiables à `TO_CONFIRM` seulement, la note, le bouton WhatsApp (`orderWhatsappMessage`, `waChatLink`) ou, en Gratuit, le bouton Pro ;
  - `/app/commandes/nouvelle` : `OrderForm` (produit, prénom, numéro avec `PhoneInput` et le pays de la boutique, statut acheteur, quantité, retrait ou livraison et quartier, campagne facultative) ; le prix calculé s'affiche (`orderUnitPrice` est serveur : le formulaire montre le prix de gros ou unitaire avec la même règle, depuis `lib/tamani/orders-view.ts` qui exporte `previewUnitPrice` identique et testé contre `orderUnitPrice`).
- [ ] Tests : la liste en Pro et en Gratuit (numéros masqués) ; les compteurs ; « À livrer » avec ses totaux ; le détail montre les bonnes actions pour chaque statut et cache le prix modifiable après confirmation ; le message WhatsApp ; le formulaire montre « Prix de gros » à 12 pièces revendeur ; `previewUnitPrice` égale `orderUnitPrice` sur les mêmes cas.
- [ ] Rouge, vert, barrière, commit `feat(orders): orders screens`.

### Task 8 : Campagne, intéressés et clients à l'écran

**Files :** modify `components/app/InterestedList.tsx`, l'onglet de la page campagne (`campaignTabs` dans `results-view.ts` : un onglet « Commandes », `?onglet=commandes`), create `components/app/CampaignOrders.tsx` ; modify `components/app/ClientFilters.tsx`, la fiche `app/(app)/app/clients/[id]/page.tsx` et ses composants ; tests `interested.test.tsx`, `campaign.test.tsx`, `clients.test.tsx`.

**Interfaces :**
- Consumes : Tasks 3, 4, 5.
- Produces :
  - sur chaque intéressé « Oui » : « Transformer en commande » (`POST …/responses/[id]/order`, puis lien vers la commande) ; une réponse déjà convertie montre « Commande créée » avec le lien (la liste des intéressés reçoit `orderId: string | null` par réponse, ajouté à `InterestedRow` et à `ROW_SELECT`) ;
  - l'onglet « Commandes » de la campagne : « Stock restant : N » (si stock), confirmées, livrées, à confirmer, puis la liste des commandes de la campagne ;
  - la feuille « Filtrer » des clients gagne « Commandes » (« A commandé », « Pas encore commandé ») ;
  - la fiche client : note modifiable (enregistrée au `blur` ou par « Enregistrer »), commandes et total acheté, fiabilité en Pro (« a dit oui 5 fois, a acheté 4 fois · 80 % ») ou la carte Pro, et pour un `ADMIN` « Supprimer les données de ce client » avec une confirmation qui dit que c'est définitif.
- [ ] Tests : le bouton et l'état « Commande créée » ; l'onglet Commandes et son stock restant ; le filtre et sa pastille ; la fiche en Pro et en Gratuit ; le bouton d'anonymisation seulement pour un `ADMIN`.
- [ ] Rouge, vert, barrière, commit `feat(orders): orders on the campaign, the interested list and the client card`.

### Task 9 : Documentation, build et recette

**Files :** la spec (§5.5.1 à §5.5.3, §6), la feuille de route (lot 7 fait, décisions), `CLAUDE.md` (section « Tamani orders (lot 7) »).

- [ ] Docs, puis barrière complète et `pnpm build` (mémoire libre vérifiée d'abord).
- [ ] Données de recette `create7` sur le compte jetable : quelques commandes à chaque statut, une payée, deux quartiers, un retrait.
- [ ] Recette `recette-7.mjs` sur `next start` (port 3001), à 390 et 1 280 px, sans débordement horizontal : convertir un intéressé (une seule commande au double clic), confirmer, livrer, payé ; « À livrer par quartier » ; commande manuelle avec un numéro déjà au carnet ; stock restant de la campagne ; filtre « a commandé » ; note ; fiabilité en Pro ; anonymisation ; les lignes de l'accueil ; en Gratuit les numéros masqués.
- [ ] Corriger chaque défaut vu (test rouge d'abord), barrière, commit ; remettre le serveur en marche ; donner au porteur le lien et les identifiants. Commit `docs(orders): lot 7 rules and recette`.

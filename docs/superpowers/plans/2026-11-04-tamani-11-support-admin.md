# Lot 11 : Support-admin — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** le back-office de Tamani à `/support-admin` : encaissements par pass, MRR, churn, CAC, boutiques actives par forfait, type et canal de vente, campagnes, gestion des utilisateurs et attribution manuelle d'un pass, chaque écriture journalisée.

**Architecture :** les pages `/support-admin/**` sont des composants serveur : la mise en page vérifie `requireAdmin('ADMIN')` puis chaque page lit la base par des fonctions de `lib/server/tamani/admin/` et dessine une vue sans état (testée en HTML statique). Les écritures passent par des routes `/api/admin/**` (`verifyCsrf`, `requireSuperadmin`, `logAdminAction`) appelées par de petits îlots client qui font `router.refresh()`. Les indicateurs sont des fonctions pures sur les commandes de pass (`Order`) et les abonnements (`Subscription`).

**Tech Stack :** Next.js 16 App Router (composants serveur), Prisma 5 / Neon, Vitest (prismaMock, HTML statique), kit UI Tamani.

**Spec :** [docs/superpowers/specs/2026-10-24-tamani-design.md](../specs/2026-10-24-tamani-design.md) (§ admin, pass Illimité attribué à la main) et la demande du porteur du 2026-10-30 (citée ci-dessous). Feuille de route : [2026-10-24-tamani-roadmap.md](2026-10-24-tamani-roadmap.md), lot 10 point 9.

Demande du porteur (2026-10-30) : « Les encaissements donc l'argent que les gens ont payé et chaque abonnement est identifiable par forfait ; le nombre des personnes actives sur la plateforme avec leur statut (Grossistes, importateur, Détaillants) (forfait actuel) avec boutique physique, en ligne ou les deux ; le nombre de campagnes (en cours, archivé, brouillon) ; CHURN ; CAC ; Ajouter un utilisateur (CRUD) ; Attribuer un abonnement (CRUD) ; Changer le lien du dashboard admin standard par Support-admin. » Définitions validées le 2026-11-04 : churn, CAC (dépense marketing saisie par mois ÷ nouvelles boutiques payantes), MRR (prix ramené à 30 jours).

## Global Constraints

- Toute écriture d'admin appelle `logAdminAction(prisma, {...})` (fichier protégé, à appeler, jamais à modifier). Actions : `shop.pass_grant`, `shop.pass_end`, `marketing.spend_set`, `user.create`, `user.rename`.
- Lectures : `requireAdmin('ADMIN')`. Écritures d'argent, de pass et de comptes : `requireSuperadmin()` (comme le changement de rôle du kit).
- Chaque route : `export const runtime = 'nodejs'`, `withRequestContext`, `verifyCsrf` en premier pour une écriture, réponse JSON (jamais 204).
- Montants : entiers en FCFA (XOF et XAF à parité, additionnés). Un pass attribué à la main enregistre son montant en XOF.
- Mois : mois civil UTC, `?mois=AAAA-MM` (défaut : le mois en cours).
- Jamais de numéro de client, de prénom de client ni de mot de passe dans un journal ou dans `AdminAction.metadata`.
- Fichiers protégés intouchés (`audit.ts`, `middleware/*`, `auth.ts`, `api.ts`…).
- Textes à l'écran en français, tutoiement non (admin interne : phrases neutres et courtes).

## Définitions (décidées avec le porteur)

- **Encaissé** : somme des `Order` activées (`activatedAt` non nul, `amount > 0`) du mois, par pass et par moyen (`saspay` ou `manual`).
- **Couverture d'une boutique** : on rejoue ses commandes activées dans l'ordre. Une commande prolonge la couverture si elle tombe avant la fin de la grâce de la précédente ; sinon elle en ouvre une nouvelle. Fin d'une commande : `activatedAt + jours` (ou la fin en cours si elle est plus lointaine), grâce `GRACE_DAYS` (3 jours) comprise.
- **Churn du mois** : boutiques couvertes au premier instant du mois, dont la couverture se termine dans le mois sans nouvel achat ensuite dans le mois ÷ boutiques couvertes au premier instant du mois. `null` sans boutique au départ.
- **CAC du mois** : dépense marketing saisie pour le mois ÷ boutiques dont le premier achat payant (`amount > 0`) tombe dans le mois. `null` sans dépense ou sans nouvelle boutique payante.
- **MRR (à l'instant)** : pour chaque boutique dont le pass payant court (ni essai, ni grâce, ni « Sans pass ») : `prix × 30 ÷ jours`, arrondi. Pass Illimité : montant et jours de sa dernière attribution manuelle (0 sans montant).
- **Boutique active** : son forfait effectif (`effectivePlan`) n'est pas `FREE` (essai et grâce compris).
- **Campagnes** : en cours (`ACTIVE`, non expirée, non archivée), brouillons (`DRAFT`, non archivées), terminées (le reste non archivé), archivées (`archivedAt` non nul).

## Review Focus

1. Un mois sans aucune commande ni boutique : toutes les cartes s'affichent avec 0 ou « — », jamais `NaN` ni une division par zéro.
2. Un pass acheté pendant la grâce du précédent : la boutique n'est pas comptée comme partie (churn).
3. Un ADMIN (non SUPERADMIN) voit tout mais ne peut ni attribuer un pass, ni saisir une dépense, ni créer un compte (403, et les formulaires ne s'affichent pas).
4. Un visiteur non connecté sur `/support-admin` va à la connexion ; un utilisateur connecté non admin reçoit une page introuvable (pas de fuite de l'existence de l'admin).
5. Créer un compte avec un e-mail déjà pris : 409 clair, aucun compte modifié, rien dans le journal.

---

### Task 1 : L'adresse `/support-admin`, sa garde et son cadre

**Files :**
- Create : `frontend/src/app/(admin)/support-admin/layout.tsx`, `frontend/src/app/(admin)/support-admin/page.tsx` (provisoire, remplacé en Task 3), `frontend/src/lib/tamani/admin-nav.ts`, `frontend/src/components/admin/AdminShell.tsx`, tests `frontend/src/lib/tamani/admin-nav.test.ts`, `frontend/src/components/admin/admin-shell.test.tsx`
- Delete : `frontend/src/app/(admin)/admin/page.tsx`
- Modify : `frontend/next.config.ts` (redirection `/admin` → `/support-admin`), `frontend/src/proxy.ts` (`/support-admin` protégé dès que `/admin` l'est), son test.

**Interfaces :**
- Produces : `ADMIN_HOME = '/support-admin'` ; `ADMIN_NAV: { href; label }[]` (Tableau de bord, Boutiques, Utilisateurs, Journal) ; `adminGate(status: 401 | 403 | 'ok') → 'login' | 'hidden' | 'ok'` ; `AdminShell({ email, role, pathname, children })`.

- [ ] Tests : `adminGate` (401 → `login`, 403 → `hidden`) ; `ADMIN_NAV` commence par `/support-admin` ; le proxy renvoie vers `/login?next=/support-admin/boutiques` sans cookie quand `AUTH_PROTECTED_PREFIXES="/app,/admin"` ; `AdminShell` marque le lien actif `aria-current="page"` et montre l'e-mail.
- [ ] Les faire échouer, puis coder. La mise en page : `requireAdmin('ADMIN')` ; 401 → `redirect('/login?next=/support-admin')`, 403 → `notFound()`. Redirection `next.config` : `{ source: '/admin', destination: '/support-admin', permanent: false }` et `/admin/:path*`.
- [ ] `pnpm --filter frontend exec vitest run src/lib/tamani/admin-nav.test.ts src/components/admin src/proxy` → PASS ; commit `feat(admin): the back-office moves to /support-admin`.

### Task 2 : Les indicateurs (pur) et la dépense marketing

**Files :**
- Create : `frontend/src/lib/server/tamani/admin/metrics.ts` (+ test), `frontend/src/lib/server/tamani/admin/dashboard.ts` (+ test), migration `frontend/prisma/migrations/9h_marketing_spend/migration.sql`, `frontend/src/app/api/admin/marketing-spend/route.ts` (+ test)
- Modify : `frontend/prisma/schema.prisma` (`MarketingSpend { month String @id; amount Int; updatedAt DateTime @updatedAt; updatedById String }`), `schema-tamani.test.ts` (9h après 9g).

**Interfaces :**
- Produces (pur) : `monthRange('2026-11') → { start, end }`, `parseMonth(v, now) → 'AAAA-MM'` (valeur invalide → mois en cours) ; `PassOrder { organizationId; offer; amount; provider; activatedAt; days }` ; `coverages(orders) → Map<orgId, { start; end }[]>` ; `churnOf(coverages, orders, range) → { atStart; churned; rate: number | null }` ; `newPayers(orders, range) → number` ; `cacOf(spend: number | null, payers) → number | null` ; `mrrOf(subs, unlimitedPrices, now) → number`.
- Produces (données) : `loadAdminDashboard(db, month, now) → AdminDashboard` avec `revenue { total; last30Days; byPass[{ offer; count; amount }]; payments[{ id; shopName; offer; amount; provider; at }] }`, `mrr`, `churn`, `cac { spend; payers; value }`, `shops { total; active; byPlan; byType; byChannel }`, `campaigns { running; drafts; finished; archived }`, `users { total; suspended }`.
- `PUT /api/admin/marketing-spend` `{ month, amount }` (SUPERADMIN, 0 à 1 000 000 000) → `{ month, amount }`, upsert, `marketing.spend_set` avec l'ancien et le nouveau montant.

- [ ] Tests purs : deux commandes Semaine qui se suivent pendant la grâce = une seule couverture ; churn 1/2 quand une boutique sur deux s'arrête dans le mois ; pas de churn quand elle rachète plus tard dans le mois ; `rate` `null` sans boutique au départ ; `newPayers` ignore un pass offert (`amount` 0) et une boutique qui avait déjà payé ; `cacOf(null, 3)` et `cacOf(50000, 0)` → `null`, `cacOf(50000, 4)` → 12500 ; MRR : Semaine → 16714, Mois → 9900, essai, grâce et Sans pass → 0, Illimité 55 000 sur 30 jours → 55000.
- [ ] Tests données (prismaMock) : `loadAdminDashboard` additionne XOF et XAF, ne lit que les commandes activées, compte les campagnes archivées à part. Route : 403 pour un ADMIN, 400 pour un mois mal écrit, audit enregistré.
- [ ] Coder, migration appliquée **après accord du porteur** (base partagée), commit `feat(admin): revenue, MRR, churn and CAC`.

### Task 3 : Le tableau de bord

**Files :** Create `frontend/src/lib/tamani/admin-view.ts` (+ test), `frontend/src/components/admin/DashboardView.tsx` (+ test), `frontend/src/components/admin/MarketingSpendForm.tsx` ; Modify `frontend/src/app/(admin)/support-admin/page.tsx`.

**Interfaces :** `monthLabel('2026-11') → 'novembre 2026'`, `percentText(0.125) → '12,5 %'`, `planLabel(plan)` (depuis `PLANS`, `FREE` → « Sans pass »), `DashboardView({ data, month, canEdit })`.

- [ ] Tests : les cartes « Encaissé », « MRR », « Churn », « CAC » et « Boutiques actives » avec leur calcul écrit dessous ; « — » quand une valeur est `null` ; un tableau par pass ; les trois répartitions (forfait, « Tu es », « Où tu vends ») ; le formulaire de dépense seulement si `canEdit` ; navigation de mois précédent / suivant.
- [ ] Coder (lire le skill dataviz avant les cartes), commit `feat(admin): the dashboard`.

### Task 4 : Attribuer et retirer un pass

**Files :** Create `frontend/src/lib/server/tamani/admin/grant.ts` (+ test), `frontend/src/app/api/admin/shops/[orgId]/pass/route.ts` (+ test) ; Modify `frontend/src/lib/server/tamani/subscription.ts` (`applyGrant`, `applyPurchase` s'appuie dessus).

**Interfaces :**
- `applyGrant(current, { plan, days, responses }, used, now) → PassState` (mêmes règles que l'achat : report des réponses non utilisées tant que le pass en cours court, fin jamais avant la sienne, grâce de 3 jours).
- `grantPass(tx, { organizationId, plan: PassId | 'UNLIMITED', days?, responses?, amount, actorId }, now) → { orderId; endsAt }` : verrous `billingLock` puis `quotaLock`, une `Order` `provider 'manual'`, `status 'PAID'`, `activatedAt now`, `currency 'XOF'`, `metadata { days, responses }`, l'abonnement, `unlockPending`. Pass standard : jours et réponses de `PLANS` ; Illimité : `days` (1 à 366) et `responses` (1 à 1 000 000) obligatoires.
- `endPass(tx, organizationId)` : l'abonnement passe à `FREE` (dates nulles, 0 réponse).
- `POST /api/admin/shops/[orgId]/pass` (SUPERADMIN) `{ plan, days?, responses?, amount }` → `201 { orderId, endsAt }` ; `DELETE` → `{ ended: true }` ; boutique inconnue → 404 `SHOP_NOT_FOUND`. Audit `shop.pass_grant` (pass, jours, réponses, montant) et `shop.pass_end` (forfait d'avant).

- [ ] Tests : un pass Mois attribué pendant un essai garde les réponses restantes ; un Illimité sans `responses` → 400 ; la commande manuelle est comptée dans les encaissements et le churn (fixture partagée avec Task 2) ; les réponses en attente s'ouvrent ; 403 pour un ADMIN ; audit enregistré sans données de client.
- [ ] Coder, commit `feat(admin): grant and end a pass by hand`.

### Task 5 : Les boutiques

**Files :** Create `frontend/src/lib/server/tamani/admin/shops.ts` (+ test), `frontend/src/components/admin/ShopsView.tsx`, `ShopDetailView.tsx`, `GrantPassForm.tsx` (+ tests), pages `support-admin/boutiques/page.tsx` et `support-admin/boutiques/[id]/page.tsx`.

**Interfaces :** `listAdminShops(db, { q, plan, cursor }, now) → { items; nextCursor }` (50 par page, recherche sur le nom de la boutique et l'e-mail du propriétaire, filtre sur le forfait effectif) ; `getAdminShop(db, orgId, now) → AdminShop | null` (propriétaire et membres, type et canal, pass effectif, réponses utilisées / incluses, campagnes par état, achats).

- [ ] Tests : la recherche par e-mail du propriétaire ; le filtre « Sans pass » ; la fiche affiche les achats avec « SasPay » ou « Manuel » ; le formulaire d'attribution (choix du pass, jours et réponses seulement pour l'Illimité, montant) n'apparaît que pour un SUPERADMIN ; « Retirer le pass » demande une seconde confirmation.
- [ ] Coder, commit `feat(admin): shops list and card`.

### Task 6 : Les utilisateurs

**Files :** Create `frontend/src/lib/server/tamani/admin/users.ts` (+ test), `frontend/src/app/api/admin/users/route.ts` (ajout de `POST`), `frontend/src/app/api/admin/users/[id]/route.ts` (ajout de `PATCH { name }`), `frontend/src/components/admin/UsersView.tsx`, `CreateUserForm.tsx`, `UserActions.tsx` (+ tests), page `support-admin/utilisateurs/page.tsx`.

**Interfaces :** `createUserByAdmin(db, { email, name }) → { user; temporaryPassword }` (mot de passe de 12 caractères lisibles, haché par `hashPassword` du kit, `emailVerifiedAt` maintenant : l'admin se porte garant) ; `POST /api/admin/users` (SUPERADMIN) → `201 { user, temporaryPassword }`, 409 `EMAIL_TAKEN` ; `PATCH /api/admin/users/[id]` `{ name }` (ADMIN) → `{ user }`. Suspendre / rétablir et le rôle : routes du kit existantes.

- [ ] Tests : le mot de passe temporaire n'apparaît ni dans l'audit ni dans les journaux ; e-mail en double → 409 sans écriture ; la liste montre la boutique et le forfait de chaque compte ; le mot de passe s'affiche une seule fois après création.
- [ ] Coder, commit `feat(admin): create, rename, suspend users`.

### Task 7 : Le journal

**Files :** Create `frontend/src/components/admin/JournalView.tsx` (+ test), page `support-admin/journal/page.tsx`, `frontend/src/lib/tamani/admin-view.ts` (`actionLabel`).

- [ ] Tests : les 100 dernières actions avec leur auteur, leur cible et un libellé français par action (`shop.pass_grant` → « Pass attribué »…), une action inconnue gardant son code.
- [ ] Coder, commit `feat(admin): the audit journal`.

### Task 8 : Documentation, recette, PR

- [ ] CLAUDE.md (section « Tamani support-admin (lot 11) »), feuille de route (contrats admin mis à jour : pages servies par le serveur, routes ci-dessus), `pnpm format && pnpm lint && pnpm typecheck && pnpm test`, `next build`.
- [ ] Recette réelle (téléphone 390 px et ordinateur 1280 px) avec un compte de test passé SUPERADMIN pour la recette puis remis à USER : tableau de bord, attribution puis retrait d'un pass sur la boutique de recette, saisie d'une dépense, création d'un compte de test, journal.
- [ ] PR vers la branche du lot 10 (empilée sur #16), accord du porteur avant fusion. Le porteur dit quel compte devient SUPERADMIN (`pnpm db:make-superadmin <email>`).

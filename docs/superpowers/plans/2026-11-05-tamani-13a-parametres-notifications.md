# Lot 13a : Paramètres, admins et notifications — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dans le support-admin, une page Paramètres (les informations de la plateforme, que le site public lit, et l'équipe d'admins) et une page Notifications (inscriptions, boutiques, paiements), avec une pastille dans le menu.

**Architecture:**
- Les réglages tiennent sur une ligne `PlatformSetting`. Le site public les lit au moment de la construction, et une route admin les régénère à chaque enregistrement.
- Sans ligne en base, ou si la base est injoignable, on garde les constantes actuelles de `landing.ts`.
- Les notifications ne branchent rien sur l'inscription ni sur le paiement : elles sont calculées à partir des comptes, des boutiques et des commandes.
- Chaque admin a sa propre date de dernière visite (`AdminFeedSeen`).

**Tech Stack:** Next.js 16 App Router, Prisma 5 et Neon, Vitest, Tailwind 4 (jetons du lot 11b).

**Spec:** [docs/superpowers/specs/2026-11-05-tamani-super-admin-complet-design.md](../specs/2026-11-05-tamani-super-admin-complet-design.md), §5, §6 et §11.

**Branche :** `plan/13-super-admin`, partie de `plan/11b-support-admin-design` (PR #18 pas encore fusionnée).

## Global Constraints

- Lire : `ADMIN` (`adminOnly()` dans les pages, `requireAdmin` dans les routes). Écrire : `SUPERADMIN` (`requireSuperadmin`).
- Chaque route : `export const runtime = 'nodejs'`, puis `withRequestContext` → `verifyCsrf` (mutations) → rôle → `enforceAdminRateLimit` → zod → `prisma.$transaction` avec `logAdminAction(tx, …)` → JSON, jamais 204.
- Aucun fichier protégé modifié (liste de CLAUDE.md).
- Jamais d'e-mail, de téléphone ou de prénom dans un log.
- Erreurs : `tamaniError(code, status)` avec un code de `TAMANI_ERRORS`, et ses mots dans `errorMessage()`.
- Jetons uniquement, pas de palette Tailwind par défaut. Squelettes, jamais « Chargement… ».
- Migration nommée avec une lettre : `9k_platform_settings`.
- Textes à l'écran en français simple, sans tiret long.

## Review Focus

1. **Base injoignable au build :** `loadPlatformSettings` rend les valeurs par défaut, et `/` et `/forfaits` se construisent quand même. Testé (Task 1).
2. **Un super-admin ne peut pas se fermer la porte :** pas de changement de son propre rôle, et pas de rétrogradation du dernier super-admin, même avec deux demandes simultanées (le comptage se fait dans la transaction). Testé (Task 3).
3. **Un lien des réglages ne peut pas porter de script :** `javascript:`, `http:` et les mauvais domaines sont refusés pour chaque champ. Testé (Task 1).
4. **Le fil des notifications ne montre ni e-mail ni téléphone**, et la pastille d'un admin ne bouge pas quand un autre admin lit le fil. Testé (Task 4).
5. **Un `ADMIN` voit les Paramètres en lecture seule :** pas de formulaire, et la route `PUT` lui répond 403. Testé (Task 2).

---

### Task 1 : Les données et les règles des réglages

**Files:**
- Modify : `frontend/prisma/schema.prisma` (modèles `PlatformSetting`, `AdminFeedSeen`, relation sur `User`)
- Create : `frontend/prisma/migrations/9k_platform_settings/migration.sql`
- Create : `frontend/src/lib/tamani/platform-settings.ts`, `frontend/src/lib/tamani/platform-settings.test.ts`
- Create : `frontend/src/lib/server/tamani/platform-settings.ts`, `frontend/src/lib/server/tamani/platform-settings.test.ts`

**Interfaces:**
- Produces :
  - `interface PlatformSettings { displayName: string; contactEmail: string; links: LandingLinks; video: LandingVideo | null }` ;
  - `DEFAULT_PLATFORM_SETTINGS: PlatformSettings`, pris dans `LANDING_LINKS`, `LANDING_CONTACT_EMAIL` et `LANDING_VIDEO` ;
  - `PlatformSettingsInput` (zod) : `displayName`, `contactEmail`, `whatsappContact`, `community`, `facebook`, `instagram`, `tiktok`, `videoUrl`, `captionsUrl`. Une chaîne vide devient `null` ;
  - `settingsFromRow(row: PlatformSettingRow | null): PlatformSettings` ;
  - `rowFromInput(input): Omit<PlatformSettingRow, 'id' | 'updatedAt' | 'updatedById'>` ;
  - côté serveur : `loadPlatformSettings(db: Pick<PrismaClient, 'platformSetting'>): Promise<PlatformSettings>`.
- Domaines admis, en `https:` seulement :
  - `whatsappContact` : `wa.me`, `api.whatsapp.com` ;
  - `community` : `chat.whatsapp.com`, `whatsapp.com` (chaînes) ;
  - `facebook` : `facebook.com`, `www.facebook.com`, `fb.com`, `m.facebook.com` ;
  - `instagram` : `instagram.com`, `www.instagram.com` ;
  - `tiktok` : `tiktok.com`, `www.tiktok.com`, `vm.tiktok.com` ;
  - `videoUrl` et `captionsUrl` : `res.cloudinary.com`.

- [ ] **Step 1 : Tests qui échouent** (`platform-settings.test.ts`)
  - `settingsFromRow(null)` vaut `DEFAULT_PLATFORM_SETTINGS`.
  - Une ligne enregistrée fait foi : un champ `null` cache le lien (`links.facebook === null`), même si la constante en a un.
  - `PlatformSettingsInput` accepte `https://wa.me/2290195831126` et `https://www.tiktok.com/@tamani`, et transforme `''` en `null`.
  - Il refuse :
    - `javascript:alert(1)` ;
    - `http://wa.me/1` ;
    - `https://evil.com/wa.me` ;
    - `https://wa.me.evil.com/1` ;
    - pour `facebook`, un lien TikTok ;
    - un e-mail sans `@` ;
    - un `displayName` vide ou de plus de 40 caractères.
  - `videoUrl` : une URL Cloudinary donne `video: { src }`, `captionsUrl` donne `captions`, et sans `videoUrl` la vidéo vaut `null`.
- [ ] **Step 2 : Tests serveur qui échouent** (`lib/server/…/platform-settings.test.ts`)
  - `loadPlatformSettings` lit la ligne `id = 'platform'`.
  - Quand `findUnique` lève une erreur (base injoignable), il rend `DEFAULT_PLATFORM_SETTINGS`.
- [ ] **Step 3 :** les lancer. Attendu : échec, module introuvable.
- [ ] **Step 4 : Le schéma et la migration**
  - **`PlatformSetting` :**
    - `id String @id @default("platform")` ;
    - `displayName`, `contactEmail` : `String` ;
    - `whatsappContact`, `community`, `facebook`, `instagram`, `tiktok`, `videoUrl`, `captionsUrl` : `String?` ;
    - `updatedAt DateTime @updatedAt` ;
    - `updatedById String?`.
  - **`AdminFeedSeen` :**
    - `userId String @id`, avec la relation vers `User` en `onDelete: Cascade` ;
    - `seenAt DateTime`.
  - **La migration :** son SQL est écrit à la main, sur le modèle de `9h_marketing_spend`.
- [ ] **Step 5 : Le code.** Les deux modules, puis `prisma generate` depuis `frontend/` (arrêter d'abord tout `next` en cours).
- [ ] **Step 6 :** les tests de la tâche et `schema-tamani.test.ts`. Attendu : tout passe.
- [ ] **Step 7 : Commit** `feat(admin): platform settings and admin feed models, with safe defaults`

### Task 2 : La page Paramètres et le site qui lit les réglages

**Files:**
- Create : `frontend/src/app/api/admin/settings/route.ts`, `route.test.ts`
- Create : `frontend/src/app/(admin)/support-admin/parametres/page.tsx`
- Create : `frontend/src/components/admin/PlatformSettingsForm.tsx`, `SettingsView.tsx`, `settings.test.tsx`
- Modify :
  - `frontend/src/app/(public)/page.tsx`, `page.test.tsx` ;
  - `frontend/src/app/(public)/forfaits/page.tsx`, `page.test.tsx` ;
  - `frontend/src/components/landing/LandingFooter.tsx` (prop `contactEmail`) ;
  - `frontend/src/app/(app)/app/plus/page.tsx` et le parent serveur de `BillingView` (lien d'aide).
- Modify : `frontend/src/lib/server/tamani/errors.ts` uniquement si un code manque.

**Interfaces:**
- Consumes : Task 1.
- Produces :
  - `GET /api/admin/settings` (ADMIN) → `{ settings: PlatformSettings }` ;
  - `PUT /api/admin/settings` (SUPERADMIN) → `{ settings }`. Journal : `action: 'platform.settings_update'`, avec `metadata` = la liste des champs changés (jamais leur valeur). Ensuite, `revalidatePath` pour `/`, `/forfaits` et `/llms.txt`.

- [ ] **Step 1 : Tests de route qui échouent**
  - `PUT` sans CSRF → 403.
  - En `ADMIN` → 403.
  - Avec un lien `http:` → 400 `VALIDATION_FAILED`.
  - En `SUPERADMIN`, un corps valide → 200, la ligne est écrite, `logAdminAction` est appelé avec les noms des champs changés, et `revalidatePath` trois fois.
  - `GET` en `ADMIN` → 200 avec les réglages.
- [ ] **Step 2 : Tests de vue qui échouent**
  - `SettingsView` en `SUPERADMIN` montre le formulaire, avec chaque champ étiqueté.
  - En `ADMIN`, la même page montre les valeurs en texte, sans `<form>`.
  - Le domaine (`APP_URL`) s'affiche avec la phrase « Se change dans Vercel », sans champ.
- [ ] **Step 3 : Tests du site qui échouent**
  - L'accueil, rendu avec des réglages où `facebook` est défini, affiche ce lien dans le pied de page et dans `sameAs`.
  - Avec `community: null`, la section Communauté montre le bouton d'inscription.
  - `/forfaits` passe le lien WhatsApp des réglages à la carte Illimité.
  - Le pied de page affiche `contactEmail`.
  - Dans les tests, `loadPlatformSettings` est remplacé par un faux.
- [ ] **Step 4 :** les lancer. Attendu : échec.
- [ ] **Step 5 : Le code**
  - La route, la page et le formulaire. Le formulaire est un îlot client : `api()`, puis `router.refresh()` et « Enregistré ».
  - `HomePage` et `ForfaitsPage` deviennent `async`, lisent `loadPlatformSettings(prisma)` et passent `links`, `video` et `contactEmail` aux sections.
- [ ] **Step 6 :** les tests de la tâche, plus `src/components/landing` et `src/app/(public)`. Attendu : tout passe.
- [ ] **Step 7 : Commit** `feat(admin): platform settings page; the public site reads them`

### Task 3 : Les admins

**Files:**
- Create : `frontend/src/lib/server/tamani/admin/admins.ts`, `admins.test.ts`
- Create : `frontend/src/app/api/admin/admins/route.ts`, `frontend/src/app/api/admin/admins/[id]/route.ts`, et leurs tests
- Create : `frontend/src/components/admin/AdminsSection.tsx`, `AddAdminForm.tsx`, `AdminRoleControl.tsx`, `admins.test.tsx`
- Modify : `frontend/src/lib/server/tamani/errors.ts` (codes `ADMIN_SELF_CHANGE`, `ADMIN_LAST_SUPERADMIN`, `ADMIN_ALREADY`) et leurs mots

**Interfaces:**
- Produces :
  - `listAdmins(db) → { id, email, name, role, createdAt }[]`, les super-admins d'abord ;
  - `addAdmin(tx, { email, name, role: 'ADMIN' | 'SUPERADMIN' }, now) → { kind: 'PROMOTED' | 'CREATED' | 'ALREADY_ADMIN'; user; temporaryPassword?: string }`, qui réutilise `createUserByAdmin` ;
  - `changeAdminRole(tx, actorId, targetId, role: 'USER' | 'ADMIN' | 'SUPERADMIN') → { kind: 'OK', from, to } | { kind: 'NOT_FOUND' | 'SELF' | 'LAST_SUPERADMIN' }` ;
  - les routes :
    - `GET /api/admin/admins` (ADMIN) ;
    - `POST /api/admin/admins` (SUPERADMIN) → 201 `{ admin, temporaryPassword? }`, journal `admin.add` avec `{ created, role }` ;
    - `PATCH /api/admin/admins/[id]` (SUPERADMIN, `{ role }`) → `{ admin }`, journal `admin.role_change` avec `{ from, to }`.

- [ ] **Step 1 : Tests qui échouent** (`admins.test.ts`)
  - Un `USER` existant est promu (`PROMOTED`), sans mot de passe.
  - Un e-mail inconnu crée un compte vérifié avec un mot de passe temporaire de 12 caractères (`CREATED`).
  - Un admin existant donne `ALREADY_ADMIN`, et la route répond 409 `ADMIN_ALREADY`.
  - Changer son propre rôle donne `SELF`, et la route répond 409 `ADMIN_SELF_CHANGE`.
  - Rétrograder le dernier `SUPERADMIN` donne `LAST_SUPERADMIN` (409), le comptage étant fait dans la transaction.
  - Retirer un `ADMIN` (`role: 'USER'`) donne `OK`.
- [ ] **Step 2 : Tests de routes et de vue qui échouent**
  - Un `ADMIN` reçoit 403 sur `POST` et sur `PATCH`.
  - Sans CSRF → 403.
  - Le mot de passe temporaire apparaît une seule fois, dans la réponse du `POST`.
  - La section affiche le bouton « Retirer » sauf sur sa propre ligne, et la confirmation est dans la page (pas de `confirm()`).
  - Un `ADMIN` voit la liste sans aucun bouton.
- [ ] **Step 3 :** les lancer. Attendu : échec.
- [ ] **Step 4 : Le code.** Placer la section sous les informations, sur la page Paramètres.
- [ ] **Step 5 :** les tests de la tâche, plus `src/components/admin` et `src/app/api/admin`. Attendu : tout passe.
- [ ] **Step 6 : Commit** `feat(admin): add, change and remove admins from the settings`

### Task 4 : Les notifications

**Files:**
- Create : `frontend/src/lib/tamani/admin-feed.ts`, `admin-feed.test.ts`
- Create : `frontend/src/lib/server/tamani/admin/feed.ts`, `feed.test.ts`
- Create : `frontend/src/app/api/admin/feed/seen/route.ts`, `route.test.ts`
- Create : `frontend/src/app/(admin)/support-admin/notifications/page.tsx`
- Create : `frontend/src/components/admin/FeedView.tsx`, `FeedSeen.tsx`, `feed.test.tsx`
- Modify :
  - `frontend/src/lib/tamani/admin-nav.ts` (Notifications en 2e, Paramètres en dernier) ;
  - `AdminNav.tsx` et `AdminShell.tsx` (prop `unread`) ;
  - `frontend/src/app/(admin)/support-admin/layout.tsx`.

**Interfaces:**
- Produces :
  - `type FeedType = 'SIGNUP' | 'SHOP' | 'PAYMENT' | 'PAYMENT_FAILED'` ;
  - `interface FeedItem { id: string; type: FeedType; at: Date; title: string; detail: string; href: string }` ;
  - `feedTitle(type)` et `FEED_FILTERS` (`tout`, `inscriptions`, `paiements`) ;
  - `loadAdminFeed(db, { now, type?, before?: Date, limit = 50 }) → { items: FeedItem[]; next: Date | null }`, sur les 30 derniers jours ;
  - `countUnreadFeed(db, userId, now) → number`, plafonné à 99 ;
  - `markFeedSeen(db, userId, now)`.
- Sources :
  - `User.emailVerifiedAt` → `SIGNUP` ;
  - `Organization.createdAt` → `SHOP` ;
  - `Order.activatedAt` avec un montant > 0 → `PAYMENT` ;
  - `Order` en `FAILED` ou `EXPIRED` (`updatedAt`) → `PAYMENT_FAILED`.
- Contenu : le `detail` donne le prénom et la boutique, ou le pass, le montant (`formatMoney`) et le moyen de paiement. Jamais d'e-mail ni de téléphone.

- [ ] **Step 1 : Tests qui échouent**
  - Les quatre sources sont fusionnées, triées de la plus récente à la plus ancienne.
  - Le filtre `paiements` ne garde que `PAYMENT` et `PAYMENT_FAILED`.
  - `before` donne la page suivante, et `next` vaut `null` sur la dernière.
  - Rien n'est plus vieux que 30 jours.
  - Le `detail` ne contient jamais l'e-mail ni le téléphone des données de test.
  - `countUnreadFeed` compte après `seenAt` de cet admin seulement, ou sur les 30 derniers jours s'il n'a jamais vu le fil, et plafonne à 99.
- [ ] **Step 2 : Tests de la route, du menu et de la vue qui échouent**
  - `POST /api/admin/feed/seen` : sans CSRF → 403 ; en `ADMIN` → 200 `{ seen: true }`, et `markFeedSeen` est appelé avec l'id de cet admin.
  - `ADMIN_NAV` : Notifications en 2e, Paramètres en dernier.
  - `AdminNav` avec `unread = 3` affiche une pastille « 3 », avec le nom accessible « 3 nouvelles notifications ». Avec 0, pas de pastille.
  - `FeedView` affiche les filtres en liens (`?type=`), et « Voir plus » quand `next` existe.
- [ ] **Step 3 :** les lancer. Attendu : échec.
- [ ] **Step 4 : Le code**
  - `FeedSeen` est un îlot client qui appelle la route une fois, au montage. Une prélecture de lien ne marque donc rien comme vu.
  - Le layout calcule `unread` et le passe à `AdminShell`.
- [ ] **Step 5 :** les tests de la tâche, plus `src/components/admin` et `src/lib/tamani/admin-nav`. Attendu : tout passe.
- [ ] **Step 6 : Commit** `feat(admin): notifications feed of sign-ups, shops and payments, with a badge`

### Task 5 : La recette, la documentation et la PR

- [ ] **Step 1 : La barrière.** `pnpm format && pnpm lint && pnpm typecheck && pnpm test`, puis `pnpm build`.
- [ ] **Step 2 : La migration sur Neon.** Appliquer `9k_platform_settings` (`migrate deploy` depuis `frontend/`, avec l'accord du porteur si l'outil le demande). Elle ne fait qu'ajouter deux tables.
- [ ] **Step 3 : La recette** sur le build de production (`next start` sur le port 3001), avec le compte super-admin du porteur ou un compte de recette qu'il accepte, à 390 et 1280 px :
  - les Paramètres s'enregistrent, et l'accueil montre le nouveau lien après régénération ;
  - un admin s'ajoute puis se retire ;
  - le fil montre les dernières inscriptions, et la pastille disparaît après la visite ;
  - aucun débordement, et des cibles d'au moins 44 px.
- [ ] **Step 4 : La documentation**
  - Créer `docs/claude/tamani-lot-13-super-admin.md` (13a).
  - Ajouter la ligne du tableau « Tamani detail » de `CLAUDE.md`.
  - Ajouter la section « Lot 13 » de la feuille de route, avec les décisions du porteur et les choix de l'agent (spec §13).
- [ ] **Step 5 : La PR.** Pousser la branche et ouvrir la PR (corps en français). Elle se fusionne après la PR #18 et avec l'accord du porteur.

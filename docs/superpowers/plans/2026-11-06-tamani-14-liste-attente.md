# Lot 14 : la liste d'attente — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** une page `/liste-attente` où un vendeur réserve sa place (prénom, WhatsApp ou e-mail, où il vend), le site qui y mène, et la liste avec son export dans le support-admin.

**Architecture :**
- Une table `WaitlistEntry`.
- Une route publique sans CSRF, limitée par IP, avec un champ caché contre les robots.
- La page est un composant serveur ; le formulaire est un îlot client.
- Une constante unique, `LANDING_SIGNUP_HREF`, mène les boutons du site vers la liste.

**Tech Stack :** Next.js 16 App Router, Prisma 5 + Neon, Vitest, Tailwind 4, `landing.css` du lot 12.

**Spec :** [docs/superpowers/specs/2026-11-06-tamani-liste-attente-design.md](../specs/2026-11-06-tamani-liste-attente-design.md)

**Branche :** `plan/14-liste-attente`, partie de `main` (91bbade).

## Global Constraints

- **Les routes :**
  - chaque route : `export const runtime = 'nodejs'` ;
  - la route publique : `enforcePublicRateLimit`, jamais `verifyCsrf` (`public-routes.test.ts`) ;
  - les routes admin : `requireAdmin('ADMIN')` puis `enforceAdminRateLimit`.
- **La confidentialité :** jamais de numéro, d'e-mail ni de prénom dans un `log`.
- **Les erreurs :** `tamaniError(code, status)`, codes de `TAMANI_ERRORS` (`INVALID_PHONE`, `RATE_LIMITED`) ; `VALIDATION_FAILED` par `validationFailed()`.
- **La base :** migration `9j_waitlist` (lettre, jamais `10_`).
- **Le style :** jetons uniquement, pas de palette Tailwind par défaut ; textes en français simple, sans tiret long.
- **Aucun fichier protégé modifié.**

## Review Focus

1. **Le même contact deux fois** (même WhatsApp écrit autrement, même e-mail en majuscules) : un seul inscrit, la même place rendue. Testé (Task 1).
2. **Deux envois simultanés** du même contact : le second tombe sur la contrainte unique (P2002) et rend la place du premier, sans erreur 500. Testé (Task 1).
3. **Un robot** qui remplit le champ caché : réponse normale, rien d'écrit. Testé (Task 2).
4. **Une source bizarre** (`?src=<script>`, 300 caractères) : ignorée, jamais affichée telle quelle. Testé (Task 1).
5. **L'app en place** : `/signup` marche toujours en direct, la connexion reste dans le menu. Testé (Task 3).

---

### Task 1 : Les données et les règles

**Files :**
- Modify : `frontend/prisma/schema.prisma` ; Create : `frontend/prisma/migrations/9j_waitlist/migration.sql`
- Create : `frontend/src/lib/tamani/waitlist.ts`, `waitlist.test.ts` (partagé avec le navigateur)
- Create : `frontend/src/lib/server/tamani/waitlist.ts`, `waitlist.test.ts`
- Modify : `frontend/src/lib/server/tamani/schema-tamani.test.ts`

**Interfaces — Produces :**
- `model WaitlistEntry { id String @id @default(cuid()); firstName String; phone String? @unique; email String? @unique; channels String[]; source String?; consentAt DateTime; createdAt DateTime @default(now()); @@index([createdAt]) }`
- `WAITLIST_CHANNELS` = `['CHAINE_WHATSAPP','GROUPE_WHATSAPP','TIKTOK','FACEBOOK','INSTAGRAM','BOUTIQUE']`, avec `waitlistChannelLabel(c)`.
- `WaitlistInput` (zod, partagé) :
  - `firstName` 1 à 40 caractères ;
  - `phone?` et `country` (ISO-2), `email?` ;
  - `channels` (sous-ensemble) ;
  - `source?` ;
  - `consent: true` ;
  - `website?` (piège à robots) ;
  - un `refine` : au moins le téléphone ou l'e-mail.
- `cleanSource(raw: unknown): string | null` : `^[a-z0-9-]{1,40}$` après passage en minuscules, sinon `null`.
- `joinWaitlist(db, input: { firstName; phone: string | null; email: string | null; channels; source }, now) → { position: number; firstName: string; already: boolean }` :
  - cherche l'inscrit existant par le téléphone ou par l'e-mail ;
  - sinon le crée ;
  - une P2002 est relue comme « déjà inscrit » ;
  - `position` = le nombre d'inscrits créés avant lui, plus un.
- `waitlistCount(db) → number`.

- [ ] **Step 1 : Tests qui échouent.**
  - `cleanSource('TikTok-J01')` → `'tiktok-j01'` ; `cleanSource('<script>')`, `cleanSource('x'.repeat(41))` et `cleanSource(3)` → `null`.
  - `WaitlistInput` refuse : sans téléphone ni e-mail, sans `consent`, un prénom vide, un e-mail invalide.
  - `joinWaitlist` :
    - crée un inscrit et rend `position` (le compte des plus anciens, plus un) ;
    - un e-mail déjà connu, écrit en majuscules → `already: true`, même rang, aucun `create` ;
    - un `create` qui lève P2002 → relit et rend `already: true`.
  - `schema-tamani` : la migration `9j_waitlist` existe, et `WaitlistEntry` a `phone` et `email` uniques.
- [ ] **Step 2 :** les lancer. Attendu : échec.
- [ ] **Step 3 : Le code.** La migration écrite à la main, sur le modèle de `9h`, puis `prisma generate`.
- [ ] **Step 4 :** les lancer. Attendu : tout passe.
- [ ] **Step 5 : Commit** `feat(waitlist): the waitlist table and its rules`

### Task 2 : La page et la route publique

**Files :**
- Create : `frontend/src/app/api/public/waitlist/route.ts`, `route.test.ts`
- Create : `frontend/src/app/(public)/liste-attente/page.tsx`, `page.test.tsx`
- Create : `frontend/src/components/landing/waitlist/WaitlistForm.tsx`, `WaitlistThanks.tsx`, `waitlist.test.tsx`
- Modify : `frontend/src/app/sitemap.ts` et son test, `frontend/src/lib/tamani/landing.ts` (les textes de la page)

**Interfaces :**
- `POST /api/public/waitlist`, avec le corps `WaitlistInput` ; réponse `{ position, firstName }`.
  - Avec `website` rempli → 200 `{ position: 0, firstName }`, rien d'écrit.
  - Un numéro illisible → 400 `INVALID_PHONE`.
- `enforcePublicRateLimit(req, 'waitlist', 'form')`.

- [ ] **Step 1 : Tests de route qui échouent.**
  - Un corps valide → 200 avec le rang ; `normalizePhone` range le numéro au format international ; l'e-mail est en minuscules.
  - Le piège à robots → 200 sans écriture.
  - Pas de contact → 400 `VALIDATION_FAILED`.
  - Un numéro illisible → 400 `INVALID_PHONE`.
  - Au-delà de la limite → 429.
  - Aucun `log` ne reçoit le numéro ni l'e-mail.
- [ ] **Step 2 : Tests de page qui échouent.**
  - La page a un seul `h1`, le formulaire avec chaque champ étiqueté, la case d'accord et la section vidéo `id="film"`.
  - Pas de compteur sous 50 inscrits ; « 50 vendeurs ont déjà réservé leur place » à 50.
  - `WaitlistThanks` dit « Ta place est réservée, Awa ! » et « Tu es n° 12 », avec un lien `https://wa.me/?text=` qui contient `src%3Dparrainage`.
  - La page est dans le sitemap.
- [ ] **Step 3 :** les lancer. Attendu : échec.
- [ ] **Step 4 : Le code.**
  - Le formulaire lit `src` dans l'adresse, puis envoie avec `api()` (sans `JSON.stringify`, `api-body.test.ts`).
  - Les erreurs passent par `errorMessage()`.
  - La page lit `waitlistCount(prisma)` en cas de base injoignable : sans compteur, la page se construit quand même, et elle se reconstruit au plus toutes les 10 minutes (`revalidate = 600`).
- [ ] **Step 5 :** les tests de la tâche, `src/components/landing` et `src/app/(public)`. Attendu : tout passe.
- [ ] **Step 6 : Commit** `feat(waitlist): the waitlist page and its public route`

### Task 3 : Le site mène à la liste

**Files :**
- Modify : `frontend/src/lib/tamani/landing.ts`, avec `LANDING_SIGNUP_HREF = '/liste-attente'` et `LANDING_SIGNUP_LABEL = 'Réserver ma place'`
- Modify :
  - `Hero`, `FinalCta`, `Steps`, `Solution`, `BeforeAfter`, `Community`, `StickyCta` ;
  - `LandingNav` (la barre et le tiroir), `LandingFooter` ;
  - `forfaits/PlanGrid.tsx` ;
  - leurs tests.

- [ ] **Step 1 : Tests qui échouent.**
  - Aucun `href="/signup"` dans l'accueil ni dans `/forfaits`.
  - Les boutons mènent à `/liste-attente`.
  - `/login` reste dans le menu.
  - La page `/signup` se rend toujours.
- [ ] **Step 2 :** les lancer. Attendu : échec.
- [ ] **Step 3 : Le code.** Les libellés d'appel deviennent « Réserver ma place » ; les phrases autour gardent leur sens, sans promettre un essai immédiat.
- [ ] **Step 4 :** `src/components/landing`, `src/app/(public)` et `src/app/(auth)`. Attendu : tout passe.
- [ ] **Step 5 : Commit** `feat(landing): every sign-up button leads to the waitlist before launch`

### Task 4 : La liste dans le support-admin

**Files :**
- Create : `frontend/src/app/(admin)/support-admin/liste-attente/page.tsx`
- Create : `frontend/src/components/admin/WaitlistView.tsx`, `waitlist.test.tsx`
- Create : `frontend/src/app/api/admin/waitlist/export/route.ts`, `route.test.ts`
- Modify : `frontend/src/lib/tamani/admin-nav.ts` et son test ; `frontend/src/lib/server/tamani/waitlist.ts` (`listWaitlist`, `waitlistStats`)

**Interfaces — Produces :**
- `listWaitlist(db) → WaitlistRow[]` : du plus récent au plus ancien, avec le rang.
- `waitlistStats(db, now) → { total, thisWeek, bySource: { source, count }[] }`.
- `GET /api/admin/waitlist/export` (ADMIN) → CSV `toExcelCsv`, nom `liste-attente-AAAA-MM-JJ.csv`, `cache-control: no-store`.

- [ ] **Step 1 : Tests qui échouent.**
  - La vue montre le total, la semaine et les sources ; chaque ligne a le rang, le prénom, le WhatsApp, l'e-mail, les canaux en mots et la source ; le lien d'export est présent.
  - Une liste vide → « Personne pour l'instant. »
  - L'export : 403 sans le rôle ; 200 avec les colonnes `Rang;Prénom;WhatsApp;E-mail;Où il vend;Source;Date`.
  - `ADMIN_NAV` contient « Liste d'attente ».
- [ ] **Step 2 :** les lancer. Attendu : échec.
- [ ] **Step 3 : Le code.**
- [ ] **Step 4 :** les tests de la tâche, `src/components/admin` et `src/app/api/admin`. Attendu : tout passe.
- [ ] **Step 5 : Commit** `feat(admin): the waitlist and its export in the support-admin`

### Task 5 : La recette, la documentation et la PR

- [ ] **Le gate :** `pnpm format && pnpm lint && pnpm typecheck && pnpm test`, puis `pnpm build`.
- [ ] **La migration `9j_waitlist` sur Neon** (accord du porteur demandé avant).
- [ ] **La recette sur la vraie app :**
  - en 390, 768 et 1280 px ;
  - une inscription, la même deux fois, le piège à robots ;
  - la liste et l'export dans le support-admin.
- [ ] **La documentation :**
  - `docs/claude/tamani-lot-14-liste-attente.md` ;
  - une ligne dans le tableau de `CLAUDE.md` ;
  - « Lot 14 » dans la feuille de route.
- [ ] **La PR** vers `main`, fusionnée avec l'accord du porteur.

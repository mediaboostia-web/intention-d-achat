# Tamani — Lot 4 : Espace grossiste (UI)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** donner au grossiste son espace, dans le style « Cahier du marché » : connexion, création de la boutique, navigation, produits, création et partage d'une campagne, réglages. Le tout repose sur les API du lot 3. On retire aussi la palette Tailwind par défaut.

**Architecture :**
- La logique d'écran est **pure et testée** dans `frontend/src/lib/tamani/` : lecture des montants, redirection sûre, assistant de campagne, actions de statut, messages d'erreur, navigation, pays.
- Les composants de présentation vont dans `frontend/src/components/ui/`. Ce sont des composants serveur, testés en HTML statique.
- Les composants interactifs (`'use client'`) vont dans `frontend/src/components/app/`.
- Les pages restent minces : chargement des données, puis composition.
- Groupes de routes :
  - `(auth)` : pages de connexion, sans fournisseur de session ;
  - `(app)` : fournisseurs du kit (`ToastProvider`, `AuthProvider`). En dessous, `app/layout.tsx` ajoute `ShopGate` (boutique chargée, sinon `/app/bienvenue`) et la coquille de navigation.
- L'envoi des photos passe par `uploadPhoto()`, un `fetch` multipart. On ne touche pas à `lib/api.ts`, qui est protégé et n'envoie que du JSON.

**Tech Stack :** Next.js 16 App Router (composants client, `useRouter`, `useSearchParams` sous `Suspense`), React 19, Tailwind v4 (tokens du lot 2), Vitest 3 (`renderToStaticMarkup`, `next/navigation` simulé), Chrome headless par CDP pour la recette visuelle, avec des réponses d'API simulées.

**Spec :** [docs/superpowers/specs/2026-10-24-tamani-design.md](../specs/2026-10-24-tamani-design.md) §5.1, §5.2, §5.6, §6.4. **Charte :** [docs/brand/tamani-brand.md](../../brand/tamani-brand.md). **Feuille de route :** [2026-10-24-tamani-roadmap.md](2026-10-24-tamani-roadmap.md), lot 4. **API consommées :** lot 3 (`/api/shops/**`) et le kit (`/api/auth/*`, `/api/upload`).

## Global Constraints

- **Charte** :
  - tutoiement, phrases courtes, aucun emoji dans l'interface ;
  - Andika pour le texte, Kalam pour les titres et les notes seulement, Bowlby One pour les chiffres qui comptent ;
  - **une seule audace par écran** : `shadow-press` ne va que sur le geste principal (« Lancer la campagne », « Créer ma boutique », « Se connecter ») ;
  - contenu aligné à gauche ; `bg-paper` comme fond des pages.
- **Couleurs** : uniquement les tokens du lot 2. Après la tâche 8, aucune classe de la palette Tailwind par défaut (`gray-600`, `red-500`, `bg-white`…) sous `src/`.
- **Accessibilité** :
  - cibles ≥ 48 px, texte des champs ≥ 16 px ;
  - chaque champ a son `<label>`, et les erreurs sont reliées par `aria-describedby` (`FieldShell`) ;
  - focus visible ;
  - `prefers-reduced-motion` respecté.
- **Mobile d'abord** : aucun défilement horizontal à 320 px. Barre de navigation en bas sous `lg`, barre latérale à partir de `lg` (1024 px).
- **Erreurs** :
  - le front lit `ApiError.code`, jamais le message ;
  - chaque code connu a un texte français dans `errorMessage()` ;
  - une erreur dit ce qui s'est passé et quoi faire.
- **Redirections** : après la connexion, on ne suit `?next=` que vers un chemin interne (`safeNextPath`). Par défaut : `/app`.
- **Montants saisis** : lus par `parseFcfa` (entier FCFA > 0), jamais envoyés en décimal.
- **Fichiers protégés** : `lib/api.ts`, `middleware/*`, `auth.ts` et les autres fichiers protégés ne sont pas modifiés. `frontend/middleware.ts` ne l'est pas non plus : il lit déjà `AUTH_PROTECTED_PREFIXES` et `AUTH_LOGIN_PATH`.
- **Variables d'environnement** :
  - `AUTH_PROTECTED_PREFIXES="/app,/admin"` et `AUTH_LOGIN_PATH="/login"`, ajoutées à `.env.example` (avec un commentaire) ;
  - les mêmes lignes ajoutées par Edit dans `frontend/.env.local` (aucun secret).
- **Tests ciblés** : `npx vitest run <chemin>` depuis `frontend/`. Barrière avant chaque commit : `pnpm format && pnpm lint && pnpm typecheck && pnpm test`. Fin de lot : `pnpm build`, puis recette visuelle à 320, 390 et 1280 px.
- **Réseau du poste** : Neon répond lentement (voir la mémoire du projet). Pour lancer `next dev`, exporter `DATABASE_URL` et `DIRECT_URL` avec `connect_timeout=60&pool_timeout=60`. La recette visuelle sert des réponses d'API simulées par CDP, sans dépendre de la base.
- Commits en Conventional Commits, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **`?next=` piégé** (`//evil.com`, `https://evil.com`, `/\evil.com`, `javascript:`) après la connexion : on reste dans l'app (`/app`). → Tâche 1, `safeNextPath refuses anything that leaves the site`.
2. **Le 4ᵉ lancement d'une boutique FREE** depuis l'assistant : un message clair (« Tu as déjà 3 campagnes actives… »), l'assistant garde toutes les saisies et propose « Enregistrer en brouillon ». → Tâche 1, `errorMessage explains CAMPAIGN_LIMIT_REACHED` ; Tâche 6, `wizard keeps its state after a failed launch`.
3. **Un prix tapé « 7 500 », « 7.500 », « 7500 F » ou « 7,5 »** : les trois premiers donnent 7 500, le dernier est refusé avec un message, et rien n'est envoyé. → Tâche 1, `parseFcfa reads the ways a price is typed`.
4. **L'envoi d'une photo échoue** (Cloudinary absent → 503, trop lourde → 413, mauvais format → 415, ou réseau) : un message français précis. Les autres champs du formulaire restent remplis. → Tâche 1, `uploadErrorMessage covers the upload route codes` ; Tâche 5, `PhotoPicker shows the error and keeps the photos already added`.
5. **Un nouveau compte qui ouvre `/app`** va vers `/app/bienvenue`. **Un compte qui a déjà sa boutique et ouvre `/app/bienvenue`** revient vers `/app`. **Une session expirée** mène à `/login?next=…`. → Tâche 1, `gateDecision routes by session and shop`.

---

### Task 1 : Logique d'interface partagée

**Files:**
- Create: `frontend/src/lib/tamani/safe-next.ts`, `fcfa-input.ts`, `api-messages.ts`, `countries.ts`, `nav.ts`, `shop-gate.ts`, `campaign-actions.ts`, `campaign-wizard.ts`, `product-rules.ts`, `product-form.ts`, `dates.ts`
- Modify: `frontend/src/lib/server/tamani/inputs.ts` (importe `checkProductRules` depuis `@/lib/tamani/product-rules` au lieu de le définir)
- Test: un `*.test.ts` par module, à côté

**Interfaces:**
- Produces (tout est pur, sans import serveur) :
  - `safeNextPath(raw: string | null | undefined, fallback = '/app'): string`. N'accepte qu'un chemin qui commence par un seul `/`, sans `\`, sans schéma et sans caractère de contrôle.
  - `parseFcfa(raw: string): number | null` : entier ≥ 1 et ≤ 100 000 000.
    - Les espaces (dont les espaces insécables), les points de milliers et un suffixe `F`, `FCFA` ou `CFA` sont ignorés.
    - Une virgule ou un point décimal (`7,5`, `7500.50`) donne `null`.
  - `parseCount(raw: string, min = 0): number | null` : entier ≥ `min`.
  - `errorMessage(err: unknown): string` : texte français.
    - Codes Tamani : `TAMANI_ERRORS`.
    - Codes du kit : `INVALID_CREDENTIALS`, `EMAIL_NOT_VERIFIED`, `TOO_MANY_LOGIN_ATTEMPTS`, `TOO_MANY_SIGNUP_ATTEMPTS`, `TOO_MANY_RESET_REQUESTS`, `TOO_MANY_RESET_ATTEMPTS`, `INVALID_CODE`, `VALIDATION_FAILED`, `ORG_ROLE_INSUFFICIENT`, et tout autre code présent dans le type `ApiErrorCode` de `lib/api.ts`.
    - Sans code : par statut (401 → « Ta session a expiré… », 429, ≥ 500) ; `TypeError` réseau → « Pas de connexion… ».
  - `uploadErrorMessage(status: number, code: string | null): string` : `STORAGE_NOT_CONFIGURED`, `FILE_TOO_LARGE`, `INVALID_MIME`, `MAGIC_BYTE_MISMATCH`, `UPLOAD_MISSING_FILE`, `UPLOAD_FAILED`, et le réseau (`status = 0`).
  - `SHOP_COUNTRIES: ReadonlyArray<{ code: string; label: string; dialCode: string }>` : SN Sénégal +221 (en premier), CI Côte d'Ivoire +225, ML Mali +223, BF Burkina Faso +226, TG Togo +228, BJ Bénin +229, NE Niger +227, GN Guinée +224, CM Cameroun +237. Plus `dialCodeFor(code): string` (repli `+221`).
  - `APP_NAV: ReadonlyArray<{ id; label; href; icon }>`, dans l'ordre Accueil `/app`, Campagnes `/app/campagnes`, Commandes `/app/commandes`, Clients `/app/clients`, Plus `/app/plus`. Plus `DESKTOP_EXTRA_NAV` : Produits `/app/produits`, Réglages `/app/reglages`. Plus `isNavActive(href, pathname): boolean` (`/app` n'est actif que sur `/app` exactement).
  - `gateDecision(i: { authLoading: boolean; signedIn: boolean; shop: 'loading' | 'none' | 'ready' | 'error'; pathname: string }): { kind: 'wait' } | { kind: 'redirect'; to: string } | { kind: 'shell' } | { kind: 'bare' }`.
    - Non connecté → `/login?next=<pathname encodé>`.
    - Sans boutique hors de `/app/bienvenue` → `/app/bienvenue`.
    - Boutique prête sur `/app/bienvenue` → `/app`.
    - Sans boutique sur `/app/bienvenue` → `bare`.
    - Boutique prête ailleurs → `shell`.
    - `error` → `shell` : la page affiche l'erreur.
  - `CAMPAIGN_STATUS_LABELS` : `DRAFT` « Brouillon », `ACTIVE` « En cours », `CLOSED` « Terminée », `ARRIVED` « Arrivée ».
  - `campaignActions(status): ReadonlyArray<{ to: CampaignStatus; label: string }>` : `DRAFT` → « Lancer » ; `ACTIVE` → « Terminer », « Produit arrivé » ; `CLOSED` → « Rouvrir », « Produit arrivé » ; `ARRIVED` → « Terminer ». Le type `CampaignStatus` est redéclaré ici à l'identique : le module serveur importe `server-only`.
  - `formatDateFr(d: Date): string` → `'3 novembre'`, ou `'3 novembre 2027'` si l'année diffère de `now`. Plus `addDays(now: Date, n: number): Date`.
  - `checkProductRules` (déplacé tel quel du lot 3).
  - `productFormToBody(v: ProductFormValues): { ok: true; body: ProductBody } | { ok: false; errors: Partial<Record<keyof ProductFormValues, string>> }`. Les valeurs du formulaire sont des chaînes ; on utilise `parseFcfa` et `parseCount`, puis `checkProductRules`, dont l'erreur est rattachée au champ concerné.
  - `campaign-wizard.ts` :
    - `WIZARD_STEPS` = `['product', 'availability', 'quantities', 'end', 'delivery', 'message']` ;
    - `type WizardState`, `initialWizardState(now)`, `wizardReducer(state, action)` avec les actions `set`, `next`, `back`, `goto` et `failed` (garde l'état et range l'erreur) ;
    - `canAdvance(state): boolean` ;
    - `toCampaignBody(state, status: 'DRAFT' | 'ACTIVE'): Record<string, unknown>` : dates en ISO, quantités en entiers ou `null`, `shareTemplate` du message.

- [ ] **Step 1 : Écrire les tests qui échouent** (un fichier par module) :
  - **`safeNextPath refuses anything that leaves the site`** : `'/app/produits?x=1'` est gardé ; `'//evil.com'`, `'https://evil.com'`, `'/\\evil.com'`, `'javascript:alert(1)'`, `''`, `null` et `'app'` donnent `'/app'`.
  - **`parseFcfa reads the ways a price is typed`** : `'7 500'`, `'7 500'` (espace insécable), `'7.500'`, `'7500 F'`, `'7 500 FCFA'`, `'7500'` → 7500 ; `'7,5'`, `'7500.50'`, `'0'`, `'-5'`, `'abc'`, `''`, `'100000001'` → `null`.
  - `parseCount` : `'12'` → 12 ; `'0'` avec `min = 1` → `null`.
  - **`errorMessage explains CAMPAIGN_LIMIT_REACHED`** : le texte contient `3 campagnes` et `brouillon`. Tous les codes de `TAMANI_ERRORS` ont un texte non vide qui ne vaut pas le texte générique. `INVALID_CREDENTIALS` → « Email ou mot de passe incorrect. » Un `TypeError` donne un texte qui contient « connexion ».
  - **`uploadErrorMessage covers the upload route codes`** : `FILE_TOO_LARGE` cite la taille maximale ; `INVALID_MIME` cite « JPG, PNG ou WebP » ; `STORAGE_NOT_CONFIGURED` dit que l'envoi de photos n'est pas encore activé ; `status = 0` → texte réseau.
  - `SHOP_COUNTRIES` commence par SN ; `dialCodeFor('ML') === '+223'`, `dialCodeFor('XX') === '+221'`.
  - `isNavActive` : `/app` est actif sur `/app` seulement ; `/app/campagnes` est actif sur `/app/campagnes/abc`.
  - **`gateDecision routes by session and shop`** : les six cas ci-dessus, plus `authLoading` → `wait` et `shop: 'loading'` → `wait`.
  - `campaignActions` : la table ci-dessus. `campaign actions follow the server transitions` : chaque `to` est permis par `canTransitionCampaign` du lot 3 (le test importe les deux modules).
  - `formatDateFr` : `2026-11-03` vu le `2026-10-24` → `'3 novembre'` ; `2027-01-05` → `'5 janvier 2027'`.
  - `productFormToBody` :
    - `{ name: 'Marmites', unitPrice: '7 500', wholesalePrice: '6000', wholesaleMinQty: '12', … }` → `ok` avec `unitPrice: 7500` ;
    - gros sans minimum → `errors.wholesaleMinQty` ;
    - prix illisible → `errors.unitPrice`.
  - `campaign-wizard` :
    - `canAdvance` est faux à l'étape `product` sans produit ;
    - `next` et `back` bornés ;
    - `failed` garde toutes les valeurs ;
    - `toCampaignBody` en `INCOMING` « dans 10 jours » donne `availableAt` = now + 10 j en ISO, avec `stockQuantity: null` quand le champ est vide ;
    - le message par défaut vaut `DEFAULT_SHARE_TEMPLATE`.
- [ ] **Step 2 : Lancer.** `npx vitest run src/lib/tamani` → FAIL (modules absents).
- [ ] **Step 3 : Implémenter**, puis déplacer `checkProductRules` (la suite du lot 3 doit rester verte).
- [ ] **Step 4 : Relancer.** `npx vitest run src/lib/tamani src/lib/server/tamani "src/app/api/shops"` → PASS.
- [ ] **Step 5 : Barrière et commit.** `feat(tamani): add the shared screen logic of the shop space`.

---

### Task 2 : Composants du kit pour l'espace grossiste

**Files:**
- Create: `frontend/src/components/ui/Textarea.tsx`, `Select.tsx`, `Switch.tsx`, `Notice.tsx`, `Steps.tsx`, `Tabs.tsx`, `PageHeader.tsx`, `NavBar.tsx` (`BottomNav`, `SideNav`), `icons.tsx`
- Modify: `frontend/src/components/ui/index.ts`
- Test: `frontend/src/components/ui/shell.test.tsx`

**Interfaces:**
- Consumes : `FieldShell` et `fieldIds` (`Input.tsx`), `cn`, `APP_NAV`, `DESKTOP_EXTRA_NAV` et `isNavActive` (Tâche 1).
- Produces (composants serveur, sans état ; les champs sont contrôlés par la page) :
  - `Textarea(props: FieldProps & TextareaHTMLAttributes)` et `Select(props: FieldProps & SelectHTMLAttributes & { options: ReadonlyArray<{ value: string; label: string }> })`, tous deux dans `FieldShell`, `frame rounded-control`, texte `text-base`.
  - `Switch({ id, label, hint?, checked, onChange?, name? })` : `<input type="checkbox" role="switch">` réel, cible ≥ 48 px.
  - `Notice({ tone: 'info' | 'warning' | 'danger', title?, children, action? })` : `role="alert"` pour `danger`, `role="status"` sinon.
  - `Steps({ current: number; total: number; title: string })` : « Étape 2 sur 6 » en `font-sans`, le titre en `font-hand`, et une barre `aria-hidden`.
  - `Tabs({ label, items: { id; label; href; active? }[] })` : `<nav aria-label>`, `aria-current="page"` sur l'actif.
  - `PageHeader({ title, note?, action? })` : titre `font-hand text-3xl text-primary`, note au crayon, action alignée à droite à partir de `sm`.
  - `BottomNav({ pathname })` : `fixed bottom-0`, 5 entrées icône + libellé, `lg:hidden`, rembourrage `env(safe-area-inset-bottom)`.
  - `SideNav({ pathname, shopName })` : `hidden lg:flex`, logo, nom de la boutique, `APP_NAV` sans « Plus » + `DESKTOP_EXTRA_NAV`.
  - `icons.tsx` : `Icon({ name, className })` pour `home`, `megaphone`, `receipt`, `people`, `more`, `box`, `gear`, `plus`, `copy`, `link`, `photo`, `check`, `lock`. Tracé au stylo : `stroke="currentColor"`, `strokeWidth={2}`, `strokeLinecap="round"`.

- [ ] **Step 1 : Écrire les tests qui échouent** (`renderToStaticMarkup`, aides `test-html.ts`) :
  - `Textarea and Select link their label, hint and error` : `for`, `aria-describedby` et `aria-invalid` ;
  - `Select renders every option` ;
  - `Switch is a real checkbox with role switch and a 48px target` ;
  - `Notice danger is an alert, info a status` ;
  - `Steps reads "Étape 2 sur 6"` ;
  - `Tabs marks the active tab with aria-current` ;
  - `BottomNav lists the five entries in order and marks the current one` (sur `/app/campagnes/abc`, Campagnes porte `aria-current="page"`) ;
  - `BottomNav hides from lg up and SideNav shows from lg up` ;
  - `icons use currentColor and no fill colour`.
- [ ] **Step 2 : Lancer.** `npx vitest run src/components/ui/shell.test.tsx` → FAIL.
- [ ] **Step 3 : Implémenter**, puis ajouter les nouveaux composants dans `/styleguide` (section « Espace grossiste ») pour la recette visuelle.
- [ ] **Step 4 : Relancer.** `npx vitest run src/components src/app/(public)/styleguide` → PASS.
- [ ] **Step 5 : Barrière et commit.** `feat(ui): add form, navigation and notice components for the shop space`.

---

### Task 3 : Pages d'authentification

**Files:**
- Create: `frontend/src/app/(auth)/layout.tsx`, `(auth)/login/page.tsx`, `(auth)/signup/page.tsx`, `(auth)/verify-email/page.tsx`, `(auth)/forgot-password/page.tsx`, `(auth)/reset-password/page.tsx`
- Move: `frontend/src/app/(public)/auth/error/page.tsx` → `frontend/src/app/(auth)/auth/error/page.tsx` (réécrit)
- Create: `frontend/src/components/app/AuthForm.tsx` (cadre commun : titre, erreur, bouton) et `frontend/src/test-utils/next-navigation.ts` (simulation de `next/navigation`)
- Modify: `.env.example`, `frontend/.env.local` (les deux variables `AUTH_*`)
- Test: `frontend/src/app/(auth)/auth-pages.test.tsx`

**Interfaces:**
- Consumes : `api`, `ApiError` et `storeCsrfToken` (kit) ; `safeNextPath`, `errorMessage` (Tâche 1) ; `Input`, `Button`, `Notice`, `Logo` (kit).
- Produces :
  - URLs inchangées par rapport aux exemples (`/login`, `/signup`, `/verify-email?email=&code=`, `/forgot-password`, `/reset-password?email=&code=`, `/auth/error?error=`).
  - Les liens Google pointent vers `/api/auth/oauth/google/start?next=/app`.
  - `mockNextNavigation({ pathname?, search? })` dans `test-utils/next-navigation.ts`, qui renvoie les fonctions `push` et `replace` espionnées.

Choix fixés :
- `(auth)/layout.tsx` : `bg-paper min-h-dvh`, colonne `max-w-sm` à 16 px du bord, `Logo variant="lockup"` en haut, aucun fournisseur.
- Une page = un titre `font-hand` et un seul bouton principal en `shadow-press`.
- Copie :
  - connexion : « Content de te revoir », bouton « Se connecter » ;
  - inscription : « Crée ton espace », bouton « Créer mon compte », note « Tu crées ta boutique juste après. » ;
  - vérification : « Vérifie ton email », champ code à 8 caractères (`autoComplete="one-time-code"`, `inputMode="text"`, majuscules) ;
  - « Mot de passe oublié ? » ; « Choisis un nouveau mot de passe ».
- Après `login` ou `verify-email` : `router.replace(safeNextPath(searchParams.get('next')))`.
- `/login?reset=ok` affiche une `Notice` « Mot de passe changé. Connecte-toi. »
- `useSearchParams` sous `Suspense` (exigé par le rendu statique de Next 16).

- [ ] **Step 1 : Écrire les tests qui échouent** (`next/navigation` simulé, rendu statique) :
  - `login renders labelled email and password fields with autocomplete` (`email`, `current-password`) ;
  - `login offers Google and links to signup and forgot-password` ;
  - `signup asks for a new-password` ;
  - `verify-email prefills the email and code from the URL` ;
  - `auth error maps oauth_email_unverified to French` ;
  - `auth pages use Tamani tokens only` (aucune classe `gray-`, `red-`, `bg-white`…).
- [ ] **Step 2 : Lancer.** `npx vitest run "src/app/(auth)"` → FAIL.
- [ ] **Step 3 : Implémenter** les pages et le cadre, ajouter les variables d'environnement et supprimer l'ancienne page `(public)/auth/error`.
- [ ] **Step 4 : Relancer** → PASS. Puis `npx vitest run src/lib/server/observability` → PASS. Si `env-shape.test.ts` verrouille `.env.example` sans connaître ces clés, on ajoute un cas qui les attend.
- [ ] **Step 5 : Barrière et commit.** `feat(auth): rebuild the auth pages with the Tamani kit and protect /app`.

---

### Task 4 : Coquille de l'espace et bienvenue

**Files:**
- Create: `frontend/src/components/app/ShopProvider.tsx` (`ShopGate` + `useShop()`), `AppShell.tsx`, `ZonesInput.tsx`, `ShopForm.tsx`, `PhotoPicker.tsx`
- Create: `frontend/src/lib/tamani/upload.ts` (`uploadPhoto(file: File): Promise<string>`, URL Cloudinary renvoyée par `/api/upload`)
- Create: `frontend/src/app/(app)/app/layout.tsx`, `(app)/app/bienvenue/page.tsx`, `(app)/app/plus/page.tsx`, `(app)/app/commandes/page.tsx`, `(app)/app/clients/page.tsx`
- Modify: `frontend/src/app/(app)/app/page.tsx` (accueil provisoire, avant le bulletin du lot 6)
- Test: `frontend/src/components/app/shell.test.tsx`, `frontend/src/lib/tamani/upload.test.ts`

**Interfaces:**
- Consumes : `gateDecision`, `SHOP_COUNTRIES`, `dialCodeFor`, `errorMessage`, `uploadErrorMessage` (Tâche 1) ; `BottomNav`, `SideNav`, `PageHeader`, `Notice` (Tâche 2) ; `useAuth` du kit ; API `GET /api/shops/me`, `POST /api/shops`, `POST /api/shops/[orgId]/zones`.
- Produces :
  - `type Shop` : forme de `toShop` du lot 3.
  - `useShop(): { shop: Shop; role: OrgRole; reload(): Promise<void> }`, utilisable sous `ShopGate` quand la boutique est prête.
  - `uploadPhoto(file)` :
    - `POST /api/upload` en multipart, en-tête `x-csrf-token` lu dans le cookie `app-csrf` ;
    - un 401 relance une fois après `api('/api/auth/me')` (qui rafraîchit la session) ;
    - en erreur, lève `UploadError { status; code }`.
  - `PhotoPicker({ value: string[]; onChange; max })`. Il est réutilisé par la Tâche 5 et par le logo.

Choix fixés :
- `ShopGate` (client) :
  - lit la session par `useAuth()` et la boutique par `api('/api/shops/me')` : 404 `SHOP_NOT_FOUND` → `none`, autre erreur → `error` ;
  - applique `gateDecision` ;
  - pendant `wait`, affiche un squelette papier avec « Chargement de ta boutique… » ;
  - pour `redirect`, appelle `router.replace`.
- `AppShell` :
  - `SideNav` à gauche à partir de `lg` ;
  - contenu `max-w-3xl`, `px-4 sm:px-6`, `pb-28 lg:pb-12` (place pour la barre du bas) ;
  - `BottomNav` sous `lg`.
- `/app/bienvenue` (sans coquille) :
  - titre « Bienvenue ! Créons ta boutique. » ;
  - champs : nom ; pays (`Select`, Sénégal par défaut) ; numéro WhatsApp (`PhoneInput` avec l'indicatif du pays) ; logo (facultatif, `PhotoPicker max=1`) ; zones de livraison (`ZonesInput`, puces, facultatif, note « Tu pourras les changer plus tard. ») ;
  - bouton « Créer ma boutique » en `shadow-press` ;
  - à l'envoi : `POST /api/shops`, puis une zone par `POST`, dans l'ordre ;
  - si une zone échoue, la boutique existe déjà : on continue et on prévient dans les Réglages par une `Notice` ;
  - ensuite `router.replace('/app/produits/nouveau?premier=1')`.
- `/app` (provisoire) :
  - « Bonjour, {nom} » en `font-hand` ;
  - `EmptyState` « Lance ta première campagne », avec deux actions : « Ajouter un produit », « Créer une campagne ».
- `/app/commandes` et `/app/clients` : `EmptyState` qui invitent à lancer une campagne (« Tes commandes apparaîtront ici quand tes intéressés passeront commande. »).
- `/app/plus` : liens Produits, Réglages, Forfait (affiche le forfait courant, « Gratuit » ou « Pro jusqu'au … »), « Se déconnecter » (`logout()` puis `router.replace('/login')`).

- [ ] **Step 1 : Écrire les tests qui échouent** :
  - `upload.test.ts` (`fetch` simulé) :
    - `uploadPhoto posts multipart with the csrf header and returns the url` ;
    - `retries once after a 401` ;
    - `throws UploadError with the route code on 413`.
  - `shell.test.tsx` (rendu statique, `next/navigation` simulé, `useShop` fourni par un contexte de test) :
    - `AppShell renders both navs around the page` ;
    - `welcome form labels every field and defaults to Senegal +221` ;
    - `ShopForm shows the error notice it is given` ;
    - `plus page shows the current plan`.
- [ ] **Step 2 : Lancer.** `npx vitest run src/components/app src/lib/tamani/upload.test.ts` → FAIL.
- [ ] **Step 3 : Implémenter.**
- [ ] **Step 4 : Relancer** → PASS.
- [ ] **Step 5 : Barrière et commit.** `feat(app): add the shop gate, navigation shell and welcome flow`.

---

### Task 5 : Produits

**Files:**
- Create: `frontend/src/components/app/ProductForm.tsx`, `frontend/src/components/ui/ProductCard.tsx`
- Create: `frontend/src/app/(app)/app/produits/page.tsx`, `produits/nouveau/page.tsx`, `produits/[id]/page.tsx`
- Test: `frontend/src/components/app/product.test.tsx`

**Interfaces:**
- Consumes : `productFormToBody`, `formatPriceLine`, `errorMessage` ; `PhotoPicker`, `useShop` ; API `GET|POST /api/shops/[orgId]/products` et `GET|PATCH|DELETE …/[productId]`.
- Produces :
  - `ProductCard({ product })` : vignette 64 px, nom, ligne de prix, unité, `Badge` « Archivé » ;
  - `ProductForm({ initial?, submitLabel, onSubmit(body): Promise<void>, error })`.

Choix fixés :
- Ordre des champs :
  1. Nom.
  2. Photos (6 au plus).
  3. Prix à l'unité (FCFA), avec `inputMode="numeric"`.
  4. Unité (`Input` avec suggestions `datalist` : pièce, carton, sac de 25 kg, paquet, douzaine, kg, litre).
  5. Section « Vente en gros », repliée sous un `Switch` « Je vends aussi en gros » : prix de gros et « à partir de » (quantité).
  6. « Prix d'achat », avec la note « Pour calculer ton bénéfice. Jamais montré à tes clients. »
  7. `Switch` « Ce produit a des options » : nom de l'option (« Couleur ») et choix en puces.
  8. Description.
- Les erreurs de `productFormToBody` s'affichent sous leur champ ; une erreur d'API va dans une `Notice` en haut.
- Liste :
  - `FilterBar` « En vente », « Archivés » ;
  - bouton « Voir plus » sur `nextCursor` ;
  - `EmptyState` « Ajoute ton premier produit ».
- `?premier=1` (après la bienvenue) affiche une note au stylo « Ensuite : tu le mets en campagne. »
- Après la création : `router.push('/app/campagnes/nouvelle?produit=<id>')` si `?premier=1`, sinon `/app/produits`.
- Fiche : formulaire prérempli, bouton « Retirer ce produit » (`DELETE`).
  - `{ archived: true }` → toast « Produit archivé : ses campagnes passées restent consultables. »
  - `409 PRODUCT_IN_USE` → `Notice` avec le texte d'`errorMessage`.

- [ ] **Step 1 : Écrire les tests qui échouent** :
  - `ProductCard shows the price line and an Archivé badge` ;
  - `ProductForm labels the purchase price as never shown to clients` ;
  - `ProductForm shows field errors under their field` ;
  - **`PhotoPicker shows the error and keeps the photos already added`** (rendu avec `value` de 2 URL et l'erreur 413 : les deux vignettes et le texte « trop lourde » sont présents) ;
  - `product pages use Tamani tokens only`.
- [ ] **Step 2 : Lancer.** `npx vitest run src/components/app/product.test.tsx` → FAIL.
- [ ] **Step 3 : Implémenter.**
- [ ] **Step 4 : Relancer** → PASS.
- [ ] **Step 5 : Barrière et commit.** `feat(app): add product list, creation and edition`.

---

### Task 6 : Campagnes : liste, assistant, partage

**Files:**
- Create: `frontend/src/components/app/CampaignWizard.tsx`, `ShareCard.tsx`, `CopyButton.tsx`, `SourceLinks.tsx`, `CampaignEditForm.tsx`, `frontend/src/components/ui/CampaignCard.tsx`
- Create: `frontend/src/app/(app)/app/campagnes/page.tsx`, `campagnes/nouvelle/page.tsx`, `campagnes/[id]/page.tsx`
- Test: `frontend/src/components/app/campaign.test.tsx`

**Interfaces:**
- Consumes : `wizardReducer`, `WIZARD_STEPS`, `canAdvance`, `toCampaignBody`, `campaignActions`, `CAMPAIGN_STATUS_LABELS`, `formatDateFr`, `addDays`, `errorMessage` (Tâche 1) ; `renderShareMessage`, `formatPriceLine`, `formatAvailability`, `waShareLink` (lot 3) ; `Steps`, `Tabs`, `Switch`, `ChoiceButton`, `Notice` ; API `/api/shops/[orgId]/campaigns/**`.
- Produces :
  - `CampaignCard({ campaign })` ;
  - `ShareCard({ message, url })` : aperçu en bulle WhatsApp, « Copier le message », « Partager sur WhatsApp » (variante `whatsapp`, lien `waShareLink`), lien principal avec « Copier le lien » ;
  - `CopyButton({ text, label })` : `navigator.clipboard.writeText`, avec repli sur `document.execCommand('copy')`, et l'annonce `role="status"` « Copié ».

Choix fixés :
- Liste :
  - `FilterBar` « En cours » (`?status=ACTIVE`), « Brouillons », « Terminées », « Arrivées », « Toutes » ;
  - `CampaignCard` : photo, titre, `Badge` du statut, ligne de disponibilité, fin « jusqu'au 3 novembre » ;
  - `EmptyState` « Lance ta première campagne ».
- Assistant (`/app/campagnes/nouvelle`, `?produit=` présélectionne) :
  - `Steps` en haut, une question par étape :
    1. Produit : liste de `ChoiceButton` avec photo et prix, plus le lien « Ajouter un produit ».
    2. Disponibilité : « Déjà disponible » ou « Arrive bientôt » ; ce second choix ouvre les raccourcis « Dans 10 jours », « Dans 30 jours » et une date.
    3. Quantités : « Combien en as-tu ? » (stock, facultatif), avec le `Switch` « Montrer le stock à tes clients » ; puis « Combien prévois-tu de commander ? », facultatif, note « Tamani te dira si c'est trop. ».
    4. Fin : « Dans 7 jours », « Dans 14 jours », « Dans 30 jours » ou « Pas de date de fin ».
    5. Livraison : « Je livre » ou « Ils viennent récupérer ». Sans zone, une `Notice` renvoie vers les Réglages.
    6. Message : `Textarea` prérempli, aperçu en direct par `renderShareMessage` avec le lien `tamani.app/c/•••••••`, et le `Switch` « Afficher le nombre d'intéressés ».
  - Boutons « Retour » et « Continuer ». À la dernière étape : « Enregistrer en brouillon » (secondaire) et « Lancer la campagne » (`shadow-press`).
  - En cas d'échec (dont `409 CAMPAIGN_LIMIT_REACHED`) : action `failed`, `Notice` avec `errorMessage`, l'état est gardé.
  - En cas de succès : `router.push('/app/campagnes/<id>?partager=1')`.
- Page campagne (`/app/campagnes/[id]`) :
  - `PageHeader` (titre, `Badge` du statut, produit et prix), puis les boutons de `campaignActions(status)` en `PATCH`. « Terminer » demande une confirmation par `window.confirm`.
  - `Tabs` « Partager » (par défaut) et « Modifier ». Le lot 6 ajoutera « Résultats ».
  - Partager : `ShareCard`, puis `SourceLinks`. En FREE, `SourceLinks` affiche une `Notice` verrouillée « Les liens par source viennent avec le forfait Pro. » avec le `Badge` « Pro ». Il n'y a pas de formulaire, puisque `PLAN_FEATURE_LOCKED` est connu d'avance par `shop.plan`.
  - Modifier : `CampaignEditForm` (titre, fin, stock, quantité prévue, montrer le stock, livraison, compteur, message) → `PATCH`, erreurs par `errorMessage`.

- [ ] **Step 1 : Écrire les tests qui échouent** :
  - `CampaignCard shows status, availability and end date` ;
  - `ShareCard offers copy, WhatsApp share and the link` (le `href` de partage commence par `https://wa.me/?text=`) ;
  - `wizard step 2 shows the 10 and 30 day shortcuts` ;
  - **`wizard keeps its state after a failed launch`** (rendu après une action `failed` avec `CAMPAIGN_LIMIT_REACHED` : la `Notice` et le message saisi sont présents, « Enregistrer en brouillon » aussi) ;
  - `SourceLinks on FREE shows the Pro lock and no form` ;
  - `campaign page actions match campaignActions`.
- [ ] **Step 2 : Lancer.** `npx vitest run src/components/app/campaign.test.tsx` → FAIL.
- [ ] **Step 3 : Implémenter.**
- [ ] **Step 4 : Relancer** → PASS.
- [ ] **Step 5 : Barrière et commit.** `feat(app): add campaign list, creation wizard and share page`.

---

### Task 7 : Réglages

**Files:**
- Modify (réécriture) : `frontend/src/app/(app)/app/reglages/page.tsx`
- Create: `frontend/src/components/app/ZoneEditor.tsx`, `CoefficientsForm.tsx`, `AccountSection.tsx`
- Test: `frontend/src/components/app/settings.test.tsx`

**Interfaces:**
- Consumes : `ShopForm` (Tâche 4, mode modification) ; `useShop().reload` ; API `PATCH /api/shops/[orgId]`, zones (`GET|POST`, `PATCH|DELETE /[zoneId]`) ; routes de compte du kit (`/api/auth/change-password`, `/api/auth/set-password`, le lien Google), dont la logique est reprise de l'ancienne page.
- Produces : la page `/app/reglages` en quatre `Card` : « Ta boutique », « Zones de livraison », « Estimation », « Ton compte ».

Choix fixés :
- Estimation :
  - deux curseurs `input type="range"` de 0 à 100 %, par pas de 5 : « Sur 10 usagers intéressés, combien achètent vraiment ? », et la même question pour les revendeurs ;
  - lecture en clair (« 5 sur 10 ») ;
  - enregistrement en `PATCH` de `coefConsumer` et `coefReseller` (valeur / 100) ;
  - note : « Par défaut : 5 usagers et 7 revendeurs sur 10. Tamani apprendra tes vrais chiffres. »
- Zones : liste éditable (renommer en place, supprimer avec confirmation), ajout en bas, `409 ZONE_ALREADY_EXISTS` → message sous le champ.
- Les sections réservées au rôle `ADMIN` (boutique, zones, estimation) sont désactivées avec une `Notice` pour un `MEMBER`.
- Compte : email, changement ou définition du mot de passe (logique reprise), Google lié ou bouton « Lier mon compte Google » (`?next=/app/reglages`), « Se déconnecter ».

- [ ] **Step 1 : Écrire les tests qui échouent** :
  - `CoefficientsForm reads 0.5 as 5 sur 10` ;
  - `ZoneEditor lists zones with rename and delete controls` ;
  - `settings sections are disabled for a MEMBER` ;
  - `account section offers to link Google when not linked`.
- [ ] **Step 2 : Lancer.** `npx vitest run src/components/app/settings.test.tsx` → FAIL.
- [ ] **Step 3 : Implémenter.**
- [ ] **Step 4 : Relancer** → PASS.
- [ ] **Step 5 : Barrière et commit.** `feat(app): rebuild settings for the shop, zones, estimate and account`.

---

### Task 8 : Retrait de la palette par défaut, documentation et recette

**Files:**
- Modify: `frontend/src/app/globals.css` (`--color-*: initial;` en tête du bloc `@theme`), `frontend/src/contexts/ToastContext.tsx` (tokens), `frontend/src/app/error.tsx`, `frontend/src/app/(public)/page.tsx`, `frontend/src/app/(admin)/admin/page.tsx` (tokens seulement), `CLAUDE.md`
- Test: `frontend/src/lib/server/observability/no-default-palette.test.ts`

**Interfaces:**
- Produces : le garde-fou. Il parcourt `src/**/*.tsx` et `src/contexts/**` et refuse :
  - `(bg|text|border|ring|fill|stroke|from|via|to|divide|outline|placeholder|decoration|shadow|accent|caret)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}` ;
  - `(bg|text|border)-(white|black)\b`.
  - Les tokens du lot 2 (`neutral-verdict`…) ne contiennent pas de chiffres et passent.

- [ ] **Step 1 : Écrire le garde-fou qui échoue**, avec un cas sur le motif (`'text-gray-600'` refusé, `'border-neutral-verdict'` accepté), puis un `it.each` par fichier. → FAIL sur les fichiers du kit qui restent (Toast, page d'accueil publique, admin…).
- [ ] **Step 2 : Réécrire ces fichiers** avec les tokens, puis ajouter `--color-*: initial;` dans `@theme`. Relancer `tokens-sync.test.ts` et `contrast.test.ts` → PASS.
- [ ] **Step 3 : Documenter dans `CLAUDE.md`** :
  - la palette par défaut est retirée (seulement les tokens) ;
  - les groupes `(auth)` et `(app)`, `ShopGate`, `useShop` ;
  - `components/app/` (client) et `components/ui/` (serveur) ;
  - `uploadPhoto` hors de `lib/api.ts` ;
  - la simulation de `next/navigation` pour tester les pages.
  - Puis `npx vitest run src/lib/server/observability` → PASS.
- [ ] **Step 4 : Barrière et commit.** `refactor(ui): drop the default Tailwind palette behind a tripwire`.
- [ ] **Step 5 : Validation.**
  - `pnpm build` → succès, aucune erreur `useSearchParams` sans `Suspense`.
  - Serveur sur le port 3001 (délais Neon exportés).
  - Script CDP de recette (bloc-notes) :
    - il pose des cookies factices `app-token` et `app-csrf` (le middleware ne vérifie que leur présence) et sert les réponses d'API par `Fetch.fulfillRequest` (`/api/auth/me`, `/api/shops/me`, produits, campagnes, zones) ;
    - il capture à 320, 390 et 1280 px : `/login`, `/app/bienvenue`, `/app`, `/app/produits`, `/app/produits/nouveau`, `/app/campagnes`, `/app/campagnes/nouvelle` (étapes 1 et 6), `/app/campagnes/c1`, `/app/reglages`, `/app/plus` ;
    - il mesure `scrollWidth` contre la largeur de la fenêtre.
  - Résultat attendu : aucun débordement à 320 px, et une seule audace par écran à l'œil. Les captures sont montrées au porteur du projet.
  - Enfin `/app` sans cookie → 303 vers `/login?next=%2Fapp` (`curl -I`).

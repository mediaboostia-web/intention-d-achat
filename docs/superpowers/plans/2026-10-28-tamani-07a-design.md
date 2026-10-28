# Tamani 07a : la passe UX/UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Réaliser les maquettes validées par le porteur :
- le mode nuit ;
- sur ordinateur, la barre latérale repliable, la barre du haut (recherche, jour / nuit, cloche, profil) et l'accueil en pleine page avec les verdicts en cartes ;
- le choix cartes / liste sur Campagnes et Produits ;
- le pop-up (stock, fenêtre de fin, lien Tamani) ;
- le menu du téléphone sur la page d'accueil.

**Architecture:**
- Les thèmes passent par des variables CSS : `[data-theme='dark']` sur `<html>` redéfinit les couleurs du `@theme`. Le repli de la barre passe par `[data-sidebar='collapsed']` sur `<html>`. Les deux sont posés par un petit script avant l'affichage, puis par les boutons.
- Une seule route nouvelle, `GET /api/shops/[orgId]/search`. Le reste est de l'interface.
- Les règles d'affichage restent pures et testées dans `lib/tamani/` ; les composants sans état dans `components/ui/`, ceux avec état dans `components/app/`.

**Tech Stack:** Next.js 16, React 19, Tailwind 4 (jetons du lot 2), Prisma 5, Vitest (`prismaMock`, HTML statique).

**Spec:** [retours du porteur, passe UX/UI](../specs/2026-10-28-tamani-retours-porteur-3.md), qui fait foi ; la [charte](../../brand/tamani-brand.md) ; les maquettes du canvas « Tamani UX/UI v2 ».

## Global Constraints

- **Branche** `plan/07a-design`, partie de `plan/07-commandes`.
- **Pas de débordement** : aucune page ne défile en largeur à 320, 390, 1024 et 1280 px, dans les deux thèmes.
- **Couleurs** : seulement les jetons ; chaque paire de `contrastPairs` atteint 4,5:1 avec `colors` **et** avec `nightColors`.
- **Mode nuit** seulement sous `/app` ; clé `localStorage` `tamani-theme` (`'dark'` ou absente). Repli : clé `tamani-sidebar` (`'collapsed'` ou absente). Cartes / liste : clé `tamani-layout:<onglet>` (`'list'` ou absente). Les lectures et écritures ne lèvent jamais d'erreur.
- **Pop-up** : pas de `motion`, `framer-motion`, `gsap` ni `libphonenumber-js` sous `app/(public)/c/**` ; animations CSS coupées sous `prefers-reduced-motion`.
- **Recherche** : `q` coupé aux bouts, 2 à 80 caractères (sinon 400 `VALIDATION_FAILED`) ; 5 résultats par groupe ; chaque requête porte `organizationId` ; un client suit `visibleClientWhere` et, sans `respondentContacts`, la recherche ignore les chiffres et le numéro ne sort pas.
- Cibles tactiles ≥ 44 px ; tout bouton à icône seule a un `aria-label`.

## Review Focus

1. Un thème nuit appliqué alors qu'on quitte `/app` par la navigation du client (page d'accueil en nuit) : l'attribut doit être retiré au démontage de la coque.
2. Un `localStorage` absent ou qui lève (navigation privée) : la page s'affiche en jour, barre dépliée, en cartes.
3. Un nom de campagne ou de produit très long, sans espace, dans une carte, une ligne de liste ou un résultat de recherche : il se coupe, il ne pousse pas la page.
4. La fenêtre de fin du pop-up sur un petit téléphone (320 × 568) avec le clavier fermé : tout se lit et les deux boutons restent visibles.
5. Le menu du téléphone ouvert puis la fenêtre agrandie au-delà de 1024 px : le fond assombri et le blocage du défilement disparaissent.

---

### Task 1: Le mode nuit (jetons, CSS, bouton)

**Files:**
- Modify: `frontend/src/lib/design/tokens.ts`, `frontend/src/lib/design/contrast.test.ts`, `frontend/src/lib/design/tokens-sync.test.ts`, `frontend/src/app/globals.css`, `frontend/src/components/ui/Card.tsx`, `frontend/src/components/ui/NavBar.tsx`
- Create: `frontend/src/lib/tamani/prefs.ts` (+ `prefs.test.ts`), `frontend/src/components/app/ThemeToggle.tsx`, `frontend/src/components/app/ShellPrefsScript.tsx`
- Modify: `frontend/src/app/(app)/app/layout.tsx`, `docs/brand/tamani-brand.md`

**Interfaces:**
- Produces: `nightColors` (mêmes clés que `colors`), jetons `deep` / `deepInk` ; `readPref(key)`, `writePref(key, value | null)`, `PREF_KEYS = { theme: 'tamani-theme', sidebar: 'tamani-sidebar', layout: (tab) => \`tamani-layout:${tab}\` }`, `SHELL_PREFS_SCRIPT` (texte du script) ; `<ThemeToggle />`.

- [ ] **Step 1: Tests rouges** — `contrast.test.ts` : « every declared pair reaches 4.5:1 in the night palette » (boucle sur `contrastPairs` avec `nightColors`) et « night palette has the same keys » ; `tokens-sync.test.ts` : « the dark block mirrors nightColors » (lit le bloc `[data-theme='dark']` de `globals.css`) ; `prefs.test.ts` : `readPref` rend `null` quand `localStorage` lève, `writePref(key, null)` retire la clé, `SHELL_PREFS_SCRIPT` pose `data-theme="dark"` et `data-sidebar="collapsed"` d'après les clés (exécuté avec `new Function` sur un faux `document`).
- [ ] **Step 2: Lancer** `npx vitest run src/lib/design src/lib/tamani/prefs.test.ts` — Expected: FAIL (`nightColors` absent).
- [ ] **Step 3: Implémenter** : les jetons et paires `deepInk/deep`, `accent/deep` ; le bloc `:root[data-theme='dark'] { --color-…; color-scheme: dark }`, `.stamp` en `mix-blend-mode: normal` la nuit, `bg-cover` sur `--color-deep` ; `@custom-variant collapsed` ; `Card` ton encre et `SideNav` sur `deep` / `deep-ink` ; `prefs.ts` ; `ShellPrefsScript` (un `<script>` en ligne dans le layout `/app`) ; `ThemeToggle` (bouton `aria-pressed`, « Passer en mode nuit » / « Passer en mode jour », pose l'attribut sur `<html>`, l'écrit, et la coque retire `data-theme` à son démontage).
- [ ] **Step 4: Relancer** — Expected: PASS ; puis `npx vitest run src/lib/server/observability/no-default-palette.test.ts`.
- [ ] **Step 5: Charte** : « Thème clair uniquement en v1 » devient les deux thèmes (§2 du document de retours). Commit `feat(design): night palette and theme toggle for the shop space`.

### Task 2: La coque sur ordinateur (barre repliable, barre du haut, largeur)

**Files:**
- Modify: `frontend/src/components/ui/NavBar.tsx` (`SideNav`), `frontend/src/components/app/AppShell.tsx`, `frontend/src/lib/tamani/nav.ts`, `frontend/src/components/ui/shell.test.tsx`, `frontend/src/components/app/shell.test.tsx`
- Create: `frontend/src/components/app/TopBar.tsx`, `frontend/src/components/app/SidebarToggle.tsx`

**Interfaces:**
- Consumes: `PREF_KEYS.sidebar`, `ThemeToggle`, `NotificationBell`.
- Produces: `shellWidth(pathname): 'wide' | 'narrow'` (`wide` pour `/app`, `/app/campagnes`, `/app/produits`, `/app/clients`, `/app/commandes` exactement) ; `TopBar({ search })` ; `SideNav` rend chaque lien avec `title` et un libellé `collapsed:sr-only`.

- [ ] **Step 1: Tests rouges** — `shellWidth` : `/app` et les quatre listes → `wide`, `/app/campagnes/abc`, `/app/reglages` → `narrow` ; `SideNav` : chaque lien porte `title` = son libellé, la barre a `collapsed:w-[84px]` ; `AppShell` (HTML statique) : la barre du haut contient `aria-label="Replier le menu"`, la recherche (`role="combobox"`), le bouton jour / nuit, la cloche et `href="/app/profil"`.
- [ ] **Step 2: Lancer** les deux `shell.test.tsx` et `nav` — Expected: FAIL.
- [ ] **Step 3: Implémenter** : la barre latérale 248 → 84 px (`collapsed:`), anneaux de reliure décoratifs (`aria-hidden`), compteur et « Passer au Pro » cachés une fois repliée ; `TopBar` collante en haut, cachée sous 1024 px (le téléphone garde son en-tête et gagne `ThemeToggle`) ; `main` en `max-w-[1360px]` pour `wide`, `max-w-3xl` sinon.
- [ ] **Step 4: Relancer** — Expected: PASS. Commit `feat(shell): collapsible sidebar, top bar and wide pages on desktop`.

### Task 3: La recherche

**Files:**
- Create: `frontend/src/lib/server/tamani/search.ts` (+ `search.test.ts`), `frontend/src/app/api/shops/[orgId]/search/route.ts` (+ `route.test.ts`), `frontend/src/lib/tamani/search-view.ts` (+ test), `frontend/src/components/app/GlobalSearch.tsx`
- Modify: `frontend/src/components/app/TopBar.tsx`

**Interfaces:**
- Produces: `searchShop(db, { organizationId, q, canSeeContacts }) → Promise<SearchResults>` avec `SearchResults = { campaigns: {id,title,status,photo}[]; products: {id,name,archived,photo}[]; clients: {id,firstName,phone}[] }` (`phone` masqué sans `respondentContacts`) ; `searchOptions(results) → SearchOption[]` (`{ group, id, label, detail, href }`, dans l'ordre Campagnes, Produits, Clients).

- [ ] **Step 1: Tests rouges** — `searchShop` : chaque `findMany` porte `organizationId`, `take: 5`, `mode: 'insensitive'` ; « 77 » sans `respondentContacts` ne cherche pas dans les numéros ; la route : 400 pour `q` d'un caractère ou de 81, 404 à un non-membre, 200 `{ results }` ; `searchOptions` : les `href` (`/app/campagnes/<id>`, `/app/produits/<id>`, `/app/clients/<id>`) et l'ordre des groupes.
- [ ] **Step 2: Lancer** — Expected: FAIL (module absent).
- [ ] **Step 3: Implémenter** ; `GlobalSearch` : `role="combobox"`, `aria-expanded`, `aria-controls`, liste `role="listbox"` groupée, attente de 250 ms, flèches, Entrée, Échap, Ctrl K / ⌘ K, « Aucun résultat pour « … » », réponse périmée ignorée.
- [ ] **Step 4: Relancer** — Expected: PASS. Commit `feat(search): search campaigns, products and clients from the top bar`.

### Task 4: L'accueil en pleine page

**Files:**
- Modify: `frontend/src/components/app/HomeView.tsx`, `frontend/src/lib/tamani/home-view.ts` (+ test), `frontend/src/components/app/home.test.tsx`
- Create: `frontend/src/components/ui/VerdictTile.tsx` (exporté par `index.ts`)

**Interfaces:**
- Consumes: `CampaignBulletinItem`, `campaignVerdictLine`.
- Produces: `verdictCalc(item) → string | null` (le calcul écrit à la main : « 31 réalistes sur 40 prévus » ; « 11 réponses sur 20 » en attente ; « 57 à servir · stock 200 » en stock ; `null` verrouillé) ; `verdictGauge(item) → { value; max } | null` ; `VerdictTile({ line, calc, gauge, href, interestedHref })`.

- [ ] **Step 1: Tests rouges** — `verdictCalc` et `verdictGauge` sur GO, WAIT, en stock, verrouillé ; `HomeView` : une section « Tes verdicts » avec une carte par campagne, chaque carte avec son tampon et « Voir le détail » ; une colonne `aria-label="À faire et activité"` qui contient « À faire maintenant », « Depuis hier » et « À venir » ; les boutons du haut sur une ligne (Partager sur WhatsApp, Ajouter un produit, Créer une campagne).
- [ ] **Step 2: Lancer** — Expected: FAIL.
- [ ] **Step 3: Implémenter** : à partir de 1280 px, grille `[1fr_340px]` ; la colonne de droite collante ; la carte « Cette semaine » inchangée ; l'argent protégé en une ligne ; les cartes de verdict en `repeat(auto-fill,minmax(260px,1fr))`, pieds de carte alignés (`mt-auto`). Sous 1280 px, l'ordre d'aujourd'hui.
- [ ] **Step 4: Relancer** — Expected: PASS. Commit `feat(home): full-page desktop home with verdict tiles and an action column`.

### Task 5: Cartes ou liste

**Files:**
- Modify: `frontend/src/components/ui/CampaignCard.tsx`, `frontend/src/components/ui/ProductCard.tsx`, `frontend/src/components/ui/thumbnails.test.tsx`, `frontend/src/app/(app)/app/campagnes/page.tsx`, `frontend/src/app/(app)/app/produits/page.tsx`
- Create: `frontend/src/components/ui/LayoutSwitch.tsx`, `frontend/src/components/app/use-list-layout.ts`

**Interfaces:**
- Consumes: `PREF_KEYS.layout`.
- Produces: `CampaignCard` et `ProductCard` prennent `layout: 'card' | 'row'` ; `LayoutSwitch({ value, onChange })` (deux boutons `aria-pressed`, « Cartes » et « Liste ») ; `useListLayout(tab) → [layout, setLayout]`.

- [ ] **Step 1: Tests rouges** — en `card` : la photo en bandeau (`aspect-[16/7]`, `object-cover`) ou le pictogramme sans photo ; en `row` : vignette `size-11` ; un titre de 120 caractères sans espace porte `break-words` / `min-w-0` ; `LayoutSwitch` : `aria-pressed="true"` sur le choix courant.
- [ ] **Step 2: Lancer** — Expected: FAIL.
- [ ] **Step 3: Implémenter** ; les pages : la grille `repeat(auto-fill,minmax(240px,1fr))` en cartes, une liste encadrée en lignes ; le choix à côté des filtres.
- [ ] **Step 4: Relancer** — Expected: PASS. Commit `feat(lists): card or list view on campaigns and products`.

### Task 6: Le pop-up (stock, fenêtre de fin, lien Tamani)

**Files:**
- Modify: `frontend/src/app/(public)/c/[code]/popup-sheet.tsx`, `frontend/src/app/(public)/c/[code]/page.tsx`, `frontend/src/app/(public)/c/[code]/popup.test.tsx`, `frontend/src/lib/tamani/popup-machine.ts` (+ test)
- Create: `frontend/src/components/ui/Picto.tsx`, `frontend/src/lib/tamani/popup-thanks.ts` (+ test), `frontend/src/app/(public)/c/[code]/thanks-dialog.tsx`

**Interfaces:**
- Produces: `stockLine(quantity, unitLabel) → "200 bouteilles en stock"` ; `thanksCopy({ interested, firstName, shopName, productName, unitLabel, quantity }) → { title; lines: string[] }` ; action `{ type: 'changeMind' }` (de `thanks`, vers `buyer`, `interested: true`) ; `PopupView` prend `homeUrl`.

- [ ] **Step 1: Tests rouges** — « 200 bouteilles en stock », « 1 bouteille en stock » ; plus aucun « Plus que » ; `thanksCopy` oui avec et sans prénom, non ; `changeMind` ; la vue `thanks` rend `role="dialog"` `aria-modal="true"` avec « Fermer » et « Modifier ma réponse » (oui) ou « En fait, ça m'intéresse » (non) ; le lien « Propulsé par » a `href` absolu vers `homeUrl` avec `?ref=`, `target="_blank"`.
- [ ] **Step 2: Lancer** — Expected: FAIL.
- [ ] **Step 3: Implémenter** : pictogrammes bicolores (jaune + encre) étal et cartons ; la fenêtre centrée sur un fond assombri, focus sur son titre à l'ouverture, entrée en CSS coupée sous `prefers-reduced-motion` ; « En fait, ça m'intéresse » envoie `interest: true` puis `changeMind`.
- [ ] **Step 4: Relancer**, puis `no-motion-in-popup.test.ts` — Expected: PASS. Commit `feat(popup): stock wording, end dialog and a real Tamani link`.

### Task 7: Le menu du téléphone sur la page d'accueil

**Files:**
- Modify: `frontend/src/components/landing/LandingNav.tsx`, `frontend/src/components/landing/landing.css`, `frontend/src/components/landing/landing.test.tsx`

**Interfaces:**
- Produces: `LandingNav` avec un tiroir `#lp-menu` (`role="dialog"`, `aria-modal`, `aria-label="Menu"`).

- [ ] **Step 1: Tests rouges** — sous 1024 px la barre ne porte plus « Se connecter » ni « Essayer » (classes `lp-nav__login` et le bouton d'inscription marqués desktop seulement) ; le tiroir finit par « Commencer gratuitement » (`/signup`) puis « Se connecter » (`/login`) ; chaque lien porte `--i` pour l'apparition décalée.
- [ ] **Step 2: Lancer** — Expected: FAIL.
- [ ] **Step 3: Implémenter** : barre transparente en haut de page, fond papier léger quand elle revient (`data-scrolled`) ; tiroir de 316 px depuis la droite, fond assombri cliquable, focus piégé, défilement bloqué, Échap ; fermé et débloqué au-delà de 1024 px ; animations coupées sous `prefers-reduced-motion`.
- [ ] **Step 4: Relancer** — Expected: PASS. Commit `feat(landing): side drawer menu on phones`.

### Task 8: Débordements, recette et documents

**Files:**
- Modify: `CLAUDE.md` (section « Tamani design pass (lot 7a) »), `docs/superpowers/plans/2026-10-24-tamani-roadmap.md` (« Lot 7a »)

- [ ] **Step 1: Barrière** `pnpm format && pnpm lint && pnpm typecheck && pnpm test` — Expected: tout vert.
- [ ] **Step 2: Recette** sur `next build && next start` : chaque page de `/app`, la page d'accueil et un pop-up à 320, 390, 1024 et 1280 px, en jour et en nuit : `document.documentElement.scrollWidth <= innerWidth` ; captures des écrans clés ; le parcours du pop-up jusqu'aux deux fenêtres de fin ; la recherche ; le repli.
- [ ] **Step 3: Documents** et commit `docs(design): lot 7a rules and recette`.

# Lot 12 — Site public v2 : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** Mettre en ligne les nouveaux textes de l'accueil, la page `/forfaits`, la nouvelle connexion / inscription, le SEO et le GEO, et les animations de la spec. Tout doit rester responsive et accessible sur téléphone.

**Architecture :**
- Les textes partagés (titres, FAQ, menu, JSON-LD, metadata) restent dans `lib/tamani/landing.ts`. Les données de la page Forfaits vont dans un nouveau `lib/tamani/landing-forfaits.ts` : le préfixe `landing` l'exempte du garde-fou « Gratuit ».
- Les sections restent des composants serveur de `components/landing/`. Seules les parties qui bougent sont des feuilles client : `CountUp`, le bouton de durée, le curseur, le menu.
- Les animations sont en CSS dans `landing.css`, sans bibliothèque. Elles s'arrêtent toutes sous `prefers-reduced-motion`.

**Tech Stack :** Next.js 16 App Router, Tailwind 4 (jetons seulement), Vitest (rendu HTML statique `html` / `text` de `@/components/ui/test-html`).

**Spec :** [docs/superpowers/specs/2026-11-05-tamani-site-public-v2-design.md](../specs/2026-11-05-tamani-site-public-v2-design.md). Le texte exact de chaque section est au §5 (accueil) et au §6 (forfaits) de la spec. Ce plan ne le recopie pas : le constructeur le prend mot pour mot.

## Global Constraints

- Le texte est celui de la spec §5 et §6, mot pour mot, au tutoiement.
- Aucun tiret cadratin ni demi-cadratin (`–`, `—`) dans le texte affiché : les tests existants le vérifient.
- « moins de 30 secondes » apparaît sur l'accueil ; jamais « 5 secondes ».
- Montants :
  - toujours `formatMoney(…, 'XOF')` ou `formatPrice` ;
  - jamais « FCFA » écrit à la main hors de `components/landing/` et de `lib/tamani/landing.ts` (`no-fcfa-literal.test.ts`) ;
  - les nombres passent par `unbroken`.
- Pas de « Pro », de « forfait Gratuit » ni de « 12 mois ».
- Chiffres des pass : tous lus dans `PLANS`, `offerCards`, `planFeatures`, `BEST_VALUE`, jamais écrits à la main.
- Jetons Tailwind seulement (`no-default-palette.test.ts`).
- Un seul `<h1>` par page. `lang="fr"` vient du layout racine.
- Le popup `app/(public)/c/**` n'est pas touché. Aucune bibliothèque d'animation sur le site public.
- Toute animation n'utilise que `transform`, `opacity` et les couleurs. Elle s'arrête sous `@media (prefers-reduced-motion: reduce)`, où l'état final s'affiche.
- Cibles tactiles d'au moins 44 px. Focus clavier visible. Pas de défilement horizontal de la page dès 320 px de large.
- Les fichiers protégés de CLAUDE.md ne sont pas modifiés.
- Commits Conventional Commits en anglais, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Avant chaque commit : `pnpm format && pnpm lint && pnpm typecheck && pnpm test`.

## Review Focus

1. **`/forfaits` sans JavaScript.** Le choix « Courte durée / Au mois » est fait de deux boutons radio natifs, et les panneaux suivent `:checked`. Les deux groupes de cartes restent donc lisibles et changeables sans JS. Le JS ne fait que lire et écrire `?duree=mois`. Test : le HTML serveur contient les deux radios et les sept offres.
2. **Téléphone de 320 px.** Les cartes, le tableau (colonne 1 fixe, défilement dans son cadre), le menu et les deux colonnes de connexion ne font jamais déborder la page. Vérifié à la recette (Task 6) par `scrollWidth <= innerWidth` à 320, 390 et 1280 px.
3. **Mouvement réduit.**
   - Les mots du hero sont visibles tout de suite.
   - `CountUp` affiche sa valeur finale.
   - Le curseur avant / après ne fait pas d'aller-retour.
   - Le reflet et le « tic » du bouton sont coupés.
   - Test : la règle `prefers-reduced-motion` de `landing.css` couvre chaque nouvelle classe animée.
4. **Lecteurs d'écran face aux nombres qui comptent.** `CountUp` rend la valeur finale côté serveur, et le texte animé est `aria-hidden` à côté d'une copie `sr-only` de la valeur finale. Test sur le HTML serveur.
5. **Liens du menu depuis `/forfaits`.** Les liens de section sont `/#…`, pas `#…`, pour marcher depuis les deux pages. « Forfaits » porte `aria-current="page"` sur `/forfaits`. Testé.

---

### Task 1 : Textes partagés, SEO et données des forfaits

**Files :**
- Modify : `frontend/src/lib/tamani/landing.ts`
- Create : `frontend/src/lib/tamani/landing-forfaits.ts`
- Test : `frontend/src/lib/tamani/landing.test.ts`, create `frontend/src/lib/tamani/landing-forfaits.test.ts`

**Interfaces :**
- Produces (`landing.ts`) :
  - `LANDING_NAV: readonly { href: string; label: string }[]` :
    - `/#comment-ca-marche` « Comment ça marche » ;
    - `/#fonctionnalites` « Fonctionnalités » ;
    - `/#benefices` « Bénéfices » ;
    - `/forfaits` « Forfaits » ;
    - `/#faq` « FAQ » ;
    - `/#contact` « Contact ».
  - `LANDING_TITLE` et `LANDING_DESCRIPTION` (spec §8.3), `LANDING_FAQ` (spec §5.9, onze questions).
  - `landingJsonLd(appUrl)` :
    - `Organization` gagne `contactPoint` (WhatsApp, si `whatsappContact`) et `sameAs` (les réseaux non nuls) ;
    - `SoftwareApplication.offers` devient une `AggregateOffer`.
  - `trimBase` est exporté.
- Produces (`landing-forfaits.ts`) :
  - `type DurationTab = 'court' | 'mois'` ;
  - `FORFAITS_TABS: readonly { id: DurationTab; label: string; offers: readonly PlanId[] }[]` :
    - `court` = `['TRIAL', 'WEEK', 'TWO_WEEKS', 'UNLIMITED']` ;
    - `mois` = `['MONTH', 'MONTH_PLUS', 'MONTH_MAX', 'UNLIMITED']`.
  - `tabFromSearch(search: string): DurationTab` : `mois` seulement pour `duree=mois`.
  - `cardLines(id: PlanId): CardFeature[]`.
  - `compareRows(): { label: string; cells: (string | boolean)[] }[]`, avec sept cellules dans l'ordre `['TRIAL', ...PASS_IDS, 'UNLIMITED']`.
  - `FORFAITS_FAQ` (spec §6.5).
  - `forfaitsMetadata(appUrl): Metadata`, `forfaitsJsonLd(appUrl)`.

- [ ] **Step 1 : Écrire les tests qui échouent**

Dans `landing.test.ts` :

- `LANDING_NAV lists the six menu entries, sections as /#anchors` : les libellés et les href ci-dessus, dans l'ordre.
- `the title and description fit search results` :
  - `LANDING_TITLE` vaut `Tamani : sache quoi commander avant d'acheter ton stock`, avec au plus 60 signes ;
  - `LANDING_DESCRIPTION` a au plus 160 signes et contient `WhatsApp`, `TikTok` et `Facebook`.
- `the FAQ asks the eleven questions of the spec, each answer first and short` :
  - les questions dans l'ordre de la spec §5.9 ;
  - chaque réponse fait au plus 70 mots.
- `the countries answer lists every shop country` : chaque `SHOP_COUNTRIES[i].label` apparaît dans la réponse « Dans quels pays marche Tamani ? ».
- Réécrire `the FAQ answers how the free trial works`. La réponse doit contenir :
  - `${PLANS.TRIAL.durationDays} jours` ;
  - `${PLANS.TRIAL.includedResponses} réponses` ;
  - `sans carte bancaire`.
- `JSON-LD sells one aggregate offer in XOF, from the trial to the dearest pass` : `{ '@type': 'AggregateOffer', priceCurrency: 'XOF', lowPrice: '0', highPrice: String(max priceXof), offerCount: 6 }`.
- `the organisation gives its WhatsApp contact and only the social links that exist` : avec `ALL_LINKS`, `sameAs` a trois url ; avec `NO_LINKS`, pas de `sameAs`.
  - Pour cela, `landingJsonLd(appUrl, links = LANDING_LINKS)` prend un second paramètre optionnel.

Dans `landing-forfaits.test.ts` :

- `the two tabs hold the porteur's groups, Illimité in both` : les deux listes ci-dessus.
- `tabFromSearch opens « court » unless duree=mois` :
  - `''` → `court` ;
  - `'?duree=mois'` → `mois` ;
  - `'?duree=xyz'` → `court`.
- `the trial card says what it has and what it lacks` : `cardLines('TRIAL')` donne six lignes.
  - Inclus : `1 campagne à la fois`, `La quantité à commander et le verdict`, `Les numéros des intéressés et WhatsApp`.
  - Non inclus : `Un lien par groupe`, `L'export pour Excel`, `Sans « Propulsé par Tamani »`.
- `a pass card keeps four lines, all included` : `cardLines('MONTH')`, quatre lignes `included: true`, avec `Campagnes illimitées` en premier.
- `the comparison table has the price, duration, answers and campaigns first, then every feature` :
  - `compareRows()[0].cells` vaut, pour TRIAL, `formatMoney(0, 'XOF')` ; pour UNLIMITED, `'Parlons-en'` ;
  - les lignes 4 et suivantes reprennent les libellés de `planFeatures('WEEK')` ;
  - chaque ligne a sept cellules.
- `forfaitsMetadata: own title, canonical /forfaits, the lowest pass price in the description` :
  - `title.absolute` vaut `Forfaits Tamani : prix des pass et essai gratuit` ;
  - `alternates.canonical` vaut `${base}/forfaits` ;
  - la description contient `formatMoney(PLANS.WEEK.priceXof!, 'XOF')` (sans espaces insécables) et a au plus 160 signes.
- `forfaitsJsonLd has its own FAQPage with the four pricing questions`.

- [ ] **Step 2 : Lancer les tests et les voir échouer**

Run : `pnpm --filter frontend exec vitest run src/lib/tamani/landing.test.ts src/lib/tamani/landing-forfaits.test.ts`
Expected : FAIL. `LANDING_NAV` et `landing-forfaits` n'existent pas, et les anciens titres ne correspondent pas.

- [ ] **Step 3 : Implémenter**

- Remplacer les textes de `landing.ts` par ceux de la spec (§5.9 FAQ, §8.3 titres).
  - `SHARE_TITLE` et `SHARE_DESCRIPTION` suivent le titre et la description, en plus court.
  - `LANDING_SLOGAN` reste.
  - La réponse « pays » se construit depuis `SHOP_COUNTRIES` (labels joints par « , » et « et »).
- Les FAQ « quantité », « réponses des autres » et « paiement » gardent leur texte actuel.
- `landing-forfaits.ts` :
  - `cardLines` filtre `planFeatures(id)` sur une liste de libellés gardés : pour l'essai, ses six lignes ; pour un pass, `Campagnes illimitées`, `La quantité à commander et le verdict`, `Un lien par groupe`, `L'export pour Excel`.
  - La ligne 1 de l'essai vient de `planFeatures` (`1 campagne à la fois`).
  - `pricingOffers` (dans `landing.ts`) reste la source des cartes. Le prix « Sur devis » de l'Illimité devient « Parlons-en » sur cette page seulement.

- [ ] **Step 4 : Lancer les tests et les voir passer**

Run : la même commande. Expected : PASS. Puis `pnpm --filter frontend exec vitest run src/lib/server/observability` : PASS (garde-fous mots et FCFA).

- [ ] **Step 5 : Commit** `feat(landing): new copy, menu, FAQ and structured data; pricing page data`

---

### Task 2 : Sections de l'accueil

**Files :**
- Modify :
  - `components/landing/{Hero,Film,Problem,Solution,Steps,BeforeAfter,Community,Faq,LandingFooter,LandingNav,StickyCta,content}.tsx|ts` ;
  - `app/(public)/page.tsx`.
- Create : `components/landing/FinalCta.tsx`.
- Delete : `components/landing/Pricing.tsx`, `components/landing/OfferRail.tsx` (plus utilisés ; leurs styles `lp-rail*` et `lp-compare*` sont gardés seulement s'ils servent à Task 3).
- Test : `components/landing/landing.test.tsx`, `app/(public)/page.test.tsx`.

**Interfaces :**
- Consumes : `LANDING_NAV`, `LANDING_FAQ` (Task 1).
- Produces : les ids de section `film`, `probleme`, `fonctionnalites`, `comment-ca-marche`, `benefices`, `communaute`, `faq`, et `contact` sur le `<footer>`. Ils remplacent `solution`, `avant-apres`, `tarifs`, `questions` et `lp-footer`. Task 3 réutilise `LandingNav` et `LandingFooter` ; Task 5 s'appuie sur ces ids.

- [ ] **Step 1 : Réécrire les tests qui échouent**

Dans `landing.test.tsx` :

- `come in the porteur's order` : les ids ci-dessus, dans l'ordre. Plus de `tarifs`.
- `LandingNav links to the six menu entries, sign-in and sign-up` : chaque `LANDING_NAV[i].href`, plus `/login` et `/signup`. L'ordre du tiroir est mis à jour de même.
- `LandingNav marks Forfaits as the current page on /forfaits` : rendre `<LandingNav current="/forfaits" />` (prop optionnelle, défaut `'/'`) ; `aria-current="page"` est sur le lien `/forfaits`.
- `Hero says the promise in one h1, the trial reassurance under the buttons`. Le texte contient :
  - `Pour les grossistes, importateurs et vendeurs en ligne` ;
  - `Commande seulement ce que tes clients vont acheter.` ;
  - `WhatsApp, TikTok ou Facebook` ;
  - `3 jours d'essai` · `sans carte bancaire` · `paiement par Mobile Money`.
  - Le second bouton mène à `/#comment-ca-marche` et dit `Voir comment ça marche`.
  - La bande de logos dit `Ton lien marche partout où sont tes clients.`
- `Film is titled « Regarde Tamani en action » and describes the 90 seconds` : le titre et le texte de la spec §5.3. Sans vidéo, il garde l'affiche et aucune balise `<video>`.
- `Problem lists the five situations Tamani helps avoid` : cinq `<li>` avec les cinq titres de la spec §5.4, puis `Et si un seul lien réglait tout ça ?`.
- `Solution has the six points and the orbit's TikTok lives`. Le texte contient :
  - les six titres de la spec §5.5 ;
  - `Bio, vidéos et lives` ;
  - `Groupes, pages et lives`.
- `Steps share a product in one minute, the CTA creates the first product` : titre `1 minute pour partager ton produit`, les trois titres de la spec, un bouton `Créer mon premier produit` vers `/signup`.
- `BeforeAfter lists the five before and after lines` :
  - titre `Tu vends comme avant. En mieux.` ;
  - les dix lignes de la spec §5.7 ;
  - le curseur reste un `input type="range"` étiqueté.
- `Community invites to the sellers' WhatsApp group, free` : le titre, `C'est gratuit` et le bouton `Rejoindre le groupe` (avec le lien). Sans lien, pas de bouton.
- `Faq is titled « Tes questions, nos réponses » and asks every LANDING_FAQ question`.
- `FinalCta closes the page on the trial` :
  - `Ton prochain stock, commande-le en sachant qui va l'acheter.` ;
  - `Essayer gratuitement` vers `/signup` ;
  - `3 jours · 50 réponses · sans carte bancaire`, avec les chiffres lus dans `PLANS.TRIAL`.
- `LandingFooter is the contact section` :
  - `<footer id="contact"` ;
  - `Une question ? Écris-nous sur WhatsApp` ;
  - les liens `/forfaits`, `/#comment-ca-marche`, `/#faq`, `/login`, `/signup`.

Dans `page.test.tsx`, mettre à jour la liste des ids et ajouter `final`. Ajouter un test : `the home page has no price grid (it lives on /forfaits)`, qui vérifie l'absence de `lp-rail` et de `Le meilleur prix par réponse`.

- [ ] **Step 2 : Lancer les tests et les voir échouer**

Run : `pnpm --filter frontend exec vitest run src/components/landing src/app/(public)/page.test.tsx`
Expected : FAIL sur les nouveaux textes et les nouveaux ids.

- [ ] **Step 3 : Implémenter**

- Textes de la spec §5, mot pour mot. Illustrations existantes, avec des alt réécrits si le texte change de sens. `LandingNav` lit `LANDING_NAV`.
- `StickyCta` :
  - ses `covers` deviennent `['communaute', 'final', 'contact']` ;
  - il reste rendu sur l'accueil seulement.
- `Problem` :
  - les cinq cartes en grille : 1 colonne sur téléphone, 2 dès 640 px, 3 dès 1024 px ;
  - l'illustration `probleme` reste à côté de la grille sur grand écran ;
  - l'exemple chiffré n'est plus dans cette section, il reste dans `BeforeAfter`.
- `BeforeAfter` garde `EXAMPLE` dans une phrase sous le curseur : 300 cartons commandés, 190 invendus, l'argent bloqué ; avec Tamani, 120.

- [ ] **Step 4 : Lancer les tests et les voir passer.** Même commande, Expected : PASS.

- [ ] **Step 5 : Commit** `feat(landing): the porteur's new sections, menu and contact footer`

---

### Task 3 : Page `/forfaits`

**Files :**
- Create :
  - `app/(public)/forfaits/page.tsx` ;
  - `components/landing/forfaits/DurationSwitch.tsx` (client) ;
  - `components/landing/forfaits/PlanGrid.tsx` ;
  - `components/landing/forfaits/CompareTable.tsx`.
- Test : create `app/(public)/forfaits/page.test.tsx`.

**Interfaces :**
- Consumes : `FORFAITS_TABS`, `tabFromSearch`, `cardLines`, `compareRows`, `FORFAITS_FAQ`, `forfaitsMetadata`, `forfaitsJsonLd` (Task 1) ; `pricingOffers` ; `LandingNav current="/forfaits"`, `LandingFooter` (Task 2) ; `OfferCard` du kit.
- `DurationSwitch` : `{ name: string }`.
  - Il rend `role="radiogroup"` `aria-label="Durée des pass"` et deux `<input type="radio">` étiquetés « Courte durée » et « Au mois ».
  - Au montage, il coche selon `tabFromSearch(location.search)`.
  - Au changement, il fait `history.replaceState` avec `?duree=mois`, ou sans paramètre pour « court ».

- [ ] **Step 1 : Écrire les tests qui échouent** (`forfaits/page.test.tsx`)

- `renders one h1, the switch with « Courte durée » checked, and both groups of cards` :
  - le texte contient `Un forfait à la taille de ton activité` ;
  - le HTML a deux `type="radio"`, dont le premier `checked` ;
  - les noms des sept offres y sont tous.
- `Mois Max carries « Le meilleur prix par réponse », Illimité reads « Parlons-en » with a WhatsApp button`.
- `the trial card greys out what it lacks` : les trois libellés non inclus sont rendus dans l'état grisé d'`OfferCard`. Le test réutilise le marqueur de l'actuel test « the trial greys out what it leaves out ».
- `the reassurance band and the « Et quand mon pass se termine ? » box` : les cinq rassurances de la spec §6.2 et le texte de §6.3.
- `the comparison table: a caption, a header row of the seven offers, row headers` :
  - un `<table>` avec `<caption>` ;
  - sept `<th scope="col">` après la colonne des libellés ;
  - chaque ligne a un `<th scope="row">`.
- `the JSON-LD is the page's own FAQPage, parseable` : `JSON.parse` de la balise `ld+json` donne `@type` `FAQPage` avec quatre questions, et il n'y a pas de `<` dans le JSON.
- `generateMetadata reads APP_URL` : canonical `https://tamani.app/forfaits`.
- `the menu marks Forfaits as the current page`.

- [ ] **Step 2 : Lancer les tests et les voir échouer**

Run : `pnpm --filter frontend exec vitest run "src/app/(public)/forfaits"`
Expected : FAIL, la page n'existe pas.

- [ ] **Step 3 : Implémenter**

- Page statique (pas de `searchParams`). Elle importe `landing.css`, a le lien d'évitement « Aller au contenu », `LandingNav current="/forfaits"`, `<main id="contenu">`, `LandingFooter`, puis le JSON-LD échappé comme sur l'accueil.
- Les deux groupes de cartes sont rendus côté serveur dans `PlanGrid` (`data-tab="court"` / `"mois"`).
- `landing.css` montre le groupe dont la radio est cochée, avec `.lp-plans:has(#duree-mois:checked) [data-tab="court"] { display: none }` et l'inverse. La pastille glisse via `:has()`.
- Sans `:has()` (vieux navigateurs), les deux groupes restent visibles : c'est un repli acceptable.
- Mise en page des cartes :
  - sur téléphone, une colonne ;
  - dès 640 px, deux colonnes ;
  - dès 1024 px, quatre.
- Le tableau est dans un cadre `overflow-x: auto` avec `tabindex="0"` et un `aria-label`. La première colonne est `position: sticky`.

- [ ] **Step 4 : Lancer les tests et les voir passer.** Même commande, Expected : PASS.

- [ ] **Step 5 : Commit** `feat(landing): /forfaits, the pass grid with its duration switch and comparison table`

---

### Task 4 : Fichiers SEO

**Files :**
- Modify : `app/robots.ts`, `app/sitemap.ts`.
- Create : `app/llms.txt/route.ts`.
- Test : `app/seo-routes.test.ts`.

**Interfaces :** Consumes `trimBase`, `LANDING_TITLE`, `LANDING_FAQ` (Task 1).

- [ ] **Step 1 : Tests qui échouent**

- `robots keeps /support-admin out too` : `disallow` contient `/support-admin`, à côté de `/app`, `/admin` et `/api`.
- `robots blocks no AI search crawler` : aucune règle n'a pour `userAgent` `GPTBot`, `OAI-SearchBot`, `PerplexityBot`, `Google-Extended` ou `Bingbot`.
- `the sitemap lists the home page, /forfaits, then the legal pages` : `/forfaits` a la priorité 0.9.
- `llms.txt says what Tamani is and links the home, pricing and FAQ`. `GET()` répond :
  - `content-type` `text/plain; charset=utf-8` ;
  - un texte qui commence par `# Tamani` et contient `${base}/`, `${base}/forfaits` et `${base}/#faq`.

- [ ] **Step 2 : Lancer et voir échouer**

Run : `pnpm --filter frontend exec vitest run src/app/seo-routes.test.ts`
Expected : FAIL.

- [ ] **Step 3 : Implémenter**

`llms.txt/route.ts` exporte `runtime = 'nodejs'` et `dynamic = 'force-static'`, et lit `APP_URL`. Il n'est pas sous `app/api`, donc le test d'exécution ne le voit pas, mais il garde la même règle.

- [ ] **Step 4 : Voir passer.** Même commande, Expected : PASS.

- [ ] **Step 5 : Commit** `feat(seo): /forfaits in the sitemap, admin out of robots, llms.txt`

---

### Task 5 : Connexion et inscription

**Files :**
- Modify :
  - `app/(auth)/layout.tsx`, `app/(auth)/auth-panel.tsx` ;
  - `components/app/AuthForm.tsx` (prop `switchLink`) ;
  - `app/(auth)/login/login-form.tsx`, `app/(auth)/signup/signup-form.tsx`.
- Test : `app/(auth)/auth-pages.test.tsx`.

**Interfaces :**
- `AuthForm` gagne `switchLink?: ReactNode`, rendu juste sous le titre.
- `AuthPanel` rend la carte image :
  - sur téléphone, un bandeau ;
  - dès `lg`, une colonne.

- [ ] **Step 1 : Tests qui échouent**

- `signup is titled « Créer un compte », with the sign-in link right under the title` : dans le HTML, `Créer un compte` vient avant `Déjà un compte ?`, qui vient avant le premier `<input`.
- `login is titled « Se connecter », with the sign-up link right under the title`.
- Réécrire `the desktop panel stays in view, on computers only` en `the picture shows on phones as a band and on computers as a big rounded card` :
  - le panneau n'a plus `hidden` ;
  - il porte `rounded-card` ;
  - il a une hauteur de bandeau sur téléphone ;
  - il a `lg:sticky` et `lg:h-[calc(100dvh-…)]` (la classe exacte au choix du constructeur, testée telle qu'écrite) ;
  - il contient le lien `Retour au site` vers `/`.
- Les deux tests de texte du panneau gardent leurs phrases. Le dessin reste `inscription` ou `connexion`.
- `auth pages use Tamani tokens only` reste vert.

- [ ] **Step 2 : Lancer et voir échouer**

Run : `pnpm --filter frontend exec vitest run "src/app/(auth)"`
Expected : FAIL.

- [ ] **Step 3 : Implémenter**

- Sur ordinateur, deux colonnes. La carte image est à gauche, d'environ 46 %, sur toute la hauteur moins une marge de 16 px ; le formulaire est à droite, `max-w-md`, centré.
- Sur téléphone, le bandeau fait environ 220 px. Le logo est en haut à gauche, « Retour au site » en haut à droite, et la phrase en bas, sur un dégradé qui part de `ink` et va vers la transparence. La phrase garde un contraste AA.
- Le comportement des formulaires ne change pas.

- [ ] **Step 4 : Voir passer.** Même commande, Expected : PASS.

- [ ] **Step 5 : Commit** `feat(auth): a big picture beside the sign-in forms, on phones too`

---

### Task 6 : Animations, recette téléphone et ordinateur, documentation

**Files :**
- Create : `components/landing/CountUp.tsx` (client).
- Modify :
  - `components/landing/landing.css` ;
  - `components/landing/{Hero,BeforeAfter,CompareSlider,Steps,LandingNav,Faq}.tsx` ;
  - `lib/tamani/landing.ts` (`countFrame`).
- Test : `components/landing/landing.test.tsx`, `lib/tamani/landing.test.ts`.
- Docs :
  - create `docs/claude/tamani-lot-12-site-public.md` ;
  - add the row in `CLAUDE.md` ;
  - add a « Lot 12 » section in `docs/superpowers/plans/2026-10-24-tamani-roadmap.md`.

**Interfaces :**
- `countFrame(target: number, t: number): number` : `t ∈ [0,1]`, sortie arrondie avec un « ease-out », bornée à `target`.
- `<CountUp value={n} format={(n) => string} />` : le serveur rend `format(value)`.

- [ ] **Step 1 : Tests qui échouent**

- `countFrame eases out from 0 to the target and never overshoots` :
  - `countFrame(120, 0)` vaut `0` ;
  - `countFrame(120, 1)` vaut `120` ;
  - `countFrame(120, 0.5)` est au-dessus de `60` ;
  - aucune valeur n'est au-dessus de `120`.
- `CountUp renders the final value for the server and for screen readers` : `html(<CountUp value={120} format={String} />)` contient `aria-hidden="true"` et un `sr-only` `120`.
- `every new animation stops under reduced motion`. Dans `landing.css`, le bloc `@media (prefers-reduced-motion: reduce)` cite `.lp-word`, `.lp-shine`, `.lp-nudge`, `.lp-steps__line`, `.lp-faq` et `.lp-plans`.
- `the hero title words are spans for the stagger, the h1 still reads as one sentence` : le texte du H1 vaut exactement la phrase de la spec.

- [ ] **Step 2 : Lancer et voir échouer**

Run : `pnpm --filter frontend exec vitest run src/components/landing src/lib/tamani/landing.test.ts`
Expected : FAIL.

- [ ] **Step 3 : Implémenter** (spec §9)

- **Mots du hero.** Chaque mot est un `span.lp-word` avec `--i`, qui monte en fondu (`translateY` + `opacity`, 60 ms d'écart, 500 ms au total).
- **Boutons.** Ils se soulèvent de 2 px au survol, s'enfoncent (`scale(.98)`) au clic, et leur `chevron-right` glisse.
- **Bouton principal du hero.**
  - `.lp-shine` : un reflet passe une fois à l'arrivée.
  - `.lp-nudge` : un petit « tic » toutes les 6 s, trois fois au plus, mis en pause au survol et au focus.
- **Nombres.** `CountUp` s'applique aux nombres de `BeforeAfter` et à « 30 » dans le hero, quand ils entrent à l'écran (IntersectionObserver).
- **Étapes.** `.lp-steps__line` dessine le trait entre les étapes avec `scaleX` sur `[data-inview='true']`.
- **Curseur avant / après.** `CompareSlider` fait un aller-retour 50 → 42 → 58 → 50, une seule fois à l'entrée. Rien si l'utilisateur a déjà touché le curseur ou si le mouvement est réduit (`matchMedia`).
- **FAQ.** `.lp-faq details` s'ouvre en douceur (`::details-content` + `interpolate-size`, en amélioration progressive) et son icône tourne.
- **Menu.** `LandingNav` souligne la section en cours avec `data-active`, via un IntersectionObserver sur les ids de Task 2, sur l'accueil seulement.
- **Forfaits.** Les cartes du groupe affiché entrent en fondu, et le prix glisse vers le haut.

- [ ] **Step 4 : Voir passer**, puis lancer la porte complète. Run : `pnpm format && pnpm lint && pnpm typecheck && pnpm test`. Expected : PASS.

- [ ] **Step 5 : Recette réelle** (règle du porteur : tester l'app après le code)

1. `pnpm build`, puis `pnpm exec next start --port 3001` depuis `frontend/`.
2. Avec Chrome sans tête (CDP), à 320, 390 et 1280 px, sur `/`, `/forfaits`, `/login` et `/signup` :
   - une capture d'écran ;
   - `document.documentElement.scrollWidth <= innerWidth` ;
   - un seul `h1` ;
   - chaque `img` a un `alt` ;
   - chaque lien ou bouton visible fait au moins 44 px de haut, en dehors des liens dans du texte ;
   - aucun « NaN » ni « undefined ».
3. Sur `/forfaits`, cliquer « Au mois » : l'url devient `?duree=mois` et les cartes Mois apparaissent. Recharger : « Au mois » reste coché.
4. Sur `/forfaits`, cliquer « Comment ça marche » dans le menu : la page arrive sur la section de l'accueil.
5. Avec l'émulation `prefers-reduced-motion: reduce`, aucune animation ne tourne et tout est visible.
6. Clavier : faire défiler le focus avec Tab sur le menu et les boutons ; le focus est visible et l'ordre logique.
7. Arrêter le serveur (en vérifiant sa ligne de commande) et le Chrome de la recette.

- [ ] **Step 6 : Documentation**

- `docs/claude/tamani-lot-12-site-public.md` : routes, fichiers, règles (ids des sections, `/#` du menu, radios des forfaits, `CountUp`, mouvement réduit, `landing-forfaits.ts` exempté).
- La ligne correspondante dans le tableau « Tamani detail » de `CLAUDE.md`.
- La section « Lot 12 » dans la feuille de route : les décisions du porteur et mes choix (spec §12).

- [ ] **Step 7 : Commit** `feat(landing): motion that invites to sign up, stopped under reduced motion` puis `docs: lot 12 public site notes and roadmap`

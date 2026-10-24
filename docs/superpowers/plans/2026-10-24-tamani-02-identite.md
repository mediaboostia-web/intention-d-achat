# Tamani — Lot 2 : Identité visuelle « Cahier du marché »

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** donner à Tamani son identité « Cahier du marché » dans le code : charte, logo, tokens, polices et composants d'interface. Le tout est visible sur une page `/styleguide` réservée au développement.

**Architecture :**
- Les tokens vivent à deux endroits :
  - `frontend/src/lib/design/tokens.ts`, la source testée (contrastes) ;
  - le bloc `@theme` de `globals.css`, consommé par Tailwind v4.
  - Un test vérifie que les deux restent identiques.
- Les composants sont sous `frontend/src/components/ui/`. Ce sont des composants serveur, sans état ni `'use client'`, que les lots 4 à 7 composent.
- La logique d'affichage du verdict est pure et testée : `frontend/src/lib/tamani/verdict-display.ts`.

**Tech Stack :** Next.js 16 (`next/font/google`), React 19, Tailwind v4 (`@theme`, `@utility`), Vitest 3 (`react-dom/server` pour rendre les composants en HTML dans les tests), Chrome headless (rendu ponctuel des PNG), fontTools (vectorisation ponctuelle du mot-symbole).

**Spec :** [docs/superpowers/specs/2026-10-24-tamani-design.md](../specs/2026-10-24-tamani-design.md) §1 (piliers), §3 (anti-objectifs), §5.3 (pop-up), §5.4.0 (verdict), §5.8 (identité). **Feuille de route :** [2026-10-24-tamani-roadmap.md](2026-10-24-tamani-roadmap.md), lot 2.

**Direction validée par le porteur du projet (2026-10-24)** : la fusion **« Cahier du marché »**, avec en plus l'**auvent d'étal** sur le pop-up, emprunté à la fusion « Enseigne et carnet ». La maquette de référence est `docs/brand/mockups/2026-10-24-fusion-cahier-du-marche.html` (fusion 1).

## Global Constraints

- **Couleurs** (hex exacts, noms sémantiques de la feuille de route, plus des ajouts) :
  - `bg` `#FDFDF8` (papier) ; `surface` `#FFFFFF` ; `grid` `#DDE6F4` (carreaux) ; `margin` `#E2878A` (marge, décor seulement) ;
  - `ink` `#10204A` ; `ink-soft` `#3E4660` ; `ink-muted` `#596071` (crayon) ;
  - `primary` `#1A4FBF` (stylo bleu) ; `primary-ink` `#FFFFFF` ;
  - `accent` `#FFCC1F` (jaune enseigne) ; `accent-ink` `#10204A` ;
  - `success` `#1B7344` ; `warning` `#B8520A` ; `danger` `#B42318` ; `neutral-verdict` `#596071` ;
  - `whatsapp` `#25D366` ; `whatsapp-ink` `#073B1F`.
- **Le vert WhatsApp** ne sert qu'au bouton WhatsApp (spec §3).
- **Polices** :
  - Andika (400, 700) pour tout le texte (`font-sans`) ;
  - Kalam (400, 700) pour les titres et les notes au stylo (`font-hand`) ;
  - Bowlby One (400) pour les chiffres qui comptent et les tampons (`font-sign`).
- **Contraste** ≥ 4,5:1 pour chaque paire texte/fond déclarée. **Cible tactile** ≥ 48 px, et 64 px pour `ChoiceButton`. **Texte des champs** ≥ 16 px.
- **Pop-up** (`BottomSheet`, `ChoiceButton`, `app/(public)/c/**`) : animation en CSS uniquement, jamais `motion`, `framer-motion` ni `gsap`. Toute animation respecte `prefers-reduced-motion`.
- **Une seule audace par écran.** L'ombre « pressée » (`shadow-press`) est réservée au geste principal de l'écran : le bouton « Oui » du pop-up, ou le tampon du verdict.
- **Écriture à la main** (Kalam) réservée aux titres et aux notes, jamais au texte courant ni aux chiffres.
- Thème clair uniquement en v1.
- Barrière avant chaque commit : `pnpm format && pnpm lint && pnpm typecheck && pnpm test`, plus `pnpm build` en fin de lot. Commits en Conventional Commits, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Un nombre long ou une unité longue dans le tampon** (« ~1 250 sacs de 25 kg »). Le tampon ne doit pas déborder de la carte sur un écran de 320 px. → Tâche 4, `VerdictCard keeps long figures inside the card (break-words, no fixed width)`.
2. **Un verdict `WAIT` avec 19 réponses**. On doit lire « Encore 1 réponse », au singulier. → Tâche 3, `verdictDisplay WAIT uses singular for one missing response`.
3. **Un produit vendu au carton ou au sac**. L'unité suit le produit (« 12 cartons », « 1 carton »), et non « pièces » en dur. → Tâche 3, `pluralizeUnit pluralizes the first word only`.
4. **iOS zoome quand on touche un champ** dont le texte fait moins de 16 px. → Tâche 4, `Input and PhoneInput render text-base (16px)`.
5. **`prefers-reduced-motion`** : la feuille du pop-up ne doit pas glisser quand l'utilisateur a désactivé les animations. → Tâche 4, `BottomSheet disables its animation under reduced motion`.

---

### Task 1 : Charte, logo et fichiers de marque

**Files:**
- Create: `docs/brand/tamani-brand.md`
- Create: `docs/brand/sources/apple-icon.html`, `docs/brand/sources/og-default.html`, `docs/brand/sources/README.md`
- Create: `frontend/public/brand/tamani-mark.svg`, `frontend/public/brand/tamani-logo.svg`, `frontend/public/brand/og-default.png`
- Create: `frontend/src/app/icon.svg`, `frontend/src/app/apple-icon.png`
- Test: `frontend/src/lib/design/brand-assets.test.ts`

**Interfaces:**
- Produces:
  - le tracé du symbole, `MARK_PATH` (bulle) et `CORDS_PATH` (cordes, en trait), viewBox `0 0 48 48`, repris tel quel par le composant `Logo` (tâche 4) ;
  - le tracé vectorisé du mot « tamani » en Kalam Bold, `WORDMARK_PATH`, avec sa viewBox. Ces trois constantes vont dans `frontend/src/lib/design/logo-paths.ts`.

- [ ] **Step 1 : Écrire le test qui échoue** `brand-assets.test.ts`
  - `it('ships every brand file')` : les 6 fichiers existent (mark, logo, og, icon, apple-icon, logo-paths).
  - `it.each(['tamani-mark.svg','tamani-logo.svg','icon.svg'])('%s is self-contained')` : contient `viewBox`, aucun `<text`, aucun `href="http`, aucun `filter`.
  - `it('PNG sizes are exact')` : lire la largeur et la hauteur dans l'en-tête IHDR (octets 16 à 23, big-endian). `apple-icon.png` → 180×180, `og-default.png` → 1200×630.
  - `it('SVGs only use palette colors')` : chaque `#RRGGBB` des trois SVG appartient à `Object.values(colors)` de `tokens.ts`. Ce test échoue d'abord, car `tokens.ts` n'existe pas encore : la tâche 1 crée un `tokens.ts` minimal qui exporte `colors`, et la tâche 2 le complète.
- [ ] **Step 2 : Lancer le test et vérifier qu'il échoue**
  - Commande : `pnpm --filter frontend exec vitest run src/lib/design/brand-assets.test.ts`.
  - Attendu : FAIL, fichiers absents.
- [ ] **Step 3 : Vectoriser le mot-symbole.**
  - Préparation : un venv dans le dossier temporaire, avec `pip install fonttools`, et `Kalam-Bold.ttf` (licence OFL) téléchargé dans son propre dossier depuis `github.com/google/fonts/raw/main/ofl/kalam/Kalam-Bold.ttf`.
  - Un script Python (`-I`) enchaîne les glyphes de « tamani » avec leurs `advance` et le crénage `GPOS` s'il existe, via `SVGPathPen`. Il retourne l'axe Y, puis écrit le chemin et sa viewBox.
  - Le résultat est recopié dans `logo-paths.ts`. Ni la police ni le script n'entrent dans le repo, et `docs/brand/sources/README.md` documente la commande.
- [ ] **Step 4 : Écrire les SVG.**
  - Symbole :
    - `MARK_PATH = "M9 9 Q24 17 39 9 C46 13 46 31 39 35 Q29.5 29.9 20 31.3 L7 44 L13 33.2 Q11 33.9 9 35 C2 31 2 13 9 9 Z"`, rempli `accent`, contour `ink` de 2,3, `stroke-linejoin="round"` ;
    - `CORDS_PATH = "M11 17 Q24 20.2 37 17 M10 22 H38 M11 27 Q24 23.8 37 27"`, en trait `primary` de 2,7, `stroke-linecap="round"`.
  - Le logo place le symbole à gauche et le mot en `primary` à droite, avec un espacement égal à un quart de la hauteur du symbole.
  - `icon.svg` : un carré de 48 à coins de 12, rempli `primary`, avec le symbole réduit à 80 % et centré.
- [ ] **Step 5 : Rendre les PNG.**
  - Les sources sont `docs/brand/sources/apple-icon.html` (180×180, l'icône) et `og-default.html` (1200×630) :
    - fond papier à carreaux et ligne de marge ;
    - logo à gauche ;
    - slogan « Ta communauté parle. Tu sais quoi acheter. » en Kalam 700 `primary` ;
    - sous-ligne en Andika `ink-soft` : « Demande à ta communauté avant d'acheter ton stock. »
  - Rendu avec `chrome --headless=new --window-size=W,H --screenshot=… --virtual-time-budget=8000`, puis sortie vers `frontend/src/app/apple-icon.png` et `frontend/public/brand/og-default.png`. La commande exacte va dans le README des sources.
- [ ] **Step 6 : Écrire la charte `docs/brand/tamani-brand.md`.**
  - Contenu :
    - l'idée « Cahier du marché » ;
    - les piliers proximité, clarté, émerveillement, et comment chacun se voit à l'écran ;
    - la voix : tutoiement, phrases courtes, verbes d'action, des chiffres plutôt que des adjectifs, pas d'emoji dans l'interface (ils sont permis dans les messages WhatsApp) ;
    - la palette, avec un rôle et un interdit par couleur ;
    - la typographie : rôles, échelle, interdits ;
    - la mise en page : papier à carreaux de 18 px, ligne de marge, une audace par écran, surligneur réservé à l'argent, tampon réservé au verdict, auvent réservé au pop-up ;
    - le logo : zone de protection, taille minimum de 16 px, ce qu'il ne faut pas faire ;
    - le système de verdict ;
    - l'accessibilité.
- [ ] **Step 7 : Lancer le test et vérifier qu'il passe**, avec la même commande. Attendu : PASS.
- [ ] **Step 8 : Commit** `feat(brand): add the Cahier du marché charter, logo and brand files`.

### Task 2 : Tokens, polices et contrastes

**Files:**
- Modify: `frontend/src/lib/design/tokens.ts`, `frontend/src/app/globals.css`, `frontend/src/app/layout.tsx`
- Test: `frontend/src/lib/design/contrast.test.ts`, `frontend/src/lib/design/tokens-sync.test.ts`

**Interfaces:**
- Produces (`tokens.ts`) :
  - `colors: Readonly<Record<ColorToken, `#${string}`>>`, avec les 19 clés des Global Constraints en camelCase (`inkMuted`, `primaryInk`…) ;
  - `type VerdictTone = 'success' | 'warning' | 'danger' | 'neutral' | 'primary'` et `verdictToneColor: Record<VerdictTone, string>` (`neutral` → `neutralVerdict`) ;
  - `contrastPairs: ReadonlyArray<{ fg: ColorToken; bg: ColorToken; use: string }>` ;
  - `relativeLuminance(hex: string): number` (WCAG 2.1) et `contrastRatio(hexA: string, hexB: string): number`.
- Produces (`globals.css`) :
  - les utilitaires Tailwind `bg-*`, `text-*`, `border-*` pour chaque couleur, en kebab-case ;
  - `font-sans`, `font-hand`, `font-sign` ;
  - `rounded-case` (4 px), `rounded-control` (16 px), `rounded-card` (18 px), `rounded-sheet` (30 px) ;
  - `shadow-press` (`4px 4px 0` ink) et `shadow-sheet` ;
  - `animate-sheet-up` ;
  - les `@utility` `bg-paper` (carreaux de 18 px), `border-ink` (2,5 px, ink), `highlight` (surligneur jaune), `stamp` (filtre `#tm-ink`, `mix-blend-mode: multiply`) et `pen` (filtre `#tm-pen`).

- [ ] **Step 1 : Tests qui échouent.**
  - `contrast.test.ts` :
    - `contrastRatio('#000000','#FFFFFF')` vaut 21 à 0,01 près ;
    - `contrastRatio('#FFFFFF','#FFFFFF') === 1` ;
    - le résultat est symétrique ;
    - `it.each(contrastPairs)` vérifie que chaque paire est ≥ 4,5.
  - Les paires couvrent au minimum :
    - `ink`, `ink-soft` et `ink-muted` sur `bg` et `surface` ;
    - `primary` sur `bg` ;
    - `primary-ink` sur `primary`, `success`, `warning` et `danger` ;
    - `accent-ink` sur `accent` ;
    - `whatsapp-ink` sur `whatsapp` ;
    - les 5 teintes de verdict sur `bg` et sur `surface`.
  - `tokens-sync.test.ts` : chaque `--color-<kebab>: #hex;` du bloc `@theme` de `globals.css` est égal à `colors[camel]`, et chaque clé de `colors` est présente dans `@theme`.
- [ ] **Step 2 : Lancer et vérifier qu'ils échouent.**
  - Commande : `pnpm --filter frontend exec vitest run src/lib/design`.
  - Attendu : FAIL, fonctions et tokens absents.
- [ ] **Step 3 : Implémenter `tokens.ts` et `globals.css`.**
  - `@import 'tailwindcss';`, puis `@theme { … }` avec les couleurs, et `@theme inline { --font-sans: var(--font-andika); --font-hand: var(--font-kalam); --font-sign: var(--font-bowlby); }`.
  - Les rayons, les ombres et l'échelle de texte (12, 14, 16, 18, 21, 24, 32, 40, 48, 60 px).
  - `@keyframes sheet-up` : de `translateY(100%)` à `none`, en 280 ms `cubic-bezier(.2,.8,.2,1)`.
  - Couche de base : `body` en `bg-bg text-ink font-sans`, `-webkit-tap-highlight-color: transparent`, et un `:focus-visible` à 3 px `primary` avec un décalage de 2 px.
- [ ] **Step 4 : Polices dans `layout.tsx`.**
  - `Andika({ weight: ['400','700'], subsets: ['latin'], variable: '--font-andika', display: 'swap' })`, puis `Kalam` (400 et 700, `--font-kalam`) et `Bowlby_One` (400, `--font-bowlby`).
  - Les trois variables vont sur `<html>`. On retire Inter. On garde `lang="fr"` et le commentaire sur les providers.
  - Ajout de `export const viewport = { themeColor: '#1A4FBF' }`.
- [ ] **Step 5 : Lancer les tests et vérifier qu'ils passent**, avec la même commande. Attendu : PASS.
- [ ] **Step 6 : Barrière, puis commit** `feat(design): add Tamani tokens, fonts and contrast tests`.

### Task 3 : Logique d'affichage du verdict

**Files:**
- Create: `frontend/src/lib/tamani/verdict-display.ts`
- Test: `frontend/src/lib/tamani/verdict-display.test.ts`
- Modify: `docs/superpowers/plans/2026-10-24-tamani-roadmap.md` (§Contrats : `VerdictCode` naît au lot 2 ; `computeVerdict` du lot 6 l'importe)

**Interfaces:**
- Produces :
  - `type VerdictCode = 'WAIT' | 'GO' | 'CAUTION' | 'STOP' | 'NEUTRAL'` et `VERDICT_TONE: Record<VerdictCode, VerdictTone>` : GO → `success`, CAUTION → `warning`, STOP → `danger`, WAIT → `neutral`, NEUTRAL → `primary` ;
  - `approxQuantity(n: number): number` : `n < 30` donne `n`, sinon `Math.round(n / 10) * 10` ;
  - `pluralizeUnit(unitLabel: string, n: number): string` : pour `n ≥ 2`, ajoute un `s` au premier mot s'il ne finit pas déjà par `s`, `x` ou `z` ;
  - `verdictDisplay(i: { code: VerdictCode; realistic: number; completedResponses: number; reference: number | null; unitLabel?: string; minResponses?: number }): { tone: VerdictTone; stampWord: string; figure: string; unit: string; sentence: string; note: string | null }` ;
  - `verdictBasis(i: { low: number; high: number; completedResponses: number; interestedCount: number; unitLabel?: string }): string`.

- [ ] **Step 1 : Tests qui échouent** (valeurs exactes, avec `unitLabel` par défaut `'pièce'` et `minResponses` à 20).
  - `approxQuantity` : 211 → 210, 176 → 180, 29 → 29, 9 → 9, 1234 → 1230.
  - `pluralizeUnit` : `('pièce', 210)` → `'pièces'` ; `('carton', 1)` → `'carton'` ; `('sac de 25 kg', 12)` → `'sacs de 25 kg'` ; `('colis', 3)` → `'colis'`.
  - `CAUTION` (realistic 211, 94 réponses, référence 400) donne :
    - `{ tone: 'warning', stampWord: 'Prudence', figure: '~210', unit: 'pièces', sentence: 'Commande environ 210 pièces, pas les 400 prévues.', note: 'et pas 400 !' }`.
  - `GO` (realistic 380, référence 400) donne :
    - `{ tone: 'success', stampWord: 'Commande', figure: '~380', sentence: 'Commande environ 380 pièces.', note: null }`.
  - `STOP` (realistic 90, référence 400) donne :
    - `{ tone: 'danger', stampWord: "N'achète pas", figure: '~90', unit: 'pièces au plus', sentence: "N'achète pas, ou très peu : la demande réaliste est de 90 pièces pour 400 prévues.", note: 'et pas 400 !' }`.
  - `WAIT` (9 réponses) donne :
    - `{ tone: 'neutral', stampWord: 'On attend', figure: '9/20', unit: 'réponses', sentence: 'Encore 11 réponses avant de te conseiller.', note: null }`.
  - `WAIT` (19 réponses) donne `sentence: 'Encore 1 réponse avant de te conseiller.'` (Review Focus 2).
  - `NEUTRAL` (realistic 211, sans référence) donne :
    - `{ tone: 'primary', stampWord: 'Demande', figure: '~210', sentence: 'Ta communauté demande environ 210 pièces.', note: null }`.
  - `verdictBasis({ low: 176, high: 246, completedResponses: 94, interestedCount: 64 })` donne `"Entre 176 et 246 pièces, d'après 94 réponses dont 64 intéressés."`.
  - Avec 1 réponse dont 1 intéressé, on obtient « d'après 1 réponse dont 1 intéressé ».
- [ ] **Step 2 : Lancer et vérifier qu'ils échouent.**
  - Commande : `pnpm --filter frontend exec vitest run src/lib/tamani/verdict-display.test.ts`.
  - Attendu : FAIL, module absent.
- [ ] **Step 3 : Implémenter `verdict-display.ts`** (pur, sans import serveur). Les nombres de la phrase sont `approxQuantity(realistic)` et `reference` bruts.
- [ ] **Step 4 : Lancer et vérifier qu'ils passent**, avec la même commande. Attendu : PASS.
- [ ] **Step 5 : Mettre à jour la feuille de route.**
  - Ajouter dans §Contrats le bloc « Lot 2 » : `lib/design/tokens.ts`, `lib/design/logo-paths.ts`, `lib/tamani/verdict-display.ts` et la liste des composants.
  - Dans `verdict.ts` (lot 6), écrire `code: VerdictCode` importé de `@/lib/tamani/verdict-display`.
- [ ] **Step 6 : Barrière, puis commit** `feat(tamani): add verdict display rules shared by the UI`.

### Task 4 : Composants d'interface

**Files:**
- Modify: `frontend/vitest.config.ts` : `include` ajoute `src/**/*.test.tsx`, et `esbuild: { jsx: 'automatic' }`.
- Create sous `frontend/src/components/ui/` :
  - `Button.tsx`, `ChoiceButton.tsx`, `Input.tsx`, `PhoneInput.tsx`, `Card.tsx`, `Badge.tsx` ;
  - `BottomSheet.tsx`, `StatTile.tsx`, `VerdictCard.tsx`, `MoneyCard.tsx`, `FilterBar.tsx`, `DataList.tsx`, `EmptyState.tsx` ;
  - `Logo.tsx`, `InkFilters.tsx`, `CalcTable.tsx` ;
  - `index.ts`.
- Modify: `frontend/src/app/layout.tsx` : `<InkFilters />` en premier enfant de `<body>`.
- Test: `frontend/src/components/ui/primitives.test.tsx`, `frontend/src/components/ui/composites.test.tsx`

**Interfaces:**
- Consumes : les classes de la tâche 2, `verdictDisplay` et `verdictBasis` de la tâche 3, les chemins de `logo-paths.ts` de la tâche 1, et `cn` et `formatPrice` de `@/lib/utils`.
- Produces : les composants ci-dessous, tous composants serveur, sans `'use client'` et sans état, et sans import de `@/contexts`.
  - `Button({ variant?: 'primary' | 'secondary' | 'whatsapp' | 'ghost'; size?: 'md' | 'lg'; href?: string; …ButtonHTMLAttributes })`.
    - Rendu : `<a>` si `href`, sinon `<button type="button">` par défaut.
    - Hauteur minimale 48 px (`min-h-12`), `border-ink`, `rounded-control`, texte en 700.
    - `whatsapp` : `bg-whatsapp text-whatsapp-ink`, avec l'icône WhatsApp en ligne.
  - `ChoiceButton({ selected?: boolean; emphasis?: boolean; …ButtonHTMLAttributes })`.
    - `min-h-16`, `aria-pressed={selected}`, `border-ink`, `rounded-card`, texte de 21 px en 700.
    - `emphasis` : `bg-primary text-primary-ink shadow-press`. `selected` : `bg-accent`.
  - `Input({ label: string; hint?: string; error?: string; id: string; …InputHTMLAttributes })`.
    - Le `<label htmlFor>` est relié au champ, le texte est en `text-base`.
    - En cas d'erreur : `aria-invalid` et `aria-describedby` pointent vers le message.
  - `PhoneInput(Input props & { dialCode?: string })`.
    - `dialCode` vaut `'+221'` par défaut et s'affiche en préfixe non éditable.
    - `type="tel"`, `inputMode="tel"`, `autoComplete="tel-national"`.
  - `Card({ tone?: 'surface' | 'paper' | 'ink'; as?: 'div' | 'section' | 'article'; className?; children })` : `rounded-card border-ink`.
  - `Badge({ tone: VerdictTone | 'accent'; children })`.
  - `BottomSheet({ children; awning?: boolean; label: string; className? })`.
    - `<section aria-label>` en `bg-paper rounded-t-sheet shadow-sheet animate-sheet-up motion-reduce:animate-none`.
    - `awning` vaut `true` par défaut : une frise SVG d'auvent (festons bleus et jaunes de 14 px) en haut de la feuille.
  - `StatTile({ label; value: ReactNode; hint?: string })` : la valeur en `font-sign`.
  - `VerdictCard({ code; realistic; completedResponses; reference: number | null; unitLabel?; basis?: { low; high; interestedCount } })`.
    - Un tampon `stamp` tourné de −5°, de la couleur de son ton, avec double bordure : mot, chiffre et unité en `font-sign`, mot en capitales espacées.
    - La note à la main (`font-hand`, `primary`) si `note` est présent.
    - La phrase, puis `verdictBasis` si `basis` est fourni.
    - Le chiffre utilise `break-words` et le tampon a une largeur maximale de 100 %.
  - `MoneyCard({ avoidedDeadStock: number | null; expectedProfit: number | null; reference?: number; addCostPriceHref?: string })`.
    - Le montant évité est en `font-sign` avec `highlight`. La phrase dit : « de stock qui aurait dormi au dépôt si tu commandais {reference}. »
    - Une ligne à points de conduite affiche « Bénéfice attendu … ~{montant} FCFA ».
    - Si les deux valeurs sont `null` : « Ajoute ton prix d'achat pour voir l'argent que tu évites. », avec un lien si `addCostPriceHref` est fourni.
  - `FilterBar({ label: string; items: ReadonlyArray<{ id; label; href; active?: boolean; count?: number }> })`.
    - `<nav aria-label>` qui défile horizontalement.
    - Chaque puce est un `<a>`. La puce active est en `bg-accent` avec `aria-current="true"`.
  - `DataList({ items: ReadonlyArray<{ id; label: ReactNode; value: ReactNode }> })` : des lignes de 36 px avec des points de conduite, la valeur en gras.
  - `EmptyState({ title; children; action?: ReactNode })` : titre en `font-hand`, plus le symbole du logo.
  - `Logo({ variant?: 'mark' | 'lockup'; size?: number; className? })` : SVG en ligne, `role="img"` et `aria-label="Tamani"`.
  - `InkFilters()` : un `<svg>` caché qui contient `filter#tm-ink` (bords et grain de tampon) et `filter#tm-pen` (tremblé du stylo).
  - `CalcTable({ rows: ReadonlyArray<{ label; count?: number; announced: number; coef: number; realistic: number }>; total: { announced: number; realistic: number }; footnote?: string })`.
    - Le coefficient s'affiche au format français (`× 0,7`) et le total réaliste sous la forme `≈ 211`.

- [ ] **Step 1 : Tests qui échouent.** Dans `primitives.test.tsx` et `composites.test.tsx`, on rend chaque composant avec `renderToStaticMarkup` et on vérifie :
  - `Button` : `href` → `<a href=…>` ; sans `href` → `type="button"` ; `variant="whatsapp"` contient `bg-whatsapp`.
  - `ChoiceButton` : `min-h-16`, `aria-pressed="true"` si `selected`, et `shadow-press` si `emphasis`.
  - `Input and PhoneInput render text-base (16px)` (Review Focus 4) : le label est relié par `for` et `id`, `+221` est visible, `type="tel"`, et une erreur pose `aria-invalid="true"` et `aria-describedby`.
  - `Badge` : la classe de ton correspond.
  - `BottomSheet disables its animation under reduced motion` (Review Focus 5) : `animate-sheet-up` et `motion-reduce:animate-none` sont présents. Le SVG d'auvent est là par défaut et absent avec `awning={false}`.
  - `VerdictCard` :
    - le cas CAUTION de la tâche 3 affiche « Prudence », « ~210 », la phrase, « et pas 400 ! », la base et `text-warning` ;
    - `WAIT` affiche « 9/20 » ;
    - `VerdictCard keeps long figures inside the card (break-words, no fixed width)` (Review Focus 1) : avec realistic 1250 et `unitLabel` « sac de 25 kg », on lit « ~1250 » et « sacs de 25 kg », la classe `break-words` est présente et aucune `w-[` fixe sur le tampon.
  - `MoneyCard` : `850 500 FCFA`, `~444 000 FCFA`, la phrase avec 400 ; les deux valeurs `null` donnent le texte d'invitation.
  - `FilterBar` : la puce active porte `aria-current="true"`.
  - `DataList`, `StatTile`, `EmptyState` : le contenu est rendu.
  - `CalcTable` : `× 0,7`, `≈ 211`.
  - `Logo` : `aria-label="Tamani"`, et `lockup` contient `WORDMARK_PATH`.
- [ ] **Step 2 : Lancer et vérifier qu'ils échouent.**
  - Commande : `pnpm --filter frontend exec vitest run src/components`.
  - Attendu : FAIL, modules absents. La config est déjà modifiée, sinon le résultat serait « no tests found ».
- [ ] **Step 3 : Implémenter les composants** en reprenant la maquette de référence, fusion 1, et l'auvent de la fusion 2.
- [ ] **Step 4 : Lancer et vérifier qu'ils passent**, avec la même commande. Attendu : PASS.
- [ ] **Step 5 : Barrière, puis commit** `feat(ui): add the Tamani component kit`.

### Task 5 : Page `/styleguide`, garde-fou pop-up et validation du lot

**Files:**
- Create: `frontend/src/app/(public)/styleguide/page.tsx`
- Test: `frontend/src/app/(public)/styleguide/page.test.tsx`, `frontend/src/lib/server/observability/no-motion-in-popup.test.ts`
- Modify: `frontend/src/app/error.tsx` (en français, avec la charte), `CLAUDE.md` (section « Design system » : pointer vers la charte et les composants)

**Interfaces:**
- Consumes : tous les composants de la tâche 4.

- [ ] **Step 1 : Tests qui échouent.**
  - `page.test.tsx` : avec `vi.stubEnv('NODE_ENV', 'production')` et un `notFound` simulé qui lève une erreur `NEXT_NOT_FOUND`, l'appel `StyleguidePage()` lève l'erreur. En `development`, la page rend « Tamani », « Prudence » et « Ça t'intéresse ? ».
  - `no-motion-in-popup.test.ts` : `BottomSheet.tsx`, `ChoiceButton.tsx` et chaque fichier sous `app/(public)/c/`, s'il existe, ne contiennent aucun import correspondant à `/from ['"](motion|framer-motion|gsap)(\/|['"])/`.
- [ ] **Step 2 : Lancer et vérifier qu'ils échouent.**
  - Commande : `pnpm --filter frontend exec vitest run "src/app/(public)/styleguide" src/lib/server/observability/no-motion-in-popup.test.ts`.
  - Attendu : FAIL, page absente. Le garde-fou passe déjà, ce qui est normal pour une protection qui verrouille l'existant : on le note.
- [ ] **Step 3 : Implémenter `/styleguide`.**
  - Contenu :
    - le logo, le symbole et l'icône ;
    - la palette avec ses rôles ;
    - l'échelle typographique ;
    - chaque composant et chaque verdict ;
    - la page campagne complète, recomposée avec les composants, avec les chiffres de la maquette ;
    - la première étape du pop-up, dans un `BottomSheet` avec son auvent.
  - En tête : `if (process.env.NODE_ENV === 'production') notFound();`, et `export const metadata = { robots: { index: false } }`.
  - Réécrire `error.tsx` en français : « Quelque chose s'est mal passé. », bouton « Réessayer ».
- [ ] **Step 4 : Lancer et vérifier qu'ils passent**, avec la même commande. Attendu : PASS.
- [ ] **Step 5 : Recette visuelle.**
  - Lancer `next dev` sur le port 3001, puis capturer `/styleguide` en Chrome headless à 390 et à 1280 de large.
  - Comparer à la maquette de référence : débordements, contrastes, alignements. Corriger, puis recapturer.
  - Arrêter le serveur de dev **par son PID**.
- [ ] **Step 6 : Barrière complète et build.**
  - Commande : `pnpm format && pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
  - Attendu : tout passe, et le build réussit avec `/styleguide` en 404 en production.
- [ ] **Step 7 : Commit** `feat(ui): add the dev-only styleguide and popup motion tripwire`, puis poussée de la branche et PR vers `main`.
- [ ] **Step 8 : S'arrêter.** La fusion se fait après relecture et accord du porteur du projet.

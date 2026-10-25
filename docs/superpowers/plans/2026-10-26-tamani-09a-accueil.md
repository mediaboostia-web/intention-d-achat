# Tamani 09a : la page d'accueil publique

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la page `/` provisoire par la vraie page d'accueil, construite d'après la maquette v3 validée par le porteur, avec ses 9 illustrations.

**Architecture:**
- La page est un composant serveur, `app/(public)/page.tsx`. Elle assemble des sections serveur rangées dans `components/landing/`.
- Seuls les morceaux qui bougent sont des composants client :
  - la barre de navigation ;
  - l'orbite des réseaux ;
  - la barre avant / après ;
  - le choix mois ou année des tarifs ;
  - le bouton de la vidéo ;
  - le bouton fixe sur téléphone ;
  - un petit déclencheur « à l'écran ».
- Le contenu qui sert deux fois (FAQ, tarifs, JSON-LD) et toute la logique sans DOM vivent dans `lib/tamani/landing.ts`, testé. Les chiffres des forfaits viennent de `PLANS`.
- Les styles propres à cette page sont dans `components/landing/landing.css` (classes `lp-*`, couleurs par les variables du thème). Le reste passe par les utilitaires du kit.

**Tech Stack:** Next.js 16 (App Router, `next/image`, Metadata API, `robots.ts`, `sitemap.ts`), React 19, Tailwind 4 (jetons du lot 2), Vitest (HTML statique), sharp (fourni par Next) pour convertir les images.

**Spec:** [maquette v3](../../brand/mockups/2026-10-25-page-accueil-v3.html) (la référence visuelle et le texte) ; spec produit [2026-10-24-tamani-design.md](../specs/2026-10-24-tamani-design.md) §5.6 (forfaits) ; [retours du porteur](../specs/2026-10-25-tamani-retours-porteur.md) §4 ; charte [tamani-brand.md](../../brand/tamani-brand.md).

## Global Constraints

- Ordre des sections, voulu par le porteur :
  1. hero ;
  2. vidéo de présentation ;
  3. problème ;
  4. solution (l'orbite) ;
  5. comment ça marche ;
  6. avant / après ;
  7. tarifs ;
  8. rejoindre la communauté ;
  9. FAQ ;
  10. pied de page.
- Aucun écran de téléphone dessiné. La seule figure de verdict est le tampon. La page suit **un seul exemple** : 300 cartons commandés, 190 qui dorment, 190 × 10 000 = 1 900 000 FCFA bloqués ; avec Tamani, « Commande ≈ 120 cartons ».
- Durée de réponse annoncée : **« moins de 30 secondes »** partout (décision du porteur du 2026-10-25). Le texte « 5 secondes » disparaît du code produit.
- La barre de navigation suit le modèle des captures du porteur :
  - une barre blanche flottante aux coins arrondis, avec le logo à gauche, les liens au centre à partir de 1200 px et un bouton foncé à droite ;
  - elle se cache quand on descend (au-delà de 120 px) et revient dès qu'on remonte, jamais pendant que le menu est ouvert ou qu'un lien a le focus clavier.
- Pied de page : le mot « tamani » entier, jamais coupé.
- Aucune librairie d'animation. Tout bouge en CSS, avec un peu de JS sans dépendance. Tout s'arrête sous `prefers-reduced-motion`.
- Couleurs : uniquement les jetons (le test `no-default-palette` vérifie les fichiers `.tsx`).
- Aucun tiret cadratin ni demi-cadratin dans le texte affiché.
- Les liens que le porteur n'a pas encore fournis ne s'affichent pas tant qu'ils valent `null` :
  - le numéro WhatsApp de contact ;
  - le lien du groupe WhatsApp ;
  - les comptes Facebook, Instagram et TikTok ;
  - la vidéo.
- Images : `next/image`, sources en WebP dans `frontend/public/accueil/`, produites par `frontend/scripts/landing-images.mjs` à partir des PNG de `docs/brand/mockups/images/`. Les PNG d'origine ne sont pas versionnés.
- Barrière avant chaque commit : `pnpm format && pnpm lint && pnpm typecheck && pnpm test` ; `pnpm build` en fin de lot.

## Review Focus

1. **Un visiteur qui navigue au clavier** : la barre ne doit pas se cacher pendant que son focus est dedans. Le menu se ferme avec Échap. La barre avant / après se pilote aux flèches. → `navStep keeps the bar while busy` et le test du curseur `range`.
2. **Un téléphone qui fait défiler la page sur la barre avant / après** : un glissement vertical fait défiler la page, il ne déplace pas la barre. → `touch-action: pan-y`, et le doigt ne déplace la barre qu'au-delà de 6 px à l'horizontale.
3. **Les liens pas encore fournis** : aucun bouton ne mène nulle part. → `community section hides the WhatsApp group button without a link`.
4. **Les chiffres des forfaits changent dans `PLANS`** : la page et le JSON-LD suivent. → `pricingTiers reads PLANS` et `landingJsonLd offers match PLANS`.
5. **Les réglages « réduire les animations »** : l'état final s'affiche (tampons posés, surligneur mis), rien ne boucle. → CSS `prefers-reduced-motion` ; `InView` passe à `true` tout de suite.

---

### Task 1 : Les images et l'outil qui les prépare

**Files:**
- Create: `frontend/scripts/landing-images.mjs`, `frontend/public/accueil/*.webp` (9 fichiers)
- Modify: `frontend/package.json` (script `landing:images`), `package.json` (délégation), `.gitignore` (`docs/brand/mockups/images/*.png`), `docs/brand/mockups/2026-10-25-page-accueil-v3.html` (sources `.webp`), `docs/brand/prompts-images-accueil.md` (étape « lance `pnpm landing:images` »)

- [ ] Le script charge sharp via `createRequire(require.resolve('next/package.json'))`, lit les 9 PNG attendus et écrit des WebP en qualité 78, 1600 px de large au plus. Il refuse de tourner si un fichier manque et affiche le poids de chaque WebP.
- [ ] `pnpm landing:images` produit les 9 WebP, chacun sous 350 Ko.
- [ ] Commit `chore(accueil): optimised landing illustrations and the script that makes them`.

### Task 2 : Le tampon et deux icônes dans le kit

**Files:**
- Create: `frontend/src/components/ui/Stamp.tsx`
- Modify: `VerdictCard.tsx` (utilise `Stamp`), `icons.tsx` (`menu`, `chevron`), `index.ts`, `composites.test.tsx`, `primitives.test.tsx`

**Interfaces:**
- Produces: `Stamp({ word, figure, unit, tone, dashed?, className? })`, qui rend le bloc tampon actuel de VerdictCard : `stamp`, bordure double, −5°, le texte du ton. `IconName` gagne `'menu' | 'chevron'` (`chevron` pointe à gauche).

- [ ] Test d'abord :
  - `Stamp renders the word, the figure and the unit in the tone colour` : `text-success`, `-rotate-[5deg]`, classe `stamp` ;
  - `Stamp is dashed for the neutral tone` ;
  - les tests existants de VerdictCard restent verts.
- [ ] Extraire le bloc de VerdictCard dans `Stamp`. VerdictCard l'appelle.
- [ ] Ajouter `menu` (trois traits) et `chevron` (`m14.5 5.5-6.5 6.5 6.5 6.5`) aux icônes.
- [ ] Commit `feat(ui): Stamp extracted from VerdictCard, menu and chevron icons`.

### Task 3 : Le contenu et la logique de la page (`lib/tamani/landing.ts`)

**Files:**
- Create: `frontend/src/lib/tamani/landing.ts`, `frontend/src/lib/tamani/landing.test.ts`

**Interfaces (Produces):**
- `LANDING_LINKS: { whatsappContact: string | null; community: string | null; facebook: string | null; instagram: string | null; tiktok: string | null }`. Toutes les valeurs valent `null` tant que le porteur ne les a pas fournies.
- `LANDING_VIDEO: { src: string; poster?: string; captions?: string } | null`, qui vaut `null` aujourd'hui.
- `LANDING_FAQ: readonly { question: string; answer: string }[]` : les 7 questions de la maquette. Les chiffres du forfait Gratuit viennent de `PLANS.FREE`.
- `pricingTiers(months: 1 | 12): PricingTier[]`, avec :
  ```ts
  interface PricingTier {
    id: PlanId;
    price: string;
    unit: string;
    per: string;
  }
  ```
  - FREE : `price = '0'`, `unit = 'FCFA'`, `per = 'Pour toujours'` ;
  - PRO au mois : `price = '9 900'` (espace fine U+202F), `per = 'Sans engagement'` ;
  - PRO à l'année : `price = '8 250'`, `per = 'Payé 99 000 FCFA pour 12 mois, au lieu de 118 800.'` ;
  - les prix sont calculés avec `priceFor`.
- `navStep(prev: { lastY: number; hidden: boolean }, y: number, busy: boolean): { lastY: number; hidden: boolean }` :
  - `y <= 120` → visible ;
  - descente de plus de 6 px et `!busy` → cachée ;
  - montée de plus de 6 px → visible ;
  - `lastY` ne bouge qu'au-delà de 6 px.
- `pickWeighted(weights: readonly number[], r: number): number`, où `r` est dans [0, 1).
- `clampPercent(n: number): number`, entre 0 et 100.
- `landingJsonLd(appUrl: string)` : le graphe `Organization`, `WebSite`, `SoftwareApplication` (offres XOF tirées de `PLANS`) et `FAQPage` (tiré de `LANDING_FAQ`).
- `landingMetadata(appUrl: string): Metadata` : titre, description, canonique, Open Graph et Twitter, avec l'image `/brand/og-default.png`.

- [ ] Tests d'abord, dont :
  - `pricingTiers reads PLANS` : les valeurs ci-dessus ;
  - `navStep hides on the way down and shows on the way up` ;
  - `navStep keeps the bar while busy` ;
  - `navStep shows the bar near the top` ;
  - `navStep ignores jitter under 6 px` ;
  - `pickWeighted` : `([1, 1], 0.2) → 0`, `([1, 1], 0.7) → 1`, `([0, 3], 0) → 1` ;
  - `clampPercent(-4) === 0` et `clampPercent(140) === 100` ;
  - `landingJsonLd offers match PLANS` ;
  - `the FAQ JSON-LD repeats LANDING_FAQ` ;
  - `landingMetadata uses APP_URL for canonical and og:url` ;
  - `no copy says 5 secondes and no copy has an em or en dash`.
- [ ] Implémenter.
- [ ] Commit `feat(accueil): landing content, pricing tiers, nav and orbit logic`.

### Task 4 : « Moins de 30 secondes » dans le message de partage et l'aperçu du lien

**Files:**
- Modify:
  - `frontend/src/lib/tamani/share-message.ts` et son test ;
  - `popup-metadata.ts` et son test ;
  - `campaign-view.test.ts` ;
  - les docs : roadmap l. 150, spec l. 93.

- [ ] Changer d'abord les attentes des tests : `… Tu en veux ? Réponds en moins de 30 secondes 👉 …` et `… Arrivage dans 10 jours. Réponds en moins de 30 secondes.`. Vérifier qu'ils échouent.
- [ ] Changer `DEFAULT_SHARE_TEMPLATE` et la description de l'aperçu. Les tests passent.
- [ ] Commit `fix(share): the share message promises an answer in under 30 seconds`.

### Task 5 : Les sections de la page

**Files:**
- Create in `frontend/src/components/landing/` :
  - `landing.css`, `platform-logos.ts`, `PlatformLogo.tsx`, `Illustration.tsx`, `InView.tsx` ;
  - `LandingNav.tsx`, `Hero.tsx`, `Film.tsx`, `Problem.tsx`, `Solution.tsx`, `Orbit.tsx`, `Steps.tsx`, `BeforeAfter.tsx`, `Pricing.tsx`, `PricingTags.tsx`, `Community.tsx`, `Faq.tsx`, `LandingFooter.tsx`, `StickyCta.tsx` ;
  - `landing.test.tsx`.

**Interfaces:**
- Consumes : `Stamp`, `Icon`, `Logo`, `Button` (tâche 2) ; `LANDING_*`, `pricingTiers`, `navStep`, `pickWeighted`, `clampPercent` (tâche 3) ; `WORDMARK_PATH`, `WORDMARK_VIEWBOX`.
- `InView({ as?, threshold?, className?, children })` : client. Pose `data-inview="true"` une fois l'élément à l'écran, et tout de suite sous `prefers-reduced-motion`.
- `Illustration({ name, alt, ink?, sizes, preload? })` : `next/image` sur `/accueil/<name>.webp`, avec largeur et hauteur tirées d'une table `LANDING_IMAGES`. `ink` multiplie l'image sur le papier.

- [ ] Tests d'abord (HTML statique), dont :
  - `sections come in the porteur's order` : ids `film`, `probleme`, `solution`, `comment-ca-marche`, `avant-apres`, `tarifs`, `communaute`, `questions` ;
  - `the hero has one h1 on two lines and a sign-up link` ;
  - `every illustration has an alt text and a webp source` ;
  - `the orbit lists the 8 networks with their real logos` ;
  - `the before/after slider is a labelled range` ;
  - `pricing shows the PLANS prices` ;
  - `community section hides the WhatsApp group button without a link` ;
  - `the footer wordmark viewBox starts at the path's own origin` ;
  - `no phone mockup` (aucune classe `dphone`/`device`).
- [ ] Porter la maquette v3 section par section, puis vérifier que les tests passent.
- [ ] Commit `feat(accueil): the landing sections, from the v3 mockup`.

### Task 6 : La route `/`, le référencement

**Files:**
- Modify: `frontend/src/app/(public)/page.tsx`
- Create: `frontend/src/app/(public)/page.test.tsx`, `frontend/src/app/robots.ts`, `frontend/src/app/sitemap.ts` (et leurs tests)

- [ ] Tests d'abord :
  - `the home page renders every section and the JSON-LD` : le script `application/ld+json` se lit avec `JSON.parse` ;
  - `generateMetadata reads APP_URL` ;
  - `robots disallows /app, /admin and /api and points to the sitemap` ;
  - `sitemap lists the home page`.
- [ ] Implémenter.
- [ ] Commit `feat(accueil): the home page route, robots and sitemap`.

### Task 7 : Documentation, vérification, PR

- [ ] `CLAUDE.md` : une section « Tamani landing page (lot 9a) ».
- [ ] Roadmap : la page d'accueil est livrée, et la décision des 30 secondes y est notée.
- [ ] `pnpm build`.
- [ ] Captures à 390 et 1280 px sur `next start` :
  - pas de débordement sur les côtés ;
  - la barre se cache en descendant et revient en remontant ;
  - les images s'affichent.
- [ ] Revue de toute la branche, puis PR vers `main` (fusion après l'accord du porteur).

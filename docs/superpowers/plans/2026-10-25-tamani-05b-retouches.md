# Tamani lot 5b — Retouches de l'espace grossiste : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** L'espace grossiste reprend les gestes des applications de tous les jours (WhatsApp, mobile money) : une barre latérale qui a du caractère, un accueil qui montre la semaine et l'activité, des filtres à pastilles, une liste de clients, des unités et une date d'arrivée simples, une description de boutique, des Réglages par sections et une connexion en deux colonnes.

**Architecture:** Deux lectures serveur nouvelles alimentent les écrans : `buildShopSummary` (sous-ensemble du lot 6) pour l'accueil, et `listClients` / `getClient` (avancés du lot 7) pour les clients, qui masquent les numéros en Gratuit côté serveur. Le reste est de l'interface : le kit `components/ui/` gagne `Avatar`, `Fab`, des icônes et des pastilles à icône ; `components/app/` gagne `HomeView`, `SearchField` et les listes. Une migration ajoute `Organization.description`.

**Tech Stack:** Next.js 16 (App Router), React 19, Prisma 5 + Neon, Tailwind v4 (jetons seulement), zod 4, Vitest (HTML statique avec `react-dom/server`).

**Spec:** [docs/superpowers/specs/2026-10-25-tamani-retours-porteur.md](../specs/2026-10-25-tamani-retours-porteur.md) §3 et §3 bis (maquettes validées), et [docs/superpowers/specs/2026-10-24-tamani-design.md](../specs/2026-10-24-tamani-design.md) §5.5.2 (clients) et §5.6 (forfaits). Charte : [docs/brand/tamani-brand.md](../../brand/tamani-brand.md). Contrats : [roadmap](2026-10-24-tamani-roadmap.md) §Contrats.

## Global Constraints

- Toutes les contraintes de la roadmap §Global Constraints s'appliquent (runtime `nodejs`, `withRequestContext`, codes d'erreur stables, fichiers protégés intouchés, `pnpm format && pnpm lint && pnpm typecheck && pnpm test` avant chaque commit).
- Jetons seulement (`no-default-palette.test.ts`). Effets au survol en CSS, coupés sous `prefers-reduced-motion` (`motion-reduce:`). Aucune librairie d'animation.
- Gratuit (`respondentContacts: false`) : **aucun numéro complet ne quitte le serveur** pour les clients ; le numéro affiché passe par `maskPhone`, le bouton WhatsApp est verrouillé avec « Passe au Pro pour contacter {prénom}. ».
- Jamais de numéro ni de prénom de répondant dans `log.*` ou Sentry (on journalise des ids).
- Un client visible = non anonymisé, avec au moins une réponse complète, non verrouillée et non suspecte.
- Pastilles : une pastille n'apparaît que si son nombre est supérieur à 0 ; « Toutes » / « Tous » et la pastille active restent toujours.
- Textes exacts : une salutation selon l'heure du téléphone, « Bonjour » de 5 h à midi, « Bon après-midi » de midi à 18 h, « Bonsoir » ensuite, suivie du prénom (sinon de la boutique) : « Bonsoir, Fatou » ; « Cette semaine » ; « +{n} depuis hier » ; « Activité » ; « À venir » ; « Pour bien démarrer » ; « Avant de commander, demande à ta communauté. » ; « ou avec ton e-mail ».
- Description de boutique : 300 caractères au plus. Unité : 30 caractères au plus (inchangé).
- Date d'arrivée : une date seule, refusée avant le jour courant (UTC, Dakar est à UTC+0).
- Téléphone d'abord : pas de défilement horizontal à 320 px, cibles tactiles de 48 px (`min-h-12`) au moins.

## Review Focus

1. **Un compte Gratuit ne reçoit jamais un numéro complet**, ni dans la liste, ni dans la fiche, ni dans l'accueil, et la recherche par chiffres ne sert pas à confirmer un numéro masqué. → Task 4, `FREE rows carry no full number` et `FREE search ignores digits` ; Task 2, `the summary never carries a phone number`.
2. **Un client dont toutes les réponses sont verrouillées ou suspectes reste caché** (liste, compteurs, fiche en 404, accueil). → Task 4, `hides a client whose only responses are locked or suspicious` ; Task 2, `a new client whose answer is locked does not show`.
3. **Une boutique sans campagne** voit « Pour bien démarrer », jamais une carte remplie de zéros. → Task 2, `an empty shop sees the first steps, not the week card`.
4. **La recherche** ignore la casse, et un numéro tapé avec des espaces (« 77 123 ») trouve le client en Pro. → Task 4, `searches first names case-insensitively` et `matches digits typed with spaces`.
5. **Une date d'arrivée passée** est refusée par l'assistant et par l'API, aujourd'hui reste accepté. → Task 5, `refuses a past arrival date` et `POST refuses an arrival before today`.

---

## Rulings déjà pris en écrivant ce plan (à reporter dans la roadmap, Task 9)

- **« Ouvertures »** : les ouvertures ne sont pas datées (`CampaignLink.openCount` est un total), donc la carte « Cette semaine » montre les ouvertures cumulées des campagnes en cours, sous le libellé « ouvertures en cours ». Les deux autres chiffres sont sur 7 jours glissants : « intéressés » et « nouveaux clients ».
- **Prénom de l'accueil** : premier mot de `User.name`, envoyé par `GET /api/shops/me` (`me.firstName`). `AuthContext` et `/api/auth/me` restent tels que le kit les livre.
- **Salutation selon l'heure** (demande du porteur) : heure locale du téléphone, car l'accueil est rendu dans le navigateur ; « Bonjour » de 5 h à 12 h, « Bon après-midi » de 12 h à 18 h, « Bonsoir » de 18 h à 5 h.
- **Avatar** : le logo de la boutique, sinon les initiales du nom de l'utilisateur, sinon celles de la boutique. Il ouvre `/app/plus` (« Compte et forfait »).
- **Recherche en Gratuit** : prénoms seulement ; les chiffres ne cherchent dans les numéros qu'avec `respondentContacts`.
- **Réglages sur téléphone** : sections empilées, sans barre de navigation (la spec dit « un empilement »).
- **Unités courantes** : pièce, carton, sac, bouteille, flacon, paquet, douzaine, kg, litre (« sac de 25 kg » devient « sac » : le poids va dans le nom du produit). Les unités déjà utilisées par la boutique suivent.
- **Date passée** : refusée à la création ; à la modification, seulement si la date change (une campagne arrivée garde sa date).
- **Compteurs des listes** : envoyés sur la première page seulement, sans tenir compte de la recherche ni du filtre (ils décrivent la boutique entière).
- **Pas de « Voir tout »** sous « Activité » : il n'y a pas de page d'activité.
- **Migration `8_shop_description`** ; celle des commandes du lot 7 devient `9_sale_orders`.
- **Clients avancés du lot 7** : `GET …/clients` et `GET …/clients/[respondentId]` ; la note, l'anonymisation, le filtre « Ont commandé » et la fiabilité restent au lot 7. `GET …/interests` et l'onglet Intérêts sont abandonnés.

---

### Task 1: Coquille — en-tête, avatar, barre latérale, survol, quota

**Files:**
- Create: `frontend/src/lib/tamani/names.ts`, test `names.test.ts`
- Create: `frontend/src/components/ui/Avatar.tsx` (exporté par `index.ts`)
- Modify: `frontend/src/components/ui/icons.tsx`, `Logo.tsx`, `NavBar.tsx`, `Button.tsx`, `PageHeader.tsx`, tests `shell.test.tsx`, `primitives.test.tsx`
- Modify: `frontend/src/lib/design/tokens.ts` (`contrastPairs`), `frontend/src/app/globals.css` (utilité `bg-cover`)
- Modify: `frontend/src/lib/server/tamani/quota.ts`, test `quota.test.ts`
- Modify: `frontend/src/app/api/shops/me/route.ts` ; Create: `route.test.ts`
- Modify: `frontend/src/components/app/shop-context.ts`, `ShopProvider.tsx`, `AppShell.tsx`, test `components/app/shell.test.tsx`
- Modify: `frontend/src/test-utils/shop-context.tsx` (`TEST_USAGE`, `TEST_ME`)

**Interfaces:**
- Produces:
  - `initials(name: string): string` (2 lettres au plus, majuscules, `'?'` pour un nom vide) ; `firstName(fullName: string | null | undefined): string | null` (premier mot).
  - `IconName` gagne `search`, `whatsapp`, `user`, `clock`, `truck`, `archive`, `stop`, `arrow-up-right`, `arrow-down-left`, `chevron-right`.
  - `Avatar({ name: string; src?: string | null; size?: 'sm' | 'md' | 'lg'; className? })`.
  - `Logo` gagne `tone?: 'default' | 'inverse'` (le mot « tamani » en `surface`).
  - `SideNav({ pathname, shop: { name: string; logoUrl: string | null; planLabel: string }, usage: { used: number; limit: number }, upgrade: boolean })`.
  - `responsesThisMonth(db: Db, organizationId: string, now: Date): Promise<{ used: number; limit: number }>`.
  - `GET /api/shops/me` → `{ shop, role, usage: { responsesThisMonth: number; monthlyLimit: number }, me: { firstName: string | null } }`.
  - `ShopContextValue` gagne `usage: { responsesThisMonth: number; monthlyLimit: number }` et `me: { firstName: string | null }`.

- [ ] **Step 1: Write the failing tests**

`names.test.ts` : `initials('Diallo Import')` → `'DI'` ; `initials('  chez  mamadou diallo ')` → `'CM'` ; `initials('Élodie')` → `'É'` ; `initials('')` → `'?'` ; `firstName('Fatou Ndiaye')` → `'Fatou'` ; `firstName('   ')` et `firstName(null)` → `null`.

`components/ui/shell.test.tsx` :
- `Avatar shows the photo when there is one` : `src` donné → une `<img` avec ce `src` et `alt=""`.
- `Avatar falls back to the initials` : `name: 'Diallo Import'` → le texte `DI`.
- `the sidebar is the notebook cover` : `SideNav` contient `bg-cover`, le nom de la boutique, le libellé du forfait (`Gratuit`), `42 / 150 réponses ce mois`, et un lien « Passer au Pro » vers `/app/plus` quand `upgrade` est vrai, absent sinon.
- `the open tab is yellow and the others lighten on hover` : le lien actif porte `bg-accent` et `aria-current="page"`, un autre porte `hover:bg-surface/10`.
- `inverse lockup paints the wordmark white` : `Logo tone="inverse"` contient `fill="#FFFFFF"`.

`primitives.test.tsx` : `buttons lift on hover, not under reduced motion` : le HTML de `Button` contient `hover:-translate-y-0.5` et `motion-reduce:hover:translate-y-0`.

`quota.test.ts` : `responsesThisMonth counts this month's unlocked completions against the plan` (FREE, `response.count` → 42 : `{ used: 42, limit: 150 }`, avec `where: { organizationId, locked: false, completedAt: { gte: 1er du mois, lt: 1er du mois suivant } }`).

`app/api/shops/me/route.test.ts` (fixtures `signIn`) : `sends the usage and the first name` (`User.name = 'Fatou Ndiaye'` → `me.firstName === 'Fatou'`, `usage.monthlyLimit === 150`) ; `404 SHOP_NOT_FOUND without a shop`.

`components/app/shell.test.tsx` : `the phone header carries the bell and the avatar` (un lien `/app/plus` avec `aria-label="Compte et forfait"` et les initiales) ; `desktop tools sit on the title line` (le conteneur des outils porte `lg:absolute` et `main` porte `lg:[--shell-tools:7rem]`).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/lib/tamani/names.test.ts src/components/ui/shell.test.tsx src/components/ui/primitives.test.tsx src/lib/server/tamani/quota.test.ts "src/app/api/shops/me/route.test.ts" src/components/app/shell.test.tsx`
Expected: FAIL (modules et props absents).

- [ ] **Step 3: Implement**

- `bg-cover` dans `globals.css` : fond `--color-ink`, carreaux de 18 px tracés en `color-mix(in srgb, var(--color-surface) 7%, transparent)`. `contrastPairs` gagne `surface` sur `ink` (« texte de la barre latérale »).
- `SideNav` : `bg-cover text-primary-ink`, `Logo tone="inverse"` en haut, carte de la boutique (`Avatar`, nom, forfait) en `bg-surface/10 rounded-card`, onglets avec icônes (`hover:bg-surface/10`, actif `bg-accent text-accent-ink`), en bas une barre de quota (`role="meter"`, `aria-valuenow`/`aria-valuemax`) et « Passer au Pro » si `upgrade`. `AppShell` passe `upgrade = shop.plan.id === 'FREE'`.
- `AppShell` : la ligne du haut reste sous `lg` (symbole, nom, cloche, avatar) ; à partir de `lg`, cloche et avatar dans un bloc `lg:absolute lg:top-6 lg:right-6` d'une colonne `relative` ; `main` porte `lg:[--shell-tools:7rem]` et `pb-36` sous `lg` (place du bouton « + ») ; `PageHeader` porte `lg:pr-[var(--shell-tools,0px)]`.
- `Button` : `hover:-translate-y-0.5 motion-reduce:hover:translate-y-0` sur toutes les variantes, en plus de l'existant.
- `ShopProvider` garde `usage` et `me` de la réponse ; `ShopTestProvider` prend `usage = TEST_USAGE` (`{ responsesThisMonth: 42, monthlyLimit: 150 }`) et `me = TEST_ME` (`{ firstName: 'Fatou' }`).

- [ ] **Step 4: Run the tests to verify they pass**

Run: la commande du Step 2, puis `cd frontend && npx vitest run src/lib/design src/lib/server/observability`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src
git commit -m "feat(app): notebook-cover sidebar, avatar and bell on the title line, monthly quota, hover lift"
```

---

### Task 2: Accueil — la semaine, les raccourcis, l'activité

**Files:**
- Create: `frontend/src/lib/server/tamani/summary.ts`, test `summary.test.ts`
- Create: `frontend/src/app/api/shops/[orgId]/summary/route.ts`, test `route.test.ts`
- Create: `frontend/src/lib/tamani/home-view.ts`, test `home-view.test.ts`
- Create: `frontend/src/components/app/HomeView.tsx`, test `home.test.tsx`
- Modify: `frontend/src/app/(app)/app/page.tsx` (rend `HomeView`)

**Interfaces:**
- Consumes: Task 1 (`useShop().me`, icônes, `Avatar`) ; `toCampaign`, `activeCampaignWhere`, `relativeTime`, `waShareLink`, `PushCard`.
- Produces (sous-ensemble 5b du contrat du lot 6, qui l'étendra) :
  ```ts
  interface ShopSummary {
    week: { completed: number; sinceYesterday: number; interested: number; opensRunning: number; newClients: number };
    activity: ActivityItem[];   // 8 au plus, du plus récent au plus ancien
    upcoming: UpcomingItem[];   // 5 au plus, du plus proche au plus lointain
    hasCampaign: boolean;
    hasProduct: boolean;
    shareCampaign: { id: string; title: string; shareMessage: string } | null;
  }
  type ActivityItem =
    | { kind: 'RESPONSE'; id: string; at: string; campaignId: string; productName: string; unitLabel: string;
        locked: boolean; interested: boolean | null; quantity: number | null }
    | { kind: 'NEW_CLIENT'; id: string; at: string; respondentId: string; firstName: string | null };
  type UpcomingItem = { kind: 'ENDS' | 'ARRIVES'; campaignId: string; title: string; at: string };
  ```
  - `buildShopSummary(db: Db, organizationId: string, now: Date): Promise<ShopSummary>`.
  - `GET /api/shops/[orgId]/summary` (`MEMBER`) → `{ summary: ShopSummary }`.
  - `greeting(firstName: string | null, shopName: string, now: Date): string` (heure locale de `now`) ; `activityLine(item: ActivityItem): { title: string; detail: string; amount: string | null; tone: 'yes' | 'no' | 'neutral'; icon: IconName; href: string }` ; `upcomingLine(item: UpcomingItem, now: Date): { title: string; when: string; href: string }` ; `onboardingSteps(s: { hasProduct: boolean; hasCampaign: boolean }): Array<{ label: string; href: string; done: boolean }>`.

- [ ] **Step 1: Write the failing tests**

`summary.test.ts` (`prismaMock`, `now = 2026-10-25T12:00:00Z`) :
- `counts the week on 7 rolling days and yesterday on 24 hours` : `completed` = réponses complètes non suspectes depuis `now − 7 j` (verrouillées comprises) ; `sinceYesterday` depuis `now − 24 h` ; `interested` exclut verrouillées et suspectes.
- `opensRunning sums the links of the campaigns open now` (filtre `activeCampaignWhere(now)`).
- `newClients counts visible clients first seen this week`.
- `a locked response shows without its content` : `locked: true`, `interested: null`, `quantity: null`.
- `a new client whose answer is locked does not show` (ni dans `activity`, ni dans `newClients`).
- `merges responses and new clients, newest first, 8 at most`.
- `upcoming lists campaign ends and arrivals within 30 days` : fin dans 3 jours → `ENDS` ; arrivage dans 10 jours → `ARRIVES` ; fin dans 40 jours absente ; campagne `ARRIVED` absente ; tri par date, 5 au plus.
- `shareCampaign is the newest open campaign with its share message`, `null` sans campagne ouverte.
- `the summary never carries a phone number` : `JSON.stringify(summary)` ne contient pas `'+221'`.
- `every query is scoped to the shop` : chaque `where` passé aux mocks contient `organizationId: 'org_1'`.

`summary/route.test.ts` : `members read the summary` (200, `summary.week`) ; `a non-member gets 404`.

`home-view.test.ts` : `greets by the hour` : à 9 h `greeting('Fatou', 'Diallo Import', now)` → `'Bonjour, Fatou'`, à 12 h → `'Bon après-midi, Fatou'`, à 18 h et à 2 h → `'Bonsoir, Fatou'`, à 5 h → `'Bonjour, Fatou'` ; `greeting(null, 'Diallo Import', now)` à 9 h → `'Bonjour, Diallo Import'` ; `a yes shows its quantity in green` (`amount: '3 pièces'`, `tone: 'yes'`, `href: '/app/campagnes/c1'`) ; `a no says non in red` (`amount: 'non'`, `tone: 'no'`) ; `a locked answer hides its content` (`title: 'Réponse en attente'`, `detail: 'Forfait du mois plein'`, `amount: null`) ; `a new client opens the client page` (`href: '/app/clients/r1'`, `title` = prénom, sinon `'Nouveau client'`) ; `upcomingLine says tomorrow and in N days` (`'demain'`, `'dans 10 jours'`, `"aujourd'hui"`) ; `onboardingSteps marks what is done` (2 étapes : « Ajoute un produit » → `/app/produits/nouveau`, « Crée et partage une campagne » → `/app/campagnes/nouvelle`).

`home.test.tsx` (`HomeView` reçoit un `summary` en prop pour le rendu statique) :
- `an empty shop sees the first steps, not the week card` : `hasCampaign: false` → « Pour bien démarrer », pas de « Cette semaine ».
- `the week card shows the big figure and since yesterday` : « Cette semaine », `12`, « +2 depuis hier », et trois liens (intéressés → `/app/campagnes`, ouvertures en cours → `/app/campagnes?statut=ACTIVE`, nouveaux clients → `/app/clients`).
- `the share round opens WhatsApp with the message` : un `href` qui commence par `https://wa.me/?text=` ; sans `shareCampaign`, le rond « Partager » mène à `/app/campagnes/nouvelle`.
- `each activity row opens its page`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/lib/server/tamani/summary.test.ts "src/app/api/shops/[orgId]/summary/route.test.ts" src/lib/tamani/home-view.test.ts src/components/app/home.test.tsx`
Expected: FAIL, modules introuvables.

- [ ] **Step 3: Implement**

- `summary.ts` : un `Promise.all` de requêtes bornées (`count`, `aggregate({ _sum: { openCount } })`, `findMany({ take: 8 })`), toutes avec `organizationId` ; « client visible » = la condition des Global Constraints.
- `HomeView` : `export function HomeView({ summary }: { summary?: ShopSummary })` ; sans prop, il charge `GET /api/shops/{id}/summary` (squelette pendant le chargement, `Notice` en cas d'erreur avec `errorMessage`). Carte « Cette semaine » en `bg-primary text-primary-ink rounded-card shadow-press`, chiffre en `font-sign`. Quatre ronds (`lg:hidden`, 56 px, icône et libellé) : Campagne, Produit, Partager, Clients ; à partir de `lg`, une rangée de `Button`. « Activité » : une ligne par élément, icône ronde, titre et détail, à droite `relativeTime` et le montant en `text-success` ou `text-danger`. « À venir » seulement s'il y a quelque chose. `PushCard` sous la carte.

- [ ] **Step 4: Run the tests to verify they pass**

Run: la commande du Step 2. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src
git commit -m "feat(home): this week's card, WhatsApp-style shortcuts, activity and upcoming lists"
```

---

### Task 3: Filtres comme sur WhatsApp — recherche, pastilles, bouton « + »

**Files:**
- Modify: `frontend/src/components/ui/FilterBar.tsx`, test `composites.test.tsx`
- Create: `frontend/src/components/ui/Fab.tsx` (exporté par `index.ts`)
- Create: `frontend/src/components/app/SearchField.tsx`, test `search.test.tsx`
- Modify: `frontend/src/app/api/shops/[orgId]/campaigns/route.ts`, `products/route.ts`, leurs `route.test.ts`
- Modify: `frontend/src/app/(app)/app/campagnes/page.tsx`, `produits/page.tsx`

**Interfaces:**
- Consumes: Task 1 (icônes).
- Produces:
  - `FilterBar` : chaque élément gagne `icon?: IconName` ; pastilles `rounded-full` ; un élément avec `count === 0` et non actif n'est pas rendu.
  - `Fab({ href: string; label: string })` : rond de 56 px, `bg-accent`, icône `plus`, `aria-label={label}`, `fixed right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:hidden`.
  - `SearchField({ placeholder: string; param?: string /* 'q' */ })` : client ; garde le texte, et 300 ms après la dernière frappe fait `router.replace` avec `?q=` (les autres paramètres gardés, `cursor` retiré) ; un bouton « Effacer » vide le champ.
  - `GET …/campaigns?q=` (titre ou nom du produit, sans casse, 60 caractères au plus) ; la première page renvoie `counts: { all; ACTIVE; DRAFT; CLOSED; ARRIVED }`.
  - `GET …/products?q=&inCampaign=1` (`inCampaign=1` : produits avec une campagne ouverte) ; la première page renvoie `counts: { sale; campaign; archived }`.

- [ ] **Step 1: Write the failing tests**

`composites.test.tsx` : `hides a chip whose count is 0 unless it is active` ; `keeps the all chip and items without a count` ; `renders the chip icon`.

`search.test.tsx` (`vi.useFakeTimers`, `mockNextNavigation({ pathname: '/app/campagnes', search: 'statut=ACTIVE&cursor=x' })`) : `waits 300 ms then replaces the query` (`replace('/app/campagnes?statut=ACTIVE&q=riz')`) ; `clearing removes q` ; `starts from the q in the URL`.

`campaigns/route.test.ts` : `q matches the title or the product name, case-insensitively` (`where.AND` contient `{ OR: [{ title: { contains: 'riz', mode: 'insensitive' } }, { product: { name: { contains: 'riz', mode: 'insensitive' } } }] }`) ; `the first page carries the counts per effective status` ; `a next page carries no counts` ; `a q over 60 characters is a 400`.

`products/route.test.ts` : `inCampaign=1 keeps products with an open campaign` (`campaigns: { some: activeCampaignWhere(now) }`) ; `q searches the name` ; `the first page carries sale, campaign and archived counts`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/ui/composites.test.tsx src/components/app/search.test.tsx "src/app/api/shops/[orgId]/campaigns/route.test.ts" "src/app/api/shops/[orgId]/products/route.test.ts"`
Expected: FAIL.

- [ ] **Step 3: Implement**

- Pages : `SearchField` (« Rechercher une campagne », « Rechercher un produit »), puis `FilterBar` avec icônes et nombres — campagnes : Toutes, En cours (`megaphone`), Brouillons (`pencil`), Terminées (`stop`), Arrivées (`truck`) ; produits : Tous, En campagne (`megaphone`), Archivés (`archive`) ; puis `Fab`. Le bouton d'action du `PageHeader` devient `hidden lg:inline-flex`. Une recherche sans résultat dit « Aucune campagne ne correspond à « {q} ». » (même phrase pour les produits).

- [ ] **Step 4: Run the tests to verify they pass**

Run: la commande du Step 2. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src
git commit -m "feat(lists): WhatsApp-style search and icon chips shown only when they have something, plus button on phones"
```

---

### Task 4: Clients — la liste comme les appels de WhatsApp, et la fiche

**Files:**
- Create: `frontend/src/lib/server/tamani/clients.ts`, test `clients.test.ts`
- Modify: `frontend/src/lib/server/tamani/shop.ts` (`shopPlan`), test `shop.test.ts`
- Create: `frontend/src/app/api/shops/[orgId]/clients/route.ts` et `clients/[respondentId]/route.ts`, avec leurs `route.test.ts`
- Create: `frontend/src/lib/tamani/client-view.ts`, test `client-view.test.ts`
- Create: `frontend/src/components/app/ClientList.tsx`, `ClientDetail.tsx`, test `clients.test.tsx`
- Modify: `frontend/src/app/(app)/app/clients/page.tsx` ; Create: `clients/[id]/page.tsx`

**Interfaces:**
- Consumes: Task 1 (`Avatar`, `initials`, icônes), Task 3 (`SearchField`, `FilterBar`) ; `maskPhone`, `waChatLink`, `encodeCursor`, `decodeCursor`, `buildPage`, `clampLimit`, `PLANS`, `effectivePlan`, `tamaniError('CLIENT_NOT_FOUND', 404)` (code déjà dans `TAMANI_ERRORS`).
- Produces:
  ```ts
  interface ClientFilters { q: string | null; kind: 'ALL' | 'RESELLER' | 'CONSUMER' }
  interface ClientLast { campaignId: string; productName: string; unitLabel: string;
    interested: boolean; quantity: number | null; at: string }
  interface ClientRow { id: string; firstName: string | null; phone: string | null /* masqué sans contacts */;
    phoneE164: string | null /* null sans contacts */; kind: 'RESELLER' | 'CONSUMER' | null; last: ClientLast | null }
  interface ClientInterest extends ClientLast { responseId: string; campaignTitle: string;
    buyerType: 'RESELLER' | 'CONSUMER' | null; option: string | null; timing: string | null;
    wantsDelivery: boolean | null; zoneName: string | null }
  interface ClientDetail extends ClientRow { firstSeenAt: string; interests: ClientInterest[] }
  ```
  - `parseClientFilters(params: URLSearchParams): ClientFilters | null` (`kind` inconnu ou `q` de plus de 60 caractères → `null`).
  - `listClients(db: Db, organizationId: string, filters: ClientFilters, cursor: Cursor | null, opts: { canSeeContacts: boolean; limit: number }): Promise<{ items: ClientRow[]; nextCursor: string | null; counts: { all: number; RESELLER: number; CONSUMER: number } | null }>`.
  - `getClient(db: Db, organizationId: string, respondentId: string, opts: { canSeeContacts: boolean }): Promise<ClientDetail | null>`.
  - `shopPlan(db: Db, organizationId: string, now: Date): Promise<PlanDefinition>`.
  - `GET …/clients?q=&type=revendeurs|usagers&cursor=` → `{ items, nextCursor, counts }` ; `GET …/clients/[respondentId]` → `{ client }` ou `404 CLIENT_NOT_FOUND` (les deux `MEMBER`).
  - `clientWhatsappMessage(p: { firstName: string | null; shopName: string; productName: string | null }): string` ; `lockedContactText(firstName: string | null): string` ; `lastInterestText(last: ClientLast): string`.

- [ ] **Step 1: Write the failing tests**

`clients.test.ts` (`prismaMock`) :
- `lists visible clients, most recent first` : `where` contient `organizationId`, `anonymizedAt: null` et `responses: { some: { completedAt: { not: null }, locked: false, suspicious: false } }` ; `orderBy: [{ lastSeenAt: 'desc' }, { id: 'desc' }]`.
- `hides a client whose only responses are locked or suspicious` (aussi dans `counts`, et `getClient` → `null`).
- `FREE rows carry no full number` : `canSeeContacts: false` → `phoneE164: null`, `phone` = `maskPhone(...)`, et `JSON.stringify(result)` ne contient pas `'+221771112233'`.
- `PRO rows carry the number` : `phoneE164: '+221771112233'`.
- `searches first names case-insensitively` (`firstName: { contains: 'awa', mode: 'insensitive' }`).
- `matches digits typed with spaces` : en Pro, `q: '77 111'` → `phoneE164: { contains: '77111' }`.
- `FREE search ignores digits` : en Gratuit, `q: '77 111'` → recherche dans `firstName` seulement.
- `type revendeurs keeps clients with a reseller answer` (`responses.some` avec `buyerType: 'RESELLER'`).
- `pages on lastSeenAt then id` : le curseur d'une page suivante filtre `OR: [{ lastSeenAt: { lt } }, { lastSeenAt, id: { lt } }]`, et `counts` vaut `null`.
- `getClient lists every visible interest, newest first`.

`shop.test.ts` : `shopPlan reads the effective plan` (sans abonnement → `PLANS.FREE`).

`clients/route.test.ts` et `[respondentId]/route.test.ts` : `members list clients` ; `a non-member gets 404` ; `an unknown type is a 400` ; `a client of another shop is 404 CLIENT_NOT_FOUND` ; `FREE gets masked numbers` (abonnement absent).

`client-view.test.ts` : `clientWhatsappMessage({ firstName: 'Awa', shopName: 'Diallo Import', productName: 'Riz parfumé' })` → `'Bonjour Awa, c'est Diallo Import. Tu m'as répondu pour Riz parfumé.'` ; sans prénom → `'Bonjour, c'est Diallo Import. …'` ; sans produit → `'Bonjour Awa, c'est Diallo Import.'` ; `lockedContactText('Awa')` → `'Passe au Pro pour contacter Awa.'`, `lockedContactText(null)` → `'Passe au Pro pour contacter ce client.'` ; `lastInterestText` → `'Riz parfumé, 3 sacs'` ou `'Riz parfumé, non'`.

`clients.test.tsx` (rendu statique avec des lignes en props) :
- `a row reads like a WhatsApp call` : initiales, prénom (sinon « Client sans prénom »), `arrow-down-left` vert pour un oui (`text-success`), `arrow-up-right` rouge pour un non (`text-danger`), lien vers `/app/clients/r1`.
- `PRO rows open WhatsApp with the prepared message` (`href` commence par `https://wa.me/221771112233?text=`).
- `FREE rows lock the WhatsApp button` : aucun `wa.me`, un lien `/app/plus` avec `aria-label="Passe au Pro pour contacter Awa."`.
- `the detail lists every interest and links each to its campaign`.
- `an empty book invites to share` : « Tes clients apparaîtront ici dès leur première réponse. » et un bouton vers `/app/campagnes`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/lib/server/tamani/clients.test.ts src/lib/server/tamani/shop.test.ts "src/app/api/shops/[orgId]/clients" src/lib/tamani/client-view.test.ts src/components/app/clients.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

- Pagination : la date du curseur du kit porte `lastSeenAt` (`buildPage(rows.map((r) => ({ ...r, createdAt: r.lastSeenAt })), limit)`), le `where` de la page suivante est celui du test. `kind` d'une ligne = `buyerType` de sa dernière réponse visible.
- Pages : `/app/clients` = `SearchField` (« Rechercher un prénom ou un numéro » en Pro, « Rechercher un prénom » en Gratuit), `FilterBar` (Tous, Revendeurs `box`, Usagers `user`), `ClientList`, « Voir plus » si `nextCursor`. `/app/clients/[id]` = `ClientDetail` : `Avatar`, prénom, numéro (masqué en Gratuit), `Button variant="whatsapp"` ou une `Notice` « Passe au Pro pour contacter {prénom}. » avec un lien vers `/app/plus`, puis « Ses réponses ».

- [ ] **Step 4: Run the tests to verify they pass**

Run: la commande du Step 2. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src
git commit -m "feat(clients): client book like WhatsApp calls, client page with every interest, numbers masked on Free"
```

---

### Task 5: Unités en pastilles et date d'arrivée seule

**Files:**
- Create: `frontend/src/lib/tamani/units.ts`, test `units.test.ts`
- Create: `frontend/src/app/api/shops/[orgId]/products/units/route.ts`, test `route.test.ts`
- Modify: `frontend/src/components/app/ProductForm.tsx`, les pages `produits/nouveau` et `produits/[id]`, test `product.test.tsx`
- Modify: `frontend/src/lib/tamani/campaign-wizard.ts`, test `campaign-wizard.test.ts`
- Modify: `frontend/src/components/app/CampaignWizard.tsx`, `CampaignEditForm.tsx`, test `campaign.test.tsx`
- Modify: `frontend/src/app/api/shops/[orgId]/campaigns/route.ts` et `[campaignId]/route.ts`, leurs tests

**Interfaces:**
- Produces:
  - `COMMON_UNITS: readonly string[]` = `['pièce', 'carton', 'sac', 'bouteille', 'flacon', 'paquet', 'douzaine', 'kg', 'litre']` ; `unitChoices(used: readonly string[]): string[]` (courantes d'abord, puis celles de la boutique, sans doublon à la casse près, sans vide).
  - `GET …/products/units` (`MEMBER`) → `{ units: string[] }` (unités distinctes des produits de la boutique, archivés compris, 50 au plus).
  - `ProductForm` gagne `units?: readonly string[]` (pastilles `aria-pressed` au-dessus du champ, une touche remplit le champ ; le champ accepte toujours une unité nouvelle).
  - `WizardValues` perd `availableInDays` ; `canAdvance(s: WizardState, now: Date): boolean` ; `wizardAvailableAt(s: WizardValues): Date | null` (midi UTC du jour choisi) ; `todayIso(now: Date): string` (`yyyy-mm-dd` UTC).

- [ ] **Step 1: Write the failing tests**

`units.test.ts` : `puts the shop's own units after the common ones without duplicates` (`['Carton', 'bidon de 20 L', 'bidon de 20 L', ' ']` → `[...COMMON_UNITS, 'bidon de 20 L']`).

`units/route.test.ts` : `lists the shop's distinct units` (`distinct: ['unitLabel']`, `where: { organizationId: 'org_1' }`) ; `a non-member gets 404`.

`product.test.tsx` : `shows the units as chips, the current one pressed` (`aria-pressed="true"` sur « carton »).

`campaign-wizard.test.ts` : `an incoming campaign needs a date` ; `refuses a past arrival date` (hier → `false`, aujourd'hui → `true`) ; `availableAt is noon UTC of the chosen day`.

`campaign.test.tsx` : `the arrival step asks only for a date` (plus de « Dans 10 jours » à l'étape Disponibilité ; un `input type="date"` avec `min` = aujourd'hui ; les raccourcis de durée restent).

`campaigns/route.test.ts` : `POST refuses an arrival before today` (`availableAt` d'hier → 400 `VALIDATION_FAILED`) ; `POST accepts today`. `[campaignId]/route.test.ts` : `PATCH refuses a past arrival date it did not have` ; `PATCH keeps an unchanged past date`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/lib/tamani/units.test.ts "src/app/api/shops/[orgId]/products/units" src/components/app/product.test.tsx src/lib/tamani/campaign-wizard.test.ts src/components/app/campaign.test.tsx "src/app/api/shops/[orgId]/campaigns"`
Expected: FAIL.

- [ ] **Step 3: Implement**

- Assistant : sous le champ « Date d'arrivée », la phrase calculée (« Arrivage dans 10 jours », via `formatAvailability`) ou, pour une date passée, « Choisis une date à partir d'aujourd'hui. ». `CampaignEditForm` met `min` au champ date seulement si la date change.
- API : refus si `availability === 'INCOMING'` et `availableAt < début du jour UTC de now` (`validationFailed('availableAt must not be in the past')`) ; en `PATCH`, seulement si `availableAt` diffère de la valeur enregistrée.

- [ ] **Step 4: Run the tests to verify they pass**

Run: la commande du Step 2. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src
git commit -m "feat(catalogue): unit chips from the shop's own units, arrival as a single date that cannot be past"
```

---

### Task 6: Description de la boutique (migration 8) et complétude

**Files:**
- Modify: `frontend/prisma/schema.prisma` ; Create: `frontend/prisma/migrations/8_shop_description/migration.sql`
- Modify: `frontend/src/lib/server/tamani/inputs.ts`, `serializers.ts`, `public-campaign.ts`, leurs tests
- Modify: `frontend/src/app/api/shops/[orgId]/route.ts`, test `route.test.ts`
- Modify: `frontend/src/components/app/shop-context.ts`, `ShopForm.tsx`, `frontend/src/test-utils/shop-context.tsx`
- Modify: `frontend/src/app/(public)/c/[code]/popup-sheet.tsx`, test `popup.test.tsx`
- Create: `frontend/src/lib/tamani/shop-completeness.ts`, test `shop-completeness.test.ts`

**Interfaces:**
- Produces:
  - `Organization.description String?` ; SQL : `ALTER TABLE "Organization" ADD COLUMN "description" TEXT;`.
  - `ShopPatch.description` : chaîne nettoyée de 300 caractères au plus, `''` → `null`, `null` accepté.
  - `toShop` et `Shop` gagnent `description: string | null` ; `PublicCampaign.shop` gagne `description: string | null`.
  - `shopCompleteness(s: { description: string | null; logoUrl: string | null }, zoneCount: number): { complete: boolean; missing: Array<'description' | 'logo' | 'zones'> }`.
  - `ShopForm` en mode `edit` gagne le champ « Présente ta boutique » (`Textarea`, compteur `n / 300`, aide « Ce que tu vends, où tu es, quand tu livres. »).

- [ ] **Step 1: Write the failing tests**

`schema-tamani.test.ts` : `Organization has an optional description`. `[orgId]/route.test.ts` : `PATCH saves the description` ; `an empty description becomes null` ; `301 characters is a 400`. `serializers.test.ts` : `toShop sends the description`. `public-campaign.test.ts` : `sends the shop description` (la liste exacte des clés de `shop` gagne `description`). `popup.test.tsx` : `shows the shop description on the first step` (et rien sans description). `shop-completeness.test.ts` : `lists what is missing in order` (`{ description: null, logoUrl: null }`, 0 zone → `['description', 'logo', 'zones']`) ; `a complete shop`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/lib/server/tamani "src/app/api/shops/[orgId]/route.test.ts" "src/app/(public)/c" src/lib/tamani/shop-completeness.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement, migrate, regenerate**

Arrêter le serveur de développement, puis depuis `frontend/` : `node --env-file=.env.local node_modules/prisma/build/index.js migrate deploy` et `node node_modules/prisma/build/index.js generate`.
Expected: `Applying migration 8_shop_description`, puis le client régénéré sans erreur EPERM.

- [ ] **Step 4: Run the tests to verify they pass**

Run: la commande du Step 2. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/prisma frontend/src
git commit -m "feat(shop): shop description in settings and in the popup, and what a complete shop still needs"
```

---

### Task 7: Réglages par sections

**Files:**
- Modify: `frontend/src/app/(app)/app/reglages/settings-view.tsx`, `frontend/src/components/app/ShopForm.tsx`, `CoefficientsForm.tsx`, `PushCard.tsx`, test `settings.test.tsx`
- Modify: `frontend/src/lib/tamani/push-state.ts`, test `push-state.test.ts`

**Interfaces:**
- Consumes: Task 6 (`shopCompleteness`, `description`).
- Produces:
  - Sections, dans cet ordre : `boutique` « Boutique », `zones` « Zones », `estimation` « Estimation », `notifications` « Notifications », `compte` « Compte ».
  - `ShopForm` et `CoefficientsForm` gagnent `formId?: string` et `hideSubmit?: boolean` ; le bouton « Enregistrer » de l'en-tête de section porte `form={formId}`.
  - `pushCardState(env: PushEnv, place: 'home' | 'settings' = 'home'): PushCardState`, avec l'état nouveau `'on'` (Réglages, abonnement actif) ; `PushCard` gagne `place?`.

- [ ] **Step 1: Write the failing tests**

`settings.test.tsx` : `a section menu on desktop` (5 liens `#boutique` … `#compte`, dans un bloc `hidden lg:block` collant `lg:sticky`) ; `the save button sits in the section header` (`form="shop-form"` dans l'en-tête de « Boutique », aucun bouton de soumission dans le formulaire) ; `an incomplete shop is told what is missing` (« Ajoute une description et un logo » avec des liens `#boutique`) ; `a complete shop sees no notice`.

`push-state.test.ts` : `settings says on once subscribed` (`'on'`) ; `home stays hidden once subscribed`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/app/settings.test.tsx src/lib/tamani/push-state.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Deux colonnes à partir de `lg` (`lg:grid lg:grid-cols-[12rem_1fr] lg:gap-8`), sections empilées en dessous ; chaque section a un `id`, un `scroll-mt-6` et son en-tête (titre en `font-hand`, bouton à droite). L'état `'on'` dit « Les notifications sont activées sur cet appareil. ».

- [ ] **Step 4: Run the tests to verify they pass**

Run: la commande du Step 2. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src
git commit -m "feat(settings): sections with a side menu on desktop, save in each section header, completeness notice"
```

---

### Task 8: Connexion et inscription en deux colonnes

**Files:**
- Modify: `frontend/src/app/(auth)/layout.tsx`, `login/*`, `signup/*`, test `auth-pages.test.tsx`
- Modify: `frontend/src/components/app/AuthForm.tsx`
- Create: `frontend/src/components/ui/AuthIllustration.tsx` (exporté par `index.ts`)

**Interfaces:**
- Produces:
  - `AuthForm` gagne `before?: ReactNode`, rendu au-dessus des champs, suivi du séparateur « ou avec ton e-mail » ; sans `before`, pas de séparateur.
  - `AuthIllustration()` : SVG décoratif (`aria-hidden="true"`), à l'encre et au jaune de la charte : un téléphone avec une bulle de discussion et des bâtons comptés sur une page de cahier.

- [ ] **Step 1: Write the failing tests**

`auth-pages.test.tsx` : `Google comes first on login and signup` (l'index du lien `/api/auth/oauth/google/start` est avant celui du champ e-mail, et « ou avec ton e-mail » est présent) ; `without Google there is no divider` ; `the desktop panel carries the sentence and the drawing` (« Avant de commander, demande à ta communauté. » dans un bloc `hidden lg:flex` en `bg-primary`).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run "src/app/(auth)/auth-pages.test.tsx"`
Expected: FAIL.

- [ ] **Step 3: Implement**

`layout.tsx` : `lg:grid lg:grid-cols-2` ; à gauche, le panneau bleu (`bg-primary text-primary-ink`, `Logo tone="inverse"`, la phrase en `font-hand`, `AuthIllustration`) ; à droite, la colonne actuelle (`max-w-sm`), inchangée sur téléphone.

- [ ] **Step 4: Run the tests to verify they pass**

Run: la commande du Step 2. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src
git commit -m "feat(auth): two-column sign-in pages with an ink drawing, Google button first"
```

---

### Task 9: Documentation, barrière, recette, PR

**Files:**
- Modify: `CLAUDE.md` (section « Tamani shop-space retouches (lot 5b) »), `docs/superpowers/plans/2026-10-24-tamani-roadmap.md`

- [ ] **Step 1: Documentation**

- `CLAUDE.md` : `buildShopSummary` et `/summary` ; clients visibles, masquage Gratuit côté serveur et recherche sans chiffres en Gratuit ; règle des pastilles ; `usage` et `me` dans `ShopContext` ; migration 8.
- Roadmap : les Rulings ci-dessus ; contrat `ShopSummary` 5b (le lot 6 ajoute `campaigns[]`, `moneyProtectedThisMonth`, `todo[]`) ; `clients.ts` et ses deux routes déplacés du lot 7, `/interests` et l'onglet Intérêts supprimés ; `9_sale_orders` (et le « `7_sale_orders` » resté dans la liste des tâches du lot 7) ; `/app/clients` sans onglets.

- [ ] **Step 2: Barrière complète**

Run: `pnpm format && pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: tout passe ; le budget de 60 Ko du pop-up tient toujours.

- [ ] **Step 3: Recette à 320, 390 et 1280 px** (CDP, attente de l'hydratation et de l'élément attendu, jamais d'attente fixe)

Avec le compte démo et des données de recette créées puis supprimées par script : `/app` (boutique vide, puis avec réponses), `/app/campagnes?q=`, `/app/produits`, `/app/clients` en Gratuit puis en Pro, `/app/clients/[id]`, `/app/reglages`, `/login`, `/signup`, un pop-up avec description. À vérifier : aucun défilement horizontal, la cloche et l'avatar sur la ligne du titre en 1280, le bouton « + » qui ne cache pas la dernière ligne.

- [ ] **Step 4: Commit et PR** (base `plan/05-pop-up-public`)

```bash
git add CLAUDE.md docs
git commit -m "docs: document the shop-space retouches and move the client contracts from lot 7"
git push -u origin plan/05b-retouches
gh pr create --repo mediaboostia-web/intention-d-achat --base plan/05-pop-up-public --title "Lot 5b : retouches de l'espace grossiste" --body-file "$WORKSPACE/pr-body.md"
```

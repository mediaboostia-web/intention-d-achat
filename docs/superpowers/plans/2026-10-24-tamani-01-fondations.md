# Tamani, lot 1 : Fondations — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** transformer le clone local du kit izikit en base de projet Tamani poussée sur `mediaboostia-web/intention-d-achat`. On retire les retraits, on renomme le projet et on découpe l'app en groupes de routes `(public)`, `(app)` et `(admin)`. À la fin, la barrière qualité et le smoke test d'authentification sont verts.

**Architecture :** aucune fonctionnalité métier dans ce lot. On applique la procédure PRUNING.md du kit à la fonctionnalité `withdrawals`, on met à jour les tests de garde-fou, on corrige la mise en page racine pour que les pages publiques (dont le futur pop-up) ne chargent pas les providers de session, et on ajoute deux corrections propres à Windows.

**Tech Stack :** Next.js 16, Prisma 5 et Neon, Vitest 3, git et `gh`.

**Spec :** [../specs/2026-10-24-tamani-design.md](../specs/2026-10-24-tamani-design.md) (§6.1, §6.4, §8 lot 1). **Feuille de route :** [2026-10-24-tamani-roadmap.md](2026-10-24-tamani-roadmap.md). Ses Global Constraints s'appliquent ici.

## Global Constraints

- Les Global Constraints de la feuille de route s'appliquent toutes.
- **Ne pas modifier** `frontend/src/lib/api.ts` ni `frontend/src/lib/server/admin/audit.ts` (fichiers protégés). Leurs mentions des retraits sont des commentaires et des codes d'erreur inutilisés, sans conséquence. On les laisse.
- **Ne pas toucher** `frontend/src/lib/server/payments/bictorys.ts` ni `provider.ts`. Le code de reversement Bictorys disparaît avec Bictorys au lot 8.
- Toutes les commandes Prisma se lancent depuis `frontend/` sous Git Bash : `node --env-file=.env.local node_modules/prisma/build/index.js <cmd>`. Pas de redirection `>` sous PowerShell, qui écrit en UTF-16.
- Si le port 3000 est occupé (autre projet du porteur), lancer `APP_URL=http://localhost:3001 pnpm exec next dev --port 3001 --turbopack` depuis `frontend/`, puis le smoke test avec `SMOKE_BASE_URL=http://localhost:3001`.

## Review Focus

1. **Base Neon déjà migrée jusqu'à `4_phase3_admin_orders`** : la migration `5_drop_withdrawals` ne doit **que** supprimer la table `Withdrawal` et la colonne `User.withdrawalPinHash`. → Tâche 2, étape 5 (relecture du SQL avec le résultat attendu).
2. **Un accès aux anciennes URL `/api/withdrawals` ou `/settings`** donne un 404 Next propre, pas une erreur 500. → Tâche 2 (garde-fou de suppression) et Tâche 4 (vérification des routes dans le build).
3. **Une page publique qui importerait `AuthContext` par erreur** déclencherait des appels de session sur le pop-up. → Tâche 4, garde-fou `layout-boundaries.test.ts`.
4. **Un clone neuf sous Windows** : fins de ligne LF imposées par `.gitattributes`, sans aucun fichier « modifié » fantôme. → Tâche 1, étape 3.
5. **Des tests lents sur une machine modeste** : délai de 15 s, et toute la suite verte avec la commande par défaut. → Tâche 1, étape 5.

---

### Task 1 : Repo, hygiène Windows et premier envoi

**Files :**
- Create : `.gitattributes`
- Modify : `frontend/vitest.config.ts` (bloc `test`)
- Commit (déjà modifiés en local) : `frontend/scripts/smoke-auth.ts`, `frontend/scripts/make-superadmin.ts`, `frontend/scripts/seed-dev.ts`
- Commit : `docs/superpowers/specs/2026-10-24-tamani-design.md`, `docs/superpowers/plans/2026-10-24-tamani-roadmap.md`, `docs/superpowers/plans/2026-10-24-tamani-01-fondations.md`

**Interfaces :**
- Consumes : —
- Produces : remote `origin` = `https://github.com/mediaboostia-web/intention-d-achat.git`, remote `upstream` = izikit, branche de travail `plan/01-fondations`.

- [ ] **Step 1 : prérequis humain, connexion GitHub**

Run : `gh auth status`
Expected : `Logged in to github.com account <compte ayant les droits d'écriture sur mediaboostia-web/intention-d-achat>`. Sinon, **s'arrêter** et demander au porteur de lancer `gh auth login` (GitHub.com → HTTPS → Login with a web browser).

- [ ] **Step 2 : créer `.gitattributes`**

```gitattributes
* text=auto eol=lf
*.png binary
*.jpg binary
*.ico binary
*.woff2 binary
```

- [ ] **Step 3 : renormaliser et vérifier qu'aucun fichier fantôme n'apparaît**

Run : `git add --renormalize . && git status --short`
Expected : seuls apparaissent `.gitattributes`, `.gitignore` (ligne `.superpowers/` ajoutée pour les maquettes), les 3 scripts, et `docs/superpowers/` (non suivi). Aucun autre fichier (les blobs sont déjà en LF).

- [ ] **Step 4 : délai des tests à 15 s**

Dans `frontend/vitest.config.ts`, bloc `test`, ajouter `testTimeout: 15_000` avec un commentaire d'une ligne : le test de limite d'inscription, gourmand en bcrypt, prend environ 3,5 s seul et dépasse 5 s sous charge sur Windows.

- [ ] **Step 5 : suite complète**

Run : `pnpm test`
Expected : `Test Files 66 passed (66)` et `Tests 570 passed (570)`.

- [ ] **Step 6 : trois commits**

```bash
git add frontend/scripts/smoke-auth.ts frontend/scripts/make-superadmin.ts frontend/scripts/seed-dev.ts
git commit -m "fix(scripts): make CLI entry guards work on Windows paths

import.meta.url never matched file://\${argv[1]} on Windows or on paths
with spaces, so the scripts exited 0 without running. Use pathToFileURL.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git add .gitattributes .gitignore frontend/vitest.config.ts
git commit -m "chore: enforce LF line endings, ignore mockups, raise Vitest timeout

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git add docs/superpowers
git commit -m "docs: add Tamani design spec, roadmap and lot 1 plan

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 7 : brancher les remotes et pousser `main`**

```bash
git remote rename origin upstream
git remote add origin https://github.com/mediaboostia-web/intention-d-achat.git
git push -u origin main
```

Run : `git ls-remote origin`
Expected : une ligne `refs/heads/main` dont le SHA est celui de `git rev-parse HEAD`.

- [ ] **Step 8 : branche du lot**

Run : `git switch -c plan/01-fondations`
Expected : `Switched to a new branch 'plan/01-fondations'`.

---

### Task 2 : Retirer la fonctionnalité « retraits » (PRUNING.md, `withdrawals`)

**Files :**
- Create : `frontend/src/lib/server/observability/pruned-surfaces.test.ts`
- Create : `frontend/prisma/migrations/5_drop_withdrawals/migration.sql`
- Modify (modifications ciblées **avant** toute suppression) :
  - `frontend/src/app/api/admin/me/route.ts` (permissions l. 38, 50-51 ; commentaires l. 5, 18, 21) et `frontend/src/app/api/admin/me/route.test.ts` (permissions attendues)
  - `frontend/src/test-utils/admin-fixtures.ts` (import `Withdrawal` l. 18 ; `withdrawalPinHash` l. 44 ; bloc « withdrawal + PIN fixtures » l. 287-365 : `seedUserWithPin`, `WithdrawalOverrides`, `seedWithdrawal`)
  - commentaires : `frontend/src/app/api/admin/users/route.ts:12` (retirer `withdrawalPinHash`), `frontend/src/app/api/admin/audit-log/route.ts:12` (exemples `"User", "Order"`)
  - `examples/frontend-pages/admin/layout.tsx:21` (lien Withdrawals) et `examples/frontend-pages/admin/users.tsx:3` (commentaire)
  - `frontend/prisma/schema.prisma` : `withdrawalPinHash` l. 20, relation `withdrawals` l. 42, `model Withdrawal` l. 313 et suivantes, commentaires l. 62, 90, 230, 269
  - `.env.example` : lignes `BICTORYS_PRIVATE_KEY` (165) et `BICTORYS_MERCHANT_SECRET_CODE` (174) avec leurs commentaires, et toute la section `# 12. TUNABLES — Withdrawal policy` (l. 280-311). Renuméroter les sections suivantes (13 → 12, 14 → 13, 15 → 14).
  - `frontend/src/lib/server/observability/env-shape.test.ts` : retirer le test « contains the verbatim WITHDRAWAL_BALANCE_CHECK FINANCIAL-SAFETY warning » et son commentaire d'en-tête (WD-01..04).
  - `frontend/src/lib/server/observability/claude-md-shape.test.ts` : le test de surface canonique devient `'mentions the canonical surface (cron + webhook + upload)'`, sans `expect(content).toMatch(/withdrawal/i)`.
  - `CLAUDE.md`, `README.md` : retirer le paragraphe « Withdrawals are race-free », les invariants sur les retraits (verrou consultatif, `WITHDRAWAL_BALANCE_CHECK`, codes `PIN_*` et `INSUFFICIENT_BALANCE`), l'entrée `withdrawals/guards.ts` des fichiers à modifier, et les mentions des routes de retrait. **Garder** la mention de `BICTORYS_API_KEY` (lot 8).
  - `.planning/features.json` : supprimer la clé `withdrawals` ; retirer `"withdrawals"` des `cross_dependencies` de `payments-bictorys`.
- Delete :
  - `frontend/src/app/api/withdrawals/`
  - `frontend/src/app/api/auth/withdrawal-pin/`
  - `frontend/src/app/api/admin/withdrawals/` (y compris `[id]/cancel`)
  - `frontend/src/lib/server/withdrawals/`
  - `frontend/src/lib/server/auth/pin.ts` et `pin.test.ts`
  - `examples/frontend-pages/withdrawals.tsx`
  - `examples/frontend-pages/admin/withdrawals.tsx`
- **Ne pas modifier** : `frontend/src/lib/api.ts`, `frontend/src/lib/server/admin/audit.ts`, `frontend/src/lib/server/payments/*`.

**Interfaces :**
- Consumes : remote et branche de la tâche 1.
- Produces : schéma sans `Withdrawal`. Le type `User` n'a plus `withdrawalPinHash`. `buildUser()` de `admin-fixtures.ts` est inchangé en dehors de ce champ.

- [ ] **Step 1 : écrire le garde-fou qui échoue**

`frontend/src/lib/server/observability/pruned-surfaces.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const FRONTEND = path.resolve(__dirname, '../../../..');
const REPO = path.resolve(FRONTEND, '..');

describe('pruned surfaces — withdrawals (Tamani lot 1)', () => {
  it.each([
    'src/app/api/withdrawals',
    'src/app/api/auth/withdrawal-pin',
    'src/app/api/admin/withdrawals',
    'src/lib/server/withdrawals',
    'src/lib/server/auth/pin.ts',
  ])('%s is gone', (rel) => {
    expect(existsSync(path.join(FRONTEND, rel))).toBe(false);
  });

  it('schema has no Withdrawal model nor withdrawalPinHash', () => {
    const schema = readFileSync(path.join(FRONTEND, 'prisma/schema.prisma'), 'utf8');
    expect(schema).not.toMatch(/^model Withdrawal\b/m);
    expect(schema).not.toMatch(/withdrawalPinHash/);
  });

  it('.env.example declares no withdrawal or payout keys', () => {
    const env = readFileSync(path.join(REPO, '.env.example'), 'utf8');
    expect(env).not.toMatch(/^WITHDRAWAL_/m);
    expect(env).not.toMatch(/^BICTORYS_PRIVATE_KEY=/m);
    expect(env).not.toMatch(/^BICTORYS_MERCHANT_SECRET_CODE=/m);
  });

  it('features.json no longer lists withdrawals', () => {
    const manifest = JSON.parse(readFileSync(path.join(REPO, '.planning/features.json'), 'utf8'));
    expect(Object.keys(manifest.features)).not.toContain('withdrawals');
  });
});
```

- [ ] **Step 2 : vérifier qu'il échoue**

Run : `pnpm --filter frontend exec vitest run src/lib/server/observability/pruned-surfaces.test.ts`
Expected : FAIL, avec 8 tests en échec (5 chemins existants, le schéma, l'env, le manifeste).

- [ ] **Step 3 : modifications ciblées dans le code**

Appliquer les modifications de `admin/me` (et son test), `admin-fixtures.ts`, des commentaires et de `examples/` listées plus haut. `admin/me` ne renvoie plus `withdrawals:read` ni `withdrawals:cancel` dans aucune liste de permissions.

- [ ] **Step 4 : schéma, puis génération de la migration**

Modifier `schema.prisma` comme indiqué. Puis, sous Git Bash, depuis `frontend/` :

```bash
mkdir -p prisma/migrations/5_drop_withdrawals
node --env-file=.env.local node_modules/prisma/build/index.js migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/5_drop_withdrawals/migration.sql
node node_modules/prisma/build/index.js generate
```

- [ ] **Step 5 : relire le SQL**

Run : `cat prisma/migrations/5_drop_withdrawals/migration.sql`
Expected : uniquement la suppression de la clé étrangère `Withdrawal_userId_fkey`, `DROP TABLE "Withdrawal";` et `ALTER TABLE "User" DROP COLUMN "withdrawalPinHash";`. Toute autre instruction signifie que le schéma s'écarte de la base : s'arrêter et corriger le schéma.

- [ ] **Step 6 : supprimer les fichiers**

Run : `git rm -r` sur chaque chemin de la liste Delete.

- [ ] **Step 7 : env, garde-fous, docs, manifeste**

Appliquer les modifications de `.env.example`, `env-shape.test.ts`, `claude-md-shape.test.ts`, `CLAUDE.md`, `README.md` et `features.json` listées plus haut.

- [ ] **Step 8 : vérifier que le garde-fou passe, puis la barrière**

Run : `pnpm --filter frontend exec vitest run src/lib/server/observability/pruned-surfaces.test.ts`
Expected : PASS (8 tests).
Run : `pnpm format && pnpm lint && pnpm typecheck && pnpm test`
Expected : tout passe. Aucune erreur TypeScript sur `withdrawal`, `seedWithdrawal` ou `verifyPin`.

- [ ] **Step 9 : appliquer la migration sur Neon**

Run (depuis `frontend/`) : `node --env-file=.env.local node_modules/prisma/build/index.js migrate deploy`
Expected : `Applying migration '5_drop_withdrawals'`, puis `All migrations have been successfully applied.`
Run : `node --env-file=.env.local node_modules/prisma/build/index.js migrate status`
Expected : `6 migrations found` et `Database schema is up to date!`.

- [ ] **Step 10 : commit**

```bash
git add -A
git commit -m "refactor!: remove withdrawals surface (Tamani has no payouts)

Follows PRUNING.md for the withdrawals feature: routes, libs, PIN,
Withdrawal model + migration 5_drop_withdrawals, env keys, tripwires,
docs and features.json. Protected files left untouched.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3 : Renommer le projet en Tamani

**Files :**
- Modify : `package.json` (`"name": "tamani"`)
- Modify : `frontend/src/app/layout.tsx` (`metadata` et `<html lang>`)
- Modify : `README.md`, `CLAUDE.md`, `STATUS.md`
- Modify (tests) : `frontend/src/lib/server/observability/claude-md-shape.test.ts`, `frontend/src/lib/server/observability/readme-shape.test.ts`

**Interfaces :**
- Consumes : docs nettoyées par la tâche 2.
- Produces : `metadata = { title: 'Tamani', description: 'Ta communauté parle. Tu sais quoi acheter.' }` et `<html lang="fr">` dans la mise en page racine.

- [ ] **Step 1 : tests qui échouent**

Dans `claude-md-shape.test.ts`, ajouter :

```ts
it('identifies the project as Tamani and links the design spec + roadmap', () => {
  const content = readFileSync(CLAUDE_MD_PATH, 'utf8');
  expect(content).toMatch(/Tamani/);
  expect(content).toContain('docs/superpowers/specs/2026-10-24-tamani-design.md');
  expect(content).toContain('docs/superpowers/plans/2026-10-24-tamani-roadmap.md');
});
```

Dans `readme-shape.test.ts`, ajouter `it('names the product Tamani', …)`, qui vérifie `toMatch(/^# Tamani/m)` sur le contenu.

- [ ] **Step 2 : vérifier qu'ils échouent**

Run : `pnpm --filter frontend exec vitest run src/lib/server/observability/claude-md-shape.test.ts src/lib/server/observability/readme-shape.test.ts`
Expected : FAIL sur les 2 nouveaux tests seulement.

- [ ] **Step 3 : réécrire les docs et les métadonnées**

- `README.md` : titre `# Tamani`, une phrase de présentation (le slogan), un lien vers la spec et la feuille de route. On **conserve** les éléments exigés par `readme-shape` : la séquence `cp .env.example frontend/.env.local`, `pnpm install`, `pnpm dev` ; `neon.tech` ; aucune mention de Docker ; `frontend/src/app/api` ; `CRON_SECRET` ; `pnpm smoke:auth`.
- `CLAUDE.md` : la section « What this project is » décrit Tamani (2 ou 3 phrases), avec les liens vers la spec et la feuille de route. Ajouter une section « Windows dev notes » : commande Prisma avec `--env-file`, régénération du client Prisma après un `pnpm install` complet, port 3001 si le 3000 est occupé. Les invariants et la liste des fichiers protégés restent identiques.
- `STATUS.md` : une ligne en tête, « 2026-10-24 — fork du kit izikit en Tamani (voir docs/superpowers/plans/) ».
- `package.json` racine : `"name": "tamani"`.
- `layout.tsx` : métadonnées et `lang="fr"` comme indiqué dans le bloc Interfaces.

- [ ] **Step 4 : vérifier**

Run : `pnpm --filter frontend exec vitest run src/lib/server/observability/`
Expected : PASS (tous les garde-fous de documentation).

- [ ] **Step 5 : commit**

```bash
git add -A
git commit -m "docs: rebrand the starter as Tamani

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4 : Groupes de routes `(public)`, `(app)` et `(admin)`

**Files :**
- Create : `frontend/src/lib/server/observability/layout-boundaries.test.ts`
- Modify : `frontend/src/app/layout.tsx` (retirer `ToastProvider`, `AuthProvider` et leurs imports)
- Create : `frontend/src/app/(app)/layout.tsx`, `frontend/src/app/(admin)/layout.tsx`
- Delete : `frontend/src/app/page.tsx` (page d'accueil de démonstration du kit)
- Create : `frontend/src/app/(public)/page.tsx` (page provisoire Tamani)
- Move : `frontend/src/app/auth/error/page.tsx` → `frontend/src/app/(public)/auth/error/page.tsx` (sans modification ; l'URL `/auth/error` reste la même)
- Move : `frontend/src/app/settings/page.tsx` → `frontend/src/app/(app)/app/reglages/page.tsx` (sans modification ; l'URL devient `/app/reglages`)
- Create : `frontend/src/app/(app)/app/page.tsx`, `frontend/src/app/(admin)/admin/page.tsx` (pages provisoires)

**Interfaces :**
- Consumes : `ToastProvider` (`@/contexts/ToastContext`) et `AuthProvider` (`@/contexts/AuthContext`), inchangés.
- Produces :
  - `(app)/layout.tsx` et `(admin)/layout.tsx` : `export default function …Layout({ children }: { children: React.ReactNode })`, qui rend `<ToastProvider><AuthProvider>{children}</AuthProvider></ToastProvider>` ;
  - la mise en page racine ne fournit plus que `<html lang="fr">`, la police et `globals.css` ;
  - les lots 2 et 4 à 9 ajoutent leurs pages dans ces groupes.

- [ ] **Step 1 : garde-fou qui échoue**

`frontend/src/lib/server/observability/layout-boundaries.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const APP = path.resolve(__dirname, '../../../app');
const read = (rel: string) => readFileSync(path.join(APP, rel), 'utf8');
const SESSION_IMPORT = /@\/contexts\/(AuthContext|ToastContext)/;

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? filesUnder(full) : [full];
  });
}

describe('layout boundaries (Tamani lot 1)', () => {
  it('root layout carries no session providers and is in French', () => {
    const src = read('layout.tsx');
    expect(src).not.toMatch(SESSION_IMPORT);
    expect(src).toMatch(/lang="fr"/);
  });

  it.each(['(app)/layout.tsx', '(admin)/layout.tsx'])('%s wraps children in Toast + Auth providers', (rel) => {
    const src = read(rel);
    expect(src).toMatch(/@\/contexts\/AuthContext/);
    expect(src).toMatch(/@\/contexts\/ToastContext/);
  });

  it('no file under (public) imports session contexts', () => {
    const offenders = filesUnder(path.join(APP, '(public)'))
      .filter((f) => /\.(tsx?|jsx?)$/.test(f))
      .filter((f) => SESSION_IMPORT.test(readFileSync(f, 'utf8')) || /useAuth\(/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('home page lives in the (public) group', () => {
    expect(existsSync(path.join(APP, 'page.tsx'))).toBe(false);
    expect(existsSync(path.join(APP, '(public)/page.tsx'))).toBe(true);
  });
});
```

- [ ] **Step 2 : vérifier qu'il échoue**

Run : `pnpm --filter frontend exec vitest run src/lib/server/observability/layout-boundaries.test.ts`
Expected : FAIL (la mise en page racine importe les contexts, les groupes n'existent pas).

- [ ] **Step 3 : restructurer**

- Les déplacements se font avec `git mv`.
- Les mises en page `(app)` et `(admin)` suivent le bloc Interfaces.
- `(public)/page.tsx` est un composant serveur sans aucun import de context. Contenu : `<h1>Tamani</h1>` et `<p>Ta communauté parle. Tu sais quoi acheter.</p>`, avec quelques classes Tailwind neutres. La vraie page d'accueil arrive au lot 9.
- `(app)/app/page.tsx` affiche « Tableau de bord » et `(admin)/admin/page.tsx` affiche « Administration Tamani », avec un texte provisoire « Bientôt disponible ».

- [ ] **Step 4 : vérifier**

Run : `pnpm --filter frontend exec vitest run src/lib/server/observability/layout-boundaries.test.ts`
Expected : PASS (5 tests).
Run : `pnpm typecheck && pnpm build`
Expected : le build réussit. La liste des routes contient `/`, `/app`, `/app/reglages`, `/admin` et `/auth/error`, mais **ni** `/settings` **ni** `/api/withdrawals`.

- [ ] **Step 5 : commit**

```bash
git add -A
git commit -m "feat: split the app into (public), (app) and (admin) route groups

Session providers now wrap only (app) and (admin), so public pages
(including the upcoming /c/[code] popup) ship no session JS.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5 : Validation du lot et pull request

**Files :** aucun nouveau fichier.

**Interfaces :**
- Consumes : les tâches 1 à 4.
- Produces : la PR « Lot 1 — Fondations Tamani » vers `main`.

- [ ] **Step 1 : barrière complète**

Run : `pnpm format && pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected : tout passe. Le nombre de tests est égal à 570, moins les tests supprimés avec les retraits, plus ceux ajoutés par les garde-fous.

- [ ] **Step 2 : smoke test d'authentification**

Lancer le serveur de dev (port 3001 si le 3000 est pris, voir Global Constraints), puis :
Run : `SMOKE_BASE_URL=http://localhost:3001 pnpm smoke:auth`
Expected : `✓ signup: 201`, `✓ verify-email: 200`, `✓ me: 200`, `✓ logout: 200`, puis `✓ smoke-auth PASS`.

- [ ] **Step 3 : contrôle visuel**

Ouvrir `http://localhost:3001/` : la page provisoire Tamani s'affiche. Dans l'onglet Réseau, **aucun** appel à `/api/auth/*`. Ouvrir `/app` : « Tableau de bord » s'affiche. Pas encore de redirection vers la connexion, elle viendra au lot 4.

- [ ] **Step 4 : pousser et ouvrir la PR**

```bash
git push -u origin plan/01-fondations
gh pr create --base main --head plan/01-fondations --title "Lot 1 — Fondations Tamani" --body "Repo branché, retraits retirés (PRUNING.md), projet renommé Tamani, groupes de routes (public)/(app)/(admin). Barrière verte et smoke test d'auth vert.

Plan : docs/superpowers/plans/2026-10-24-tamani-01-fondations.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

Expected : l'URL de la PR s'affiche. **S'arrêter** : la fusion se fait après relecture et accord du porteur du projet.

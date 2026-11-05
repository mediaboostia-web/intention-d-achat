# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> ⚠️ **Do NOT run `/init` on this project.** This CLAUDE.md is shipped with the starter and contains battle-tested invariants (runtime=nodejs enforcement, protected file list, OAuth refusal of `email_verified=false`, outbox pattern, raw-body HMAC ordering, …). Running `/init` would regenerate this file from the codebase and erase those invariants. Claude Code already loads this file automatically at session start — no command needed.

## What this project is

**Tamani** — a SaaS for African wholesalers: they share a link on WhatsApp, their community states its purchase intent in ~10 seconds in a popup, and the dashboard tells them what to order and how much, then helps them turn intents into orders and know their clients. Prepaid passes, billed through SasPay. Product design: [docs/superpowers/specs/2026-10-24-tamani-design.md](docs/superpowers/specs/2026-10-24-tamani-design.md). Implementation roadmap (lots, cross-lot contracts — names, signatures, routes, error codes): [docs/superpowers/plans/2026-10-24-tamani-roadmap.md](docs/superpowers/plans/2026-10-24-tamani-roadmap.md). Read both before adding Tamani code; when they disagree with this file on Tamani behaviour, the spec wins and this file gets updated.

Tamani is built on the izikit starter: a v1-shipped, headless Next.js 16 monolith (App Router API Route Handlers + Server Actions + Prisma 5 + Neon + Upstash + Cloudinary + Resend + SasPay + Sentry). There is no separate Express backend anymore — server logic lives under `frontend/src/app/api/*` and `frontend/src/lib/server/*`. Anything not listed under « Files Claude must NOT modify » is fair game to extend, refactor, or replace. The kit's history, the beginner workflow and the full architecture notes: [docs/claude/architecture.md](docs/claude/architecture.md); the public contract: [README.md](README.md).

## Commands

pnpm workspace — run from repo root unless noted. The root `package.json` is a thin orchestrator: every script delegates to `pnpm --filter frontend run X` (the workspace currently has a single package, but the root layer is preserved as an architectural seam).

| Task | Command |
|---|---|
| Dev (Next.js on :3000, Turbopack) | `pnpm dev` |
| Build | `pnpm build` |
| Apply Prisma schema (dev iteration) | `pnpm db:push` |
| Versioned migrations | `pnpm db:migrate:dev` (local) / `pnpm db:migrate:deploy` (CI/prod) |
| Migration status | `pnpm db:migrate:status` |
| Open Prisma Studio (:5555) | `pnpm db:studio` |
| Bootstrap first SUPERADMIN | `pnpm db:make-superadmin <email>` |
| Unit tests (Vitest) | `pnpm test` |
| Single test file | `pnpm --filter frontend exec vitest run src/lib/server/<file>.test.ts` |
| Single test by name | `pnpm --filter frontend exec vitest run -t "<test name>"` |
| Watch one test | `pnpm --filter frontend exec vitest src/lib/server/<file>.test.ts` |
| Typecheck | `pnpm typecheck` |
| Lint | `pnpm lint` |
| Format | `pnpm format` (or `pnpm format:check`) |

Integration tests are deferred (no formal harness in v1) — `pnpm smoke:auth` provides a manual UAT script for the auth happy path against a running `pnpm dev`. See README.

**Before committing:** `pnpm format && pnpm lint && pnpm typecheck && pnpm test` — must all pass.

## Dev notes (Windows + Prisma)

The porteur develops on Windows 11. These traps were hit during setup (2026-10-24):

- **Prisma CLI does not read `frontend/.env.local`** (only `.env`). Run migrations from `frontend/` as `node --env-file=.env.local node_modules/prisma/build/index.js migrate deploy` (same for `migrate status`, `migrate diff`, `validate`). Use Git Bash, not PowerShell, when redirecting output (`>` in PowerShell 5.1 writes UTF-16).
- **After a fresh `pnpm install`**, regenerate the client from `frontend/` with `node node_modules/prisma/build/index.js generate`. The postinstall run writes the client to the root `node_modules/.prisma/client`, where `@prisma/client/runtime/library.js` cannot be resolved (tsc errors on transaction clients, `Cannot find module` at runtime). Delete that root folder if it reappears.
- **A running `next dev` locks Prisma's query-engine DLL** — stop the dev server before `prisma generate` (EPERM on rename otherwise). Killing `next dev` mid-write can leave a truncated `frontend/.next/dev/types/routes.d.ts`; delete `frontend/.next/dev` if `tsc` reports syntax errors there.
- **Port 3000** is often taken by another local project; run `APP_URL=http://localhost:3001 pnpm exec next dev --port 3001 --turbopack` from `frontend/` and `SMOKE_BASE_URL=http://localhost:3001 pnpm smoke:auth`.
- Neon free-tier compute sleeps; a first `P1001 Can't reach database server` usually succeeds on retry.

## High-level architecture

Summary; the full text is in [docs/claude/architecture.md](docs/claude/architecture.md). Single Next.js 16 App Router app at `frontend/`; the root `package.json` keeps a pnpm-workspace shell. There is no `backend/` package — all server code is under `frontend/src/`.

- **Boot** — [frontend/instrumentation.ts](frontend/instrumentation.ts) `register()` inits Sentry (no DSN → silent no-op). Every Route Handler `export const runtime = 'nodejs'` ([runtime-enforcement.test.ts](frontend/src/lib/server/observability/runtime-enforcement.test.ts)). Handlers wrap their body in `withRequestContext()` ([request-context.ts](frontend/src/lib/server/observability/request-context.ts)) so logs carry `requestId` / `userId` / `route`.
- **Optional providers** — without `CLOUDINARY_*` / `RESEND_*` / `SASPAY_*` / `GOOGLE_*` their routes 404 or 503 (`/api/upload` → 503 `STORAGE_NOT_CONFIGURED`); `redis` is `Redis | null` (call sites decide the fallback). The app and `/api/auth` still boot.
- **Auth** ([auth.ts](frontend/src/lib/server/auth.ts)) — access JWT 15 min, refresh JWT 7 d scoped to `/api/auth`, CSRF double-submit cookie, all prefixed by `COOKIE_PREFIX`. Mutations need `x-csrf-token`: `verifyCsrf(req)` returns `NextResponse | null`. Signup is enumeration-resistant (same 201, no cookies; `POST /verify-email` issues them after the 8-char code). Per-email rate limits in [rate-limit-by-email.ts](frontend/src/lib/server/middleware/rate-limit-by-email.ts).
- **Middleware HOFs** ([middleware/index.ts](frontend/src/lib/server/middleware/index.ts)) — `requireAuth` / `requireAdmin` / `requireSuperadmin` / `requireOrgRole` / `optionalAuth` return `Context | NextResponse`: `if (auth instanceof NextResponse) return auth;`.
- **Browser `api()`** ([api.ts](frontend/src/lib/api.ts)) — refreshes on 401 with a single-flight lock, attaches CSRF, retries only `GET`/`HEAD` on network errors; switch on `ApiError.code`, never on `.message`.
- **Webhooks + outbox** — [webhook/handler.ts](frontend/src/lib/server/webhook/handler.ts) reads the raw body (`await req.arrayBuffer()`) and runs a `Serializable` transaction deduped by `WebhookLog @@unique([externalId, eventType])`; side effects go to the [outbox](frontend/src/lib/server/outbox/) inside the same tx, drained by [app/api/cron/outbox-drain](frontend/src/app/api/cron/outbox-drain/route.ts).
- **Payments** — [payments/](frontend/src/lib/server/payments/): SasPay's hosted checkout (`saspay.ts`) since lot 8; the `PaymentProvider` interface stays for a future provider; one in-memory `CircuitBreaker` (single instance by design).
- **Crons** — `app/api/cron/<name>/route.ts`, gated by `Authorization: Bearer ${CRON_SECRET}` through `verifyCronSecret`, answering `GET` (what Vercel Cron sends) and `POST`. `vercel.json` schedules each once a day (Vercel Hobby, `vercel-json-shape.test.ts`); the frequent ones (`outbox-drain` and `email-queue-drain` every minute, `billing-verify` every 5 minutes) are called by cron-job.org with the same Bearer header. Also `verification-cleanup`, `order-expiration`, `webhook-log-purge`, `email-job-purge`, `subscription-renewals`. [leader-lease.ts](frontend/src/lib/server/leader-lease.ts) Redis leases where two crons could collide. No `setInterval` loops.
- **Google OAuth** — [oauth/google.ts](frontend/src/lib/server/oauth/google.ts) + `app/api/auth/oauth/google/{start,callback}` (arctic, PKCE, state cookies path-scoped to `/api/auth/oauth`); refuses unverified emails; errors land on `/auth/error?code=…`. Inert without the three `GOOGLE_*`.
- **Organizations** — roles `OWNER` > `ADMIN` > `MEMBER` ([require-org-role.ts](frontend/src/lib/server/middleware/require-org-role.ts)), `requireOrgRole(min, paramName)`; non-members get 404, not 403. Tamani's shop routes `/api/shops/[orgId]/**` are built on it.
- **Admin back-office** — app-wide role `USER` < `ADMIN` < `SUPERADMIN`; endpoints under `/api/admin/*`; every mutation through `logAdminAction(prisma, {...})` ([admin/audit.ts](frontend/src/lib/server/admin/audit.ts)); first SUPERADMIN with `pnpm db:make-superadmin <email>`.

## Files Claude must NOT modify (battle-tested)

- [frontend/src/lib/server/auth.ts](frontend/src/lib/server/auth.ts), [crypto.ts](frontend/src/lib/server/crypto.ts), [logger.ts](frontend/src/lib/server/logger.ts), [redis.ts](frontend/src/lib/server/redis.ts), [rate-limit-store.ts](frontend/src/lib/server/rate-limit-store.ts), [slug.ts](frontend/src/lib/server/slug.ts), [zod-helpers.ts](frontend/src/lib/server/zod-helpers.ts) — refresh-token races, log-redaction holes, retry storms on POSTs all live here
- [frontend/src/lib/server/webhook/handler.ts](frontend/src/lib/server/webhook/handler.ts) — Serializable transaction + idempotency + raw-body invariants
- [frontend/src/lib/server/payments/circuit-breaker.ts](frontend/src/lib/server/payments/circuit-breaker.ts) — single-instance semantics by design
- [frontend/src/lib/server/oauth/google.ts](frontend/src/lib/server/oauth/google.ts) — state/PKCE cookie scoping, account-linking, ID-token decode are all interdependent (Phase 2 route handlers in `frontend/src/app/api/auth/oauth/google/*` consume this and are also off-limits)
- [frontend/src/lib/server/outbox/dispatcher.ts](frontend/src/lib/server/outbox/dispatcher.ts) — atomic claim + backoff invariants
- [frontend/src/lib/server/admin/audit.ts](frontend/src/lib/server/admin/audit.ts) — every back-office mutation MUST go through this; bypass = unaudited action
- [frontend/src/lib/server/middleware/index.ts](frontend/src/lib/server/middleware/index.ts), [require-admin.ts](frontend/src/lib/server/middleware/require-admin.ts), [require-org-role.ts](frontend/src/lib/server/middleware/require-org-role.ts) — role precedence + Context shape consumed by every route
- [frontend/src/lib/server/observability/request-context.ts](frontend/src/lib/server/observability/request-context.ts) — `requestId` propagation; breaking it silently strips correlation IDs from logs
- [frontend/instrumentation.ts](frontend/instrumentation.ts) — Sentry register hook; must run before any other server code
- [frontend/src/lib/api.ts](frontend/src/lib/api.ts) — auto-refresh + CSRF + retry-only-GET; do not extend retry to mutating verbs

If a change is genuinely required in any of these, surface a brief "I am about to modify X because Y — confirm?" before editing.

## Files Claude SHOULD modify (project surface)

- [frontend/prisma/schema.prisma](frontend/prisma/schema.prisma) — add domain models alongside the generic ones (User, Order, Organization, AdminAction, OAuthAccount, …). Do not rename the generic models.
- `frontend/src/app/api/<resource>/route.ts` — add new Route Handlers; always `export const runtime = 'nodejs'`, call `verifyCsrf(req)` for mutations, `requireAuth(req)` (or admin/org variants) at the top.
- [frontend/src/lib/server/notifications/templates.ts](frontend/src/lib/server/notifications/templates.ts) — add typed wrappers per notification type (must include a `dedupeKey` for at-most-once delivery)
- [frontend/src/lib/server/payments/](frontend/src/lib/server/payments/) — add new providers behind the `PaymentProvider` interface (`provider.ts`); SasPay's client (`saspay.ts`) shows the envelope, idempotency and error handling
- [frontend/src/lib/server/oauth/](frontend/src/lib/server/oauth/) — add new OAuth providers (`github.ts`, `apple.ts`, …) modeled on `google.ts`; add a sibling route handler under `frontend/src/app/api/auth/oauth/<provider>/{start,callback}/route.ts`
- [frontend/src/app/](frontend/src/app/) — your pages, your design (including `/admin/*` if you keep the back-office)
- `frontend/src/lib/server/cron/` — extend with `verifyCronSecret(req)` consumers; add new cron route handlers under `frontend/src/app/api/cron/<name>/route.ts` mirroring the 8 existing crons (export `GET`, which Vercel Cron sends, as `billing-verify` does); ALL cron handlers must verify `Authorization: Bearer ${CRON_SECRET}` via the shared `verifyCronSecret` helper
- [frontend/src/lib/server/webhook/saspay.ts](frontend/src/lib/server/webhook/saspay.ts) — the SasPay webhook provider (signature on `${timestamp}.` plus the raw body, event kinds); the underlying `webhook/handler.ts` stays PROTECTED
- [frontend/src/lib/server/orders/expire.ts](frontend/src/lib/server/orders/expire.ts) — `expirePendingOrders({ prisma, batchSize? })`: extend per project to add post-expiration side-effects (e.g. notify the user, write a refund job to outbox); the cron route at `app/api/cron/order-expiration/route.ts` calls this

## Critical invariants

- **Every Route Handler MUST `export const runtime = 'nodejs'`.** The runtime-enforcement test in `frontend/src/lib/server/observability/` fails CI otherwise (Prisma + bcrypt break on edge).
- Webhook handlers read the raw body via `await req.arrayBuffer()` and hash it BEFORE any JSON parse — calling `await req.json()` first is a silent HMAC-verification regression.
- Notification dispatchers MUST go through `createNotification(prisma, input)` — never `prisma.notification.create` directly (skips the dedup `P2002` catch).
- Webhook handlers emit side-effects via the **outbox** (`enqueueOutbox(tx, event)` inside the tx) — never via fire-and-forget closures.
- Payment amounts are **integer in smallest currency unit** (FCFA = no decimals; USD = cents). Never store decimals.
- `SASPAY_API_KEY` stays on the server: never in the browser, a log or git. Amounts go to SasPay as decimal strings (`toSaspayAmount`), and a pass opens only on `GET /payments/{id}/verify/` → `SUCCESS`.
- Frontend `api()` retries only `GET`/`HEAD` on network errors. Do not extend to `POST`/`PUT`/`PATCH`/`DELETE`.
- Signup never sets cookies and never reveals email existence. Cookies are issued by `/verify-email` after the user enters their code.
- Upload route enforces magic-byte validation against `UPLOAD_ALLOWED_MIME` via [frontend/src/lib/server/upload/sniff.ts](frontend/src/lib/server/upload/sniff.ts) — don't bypass by trusting `File.type` alone.
- Admin mutations MUST go through `logAdminAction(prisma, {...})` — every back-office write is auditable. Skipping it is a compliance regression.
- Admin role precedence: `USER` < `ADMIN` < `SUPERADMIN`. Only SUPERADMIN can change roles. The route refuses to demote the **last** SUPERADMIN to avoid locking the org out.
- Org role precedence: `MEMBER` < `ADMIN` < `OWNER`. `requireOrgRole(min, paramName)` returns **404** to non-members (not 403) so org existence isn't leaked.
- OAuth callback MUST refuse `email_verified !== true` from Google — otherwise an attacker with an unverified Google account matching a victim's email can take over the account via auto-linking.
- Cron handlers MUST verify `Authorization: Bearer ${CRON_SECRET}` to prevent unauthenticated invocation of background work.
- Cookies stay `httpOnly` + `Secure` (prod) + `SameSite=Lax`.
- Sentry init stays in [frontend/instrumentation.ts](frontend/instrumentation.ts) `register()` — do not move it into a route module (the hook fires before app code, route imports do not).

## Tamani detail — read the file for the area you touch

The lot-by-lot notes moved out of this file on 2026-11-04, copied verbatim under [docs/claude/](docs/claude/), so each turn reloads less. Before working on an area, read its file; when a change alters what a file describes, update that file.

| When you work on… | Read |
|---|---|
| The kit's history, the beginner workflow, the full architecture notes | [docs/claude/architecture.md](docs/claude/architecture.md) |
| Any screen: tokens, night theme colours, fonts, the `components/ui/` kit, verdict copy, logo, `/styleguide`, the bundled design skills (lot 2) | [docs/claude/design-system.md](docs/claude/design-system.md) |
| Shop API (`shopHandler`, isolation, errors, serializers, locks), sign-in pages, shop gate and shell, the popup `/c/[code]`, answers, bell and Web Push, installable app, home summary, clients, lists, Réglages (lots 3, 4, 5, 5b) | [docs/claude/tamani-lots-3-5.md](docs/claude/tamani-lots-3-5.md) |
| Stats, estimate, verdict, money, coefficients, offered verdict, in-stock campaigns, campaign tabs, photos and delivery place in the popup, client filters, exports and CSV, push prompt, profile, units (lots 6, 6b) | [docs/claude/tamani-lot-6-dashboard.md](docs/claude/tamani-lot-6-dashboard.md) |
| Orders (`SaleOrder`), turning an answer into an order, reliability and learned coefficients, the client card, anonymisation (lot 7) | [docs/claude/tamani-lot-7-orders.md](docs/claude/tamani-lot-7-orders.md) |
| Night theme, shell (TopBar, SideNav), global search, home layout, cards or list, the popup's thanks dialog, landing drawer (lot 7a); countries, currencies, `formatMoney`, country lock, phone numbers (lot 7b) | [docs/claude/tamani-lot-7a-7b-design-currencies.md](docs/claude/tamani-lot-7a-7b-design-currencies.md) |
| Passes and the plan grid, counted and pending answers, SasPay checkout and reconciliation, the SasPay webhook, billing crons, « Mon pass » screens, the ngrok recette (lot 8) | [docs/claude/tamani-lot-8-billing.md](docs/claude/tamani-lot-8-billing.md) |
| The home page `/`, its sections, `landing.css`, illustrations, footer wordmark (lot 9a) | [docs/claude/tamani-landing-lot-9a.md](docs/claude/tamani-landing-lot-9a.md) |
| Sign-up first name, legal pages, unit plurals, campaign deletion and archive, skeletons, onboarding, contact consent, quantities per option (lot 10) | [docs/claude/tamani-lot-10.md](docs/claude/tamani-lot-10.md) |
| The back-office at `/support-admin`: dashboard (revenue, MRR, churn, CAC, marketing spend), shops and passes granted by hand, accounts, audit journal (lot 11) | [docs/claude/tamani-lot-11-support-admin.md](docs/claude/tamani-lot-11-support-admin.md) |
| The public site v2: home sections and their ids, the menu, `/forfaits` (duration switch, comparison table), SEO and AI files (`robots`, `sitemap`, `llms.txt`, JSON-LD), the big picture of the sign-in pages, motion, `CountUp`, touch targets (lot 12) | [docs/claude/tamani-lot-12-site-public.md](docs/claude/tamani-lot-12-site-public.md) |
| Removing a feature (pruning), recommending a provider (real-time → Ably, queues, storage…), what the fork may change | [docs/claude/providers-and-pruning.md](docs/claude/providers-and-pruning.md) |

**Rules that cross every lot** (the files above give the detail and the test behind each):

- **Shop isolation** — every query on a shop's resource carries `organizationId` in its `where` (`findFirst({ where: { id, organizationId } })`, `updateMany`, `deleteMany`), never `findUnique({ where: { id } })` alone; `organizationId` comes from the URL, never the body; another shop's id is a 404.
- **Money** — integers in whole units of the shop's currency; every amount on screen goes through `formatMoney(amount, currency)` / `currencyLabel` ([currency.ts](frontend/src/lib/tamani/currency.ts)), never a written « FCFA » (`no-fcfa-literal.test.ts`).
- **Plan words** — no « Pro » or « Gratuit » in the shop space (`no-old-plan-words.test.ts`). In the notes of lots 3 to 7, « Free » reads « Sans pass » and « Pro and up » reads « any pass ».
- **Shop routes answer JSON, never 204** — `api()` reads every success as JSON (`{ deleted: true }`, `{ archived: true }`, `{ anonymized: true }`); `api()` encodes the body itself, so never `body: JSON.stringify` (`api-body.test.ts`).
- **Popup stays light** — `app/(public)/c/**`, `BottomSheet` and `ChoiceButton` never import `motion`, `framer-motion`, `gsap` or `libphonenumber-js` (`no-motion-in-popup.test.ts`); CSS animations only, stopped under `prefers-reduced-motion`. Public routes take no CSRF token but always the public rate limit (`public-routes.test.ts`).
- **Tokens only** — Tailwind's default palette is off: a default class (`text-gray-600`, `bg-white`…) fails `no-default-palette.test.ts`. `components/ui/` stays server and stateless; stateful parts go to `components/app/`.
- **Numbers and privacy** — a respondent's number leaves the server only through `shownPhone(e164, canSeeContacts, consentAt)`; never a first name or a number in a notification or a log.
- **Errors** — `tamaniError(code, status)` with a code from `TAMANI_ERRORS`; screens switch on `ApiError.code` and show `errorMessage()`.
- **Loading states** — the kit's `Skeleton` shapes, never a « Chargement… » sentence (`skeleton-loaders.test.ts`).
- **Migrations sort as text** — insert with a letter (`9g_…`), never `10_…` (`schema-tamani.test.ts`).
- **No server lib reaches into the DOM** — routes only return `NextResponse.json(...)`.

## Conventions

- TypeScript strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` — don't silence with `any` casts.
- ESLint 9 flat config + Prettier (run `pnpm format` before committing).
- Vitest for unit tests; setup file at [frontend/vitest.setup.ts](frontend/vitest.setup.ts), shared mocks under `frontend/src/test-utils/` (alias `server-only` to a no-op for jsdom).
- Conventional Commits.
- Node ≥ 20, pnpm ≥ 9 (see `engines` in [package.json](package.json)).

## Intégration de l'API SasPay

- Utilisez la documentation officielle : /llms.txt de la documentation SasPay.
- Utilisez la spécification OpenAPI : /api-reference/openapi.json.
- Utilisez l'URL de base `https://api.saspay.me/api/v1`.
- Effectuez toutes les requêtes SasPay depuis le backend.
- Stockez la clé API dans un gestionnaire de secrets ou une variable d'environnement.
- Ne placez jamais la clé API dans le frontend, les logs ou le dépôt Git.
- Envoyez la clé avec `Authorization: Bearer sk_test_...` en développement, `sk_live_...` en production.
- Ce compte SasPay n'a pas de clé de test (porteur, 2026-10-29) : le développement utilise la clé live. Les tests automatiques simulent `fetch` et ne lisent jamais la clé ; lire les tarifs ou créer une session non payée ne déplace pas d'argent ; aucun vrai paiement sans l'accord explicite du porteur.
- Montants : chaînes décimales (`"2500.00"`), jamais de flottants.
- Envoyez un `Idempotency-Key` sur `POST /payments/softpay/`, `POST /payouts/initialize/`, `POST /wallet-transfers/` et `POST /payments/{payment_id}/retry/`.
- Ne livrez un produit ou n'activez un accès que lorsque `GET /payments/{payment_id}/verify/` renvoie `SUCCESS`.
- Si `checkout_url` est non vide après un softpay, redirigez le client vers cette URL.
- Vérifiez la signature des webhooks (`X-Webhook-Signature`, `X-Webhook-Timestamp`) sur le corps brut, et rejetez un horodatage de plus de 300 secondes.
- Pour un retrait, whitelistez l'IP du serveur ; sinon l'appel renvoie `403 ip_not_whitelisted`.
- Gérez les réponses `401`, `403`, `404`, `409`, `422` et `429` selon l'endpoint ; en cas de `429`, espacez les appels.
- N'inventez aucun endpoint, champ, statut ou événement absent de la spécification OpenAPI.

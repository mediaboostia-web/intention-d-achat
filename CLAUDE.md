# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> ⚠️ **Do NOT run `/init` on this project.** This CLAUDE.md is shipped with the starter and contains battle-tested invariants (runtime=nodejs enforcement, protected file list, OAuth refusal of `email_verified=false`, outbox pattern, raw-body HMAC ordering, …). Running `/init` would regenerate this file from the codebase and erase those invariants. Claude Code already loads this file automatically at session start — no command needed.

## What this project is

**Tamani** — a SaaS for African wholesalers: they share a link on WhatsApp, their community states its purchase intent in ~10 seconds in a popup, and the dashboard tells them what to order and how much, then helps them turn intents into orders and know their clients. Freemium, billed through SasPay. Product design: [docs/superpowers/specs/2026-10-24-tamani-design.md](docs/superpowers/specs/2026-10-24-tamani-design.md). Implementation roadmap (9 lots, cross-lot contracts — names, signatures, routes, error codes): [docs/superpowers/plans/2026-10-24-tamani-roadmap.md](docs/superpowers/plans/2026-10-24-tamani-roadmap.md). Read both before adding Tamani code; when they disagree with this file on Tamani behaviour, the spec wins and this file gets updated.

Tamani is built on the izikit starter described below (withdrawals pruned in lot 1; Bictorys is swapped for SasPay in lot 8).

**Base: a v1-shipped, headless Next.js 16 monolith starter.** Single full-stack app (App Router API Route Handlers + Server Actions + Prisma 5 + Neon + Upstash + Cloudinary + Resend + Bictorys + Sentry). There is no separate Express backend anymore — server logic lives under `frontend/src/app/api/*` and `frontend/src/lib/server/*`. The kit shipped only logic; Tamani's own UI kit lives under `frontend/src/components/ui/` (see "Design system" below).

Origin: bootstrapped from `amadou-template` (the legacy monorepo predecessor) on 2026-05-07; the port to a single Next.js 16 app shipped through 7 phases (auth → OAuth/notifs → admin → uploads/withdrawals → webhooks/cron → docs/tests → final pass). 555/555 unit tests green (the storage swap dropped the now-obsolete `/api/files/[...key]` proxy tests).

**For an AI agent picking up this repo:** the architecture sections below describe what's already been built. Anything not listed under "Files Claude must NOT modify" is fair game to extend, refactor, or replace per your fork's needs — that's the point of a starter. The protected list is the small set of files where the invariants are subtle (refresh-token races, HMAC integrity, advisory locks…); everything else is the fork's surface area.

**Beginner workflow (vibe coding)** — clone, plug a Neon `DATABASE_URL`, open Claude Code, describe what you want, ship. See [WORKFLOW.md](WORKFLOW.md). The starter ships:
- [.mcp.json](.mcp.json) — empty MCP server map by default. Banani is optional; if the user wants it, the `setup-kit` skill walks through pasting their MCP connection block.
- [.planning/features.json](.planning/features.json) — machine-readable manifest of the optional surfaces (payments, oauth-google, uploads-cloudinary, email-resend, admin-backoffice, multi-tenancy, …) — declares what each surface needs so manual pruning per [PRUNING.md](PRUNING.md) stays safe.
- GSD (`get-shit-done-cc`) is **not** a prerequisite. It's an optional level-up workflow surfaced after a beginner's first feature, not by default.

Read [README.md](README.md) for the public-facing contract (endpoints, env vars, design swap, deploy) and [STATUS.md](STATUS.md) for the historical port roadmap. Reference pages live in [examples/frontend-pages/](examples/frontend-pages/) — copy/restyle freely, they all consume the same `/api/*` JSON contract.

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

**Single Next.js 16 App Router app** at `frontend/`. The root `package.json` keeps the pnpm-workspace shell so a future package (e.g. shared types) can be added without re-plumbing scripts. There is no `backend/` package — all server code is colocated under `frontend/src/`.

**Boot flow** — Next.js owns the server lifecycle, so there is no hand-rolled middleware chain. Three things matter:
1. **`frontend/instrumentation.ts`** is Next's `register()` hook — Sentry inits here (server + edge via `sentry.{server,edge}.config.ts`; client via `sentry.client.config.ts`). No DSN env → silent no-op.
2. **Every Route Handler MUST `export const runtime = 'nodejs'`** (Prisma + bcrypt + raw-body needs). [frontend/src/lib/server/observability/runtime-enforcement.test.ts](frontend/src/lib/server/observability/runtime-enforcement.test.ts) walks `app/api/**/route.ts` and fails CI if any route forgets it.
3. **Per-request observability** flows through [frontend/src/lib/server/observability/request-context.ts](frontend/src/lib/server/observability/request-context.ts) (`makeRequestContext` + `withRequestContext` + scoped `log`). Handlers wrap their body in `withRequestContext()` so logs auto-attach `requestId` / `userId` / `route`.

**Optional providers boot conditionally.** If `CLOUDINARY_*` / `RESEND_*` / `BICTORYS_*` / `GOOGLE_*` envs are absent, the corresponding routes either 404 silently or return 503 (e.g., `/api/upload` → 503 STORAGE_NOT_CONFIGURED when Cloudinary creds are missing). `frontend/src/lib/server/redis.ts` exposes `redis: Redis | null` (returns `null` rather than throwing when env is missing — call sites decide fallback). The app still boots and `/api/auth` still works. `log.warn` announces which providers are inert.

**Auth model** ([frontend/src/lib/server/auth.ts](frontend/src/lib/server/auth.ts)): access JWT (15min, all paths) + refresh JWT (7d, scoped to `/api/auth` for blast-radius reduction) + CSRF token (7d, double-submit cookie). All cookies are namespaced by `COOKIE_PREFIX` (default `app`) and set via `cookies()` from `next/headers` (async). All mutating endpoints require the `x-csrf-token` header echoed from the `<prefix>-csrf` cookie — `verifyCsrf(req)` returns a `NextResponse | null` you bail on at the top of each handler. **Signup is enumeration-resistant**: identical 201 response regardless of email existence, no cookies issued at signup — cookies are issued by `POST /verify-email` after the user enters their 8-char Crockford code. Per-email rate limits (login 10/15m, signup 5/h, etc.) sit on top of the global IP limiter via [frontend/src/lib/server/middleware/rate-limit-by-email.ts](frontend/src/lib/server/middleware/rate-limit-by-email.ts).

**Middleware HOFs** ([frontend/src/lib/server/middleware/index.ts](frontend/src/lib/server/middleware/index.ts)) — `requireAuth` / `requireAdmin` / `requireSuperadmin` / `requireOrgRole` / `optionalAuth` each return `Context | NextResponse`. Pattern in handlers: `if (auth instanceof NextResponse) return auth;`.

**Frontend `api()` wrapper** ([frontend/src/lib/api.ts](frontend/src/lib/api.ts)): auto-refreshes on 401 with a single-flight lock, attaches CSRF, and **only retries `GET`/`HEAD` on network errors** — never mutating verbs (would risk duplicate charges). `ApiError.code` exposes the server's stable error code (e.g. `TOO_MANY_SIGNUP_ATTEMPTS`, `ORG_ROLE_INSUFFICIENT`) — switch on `.code`, not on `.message`.

**Webhook idempotency + outbox:** [frontend/src/lib/server/webhook/handler.ts](frontend/src/lib/server/webhook/handler.ts) returns `(NextRequest) => Promise<NextResponse>` and reads the raw body via `await req.arrayBuffer()` (preserves byte-identical HMAC). The handler runs a `Serializable` Prisma transaction with `WebhookLog @@unique([externalId, eventType])` for dedup. Side-effects (emails, notifications) must NOT run as a postCommit closure — they go to the **outbox** ([frontend/src/lib/server/outbox/](frontend/src/lib/server/outbox/)) inside the same tx, drained by a Vercel Cron route ([frontend/src/app/api/cron/outbox-drain/route.ts](frontend/src/app/api/cron/outbox-drain/route.ts), every 1 min).

**Payments are pluggable** behind the `PaymentProvider` interface ([frontend/src/lib/server/payments/](frontend/src/lib/server/payments/)). Bictorys is the default. A single in-memory `CircuitBreaker` guards charge calls. Webhook replay window defaults to 60s (`BICTORYS_WEBHOOK_REPLAY_WINDOW_MS` to override).

**Cron strategy.** No `setInterval` loops — Next.js / Vercel doesn't keep long-lived processes. Background work runs as **Vercel Cron** routes under `app/api/cron/<name>/route.ts`, each gated by `Authorization: Bearer ${CRON_SECRET}`. Targets: `outbox-drain` (1m), `email-queue-drain` (1m), `verification-cleanup` (hourly), `order-expiration` (5m), `webhook-log-purge` (daily), `email-job-purge` (daily — purges SENT EmailJob rows older than `EMAIL_JOB_RETENTION_DAYS`, default 30). Multi-instance coordination still uses [frontend/src/lib/server/leader-lease.ts](frontend/src/lib/server/leader-lease.ts) Redis leases where two crons could collide. The Bictorys charge `CircuitBreaker` is still in-memory single-instance — replace with a Redis-backed variant for multi-pod prod (documented limitation).

**Google OAuth (Sign in with Google)** — [frontend/src/lib/server/oauth/google.ts](frontend/src/lib/server/oauth/google.ts) + Phase 2 route handlers under `frontend/src/app/api/auth/oauth/google/{start,callback}/route.ts`. Implemented with `arctic` (OAuth 2.0 + PKCE). `start` issues state + PKCE-verifier cookies (5min, path-scoped to `/api/auth/oauth`) and 302s to Google. `callback` validates state, exchanges code, decodes ID token, refuses unverified emails, find-or-create user with account linking by email, then issues our standard auth cookies. Frontend errors land on `/auth/error?code=…` (see [examples/frontend-pages/auth-error.tsx](examples/frontend-pages/auth-error.tsx)). Inert without `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI`.

**Multi-tenancy is opt-in.** [frontend/src/lib/server/middleware/require-org-role.ts](frontend/src/lib/server/middleware/require-org-role.ts) ships role types + rank helpers (`OWNER` > `ADMIN` > `MEMBER`). Default project surface stays user-owned (`Order.userId`). Apps that need orgs add `organizationId String?` on their domain models case by case and gate routes via `requireOrgRole('ADMIN', 'orgId')` from the middleware HOFs. Owner promotion is transactional (3 ops in a single tx). Non-members get **404, not 403**, to avoid leaking org existence.

**Admin back-office** — [frontend/src/lib/server/admin/audit.ts](frontend/src/lib/server/admin/audit.ts) + [frontend/src/lib/server/middleware/require-admin.ts](frontend/src/lib/server/middleware/require-admin.ts). App-wide role on `User` (`USER` < `ADMIN` < `SUPERADMIN`). Phase-5 endpoints under `/api/admin/*` cover users (search/detail/role-change), orders (filter), audit-log (paginated/filterable), and `/me` (admin probe). Every mutation calls `logAdminAction(prisma, {...})` → `AdminAction` row so we can answer "who did what when" during incidents. Bootstrap the first SUPERADMIN with `pnpm db:make-superadmin <email>` (the script lives at [frontend/scripts/make-superadmin.ts](frontend/scripts/make-superadmin.ts)).

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
- [frontend/src/lib/server/payments/](frontend/src/lib/server/payments/) — add new providers behind the `PaymentProvider` interface (use `bictorys.ts` as reference)
- [frontend/src/lib/server/oauth/](frontend/src/lib/server/oauth/) — add new OAuth providers (`github.ts`, `apple.ts`, …) modeled on `google.ts`; add a sibling route handler under `frontend/src/app/api/auth/oauth/<provider>/{start,callback}/route.ts`
- [frontend/src/app/](frontend/src/app/) — your pages, your design (including `/admin/*` if you keep the back-office)
- `frontend/src/lib/server/cron/` — extend with `verifyCronSecret(req)` consumers; add new cron route handlers under `frontend/src/app/api/cron/<name>/route.ts` mirroring the 5 existing crons; ALL cron handlers must verify `Authorization: Bearer ${CRON_SECRET}` via the shared `verifyCronSecret` helper
- [frontend/src/lib/server/webhook/bictorys.ts](frontend/src/lib/server/webhook/bictorys.ts) — webhook provider re-export with the `kind: 'refunded'` upgrade; replace per project (Phase 5 default); the underlying `webhook/handler.ts` stays PROTECTED
- [frontend/src/lib/server/orders/expire.ts](frontend/src/lib/server/orders/expire.ts) — `expirePendingOrders({ prisma, batchSize? })`: extend per project to add post-expiration side-effects (e.g. notify the user, write a refund job to outbox); the cron route at `app/api/cron/order-expiration/route.ts` calls this

## Critical invariants

- **Every Route Handler MUST `export const runtime = 'nodejs'`.** The runtime-enforcement test in `frontend/src/lib/server/observability/` fails CI otherwise (Prisma + bcrypt break on edge).
- Webhook handlers read the raw body via `await req.arrayBuffer()` and hash it BEFORE any JSON parse — calling `await req.json()` first is a silent HMAC-verification regression.
- Notification dispatchers MUST go through `createNotification(prisma, input)` — never `prisma.notification.create` directly (skips the dedup `P2002` catch).
- Webhook handlers emit side-effects via the **outbox** (`enqueueOutbox(tx, event)` inside the tx) — never via fire-and-forget closures.
- Payment amounts are **integer in smallest currency unit** (FCFA = no decimals; USD = cents). Never store decimals.
- `BICTORYS_API_KEY` (charges) and `BICTORYS_PRIVATE_KEY` (payouts) are distinct keys — must NEVER be confused.
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

## Tamani backend (lot 3)

Contracts (names, signatures, error codes) live in the roadmap §Contrats; this is the map.

- **Where things live** — [frontend/src/lib/tamani/](frontend/src/lib/tamani/) is pure and shared with the browser (plans, timing and labels, share message, `wa.me` links). [frontend/src/lib/server/tamani/](frontend/src/lib/server/tamani/) is server only: pure rules (`phone`, `short-code`, `campaign-status`, `estimate`, `subscription`), data helpers (`quota`, `shop`, `locks`, `campaign-limit`) and route plumbing (`http`, `errors`, `inputs`, `serializers`, `route`).
- **Shop routes** — `/api/shops/[orgId]/**` handlers are built with `shopHandler(minRole, handler)` ([route.ts](frontend/src/lib/server/tamani/route.ts)): request context → `verifyCsrf` → the kit's `requireOrgRole` (404 to non-members). Roles: reads `MEMBER`; shop settings and zones `ADMIN`; products and campaigns `MEMBER`; product delete `ADMIN`.
- **Isolation** — every query on a shop's resource carries `organizationId` in its `where` (`findFirst({ where: { id, organizationId } })`, `deleteMany`, `updateMany`); never `findUnique({ where: { id } })` alone. An id from another shop is a 404 with the resource's code. `organizationId` always comes from the URL: zod strips it from bodies.
- **Errors** — `tamaniError(code, status)` with a code from `TAMANI_ERRORS` ([errors.ts](frontend/src/lib/server/tamani/errors.ts)); a bad body is the kit's `validationFailed()` (400 `VALIDATION_FAILED`). Every Tamani JSON reply carries `x-request-id` (`jsonOk`).
- **Output** — data leaves only through [serializers.ts](frontend/src/lib/server/tamani/serializers.ts). `toPublicProduct` is the allowlist for respondents (no `costPrice`); campaigns are sent with their effective status and rendered `shareMessage`.
- **Races** — `advisoryXactLock(tx, key)` (`pg_advisory_xact_lock`) inside the transaction: `shop-create:<userId>` (one shop per account) and `campaign-activate:<organizationId>` (FREE limit of 3 effectively active campaigns). Share-link codes retry on collision with `withUniqueCode`, which wraps the whole transaction.
- **Tests** — route tests use [shop-fixtures.ts](frontend/src/test-utils/shop-fixtures.ts) (`signIn`, `asMember`, `asNonMember`, `apiRequest`, `routeParams`, `runTransactionsInline`): a real signed token and the real `requireOrgRole`, so the 404/403 gates are exercised, not mocked. Run one file with `npx vitest run <path>` from `frontend/` (quote paths with `[orgId]`).

## Design system — Tamani « Cahier du marché » (lot 2)

The brand charter is [docs/brand/tamani-brand.md](docs/brand/tamani-brand.md) — read it before building any screen. In short: squared notebook paper, blue pen, sign-painter yellow, the verdict as a rubber stamp, the calculation always visible, one bold element per screen.

- **Tokens** — [frontend/src/lib/design/tokens.ts](frontend/src/lib/design/tokens.ts) is the tested source (WCAG contrast on every declared text/background pair); the `@theme` block of [frontend/src/app/globals.css](frontend/src/app/globals.css) mirrors it (`tokens-sync.test.ts`). Use the semantic utilities (`bg-bg`, `text-ink`, `text-ink-soft`, `bg-primary`, `bg-accent`, `text-warning`…) plus `bg-paper`, `frame`, `highlight`, `stamp`, `pen`, `awning`, `shadow-press`, `rounded-control|card|sheet`. Tailwind's default palette is off (`--color-*: initial;` in `@theme`): only the tokens exist, and [no-default-palette.test.ts](frontend/src/lib/server/observability/no-default-palette.test.ts) rejects a default class (`text-gray-600`, `bg-white`…) anywhere in `src/`.
- **Fonts** — [frontend/src/app/layout.tsx](frontend/src/app/layout.tsx) loads Andika (`font-sans`, all text), Kalam (`font-hand`, titles and margin notes only) and Bowlby One (`font-sign`, the figures that matter) via `next/font`, and renders `<InkFilters />` once. The root layout carries no session providers: those live in `(app)/` and `(admin)/` so public pages ship no session JS.
- **Components** — [frontend/src/components/ui/](frontend/src/components/ui/) (`index.ts`): server components without state, tested as static HTML (`*.test.tsx`, `react-dom/server`). Compose them; extend the kit rather than restyling ad hoc.
- **Verdict copy** — [frontend/src/lib/tamani/verdict-display.ts](frontend/src/lib/tamani/verdict-display.ts) owns every verdict word, figure and sentence (`VerdictCode` is consumed by the lot 6 `computeVerdict`).
- **Logo** — geometry in [frontend/src/lib/design/logo-paths.ts](frontend/src/lib/design/logo-paths.ts); brand files under `frontend/public/brand/` and `frontend/src/app/icon.svg` / `apple-icon.png`; regeneration in [docs/brand/sources/README.md](docs/brand/sources/README.md).
- **Living reference** — `/styleguide` (dev only, `notFound()` in production) shows every token and component and rebuilds the campaign page and the popup from the kit.
- **Popup rule** — `BottomSheet`, `ChoiceButton` and `app/(public)/c/**` never import `motion`, `framer-motion` or `gsap` ([no-motion-in-popup.test.ts](frontend/src/lib/server/observability/no-motion-in-popup.test.ts)); animations are CSS and stop under `prefers-reduced-motion`.
- [examples/frontend-pages/](examples/frontend-pages/) — 9 kit reference pages (login/signup/…/admin). Not imported anywhere; lot 4 rebuilt the auth pages from them with the Tamani kit.

**No server lib reaches into the DOM.** Routes only return `NextResponse.json(...)`.

## Tamani wholesaler space (lot 4)

- **Route groups** — `(auth)` (login, signup, verify-email, forgot/reset-password, `/auth/error`): paper layout, no session provider. Each server `page.tsx` wraps its client form in `<Suspense>` (`useSearchParams`) and is the only place that reads env: the Google button shows only when `googleSignInEnabled()` ([google-enabled.ts](frontend/src/lib/server/oauth/google-enabled.ts)) sees the three `GOOGLE_*`. `(app)` carries the kit providers; `app/(app)/app/layout.tsx` is `<ShopGate>`.
- **Route protection** — [frontend/src/proxy.ts](frontend/src/proxy.ts), Next 16's `proxy` convention. With a `src/` directory it must live there: a root `middleware.ts` never runs. It only checks that a session cookie exists under `AUTH_PROTECTED_PREFIXES` (`/app,/admin`) and answers 303 → `AUTH_LOGIN_PATH?next=…`; the API does the real check. `?next=` is followed only through `safeNextPath` (internal paths, default `/app`).
- **Shop gate** — `ShopGate` ([ShopProvider.tsx](frontend/src/components/app/ShopProvider.tsx)) loads `GET /api/shops/me` and routes with `gateDecision` ([shop-gate.ts](frontend/src/lib/tamani/shop-gate.ts)): no shop → `/app/bienvenue`, a shop on the welcome page → `/app`. It then renders `AppShell` (SideNav from `lg`, BottomNav below). Screens read `useShop()` → `{ shop, role, reload }` ([shop-context.ts](frontend/src/components/app/shop-context.ts)) and call `reload()` after changing the shop.
- **Where components go** — `components/ui/` stays server and stateless; anything with state or handlers goes to [components/app/](frontend/src/components/app/) (`'use client'`). Screen logic (campaign wizard, price reading, status actions, nav, countries) is pure and tested in `lib/tamani/`. Pages stay thin: load, then compose.
- **Errors** — switch on `ApiError.code`; every known code has its French sentence in `errorMessage()` ([api-messages.ts](frontend/src/lib/tamani/api-messages.ts)).
- **Photos** — `uploadPhoto(file)` ([upload.ts](frontend/src/lib/tamani/upload.ts)) posts the multipart body to `/api/upload` itself (CSRF header, one refresh and retry on 401), because `lib/api.ts` is protected and sends JSON only. The upload route answers `{ code, message }`; `uploadErrorMessage(status, code)` turns it into French.
- **Links** — in-app navigation goes through `next/link` (`Button` with an internal `href`, `Tabs`, `NavBar`, `FilterBar`, cards); `/api/*` (Google start) and external links stay plain `<a>`.
- **Testing screens** — `vi.mock('next/navigation', async () => (await import('@/test-utils/next-navigation')).navigation)`, then `mockNextNavigation({ pathname, search, params })` sets the URL and returns `push`/`replace` spies ([next-navigation.ts](frontend/src/test-utils/next-navigation.ts)). Wrap shop screens in `ShopTestProvider({ shop, role })` with `TEST_SHOP` ([shop-context.tsx](frontend/src/test-utils/shop-context.tsx)). In static markup React writes `autoComplete`, `inputMode`, `minLength` in camelCase, and `next/link` puts `aria-current` before `href`: assert attributes without relying on their order.

### Bundled Claude Code skills (under [.claude/skills/](.claude/skills/))

Two design-system skills auto-load in any Claude Code session run from the repo:

- [`banani-design-implementation`](.claude/skills/banani-design-implementation/SKILL.md) — pixel-perfect 1:1 reproduction from a Banani MCP screen. Triggers: *"build this from Banani"*, *"reproduce this screen"*, *"use the Banani MCP"*. Reads CLAUDE.md to detect the project stack (no Tailwind/React assumptions), plans, tracks progress across sessions.
- [`ui-ux-pro-max`](.claude/skills/ui-ux-pro-max/SKILL.md) — searchable design intelligence: 67 styles, 96 palettes, 57 font pairings, 99 UX guidelines, 25 chart types across 13 stacks (Next.js, React, Vue, SwiftUI, Flutter…). Triggers: *"design / improve / review UI"* + element/topic. Includes shadcn/ui MCP integration.

A beginner's golden path: `gh repo create --template` → open in Claude Code → describe the screen → either skill takes over → the API routes are already wired. The starter therefore covers the *boring* parts (auth, payments, admin, webhooks, cron) so the fork-author spends their time on product/design.

## Tamani public popup and notifications (lot 5)

- **Popup** — `/c/[code]` ([page.tsx](frontend/src/app/(public)/c/[code]/page.tsx)) renders on the server from `getPublicCampaign` ([public-campaign.ts](frontend/src/lib/server/tamani/public-campaign.ts)), an allowlist: never the shop's WhatsApp number, `costPrice`, `plannedQuantity` or other respondents. `PopupSheet` then runs `popupReducer` ([popup-machine.ts](frontend/src/lib/tamani/popup-machine.ts)). The phone's memory (device id, name and number, each answer's token) is [device-memory.ts](frontend/src/lib/tamani/device-memory.ts) and copes with a missing or throwing `localStorage`. The popup calls the API with plain `fetch` (`popup-client.ts`), never `@/lib/api`, to stay light.
- **Public routes take no CSRF token** — `/api/public/responses` and `/api/public/views`: a respondent has no auth cookie to ride on (spec §6.5). What replaces it: the signed token in `x-response-token` ([response-token.ts](frontend/src/lib/server/tamani/response-token.ts); its key is derived from `JWT_SECRET` so it can never pass `verifyToken`), `enforcePublicRateLimit` (per campaign and 10 min: 30 writes per phone, i.e. IP and device id, and 600 per IP, since mobile operators put many subscribers behind one IP; [public-limits.ts](frontend/src/lib/server/tamani/public-limits.ts)) and the `website` honeypot. [public-routes.test.ts](frontend/src/lib/server/observability/public-routes.test.ts) fails if a public route calls `verifyCsrf` or skips the limit.
- **Answers** — `upsertResponse` ([responses.ts](frontend/src/lib/server/tamani/responses.ts)) saves every tap. The number at the last step completes the answer, upserts the `Respondent` (the client book) and folds a second phone into the answer that number already gave. A completed answer changes only with its token. Over the monthly quota: `locked`. Three numbers from one device: `suspicious`.
- **Notifications** — the first completion runs `after(() => notifyShopOfResponse(...))` ([notify-response.ts](frontend/src/lib/server/tamani/notify-response.ts)): one bell `Notification` per shop member through `createNotification` (dedupeKey per response and member), then Web Push ([push/web-push.ts](frontend/src/lib/server/push/web-push.ts), VAPID) with `tag = campaign:<id>`. Not through the outbox: its drain cron runs once a day on Vercel Hobby. Never a first name or a number in a notification. Without `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` push is inert and the bell still works. Browsers subscribe through `PushSubscription` and `/api/push/{public-key,subscriptions}`, which accepts only the browsers' push services (FCM, Mozilla, Apple, Windows): the server posts to every stored endpoint.
- **Installable app** — [manifest.ts](frontend/src/app/manifest.ts) (opens on `/app`, standalone) and [public/sw.js](frontend/public/sw.js), which shows pushes and opens the campaign on a tap; it has no fetch handler, so nothing is cached. `usePush` registers it from the shop space only. iPhones receive push only once Tamani is on the home screen, which `PushCard` explains.
- **Link previews** — `generateMetadata` → `popupMetadata` ([popup-metadata.ts](frontend/src/lib/tamani/popup-metadata.ts)): `og:image` is the product photo as a 1200 × 630 Cloudinary JPEG (`cloudinaryVariant`), small enough for WhatsApp; `/brand/og-default.png` without a photo. Popup pages are `noindex`. WhatsApp's crawler cannot reach `localhost`: check a real preview only on a deployed URL.

## Tamani shop-space retouches (lot 5b)

The porteur's eleven requests ([retours](docs/superpowers/specs/2026-10-25-tamani-retours-porteur.md) §3, [plan](docs/superpowers/plans/2026-10-25-tamani-05b-retouches.md)); decisions are listed under « Lot 5b » in the roadmap.

- **Shop context** — `GET /api/shops/me` also sends `usage { responsesThisMonth; monthlyLimit }` (`responsesThisMonth` in [quota.ts](frontend/src/lib/server/tamani/quota.ts)) and `me { firstName; name }`; `useShop()` exposes both. The sidebar (`SideNav`, `bg-cover`) shows the quota meter; the avatar (shop logo, else the user's initials) opens `/app/profil` since lot 6b (`/app/plus` before). Tests pass them through `ShopTestProvider` (`TEST_USAGE`, `TEST_ME`).
- **Home** — `buildShopSummary(db, organizationId, now)` ([summary.ts](frontend/src/lib/server/tamani/summary.ts)) behind `GET /api/shops/[orgId]/summary`: this week's card, activity, upcoming ends and arrivals. The type `ShopSummary` lives in [home-view.ts](frontend/src/lib/tamani/home-view.ts) with the greeting (phone's local hour) and the line builders; lot 6 extends it. Openings are not dated, so « ouvertures en cours » is the running campaigns' total.
- **Clients** — [clients.ts](frontend/src/lib/server/tamani/clients.ts): a visible client (`visibleClientWhere`) is not anonymised and has at least one complete, unlocked, non-suspicious answer. On a plan without `respondentContacts` the number never leaves the server (`phoneE164: null`) and the search ignores digits, so a number cannot be guessed digit by digit. Shared view types and the WhatsApp message are in [client-view.ts](frontend/src/lib/tamani/client-view.ts).
- **Lists** — `SearchField` writes `?q=` after 300 ms (`searchHref` drops the cursor). List routes send `counts` on the first page only, for the whole shop (not the search or the filter); `FilterBar` hides a chip whose count is 0 unless it is the active one. `Fab` is the phone-only « + ».
- **Migration `8_shop_description`** — `Organization.description` (300 characters, blank → `null`), shown in the popup under « Oui / Non ». `shopCompleteness` ([shop-completeness.ts](frontend/src/lib/tamani/shop-completeness.ts)) feeds the Réglages notice. The lot 7 orders migration is `9_sale_orders`.
- **Forms** — unit chips (`COMMON_UNITS` then the shop's own, `GET …/products/units`); an incoming campaign takes one arrival date, never before today (the API refuses a past one at creation, and at edit only when the date changes). Réglages: five sections with a left menu from `lg`, each save in its section header (`formId` / `hideSubmit` on `ShopForm` and `CoefficientsForm`). Sign-in pages: two columns from `lg`, Google first through `AuthForm`'s `before`.

## Tamani dashboard (lot 6)

What a campaign's answers mean ([plan](docs/superpowers/plans/2026-10-27-tamani-06-tableau-de-bord.md), spec §5.4 to §5.6).

- **Counted answer** — complete, not `locked`, not `suspicious`. Only counted answers enter the estimate, the breakdowns, the interested list and the export; locked and suspicious ones are only counted apart (`lockedCount`, `suspiciousCount`).
- **Rules** — pure, in `lib/server/tamani/`:
  - `estimate.ts` (`estimateFromTotals` for totals summed in the database);
  - `verdict.ts`: under `MIN_RESPONSES_FOR_VERDICT` (20, from `DEFAULT_MIN_RESPONSES` in `verdict-display.ts`) → `WAIT`; ratio realistic / reference ≥ 0.9 → `GO`, ≥ 0.4 → `CAUTION`, else `STOP`; no reference → `NEUTRAL`. The reference is `plannedQuantity`, else `stockQuantity`;
  - `money.ts`: integer FCFA, only with a `costPrice`, and never while the verdict waits;
  - `coefficients.ts`: the shop's settings (0.5 / 0.7 by default), range ± 0.1 bounded to [0, 1];
  - `stats.ts` (`computeCampaignStats`): a yes without a buyer type or a quantity is skipped, never a crash.
- **Plans** — `PLANS[plan].features`: `estimate` shows the verdict, the quantity and the money; `respondentContacts` the full numbers and WhatsApp buttons; `csvExport` the export and the copy of the numbers. The numbers and export routes need both `respondentContacts` and `csvExport`. On Free no full number leaves the server.
- **Offered verdict** (porteur, 2026-10-27) — on a plan without `estimate`, the first campaign to reach 20 counted answers gets its verdict, once and for good: `claimFreeVerdict` ([free-verdict.ts](frontend/src/lib/server/tamani/free-verdict.ts)) writes `Organization.freeVerdictCampaignId` only while it is null, then reads it back, so two racing requests end on the same campaign. `verdictAccess` → `PLAN | OFFERED | LOCKED`. While nothing is offered yet, `offerOpen` (stats) and a `WAIT` line (home) say the verdict is coming.
- **Routes** — `GET …/campaigns/[campaignId]/stats` (`{ stats, access, offerOpen }`, `stats.result` is null when `LOCKED`), `…/responses?filtre=oui|non&cursor=` ([campaign-responses.ts](frontend/src/lib/server/tamani/campaign-responses.ts); counts on the first page), `…/responses/numbers` (deduplicated, 5 000 at most). The Excel file moved in lot 6b to `/api/shops/[orgId]/exports/{preview,file,numbers}` (see below); `…/campaigns/[campaignId]/export` is gone. The home summary gains `campaigns[]`, `moneyProtectedThisMonth` and `todo[]` from `buildHomeBulletin` ([home-bulletin.ts](frontend/src/lib/server/tamani/home-bulletin.ts)), which reads the counted answers with two `groupBy`.
- **Excel file** — [csv.ts](frontend/src/lib/server/tamani/csv.ts): UTF-8 BOM, `;`, CRLF, RFC 4180 quotes, and an apostrophe before any cell starting with `= + - @`, tab or CR (a first name like `=HYPERLINK(…)` must not run). The browser fetches it through `downloadFile` ([download.ts](frontend/src/lib/tamani/download.ts)), which refreshes the session once on 401 like `upload.ts`, because `lib/api.ts` reads JSON only.
- **Screens** — the campaign page has four tabs (`campaignTab` in [results-view.ts](frontend/src/lib/tamani/results-view.ts)): Résultats by default, `?onglet=interesses|partager|modifier`; a draft and `?partager=1` open on Partager. `CampaignResults` and `InterestedList` each split a loader (`…Tab`) from a view drawn from props, which the tests render as static HTML. `DemandGauge` joined the kit. The WhatsApp message to an interested person is `interestedMessage` (`ARRIVED`, `IN_STOCK`, `INCOMING`).
- **Migrations are sorted as text** — `10_…` would run before `1_…`. Insert with a letter (`8b_free_verdict`); lot 7 keeps `9_sale_orders`. `schema-tamani.test.ts` fails if the folders stop sorting in the order they were written.

## Tamani dashboard retouches (lot 6b)

The porteur's requests after testing lot 6 ([retours](docs/superpowers/specs/2026-10-28-tamani-retours-porteur-2.md), binding; [plan](docs/superpowers/plans/2026-10-28-tamani-06b-retouches.md)); decisions are listed under « Lot 6b » in the roadmap.

- **In stock** — an `IN_STOCK` campaign has no verdict and never shows « On attend ». Résultats opens on « À servir maintenant » (interested people and quantities per timing, every plan), then the stock state from `computeStockAdvice` ([stock-advice.ts](frontend/src/lib/server/tamani/stock-advice.ts)): `ENOUGH` when realistic ≤ `stockQuantity`, else `SHORTAGE`, never read on `plannedQuantity`, `provisional` under 20 counted answers. It follows the verdict's access (`estimate` or the offered verdict); `LOCKED` shows « Ton stock va-t-il suffire ? »; no stock gives a sentence and a link to `?onglet=modifier`. `INCOMING` campaigns keep lot 6 unchanged.
- **In-stock display and money** — the copy is `stockAdviceDisplay`, `provisionalNote` and `toServeLine` ([results-view.ts](frontend/src/lib/tamani/results-view.ts)), drawn by `StockCard` ([StockCard.tsx](frontend/src/components/ui/StockCard.tsx)); `DemandGauge` takes `referenceLabel="en stock"`. Money calls `computeMoney({ reference: null, cap: stock })`: no `avoidedDeadStock`, profit capped at the stock. `buildHomeBulletin` ([home-bulletin.ts](frontend/src/lib/server/tamani/home-bulletin.ts)) sums `moneyProtectedThisMonth` over `INCOMING` campaigns only, and an in-stock home line reads « N à servir ».
- **Campaign page** — `campaignActions(status, availability)` ([campaign-actions.ts](frontend/src/lib/tamani/campaign-actions.ts)) gives buttons named by their verb (`primary` / `quiet`); `IN_STOCK` never gets `ARRIVED`, nor the arrival box of Intéressés. [Tabs.tsx](frontend/src/components/ui/Tabs.tsx) is a text tab bar: yellow underline and `aria-current="page"` on the active tab, equal widths, scrolls past four.
- **Popup** — [photo-gallery.tsx](frontend/src/app/(public)/c/[code]/photo-gallery.tsx) swipes the photos with CSS `scroll-snap` (`object-contain`, the first eager with `fetchPriority="high"`, the others lazy, dots from two photos, arrows from `lg`). In [popup-machine.ts](frontend/src/lib/tamani/popup-machine.ts) `notMe` moves `remembered` to `forgotten`; `itsMe` (« C'est bien moi, {Prénom} ») and « Retour » bring it back. The device memory changes only when a new number is sent.
- **Delivery place** — « Autre endroit » after the zones (straight away for a shop without zones) fills `Response.deliveryPlace` (migration `8c_delivery_place`): 2 to 80 characters, trimmed, no control characters, kept only when `wantsDelivery === true` and `zoneId === null`, cleared by a zone or a pickup, 400 on a campaign without delivery. Stats count it in `elsewhere` (« Autre endroit : N »), the interested list shows « Livraison · {lieu} », the export has a « Lieu » column. Never logged.
- **Phone country** — the popup sends `phoneCountry`, an ISO-2 code from `PHONE_COUNTRIES` ([phone-countries.ts](frontend/src/lib/tamani/phone-countries.ts), a static list a test compares to libphonenumber). The server passes it to `normalizePhone`, or the shop's country when it is missing (an older popup). `no-motion-in-popup.test.ts` also refuses `libphonenumber-js` under `app/(public)/c/**` and in `phone-countries.ts`. A client's country is read from the dial code, on every plan.
- **Client filters** — [client-filters.ts](frontend/src/lib/tamani/client-filters.ts) (`parseClientSearch`, `clientFilterSearch`, `periodRange`, `filterChips`) is shared by the page and the API: `type`, `reponse=oui|non`, `campagne`, `quartier=<zoneId>|autre`, `periode=ce-mois|mois-dernier|3-mois|AAAA-MM`, `pays`, `q`. `clientFilterWhere` ([clients.ts](frontend/src/lib/server/tamani/clients.ts)) puts every answer filter in **one** counted `responses.some` (« yes + October » is one answer, not two); `pays` is `phoneE164 startsWith` the dial prefix, so the number never leaves on Free. A bad value is a 400 from the API; the page then shows the whole book. Screen: `ClientFilterSheet` and `ClientFilterChips` ([ClientFilters.tsx](frontend/src/components/app/ClientFilters.tsx)).
- **Export page** — `/app/exporter` ([ExportView.tsx](frontend/src/components/app/ExportView.tsx): `ExportView` drawn from props, `ExportScreen` loads) keeps an `ExportQuery` in the address ([export-view.ts](frontend/src/lib/tamani/export-view.ts): `parseExportSearch`, `exportSearch`, `exportHref`; `quoi=reponses|clients`, `reponse=oui|non|toutes`, `echeance`, then the client filter names). « Télécharger pour Excel » (Intéressés) and « Exporter » (Clients) open it already filled. The preview reloads 300 ms after the last change; on Free the buttons give way to « Passe au Pro pour télécharger ».
- **Export routes** — `GET /api/shops/[orgId]/exports/preview` (10 rows, every plan, numbers masked without `respondentContacts`), `…/exports/file` (CSV, 20 000 rows at most, `tamani-interesses-riz-2026-10-28.csv` from `exportFilename(kind, title, now)`) and `…/exports/numbers` (5 000 at most, each once). `file` and `numbers` need `respondentContacts` and `csvExport` (403 `PLAN_FEATURE_LOCKED`); another shop's campaign or zone is a 404 (`exportScopeError`). Logic in [exports.ts](frontend/src/lib/server/tamani/exports.ts), columns in [campaign-export.ts](frontend/src/lib/server/tamani/campaign-export.ts), the lot 6 CSV rules unchanged.
- **Push sheet** — `PushPrompt` ([PushPrompt.tsx](frontend/src/components/app/PushPrompt.tsx)), mounted once in `AppShell`, asks « Être prévenu à chaque réponse ? » on a phone only (`(pointer: coarse)` and narrower than 1024 px), in state `ask` or `install-first`. `pushPromptDue` ([push-state.ts](frontend/src/lib/tamani/push-state.ts)): never on a computer; « Plus tard » asks once more 7 days later, then never. The memory is `localStorage` `tamani-push-prompt`, through `readPushPrompt` / `writePushPrompt`, which never throw. The home has no `PushCard` any more; Réglages keeps it (`#notifications`).
- **Plus and Profile** — the avatar opens `/app/profil` (`aria-label="Ton profil"`): the name through `PATCH /api/account` ([route.ts](frontend/src/app/api/account/route.ts): `{ name }`, 1 to 80 characters after trim, `withRequestContext` + `verifyCsrf` + `requireAuth`, the signed-in user only, the name never logged; then `reload()`), the email read-only, the password through the kit's `PUT /api/auth/change-password`, or `POST /api/auth/set-password` when `/api/auth/me` says `hasPassword: false`, and sign-out. `/app/plus` is one list with an icon per line: Produits, Forfait (`#forfait`), Réglages, Notifications, Profil, Aide (hidden while `LANDING_LINKS.whatsappContact` is `null`), Se déconnecter.
- **Units** — `COMMON_UNITS` ([units.ts](frontend/src/lib/tamani/units.ts)) has « demi-douzaine » right after « douzaine » (plural « demi-douzaines »).

## Tamani home page (lot 9a)

- **Route** — `/` is [app/(public)/page.tsx](frontend/src/app/(public)/page.tsx), static. It renders the sections of [components/landing/](frontend/src/components/landing/) in the porteur's order:
  1. hero ;
  2. video ;
  3. problem ;
  4. solution (the orbit) ;
  5. how it works ;
  6. before/after ;
  7. pricing ;
  8. community ;
  9. FAQ ;
  10. footer.

  The visual and copy reference is [the v3 mockup](docs/brand/mockups/2026-10-25-page-accueil-v3.html). Sections are server components. The client leaves are only what moves:
  - `LandingNav`, the floating bar that hides on the way down and shows on the way up (`navStep`) ;
  - `Orbit`, where the networks buzz and a « +1 » travels to the link ;
  - `CompareSlider` ;
  - `PricingTags` ;
  - `FilmPlayer` ;
  - `StickyCta` ;
  - `InView`, which sets `data-inview="true"` once on screen.
- **Content and rules** — [lib/tamani/landing.ts](frontend/src/lib/tamani/landing.ts) holds the FAQ (also the FAQPage JSON-LD), `pricingTiers` (from `PLANS`), `landingJsonLd` and `landingMetadata` (from `APP_URL`).
- **Links not given yet** — `LANDING_LINKS` and `LANDING_VIDEO` hold what the porteur has not given yet. A `null` link hides its button: WhatsApp contact, WhatsApp group, Facebook, Instagram, TikTok, and the video. [app/robots.ts](frontend/src/app/robots.ts) and [app/sitemap.ts](frontend/src/app/sitemap.ts) sit next to them.
- **Styles** — [landing.css](frontend/src/components/landing/landing.css): `lp-*` classes, theme variables only, unlayered (they win over utilities). Everything stops under `prefers-reduced-motion`. No animation library.
- **Illustrations** — the porteur makes them in ChatGPT ([prompts](docs/brand/prompts-images-accueil.md)) and saves the PNG in `docs/brand/mockups/images/` (git-ignored). `pnpm landing:images` writes the WebP the site serves, in `frontend/public/accueil/`; `next/image` resizes them. `Illustration ink` multiplies a drawing onto the paper, so never animate a transform on its parents.
- **Footer wordmark** — draw `WORDMARK_PATH` in an svg whose `viewBox` is `WORDMARK_VIEWBOX`. A `<use>` of a symbol inside an svg with the same offset viewBox shifts it and cuts the top off.
- **Answer time** — the page, the share message (`DEFAULT_SHARE_TEMPLATE`) and the link preview promise « moins de 30 secondes » (porteur, 2026-10-25).

## What is fair to modify

Anything outside [Files Claude must NOT modify](#files-claude-must-not-modify) is the fork's surface area:

- **Domain models** ([frontend/prisma/schema.prisma](frontend/prisma/schema.prisma)) — add fields, add models, add migrations. Do not rename the generic models; everything else is yours.
- **Routes** ([frontend/src/app/api/](frontend/src/app/api/)) — add new resources. The 39 existing routes are templates: `requireAuth` + `verifyCsrf` + `withRequestContext` is the boilerplate to copy.
- **Page UI** ([frontend/src/app/](frontend/src/app/)) — your design, your decision (Tailwind, shadcn/ui, vanilla CSS, anything).
- **Notifications** ([frontend/src/lib/server/notifications/templates.ts](frontend/src/lib/server/notifications/templates.ts)) — add new typed templates.
- **Payments** ([frontend/src/lib/server/payments/](frontend/src/lib/server/payments/)) — add Stripe, Paystack, etc. behind the `PaymentProvider` interface.
- **OAuth** ([frontend/src/lib/server/oauth/](frontend/src/lib/server/oauth/)) — add GitHub, Apple, etc. modeled on `google.ts`.
- **Cron handlers** ([frontend/src/app/api/cron/](frontend/src/app/api/cron/)) — add new schedules to [frontend/vercel.json](frontend/vercel.json) and a sibling route.
- **CLAUDE.md / README.md / STATUS.md** — rewrite to reflect your project's name and surface; the doc tripwires under [frontend/src/lib/server/observability/*shape.test.ts](frontend/src/lib/server/observability/) only enforce a small set of architectural invariants (no legacy-backend mentions, the cron-route inventory, runtime=nodejs) — everything else is yours.

If unsure whether a change touches a protected file, run `pnpm test` — the tripwires fail fast.

## Pruning protocol

When the user wants to remove an optional feature, follow the 9-step protocol in [PRUNING.md](PRUNING.md). Naive deletion based only on `owns` in [features.json](.planning/features.json) WILL break the build — PRUNING.md walks through `cross_dependencies` resolution, `surgical_edits` (do these BEFORE deletions), Prisma schema cleanup, vercel.json updates, tripwire patches, and the non-negotiable `pnpm format && lint && typecheck && test && build` gate before commit.

## Provider recommendations

When the user asks for a capability that this starter does not ship, recommend the provider listed below before falling back to a hand-rolled or in-process alternative. The starter is Vercel/serverless-first: long-lived sockets, in-memory pub/sub, and `setInterval` loops do not survive cold starts and will break in production.

| Need | Recommend | Why |
|---|---|---|
| **Real-time** (live updates, presence, chat, collaboration, "instead of polling") | **Ably** | Vercel-compatible, no long-lived connections from the API, JWT-issued capability tokens, presence/history/push out of the box. Do NOT recommend Socket.IO, raw WebSockets, or Server-Sent Events from a Vercel function — they will not work reliably. |
| Background jobs / queues | Upstash QStash, or extend the existing **outbox pattern** (`lib/server/outbox/`) drained by Vercel Cron | Same constraint — no long-running workers in a serverless runtime |
| Media / object storage | Cloudinary (already wired) | Already integrated — handles uploads, transformations, and CDN delivery |
| Email | Resend (already wired) | Already integrated |
| Cache / rate-limit / KV | Upstash Redis (already wired) | Already integrated |

**Trigger phrasing for real-time**: "live updates", "real-time", "websocket", "push notifications to the browser", "instead of polling", "chat", "presence", "collaboration", "live dashboard". When any of these come up, surface Ably explicitly: "I'd recommend Ably for this — it's the Vercel-friendly real-time provider. Want me to wire it up?" Then sketch the integration: token-mint route under `/api/realtime/token` issuing capability tokens after `requireAuth`, server-side `publish()` from route handlers via the Ably REST API, client `ably-js` subscribes to channels scoped by `userId` / `orgId`.

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
- Montants : chaînes décimales (`"2500.00"`), jamais de flottants.
- Envoyez un `Idempotency-Key` sur `POST /payments/softpay/`, `POST /payouts/initialize/`, `POST /wallet-transfers/` et `POST /payments/{payment_id}/retry/`.
- Ne livrez un produit ou n'activez un accès que lorsque `GET /payments/{payment_id}/verify/` renvoie `SUCCESS`.
- Si `checkout_url` est non vide après un softpay, redirigez le client vers cette URL.
- Vérifiez la signature des webhooks (`X-Webhook-Signature`, `X-Webhook-Timestamp`) sur le corps brut, et rejetez un horodatage de plus de 300 secondes.
- Pour un retrait, whitelistez l'IP du serveur ; sinon l'appel renvoie `403 ip_not_whitelisted`.
- Gérez les réponses `401`, `403`, `404`, `409`, `422` et `429` selon l'endpoint ; en cas de `429`, espacez les appels.
- N'inventez aucun endpoint, champ, statut ou événement absent de la spécification OpenAPI.
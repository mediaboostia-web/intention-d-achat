<!-- Moved verbatim from the repo-root CLAUDE.md on 2026-11-04 to keep CLAUDE.md light. Paths in the text are from the repo root; links are relative to this folder. -->

# Providers, pruning and what the fork may change

## What is fair to modify

Anything outside [Files Claude must NOT modify](../../CLAUDE.md#files-claude-must-not-modify) is the fork's surface area:

- **Domain models** ([frontend/prisma/schema.prisma](../../frontend/prisma/schema.prisma)) — add fields, add models, add migrations. Do not rename the generic models; everything else is yours.
- **Routes** ([frontend/src/app/api/](../../frontend/src/app/api/)) — add new resources. The 39 existing routes are templates: `requireAuth` + `verifyCsrf` + `withRequestContext` is the boilerplate to copy.
- **Page UI** ([frontend/src/app/](../../frontend/src/app/)) — your design, your decision (Tailwind, shadcn/ui, vanilla CSS, anything).
- **Notifications** ([frontend/src/lib/server/notifications/templates.ts](../../frontend/src/lib/server/notifications/templates.ts)) — add new typed templates.
- **Payments** ([frontend/src/lib/server/payments/](../../frontend/src/lib/server/payments/)) — add Stripe, Paystack, etc. behind the `PaymentProvider` interface.
- **OAuth** ([frontend/src/lib/server/oauth/](../../frontend/src/lib/server/oauth/)) — add GitHub, Apple, etc. modeled on `google.ts`.
- **Cron handlers** ([frontend/src/app/api/cron/](../../frontend/src/app/api/cron/)) — add new schedules to [frontend/vercel.json](../../frontend/vercel.json) and a sibling route.
- **CLAUDE.md / README.md / STATUS.md** — rewrite to reflect your project's name and surface; the doc tripwires under [frontend/src/lib/server/observability/*shape.test.ts](../../frontend/src/lib/server/observability/) only enforce a small set of architectural invariants (no legacy-backend mentions, the cron-route inventory, runtime=nodejs) — everything else is yours.

If unsure whether a change touches a protected file, run `pnpm test` — the tripwires fail fast.

## Pruning protocol

When the user wants to remove an optional feature, follow the 9-step protocol in [PRUNING.md](../../PRUNING.md). Naive deletion based only on `owns` in [features.json](../../.planning/features.json) WILL break the build — PRUNING.md walks through `cross_dependencies` resolution, `surgical_edits` (do these BEFORE deletions), Prisma schema cleanup, vercel.json updates, tripwire patches, and the non-negotiable `pnpm format && lint && typecheck && test && build` gate before commit.

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

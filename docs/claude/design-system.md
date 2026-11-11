<!-- Moved verbatim from the repo-root CLAUDE.md on 2026-11-04 to keep CLAUDE.md light. Paths in the text are from the repo root; links are relative to this folder. -->

# Tamani design system and bundled design skills

## Design system — Tamani « Cahier du marché » (lot 2)

The brand charter is [docs/brand/tamani-brand.md](../../docs/brand/tamani-brand.md) — read it before building any screen. In short: squared notebook paper, blue pen, sign-painter yellow, the verdict as a rubber stamp, the calculation always visible, one bold element per screen.

- **Tokens** — [frontend/src/lib/design/tokens.ts](../../frontend/src/lib/design/tokens.ts) is the tested source (WCAG contrast on every declared text/background pair); the `@theme` block of [frontend/src/app/globals.css](../../frontend/src/app/globals.css) mirrors it (`tokens-sync.test.ts`). Use the semantic utilities (`bg-bg`, `text-ink`, `text-ink-soft`, `bg-primary`, `bg-accent`, `text-warning`…) plus `bg-paper`, `frame`, `highlight`, `stamp`, `pen`, `awning`, `shadow-press`, `rounded-control|card|sheet`. The support-admin has its own violet (`admin`, `admin-ink`, `admin-soft`, `admin-bg`, utilities `admin-card` / `admin-field`), for back-office pages only (see the lot 11 note). Tailwind's default palette is off (`--color-*: initial;` in `@theme`): only the tokens exist, and [no-default-palette.test.ts](../../frontend/src/lib/server/observability/no-default-palette.test.ts) rejects a default class (`text-gray-600`, `bg-white`…) anywhere in `src/`.
- **Fonts** — [frontend/src/app/layout.tsx](../../frontend/src/app/layout.tsx) loads Andika (`font-sans`, all text), Kalam (`font-hand`, titles and margin notes only) and Bowlby One (`font-sign`, the figures that matter) via `next/font`, and renders `<InkFilters />` once. The root layout carries no session providers: those live in `(app)/` and `(admin)/` so public pages ship no session JS.
- **Components** — [frontend/src/components/ui/](../../frontend/src/components/ui/) (`index.ts`): server components without state, tested as static HTML (`*.test.tsx`, `react-dom/server`). Compose them; extend the kit rather than restyling ad hoc.
- **Verdict copy** — [frontend/src/lib/tamani/verdict-display.ts](../../frontend/src/lib/tamani/verdict-display.ts) owns every verdict word, figure and sentence (`VerdictCode` is consumed by the lot 6 `computeVerdict`).
- **Logo** — geometry in [frontend/src/lib/design/logo-paths.ts](../../frontend/src/lib/design/logo-paths.ts); brand files under `frontend/public/brand/` and `frontend/src/app/icon.svg` / `apple-icon.png`; regeneration in [docs/brand/sources/README.md](../../docs/brand/sources/README.md).
- **Living reference** — `/styleguide` (dev only, `notFound()` in production) shows every token and component and rebuilds the campaign page and the popup from the kit.
- **Popup rule** — `BottomSheet`, `ChoiceButton` and `app/(public)/c/**` never import `motion`, `framer-motion` or `gsap` ([no-motion-in-popup.test.ts](../../frontend/src/lib/server/observability/no-motion-in-popup.test.ts)); animations are CSS and stop under `prefers-reduced-motion`.
- [examples/frontend-pages/](../../examples/frontend-pages/) — 9 kit reference pages (login/signup/…/admin). Not imported anywhere; lot 4 rebuilt the auth pages from them with the Tamani kit.

**No server lib reaches into the DOM.** Routes only return `NextResponse.json(...)`.

### Bundled Claude Code skills (under [.claude/skills/](../../.claude/skills/))

Two design-system skills auto-load in any Claude Code session run from the repo:

- [`banani-design-implementation`](../../.claude/skills/banani-design-implementation/SKILL.md) — pixel-perfect 1:1 reproduction from a Banani MCP screen. Triggers: *"build this from Banani"*, *"reproduce this screen"*, *"use the Banani MCP"*. Reads CLAUDE.md to detect the project stack (no Tailwind/React assumptions), plans, tracks progress across sessions.
- [`ui-ux-pro-max`](../../.claude/skills/ui-ux-pro-max/SKILL.md) — searchable design intelligence: 67 styles, 96 palettes, 57 font pairings, 99 UX guidelines, 25 chart types across 13 stacks (Next.js, React, Vue, SwiftUI, Flutter…). Triggers: *"design / improve / review UI"* + element/topic. Includes shadcn/ui MCP integration.

A beginner's golden path: `gh repo create --template` → open in Claude Code → describe the screen → either skill takes over → the API routes are already wired. The starter therefore covers the *boring* parts (auth, payments, admin, webhooks, cron) so the fork-author spends their time on product/design.

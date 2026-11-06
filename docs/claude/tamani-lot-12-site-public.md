# Tamani — lot 12 (public site v2)

## Tamani public site v2 (lot 12)

The porteur's rewrite of the public site on 2026-11-05 ([spec](../superpowers/specs/2026-11-05-tamani-site-public-v2-design.md), [plan](../superpowers/plans/2026-11-05-tamani-12-site-public.md)); decisions are listed under « Lot 12 » in the roadmap. It builds on lot 9a ([tamani-landing-lot-9a.md](tamani-landing-lot-9a.md)): same `lp-*` styles, illustrations and client leaves, minus the pricing section.

- **Home `/`** — [app/(public)/page.tsx](../../frontend/src/app/(public)/page.tsx), static. Sections in order, with the ids the menu and the sticky button rely on:
  1. `Hero` ;
  2. `Film` (`#film`) ;
  3. `Problem` (`#probleme`), the five situations ;
  4. `Solution` (`#fonctionnalites`), the orbit and the six gains ;
  5. `Steps` (`#comment-ca-marche`) ;
  6. `BeforeAfter` (`#benefices`), with the counted example ;
  7. `Community` (`#communaute`) ;
  8. `Faq` (`#faq`) ;
  9. `FinalCta` (`#final`) ;
  10. `LandingFooter` (`#contact`).

  No price grid on the home page: `Pricing` and `OfferRail` are gone, and `page.test.tsx` checks `id="tarifs"` never comes back.
- **Menu** — `LANDING_NAV` in [landing.ts](../../frontend/src/lib/tamani/landing.ts). Its links are `/#…` (not `#…`) so they work from `/forfaits` too. `LandingNav current="/forfaits"` marks the page with `aria-current="page"`; on `/` an IntersectionObserver sets `data-active` on the section in view. The six links sit in the bar from 1120 px only, after the logo (never centred absolutely: « Contact » covered « Se connecter » at 1280 px). Below 1120 px they live in the drawer. `StickyCta` hides over `#communaute`, `#final` and `#contact`.
- **`/forfaits`** — [app/(public)/forfaits/page.tsx](../../frontend/src/app/(public)/forfaits/page.tsx), static, with its own title, canonical and FAQPage JSON-LD (`forfaitsMetadata`, `forfaitsJsonLd`). Content and rules live in [landing-forfaits.ts](../../frontend/src/lib/tamani/landing-forfaits.ts):
  - `FORFAITS_TABS` (`court`: trial, Semaine, 2 semaines, Illimité; `mois`: Mois, Mois Plus, Mois Max, Illimité);
  - `forfaitOffers`, `cardLines`;
  - `compareColumns` / `compareRows`;
  - `FORFAITS_FAQ`.

  The parts are in [components/landing/forfaits/](../../frontend/src/components/landing/forfaits/):
  - `DurationSwitch` is the « Courte durée / Au mois » switch: two native radios in a fieldset with a hidden legend. CSS `:has(#duree-mois:checked)` hides the other grid, so the switch works without JavaScript; without `:has`, both grids show. The client part only syncs the address: on load it checks the radio that `?duree=` names (`tabFromSearch`), and on change it writes `?duree=mois` with `history.replaceState`. The page stays static, and it opens on « Courte durée ».
  - `PlanGrid` holds the `OfferCard`s; the badged card gets the primary button.
  - `CompareTable` scrolls sideways in a focusable `role="region"` frame, with a sticky first column.

  The box « Et quand mon pass se termine ? » says campaigns are never cut when a pass ends.
- **Plan words and money** — `landing-forfaits.ts` may write « Gratuit » because `no-old-plan-words.test.ts` skips files starting with `landing`; it formats every amount with `formatMoney`. Only `components/landing/` and `lib/tamani/landing.ts` may write « FCFA » (`no-fcfa-literal.test.ts`).
- **SEO and AI** — `landingMetadata` and `landingJsonLd`:
  - Organization with `contactPoint` and `sameAs`, listing only the non-null `LANDING_LINKS`;
  - SoftwareApplication with an XOF `AggregateOffer`;
  - FAQPage built from `LANDING_FAQ` (11 questions).

  The other files:
  - [robots.ts](../../frontend/src/app/robots.ts) disallows `/app`, `/admin` and `/api`, and never names `/support-admin`: its layout carries `noindex`, which a disallowed page would hide from crawlers, and naming it would publish the address (the spec's §8.5 line was overruled at the final review);
  - [sitemap.ts](../../frontend/src/app/sitemap.ts) adds `/forfaits`;
  - [app/llms.txt/route.ts](../../frontend/src/app/llms.txt/route.ts) is a static `text/plain` summary for AI crawlers.

  The keyword list and the blog slugs for a later lot are in spec §8.
- **Sign-in pages** — `AuthPanel` ([auth-panel.tsx](../../frontend/src/app/(auth)/auth-panel.tsx)) shows the picture as a band above the form on a phone, and as a big sticky card beside it from `lg` (46/54 grid in the `(auth)` layout). Its sentence sits on a `deep` wash. `AuthForm` takes a `switchLink` under the title (« Pas encore de compte ? Créer un compte » / « Déjà un compte ? Se connecter »).
- **Motion** — everything is in the « Lot 12: motion » block of [landing.css](../../frontend/src/components/landing/landing.css):
  - `lp-press`, `lp-go`, `lp-shine` (once) and `lp-nudge` (3 times, paused on hover and focus) on the buttons;
  - `lp-word`, the hero title word by word, starting at opacity 0.15 so the LCP paints at once;
  - the pain cards coming in;
  - the step arrows drawing themselves;
  - the FAQ plus turning into a cross;
  - the menu underline;
  - the cards rising in on `/forfaits`.

  Rules:
  - Hidden starting states sit inside `@media (scripting: enabled)`, so nothing stays hidden without JavaScript.
  - Under `prefers-reduced-motion` nothing runs and the end states are written out.
- **`CountUp`** ([CountUp.tsx](../../frontend/src/components/landing/CountUp.tsx)) — client. It takes `unit: 'number' | 'money'`, not a formatter: a server component cannot pass a function. It renders the final value once (for search engines and screen readers). The running digits are an `aria-hidden` overlay in the same grid cell, so the width never moves. It only runs for a number that starts below the fold, and never under reduced motion; the pure frame maths is `countFrame` in `landing.ts`.
- **Phones and access** (from the recette at 320, 390, 1024 and 1280 px):
  - **Touch targets**: every link and button is at least 44 px tall. The footer and nav links use `inline-flex` + `min-height: 44px`; Tailwind parts use `min-h-11`.
  - **Scroll frames**: a scroll frame that contains `sr-only` text must be positioned (`position: relative`). Otherwise the absolute `sr-only` spans escape the clip and widen the phone layout (the table pushed `/forfaits` to 794 px).
  - **Hero title**: it is split by hand after « seulement », so « ce que » never stays alone on a line.
- **The presentation film (lot 15, 2026-11-06)** — `LANDING_VIDEO` in `landing.ts` points to [frontend/public/video/tamani-presentation.mp4](../../frontend/public/video/) (C01 « Le jour de la commande », 16:9, 61 s, H.264 1080p with faststart, about 12.6 MB) and its French captions `tamani-presentation.vtt`. `FilmPlayer` renders the `<video>` only after the click (`preload="none"`), so the home page never downloads it on load; before, the poster is the `video-affiche` illustration. The button's length comes from `filmLength(seconds)`: « 1 min » on screen, « 1 minute » in its `aria-label`, so a new film only changes `seconds`. A test checks that the MP4 (bytes `ftyp`) and the VTT (`WEBVTT`) are really in `public/`. The film's sources (Flow clips, the ElevenLabs voice, the motion layer) live outside the repo, in `Documents/Tamani-video/` (studio `motion/films/c01.html`, `scripts/c01-build.mjs`, `scripts/c01-sound.mjs`); the raw `frontend/public/Video motion tamani/` folder is git-excluded.
- **Still to come from the porteur** — the domain (`APP_URL`) and the Facebook, Instagram and TikTok links (`LANDING_LINKS`, `null` hides them and keeps them out of `sameAs`). The admin sign-in by e-mail code is lot 11c (spec §10), after the lot 11b PR.

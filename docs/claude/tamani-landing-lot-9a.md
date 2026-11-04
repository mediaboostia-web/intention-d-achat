<!-- Moved verbatim from the repo-root CLAUDE.md on 2026-11-04 to keep CLAUDE.md light. Paths in the text are from the repo root; links are relative to this folder. -->

# Tamani — lot 9a (home page)

## Tamani home page (lot 9a)

- **Route** — `/` is [app/(public)/page.tsx](../../frontend/src/app/(public)/page.tsx), static. It renders the sections of [components/landing/](../../frontend/src/components/landing/) in the porteur's order:
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

  The visual and copy reference is [the v3 mockup](../../docs/brand/mockups/2026-10-25-page-accueil-v3.html). Sections are server components. The client leaves are only what moves:
  - `LandingNav`, the floating bar that hides on the way down and shows on the way up (`navStep`) ;
  - `Orbit`, where the networks buzz and a « +1 » travels to the link ;
  - `CompareSlider` ;
  - `OfferRail`, the pricing rail's arrows ;
  - `FilmPlayer` ;
  - `StickyCta` ;
  - `InView`, which sets `data-inview="true"` once on screen.
- **Content and rules** — [lib/tamani/landing.ts](../../frontend/src/lib/tamani/landing.ts) holds the FAQ (also the FAQPage JSON-LD), `pricingTiers` (from `PLANS`), `landingJsonLd` and `landingMetadata` (from `APP_URL`).
- **Links** — `LANDING_LINKS` and `LANDING_VIDEO`; a `null` link hides its button. Given on 2026-10-30: the WhatsApp contact (`https://wa.me/2290195831126`) and the WhatsApp group; `LANDING_CONTACT_EMAIL` goes in the footer. Still `null`: Facebook, Instagram, TikTok and the video. On a phone the drawer opens them through two drawn cards (`menu-support`, `menu-groupe`), above « Commencer gratuitement ». [app/robots.ts](../../frontend/src/app/robots.ts) and [app/sitemap.ts](../../frontend/src/app/sitemap.ts) sit next to them.
- **Styles** — [landing.css](../../frontend/src/components/landing/landing.css): `lp-*` classes, theme variables only, unlayered (they win over utilities). Everything stops under `prefers-reduced-motion`. No animation library.
- **Illustrations** — the porteur makes them in ChatGPT ([prompts](../../docs/brand/prompts-images-accueil.md)) and saves the PNG in `docs/brand/mockups/images/` (git-ignored). `pnpm landing:images` writes the WebP the site serves, in `frontend/public/accueil/` (the sign-in drawings `connexion` and `inscription` included); `next/image` resizes them. `Illustration ink` multiplies a drawing onto the paper, so never animate a transform on its parents.
- **Footer wordmark** — draw `WORDMARK_PATH` in an svg whose `viewBox` is `WORDMARK_VIEWBOX`. A `<use>` of a symbol inside an svg with the same offset viewBox shifts it and cuts the top off.
- **Answer time** — the page, the share message (`DEFAULT_SHARE_TEMPLATE`) and the link preview promise « moins de 30 secondes » (porteur, 2026-10-25).

# Tamani — lot 14 (the waitlist)

## The pre-launch waitlist (lot 14)

Built 2026-11-06 for the marketing launch ([spec](../superpowers/specs/2026-11-06-tamani-liste-attente-design.md), [plan](../superpowers/plans/2026-11-06-tamani-14-liste-attente.md)). Every video and DM leads to one action: reserve a place. Branch `plan/14-liste-attente`, cut from `main` (not from lots 11b and 13).

### The page `/liste-attente`

[app/(public)/liste-attente/page.tsx](../../frontend/src/app/(public)/liste-attente/page.tsx) is async, rebuilt every 10 minutes (`revalidate = 600`), with its own metadata (`waitlistMetadata`) and a sitemap entry. In order:
1. the promise, with the form beside it from 960 px and under it on a phone (`#reserver`);
2. `Film` (`#film`);
3. three benefits;
4. a closing button back to `#reserver`.

`LandingNav current="/liste-attente"` marks the page. The counter « N vendeurs ont déjà réservé leur place » shows only from `WAITLIST_COUNTER_FROM` (50). When the count fails (database unreachable at build), the page builds without it and logs the error code only.

### The form

[WaitlistForm](../../frontend/src/components/landing/waitlist/WaitlistForm.tsx) is a client island.
- **The fields:**
  - first name;
  - `PhoneInput`, with Benin first (`phoneCountryChoices('BJ')`);
  - e-mail;
  - « Où vends-tu ? » chips (`WAITLIST_CHANNELS`);
  - the consent box;
  - the honeypot `website` (`.lp-wait__trap`, off-screen, `aria-hidden`, `tabIndex -1`).
- **The check:** the form runs `WaitlistInput` itself first, then sends through `api()`. It reads `?src=` from `window.location` at send time, so the static page needs no `useSearchParams` Suspense.
- **After sending:** [WaitlistThanks](../../frontend/src/components/landing/waitlist/WaitlistThanks.tsx) shows:
  - the place;
  - an invitation `https://wa.me/?text=…` carrying `?src=parrainage`;
  - the community group when `LANDING_LINKS.community` is set.

### The rules and the data

- **`WaitlistInput`** ([lib/tamani/waitlist.ts](../../frontend/src/lib/tamani/waitlist.ts), shared with the browser):
  - `firstName` 1 to 40;
  - `phone` / `email` blank → `null`, at least one;
  - `email` lower-cased;
  - `channels` within `WAITLIST_CHANNELS`;
  - `source` through `cleanSource` (`^[a-z0-9-]{1,40}$`, else `null`);
  - `consent: true`.
- **`waitlist.ts` does not import `landing.ts`** (it keeps its own `trimBase`): `landing.ts` imports `WAITLIST_PATH`.
- **`POST /api/public/waitlist`:**
  - no CSRF, `enforcePublicRateLimit(req, 'waitlist', 'form')`;
  - `normalizePhone(phone, shopCountry(country))`, an unreadable number → 400 `INVALID_PHONE`;
  - the honeypot → 200 `{ position: 0 }` and no write;
  - it answers with the first name just typed, never the stored one, so a contact does not reveal whose it is;
  - no contact in any log.
- **`WaitlistEntry`** (migration `9j_waitlist`):
  - `phone` (E.164) and `email` are each `@unique`, nullable;
  - `channels String[]`, `source`, `consentAt`;
  - no IP, no device.
- **[lib/server/tamani/waitlist.ts](../../frontend/src/lib/server/tamani/waitlist.ts):**
  - `joinWaitlist` finds the seller by WhatsApp or e-mail first. A known contact gets their first place back (`already: true`); a P2002 from two sends at once is read the same way;
  - `position` is the count of earlier rows plus one;
  - `listWaitlist`, `waitlistStats` and `waitlistCsv` feed the support-admin.

### The site before launch

`LANDING_SIGNUP_HREF` (`/liste-attente`) and `LANDING_SIGNUP_LABEL` (« Réserver ma place ») in [landing.ts](../../frontend/src/lib/tamani/landing.ts) drive every sign-up button of the public site:
- `Hero`, `FinalCta`, `Steps`, `Solution`, `BeforeAfter`, `Community` (no group);
- `StickyCta`, `LandingNav` (bar and drawer), `LandingFooter`;
- the `/forfaits` cards.

`/signup` still works by its own address, and sign-in stays. **At launch:** set the two constants back to `/signup` and « Essayer gratuitement »; the tests in `landing.test.tsx` and the page tests follow the constants' words.

### The support-admin

- **[/support-admin/liste-attente](../../frontend/src/app/(admin)/support-admin/liste-attente/page.tsx)** (ADMIN). [WaitlistView](../../frontend/src/components/admin/WaitlistView.tsx) shows:
  - the total and this week;
  - the sources (« Sans source » for none);
  - the table, newest first, ranked by arrival, the number written out with a `wa.me` link.
- **`GET /api/admin/waitlist/export`** (ADMIN): `toExcelCsv`, columns `Rang;Prénom;WhatsApp;E-mail;Où il vend;Source;Date`, `liste-attente-AAAA-MM-JJ.csv`, `no-store`.
- **The menu:** `ADMIN_NAV` gains « Liste d'attente », second. Lots 11b and 13 rewrite `ADMIN_NAV` (icons, more entries): merge by keeping their shape and adding this entry.

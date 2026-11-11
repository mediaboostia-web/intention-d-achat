# Tamani — lot 13 (the complete super-admin)

Spec: [2026-11-05-tamani-super-admin-complet-design.md](../superpowers/specs/2026-11-05-tamani-super-admin-complet-design.md). Four parts, one PR each: 13a (settings, admins, notifications), 13b (subscriptions, promo codes), 13c (e-mail reminders), 13d (blog). The look is lot 11b's; the door is lot 11c's ([tamani-lot-11-support-admin.md](tamani-lot-11-support-admin.md)).

Rules of every part: reading asks `ADMIN`, writing asks `SUPERADMIN`; every write goes through `logAdminAction`; every route is `runtime = 'nodejs'` and runs `withRequestContext` → `verifyCsrf` → `gatedAdmin` / `gatedSuperadmin` → `enforceAdminRateLimit` → zod → transaction → JSON; no protected file changes; no phone number, first name or e-mail in a log.

## 13a — Settings, admins, notifications

### Platform settings

- **`PlatformSetting`** (migration `9k_platform_settings`): one row, id `platform`. No row means the constants of `lib/tamani/landing.ts`; a saved row is the truth, and a null link hides its button on the public site.
- **[lib/tamani/platform-settings.ts](../../frontend/src/lib/tamani/platform-settings.ts)** (shared with the browser): `PlatformSettings`, `DEFAULT_PLATFORM_SETTINGS`, `PlatformSettingsInput` (zod), `settingsFromRow`, `rowFromInput`, `columnsFromSettings`, `changedFields`.
  - Each link is https on its own hosts (`LINK_HOSTS`: `wa.me`, `chat.whatsapp.com`, `facebook.com`, `instagram.com`, `tiktok.com`), so no link can carry a script.
  - The film and its captions are a Cloudinary address or a plain file of `public/video` (`SITE_FILE`): the built-in film saves untouched. Only the built-in film has a measured length; a hosted one shows no length on the play button (`LandingVideo.seconds` is optional).
- **[lib/server/tamani/platform-settings.ts](../../frontend/src/lib/server/tamani/platform-settings.ts)**: `loadPlatformSettings(db)`.
- **`GET` / `PUT /api/admin/settings`**: any admin reads, a SUPERADMIN saves. The journal line (`settings.updated`) lists the changed fields only, compared with the defaults when nothing was saved yet. The save rebuilds `/`, `/forfaits`, `/llms.txt` and the shop layout (`revalidatePath`).
- **Who reads them:** the home page, `/forfaits`, `llms.txt`, the footer, and the shop space's help links through the `PlatformLinks` context fed by the async shop layout (the « Plus » page and the billing screen are client components).
- **`/support-admin/parametres`**: `SettingsView` with `PlatformSettingsForm`, then the admins.

### Admins

- **[admin/admins.ts](../../frontend/src/lib/server/tamani/admin/admins.ts)**: `listAdmins`, `addAdmin` (an existing account is promoted, a new one is created through lot 11's `createUserByAdmin`; without a name it takes the first part of its e-mail), `changeAdminRole`.
- **Rules:** nobody changes their own role (`ADMIN_SELF_CHANGE`); the last SUPERADMIN cannot be demoted (`ADMIN_LAST_SUPERADMIN`), and the count takes a row lock (`SELECT … FOR UPDATE`) so two super-admins cannot demote each other at once; a removed admin goes back to `USER`. Other codes: `ADMIN_ALREADY`, `ADMIN_NOT_FOUND`.
- **`GET` / `POST /api/admin/admins`, `PATCH /api/admin/admins/[id]`** (SUPERADMIN to write).

### Notifications

- **The feed is read from the data**, without touching sign-up or payment ([admin/feed.ts](../../frontend/src/lib/server/tamani/admin/feed.ts)): a verified e-mail is a sign-up, a new organization a shop, an activated order with an amount a payment, a failed or expired one a payment that did not go through. 30 days, 50 per page, a cursor on the date.
- **The feed shows the first word of a name only**, and never a number.
- **`AdminFeedSeen`**: each admin's last visit. The badge counts what happened since, capped at 99 (`unreadLabel`). `POST /api/admin/feed/seen` is sent by `FeedSeen` when the page opens.
- **Filters** (`FEED_FILTERS`): tout, inscriptions (sign-ups and shops), paiements, échecs.
- **`/support-admin/notifications`**: `FeedView`. The menu shows the badge.

### The menu

`ADMIN_NAV`: Tableau de bord, Notifications, Liste d'attente, Boutiques, Utilisateurs, Journal, Paramètres. On a phone the entries are tabs, three a row.

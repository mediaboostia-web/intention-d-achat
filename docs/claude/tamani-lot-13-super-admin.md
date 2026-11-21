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

`ADMIN_NAV`: Tableau de bord, Notifications, Liste d'attente, Boutiques, Utilisateurs, Blog (13d), Journal, Paramètres. On a phone the entries are tabs, three a row.

## 13d — Blog

Spec: [2026-11-21-blog-design.md](../superpowers/specs/2026-11-21-blog-design.md) (replaces §10 of the November spec). The porteur chose a « Magazine » index, a « Discret » article, a guide given for a contact, and an editor « comme Word »; the blog is public and indexed from its first article.

- **Data** (migration `9m_blog`, seeds four categories): `BlogCategory`, `BlogGuide` (an external link, one `isDefault`), `BlogPost` (Tiptap JSON in `content`, `status` DRAFT | PUBLISHED, `publishedAt` set once on the first publication and kept afterwards), `BlogLead` (first name, E.164 number, country, article, guide). A category with articles cannot be deleted (`BLOG_CATEGORY_NOT_EMPTY`); deleting a guide sets its articles back to the default one.
- **[blog-render.ts](../../frontend/src/lib/tamani/blog-render.ts)** is the only way a document becomes HTML: a whitelist of nodes and marks, every text escaped, links http(s)/mailto/relative only (external ones open a new tab), images https only, YouTube by its 11-character id on `youtube-nocookie.com`, h1 turned into h2, h2/h3 given ids for the table of contents. The public page and the editor's preview share it; nothing the editor stored reaches a page untouched.
- **[blog.ts](../../frontend/src/lib/tamani/blog.ts)** (shared): the zod inputs (`BlogPostInput` draws the slug from the title, `BlogGuideInput` takes http(s) links only, `BlogLeadInput` asks a consent), metadata (canonical on `APP_URL`, the cover as share image, `article` type), `BlogPosting` + `BreadcrumbList` JSON-LD, share links.
- **[lib/server/tamani/blog.ts](../../frontend/src/lib/server/tamani/blog.ts)**: public reads (published only), admin writes (`savePost`, `saveCategory`, `saveGuide` inside the caller's transaction), leads and their CSV, `blogStats`.
- **Admin API** `/api/admin/blog/{posts,categories,guides}` (+ `/[id]`) and `/leads/export`, through [blog-routes.ts](../../frontend/src/lib/server/tamani/admin/blog-routes.ts): each route names its gate (`gatedAdmin('ADMIN')` to read, `gatedSuperadmin()` to write), CSRF, rate limit, zod, one transaction with `logAdminAction` (`blog.post_create|update|delete`, `blog.category_*`, `blog.guide_*`), then `rebuildBlog()` (`/blog` layout and the sitemap).
- **Public route** `POST /api/public/blog-leads`: honeypot, `normalizePhone`, public rate limit (`blog-guide`), the article's guide else the default one, answers `{ url }`. The number and the first name are never logged.
- **Pages**: `/blog` (`?page=`, 12 a page), `/blog/categorie/[slug]`, `/blog/[slug]` (ISR, one hour, rebuilt on every admin write). « Blog » sits in the phone menu and the footer, not in the computer bar (three entries, porteur 2026-11-06). The sitemap lists `/blog`, the published articles (with `lastModified`) and the categories that have some; it falls back to the fixed pages when the database does not answer.
- **Support-admin** `/support-admin/blog` (figures, search, filters, list), `/nouveau` and `/[id]` (the `PostEditor`: Tiptap 3.33.0 pinned, toolbar, image upload through `/api/upload`, YouTube, preview, Google fields, draft / publish / unpublish / delete with an in-page confirmation), `/categories`, `/guides`, `/contacts` (CSV). An ADMIN reads; the editor is SUPERADMIN only.

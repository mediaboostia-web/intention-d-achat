# The blog (lot 13d) — design

Date: 2026-11-21 · Branch: `plan/13d-blog` · Replaces §10 of
[2026-11-05-tamani-super-admin-complet-design.md](2026-11-05-tamani-super-admin-complet-design.md).
The porteur chose every point below in the conversation of 2026-11-21, then said
« Ne parle plus, lance-toi »: the points marked *(builder)* are my calls.

## Intent

The porteur writes articles about the news of wholesale, opportunities, tools,
solutions and the problems sellers meet — everything close to what Tamani does. They
must (1) bring visitors from Google and (2) turn readers into contacts: download a
guide, sign up on Tamani, join the WhatsApp group.

## Goals

1. **Public, no account:** `/blog` (« Magazine » layout: a featured article, category
   pills, a grid of cards, a guide band), `/blog/categorie/[slug]`, `/blog/[slug]`.
2. **The article page (« Discret »):** category, title, date, reading time, cover; the
   text (headings, bold, italic, lists, quotes, links, images, YouTube); on a computer a
   table of contents and share buttons on the right; at the end « Passe à l'action »
   with three buttons — guide, sign-up (`LANDING_SIGNUP_HREF`), WhatsApp group (the
   `community` platform link) — then « À lire aussi » (three of the same category).
3. **Guide for a contact (option A):** the guide button opens a small form (first name,
   WhatsApp number, country, consent); on success the guide's link opens. **A guide is
   an external link** (a shop page, a PDF online…), with a title and a line of text.
4. **Visual editor « comme Word »** in the support-admin: toolbar (headings, bold,
   italic, lists, quote, link, image upload, YouTube), paste from Google Docs/ChatGPT.
5. **Full CRUD for the super-admin:** articles (draft / publish / unpublish / edit /
   delete, search, filter by state and category), categories (create, rename, order,
   delete when empty), guides (create, edit, delete, one default), contacts (list,
   CSV export). Admins (role ADMIN) read; only SUPERADMIN writes.
6. **SEO:** each article has a slug (proposed from the title, editable), a Google title
   and description (default: title and summary), keywords, a cover used as share image;
   `BlogPosting` + `BreadcrumbList` JSON-LD; canonical on `APP_URL`; `/blog`, the
   categories and every published article in the sitemap with their last change;
   `/blog` in `llms.txt`; « Blog » in the public menu and footer. Indexed from the first
   published article (the porteur wants SEO now; the November rule to hide it is lifted).

## Non-goals

Comments, newsletters by e-mail, several authors with accounts, scheduled publishing,
article statistics beyond contacts per article, writing the guides themselves.

## Anti-goals

- No testimonial, no invented figure or promise in any built-in copy.
- A reader is never interrupted while reading (no pop-up, no sticky bar).
- The editor's HTML is never trusted: the public page shows only what a whitelist
  renderer produces from the stored document.
- A contact's number never appears in a log, and on screen only to admins.

## Approaches

- **A — Tiptap editor, document stored as JSON, own whitelist renderer to HTML (chosen,
  builder).** Free (MIT), the « Word » feel the porteur picked, paste handled by the
  schema; rendering is a pure function we test, so no sanitizer dependency and no HTML
  injection by construction. Trade-off: one more dependency set, admin pages only.
- **B — Markdown with preview.** Simpler, rejected by the porteur.
- **C — An external CMS (Sanity, Notion…).** Another account and cost, content outside
  the admin. Rejected.

## Data (builder) — migration `9m_blog`

- `BlogCategory { id, slug @unique, name, description?, position Int, timestamps }`,
  seeded with « Actualités », « Opportunités », « Outils », « Problèmes et solutions ».
- `BlogGuide { id, title, description?, url, isDefault Boolean, timestamps }`.
- `BlogPost { id, slug @unique, title, excerpt, coverUrl?, coverAlt?, content Json,
  readMinutes Int, seoTitle?, seoDescription?, keywords String[], authorName,
  status 'DRAFT'|'PUBLISHED', publishedAt?, categoryId?, guideId?, createdById?,
  updatedById?, timestamps }`. Deleting a category with articles is refused
  (`BLOG_CATEGORY_NOT_EMPTY`); deleting a guide sets its articles back to the default.
- `BlogLead { id, firstName, phone (E.164), postId?, guideId?, consentAt, createdAt }`.

## Left to the builder

Exact copy, icons, CSS; the admin layout of each screen; pagination size (12).

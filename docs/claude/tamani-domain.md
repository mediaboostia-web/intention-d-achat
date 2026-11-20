# The domain: tamani.win

Bought by the porteur at Cloudflare on 2026-11-20 (Cloudflare Registrar, nameservers
`rayne` / `yoxall.ns.cloudflare.com`). It replaces `intention-d-achat.vercel.app` as the
public address. `tamani.app` was never bought.

## In the code

No domain is written in server code: every link, canonical, sitemap entry, share link
(`${APP_URL}/c/<code>`), payment return URL and renewal e-mail reads `APP_URL`. Only two
display texts carry the name, both now `tamani.win`: the landing `Orbit` bubble and the
wizard's `PREVIEW_LINK`. Test fixtures use `https://tamani.win`.

## Outside the code (each step needs the porteur's OK; values come from each dashboard)

1. **Vercel → project → Settings → Domains**: add `tamani.win` and `www.tamani.win`, the
   `www` redirecting to the apex. Vercel shows the DNS records to create.
2. **Cloudflare → DNS**: create exactly those records (apex `A`, `www` `CNAME`), proxy
   **off** (grey cloud, "DNS only"), or Vercel cannot issue the certificate.
3. **Vercel → Environment Variables (Production)**: `APP_URL=https://tamani.win`,
   `GOOGLE_REDIRECT_URI=https://tamani.win/api/auth/oauth/google/callback`,
   `VAPID_SUBJECT=mailto:<an address on tamani.win>`; then redeploy. `EMAIL_FROM` changes
   only after step 5.
4. **Google Cloud → OAuth client**: add the origin `https://tamani.win` and the redirect
   URI above (keep the old ones until the switch is checked).
5. **Resend → Domains**: add `tamani.win`, copy its records (on the `send` subdomain and
   `resend._domainkey`) into Cloudflare, wait for "Verified", then
   `EMAIL_FROM="Tamani <notifications@tamani.win>"` (or the address the porteur picks).
6. **Cloudflare → Email Routing**: forward `bonjour@tamani.win` (and others) to the
   porteur's Gmail. Its MX records sit on the apex and do not clash with Resend's.
7. **SasPay dashboard**: webhook URL `https://tamani.win/api/webhooks/saspay`.
8. **cron-job.org**: point `outbox-drain`, `email-queue-drain` and `billing-verify` at
   `https://tamani.win/api/cron/<name>` (same Bearer header).
9. **Super-admin → Paramètres**: contact e-mail `bonjour@tamani.win` once step 6 works.

## Effects to expect

- Links already shared on WhatsApp (`intention-d-achat.vercel.app/c/…`) keep working:
  the Vercel address stays attached to the project.
- Sessions are per host: a wholesaler signs in once again on `tamani.win`.
- Web Push subscriptions keep working (they depend on the VAPID keys, not on the
  subject). An app installed on a phone from the old address stays on the old address
  until it is installed again from `tamani.win`.

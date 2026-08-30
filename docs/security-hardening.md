# Production Security Hardening & Geo-Restriction Runbook

This document covers the configuration that lives **outside the repo** — Cloudflare,
Vercel and Supabase dashboard settings — that pairs with the in-app code in
`proxy.ts`, `lib/security/*`, `next.config.ts` and the `/admin/security` page.

Target request path:

```
Internet
  → Cloudflare (DNS proxied): geo firewall, managed WAF/OWASP, Bot Fight Mode,
    IP reputation, rate-limiting rules, DDoS, Turnstile
  → Vercel origin (locked: only Cloudflare IPs + x-edge-auth secret header)
  → proxy.ts: origin-auth check + geo re-check + security headers
  → route handlers: server-side validation + per-endpoint rate limits
  → Postgres (parameterised queries only)
```

Principle: **deny-by-default** for sensitive services (admin, direct origin
access, blocked regions); fast and frictionless for legitimate visitors.

---

## 0. Environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (Production
scope; use separate values for Preview/Development). See `.env.example` for the
full annotated list. Security-relevant ones:

| Var | Purpose | When to set |
| --- | --- | --- |
| `BLOCKED_COUNTRIES` | CSV ISO-3166 alpha-2, origin-side block. Default `CN`. | now |
| `GEO_IP_ALLOWLIST` | CSV of trusted IPs that bypass the block. | as needed |
| `EDGE_AUTH_SECRET` | Long random string. `proxy.ts` 403s any request without `x-edge-auth: <this>`. | **only after step 4** |
| `IP_HASH_SALT` | Long random string; salts hashed IPs in the security log. | now |
| `CSP_ENFORCE` | `1` = enforce CSP; unset = Report-Only. | after step 6 |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Turnstile challenge on admin login. | step 5 |
| `EDGE_CONFIG` / `VERCEL_API_TOKEN` / `EDGE_CONFIG_ID` / `VERCEL_TEAM_ID` | Optional: edit the geo policy from `/admin/security` with no redeploy. | optional |

Generate secrets: `openssl rand -hex 32`.

---

## 1. Cloudflare onboarding & DNS cutover

1. Create a Cloudflare account; **Add a site** → `hainautocn.com`. Choose a
   plan (Pro or above unlocks the full managed WAF + Bot Management).
2. In Cloudflare DNS, recreate the records that currently point at Vercel:
   - `CNAME  www   → cname.vercel-dns.com`  — **Proxied (orange cloud)**
   - `CNAME  @     → cname.vercel-dns.com`  (or Cloudflare flattening) — Proxied
3. At the registrar, change the nameservers to the two Cloudflare assigns.
4. In **Vercel → Domains**, keep `hainautocn.com` attached as the canonical
   host — match what `app/layout.tsx` / `sitemap.ts` use
   (`https://hainautocn.com`).
5. Wait for `dig hainautocn.com` to show Cloudflare IPs.

---

## 2. TLS / HTTPS (spec §6)

Cloudflare → **SSL/TLS**:

- Encryption mode: **Full (Strict)**.
- **Always Use HTTPS**: On.
- **Minimum TLS Version**: 1.2.
- **Automatic HTTPS Rewrites**: On.
- **HSTS**: enable — `max-age` 12 months, **Include subdomains**, **Preload**
  (only after you're sure every subdomain is HTTPS). The app also sends
  `Strict-Transport-Security` itself (`next.config.ts` / `proxy.ts`).

---

## 3. Geo firewall — block Mainland China (spec §1)

Cloudflare → **Security → WAF → Custom rules** → *Create rule*:

- **Name**: `Block Mainland China`
- **Expression** (Edit expression):
  ```
  (ip.src.country eq "CN") and not (ip.src in $trusted_cn_ips)
  ```
- **Action**: **Block**
- **With response**: custom response, status `403`, body:
  `Forbidden` (plain text — no rule details, no mention of country; spec §1).

Then create the referenced list: **Manage Account → Configurations → Lists** →
create an **IP List** named `trusted_cn_ips` (start empty). This is the
admin-editable allowlist for trusted Chinese IPs.

Notes:
- `CN` is Mainland China only. **Hong Kong (`HK`), Macau (`MO`) and Taiwan
  (`TW`) are separate country codes and are NOT affected.** To block them later,
  add them to the expression *and* to `BLOCKED_COUNTRIES`.
- To add more blocked countries later, either edit this expression or use a
  Cloudflare list of country codes; keep `BLOCKED_COUNTRIES` in Vercel in sync
  so the origin-side backstop matches.
- This rule runs for **every** request path including `/api/*`, so direct API
  calls from CN are blocked too.
- VPN/proxy traffic: add a *lower-priority* rule that issues a **Managed
  Challenge** when `cf.threat_score gt 10` or
  `ip.src.is_anonymous_proxy` — a risk signal, not a hard block (spec §1).

---

## 4. Origin lockdown (spec §13)

Goal: the Vercel origin is only reachable *through* Cloudflare, so nobody
bypasses the geo/WAF layer by hitting `*.vercel.app` or the origin IP.

1. **Cloudflare Transform Rule** (Rules → Transform Rules → Modify Request
   Header) → *Add* header `x-edge-auth` = `<EDGE_AUTH_SECRET value>` on all
   requests. Use a **secret**, not a plaintext value, if your plan supports it.
2. **Vercel → Settings → Deployment Protection**:
   - Enable **Vercel Authentication** for Preview deployments (kills public
     `*.vercel.app` preview URLs).
   - Production: add **Trusted IPs / Firewall** allowing only
     [Cloudflare's IP ranges](https://www.cloudflare.com/ips/) (Enterprise) — or,
     on lower plans, rely on the `x-edge-auth` check below.
3. **Set `EDGE_AUTH_SECRET` in Vercel** and redeploy. From now `proxy.ts`
   returns `403` for any request without the matching `x-edge-auth` header.
   Exemptions already coded: `/api/cron/*` (Vercel Cron hits the origin
   directly and carries its own `CRON_SECRET`), and the internal PDF-render
   secret.
4. **Cloudflare Authenticated Origin Pulls** (SSL/TLS → Origin Server): enable
   if the Vercel plan supports client-cert validation; otherwise the header
   check is the mechanism.
5. Verify: `curl https://<deployment>.vercel.app/` → `403`;
   `curl -H "x-edge-auth: <secret>" https://<deployment>.vercel.app/` → `200`.

> Do **not** set `EDGE_AUTH_SECRET` until the Transform Rule is live, or the
> site locks itself out. `proxy.ts` treats an unset secret as "no lockdown".

---

## 5. Managed WAF, bots, rate limiting, DDoS (spec §2)

Cloudflare → **Security**:

- **WAF → Managed rules**: deploy the **Cloudflare Managed Ruleset** and the
  **OWASP Core Ruleset**. Start OWASP at *Paranoia Level 2*, anomaly score
  threshold 40, action *Managed Challenge*; review Security Events for a week,
  then tighten to *Block*.
- **Bots**: enable **Bot Fight Mode** (or **Super Bot Fight Mode** / Bot
  Management on Pro+). Set *Definitely automated* → Block, *Likely automated* →
  Managed Challenge. Allow verified search-engine bots.
- **DDoS**: HTTP DDoS managed ruleset is on by default — leave sensitivity
  *High*.
- **IP reputation**: Security Level *Medium*+; challenge on high threat score.
- **Rate limiting rules** (Security → WAF → Rate limiting rules):

  | Path | Rate | Action |
  | --- | --- | --- |
  | `/api/admin/login` | 5 / min / IP | Block 15 min |
  | `/api/leads`, `/api/quote-requests` | 10 / min / IP | Managed Challenge |
  | `/api/quote-status` | 20 / min / IP | Managed Challenge |
  | `/api/*` (catch-all) | 120 / min / IP | Managed Challenge |
  | `/` (all) | 600 / min / IP | Managed Challenge |

  These are the outer layer; `lib/security/rate-limit.ts` is the origin-side
  backstop with an escalating cooldown.
- **Scrape protection**: enable **Browser Integrity Check**; consider
  **Hotlink Protection** for `/vehicle-images/*` and blocking known
  scraper/AI-crawler user-agents via a custom rule.

---

## 6. Turnstile (spec §4, §5)

1. Cloudflare → **Turnstile** → *Add site* → hostname `hainautocn.com`,
   widget mode *Managed*. Copy the **Site Key** and **Secret Key**.
2. Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` in Vercel,
   redeploy. The admin login form (`app/admin/login/turnstile.tsx`) then renders
   the widget and `app/api/admin/login/route.ts` enforces it server-side.
3. Local dev / any env without the keys skips the challenge automatically.

---

## 7. Content-Security-Policy rollout (spec §7)

1. Deploy with `CSP_ENFORCE` **unset** → the app sends
   `Content-Security-Policy-Report-Only`.
2. Browse the whole site (home, catalogue, vehicle detail, quote flow, admin)
   with DevTools console open; note any `Report-Only` violations.
3. Adjust the allowlist in `lib/security/csp.ts` if a legitimate resource is
   flagged. The two `'unsafe-inline'` entries are required by the Google
   Translate widget (used for automatic regional translation — see
   `lib/i18n/regions.ts`) and are documented in that file. `'unsafe-eval'` is
   not used. Exercise translation into several languages (`?lang=pt`, `?lang=fr`,
   `?lang=ar`) while checking for CSP reports.
4. When clean, set `CSP_ENFORCE=1` and redeploy.

---

## 8. Supabase Auth hardening (spec §5)

Supabase dashboard → **Authentication**:

- **MFA**: enable TOTP. Require every staff user to enrol
  (`Authentication → Policies`, or enforce in-app on next login). `isAdminUser`
  gating is in `lib/supabase/roles.ts`.
- **Sessions**: set a **JWT expiry** of 1 hour (already assumed by
  `lib/supabase/middleware.ts`) and a **refresh-token / inactivity timeout**
  (e.g. 8 h) so an abandoned session dies.
- **Passwords**: enable **leaked-password protection** (HaveIBeenPwned) and a
  **minimum length** of 12 + character classes.
- **Bot/abuse**: enable the **CAPTCHA** integration on Supabase auth endpoints
  (Turnstile — reuse the keys from step 6).
- **Rotate `SUPABASE_SERVICE_ROLE_KEY`** and confirm it exists only as a
  server-side Vercel env var. Confirm no `NEXT_PUBLIC_` var holds a secret.
- Restrict the Supabase **Data API** — the app only uses Auth; CRM data goes
  through the direct `pg` connection. Ensure RLS is on for any exposed table.

---

## 9. Production configuration checks (spec §12)

- Vercel project: **no** `NODE_ENV=development`; source maps are not emitted for
  the client (`productionBrowserSourceMaps` is unset).
- `poweredByHeader: false` is set in `next.config.ts`.
- `app/error.tsx` + `app/vehicles/error.tsx` render generic messages; route
  handlers return generic strings and `console.error` the detail (Vercel logs
  only).
- `robots.ts` disallows `/admin` and `/api/`. `sitemap.ts` lists only public
  pages.
- Move `public/HAINA_AUTO_Verificacion_Empresarial_ES.pdf` and
  `public/vehicle-images/*.zip` out of `public/` — they are now git- and
  vercel-ignored, but delete any already-deployed copies. Serve verification
  documents from an authenticated route if customers need them.
- Remove the legacy `ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET` env vars (no
  longer read).

---

## 10. Logging & monitoring (spec §10)

- `lib/security/log.ts` writes to `security_events` (IPs salted-hashed, never
  raw; no credentials/tokens). Migration:
  `supabase/migrations/202608280001_security.sql`.
- Events: `geo_blocked`, `edge_auth_failed`, `rate_limited`,
  `admin_login_failed`, `admin_login_blocked`, `admin_login_success`,
  `security_policy_changed`.
- Staff view: **`/admin/security`** — recent events + the editable geo policy.
- Cloudflare: **Security → Events** for WAF/bot/rate-limit blocks; set up a
  **Notification** for WAF-event spikes and for Origin errors.
- Consider Logpush (Cloudflare) + Vercel Log Drains to a SIEM for retention.

---

## 11. Pre-production test checklist (spec §14)

Run against a Preview/staging deployment that is already behind Cloudflare.

- [ ] `npm run build` succeeds; `npm run security:test-geo` passes.
- [ ] `npm run build && npm run security:check-secrets` → no secrets in
      `.next/static`.
- [ ] From a Mainland-China VPN: `https://hainautocn.com/` → `403`.
- [ ] Same VPN: `curl https://hainautocn.com/api/quote-status?ref=EST0001`
      → `403` (direct API blocked).
- [ ] `curl https://<deployment>.vercel.app/` (no `x-edge-auth`) → `403`.
- [ ] Add your office IP to `trusted_cn_ips` + `GEO_IP_ALLOWLIST`, retest from
      VPN with that IP → reachable. Remove afterwards.
- [ ] HK / TW / a normal country → site loads normally, no challenge for a
      plain browser.
- [ ] `curl -sI https://hainautocn.com/` shows: `strict-transport-security`,
      `content-security-policy` (or `-report-only`), `x-content-type-options: nosniff`,
      `referrer-policy`, `permissions-policy`, no `x-powered-by`.
- [ ] `POST /api/admin/login` 6× with a bad password → `429` with `Retry-After`;
      `/admin/security` shows an `admin_login_blocked` event.
- [ ] SQL-injection string in the login `email` field → `401`, no error detail,
      no stack (queries are parameterised via `pg` / Supabase).
- [ ] XSS payload in `/api/leads` `message` → stored escaped, response generic,
      rendered inert in `/admin`.
- [ ] Hammer `/api/quote-status` past 20/10 min → `429`; repeat → longer
      cooldown (escalation ladder).
- [ ] Trigger a server error on a route → generic page, real error only in
      Vercel logs.
- [ ] Automatic translation: a Venezuela-geo request renders Spanish through
      checkout; `?lang=pt` / `?lang=fr` switch cleanly; `?lang=en` reverts. CSP
      shows no new violations. (`lib/i18n/regions.ts`)
- [ ] Admin login with MFA enrolled → prompts for TOTP.
- [ ] `/admin`, `/admin/security`, `/api/admin/*` → redirect / `401` when not
      signed in.

---

## 12. Known follow-ups (not in this pass)

- **Quote references are sequential** (`EST0001`…). `/api/quote-status` is rate
  limited, but a non-guessable public token would remove the enumeration vector
  entirely (spec §11).
- **VIN verification feature** (spec §3–4) is not built. When it is, reuse
  `lib/security/rate-limit.ts`, `lib/security/turnstile.ts`,
  `lib/security/http.ts` and the `security_events` log; keep all provider
  secrets server-side and validate VIN format server-side before any lookup.
- `/api/vehicle-image` already restricts protocol + host; keep an eye on the
  `remotePatterns: hostname "**"` in `next.config.ts` if new image sources are
  added.

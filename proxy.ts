// Edge gate for the whole site. Named proxy.ts, not middleware.ts — this
// Next.js version renamed the file convention (middleware.js is deprecated);
// see node_modules/next/dist/docs/.../proxy.md. Runs on the Node.js runtime.
//
// Responsibilities, in order:
//   1. Origin-lockdown check  — reject requests that did not transit the
//      CDN/WAF (Cloudflare) when EDGE_AUTH_SECRET is configured. Defense in
//      depth for spec §13; the primary lockdown is Vercel Trusted IPs.
//   2. Geo-restriction        — deny Mainland China (configurable) with a
//      generic 403. Defense in depth for spec §1; the primary block is the
//      Cloudflare WAF geo firewall rule.
//   3. Security headers        — spec §6, §7 (CSP is also set as a constant in
//      next.config.ts; re-set here so proxy-terminal responses carry it).
//   4. Locale cookie + staff auth for /admin — pre-existing behaviour.
//
// See docs/security-hardening.md for the CDN/WAF configuration this pairs with.
import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";
import { updateSession } from "./lib/supabase/middleware";
import { isAdminUser } from "./lib/supabase/roles";
import {
  getGeoPolicy,
  resolveCountry,
  clientIp,
  ipAllowed,
  isCountryBlocked,
} from "./lib/security/geo-policy";
import { baseSecurityHeaders, allSecurityHeaders } from "./lib/security/csp";
import { logSecurityEvent } from "./lib/security/log";
import { autoTranslateLang, normalizeLangParam } from "./lib/i18n/regions";

const LOCALE_COOKIE = "haina_locale";
const YEAR_SECONDS = 31_536_000;

const PUBLIC_ADMIN_PATHS = new Set(["/admin/login", "/api/admin/login"]);

// One quote's print page, reached with no staff session by
// lib/render-quote-pdf.ts's "internal-secret" mode — the automated customer
// quote-request flow renders a PDF server-to-server, with no browsing user's
// cookie to forward.
const PRINT_PAGE_PATTERN = /^\/admin\/quotes\/[^/]+\/print$/;

// Must stay reachable without the CDN edge-auth header: Vercel Cron invokes
// deployment URLs directly (not through Cloudflare), and those routes enforce
// their own CRON_SECRET.
const EDGE_AUTH_EXEMPT_PREFIXES = ["/api/cron/"];

function hasValidInternalSecret(request: NextRequest): boolean {
  const secret = process.env.INTERNAL_PDF_SECRET;
  return Boolean(secret) && request.headers.get("x-internal-pdf-secret") === secret;
}

function isEdgeAuthenticated(request: NextRequest): boolean {
  const secret = process.env.EDGE_AUTH_SECRET;
  if (!secret) return true; // not configured yet — never lock anything out
  if (request.headers.get("x-edge-auth") === secret) return true;
  if (request.headers.get("x-vercel-cron")) return true;
  if (hasValidInternalSecret(request)) return true;
  const { pathname } = request.nextUrl;
  return EDGE_AUTH_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p));
}

function forbidden(): NextResponse {
  // Generic — no rule detail, no country echo (spec §1).
  const res = new NextResponse("Forbidden", {
    status: 403,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
  for (const [k, v] of Object.entries(baseSecurityHeaders())) res.headers.set(k, v);
  return res;
}

function decorate(response: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(allSecurityHeaders())) response.headers.set(k, v);
  return response;
}

// Persist the resolved UI language. `haina_locale` is our own signal (read by
// app/auto-translate.tsx and app/layout.tsx); `googtrans` is the cookie the
// Google Translate widget itself reads (`/<source>/<target>`) so translation is
// applied as the widget initialises rather than after a client render.
function applyLocaleCookies(response: NextResponse, lang: string, explicit: boolean) {
  const base = { path: "/", maxAge: YEAR_SECONDS, sameSite: "lax" as const };
  response.cookies.set(LOCALE_COOKIE, lang, base);
  if (lang && lang !== "en") {
    response.cookies.set("googtrans", `/en/${lang}`, base);
  } else if (explicit) {
    // Visitor explicitly asked for English — clear any prior translation.
    response.cookies.set("googtrans", "", { path: "/", maxAge: 0 });
  }
}

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;
  const country = resolveCountry(request.headers);
  const ip = clientIp(request.headers);

  // 1. Origin lockdown — the request must have transited the CDN.
  if (!isEdgeAuthenticated(request)) {
    event.waitUntil(logSecurityEvent({ type: "edge_auth_failed", ip, country, path: pathname }));
    return forbidden();
  }

  // 2. Geo-restriction (deny-by-default for blocked regions).
  const policy = await getGeoPolicy();
  if (isCountryBlocked(country, policy) && !ipAllowed(ip, policy.allowIps)) {
    event.waitUntil(logSecurityEvent({ type: "geo_blocked", ip, country, path: pathname }));
    return forbidden();
  }

  // 3. Automatic localisation. The site is authored in English; pick the target
  //    language for this visitor and persist it in cookies so the Google
  //    Translate widget (app/auto-translate.tsx) applies it on load — through
  //    the whole session, including checkout. Precedence:
  //      ?lang= override  >  existing choice (cookie)  >  visitor's country  >  English
  const langOverride = normalizeLangParam(request.nextUrl.searchParams.get("lang"));
  const rawExisting = request.cookies.get(LOCALE_COOKIE)?.value || null;
  // Normalise legacy / malformed cookie values (e.g. the old "es-VE") to a
  // supported code so `googtrans` is always well-formed.
  const existingLocale = rawExisting === "en" ? "en" : normalizeLangParam(rawExisting);
  const targetLang = langOverride || existingLocale || autoTranslateLang(country);

  const isAdminArea = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  // Only write cookies on real page navigations, and only when something
  // actually changed — a Set-Cookie on every response would defeat CDN caching
  // of routes like /api/shipment-updates.
  const isPageNav = !isAdminArea && !pathname.startsWith("/api/");
  const localeChanged = targetLang !== existingLocale || langOverride !== null;

  if (!isAdminArea) {
    const response = NextResponse.next();
    if (isPageNav && localeChanged) {
      applyLocaleCookies(response, targetLang, langOverride !== null);
    }
    return decorate(response);
  }

  if (PUBLIC_ADMIN_PATHS.has(pathname)) return decorate(NextResponse.next());

  if (PRINT_PAGE_PATTERN.test(pathname) && hasValidInternalSecret(request)) {
    return decorate(NextResponse.next());
  }

  const { response, user } = await updateSession(request);

  if (isAdminUser(user)) return decorate(response);

  if (pathname.startsWith("/api/admin")) {
    return decorate(
      NextResponse.json(
        { ok: false, error: user ? "Staff access required." : "Authentication required." },
        { status: user ? 403 : 401 }
      )
    );
  }
  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return decorate(NextResponse.redirect(loginUrl));
}

export const config = {
  // First entry: all pages except static assets / files-with-extensions.
  // Second entry: every API route (including ones with dotted path params) so
  // the geo + edge-auth gate also covers direct API access (spec §1).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)", "/api/:path*"],
};

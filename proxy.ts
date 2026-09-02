// Edge gate for the whole site. Named proxy.ts, not middleware.ts — this
// Next.js version renamed the file convention (middleware.js is deprecated);
// see node_modules/next/dist/docs/.../proxy.md. Runs on the Node.js runtime.
//
// Responsibilities, in order:
//   1. Origin-lockdown check  — reject requests that did not transit the
//      CDN/WAF (Cloudflare) when EDGE_AUTH_SECRET is configured. Defense in
//      depth for spec §13; the primary lockdown is Vercel Trusted IPs.
//   2. Security headers        — spec §6, §7 (CSP is also set as a constant in
//      next.config.ts; re-set here so proxy-terminal responses carry it).
//   3. Visitor-selected locale cookie + staff auth for /admin.
//
// See docs/security-hardening.md for the CDN/WAF configuration this pairs with.
import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";
import { updateSession } from "./lib/supabase/middleware";
import { isAdminUser } from "./lib/supabase/roles";
import { clientIp } from "./lib/security/client-ip";
import { baseSecurityHeaders, allSecurityHeaders } from "./lib/security/csp";
import { logSecurityEvent } from "./lib/security/log";
import { normalizeLangParam } from "./lib/i18n/regions";

const LOCALE_COOKIE = "haina_locale";
const EXPLICIT_LOCALE_COOKIE = "haina_locale_explicit";
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
  // Generic - no rule detail is exposed.
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

// Persist a visitor-selected UI language. The explicit marker prevents legacy
// cookies created by the retired country-based behaviour from being reused.
function applyLocaleCookies(response: NextResponse, lang: string) {
  const base = { path: "/", maxAge: YEAR_SECONDS, sameSite: "lax" as const };
  response.cookies.set(LOCALE_COOKIE, lang, base);
  response.cookies.set(EXPLICIT_LOCALE_COOKIE, "1", base);
  if (lang && lang !== "en") {
    response.cookies.set("googtrans", `/en/${lang}`, base);
  } else {
    // Visitor explicitly asked for English - clear any prior translation.
    response.cookies.set("googtrans", "", { path: "/", maxAge: 0 });
  }
}

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;
  const ip = clientIp(request.headers);

  // 1. Origin lockdown — the request must have transited the CDN.
  if (!isEdgeAuthenticated(request)) {
    event.waitUntil(logSecurityEvent({ type: "edge_auth_failed", ip, path: pathname }));
    return forbidden();
  }

  // 2. Visitor-selected localisation. Country headers are intentionally ignored;
  //    explicit ?lang= choices and a prior explicit locale cookie remain supported.
  const langOverride = normalizeLangParam(request.nextUrl.searchParams.get("lang"));
  const hasExplicitLocale = request.cookies.get(EXPLICIT_LOCALE_COOKIE)?.value === "1";
  const rawExisting = request.cookies.get(LOCALE_COOKIE)?.value || null;
  const existingLocale = hasExplicitLocale
    ? rawExisting === "en"
      ? "en"
      : normalizeLangParam(rawExisting)
    : null;
  const targetLang = langOverride || existingLocale || "en";

  const isAdminArea = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  // Only write cookies on real page navigations, and only when something
  // actually changed — a Set-Cookie on every response would defeat CDN caching
  // of routes like /api/shipment-updates.
  const isPageNav = !isAdminArea && !pathname.startsWith("/api/");
  const localeChanged = langOverride !== null;

  if (!isAdminArea) {
    const response = NextResponse.next();
    if (isPageNav && localeChanged) {
      applyLocaleCookies(response, targetLang);
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
  // the edge-auth gate also covers direct API access.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)", "/api/:path*"],
};

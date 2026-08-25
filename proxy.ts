// Gates the staff-only /admin area. Named proxy.ts, not middleware.ts — this
// Next.js version renamed the file convention (middleware.js is deprecated);
// see node_modules/next/dist/docs/.../proxy.md.
//
// Auth is Supabase Auth (per-staff accounts) via lib/supabase/middleware.ts —
// replaces an earlier single-shared-password scheme (lib/admin-auth.ts,
// removed) now that there's more than one internal audience for this panel.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/middleware";
import { isAdminUser } from "./lib/supabase/roles";

const PUBLIC_ADMIN_PATHS = new Set(["/admin/login", "/api/admin/login"]);

// One quote's print page, reached with no staff session by
// lib/render-quote-pdf.ts's "internal-secret" mode — the automated
// customer quote-request flow (app/api/quote-requests) renders a PDF
// server-to-server, with no browsing user's cookie to forward. Scoped to
// exactly this path shape (not a blanket bypass) even though the secret
// itself is never exposed to any client.
const PRINT_PAGE_PATTERN = /^\/admin\/quotes\/[^/]+\/print$/;

function hasValidInternalSecret(request: NextRequest): boolean {
  const secret = process.env.INTERNAL_PDF_SECRET;
  return Boolean(secret) && request.headers.get("x-internal-pdf-secret") === secret;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestedLocale = request.nextUrl.searchParams.get("lang")?.toLowerCase();
  const isVenezuelanVisit = request.headers.get("x-vercel-ip-country") === "VE";
  const shouldUseSpanish = requestedLocale === "es" || requestedLocale === "es-ve" || isVenezuelanVisit;

  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin")) {
    const response = NextResponse.next();
    if (shouldUseSpanish) response.cookies.set("haina_locale", "es-VE", { path: "/", maxAge: 31_536_000, sameSite: "lax" });
    return response;
  }
  if (PUBLIC_ADMIN_PATHS.has(pathname)) return NextResponse.next();

  if (PRINT_PAGE_PATTERN.test(pathname) && hasValidInternalSecret(request)) return NextResponse.next();

  const { response, user } = await updateSession(request);

  if (isAdminUser(user)) return response;

  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json(
      { ok: false, error: user ? "Staff access required." : "Authentication required." },
      { status: user ? 403 : 401 }
    );
  }
  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

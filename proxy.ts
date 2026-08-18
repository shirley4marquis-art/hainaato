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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_ADMIN_PATHS.has(pathname)) return NextResponse.next();

  const { response, user } = await updateSession(request);

  if (isAdminUser(user)) return response;

  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json({ ok: false, error: user ? "Staff access required." : "Authentication required." }, { status: user ? 403 : 401 });
  }
  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

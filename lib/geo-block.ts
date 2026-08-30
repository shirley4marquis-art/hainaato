// Region gate. The public site (and everything else) is withheld from visitors
// whose request geolocates to Asia — they get a plain 404, so the site simply
// appears not to exist rather than deliberately fenced off.
//
// Country comes from Vercel's edge header `x-vercel-ip-country` (always present
// in production; absent in local dev, where the gate fails open). Runs inside
// proxy.ts, before any other logic.
//
// Environment overrides (Vercel → Project → Settings → Environment Variables):
//   GEO_BLOCK_ENABLED       "false" disables the gate entirely.
//   GEO_BLOCKED_COUNTRIES   comma-separated ISO-3166-1 alpha-2 list; replaces
//                           the default Asia list when set.
//   GEO_BLOCK_BYPASS_TOKEN  secret. Visit any URL once with
//                           ?geo_bypass=<token> to drop a year-long cookie that
//                           skips the gate from that browser (for staff who
//                           travel to / are mis-located in a blocked country).

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const GEO_BYPASS_COOKIE = "haina_geo_bypass";

// UN M49 "Asia" region, ISO-3166-1 alpha-2. Includes mainland China, Hong Kong,
// Macau and Taiwan, plus the transcontinental states (Turkey, Cyprus, the
// Caucasus). Russia is treated as Europe and left out.
const DEFAULT_BLOCKED_COUNTRIES = [
  // East Asia
  "CN", "HK", "MO", "TW", "JP", "KP", "KR", "MN",
  // South-East Asia
  "BN", "KH", "ID", "LA", "MY", "MM", "PH", "SG", "TH", "TL", "VN",
  // South Asia
  "AF", "BD", "BT", "IN", "IR", "LK", "MV", "NP", "PK",
  // Central Asia
  "KZ", "KG", "TJ", "TM", "UZ",
  // Western Asia
  "AE", "AM", "AZ", "BH", "CY", "GE", "IL", "IQ", "JO", "KW",
  "LB", "OM", "PS", "QA", "SA", "SY", "TR", "YE",
];

let cachedRaw: string | undefined;
let cachedSet: Set<string>;

function blockedCountries(): Set<string> {
  const raw = process.env.GEO_BLOCKED_COUNTRIES;
  if (raw !== cachedRaw || !cachedSet) {
    cachedRaw = raw;
    const list =
      raw && raw.trim()
        ? raw.split(",").map((code) => code.trim().toUpperCase()).filter(Boolean)
        : DEFAULT_BLOCKED_COUNTRIES;
    cachedSet = new Set(list);
  }
  return cachedSet;
}

/**
 * Returns a response to short-circuit the request (a 404, or a redirect that
 * persists the bypass cookie), or `null` to let the request proceed.
 */
export function handleGeoBlock(request: NextRequest): NextResponse | null {
  if (process.env.GEO_BLOCK_ENABLED === "false") return null;

  const token = process.env.GEO_BLOCK_BYPASS_TOKEN;

  // One-time bypass link: ?geo_bypass=<token> → set the cookie, then bounce to
  // the clean URL so the secret never lingers in history or referrers.
  if (token && request.nextUrl.searchParams.get("geo_bypass") === token) {
    const clean = request.nextUrl.clone();
    clean.searchParams.delete("geo_bypass");
    const res = NextResponse.redirect(clean, 307);
    res.cookies.set(GEO_BYPASS_COOKIE, token, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: true,
      sameSite: "lax",
      secure: true,
    });
    return res;
  }

  if (token && request.cookies.get(GEO_BYPASS_COOKIE)?.value === token) return null;

  const country = (request.headers.get("x-vercel-ip-country") || "").toUpperCase();
  if (!country || !blockedCountries().has(country)) return null;

  // Appear not to exist. Rewrite to a path no route matches so Next renders its
  // stock not-found page with a 404 status — identical to any dead URL.
  return NextResponse.rewrite(new URL("/_geo-unavailable", request.url));
}

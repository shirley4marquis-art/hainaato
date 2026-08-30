// Geo-restriction policy resolution for proxy.ts.
//
// The PRIMARY enforcement of the Mainland-China block lives at Cloudflare (WAF
// geo firewall rule — see docs/security-hardening.md). This module is the
// in-application defense-in-depth layer: it re-checks the request country at
// the Vercel origin so a request that somehow reaches the origin directly is
// still denied.
//
// Policy sources, in priority order:
//   1. Vercel Edge Config item `geoPolicy` (runtime-editable with no redeploy),
//      read over the Edge Config HTTP API when the `EDGE_CONFIG` connection
//      string is present. Shape: { blockedCountries: string[], allowIps: string[] }.
//   2. Environment variables `BLOCKED_COUNTRIES` and `GEO_IP_ALLOWLIST` (CSV).
//   3. Built-in default: block `CN` only.
//
// Hong Kong (HK), Macau (MO) and Taiwan (TW) are distinct ISO-3166 codes and
// are NOT covered by a `CN` block — they are only ever blocked if an admin
// explicitly adds them.

export type GeoPolicy = {
  blockedCountries: string[];
  allowIps: string[];
};

const DEFAULT_BLOCKED = ["CN"];
const CACHE_TTL_MS = 30_000;

let cache: { value: GeoPolicy; expires: number } | null = null;
let inFlight: Promise<GeoPolicy> | null = null;

function parseCsv(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeCountries(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((c): c is string => typeof c === "string")
    .map((c) => c.trim().toUpperCase())
    .filter((c) => /^[A-Z]{2}$/.test(c));
}

function policyFromEnv(): GeoPolicy {
  const blocked = parseCsv(process.env.BLOCKED_COUNTRIES).map((c) => c.toUpperCase());
  return {
    blockedCountries: (blocked.length ? blocked : DEFAULT_BLOCKED).filter((c) => /^[A-Z]{2}$/.test(c)),
    allowIps: parseCsv(process.env.GEO_IP_ALLOWLIST),
  };
}

async function policyFromEdgeConfig(): Promise<GeoPolicy | null> {
  const connection = process.env.EDGE_CONFIG;
  if (!connection) return null;
  // EDGE_CONFIG looks like https://edge-config.vercel.com/ecfg_xxx?token=yyy
  let url: URL;
  try {
    const base = new URL(connection);
    url = new URL(`${base.origin}${base.pathname.replace(/\/$/, "")}/item/geoPolicy`);
    url.search = base.search;
  } catch {
    return null;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 800);
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    clearTimeout(timer);
    if (!res.ok) return null;
    const item = (await res.json()) as { blockedCountries?: unknown; allowIps?: unknown } | null;
    if (!item || typeof item !== "object") return null;
    const blockedCountries = normalizeCountries(item.blockedCountries);
    const allowIps = Array.isArray(item.allowIps)
      ? item.allowIps.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean)
      : [];
    return { blockedCountries, allowIps };
  } catch {
    return null;
  }
}

export async function getGeoPolicy(): Promise<GeoPolicy> {
  const now = Date.now();
  if (cache && cache.expires > now) return cache.value;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const envPolicy = policyFromEnv();
    const edgePolicy = await policyFromEdgeConfig();
    const value: GeoPolicy = edgePolicy
      ? {
          blockedCountries: edgePolicy.blockedCountries.length ? edgePolicy.blockedCountries : envPolicy.blockedCountries,
          allowIps: edgePolicy.allowIps.length ? edgePolicy.allowIps : envPolicy.allowIps,
        }
      : envPolicy;
    cache = { value, expires: Date.now() + CACHE_TTL_MS };
    return value;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

// Best-effort synchronous view for callers that cannot await (falls back to env
// defaults before the first async resolution has populated the cache).
export function getGeoPolicySyncHint(): GeoPolicy {
  return cache?.value ?? policyFromEnv();
}

/** Country code for the request. Prefers Cloudflare's header, then Vercel's. */
export function resolveCountry(headers: Headers): string | null {
  const cf = headers.get("cf-ipcountry");
  if (cf && cf !== "XX" && cf !== "T1") return cf.toUpperCase();
  const vercel = headers.get("x-vercel-ip-country");
  if (vercel) return vercel.toUpperCase();
  return null;
}

/** Best-guess client IP from the standard proxy headers. */
export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip") || headers.get("cf-connecting-ip") || null;
}

/** Simple exact / CIDR-free membership check for the trusted-IP allowlist. */
export function ipAllowed(ip: string | null, allowIps: string[]): boolean {
  if (!ip || allowIps.length === 0) return false;
  return allowIps.includes(ip);
}

export function isCountryBlocked(country: string | null, policy: GeoPolicy): boolean {
  if (!country) return false;
  return policy.blockedCountries.includes(country.toUpperCase());
}

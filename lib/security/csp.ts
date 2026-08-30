// Content-Security-Policy + security headers — spec §6, §7.
//
// This site is fully statically rendered (vehicle catalogue, ISR, edge cache).
// A nonce-based CSP would force every page to dynamic rendering (see
// node_modules/next/dist/docs/.../content-security-policy.md), so a static,
// hash-free policy is used and set as a constant header in next.config.ts.
//
// The two `'unsafe-inline'` relaxations are BOTH required by the Google
// Translate widget (app/auto-translate.tsx), which injects inline <script> and
// inline styles that cannot be nonced or hashed. `'unsafe-eval'` is NOT enabled.
// Everything else is locked down: default-src 'self', object-src 'none',
// frame-ancestors 'none', base-uri 'self', form-action 'self'.
//
// Served as Content-Security-Policy-Report-Only until CSP_ENFORCE=1 so the
// policy can be validated against the real page before it starts blocking.

const CSP_DIRECTIVES: Record<string, string[]> = {
  "default-src": ["'self'"],
  "script-src": [
    "'self'",
    "'unsafe-inline'", // Google Translate widget
    "https://translate.google.com",
    "https://translate.googleapis.com",
    "https://www.google.com",
    "https://www.gstatic.com",
    "https://challenges.cloudflare.com",
  ],
  "style-src": ["'self'", "'unsafe-inline'", "https://www.gstatic.com", "https://fonts.googleapis.com"],
  "img-src": ["'self'", "data:", "blob:", "https:"],
  "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
  "connect-src": [
    "'self'",
    "https://*.supabase.co",
    "https://translate.googleapis.com",
    "https://translate-pa.googleapis.com",
    "https://challenges.cloudflare.com",
  ],
  "frame-src": [
    "'self'",
    "https://translate.google.com",
    "https://www.google.com",
    "https://challenges.cloudflare.com",
  ],
  "worker-src": ["'self'", "blob:"],
  "frame-ancestors": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "object-src": ["'none'"],
  "manifest-src": ["'self'"],
};

export function buildCsp(): string {
  const parts = Object.entries(CSP_DIRECTIVES).map(([key, values]) => `${key} ${values.join(" ")}`);
  parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}

export function cspHeaderName(): "Content-Security-Policy" | "Content-Security-Policy-Report-Only" {
  return process.env.CSP_ENFORCE === "1" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";
}

/**
 * Security response headers with no per-request component. Also declared in
 * next.config.ts `headers()` so they cover static assets; set again on
 * proxy-generated responses (403 / redirect / JSON) so those carry them too.
 */
export function baseSecurityHeaders(): Record<string, string> {
  return {
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Cross-Origin-Opener-Policy": "same-origin",
    "X-DNS-Prefetch-Control": "off",
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=()",
  };
}

/** All security headers including CSP — for proxy-terminal responses. */
export function allSecurityHeaders(): Record<string, string> {
  return { ...baseSecurityHeaders(), [cspHeaderName()]: buildCsp() };
}

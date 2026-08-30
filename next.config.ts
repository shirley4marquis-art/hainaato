import type { NextConfig } from "next";
import { buildCsp, cspHeaderName } from "./lib/security/csp";

// Security headers (spec §6, §7) applied to every response, including static
// assets that proxy.ts does not run for. proxy.ts re-sets the same headers on
// the responses it generates itself (403 / redirect / admin JSON). The CSP is a
// static, nonce-free policy on purpose — a nonce would force every page to
// dynamic rendering (see node_modules/next/dist/docs/.../content-security-policy.md).
// It ships as Report-Only until CSP_ENFORCE=1.
const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=()",
  },
  { key: cspHeaderName(), value: buildCsp() },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework (spec §12).
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  // Vercel's Image Optimization is metered and this account has exceeded its
  // quota (every /_next/image request was returning 402
  // OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED). Rather than giving up
  // responsive resizing entirely (unoptimized:true), this points next/image
  // at a custom loader (lib/image-loader.ts) that requests sized/compressed
  // variants from our own /api/vehicle-image proxy — real resizing via
  // sharp, with no dependency on Vercel's billed pipeline.
  images: {
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // Vehicle details are served from data/vehicle-details.json. Keep the retired
  // per-vehicle scrape archive and raw source dump out of production traces.
  outputFileTracingExcludes: {
    "/*": ["./data/vehicles/**/*", "./Auto-Shop/**/*"],
  },
};

export default nextConfig;

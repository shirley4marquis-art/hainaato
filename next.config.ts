import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel's Image Optimization is metered and this account has exceeded its
  // quota (every /_next/image request returns 402
  // OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED, which is why photos showed as
  // "Image unavailable" in production despite the upstream proxy working
  // fine). unoptimized skips that pipeline entirely — every vehicle photo
  // already goes through /api/vehicle-image, which validates the file
  // against the vehicle's own image list and sets its own long-lived
  // Cache-Control, so this only gives up Next's automatic responsive
  // resizing, not caching or correctness.
  images: { unoptimized: true, remotePatterns: [{ protocol: "https", hostname: "**" }] },
  // Vehicle details are served from data/vehicle-details.json. Keep the retired
  // per-vehicle scrape archive and raw source dump out of production traces.
  outputFileTracingExcludes: {
    "/*": ["./data/vehicles/**/*", "./Auto-Shop/**/*"],
  },
};

export default nextConfig;

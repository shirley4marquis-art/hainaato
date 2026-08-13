import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

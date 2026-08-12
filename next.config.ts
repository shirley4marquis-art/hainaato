import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  // Vehicle details are served from data/vehicle-details.json. Keep the retired
  // per-vehicle scrape archive and raw source dump out of production traces.
  outputFileTracingExcludes: {
    "/*": ["./data/vehicles/**/*", "./Auto-Shop/**/*"],
  },
};

export default nextConfig;

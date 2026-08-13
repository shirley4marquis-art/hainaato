"use client";

// Restores next/image's normal responsive srcset behavior without Vercel's
// metered Image Optimization API (this account is over its quota — see
// next.config.ts). Points every requested width/quality back at our own
// /api/vehicle-image proxy, which does the actual resizing with sharp.
// Local static assets under public/ (wechat QR, inspection photos, etc.) also
// route through here since the loader is global — the w/q query params are
// simply ignored by Next's static file server for those, so they still load
// correctly, just without responsive resizing.
export default function vehicleImageLoader({ src, width, quality }: { src: string; width: number; quality?: number }): string {
  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}w=${width}&q=${quality ?? 75}`;
}

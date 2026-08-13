import { NextRequest, NextResponse } from "next/server";
import https from "node:https";
import type { IncomingMessage } from "node:http";
import type { LookupAddress } from "node:dns";
import sharp from "sharp";
import { getVehicleBySlug } from "../../../../../../lib/vehicle-details";
import type { VehicleSite } from "../../../../../../lib/format";

// Mirrors the range Next's own optimizer would normally clamp to, so a
// crafted ?w= can't force an absurd upscale/allocation.
const MIN_WIDTH = 16;
const MAX_WIDTH = 3840;

const UPSTREAM: Record<VehicleSite, (file: string) => string> = {
  hainaauto: (file) => `https://img.hainaauto.com/vehicle/${encodeURIComponent(file)}`,
  cntransit: (file) => `https://cntransit.cn/uploads/${encodeURIComponent(file)}`,
};

function isVehicleSite(value: string): value is VehicleSite {
  return value === "hainaauto" || value === "cntransit";
}

// Some networks fail to resolve a given upstream host through their default
// resolver even though the domain is live — DNS-over-HTTPS is used as a
// fallback path so the proxy still finds it, with the resolved IP cached
// in memory for a few minutes to avoid a lookup on every image request.
const dohIpCache = new Map<string, { ip: string; expires: number }>();
const DOH_CACHE_MS = 10 * 60 * 1000;

async function resolveViaDoH(hostname: string): Promise<string | null> {
  const cached = dohIpCache.get(hostname);
  if (cached && cached.expires > Date.now()) return cached.ip;

  for (const endpoint of [
    `https://dns.google/resolve?name=${hostname}&type=A`,
    `https://cloudflare-dns.com/dns-query?name=${hostname}&type=A`,
  ]) {
    try {
      const res = await fetch(endpoint, { headers: { accept: "application/dns-json" } });
      if (!res.ok) continue;
      const data = (await res.json()) as { Answer?: { type: number; data: string }[] };
      const ip = data.Answer?.find((record) => record.type === 1)?.data;
      if (ip) {
        dohIpCache.set(hostname, { ip, expires: Date.now() + DOH_CACHE_MS });
        return ip;
      }
    } catch {
      // try the next resolver
    }
  }
  return null;
}

type UpstreamResponse = { status: number; contentType: string | null; contentLength: string | null; body: IncomingMessage };

function requestUpstream(urlStr: string, resolvedIp: string | null, timeoutMs: number): Promise<UpstreamResponse> {
  const url = new URL(urlStr);
  // `lookup` must be a top-level request option (net/http honor it via
  // net.connect), not an Agent constructor option — the Agent silently
  // ignores it. Node also probes with `options.all: true` in some paths,
  // which expects an array-shaped callback instead of a single address.
  const lookup = resolvedIp
    ? (_hostname: string, options: { all?: boolean }, callback: (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void) =>
        options?.all ? callback(null, [{ address: resolvedIp, family: 4 }]) : callback(null, resolvedIp, 4)
    : undefined;

  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname: url.hostname, path: url.pathname + url.search, lookup, headers: { "user-agent": "Mozilla/5.0" } } as https.RequestOptions,
      (res) => resolve({
        status: res.statusCode ?? 502,
        contentType: res.headers["content-type"] ?? null,
        // Forwarded so responses declare a Content-Length instead of streaming
        // chunked with no known size — some feed/crawler clients (plausibly
        // including Meta's catalog image fetcher) treat a missing
        // Content-Length as an incomplete or untrustworthy response.
        contentLength: res.headers["content-length"] ?? null,
        body: res,
      })
    );
    const timer = setTimeout(() => req.destroy(new Error("Upstream request timed out")), timeoutMs);
    req.on("response", () => clearTimeout(timer));
    req.on("error", (error) => { clearTimeout(timer); reject(error); });
    req.end();
  });
}

async function fetchUpstreamWithFallback(urlStr: string, hostname: string): Promise<UpstreamResponse> {
  // Once a host's default resolution has failed once, skip straight to the
  // cached DoH IP instead of re-paying the failed-lookup timeout every time.
  const cached = dohIpCache.get(hostname);
  if (cached && cached.expires > Date.now()) {
    return requestUpstream(urlStr, cached.ip, 8000);
  }
  try {
    return await requestUpstream(urlStr, null, 4000);
  } catch {
    const ip = await resolveViaDoH(hostname);
    if (!ip) throw new Error(`Could not resolve ${hostname}`);
    return requestUpstream(urlStr, ip, 8000);
  }
}

function nodeStreamToWeb(nodeStream: IncomingMessage): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk) => controller.enqueue(chunk));
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", (error) => controller.error(error));
    },
    cancel() {
      nodeStream.destroy();
    },
  });
}

function bufferStream(nodeStream: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    nodeStream.on("data", (chunk) => chunks.push(chunk));
    nodeStream.on("end", () => resolve(Buffer.concat(chunks)));
    nodeStream.on("error", reject);
  });
}

function parseWidth(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, n)));
}

function parseQuality(raw: string | null): number {
  const n = raw ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return 75;
  return Math.round(Math.min(100, Math.max(1, n)));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ site: string; id: string; file: string }> }
) {
  const { site, id, file } = await params;
  // Only present when next/image's custom loader (lib/image-loader.ts) built
  // this URL — direct/unparameterized requests (the Meta catalog feed, a
  // browser navigating straight to the URL, etc.) always get the original
  // full-size file untouched.
  const width = parseWidth(request.nextUrl.searchParams.get("w"));
  const quality = parseQuality(request.nextUrl.searchParams.get("q"));

  if (!isVehicleSite(site)) {
    return NextResponse.json({ error: "Unknown site." }, { status: 404 });
  }

  // Route params come pre-decoded by Next.js; matched against the vehicle's own
  // image list exactly as stored, so a filename that belongs to a different
  // vehicle (or doesn't exist at all) is rejected before it ever reaches the CDN.
  const vehicle = getVehicleBySlug(`${site}-${id}`);
  if (!vehicle || !vehicle.images.includes(file)) {
    return NextResponse.json({ error: "Image not found for this vehicle." }, { status: 404 });
  }

  // Proxied rather than redirected: Next's built-in Image Optimizer fetches
  // "local" (relative) src URLs itself and rejects a redirect response as an
  // invalid internal response, so this has to return the image bytes directly.
  const upstreamUrl = UPSTREAM[site](file);
  const hostname = new URL(upstreamUrl).hostname;
  let upstream: UpstreamResponse;
  try {
    upstream = await fetchUpstreamWithFallback(upstreamUrl, hostname);
  } catch {
    return NextResponse.json({ error: "Could not reach the image source." }, { status: 502 });
  }
  if (upstream.status < 200 || upstream.status >= 300) {
    upstream.body.resume();
    return NextResponse.json({ error: "Image source returned an error." }, { status: 502 });
  }

  if (width != null) {
    let resized: Buffer;
    try {
      const original = await bufferStream(upstream.body);
      resized = await sharp(original)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality })
        .toBuffer();
    } catch {
      // Corrupt/unrecognized source image — fall through to a 502 rather
      // than serving something sharp couldn't actually process.
      return NextResponse.json({ error: "Could not process the source image." }, { status: 502 });
    }
    return new NextResponse(new Uint8Array(resized), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(resized.length),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  return new NextResponse(nodeStreamToWeb(upstream.body), {
    status: 200,
    headers: {
      "Content-Type": upstream.contentType || "application/octet-stream",
      ...(upstream.contentLength ? { "Content-Length": upstream.contentLength } : {}),
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}

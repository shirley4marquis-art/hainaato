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

type ProxiedVehicleSite = Exclude<VehicleSite, "hongyu" | "madeinchina" | "carfromjapan">;

const UPSTREAM: Record<ProxiedVehicleSite, (file: string) => string> = {
  hainaauto: (file) => `https://img.hainaauto.com/vehicle/${encodeURIComponent(file)}`,
  cntransit: (file) => `https://cntransit.cn/uploads/${encodeURIComponent(file)}`,
  hendrick: (file) => Buffer.from(file, "base64url").toString("utf8"),
};

const HENDRICK_IMAGE_HOSTS = new Set([
  "portphotos.setoyota.com",
  "delivery.via.assetscs.toyota.com",
  "delivery.vcr.assetscs.toyota.com",
  "media.rti.toyota.com",
]);

function isVehicleSite(value: string): value is ProxiedVehicleSite {
  return value === "hainaauto" || value === "cntransit" || value === "hendrick";
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
      const res = await fetch(endpoint, { headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(1500) });
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
    req.on("response", (res) => {
      res.on("end", () => clearTimeout(timer));
      res.on("close", () => clearTimeout(timer));
    });
    req.on("error", (error) => { clearTimeout(timer); reject(error); });
    req.end();
  });
}

async function fetchUpstreamWithFallback(urlStr: string, hostname: string): Promise<UpstreamResponse> {
  // Once a host's default resolution has failed once, skip straight to the
  // cached DoH IP instead of re-paying the failed-lookup timeout every time.
  const cached = dohIpCache.get(hostname);
  if (cached && cached.expires > Date.now()) {
    try { return await requestUpstream(urlStr, cached.ip, 4000); }
    catch { dohIpCache.delete(hostname); }
  }
  try {
    return await requestUpstream(urlStr, null, 4000);
  } catch {
    const ip = await resolveViaDoH(hostname);
    if (!ip) throw new Error(`Could not resolve ${hostname}`);
    return requestUpstream(urlStr, ip, 4000);
  }
}

function bufferStream(nodeStream: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    nodeStream.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > 10 * 1024 * 1024) nodeStream.destroy(new Error("Image exceeds size limit"));
      else chunks.push(chunk);
    });
    nodeStream.on("end", () => resolve(Buffer.concat(chunks)));
    nodeStream.on("error", reject);
    nodeStream.on("aborted", () => reject(new Error("Incomplete source image")));
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
  let parsedUpstream: URL;
  try {
    parsedUpstream = new URL(upstreamUrl);
  } catch {
    return NextResponse.json({ error: "Invalid image source." }, { status: 404 });
  }
  if (parsedUpstream.protocol !== "https:" || (site === "hendrick" && !HENDRICK_IMAGE_HOSTS.has(parsedUpstream.hostname))) {
    return NextResponse.json({ error: "Image source is not allowed." }, { status: 404 });
  }
  const hostname = parsedUpstream.hostname;
  let original: Buffer | undefined;
  let contentType: string | null = null;
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const upstream = await fetchUpstreamWithFallback(upstreamUrl, hostname);
        if (upstream.status < 200 || upstream.status >= 300) {
          upstream.body.destroy();
          if (upstream.status !== 408 && upstream.status !== 429 && upstream.status < 500) break;
          throw new Error("Upstream HTTP " + upstream.status);
        }
        original = await bufferStream(upstream.body);
        await sharp(original).metadata();
        contentType = upstream.contentType;
        break;
      } catch (error) {
        original = undefined;
        if (attempt === 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 250));
      }
    }
  } catch {
    console.warn("[vehicle-image] source unavailable", { site, id });
  }
  if (!original) {
    return NextResponse.json({ error: "Image source is temporarily unavailable." }, { status: 502, headers: { "Cache-Control": "no-store", "Retry-After": "5" } });
  }

  if (width != null) {
    let resized: Buffer;
    try {

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

  return new NextResponse(new Uint8Array(original), {
    status: 200,
    headers: {
      "Content-Type": contentType || "application/octet-stream",
      "Content-Length": String(original.length),
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}

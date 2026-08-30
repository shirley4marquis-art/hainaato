// Shared request-guard helpers for public API route handlers (spec §4, §8).
import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit } from "./rate-limit";
import { logSecurityEvent } from "./log";
import { clientIp, resolveCountry } from "./geo-policy";

export type GuardOptions = {
  /** Stable name for the limiter bucket, e.g. "leads". */
  name: string;
  limit: number;
  windowSec: number;
};

/**
 * Per-IP rate limit for a public endpoint. Returns a ready-to-send 429
 * NextResponse when the caller is over the limit, or null to proceed.
 */
export async function guardRequest(request: NextRequest, opts: GuardOptions): Promise<NextResponse | null> {
  const ip = clientIp(request.headers);
  const country = resolveCountry(request.headers);
  const key = `api:${opts.name}:ip:${ip ?? "unknown"}`;
  const result = await checkRateLimit({ key, limit: opts.limit, windowSec: opts.windowSec });
  if (result.ok) return null;

  await logSecurityEvent({
    type: "rate_limited",
    ip,
    country,
    path: request.nextUrl.pathname,
    detail: { bucket: opts.name, retryAfter: result.retryAfter, blocked: result.blocked },
  });
  return NextResponse.json(
    { ok: false, error: "Too many requests. Please slow down and try again shortly." },
    { status: 429, headers: { "Retry-After": String(Math.max(1, result.retryAfter)) } }
  );
}

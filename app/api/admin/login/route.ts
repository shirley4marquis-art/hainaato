import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { isAdminUser } from "../../../../lib/supabase/roles";
import { checkRateLimit, resetRateLimit } from "../../../../lib/security/rate-limit";
import { verifyTurnstile, turnstileConfigured } from "../../../../lib/security/turnstile";
import { logSecurityEvent } from "../../../../lib/security/log";
import { clientIp, resolveCountry } from "../../../../lib/security/geo-policy";

// Brute-force protection (spec §5): per-IP and per-email fixed windows with an
// escalating cooldown, plus a Turnstile challenge when configured. Cloudflare's
// rate-limiting rule on this path is the first line; this is the origin-side
// backstop and the source of the admin security log.
const IP_LIMIT = { limit: 5, windowSec: 15 * 60 };
const EMAIL_LIMIT = { limit: 10, windowSec: 60 * 60 };

function generic(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request.headers);
  const country = resolveCountry(request.headers);
  const ipKey = `admin-login:ip:${ip ?? "unknown"}`;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return generic(400, "Invalid request.");
  }
  const b = body as Record<string, unknown>;
  const email = typeof b?.email === "string" ? b.email.trim().toLowerCase().slice(0, 320) : "";
  const password = typeof b?.password === "string" ? b.password : "";
  const turnstileToken = typeof b?.turnstileToken === "string" ? b.turnstileToken : "";

  if (!email || !password) {
    return generic(400, "Email and password are required.");
  }
  if (password.length > 1024) {
    return generic(400, "Invalid request.");
  }

  const emailKey = `admin-login:email:${email}`;

  // 1. Rate-limit gate (before any auth work).
  const ipCheck = await checkRateLimit({ key: ipKey, ...IP_LIMIT });
  const emailCheck = await checkRateLimit({ key: emailKey, ...EMAIL_LIMIT });
  if (!ipCheck.ok || !emailCheck.ok) {
    const retryAfter = Math.max(ipCheck.retryAfter, emailCheck.retryAfter);
    await logSecurityEvent({
      type: "admin_login_blocked",
      ip,
      country,
      path: "/api/admin/login",
      detail: { email, retryAfter },
    });
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.max(1, retryAfter)) } }
    );
  }

  // 2. Turnstile (only enforced when configured).
  if (turnstileConfigured()) {
    const ts = await verifyTurnstile(turnstileToken, ip);
    if (!ts.ok) {
      await logSecurityEvent({
        type: "admin_login_failed",
        ip,
        country,
        path: "/api/admin/login",
        detail: { email, reason: "turnstile", codes: ts.errorCodes },
      });
      return generic(400, "Verification failed. Please try again.");
    }
  }

  // 3. Credential check.
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    await logSecurityEvent({
      type: "admin_login_failed",
      ip,
      country,
      path: "/api/admin/login",
      detail: { email, reason: "bad_credentials" },
    });
    return generic(401, "Incorrect email or password.");
  }
  if (!isAdminUser(data.user)) {
    await supabase.auth.signOut();
    await logSecurityEvent({
      type: "admin_login_failed",
      ip,
      country,
      path: "/api/admin/login",
      detail: { email, reason: "not_staff" },
    });
    return generic(403, "This account does not have staff access.");
  }

  // 4. Success — clear the cooldowns and log.
  await Promise.all([resetRateLimit(ipKey), resetRateLimit(emailKey)]);
  await logSecurityEvent({
    type: "admin_login_success",
    ip,
    country,
    path: "/api/admin/login",
    detail: { email, mfa: Boolean(data.user?.factors?.length) },
  });
  return NextResponse.json({ ok: true });
}

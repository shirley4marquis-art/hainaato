// Cloudflare Turnstile server-side verification — spec §4, §5.
//
// The widget is only rendered client-side when NEXT_PUBLIC_TURNSTILE_SITE_KEY is
// set, and verification here is only enforced when TURNSTILE_SECRET_KEY is set —
// so local development and any environment without Turnstile configured is
// unaffected (verification is skipped, returning ok).

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileResult = {
  /** True when verification passed OR Turnstile is not configured. */
  ok: boolean;
  /** True only when Turnstile is configured and the token was rejected. */
  rejected: boolean;
  errorCodes?: string[];
};

export function turnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

export async function verifyTurnstile(token: string | null | undefined, remoteIp?: string | null): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true, rejected: false };
  if (!token || typeof token !== "string" || token.length > 4096) {
    return { ok: false, rejected: true, errorCodes: ["missing-input-response"] };
  }

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.set("remoteip", remoteIp);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      // Cloudflare itself is unreachable — fail closed for admin login, but the
      // caller decides. Report as rejected so a strict caller blocks.
      return { ok: false, rejected: true, errorCodes: ["verify-endpoint-unavailable"] };
    }
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (data.success) return { ok: true, rejected: false };
    return { ok: false, rejected: true, errorCodes: data["error-codes"] };
  } catch (error) {
    console.error("[turnstile] verification error:", error instanceof Error ? error.message : error);
    return { ok: false, rejected: true, errorCodes: ["verify-exception"] };
  }
}

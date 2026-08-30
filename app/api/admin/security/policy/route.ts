import { NextRequest, NextResponse } from "next/server";
import { getGeoPolicy, clientIp, resolveCountry } from "../../../../../lib/security/geo-policy";
import { logSecurityEvent } from "../../../../../lib/security/log";

// Reads / updates the geo-restriction policy (blocked countries + trusted-IP
// allowlist). This route sits behind the /api/admin auth gate in proxy.ts.
//
// Canonical enforcement is the Cloudflare WAF geo rule (docs/security-hardening.md).
// This endpoint edits the in-app defense-in-depth policy: it writes the
// `geoPolicy` item to Vercel Edge Config when VERCEL_API_TOKEN + EDGE_CONFIG_ID
// are configured (no redeploy needed); otherwise the policy is env-var-managed
// and this route reports it as read-only.

export const dynamic = "force-dynamic";

type PolicyBody = { blockedCountries?: unknown; allowIps?: unknown };

function cleanCountries(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return Array.from(
    new Set(
      v
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim().toUpperCase())
        .filter((x) => /^[A-Z]{2}$/.test(x))
    )
  );
}

function cleanIps(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return Array.from(
    new Set(
      v
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim())
        .filter((x) => x.length > 0 && x.length <= 45 && /^[0-9a-fA-F.:]+$/.test(x))
    )
  ).slice(0, 200);
}

export async function GET() {
  const policy = await getGeoPolicy();
  const editable = Boolean(process.env.VERCEL_API_TOKEN && process.env.EDGE_CONFIG_ID);
  return NextResponse.json({ ok: true, policy, editable });
}

export async function PUT(request: NextRequest) {
  const token = process.env.VERCEL_API_TOKEN;
  const edgeConfigId = process.env.EDGE_CONFIG_ID;
  if (!token || !edgeConfigId) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Policy is managed via environment variables (BLOCKED_COUNTRIES / GEO_IP_ALLOWLIST). Configure VERCEL_API_TOKEN + EDGE_CONFIG_ID to edit it here.",
      },
      { status: 409 }
    );
  }

  let body: PolicyBody;
  try {
    body = (await request.json()) as PolicyBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const blockedCountries = cleanCountries(body.blockedCountries);
  const allowIps = cleanIps(body.allowIps);
  if (blockedCountries.length === 0) {
    return NextResponse.json({ ok: false, error: "At least one blocked country is required." }, { status: 400 });
  }

  const teamPart = process.env.VERCEL_TEAM_ID ? `?teamId=${encodeURIComponent(process.env.VERCEL_TEAM_ID)}` : "";
  const res = await fetch(`https://api.vercel.com/v1/edge-config/${edgeConfigId}/items${teamPart}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      items: [{ operation: "upsert", key: "geoPolicy", value: { blockedCountries, allowIps } }],
    }),
  });

  if (!res.ok) {
    console.error("[admin/security/policy] Edge Config update failed:", res.status, await res.text().catch(() => ""));
    return NextResponse.json({ ok: false, error: "Could not save the policy. Check the deployment configuration." }, { status: 502 });
  }

  await logSecurityEvent({
    type: "security_policy_changed",
    ip: clientIp(request.headers),
    country: resolveCountry(request.headers),
    path: "/api/admin/security/policy",
    detail: { blockedCountries, allowIpCount: allowIps.length },
  });

  return NextResponse.json({ ok: true, policy: { blockedCountries, allowIps } });
}

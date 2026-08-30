import { NextRequest, NextResponse } from "next/server";
import { getQuoteStatus } from "../../../lib/crm";
import { guardRequest } from "../../../lib/security/http";

// Quote refs are short and sequential (EST0001, EST0002, …), so this lookup is
// an enumeration target. A tight per-IP limit blunts scraping here; Cloudflare's
// rate-limiting rule is the outer layer. (A non-sequential public reference is
// the deeper fix — tracked separately.)
export async function GET(request: NextRequest) {
  const limited = await guardRequest(request, { name: "quote-status", limit: 20, windowSec: 10 * 60 });
  if (limited) return limited;

  const ref = (request.nextUrl.searchParams.get("ref") || "").trim().toUpperCase();
  if (!ref || ref.length > 32 || !/^[A-Z0-9-]+$/.test(ref)) {
    return NextResponse.json({ ok: false, error: "Enter a valid quote reference." }, { status: 400 });
  }

  let result;
  try {
    result = await getQuoteStatus(ref);
  } catch (error) {
    console.error("[quote-status] CRM lookup failed:", error);
    return NextResponse.json({ ok: false, error: "Status lookup is temporarily unavailable. Please try again shortly." }, { status: 502 });
  }

  if (!result) {
    return NextResponse.json({ ok: false, error: "No request found for that reference. Double-check the code we sent you." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, quote: result });
}

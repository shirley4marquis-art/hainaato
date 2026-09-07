import { NextRequest, NextResponse } from "next/server";
import { getQuoteStatus } from "../../../lib/crm";
import { guardRequest } from "../../../lib/security/http";
import { verifyQuoteAccessToken } from "../../../lib/quote-access";

// A reference identifies the quote; only its signed link authorizes access.
export async function GET(request: NextRequest) {
  const limited = await guardRequest(request, { name: "quote-status", limit: 20, windowSec: 10 * 60 });
  if (limited) return limited;

  const ref = (request.nextUrl.searchParams.get("ref") || "").trim().toUpperCase();
  if (!ref || ref.length > 32 || !/^[A-Z0-9-]+$/.test(ref)) {
    return NextResponse.json({ ok: false, error: "Enter a valid quote reference." }, { status: 400 });
  }
  if (!verifyQuoteAccessToken(ref, request.nextUrl.searchParams.get("token") || "")) {
    return NextResponse.json({ ok: false, error: "Use the secure quotation link provided after submission." }, { status: 403 });
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

  return NextResponse.json({ ok: true, quote: result }, { headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
}

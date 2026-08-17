import { NextRequest, NextResponse } from "next/server";
import { getQuoteStatus } from "../../../lib/crm";

export async function GET(request: NextRequest) {
  const ref = (request.nextUrl.searchParams.get("ref") || "").trim().toUpperCase();
  if (!ref) {
    return NextResponse.json({ ok: false, error: "Enter a quote reference." }, { status: 400 });
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

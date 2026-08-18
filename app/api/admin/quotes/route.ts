import { NextRequest, NextResponse } from "next/server";
import { adminListQuotes, adminSaveQuote, type AdminQuoteInput } from "../../../../lib/crm";

export async function GET() {
  try {
    const quotes = await adminListQuotes();
    return NextResponse.json({ ok: true, quotes });
  } catch (error) {
    console.error("[admin/quotes] list failed:", error);
    return NextResponse.json({ ok: false, error: "Could not load quotes." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: AdminQuoteInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }
  if (!body?.customer?.name || !body.destinationPort || !body.destinationCountry) {
    return NextResponse.json({ ok: false, error: "Customer name, destination port and country are required." }, { status: 400 });
  }
  try {
    const ref = await adminSaveQuote(body);
    return NextResponse.json({ ok: true, ref });
  } catch (error) {
    console.error("[admin/quotes] save failed:", error);
    return NextResponse.json({ ok: false, error: "Could not save the quote." }, { status: 500 });
  }
}

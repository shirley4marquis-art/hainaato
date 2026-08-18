import { NextRequest, NextResponse } from "next/server";
import { adminGetQuote } from "../../../../../lib/crm";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  try {
    const quote = await adminGetQuote(ref);
    if (!quote) return NextResponse.json({ ok: false, error: "Quote not found." }, { status: 404 });
    return NextResponse.json({ ok: true, quote });
  } catch (error) {
    console.error("[admin/quotes/:ref] failed:", error);
    return NextResponse.json({ ok: false, error: "Could not load the quote." }, { status: 500 });
  }
}

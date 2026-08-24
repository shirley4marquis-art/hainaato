import { NextRequest, NextResponse } from "next/server";
import { adminDeleteQuote, adminGetQuote } from "../../../../../lib/crm";

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

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  try {
    const deleted = await adminDeleteQuote(ref);
    if (!deleted) return NextResponse.json({ ok: false, error: "Quote not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/quotes/:ref] delete failed:", error);
    return NextResponse.json({ ok: false, error: "Could not delete the quote." }, { status: 500 });
  }
}

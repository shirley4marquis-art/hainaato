// Customer-facing PDF download — lets a client pull their own quote PDF
// directly from /quote/status without needing the emailed copy. Reuses the
// same renderQuotePdf() pipeline as the admin download and the automated
// email attachment (see lib/render-quote-pdf.ts), just with no admin
// session to forward, so it authenticates the internal print-page
// navigation with the shared secret the way the customer email flow does.
import { NextRequest, NextResponse } from "next/server";
import { getQuoteStatus } from "../../../lib/crm";
import { renderQuotePdfWithRetry } from "../../../lib/render-quote-pdf";
import { verifyQuoteAccessToken } from "../../../lib/quote-access";
import { guardRequest } from "../../../lib/security/http";

// Launching a browser and rendering a multi-page document can take longer
// than Vercel's default function timeout.
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const limited = await guardRequest(request, { name: "quote-pdf", limit: 6, windowSec: 10 * 60 });
  if (limited) return limited;

  const ref = (request.nextUrl.searchParams.get("ref") || "").trim().toUpperCase();
  const token = request.nextUrl.searchParams.get("token") || "";
  if (!ref || !verifyQuoteAccessToken(ref, token)) {
    return NextResponse.json({ ok: false, error: "This quotation download link is invalid or incomplete." }, { status: 403 });
  }

  let quote;
  try {
    quote = await getQuoteStatus(ref);
  } catch (error) {
    console.error("[quote-pdf] status lookup failed:", error);
    return NextResponse.json({ ok: false, error: "Lookup is temporarily unavailable. Please try again shortly." }, { status: 502 });
  }
  if (!quote) {
    return NextResponse.json({ ok: false, error: "No request found for that reference." }, { status: 404 });
  }

  try {
    const pdf = await renderQuotePdfWithRetry(ref, request.url, { kind: "internal-secret" });
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="HainaAuto-Quote-${ref}.pdf"`,
        "Content-Length": String(pdf.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(`[quote-pdf] render failed for ${ref}:`, error);
    return NextResponse.json({ ok: false, error: "PDF generation failed. Please try again shortly." }, { status: 500 });
  }
}

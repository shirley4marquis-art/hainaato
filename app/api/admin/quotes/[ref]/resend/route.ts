import { NextRequest, NextResponse } from "next/server";
import { adminGetQuote, recordQuoteEmail } from "../../../../../../lib/crm";
import { renderQuotePdf } from "../../../../../../lib/render-quote-pdf";
import { customerQuoteEmailHtml, sendEmail } from "../../../../../../lib/email";
import { itemTitle } from "../../../../../../lib/quote-document";

// Re-renders the PDF from the quote's *current* data and re-sends it to the
// customer — this is both "resend" and "regenerate a revised version" in one
// action, since a staff price/freight edit made just before clicking this is
// what shows up in the new PDF (there's no separate draft/revision system).
export const maxDuration = 60;

export async function POST(request: NextRequest, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const quote = await adminGetQuote(ref);
  if (!quote) return NextResponse.json({ ok: false, error: "Quote not found." }, { status: 404 });
  if (!quote.customer.email) {
    return NextResponse.json({ ok: false, error: "This customer has no email address on file." }, { status: 400 });
  }

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderQuotePdf(ref, request.url, {
      kind: "cookie",
      cookieHeader: request.headers.get("cookie") ?? "",
    });
  } catch (error) {
    console.error(`[admin/quotes/resend] PDF render failed for ${ref}:`, error);
    return NextResponse.json({ ok: false, error: "PDF generation failed." }, { status: 500 });
  }

  const { subject, html } = customerQuoteEmailHtml({
    customerName: quote.customer.name,
    ref,
    documentNumber: quote.documentNumber,
    vehicleSummary: quote.items.map((item) => itemTitle(item)).join("; "),
  });

  const sendResult = await sendEmail({
    to: quote.customer.email,
    subject,
    html,
    attachment: { filename: `HainaAuto-Quote-${ref}.pdf`, content: pdfBuffer },
  });
  await recordQuoteEmail(ref, {
    toEmail: quote.customer.email,
    subject,
    html,
    status: sendResult.ok ? "sent" : "failed",
    error: sendResult.ok ? null : sendResult.error,
    providerMessageId: sendResult.ok ? sendResult.providerMessageId : null,
  });

  if (!sendResult.ok) {
    return NextResponse.json({ ok: false, error: sendResult.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { adminGetQuote, recordQuoteEmail } from "../../../../../../lib/crm";
import { renderQuotePdf } from "../../../../../../lib/render-quote-pdf";
import { sendEmail } from "../../../../../../lib/email";
import { buildQuoteEmailDraft, type QuoteEmailDraftType } from "../../../../../../lib/quote-email-drafts";

// Re-renders the PDF from the quote's *current* data and re-sends it to the
// customer — this is both "resend" and "regenerate a revised version" in one
// action, since a staff price/freight edit made just before clicking this is
// what shows up in the new PDF (there's no separate draft/revision system).
export const maxDuration = 60;

const DRAFT_TYPES = new Set<QuoteEmailDraftType>(["quotation", "follow_up", "contract_deposit", "shipping_docs", "arrival_balance"]);

export async function POST(request: NextRequest, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const quote = await adminGetQuote(ref);
  if (!quote) return NextResponse.json({ ok: false, error: "Quote not found." }, { status: 404 });
  if (!quote.customer.email) {
    return NextResponse.json({ ok: false, error: "This customer has no email address on file." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as { draftType?: QuoteEmailDraftType } | null;
  const draftType = body?.draftType && DRAFT_TYPES.has(body.draftType) ? body.draftType : "quotation";
  const draft = buildQuoteEmailDraft(quote, draftType);

  let pdfBuffer: Buffer | null = null;
  if (draft.attachesPdf) {
    try {
      pdfBuffer = await renderQuotePdf(ref, request.url, {
        kind: "cookie",
        cookieHeader: request.headers.get("cookie") ?? "",
      });
    } catch (error) {
      console.error(`[admin/quotes/resend] PDF render failed for ${ref}:`, error);
      return NextResponse.json({ ok: false, error: "PDF generation failed." }, { status: 500 });
    }
  }

  const sendResult = await sendEmail({
    to: quote.customer.email,
    subject: draft.subject,
    html: draft.html,
    attachment: pdfBuffer ? { filename: `HainaAuto-Quote-${ref}.pdf`, content: pdfBuffer } : undefined,
  });
  await recordQuoteEmail(ref, {
    toEmail: quote.customer.email,
    subject: draft.subject,
    html: draft.html,
    status: sendResult.ok ? "sent" : "failed",
    error: sendResult.ok ? null : sendResult.error,
    providerMessageId: sendResult.ok ? sendResult.providerMessageId : null,
  });

  if (!sendResult.ok) {
    return NextResponse.json({ ok: false, error: sendResult.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

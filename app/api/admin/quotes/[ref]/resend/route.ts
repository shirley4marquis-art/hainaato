import { NextRequest, NextResponse } from "next/server";
import { adminGetQuote, recordQuoteEmail } from "../../../../../../lib/crm";
import { renderQuotePdf } from "../../../../../../lib/render-quote-pdf";
import { customQuoteEmailHtml, sendEmail, type EmailAttachment } from "../../../../../../lib/email";
import { buildQuoteEmailDraft, type QuoteEmailDraftType } from "../../../../../../lib/quote-email-drafts";
import { isLikelyRealEmail } from "../../../../../../lib/valid-email";

// Re-renders the PDF from the quote's *current* data and re-sends it to the
// customer — this is both "resend" and "regenerate a revised version" in one
// action, since a staff price/freight edit made just before clicking this is
// what shows up in the new PDF (there's no separate draft/revision system).
export const maxDuration = 60;

const DRAFT_TYPES = new Set<QuoteEmailDraftType>(["quotation", "follow_up", "contract_deposit", "shipping_docs", "arrival_balance"]);
const MAX_ATTACHMENT_COUNT = 5;
const MAX_ATTACHMENT_BYTES = 3.5 * 1024 * 1024;

function parseRecipients(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(/[,;\n]/)
    .map((email) => email.trim())
    .filter(Boolean);
}

function safeAttachmentName(name: string): string {
  const normalized = name
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "attachment";
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const quote = await adminGetQuote(ref);
  if (!quote) return NextResponse.json({ ok: false, error: "Quote not found." }, { status: 404 });

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const mode = String(form.get("mode") ?? "");
    if (mode !== "custom") {
      return NextResponse.json({ ok: false, error: "Unsupported email form." }, { status: 400 });
    }

    const recipients = parseRecipients(String(form.get("toEmail") || quote.customer.email || ""));
    const invalidRecipients = recipients.filter((email) => !isLikelyRealEmail(email));
    if (recipients.length === 0) {
      return NextResponse.json({ ok: false, error: "Enter at least one recipient email." }, { status: 400 });
    }
    if (invalidRecipients.length > 0) {
      return NextResponse.json({ ok: false, error: `Check recipient email: ${invalidRecipients[0]}` }, { status: 400 });
    }

    const subject = String(form.get("subject") ?? "").trim();
    const message = String(form.get("message") ?? "").trim();
    if (!subject) return NextResponse.json({ ok: false, error: "Enter an email subject." }, { status: 400 });
    if (!message) return NextResponse.json({ ok: false, error: "Enter an email message." }, { status: 400 });

    const files = form.getAll("attachments").filter((value): value is File => value instanceof File && value.size > 0);
    if (files.length > MAX_ATTACHMENT_COUNT) {
      return NextResponse.json({ ok: false, error: `Attach up to ${MAX_ATTACHMENT_COUNT} files.` }, { status: 400 });
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > MAX_ATTACHMENT_BYTES) {
      return NextResponse.json({ ok: false, error: "Attachments must be 3.5 MB or less in total." }, { status: 400 });
    }

    const attachments: EmailAttachment[] = await Promise.all(
      files.map(async (file) => ({
        filename: safeAttachmentName(file.name),
        content: Buffer.from(await file.arrayBuffer()),
        contentType: file.type || "application/octet-stream",
      }))
    );
    const html = customQuoteEmailHtml({
      customerName: quote.customer.name || "there",
      quoteRef: quote.documentNumber ?? ref,
      subject,
      message,
    });
    const sendResult = await sendEmail({ to: recipients, subject, html, attachments });
    await recordQuoteEmail(ref, {
      toEmail: recipients.join(", "),
      subject,
      html,
      status: sendResult.ok ? "sent" : "failed",
      error: sendResult.ok ? null : sendResult.error,
      providerMessageId: sendResult.ok ? sendResult.providerMessageId : null,
    });

    if (!sendResult.ok) {
      return NextResponse.json({ ok: false, error: sendResult.error }, { status: 502 });
    }
    return NextResponse.json({ ok: true, sentTo: recipients });
  }

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

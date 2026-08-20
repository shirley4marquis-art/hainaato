import { NextResponse } from "next/server";
import { customSalesEmailHtml, sendEmail } from "../../../../lib/email";
import { recordClientEmail } from "../../../../lib/crm";

type MailRequest = {
  customerId?: number | null;
  customerName?: string;
  to?: string;
  subject?: string;
  heading?: string;
  message?: string;
  callToActionLabel?: string;
  callToActionUrl?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as MailRequest | null;
  const to = body?.to?.trim() ?? "";
  const subject = body?.subject?.trim() ?? "";
  const heading = body?.heading?.trim() ?? "";
  const message = body?.message?.trim() ?? "";
  const customerName = body?.customerName?.trim() || "there";
  const ctaLabel = body?.callToActionLabel?.trim() ?? "";
  const ctaUrl = body?.callToActionUrl?.trim() ?? "";

  if (!emailPattern.test(to)) return NextResponse.json({ ok: false, error: "Enter a valid recipient email." }, { status: 400 });
  if (!subject || subject.length > 180) return NextResponse.json({ ok: false, error: "Subject is required and must be under 180 characters." }, { status: 400 });
  if (!heading || heading.length > 180) return NextResponse.json({ ok: false, error: "Email heading is required and must be under 180 characters." }, { status: 400 });
  if (!message || message.length > 12000) return NextResponse.json({ ok: false, error: "Message is required and must be under 12,000 characters." }, { status: 400 });
  if ((ctaLabel && !ctaUrl) || (!ctaLabel && ctaUrl)) return NextResponse.json({ ok: false, error: "Provide both the button label and URL, or leave both blank." }, { status: 400 });
  if (ctaUrl) {
    try { const url = new URL(ctaUrl); if (!/^https?:$/.test(url.protocol)) throw new Error(); }
    catch { return NextResponse.json({ ok: false, error: "The button URL must be a valid http or https address." }, { status: 400 }); }
  }

  const html = customSalesEmailHtml({ customerName, heading, message, callToActionLabel: ctaLabel, callToActionUrl: ctaUrl });
  const result = await sendEmail({ to, subject, html });
  await recordClientEmail({
    customerId: Number.isInteger(body?.customerId) ? body?.customerId : null,
    toEmail: to, subject, html, status: result.ok ? "sent" : "failed",
    error: result.ok ? null : result.error,
    providerMessageId: result.ok ? result.providerMessageId : null,
  });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  return NextResponse.json({ ok: true });
}

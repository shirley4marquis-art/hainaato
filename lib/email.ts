// Sends a plain-text notification to the business inbox when a new lead comes
// in. Uses Resend's HTTP API directly (a fetch call) instead of adding the
// `resend` package — no email provider was configured before this, so this
// picks the option needing the least new infra: no SMTP server, no dependency.
//
// Required env vars (see .env.local):
//   RESEND_API_KEY   - API key from resend.com
//   LEADS_FROM_EMAIL - a sender address verified with Resend (e.g. leads@hainaautochina.com,
//                       or onboarding@resend.dev while testing without a verified domain)
//   LEADS_TO_EMAIL   - optional, defaults to sales@hainaautochina.com
import type { WebLead } from "./crm";

const RESEND_API_URL = "https://api.resend.com/emails";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Table-based, inline-styled layout (required for Outlook/Gmail rendering)
// matching the brand colors already used across the site's own header and
// the staff-issued PDF quotes (--mkt-navy #082F63, --mkt-coral #FF6B00 in
// app/globals.css) rather than inventing a separate email look.
function leadNotificationHtml(lead: WebLead, ref: string): string {
  const NAVY = "#082F63";
  const CORAL = "#FF6B00";
  const row = (label: string, value: string | number | null | undefined) => {
    if (value == null || value === "") return "";
    return `<tr><td style="padding:10px 0;border-top:1px solid #e3e4e8;color:#858ea9;font:600 12px/1.4 Arial,sans-serif;width:150px;vertical-align:top">${escapeHtml(label)}</td><td style="padding:10px 0;border-top:1px solid #e3e4e8;color:#0d0e12;font:14px/1.5 Arial,sans-serif;vertical-align:top">${escapeHtml(String(value)).replace(/\n/g, "<br/>")}</td></tr>`;
  };

  const rows = [
    row("Reference", ref),
    row("Source", lead.source),
    row("Name", lead.name),
    row("Email", lead.email),
    row("Phone / WhatsApp", lead.phone),
    row("Company", lead.company),
    row("Vehicle", lead.vehicle),
    row("Budget", lead.budget),
    row("Destination", lead.destination),
    row("Quantity", lead.quantity),
    row("Message", lead.message),
  ].join("");

  return `<!doctype html>
<html>
<body style="margin:0;padding:24px;background:#f4f5f9;font-family:Arial,sans-serif">
  <table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e3e4e8">
    <tr><td style="background:${CORAL};height:6px;font-size:0;line-height:0">&nbsp;</td></tr>
    <tr>
      <td style="background:${NAVY};padding:24px 28px">
        <div style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-.02em">HAINA AUTO EXPORT</div>
        <div style="color:#93c5fd;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin-top:4px">New Website Lead — ${escapeHtml(ref)}</div>
      </td>
    </tr>
    <tr>
      <td style="padding:28px">
        <table role="presentation" width="100%" style="border-collapse:collapse">${rows}</table>
        <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e3e4e8;font-size:12px;color:#858ea9;line-height:1.6">
          This lead was saved to the CRM automatically. Reply directly to this email, or contact the customer using the details above.
        </div>
      </td>
    </tr>
    <tr>
      <td style="background:#f4f5f9;padding:18px 28px;text-align:center;font-size:11px;color:#858ea9;line-height:1.6">
        HAINA AUTO EXPORT · 11, Yuefeng Road, Economic Development Zone, Zhangjiagang, Jiangsu, China<br/>
        Tel 5623368661 · sales@hainaautochina.com · hainaautochina.com
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendLeadNotification(lead: WebLead, ref: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.LEADS_FROM_EMAIL;
  const to = process.env.LEADS_TO_EMAIL || "sales@hainaautochina.com";

  if (!apiKey || !from) {
    console.warn(`[leads] Email not sent for ${ref} — set RESEND_API_KEY and LEADS_FROM_EMAIL to enable notifications.`);
    return;
  }

  const lines = [
    `New lead — ${ref}`,
    `Source: ${lead.source}`,
    `Name: ${lead.name}`,
    lead.email ? `Email: ${lead.email}` : null,
    lead.phone ? `Phone / WhatsApp: ${lead.phone}` : null,
    lead.company ? `Company: ${lead.company}` : null,
    lead.vehicle ? `Vehicle: ${lead.vehicle}` : null,
    lead.budget ? `Budget: ${lead.budget}` : null,
    lead.destination ? `Destination: ${lead.destination}` : null,
    lead.quantity ? `Quantity: ${lead.quantity}` : null,
    lead.message ? `Message:\n${lead.message}` : null,
  ].filter((line): line is string => Boolean(line));

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: `New HainaAuto lead ${ref} — ${lead.name}`,
      text: lines.join("\n"),
      html: leadNotificationHtml(lead, ref),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Resend API error ${response.status}: ${body}`);
  }
}

// Pure HTML builder, kept separate from the actual send below so callers
// (app/api/quote-requests/route.ts) always have the exact email content to
// record in quote_emails via lib/crm.ts's recordQuoteEmail — regardless of
// whether the send itself succeeds, since admin needs to see what was
// attempted either way.
export function customerQuoteEmailHtml(params: {
  customerName: string;
  ref: string;
  documentNumber: string | null;
  vehicleSummary: string;
}): { subject: string; html: string } {
  const NAVY = "#082F63";
  const CORAL = "#FF6B00";
  const docRef = params.documentNumber ?? params.ref;
  const subject = `Your HainaAuto quotation ${docRef}`;
  const html = `<!doctype html>
<html>
<body style="margin:0;padding:24px;background:#f4f5f9;font-family:Arial,sans-serif">
  <table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e3e4e8">
    <tr><td style="background:${CORAL};height:6px;font-size:0;line-height:0">&nbsp;</td></tr>
    <tr>
      <td style="background:${NAVY};padding:24px 28px">
        <div style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-.02em">HAINA AUTO EXPORT</div>
        <div style="color:#93c5fd;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin-top:4px">Your Quotation — ${escapeHtml(docRef)}</div>
      </td>
    </tr>
    <tr>
      <td style="padding:28px">
        <p style="margin:0 0 16px;font:16px/1.6 Arial,sans-serif;color:#0d0e12">Hi ${escapeHtml(params.customerName)},</p>
        <p style="margin:0 0 16px;font:14px/1.7 Arial,sans-serif;color:#0d0e12">
          Thank you for requesting a quotation for <b>${escapeHtml(params.vehicleSummary)}</b>. We've prepared your
          personalized quotation and attached it to this email as a PDF.
        </p>
        <p style="margin:0 0 16px;font:14px/1.7 Arial,sans-serif;color:#0d0e12">
          It covers vehicle pricing, shipping and insurance, an estimate of destination-side costs, and our payment
          and export terms.
        </p>
        <p style="margin:0;font:14px/1.7 Arial,sans-serif;color:#0d0e12">
          Have questions or ready to proceed? Just reply to this email, or reach our sales team directly —
          we're glad to help.
        </p>
      </td>
    </tr>
    <tr>
      <td style="background:#f4f5f9;padding:18px 28px;text-align:center;font-size:11px;color:#858ea9;line-height:1.6">
        HAINA AUTO EXPORT · 11, Yuefeng Road, Economic Development Zone, Zhangjiagang, Jiangsu, China<br/>
        Tel 5623368661 · sales@hainaautochina.com · hainaautochina.com
      </td>
    </tr>
  </table>
</body>
</html>`;
  return { subject, html };
}

export type SendResult = { ok: true; providerMessageId: string | null } | { ok: false; error: string };

// Generic Resend send with an optional PDF attachment — separate from
// sendLeadNotification above (internal-only, no attachment support needed
// there) since this one is customer-facing and must report success/failure
// back to the caller rather than swallowing it, so it can be logged either
// way via lib/crm.ts's recordQuoteEmail.
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  attachment?: { filename: string; content: Buffer };
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.LEADS_FROM_EMAIL;
  if (!apiKey || !from) {
    return { ok: false, error: "RESEND_API_KEY / LEADS_FROM_EMAIL not configured." };
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        attachments: params.attachment
          ? [{ filename: params.attachment.filename, content: params.attachment.content.toString("base64") }]
          : undefined,
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return { ok: false, error: `Resend API error ${response.status}: ${body}` };
    }
    const data = (await response.json().catch(() => null)) as { id?: string } | null;
    return { ok: true, providerMessageId: data?.id ?? null };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

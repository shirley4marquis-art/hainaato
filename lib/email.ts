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
const EMAIL_LOGO_CID = "hainaauto-logo";
const EMAIL_LOGO_URL = "https://www.hainaautochina.com/hainaauto-email-logo.png";
const CUSTOMER_SENDER_NAME = "HAINA AUTO | 海纳百川国际汽贸";

function logoAttachment() {
  return { filename: "hainaauto-logo.png", path: EMAIL_LOGO_URL, content_id: EMAIL_LOGO_CID };
}

function logoImg(width = 62, height = 62): string {
  return `<img src="cid:${EMAIL_LOGO_CID}" width="${width}" height="${height}" alt="Haina Auto" style="display:block;width:${width}px;height:${height}px;border:0;border-radius:10px;background:#fff">`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function senderEmailAddress(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const bracketed = trimmed.match(/<([^>]+)>/);
  return (bracketed?.[1] ?? trimmed).trim();
}

function brandedCustomerSender(value: string | null | undefined): string {
  const email = senderEmailAddress(value) || "sales@hainaautochina.com";
  return `${CUSTOMER_SENDER_NAME} <${email}>`;
}

export function customSalesEmailHtml(params: {
  customerName: string;
  heading: string;
  message: string;
  callToActionLabel?: string;
  callToActionUrl?: string;
  downloadLinks?: Array<{ label: string; url: string; size?: string }>;
}): string {
  const name = escapeHtml(params.customerName || "there");
  const heading = escapeHtml(params.heading);
  const paragraphs = params.message.split(/\n{2,}/).map((part) =>
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#44536A">${escapeHtml(part).replace(/\n/g, "<br>")}</p>`
  ).join("");
  const cta = params.callToActionLabel && params.callToActionUrl
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0"><tr><td bgcolor="#FF6B00" style="border-radius:8px"><a href="${escapeHtml(params.callToActionUrl)}" style="display:inline-block;padding:13px 20px;color:#fff;text-decoration:none;font-size:13px;font-weight:800">${escapeHtml(params.callToActionLabel)}</a></td></tr></table>`
    : "";
  const downloads = params.downloadLinks?.length
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:22px 0;border:1px solid #DCE3EC;border-radius:12px;background:#F7F9FC"><tr><td style="padding:18px 20px"><div style="margin-bottom:10px;color:#082F63;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">Download files</div>${params.downloadLinks.map((link) => `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #E3E8EF"><tr><td style="padding:12px 0;color:#44536A;font-size:13px;font-weight:700">${escapeHtml(link.label)}${link.size ? ` <span style="color:#7B879A;font-weight:400">(${escapeHtml(link.size)})</span>` : ""}</td><td align="right" style="padding:12px 0"><a href="${escapeHtml(link.url)}" style="display:inline-block;padding:8px 11px;border-radius:7px;background:#082F63;color:#fff;text-decoration:none;font-size:11px;font-weight:800">Download</a></td></tr></table>`).join("")}</td></tr></table>`
    : "";
  return `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#EEF2F7;font-family:Arial,Helvetica,sans-serif;color:#14213D"><div style="display:none;max-height:0;overflow:hidden">${heading}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#EEF2F7"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="max-width:620px;border:1px solid #DCE3EC;border-radius:16px;overflow:hidden"><tr><td style="height:7px;background:#FF6B00;font-size:0">&nbsp;</td></tr><tr><td bgcolor="#082F63" style="padding:24px 28px"><table role="presentation" width="100%"><tr><td width="74">${logoImg()}</td><td><div style="color:#fff;font-size:22px;font-weight:800">HAINA AUTO EXPORT</div><div style="color:#9FC5FF;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-top:5px">China vehicle sourcing &amp; export</div></td></tr></table></td></tr><tr><td style="padding:30px"><p style="margin:0 0 10px;color:#44536A;font-size:15px">Hello ${name},</p><h1 style="margin:0 0 20px;color:#082F63;font-size:25px;line-height:1.25">${heading}</h1>${paragraphs}${downloads}${cta}<p style="margin:22px 0 0;font-size:14px;line-height:1.7;color:#44536A">Best regards,<br><b style="color:#082F63">HainaAuto Sales Team</b></p></td></tr><tr><td style="padding:20px 30px 26px;background:#F7F9FC;font-size:11px;line-height:1.7;color:#7B879A"><b style="color:#082F63">HAINA AUTO EXPORT</b><br>11, Yuefeng Road, Economic Development Zone, Zhangjiagang, Jiangsu, China<br><a href="mailto:sales@hainaautochina.com" style="color:#082F63">sales@hainaautochina.com</a> · <a href="https://www.hainaautochina.com" style="color:#082F63">hainaautochina.com</a></td></tr></table></td></tr></table></body></html>`;
}

export function customQuoteEmailHtml(params: {
  customerName: string;
  quoteRef: string;
  subject: string;
  message: string;
  downloadLinks?: Array<{ label: string; url: string; size?: string }>;
}): string {
  const message = [
    params.message,
    "",
    `Quote reference: ${params.quoteRef}`,
  ].join("\n");
  return customSalesEmailHtml({
    customerName: params.customerName,
    heading: params.subject,
    message,
    downloadLinks: params.downloadLinks,
  });
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
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
          <td width="72" valign="middle">${logoImg(58, 58)}</td>
          <td valign="middle">
            <div style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-.02em">HAINA AUTO EXPORT</div>
            <div style="color:#93c5fd;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin-top:4px">New Website Lead — ${escapeHtml(ref)}</div>
          </td>
        </tr></table>
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
      attachments: [logoAttachment()],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Resend API error ${response.status}: ${body}`);
  }
}

export function quoteCreatedSalesEmailHtml(params: {
  ref: string;
  documentNumber: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  destinationCountry: string | null;
  destinationPort: string | null;
  vehicleSummary: string;
  message?: string | null;
}): { subject: string; text: string; html: string } {
  const NAVY = "#082F63";
  const CORAL = "#FF6B00";
  const docRef = params.documentNumber ?? params.ref;
  const subject = `New quote created ${docRef} — ${params.customerName}`;
  const vehicleLines = escapeHtml(params.vehicleSummary || "Vehicle details pending").replace(/; /g, "<br>");
  const text = [
    `New quote created — ${docRef}`,
    `Customer: ${params.customerName}`,
    `Email: ${params.customerEmail}`,
    params.customerPhone ? `Phone / WhatsApp: ${params.customerPhone}` : null,
    params.destinationCountry ? `Destination country: ${params.destinationCountry}` : null,
    params.destinationPort ? `Destination port: ${params.destinationPort}` : null,
    `Vehicles: ${params.vehicleSummary}`,
    params.message ? `Message: ${params.message}` : null,
  ].filter(Boolean).join("\n");

  const html = `<!doctype html>
<html lang="en">
<head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head>
<body style="margin:0;padding:0;background:#EEF2F7;font-family:Arial,Helvetica,sans-serif;color:#14213D">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#EEF2F7"><tr><td align="center" style="padding:28px 12px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#FFFFFF" style="max-width:620px;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #DCE3EC;box-shadow:0 8px 28px rgba(8,47,99,.10)">
      <tr><td style="background:${CORAL};height:7px;font-size:0;line-height:0">&nbsp;</td></tr>
      <tr>
        <td bgcolor="${NAVY}" style="background:${NAVY};padding:24px 28px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
            <td width="74" valign="middle">${logoImg()}</td>
            <td valign="middle"><div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-.02em">HAINA AUTO EXPORT</div><div style="color:#9FC5FF;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-top:5px">New Quote Follow-up</div></td>
          </tr></table>
        </td>
      </tr>
      <tr>
        <td style="padding:30px 30px 10px">
          <div style="display:inline-block;background:#EAF2FF;color:${NAVY};border-radius:999px;padding:7px 12px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">Quote ${escapeHtml(docRef)}</div>
          <h1 style="margin:18px 0 10px;font-size:25px;line-height:1.25;color:${NAVY};letter-spacing:-.02em">A new quotation request has been created</h1>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#44536A">Follow up with the customer as soon as possible.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#F7F9FC" style="background:#F7F9FC;border:1px solid #E0E6EF;border-radius:12px;margin-bottom:18px"><tr><td style="padding:18px 20px">
            <div style="font-size:10px;color:#7B879A;font-weight:800;letter-spacing:.10em;text-transform:uppercase;margin-bottom:8px">Customer details</div>
            <div style="font-size:14px;line-height:1.8;color:${NAVY};font-weight:700">
              <div><b>Name:</b> ${escapeHtml(params.customerName)}</div>
              <div><b>Email:</b> ${escapeHtml(params.customerEmail)}</div>
              ${params.customerPhone ? `<div><b>Phone:</b> ${escapeHtml(params.customerPhone)}</div>` : ""}
              ${params.destinationCountry ? `<div><b>Country:</b> ${escapeHtml(params.destinationCountry)}</div>` : ""}
              ${params.destinationPort ? `<div><b>Port:</b> ${escapeHtml(params.destinationPort)}</div>` : ""}
            </div>
          </td></tr></table>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#F7F9FC" style="background:#F7F9FC;border:1px solid #E0E6EF;border-radius:12px"><tr><td style="padding:18px 20px">
            <div style="font-size:10px;color:#7B879A;font-weight:800;letter-spacing:.10em;text-transform:uppercase;margin-bottom:8px">Vehicles included</div>
            <div style="font-size:14px;line-height:1.75;color:${NAVY};font-weight:700">${vehicleLines}</div>
            ${params.message ? `<div style="margin-top:12px;font-size:13px;line-height:1.7;color:#44536A"><b>Message:</b><br>${escapeHtml(params.message).replace(/\n/g, "<br>")}</div>` : ""}
          </td></tr></table>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 30px 28px"><div style="height:1px;background:#E3E8EF;margin-bottom:18px"></div><div style="font-size:11px;color:#7B879A;line-height:1.7">
          <b style="color:${NAVY}">HAINA AUTO EXPORT</b><br>11, Yuefeng Road, Economic Development Zone, Zhangjiagang, Jiangsu, China<br>
          <a href="mailto:sales@hainaautochina.com" style="color:${NAVY}">sales@hainaautochina.com</a> · <a href="https://www.hainaautochina.com" style="color:${NAVY}">hainaautochina.com</a>
        </div>
        </td>
      </tr>
    </table>
  </td></tr></table>
</body>
</html>`;

  return { subject, text, html };
}

export async function sendQuoteCreatedSalesNotification(params: {
  ref: string;
  documentNumber: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  destinationCountry: string | null;
  destinationPort: string | null;
  vehicleSummary: string;
  message?: string | null;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.LEADS_FROM_EMAIL || process.env.CUSTOMER_FROM_EMAIL || "HainaAuto Sales <sales@hainaautochina.com>";
  const to = process.env.LEADS_TO_EMAIL || process.env.SALES_TO_EMAIL || "sales@hainaautochina.com";

  if (!apiKey) {
    console.warn(`[quotes] Sales notification not sent for ${params.ref} — RESEND_API_KEY is not configured.`);
    return;
  }

  try {
    const { subject, text, html } = quoteCreatedSalesEmailHtml(params);
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        reply_to: "sales@hainaautochina.com",
        subject,
        text,
        html,
        attachments: [logoAttachment()],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Resend API error ${response.status}: ${body}`);
    }
  } catch (error) {
    console.error(`[quotes] Sales notification failed for ${params.ref}:`, error);
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
  const PALE_BLUE = "#EAF2FF";
  const docRef = params.documentNumber ?? params.ref;
  const subject = `Your HainaAuto quotation ${docRef}`;
  const vehicleLines = escapeHtml(params.vehicleSummary).replace(/; /g, "<br>");
  const html = `<!doctype html>
<html lang="en">
<head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head>
<body style="margin:0;padding:0;background:#EEF2F7;font-family:Arial,Helvetica,sans-serif;color:#14213D">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">Your personalized Haina Auto quotation ${escapeHtml(docRef)} is attached as a PDF.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#EEF2F7"><tr><td align="center" style="padding:28px 12px">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#FFFFFF" style="max-width:620px;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #DCE3EC;box-shadow:0 8px 28px rgba(8,47,99,.10)">
    <tr><td style="background:${CORAL};height:7px;font-size:0;line-height:0">&nbsp;</td></tr>
    <tr>
      <td bgcolor="${NAVY}" style="background:${NAVY};padding:24px 28px">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
          <td width="74" valign="middle">${logoImg()}</td>
          <td valign="middle"><div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-.02em">HAINA AUTO EXPORT</div><div style="color:#9FC5FF;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-top:5px">China vehicle sourcing &amp; export</div></td>
        </tr></table>
      </td>
    </tr>
    <tr>
      <td style="padding:30px 30px 10px">
        <div style="display:inline-block;background:${PALE_BLUE};color:${NAVY};border-radius:999px;padding:7px 12px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">Quotation ${escapeHtml(docRef)}</div>
        <h1 style="margin:18px 0 10px;font-size:25px;line-height:1.25;color:${NAVY};letter-spacing:-.02em">Your vehicle quotation is ready</h1>
        <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#44536A">Hello ${escapeHtml(params.customerName)},</p>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#44536A">
          Thank you for choosing Haina Auto. We prepared your personalized export quotation and attached the complete PDF to this email.
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#F7F9FC" style="background:#F7F9FC;border:1px solid #E0E6EF;border-radius:12px"><tr><td style="padding:18px 20px">
          <div style="font-size:10px;color:#7B879A;font-weight:800;letter-spacing:.10em;text-transform:uppercase;margin-bottom:8px">Vehicles included</div>
          <div style="font-size:14px;line-height:1.75;color:${NAVY};font-weight:700">${vehicleLines}</div>
        </td></tr></table>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:20px"><tr>
          <td width="33.33%" valign="top" style="padding:0 8px 0 0"><div style="font-size:12px;font-weight:800;color:${NAVY}">01 · Review</div><div style="font-size:11px;line-height:1.5;color:#7B879A;margin-top:4px">Prices, vehicles and specifications</div></td>
          <td width="33.33%" valign="top" style="padding:0 8px"><div style="font-size:12px;font-weight:800;color:${NAVY}">02 · Confirm</div><div style="font-size:11px;line-height:1.5;color:#7B879A;margin-top:4px">Reply with any requested changes</div></td>
          <td width="33.33%" valign="top" style="padding:0 0 0 8px"><div style="font-size:12px;font-weight:800;color:${NAVY}">03 · Proceed</div><div style="font-size:11px;line-height:1.5;color:#7B879A;margin-top:4px">Our export team completes your order</div></td>
        </tr></table>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 8px"><tr>
          <td bgcolor="${CORAL}" style="background:${CORAL};border-radius:8px"><a href="mailto:sales@hainaautochina.com?subject=Quotation%20${encodeURIComponent(docRef)}" style="display:inline-block;padding:13px 20px;color:#fff;text-decoration:none;font-size:13px;font-weight:800">Reply to our sales team</a></td>
          <td width="10"></td>
          <td style="border:1px solid #CBD5E1;border-radius:8px"><a href="https://wa.me/8615531026121" style="display:inline-block;padding:12px 18px;color:${NAVY};text-decoration:none;font-size:13px;font-weight:800">WhatsApp</a></td>
        </tr></table>
        <p style="margin:18px 0 0;font-size:12px;line-height:1.65;color:#7B879A">The attached PDF includes vehicle pricing, corresponding photos and specifications, shipping, insurance, export terms and estimated destination costs.</p>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 30px 28px"><div style="height:1px;background:#E3E8EF;margin-bottom:18px"></div><div style="font-size:11px;color:#7B879A;line-height:1.7">
        <b style="color:${NAVY}">HAINA AUTO EXPORT</b><br>11, Yuefeng Road, Economic Development Zone, Zhangjiagang, Jiangsu, China<br>
        <a href="mailto:sales@hainaautochina.com" style="color:${NAVY}">sales@hainaautochina.com</a> · <a href="https://www.hainaautochina.com" style="color:${NAVY}">hainaautochina.com</a>
      </div>
      </td>
    </tr>
  </table>
  <p style="margin:16px 0 0;font-size:10px;line-height:1.5;color:#98A2B3;text-align:center">You received this message because you requested a vehicle quotation from Haina Auto.</p>
  </td></tr></table>
</body>
</html>`;
  return { subject, html };
}

export type SendResult = { ok: true; providerMessageId: string | null } | { ok: false; error: string };
export type EmailAttachment = { filename: string; content: Buffer; contentType?: string };

// Generic Resend send with an optional PDF attachment — separate from
// sendLeadNotification above (internal-only, no attachment support needed
// there) since this one is customer-facing and must report success/failure
// back to the caller rather than swallowing it, so it can be logged either
// way via lib/crm.ts's recordQuoteEmail.
export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  attachment?: EmailAttachment;
  attachments?: EmailAttachment[];
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = brandedCustomerSender(process.env.CUSTOMER_FROM_EMAIL || process.env.LEADS_FROM_EMAIL);
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY is not configured." };
  }

  try {
    const attachments = [
      ...(params.attachments ?? []),
      ...(params.attachment ? [params.attachment] : []),
    ].map((attachment) => ({
      filename: attachment.filename,
      content: attachment.content.toString("base64"),
      ...(attachment.contentType ? { content_type: attachment.contentType } : {}),
    }));

    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        reply_to: "sales@hainaautochina.com",
        to: params.to,
        subject: params.subject,
        html: params.html,
        attachments: [...attachments, logoAttachment()],
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`[email] Resend API error ${response.status} sending "${params.subject}" to ${Array.isArray(params.to) ? params.to.join(", ") : params.to}: ${body}`);
      return { ok: false, error: `Resend API error ${response.status}: ${body}` };
    }
    const data = (await response.json().catch(() => null)) as { id?: string } | null;
    return { ok: true, providerMessageId: data?.id ?? null };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

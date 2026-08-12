// Sends a plain-text notification to the business inbox when a new lead comes
// in. Uses Resend's HTTP API directly (a fetch call) instead of adding the
// `resend` package — no email provider was configured before this, so this
// picks the option needing the least new infra: no SMTP server, no dependency.
//
// Required env vars (unset today — see .env.local):
//   RESEND_API_KEY   - API key from resend.com
//   LEADS_FROM_EMAIL - a sender address verified with Resend (e.g. leads@hainaauto.com,
//                       or onboarding@resend.dev while testing without a verified domain)
//   LEADS_TO_EMAIL   - optional, defaults to info@hainaauto.com
import type { WebLead } from "./crm";

const RESEND_API_URL = "https://api.resend.com/emails";

export async function sendLeadNotification(lead: WebLead, ref: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.LEADS_FROM_EMAIL;
  const to = process.env.LEADS_TO_EMAIL || "info@hainaauto.com";

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
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Resend API error ${response.status}: ${body}`);
  }
}

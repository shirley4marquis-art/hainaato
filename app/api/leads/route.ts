import { NextRequest, NextResponse } from "next/server";
import { saveLead, type WebLead } from "../../../lib/crm";
import { sendLeadNotification } from "../../../lib/email";

function str(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 4000) : undefined;
}

function num(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }
  const b = body as Record<string, unknown>;

  const name = str(b.name);
  const email = str(b.email);
  // Some forms collect one combined "contact" field (WhatsApp / email / phone)
  // rather than separate email/phone inputs.
  const contact = str(b.contact);
  const phone = str(b.phone) ?? (contact && !contact.includes("@") ? contact : undefined);
  const resolvedEmail = email ?? (contact && contact.includes("@") ? contact : undefined);
  const source = str(b.source);

  if (!name) return NextResponse.json({ ok: false, error: "Name is required." }, { status: 400 });
  if (!resolvedEmail && !phone) {
    return NextResponse.json({ ok: false, error: "An email, phone or WhatsApp contact is required." }, { status: 400 });
  }
  if (!source) return NextResponse.json({ ok: false, error: "Missing source page." }, { status: 400 });

  const lead: WebLead = {
    name,
    email: resolvedEmail ?? null,
    phone: phone ?? null,
    company: str(b.company) ?? null,
    vehicle: str(b.vehicle) ?? null,
    budget: str(b.budget) ?? null,
    destination: str(b.destination) ?? null,
    quantity: num(b.quantity) ?? null,
    message: str(b.message) ?? null,
    // Explicit boolean check — anything other than a literal true (missing,
    // undefined, "true" as a string, etc.) is treated as no consent given.
    publicConsent: b.publicConsent === true,
    source,
  };

  let ref: string;
  try {
    ref = saveLead(lead);
  } catch (error) {
    console.error("[leads] Failed to save lead to CRM:", error);
    return NextResponse.json(
      { ok: false, error: "We couldn't record your request. Please try again or contact us directly on WhatsApp." },
      { status: 502 }
    );
  }

  // Email is best-effort: the lead is already durably saved above, so a failed
  // or unconfigured mail send shouldn't turn into a failure response.
  sendLeadNotification(lead, ref).catch((error) => {
    console.error("[leads] Failed to send lead notification email:", error);
  });

  return NextResponse.json({ ok: true, ref }, { status: 201 });
}

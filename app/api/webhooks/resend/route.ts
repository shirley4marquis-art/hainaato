import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

type ReceivedEmailEvent = {
  type: "email.received";
  data: { email_id: string };
};

function forwardingRecipients(): string[] {
  return (process.env.INBOUND_FORWARD_TO || process.env.LEADS_TO_EMAIL || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function isLocalDomain(address: string): boolean {
  const email = address.match(/<([^>]+)>/)?.[1] ?? address;
  return email.trim().toLowerCase().endsWith("@nindgeauto.com");
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!apiKey || !webhookSecret) {
    console.error("[resend-inbound] Missing RESEND_API_KEY or RESEND_WEBHOOK_SECRET.");
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const payload = await request.text();
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");
  if (!id || !timestamp || !signature) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const resend = new Resend(apiKey);
  let event: ReceivedEmailEvent | { type: string };
  try {
    event = resend.webhooks.verify({
      payload,
      headers: { id, timestamp, signature },
      webhookSecret,
    }) as ReceivedEmailEvent | { type: string };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (event.type !== "email.received") return NextResponse.json({ ok: true });

  const recipients = forwardingRecipients();
  if (!recipients.length || recipients.some(isLocalDomain)) {
    console.error("[resend-inbound] INBOUND_FORWARD_TO must be an external mailbox to prevent an MX forwarding loop.");
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const from = process.env.INBOUND_FORWARD_FROM || process.env.CUSTOMER_FROM_EMAIL || process.env.LEADS_FROM_EMAIL;
  if (!from) {
    console.error("[resend-inbound] Missing INBOUND_FORWARD_FROM, CUSTOMER_FROM_EMAIL, or LEADS_FROM_EMAIL.");
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const { data, error } = await resend.emails.receiving.forward({
    emailId: (event as ReceivedEmailEvent).data.email_id,
    from,
    to: recipients,
  });
  if (error) {
    console.error(`[resend-inbound] Forward failed: ${error.message}`);
    return NextResponse.json({ ok: false }, { status: 502 });
  }

  return NextResponse.json({ ok: true, id: data?.id ?? null });
}

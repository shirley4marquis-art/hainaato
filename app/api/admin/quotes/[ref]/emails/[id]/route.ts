import { guardAdminRequest } from "../../../../../../../lib/security/admin";
import { NextResponse } from "next/server";
import { listQuoteEmails } from "../../../../../../../lib/crm";

// Serves one previously-sent email's exact HTML for staff to view — "View
// the exact email sent to the customer" — as a standalone page rather than
// JSON, so a plain link/target=_blank click renders it.
export async function GET(request: Request, { params }: { params: Promise<{ ref: string; id: string }> }) {
  const denied = await guardAdminRequest(request);
  if (denied) return denied;
  const { ref, id } = await params;
  const emails = await listQuoteEmails(ref);
  const email = emails.find((e) => String(e.id) === id);
  if (!email) return NextResponse.json({ ok: false, error: "Email not found." }, { status: 404 });
  return new NextResponse(email.html, { headers: {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "sandbox; default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  } });
}

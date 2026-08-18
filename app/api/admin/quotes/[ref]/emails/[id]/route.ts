import { NextResponse } from "next/server";
import { listQuoteEmails } from "../../../../../../../lib/crm";

// Serves one previously-sent email's exact HTML for staff to view — "View
// the exact email sent to the customer" — as a standalone page rather than
// JSON, so a plain link/target=_blank click renders it.
export async function GET(_request: Request, { params }: { params: Promise<{ ref: string; id: string }> }) {
  const { ref, id } = await params;
  const emails = await listQuoteEmails(ref);
  const email = emails.find((e) => String(e.id) === id);
  if (!email) return NextResponse.json({ ok: false, error: "Email not found." }, { status: 404 });
  return new NextResponse(email.html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

import { guardAdminRequest } from "../../../../lib/security/admin";
import { apiError, validId } from "../../../../lib/admin-api";
import { validateQuote } from "../../../../lib/quote-validation";
import { after, NextRequest, NextResponse } from "next/server";
import { adminListQuotes, adminSaveQuote, type AdminQuoteInput } from "../../../../lib/crm";
import { sendQuoteCreatedSalesNotification } from "../../../../lib/email";

export async function GET(request: Request) {
  const denied = await guardAdminRequest(request);
  if (denied) return denied;
  try {
    const quotes = await adminListQuotes();
    return NextResponse.json({ ok: true, quotes });
  } catch (error) {
    console.error("[admin/quotes] list failed:", error);
    return NextResponse.json({ ok: false, error: "Could not load quotes." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await guardAdminRequest(request);
  if (denied) return denied;
  let body: AdminQuoteInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }
  const invalid = validateQuote(body);
  if (invalid || (body.requestId && !validId(body.requestId))) return NextResponse.json({ok:false,error:invalid || "Invalid request ID"},{status:400});
  try {
    const ref = await adminSaveQuote(body);
    const vehicleSummary = body.items?.map((item) => `${item.make || "Vehicle"} ${item.model || ""}`.trim()).filter(Boolean).join("; ") || "Vehicle quote";

    if (!body.ref) after(async () => { try { await sendQuoteCreatedSalesNotification({
      ref,
      documentNumber: null,
      customerName: body.customer?.name ?? "Customer",
      customerEmail: body.customer?.email ?? "",
      customerPhone: body.customer?.phone ?? null,
      destinationCountry: body.destinationCountry ?? null,
      destinationPort: body.destinationPort ?? null,
      vehicleSummary,
      message: body.notes ?? null,
    }); } catch (error) { console.error("[admin/quotes] notification failed after successful save", error); } });

    return NextResponse.json({ ok: true, ref });
  } catch (error) {
    console.error("[admin/quotes] save failed:", error);
    return apiError(error);
  }
}

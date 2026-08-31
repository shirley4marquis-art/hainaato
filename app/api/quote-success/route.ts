import { NextRequest, NextResponse } from "next/server";
import { adminGetQuote, listQuoteEmails } from "../../../lib/crm";
import { itemTitle } from "../../../lib/quote-document";
import { verifyQuoteAccessToken } from "../../../lib/quote-access";
import { guardRequest } from "../../../lib/security/http";

export async function GET(request: NextRequest) {
  const limited = await guardRequest(request, { name: "quote-success", limit: 30, windowSec: 10 * 60 });
  if (limited) return limited;

  const ref = (request.nextUrl.searchParams.get("ref") || "").trim().toUpperCase();
  const token = request.nextUrl.searchParams.get("token") || "";
  if (!ref || !verifyQuoteAccessToken(ref, token)) {
    return NextResponse.json({ ok: false, error: "This quotation link is invalid or incomplete." }, { status: 403 });
  }

  const [quote, emails] = await Promise.all([adminGetQuote(ref), listQuoteEmails(ref)]);
  if (!quote) return NextResponse.json({ ok: false, error: "Quotation not found." }, { status: 404 });
  const latestEmail = emails[0] ?? null;

  return NextResponse.json({
    ok: true,
    quote: {
      ref: quote.documentNumber ?? quote.ref,
      internalRef: quote.ref,
      destination: [quote.destinationPort, quote.destinationCountry].filter(Boolean).join(", "),
      currency: quote.currency,
      cifTotal: quote.cifTotal,
      depositPct: quote.depositPct,
      depositAmount: quote.depositAmount,
      balanceAmount: quote.balanceAmount,
      validUntil: quote.validUntil,
      vehicles: quote.items.map((item) => ({
        title: itemTitle(item),
        qty: item.qty,
        unitPrice: item.fobFinal,
        photo: item.photos?.[0]?.url ?? null,
      })),
      deliveryStatus: quote.customer.email ? (latestEmail?.status ?? "processing") : "whatsapp-only",
    },
  });
}

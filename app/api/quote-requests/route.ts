// The fully automated cart-checkout quote flow: customer submits the form on
// app/cart/page.tsx -> this builds real quote_items straight from each
// vehicle's own catalogue listing (no manual spec entry), saves the quote via
// the same adminSaveQuote() the staff editor uses (so it's immediately
// visible in /admin), renders the PDF, and emails it to the customer —
// synchronously, so the response only returns once all of that either
// succeeded or definitively failed. See lib/quote-pricing.ts for the
// placeholder freight/insurance figures and README note on why they're flat.
import { NextRequest, NextResponse } from "next/server";
import { getVehicleIndexEntryBySlug } from "../../../lib/vehicles";
import { getVehicleBySlug } from "../../../lib/vehicle-details";
import { rankVehicleImages } from "../../../lib/image-ranking";
import { imagePath, normalizeFuel } from "../../../lib/format";
import { convertFromCNY } from "../../../lib/currency";
import { CART_MAX } from "../../../lib/cart-constants";
import { adminSaveQuote, adminGetQuote, recordQuoteEmail, type AdminQuoteItemInput } from "../../../lib/crm";
import { renderQuotePdf } from "../../../lib/render-quote-pdf";
import { customerQuoteEmailHtml, sendEmail } from "../../../lib/email";
import { itemTitle } from "../../../lib/quote-document";
import { DEFAULT_RATES_PER_UNIT, DEFAULT_DEPOSIT_PCT, languageForCountry } from "../../../lib/quote-pricing";

// PDF rendering (headless Chromium) can take longer than the default limit.
export const maxDuration = 60;

type RequestedVehicle = { slug: string; qty: number };

function str(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 2000) : undefined;
}

function parseVehicles(value: unknown): RequestedVehicle[] {
  if (!Array.isArray(value)) return [];
  const out: RequestedVehicle[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue;
    const slug = str((entry as Record<string, unknown>).slug);
    const qtyRaw = (entry as Record<string, unknown>).qty;
    const qty = Math.min(50, Math.max(1, Math.round(Number(qtyRaw) || 1)));
    if (slug) out.push({ slug, qty });
  }
  return out.slice(0, CART_MAX);
}

// Builds one quote_items row straight from the vehicle's own listing data —
// the whole point being staff/the customer never hand-type specs. Returns
// null for a slug that no longer resolves (delisted between add-to-cart and
// submit) so the caller can skip it rather than fail the whole request.
function buildItemFromListing(slug: string, qty: number): AdminQuoteItemInput | null {
  const indexEntry = getVehicleIndexEntryBySlug(slug);
  const detail = getVehicleBySlug(slug);
  if (!indexEntry || !detail || detail.priceCNY == null) return null;

  const images = rankVehicleImages(detail.images)
    .slice(0, 5)
    .map((file) => imagePath(detail.site, detail.id, file));

  const specParts = [
    detail.year,
    indexEntry.brand,
    indexEntry.model,
    detail.mileageKm != null ? `${detail.mileageKm.toLocaleString("en-US")} km` : null,
    detail.color,
    detail.fuel ? normalizeFuel(detail.fuel) : null,
    indexEntry.transmission,
    detail.location ? `Located in ${detail.location}` : null,
  ].filter(Boolean);

  const fobUsd = Math.round(convertFromCNY(detail.priceCNY, "USD") * 100) / 100;

  return {
    make: indexEntry.brand,
    model: indexEntry.model,
    year: detail.year,
    condition: indexEntry.condition,
    mileageKm: detail.mileageKm,
    fuelType: detail.fuel ? normalizeFuel(detail.fuel) : null,
    transmission: indexEntry.transmission,
    drivetrain: detail.driveType,
    exteriorColor: detail.color,
    specSummary: specParts.join(" · "),
    qty,
    fobOriginal: fobUsd,
    discount: 0,
    fobFinal: fobUsd,
    photos: images.map((url) => ({ url, caption: null })),
  };
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }
  const b = body as Record<string, unknown>;

  const name = str(b.name);
  const email = str(b.email);
  const phone = str(b.phone);
  const country = str(b.country);
  const cityState = str(b.cityState);
  const destinationPort = str(b.destinationPort);
  const message = str(b.message);
  const publicConsent = b.publicConsent === true;
  const requestedVehicles = parseVehicles(b.vehicles);

  if (!name) return NextResponse.json({ ok: false, error: "Full name is required." }, { status: 400 });
  if (!email) return NextResponse.json({ ok: false, error: "Email is required." }, { status: 400 });
  if (!phone) return NextResponse.json({ ok: false, error: "Phone / WhatsApp is required." }, { status: 400 });
  if (!country) return NextResponse.json({ ok: false, error: "Country is required." }, { status: 400 });
  if (requestedVehicles.length === 0) {
    return NextResponse.json({ ok: false, error: "At least one vehicle is required." }, { status: 400 });
  }

  const items = requestedVehicles
    .map(({ slug, qty }) => buildItemFromListing(slug, qty))
    .filter((item): item is AdminQuoteItemInput => item !== null);

  if (items.length === 0) {
    return NextResponse.json(
      { ok: false, error: "None of the selected vehicles are available anymore. Please refresh your cart." },
      { status: 400 }
    );
  }

  const totalUnits = items.reduce((sum, item) => sum + item.qty, 0);
  const language = languageForCountry(country);

  let ref: string;
  try {
    ref = await adminSaveQuote({
      customer: { name, phone, email, city: cityState ?? null, country },
      destinationPort: destinationPort || "To be confirmed",
      destinationCountry: country,
      incoterm: "CIF",
      inlandTransportCost: DEFAULT_RATES_PER_UNIT.inlandTransportCost * totalUnits,
      exportDocumentationCost: DEFAULT_RATES_PER_UNIT.exportDocumentationCost * totalUnits,
      freightCost: DEFAULT_RATES_PER_UNIT.freightCost * totalUnits,
      insuranceCost: DEFAULT_RATES_PER_UNIT.insuranceCost * totalUnits,
      depositPct: DEFAULT_DEPOSIT_PCT,
      currency: "USD",
      language,
      status: "quoted",
      notes: message ? `Website quote request (cart checkout):\n${message}` : "Website quote request (cart checkout).",
      publicConsent,
      source: "cart-checkout",
      items,
    });
  } catch (error) {
    console.error("[quote-requests] adminSaveQuote failed:", error);
    return NextResponse.json({ ok: false, error: "Could not create the quote. Please try again." }, { status: 502 });
  }

  // The quote is saved and already visible in /admin from this point on —
  // everything below (PDF + email) is best-effort. A failure there shouldn't
  // erase the customer's successfully-recorded request; staff can regenerate/
  // resend from the admin quote editor.
  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = await renderQuotePdf(ref, request.url, { kind: "internal-secret" });
  } catch (error) {
    console.error(`[quote-requests] PDF render failed for ${ref}:`, error);
  }

  const quote = await adminGetQuote(ref);
  const vehicleSummary = quote ? quote.items.map((item) => itemTitle(item)).join("; ") : items.map((item) => `${item.make} ${item.model}`).join("; ");
  const { subject, html } = customerQuoteEmailHtml({
    customerName: name,
    ref,
    documentNumber: quote?.documentNumber ?? null,
    vehicleSummary,
  });

  if (pdfBuffer) {
    const sendResult = await sendEmail({
      to: email,
      subject,
      html,
      attachment: { filename: `HainaAuto-Quote-${ref}.pdf`, content: pdfBuffer },
    });
    await recordQuoteEmail(ref, {
      toEmail: email,
      subject,
      html,
      status: sendResult.ok ? "sent" : "failed",
      error: sendResult.ok ? null : sendResult.error,
      providerMessageId: sendResult.ok ? sendResult.providerMessageId : null,
    });
  } else {
    await recordQuoteEmail(ref, {
      toEmail: email,
      subject,
      html,
      status: "failed",
      error: "PDF generation failed — email not sent.",
    });
  }

  return NextResponse.json({ ok: true, ref, documentNumber: quote?.documentNumber ?? null });
}

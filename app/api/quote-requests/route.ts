// The fully automated cart-checkout quote flow: customer submits the form on
// app/cart/page.tsx -> this builds real quote_items straight from each
// vehicle's own catalogue listing (no manual spec entry), saves the quote via
// the same adminSaveQuote() the staff editor uses (so it's immediately
// visible in /admin), renders the PDF, and emails it to the customer —
// synchronously, so the response only returns once all of that either
// succeeded or definitively failed. HAINA AUTO website quotes default to CIF:
// the entered unit price already includes vehicle, ocean freight and marine
// insurance to the agreed destination port.
import { NextRequest, NextResponse } from "next/server";
import { getVehicleIndexEntryBySlug } from "../../../lib/vehicles";
import { getVehicleBySlug } from "../../../lib/vehicle-details";
import { rankVehicleImages } from "../../../lib/image-ranking";
import { imagePath } from "../../../lib/format";
import { convertFromCNY } from "../../../lib/currency";
import { CART_MAX } from "../../../lib/cart-constants";
import { adminSaveQuote, adminGetQuote, recordQuoteEmail, type AdminQuoteItemInput } from "../../../lib/crm";
import { renderQuotePdf } from "../../../lib/render-quote-pdf";
import { customerQuoteEmailHtml, sendEmail, sendQuoteCreatedSalesNotification } from "../../../lib/email";
import { itemTitle } from "../../../lib/quote-document";
import { DEFAULT_DEPOSIT_PCT, languageForCountry } from "../../../lib/quote-pricing";
import { normalizeFuelPreference, type FuelPreference } from "../../../lib/fuel-options";
import { isLikelyRealEmail } from "../../../lib/valid-email";
import { CUSTOM_COLOR_SURCHARGE_USD, supportsCustomColor } from "../../../lib/vehicle-customization";
import { buildVehicleConfigurationRows, buildVehicleFactRows, formatRowsForHistory } from "../../../lib/vehicle-document-details";

// PDF rendering (headless Chromium) can take longer than the default limit.
export const maxDuration = 60;

type RequestedVehicle = { slug: string; qty: number; fuelPreference: FuelPreference; customColor: boolean; customColorName: string | null };

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
    const fuelPreference = normalizeFuelPreference((entry as Record<string, unknown>).fuelPreference);
    const customColor = (entry as Record<string, unknown>).customColor === true;
    const customColorName = str((entry as Record<string, unknown>).customColorName) ?? null;
    if (slug) out.push({ slug, qty, fuelPreference, customColor, customColorName });
  }
  return out.slice(0, CART_MAX);
}

// Builds one quote_items row straight from the vehicle's own listing data —
// the whole point being staff/the customer never hand-type specs. Returns
// null for a slug that no longer resolves (delisted between add-to-cart and
// submit) so the caller can skip it rather than fail the whole request.
function buildItemFromListing({ slug, qty, fuelPreference, customColor, customColorName }: RequestedVehicle): AdminQuoteItemInput | null {
  const indexEntry = getVehicleIndexEntryBySlug(slug);
  const detail = getVehicleBySlug(slug);
  if (!indexEntry || !detail || detail.priceCNY == null) return null;
  const includeCustomColor = customColor && supportsCustomColor(detail.bodyType);

  const images = rankVehicleImages(detail.images)
    .slice(0, 5)
    .map((file) => imagePath(detail.site, detail.id, file));

  const colorLabel = includeCustomColor
    ? `Custom color requested${customColorName ? `: ${customColorName}` : ""} (+$${CUSTOM_COLOR_SURCHARGE_USD} USD)`
    : null;
  const specParts = [
    detail.year,
    indexEntry.brand,
    indexEntry.model,
    detail.mileageKm != null ? `${detail.mileageKm.toLocaleString("en-US")} km` : null,
    detail.color,
    colorLabel,
    `Fuel requested: ${fuelPreference}`,
    indexEntry.transmission,
    detail.driveType,
    detail.bodyType,
    detail.specs.Displacement ? `Displacement: ${detail.specs.Displacement}` : null,
    detail.location ? `Located in ${detail.location}` : null,
  ].filter(Boolean);
  const configurationRows = buildVehicleConfigurationRows(detail, indexEntry);
  const factRows = buildVehicleFactRows(detail, indexEntry);

  const baseFobUsd = Math.round(convertFromCNY(detail.priceCNY, "USD") * 100) / 100;
  const fobUsd = includeCustomColor ? Math.round((baseFobUsd + CUSTOM_COLOR_SURCHARGE_USD) * 100) / 100 : baseFobUsd;

  return {
    make: indexEntry.brand,
    model: indexEntry.model,
    year: detail.year,
    condition: indexEntry.condition,
    mileageKm: detail.mileageKm,
    fuelType: fuelPreference,
    engine: detail.specs.Displacement ?? detail.specs.Engine ?? null,
    transmission: indexEntry.transmission,
    drivetrain: detail.driveType,
    exteriorColor: includeCustomColor ? `Custom color${customColorName ? `: ${customColorName}` : ""}` : detail.color,
    interiorColor: detail.specs["Interior Color"] ?? null,
    capacity: Number.parseInt(detail.specs.Capacity ?? detail.specs["Capacity (people/seats)"] ?? "", 10) || null,
    historyNotes: formatRowsForHistory([...factRows, ...configurationRows]),
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
  if (!isLikelyRealEmail(email)) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
  }
  if (!phone) return NextResponse.json({ ok: false, error: "Phone / WhatsApp is required." }, { status: 400 });
  if (!country) return NextResponse.json({ ok: false, error: "Country is required." }, { status: 400 });
  if (requestedVehicles.length === 0) {
    return NextResponse.json({ ok: false, error: "At least one vehicle is required." }, { status: 400 });
  }

  const items = requestedVehicles
    .map((requestedVehicle) => buildItemFromListing(requestedVehicle))
    .filter((item): item is AdminQuoteItemInput => item !== null);

  if (items.length === 0) {
    return NextResponse.json(
      { ok: false, error: "None of the selected vehicles are available anymore. Please refresh your cart." },
      { status: 400 }
    );
  }

  const language = languageForCountry(country);

  let ref: string;
  try {
    ref = await adminSaveQuote({
      customer: { name, phone, email, city: cityState ?? null, country },
      destinationPort: destinationPort || "To be confirmed",
      destinationCountry: country,
      incoterm: "CIF",
      inlandTransportCost: 0,
      exportDocumentationCost: 0,
      freightCost: 0,
      insuranceCost: 0,
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

  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = await renderQuotePdf(ref, request.url, { kind: "internal-secret" });
  } catch (error) {
    console.error(`[quote-requests] PDF render failed for ${ref}:`, error);
  }
  if (!pdfBuffer) {
    await recordQuoteEmail(ref, {
      toEmail: email,
      subject: "Quotation PDF generation failed",
      html: "",
      status: "failed",
      error: "PDF generation failed before customer email could be sent.",
    });
    return NextResponse.json({ ok: false, error: "The quotation was created, but the PDF could not be generated for email. Our team has been notified to resend it." }, { status: 502 });
  }

  const quote = await adminGetQuote(ref);
  const vehicleSummary = quote ? quote.items.map((item) => itemTitle(item)).join("; ") : items.map((item) => `${item.make} ${item.model}`).join("; ");

  await sendQuoteCreatedSalesNotification({
    ref,
    documentNumber: quote?.documentNumber ?? null,
    customerName: name,
    customerEmail: email,
    customerPhone: phone,
    destinationCountry: country,
    destinationPort: destinationPort || null,
    vehicleSummary,
    message,
  });

  const { subject, html } = customerQuoteEmailHtml({
    customerName: name,
    ref,
    documentNumber: quote?.documentNumber ?? null,
    vehicleSummary,
  });

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
  if (!sendResult.ok) {
    return NextResponse.json({ ok: false, error: "The quotation was created, but the email provider did not accept the email. Please check the address or contact us on WhatsApp." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, ref, documentNumber: quote?.documentNumber ?? null, emailSent: true });
}

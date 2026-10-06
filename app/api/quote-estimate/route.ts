import { NextRequest, NextResponse } from "next/server";
import { estimateCif } from "../../../lib/cif-estimate";
import { buildQuoteListingItems, type RequestedQuoteVehicle } from "../../../lib/quote-listing";
import { guardRequest } from "../../../lib/security/http";

export async function POST(request: NextRequest) {
  const limited = await guardRequest(request, { name: "quote-estimate", limit: 30, windowSec: 10 * 60, failClosed: true });
  if (limited) return limited;
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  const input = body as Record<string, unknown>;
  const country = typeof input.country === "string" ? input.country.trim() : "";
  const port = typeof input.port === "string" ? input.port.trim() : "";
  const rawVehicles = Array.isArray(input.vehicles) ? input.vehicles.slice(0, 12) : [];
  const vehicles: RequestedQuoteVehicle[] = rawVehicles.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const entry = value as Record<string, unknown>;
    const slug = typeof entry.slug === "string" ? entry.slug.trim() : "";
    if (!slug) return [];
    return [{ slug, qty: Math.min(50, Math.max(1, Math.round(Number(entry.qty) || 1))), customColor: entry.customColor === true, customColorName: typeof entry.customColorName === "string" ? entry.customColorName.trim().slice(0, 80) : null }];
  });
  if (!country || !port || vehicles.length === 0) return NextResponse.json({ ok: false, error: "Choose a destination and at least one vehicle." }, { status: 400 });

  try {
    const { items, promotionApplies } = buildQuoteListingItems(vehicles);
    if (items.length === 0) return NextResponse.json({ ok: false, error: "Those vehicles are no longer available. Refresh your selection." }, { status: 400 });
    const estimate = estimateCif(country, port, items.map(({ item, bodyType, condition }) => ({ fobFinal: item.fobFinal, qty: item.qty, bodyType, fuelType: item.fuelType, condition })));
    if (!estimate) return NextResponse.json({ ok: false, error: "A shipping estimate is not available for this destination." }, { status: 400 });
    return NextResponse.json({ ok: true, estimate, promotionApplies });
  } catch (error) {
    console.error("[quote-estimate] calculation failed:", error);
    return NextResponse.json({ ok: false, error: "Could not calculate this estimate. Please try again." }, { status: 500 });
  }
}
